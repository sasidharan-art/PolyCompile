// local-dev-gateway.js — Universal Interactive Execution Gateway
// Auto-detects Docker (all 55 languages in polycompile-exec:latest container)
// with clean host fallback for lightweight local dev without Docker.
'use strict';

const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const PORT = Number(process.env.LOCAL_DEV_PORT || 8081);
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'runner', 'languages.json'), 'utf8'));
const registryById = new Map(registry.map(x => [x.id, x]));

let dockerAvailable = null;
function isDockerAvailable() {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    const res = spawnSync('docker', ['image', 'inspect', 'polycompile-exec:latest', '--format', '{{.Id}}'], { timeout: 4000, stdio: 'pipe' });
    dockerAvailable = res.status === 0 && res.stdout.toString().trim().length > 0;
  } catch {
    dockerAvailable = false;
  }
  return dockerAvailable;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const hasDocker = isDockerAvailable();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      engine: hasDocker ? 'docker-container' : 'host-fallback',
      executionImage: hasDocker ? 'polycompile-exec:latest' : null,
      supportedLanguages: registry.length
    }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 512 * 1024 });
let active = 0;

wss.on('connection', ws => {
  let initialized = false;
  let child = null;
  let containerName = null;
  let workDir = null;
  let execDir = null;
  let rootDir = null;
  let outputBuffer = '';
  let isDockerSession = false;

  const send = payload => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); };

  const cleanup = () => {
    if (isDockerSession && containerName) {
      try { spawn('docker', ['rm', '-f', containerName], { stdio: 'ignore' }); } catch {}
    }
    if (child && !child.killed) { try { child.kill('SIGKILL'); } catch {} }
    if (rootDir) { try { fs.rmSync(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch {} }
    active = Math.max(0, active - 1);
  };

  ws.on('message', async raw => {
    let msg;
    try { msg = JSON.parse(raw.toString('utf8')); } catch { send({ type: 'error', message: 'Invalid message.' }); return; }

    if (!initialized) {
      if (msg.type !== 'start') { send({ type: 'error', message: 'Expected start.' }); return; }
      initialized = true;
      active++;

      const lang = registryById.get(msg.languageId);
      if (!lang) { send({ type: 'error', message: `Unsupported language: ${msg.languageId}` }); ws.close(); return; }

      const timeoutMs = Math.min(Number(msg.timeoutMs) || 15000, 60000);
      const timer = setTimeout(() => {
        send({ type: 'timeout', message: 'Execution timed out.' });
        cleanup();
        ws.close();
      }, timeoutMs);

      // Check if Docker with polycompile-exec:latest is available
      if (isDockerAvailable()) {
        isDockerSession = true;
        containerName = `pc-dev-${crypto.randomBytes(8).toString('hex')}`;
        
        const dockerArgs = [
          'run', '-i', '--rm',
          '--name', containerName,
          '--init',
          '--memory', '1g',
          '--cpus', '1.00',
          '--entrypoint', 'node',
          'polycompile-exec:latest',
          '/opt/session-runner.js'
        ];

        try {
          child = spawn('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (err) {
          send({ type: 'error', message: `Docker spawn failed: ${err.message}` });
          clearTimeout(timer);
          cleanup();
          ws.close();
          return;
        }

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', chunk => {
          outputBuffer += chunk;
          let newline;
          while ((newline = outputBuffer.indexOf('\n')) >= 0) {
            const line = outputBuffer.slice(0, newline).trim();
            outputBuffer = outputBuffer.slice(newline + 1);
            if (!line) continue;
            let event;
            try { event = JSON.parse(line); } catch { continue; }
            if (typeof event.data === 'string') {
              event.data = Buffer.from(event.data, 'base64').toString('utf8');
            }
            send(event);
            if (event.type === 'exit') {
              clearTimeout(timer);
              cleanup();
              ws.close();
            }
          }
        });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => {
          // Docker warnings or session diagnostics
        });

        child.on('error', err => {
          send({ type: 'error', message: `Execution error: ${err.message}` });
          clearTimeout(timer);
          cleanup();
          ws.close();
        });

        child.on('close', code => {
          clearTimeout(timer);
          cleanup();
          ws.close();
        });

        // Write session header to Docker container
        const header = JSON.stringify({
          language: msg.languageId,
          source: Buffer.from(msg.sourceCode || '', 'utf8').toString('base64'),
          timeoutMs
        }) + '\n';
        child.stdin.write(header);
        return;
      }

      // -------------------------------------------------------------
      // Fallback: Run directly on host machine (when Docker is not running)
      // -------------------------------------------------------------
      rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-local-'));
      workDir = path.join(rootDir, 'work');
      execDir = path.join(rootDir, 'exec');
      fs.mkdirSync(workDir, { recursive: true });
      fs.mkdirSync(execDir, { recursive: true });

      const sourceFile = lang.sourceFile || 'main.txt';
      fs.writeFileSync(path.join(workDir, sourceFile), msg.sourceCode || '');

      const jsRunnerPath = path.join(__dirname, 'runner', 'js-runner.js');
      const bfRunnerPath = path.join(__dirname, 'runner', 'brainfuck.js');
      const adapt = cmd => cmd.map(x => {
        if (typeof x !== 'string') return x;
        let mapped = x.replace(/\/work/g, workDir)
                      .replace(/\/exec/g, execDir)
                      .replace('/opt/polycompile/js-runner.js', jsRunnerPath)
                      .replace('/opt/polycompile/brainfuck.js', bfRunnerPath);
        if (process.platform === 'win32' && mapped === 'python3') mapped = 'python';
        return mapped;
      });

      let compileOk = true;

      // Compile step
      if (lang.compile) {
        send({ type: 'compiling', language: lang.name });
        const compileCmd = adapt(lang.compile);
        const compileStart = Date.now();

        const compileProcess = compileCmd[0] === 'sh'
          ? spawn('sh', compileCmd.slice(1), { cwd: workDir, env: { ...process.env, PATH: process.env.PATH } })
          : spawn(compileCmd[0], compileCmd.slice(1), { cwd: workDir });

        await new Promise(resolve => {
          compileProcess.stdout.on('data', chunk => send({ type: 'stdout', data: chunk.toString('utf8'), phase: 'compile' }));
          compileProcess.stderr.on('data', chunk => send({ type: 'stderr', data: chunk.toString('utf8'), phase: 'compile' }));
          compileProcess.on('close', code => {
            if (code !== 0) {
              compileOk = false;
              send({ type: 'exit', code, durationMs: Date.now() - compileStart, compileFailed: true, compileDurationMs: Date.now() - compileStart });
              clearTimeout(timer);
              cleanup();
              ws.close();
            }
            resolve();
          });
          compileProcess.on('error', err => {
            compileOk = false;
            let msgText = err.message;
            if (err.code === 'ENOENT') {
              msgText = `\n[Compiler Error] '${compileCmd[0]}' compiler executable was not found on this machine.\n` +
                        `Please start Docker Desktop to compile and run all 55 languages in the official sandboxed container,\n` +
                        `or install the '${compileCmd[0]}' compiler in your host PATH.`;
            }
            send({ type: 'stderr', data: msgText + '\n', phase: 'compile' });
            send({ type: 'exit', code: 1, compileFailed: true, durationMs: Date.now() - compileStart });
            clearTimeout(timer);
            cleanup();
            ws.close();
            resolve();
          });
        });
      }

      if (!compileOk) return;

      // Run step
      const runCmd = adapt(lang.run);
      const runStart = Date.now();
      let compileDurationMs = 0;

      try {
        child = runCmd[0] === 'sh'
          ? spawn('sh', runCmd.slice(1), { cwd: workDir, env: { ...process.env, PATH: process.env.PATH }, stdio: ['pipe', 'pipe', 'pipe'] })
          : spawn(runCmd[0], runCmd.slice(1), { cwd: workDir, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        send({ type: 'error', message: `Execution failed: ${err.message}` });
        clearTimeout(timer);
        cleanup();
        ws.close();
        return;
      }

      child.stdout.on('data', chunk => send({ type: 'stdout', data: chunk.toString('utf8') }));
      child.stderr.on('data', chunk => send({ type: 'stderr', data: chunk.toString('utf8') }));
      child.on('error', err => {
        let msgText = err.message;
        if (err.code === 'ENOENT') {
          msgText = `\n[Runtime Error] '${runCmd[0]}' interpreter executable was not found on this machine.\n` +
                    `Please start Docker Desktop to run all 55 languages in the sandboxed container.`;
        }
        send({ type: 'stderr', data: msgText + '\n' });
        send({ type: 'exit', code: 1 });
        clearTimeout(timer);
        cleanup();
        ws.close();
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        send({ type: 'exit', code: code ?? (signal ? 128 : 1), durationMs: Date.now() - runStart, compileDurationMs });
        cleanup();
        ws.close();
      });

      send({ type: 'ready', language: lang.name, compileDurationMs });
      return;
    }

    if (msg.type === 'input' && child && child.stdin && child.stdin.writable) {
      const data = typeof msg.data === 'string' ? msg.data : '';
      child.stdin.write(data + (msg.newline === false ? '' : '\n'));
    } else if (msg.type === 'eof' && child && child.stdin && child.stdin.writable) {
      if (isDockerSession) {
        child.stdin.write('\u0004');
      } else {
        child.stdin.end();
      }
    } else if (msg.type === 'stop') {
      send({ type: 'stopping' });
      cleanup();
      ws.close();
    }
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

const hasDocker = isDockerAvailable();
server.listen(PORT, '127.0.0.1', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(` PolyCompile Interactive Gateway (Port ${PORT})`);
  console.log(` Mode: ${hasDocker ? 'DOCKER CONTAINER (All 55 languages available)' : 'Host Fallback'}`);
  console.log(` WebSocket URL: ws://localhost:${PORT}/`);
  console.log('═══════════════════════════════════════════════════════');
});
