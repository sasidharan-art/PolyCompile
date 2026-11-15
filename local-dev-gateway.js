// local-dev-gateway.js — Development-only interactive execution server
// WARNING: Never use in production. No sandboxing. For local dev only.
// Usage: node local-dev-gateway.js (runs on port 8081 by default)
'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const PORT = Number(process.env.LOCAL_DEV_PORT || 8081);
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'runner', 'languages.json'), 'utf8'));
const registryById = new Map(registry.map(x => [x.id, x]));

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', mode: 'local-dev-no-sandbox' }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 512 * 1024 });
let active = 0;

wss.on('connection', ws => {
  let initialized = false;
  let child = null;
  let workDir = null;
  let execDir = null;
  let rootDir = null;

  const send = payload => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); };

  const cleanup = () => {
    if (child && !child.killed) { try { child.kill('SIGKILL'); } catch {} }
    if (rootDir) { try { fs.rmSync(rootDir, { recursive: true, force: true }); } catch {} }
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

      rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-local-'));
      workDir = path.join(rootDir, 'work');
      execDir = path.join(rootDir, 'exec');
      fs.mkdirSync(workDir, { recursive: true });
      fs.mkdirSync(execDir, { recursive: true });

      const sourceFile = lang.sourceFile || 'main.txt';
      fs.writeFileSync(path.join(workDir, sourceFile), msg.sourceCode || '');

      // Replace /work and /exec paths for local execution
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

      const timeoutMs = Math.min(Number(msg.timeoutMs) || 15000, 60000);
      const timer = setTimeout(() => {
        send({ type: 'timeout', message: 'Execution timed out.' });
        cleanup();
        ws.close();
      }, timeoutMs);

      let compileOk = true;

      // Compile step
      if (lang.compile) {
        send({ type: 'compiling', language: lang.name });
        const compileCmd = adapt(lang.compile);
        const compileStart = Date.now();

        // Handle sh -lc "..." compile commands
        const compileProcess = compileCmd[0] === 'sh'
          ? spawn('sh', compileCmd.slice(1), { cwd: workDir, env: { ...process.env, PATH: process.env.PATH } })
          : spawn(compileCmd[0], compileCmd.slice(1), { cwd: workDir });

        await new Promise(resolve => {
          let stderr = '';
          compileProcess.stdout.on('data', chunk => send({ type: 'stdout', data: chunk.toString('utf8'), phase: 'compile' }));
          compileProcess.stderr.on('data', chunk => { stderr += chunk; send({ type: 'stderr', data: chunk.toString('utf8'), phase: 'compile' }); });
          compileProcess.on('close', code => {
            if (code !== 0) {
              compileOk = false;
              send({ type: 'exit', code, durationMs: Date.now() - compileStart, compileFailed: true, compileDurationMs: Date.now() - compileStart });
              clearTimeout(timer);
              ws.close();
            }
            resolve();
          });
          compileProcess.on('error', err => { send({ type: 'stderr', data: err.message, phase: 'compile' }); compileOk = false; resolve(); });
        });
      }

      if (!compileOk) return;

      // Run step
      const runCmd = adapt(lang.run);
      const runStart = Date.now();
      let compileDurationMs = 0;

      child = runCmd[0] === 'sh'
        ? spawn('sh', runCmd.slice(1), { cwd: workDir, env: { ...process.env, PATH: process.env.PATH }, stdio: ['pipe', 'pipe', 'pipe'] })
        : spawn(runCmd[0], runCmd.slice(1), { cwd: workDir, stdio: ['pipe', 'pipe', 'pipe'] });

      child.stdout.on('data', chunk => send({ type: 'stdout', data: chunk.toString('utf8') }));
      child.stderr.on('data', chunk => send({ type: 'stderr', data: chunk.toString('utf8') }));
      child.on('error', err => { send({ type: 'error', message: err.message }); clearTimeout(timer); cleanup(); ws.close(); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        send({ type: 'exit', code: code ?? (signal ? 128 : 1), durationMs: Date.now() - runStart, compileDurationMs });
        cleanup();
        ws.close();
      });

      send({ type: 'ready', language: lang.name, compileDurationMs });
      return;
    }

    if (msg.type === 'input' && child && child.stdin.writable) {
      const data = typeof msg.data === 'string' ? msg.data : '';
      child.stdin.write(data + (msg.newline === false ? '' : '\n'));
    } else if (msg.type === 'eof' && child && child.stdin.writable) {
      child.stdin.end();
    } else if (msg.type === 'stop') {
      send({ type: 'stopping' });
      if (child) { try { child.kill('SIGTERM'); } catch {} }
      cleanup();
      ws.close();
    }
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('═══════════════════════════════════════════════');
  console.log(' PolyCompile LOCAL DEV Gateway (NO SANDBOX)');
  console.log(` ws://localhost:${PORT}/`);
  console.log(' WARNING: Executes code directly on host!');
  console.log(' NEVER use in production.');
  console.log('═══════════════════════════════════════════════');
});
