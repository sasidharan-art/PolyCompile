/**
 * PolyCompile - Interactive Terminal Session Manager
 * 
 * Provides real-time bidirectional streaming of stdin, stdout, and stderr
 * over WebSockets for interactive programs (Python input(), C scanf(), C++ cin, Java Scanner, etc.).
 */

'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { getLanguageById } = require('../compiler/LanguageRegistry');
const LanguageDetector = require('../compiler/LanguageDetector');

let runnerLanguages = null;
try {
  runnerLanguages = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../runner/languages.json'), 'utf8')
  );
} catch (e) {
  runnerLanguages = [];
}

/**
 * Checks whether Docker is available on the host.
 */
let dockerAvailable = null;
function checkDocker() {
  if (dockerAvailable !== null) return Promise.resolve(dockerAvailable);
  return new Promise((resolve) => {
    try {
      const p = spawn('docker', ['--version'], { windowsHide: true });
      p.on('error', () => {
        dockerAvailable = false;
        resolve(false);
      });
      p.on('close', (code) => {
        dockerAvailable = code === 0;
        resolve(dockerAvailable);
      });
    } catch {
      dockerAvailable = false;
      resolve(false);
    }
  });
}

/**
 * Handles an incoming WebSocket connection for an interactive code execution session.
 * @param {import('ws').WebSocket} ws
 */
function handleInteractiveSession(ws) {
  let child = null;
  let dockerContainer = null;
  let isDone = false;
  let startTime = null;
  let timeoutTimer = null;
  let tmpFilePath = null;

  const cleanup = () => {
    if (isDone) return;
    isDone = true;

    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    if (tmpFilePath) {
      try { fs.unlinkSync(tmpFilePath); } catch {}
      tmpFilePath = null;
    }

    if (child && !child.killed) {
      try { child.kill('SIGKILL'); } catch {}
      child = null;
    }

    if (dockerContainer) {
      const name = dockerContainer;
      dockerContainer = null;
      try {
        spawn('docker', ['rm', '-f', name], { windowsHide: true });
      } catch {}
    }
  };

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'start') {
      const sourceCode = typeof msg.sourceCode === 'string' ? msg.sourceCode : '';
      let languageId = (msg.languageId || '').toLowerCase();
      const timeoutMs = Math.min(Math.max(Number(msg.timeoutMs) || 30000, 2000), 60000);

      if (!sourceCode.trim()) {
        ws.send(JSON.stringify({ type: 'error', message: 'No source code provided.' }));
        return ws.close(1008);
      }

      startTime = Date.now();

      // Resolve language
      let lang = languageId ? getLanguageById(languageId) : null;
      if (!lang) {
        const det = LanguageDetector.detect(sourceCode);
        lang = det.detected;
        languageId = (lang?.id || '').toLowerCase();
      }

      ws.send(JSON.stringify({
        type: 'ready',
        language: lang?.name || languageId || 'Universal'
      }));

      // Setup session timeout
      timeoutTimer = setTimeout(() => {
        if (!isDone) {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'stderr', data: '\n[Execution timed out]' }));
            ws.send(JSON.stringify({
              type: 'exit',
              code: 124,
              durationMs: Date.now() - startTime
            }));
          }
          cleanup();
        }
      }, timeoutMs);

      try {
        await startProcess(languageId, sourceCode, lang, ws, {
          onSpawn: (proc, containerName, tempFile) => {
            child = proc;
            dockerContainer = containerName;
            tmpFilePath = tempFile;
          },
          onExit: (code) => {
            if (!isDone) {
              isDone = true;
              if (timeoutTimer) clearTimeout(timeoutTimer);
              const durationMs = Date.now() - startTime;
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'exit', code: code ?? 0, durationMs }));
              }
              cleanup();
            }
          }
        });
      } catch (err) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Execution failed to start: ${err.message}`
          }));
        }
        cleanup();
      }
    } else if (msg.type === 'input') {
      if (child && child.stdin && child.stdin.writable) {
        const text = typeof msg.data === 'string' ? msg.data : '';
        const withNewline = msg.newline === false ? text : text + '\n';
        child.stdin.write(withNewline);
      }
    } else if (msg.type === 'eof') {
      if (child && child.stdin && child.stdin.writable) {
        child.stdin.end();
      }
    } else if (msg.type === 'stop') {
      cleanup();
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          code: 130,
          durationMs: startTime ? Date.now() - startTime : 0
        }));
      }
    }
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
}

/**
 * Spawns the execution process for the requested language.
 */
async function startProcess(langId, sourceCode, langMeta, ws, callbacks) {
  const isDocker = await checkDocker();

  // 1. Python: Fast-path local execution on host (if available)
  if (langId === 'python' || langId === 'py') {
    try {
      const tmpFile = path.join(os.tmpdir(), `poly_${crypto.randomBytes(6).toString('hex')}.py`);
      fs.writeFileSync(tmpFile, sourceCode, 'utf8');

      const proc = spawn('python', ['-u', tmpFile], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let spawned = false;
      proc.on('spawn', () => { spawned = true; });

      attachStreams(proc, ws, callbacks.onExit);
      callbacks.onSpawn(proc, null, tmpFile);
      return;
    } catch {
      // Fall through to Docker or container if host python failed
    }
  }

  // 2. JavaScript: Fast-path local execution on host via node
  if (langId === 'javascript' || langId === 'js') {
    try {
      const tmpFile = path.join(os.tmpdir(), `poly_${crypto.randomBytes(6).toString('hex')}.js`);
      fs.writeFileSync(tmpFile, sourceCode, 'utf8');

      const proc = spawn('node', [tmpFile], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      attachStreams(proc, ws, callbacks.onExit);
      callbacks.onSpawn(proc, null, tmpFile);
      return;
    } catch {
      // Fall through
    }
  }

  // 3. Docker-based execution using polycompile-runner:latest
  if (isDocker) {
    const langDef = runnerLanguages.find(x => x.id === langId) || {
      sourceFile: langMeta?.extension ? `main${langMeta.extension}` : 'main.txt'
    };

    const containerName = `pc-${crypto.randomBytes(6).toString('hex')}`;
    const b64 = Buffer.from(sourceCode, 'utf8').toString('base64');
    const fileName = langDef.sourceFile || 'main.txt';

    let script = `mkdir -p /work /exec && echo "${b64}" | base64 -d > /work/${fileName}`;

    if (langDef.compile && Array.isArray(langDef.compile) && langDef.compile.length > 0) {
      script += ` && ${langDef.compile.join(' ')}`;
    }

    if (langDef.run && Array.isArray(langDef.run) && langDef.run.length > 0) {
      script += ` && ${langDef.run.join(' ')}`;
    } else {
      script += ` && cat /work/${fileName}`;
    }

    const args = [
      'run', '-i', '--rm',
      '--name', containerName,
      '--network', 'none',
      '--memory', '256m',
      '--cpus', '1.0',
      '--entrypoint', 'sh',
      'polycompile-runner:latest',
      '-c', script
    ];

    const proc = spawn('docker', args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    attachStreams(proc, ws, callbacks.onExit);
    callbacks.onSpawn(proc, containerName, null);
    return;
  }

  // 4. Fallback if Docker is not available and no host runner exists
  throw new Error(
    `No interactive execution runner available for ${langMeta?.name || langId}. ` +
    `Ensure Docker is running or use the batch compiler.`
  );
}

/**
 * Attaches stdout and stderr data handlers to stream to WebSocket.
 */
function attachStreams(proc, ws, onExit) {
  proc.stdout.on('data', (chunk) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stdout',
        data: chunk.toString('utf8')
      }));
    }
  });

  proc.stderr.on('data', (chunk) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stderr',
        data: chunk.toString('utf8')
      }));
    }
  });

  proc.on('error', (err) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'stderr',
        data: `Process error: ${err.message}\n`
      }));
    }
    onExit(1);
  });

  proc.on('close', (code) => {
    onExit(code ?? 0);
  });
}

module.exports = {
  handleInteractiveSession,
  checkDocker
};
