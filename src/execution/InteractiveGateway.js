// src/execution/InteractiveGateway.js
// PolyCompile Unified Interactive Execution Gateway
// Embedded directly inside server.js to support real-time bidirectional terminals
// in both local development and cloud deployments (Render, Railway, VPS, Docker).
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const ExecutionManager = require('./ExecutionManager');

const registryPath = path.join(__dirname, '..', '..', 'runner', 'languages.json');
let registry = [];
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch {
  registry = [];
}
const registryById = new Map(registry.map(x => [x.id, x]));

let dockerAvailable = null;
function isDockerAvailable() {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    const res = spawnSync('docker', ['image', 'inspect', 'polycompile-exec:latest', '--format', '{{.Id}}'], { timeout: 3000, stdio: 'pipe' });
    dockerAvailable = res.status === 0 && res.stdout.toString().trim().length > 0;
  } catch {
    dockerAvailable = false;
  }
  return dockerAvailable;
}

function hasCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;
  // Exclude shell wrappers if they might open WSL on Windows
  if (process.platform === 'win32' && ['sh', 'bash', 'zsh', 'fish', 'script'].includes(cmd)) return false;
  try {
    const checker = process.platform === 'win32' ? 'where.exe' : 'which';
    const res = spawnSync(checker, [cmd], { stdio: 'ignore', timeout: 1000 });
    return res.status === 0;
  } catch {
    return false;
  }
}

function setupInteractiveGateway(server) {
  const wss = new WebSocketServer({ server, path: '/session', maxPayload: 512 * 1024 });

  wss.on('connection', ws => {
    let initialized = false;
    let child = null;
    let containerName = null;
    let workDir = null;
    let execDir = null;
    let rootDir = null;
    let outputBuffer = '';
    let isDockerSession = false;
    let isCloudSession = false;
    let cloudFinished = false;
    let accumulatedStdin = '';
    let lastCloudOutputLen = 0;
    let lang = null;
    let sourceCode = '';

    const send = payload => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    const cleanup = () => {
      if (isDockerSession && containerName) {
        try { spawn('docker', ['rm', '-f', containerName], { stdio: 'ignore' }); } catch {}
      }
      if (child && !child.killed) {
        try { child.kill('SIGKILL'); } catch {}
      }
      if (rootDir) {
        try { fs.rmSync(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); } catch {}
      }
    };

    ws.on('message', async raw => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        send({ type: 'error', message: 'Invalid message.' });
        return;
      }

      if (!initialized) {
        if (msg.type !== 'start') {
          send({ type: 'error', message: 'Expected start.' });
          return;
        }
        initialized = true;

        lang = registryById.get(msg.languageId);
        if (!lang) {
          send({ type: 'error', message: `Unsupported language: ${msg.languageId}` });
          ws.close();
          return;
        }

        sourceCode = typeof msg.sourceCode === 'string' ? msg.sourceCode : '';
        const timeoutMs = Math.min(Number(msg.timeoutMs) || 15000, 60000);
        const timer = setTimeout(() => {
          send({ type: 'timeout', message: 'Execution timed out.' });
          cleanup();
          ws.close();
        }, timeoutMs);

        // -------------------------------------------------------------
        // Tier 1: Local Docker Container (all 55 compilers & runtimes)
        // -------------------------------------------------------------
        if (isDockerAvailable()) {
          isDockerSession = true;
          containerName = `pc-dock-${crypto.randomBytes(8).toString('hex')}`;

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
          child.stderr.on('data', () => {});

          child.on('error', err => {
            send({ type: 'error', message: `Execution error: ${err.message}` });
            clearTimeout(timer);
            cleanup();
            ws.close();
          });

          child.on('close', () => {
            clearTimeout(timer);
            cleanup();
            ws.close();
          });

          const header = JSON.stringify({
            language: msg.languageId,
            source: Buffer.from(sourceCode, 'utf8').toString('base64'),
            timeoutMs
          }) + '\n';
          child.stdin.write(header);
          return;
        }

        // -------------------------------------------------------------
        // Check if host system has local compiler and runner
        // -------------------------------------------------------------
        const jsRunnerPath = path.join(__dirname, '..', '..', 'runner', 'js-runner.js');
        const bfRunnerPath = path.join(__dirname, '..', '..', 'runner', 'brainfuck.js');

        const adapt = (cmd, wDir, eDir) => cmd.map(x => {
          if (typeof x !== 'string') return x;
          let mapped = x.replace(/\/work/g, wDir)
                        .replace(/\/exec/g, eDir)
                        .replace('/opt/polycompile/js-runner.js', jsRunnerPath)
                        .replace('/opt/polycompile/brainfuck.js', bfRunnerPath);
          if (process.platform === 'win32' && mapped === 'python3') mapped = 'python';
          return mapped;
        });

        const rawRunCmd = lang.run || [];
        const rawCompileCmd = lang.compile || null;
        const hostRunExecutable = (process.platform === 'win32' && rawRunCmd[0] === 'python3') ? 'python' : rawRunCmd[0];
        const hostCompileExecutable = rawCompileCmd ? rawCompileCmd[0] : null;

        const hasLocalRunner = hasCommand(hostRunExecutable);
        const hasLocalCompiler = !rawCompileCmd || hasCommand(hostCompileExecutable);

        // -------------------------------------------------------------
        // Tier 2: Host Local Execution (When toolchain is installed on host)
        // -------------------------------------------------------------
        if (hasLocalRunner && hasLocalCompiler) {
          rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-run-'));
          workDir = path.join(rootDir, 'work');
          execDir = path.join(rootDir, 'exec');
          fs.mkdirSync(workDir, { recursive: true });
          fs.mkdirSync(execDir, { recursive: true });

          const sourceFile = lang.sourceFile || 'main.txt';
          fs.writeFileSync(path.join(workDir, sourceFile), sourceCode);

          let compileOk = true;

          if (lang.compile) {
            send({ type: 'compiling', language: lang.name });
            const compileCmd = adapt(lang.compile, workDir, execDir);
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
                send({ type: 'stderr', data: `Compiler error: ${err.message}\n`, phase: 'compile' });
                send({ type: 'exit', code: 1, compileFailed: true, durationMs: Date.now() - compileStart });
                clearTimeout(timer);
                cleanup();
                ws.close();
                resolve();
              });
            });
          }

          if (!compileOk) return;

          const runCmd = adapt(lang.run, workDir, execDir);
          const runStart = Date.now();

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
            send({ type: 'stderr', data: `Runtime error: ${err.message}\n` });
            send({ type: 'exit', code: 1 });
            clearTimeout(timer);
            cleanup();
            ws.close();
          });
          child.on('close', (code, signal) => {
            clearTimeout(timer);
            send({ type: 'exit', code: code ?? (signal ? 128 : 1), durationMs: Date.now() - runStart });
            cleanup();
            ws.close();
          });

          send({ type: 'ready', language: lang.name });
          return;
        }

        // -------------------------------------------------------------
        // Tier 3: Universal Cloud Sandbox Interactive Execution
        // (Used on Render, Vercel, lightweight cloud hosts without local compilers)
        // -------------------------------------------------------------
        isCloudSession = true;
        send({ type: 'ready', language: lang.name });

        async function executeCloudTurn() {
          if (cloudFinished) return;
          try {
            const res = await ExecutionManager.execute({
              language: lang,
              sourceCode,
              stdin: accumulatedStdin
            });

            const fullStdout = res.stdout || '';
            const newOutput = fullStdout.slice(lastCloudOutputLen);
            lastCloudOutputLen = fullStdout.length;

            if (newOutput) {
              send({ type: 'stdout', data: newOutput });
            }

            const stderr = res.stderr || '';
            const isAwaitingMoreInput =
              !res.success &&
              (stderr.includes('EOF') ||
               stderr.includes('scanf') ||
               stderr.includes('input(') ||
               stderr.includes('readline') ||
               stderr.includes('NoSuchElementException'));

            if (!isAwaitingMoreInput) {
              cloudFinished = true;
              clearTimeout(timer);
              if (res.compileOutput) {
                send({ type: 'stderr', data: res.compileOutput + (res.compileOutput.endsWith('\n') ? '' : '\n'), phase: 'compile' });
              }
              if (stderr) {
                send({ type: 'stderr', data: stderr });
              }
              send({
                type: 'exit',
                code: res.exitCode ?? (res.success ? 0 : 1),
                durationMs: res.executionTimeMs || 0
              });
              cleanup();
              ws.close();
            }
          } catch (err) {
            cloudFinished = true;
            clearTimeout(timer);
            send({ type: 'stderr', data: `\n[Execution Error] ${err.message}\n` });
            send({ type: 'exit', code: 1 });
            cleanup();
            ws.close();
          }
        }

        executeCloudTurn();
        return;
      }

      // Handle interactive inputs from user
      if (isCloudSession) {
        if (msg.type === 'input' && !cloudFinished) {
          const data = typeof msg.data === 'string' ? msg.data : '';
          accumulatedStdin += data + (msg.newline === false ? '' : '\n');
          // Trigger next execution turn with new input
          setTimeout(() => {
            const executeCloudTurn = async () => {
              if (cloudFinished) return;
              try {
                const res = await ExecutionManager.execute({
                  language: lang,
                  sourceCode,
                  stdin: accumulatedStdin
                });

                const fullStdout = res.stdout || '';
                const newOutput = fullStdout.slice(lastCloudOutputLen);
                lastCloudOutputLen = fullStdout.length;

                if (newOutput) {
                  send({ type: 'stdout', data: newOutput });
                }

                const stderr = res.stderr || '';
                const isAwaitingMoreInput =
                  !res.success &&
                  (stderr.includes('EOF') ||
                   stderr.includes('scanf') ||
                   stderr.includes('input(') ||
                   stderr.includes('readline') ||
                   stderr.includes('NoSuchElementException'));

                if (!isAwaitingMoreInput) {
                  cloudFinished = true;
                  if (res.compileOutput) {
                    send({ type: 'stderr', data: res.compileOutput + (res.compileOutput.endsWith('\n') ? '' : '\n'), phase: 'compile' });
                  }
                  if (stderr) {
                    send({ type: 'stderr', data: stderr });
                  }
                  send({
                    type: 'exit',
                    code: res.exitCode ?? (res.success ? 0 : 1),
                    durationMs: res.executionTimeMs || 0
                  });
                  cleanup();
                  ws.close();
                }
              } catch (err) {
                cloudFinished = true;
                send({ type: 'stderr', data: `\n[Execution Error] ${err.message}\n` });
                send({ type: 'exit', code: 1 });
                cleanup();
                ws.close();
              }
            };
            executeCloudTurn();
          }, 50);
        } else if (msg.type === 'eof' && !cloudFinished) {
          cloudFinished = true;
          cleanup();
          ws.close();
        } else if (msg.type === 'stop') {
          cloudFinished = true;
          send({ type: 'stopping' });
          cleanup();
          ws.close();
        }
        return;
      }

      // Standard process/container stdin forwarding
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

  return wss;
}

module.exports = { setupInteractiveGateway, isDockerAvailable, hasCommand };
