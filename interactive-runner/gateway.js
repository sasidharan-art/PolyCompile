'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.INTERACTIVE_TICKET_SECRET || '';
const IMAGE = process.env.EXECUTION_IMAGE || 'polycompile-exec:latest';
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_SESSIONS = Math.max(1, Math.min(Number(process.env.MAX_SESSIONS || 4), 32));
const MAX_OUTPUT_BYTES = Math.max(64 * 1024, Math.min(Number(process.env.MAX_OUTPUT_BYTES || 1_000_000), 5_000_000));
const usedTickets = new Map();
let active = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    // A live Node process is not enough: the gateway is useful only when its
    // Docker daemon is reachable and the exact execution image is present.
    return execFile('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 3000, maxBuffer: 16 * 1024 }, (daemonError, daemonStdout) => {
      if (daemonError || !String(daemonStdout || '').trim()) {
        res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ status: 'degraded', reason: 'docker-daemon-unavailable', activeSessions: active, maxSessions: MAX_SESSIONS }));
      }
      execFile('docker', ['image', 'inspect', IMAGE, '--format', '{{.Id}}'], { timeout: 3000, maxBuffer: 16 * 1024 }, (imageError, imageStdout) => {
        if (imageError || !String(imageStdout || '').trim()) {
          res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          return res.end(JSON.stringify({ status: 'degraded', reason: 'execution-image-missing', activeSessions: active, maxSessions: MAX_SESSIONS }));
        }
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ status: 'healthy', docker: 'connected', executionImage: IMAGE, activeSessions: active, maxSessions: MAX_SESSIONS }));
      });
    });
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_SOURCE_BYTES + 16 * 1024, perMessageDeflate: false });

server.on('upgrade', (req, socket, head) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
  if (url.pathname !== '/session' || !consumeTicket(url.searchParams.get('ticket'))) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

function consumeTicket(token) {
  if (!SECRET || !token || token.length > 4096) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(parts[0]).digest('base64url');
  const a = Buffer.from(expected); const b = Buffer.from(parts[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload.scope !== 'interactive-run' || !Number.isFinite(payload.exp) || payload.exp <= Date.now() || typeof payload.nonce !== 'string' || payload.nonce.length < 16) return false;
    // Tickets are short-lived and single-use. Expired entries are pruned on use.
    for (const [nonce, expiry] of usedTickets) if (expiry <= Date.now()) usedTickets.delete(nonce);
    if (usedTickets.has(payload.nonce)) return false;
    if (usedTickets.size > 20_000) return false;
    usedTickets.set(payload.nonce, payload.exp);
    return true;
  } catch { return false; }
}

wss.on('connection', ws => {
  if (active >= MAX_SESSIONS) {
    ws.send(JSON.stringify({ type: 'error', message: 'Execution capacity is full. Try again shortly.' }));
    ws.close(1013, 'Execution capacity full');
    return;
  }

  let docker = null;
  let initialized = false;
  let released = false;
  let cleaned = false;
  let outputBuffer = '';
  let outputBytes = 0;
  let containerName = `pc-${crypto.randomBytes(10).toString('hex')}`;
  let handshakeTimer = setTimeout(() => { if (!initialized && ws.readyState === WebSocket.OPEN) ws.close(1008, 'Execution start timeout'); }, 10_000);
  active++;

  const releaseSlot = () => {
    if (released) return;
    released = true;
    active = Math.max(0, active - 1);
  };
  const send = (payload) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };
  const forceRemoveContainer = (attempt = 0) => {
    // `docker run` is a client process; killing that CLI alone does not
    // guarantee that dockerd stops the named container. Retry removal because
    // cancellation can race the daemon's initial container creation.
    const remover = spawn('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
    remover.on('error', () => {});
    remover.on('close', code => {
      if (code !== 0 && attempt < 3) setTimeout(() => forceRemoveContainer(attempt + 1), 150 * (attempt + 1)).unref?.();
    });
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (docker && !docker.killed) {
      try { docker.kill('SIGTERM'); } catch {}
    }
    forceRemoveContainer();
  };

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString('utf8')); }
    catch { send({ type: 'error', message: 'Invalid terminal message.' }); return; }

    if (!initialized) {
      if (msg.type !== 'start' || typeof msg.sourceCode !== 'string' || Buffer.byteLength(msg.sourceCode, 'utf8') > MAX_SOURCE_BYTES || typeof msg.languageId !== 'string' || msg.languageId.length > 80) {
        send({ type: 'error', message: 'Invalid start request or source exceeds 256 KB.' });
        ws.close(1008, 'Invalid start request');
        return;
      }
      initialized = true;
      clearTimeout(handshakeTimer);
      const requestedTimeout = Number(msg.timeoutMs);
      const timeoutMs = Number.isFinite(requestedTimeout) ? Math.max(1000, Math.min(requestedTimeout, 60_000)) : 15_000;
      const args = [
        'run', '--rm', '--name', containerName,
        '--init', '-i', '--network', 'none',
        '--memory', '1g', '--memory-swap', '1g', '--cpus', '1.00',
        '--pids-limit', '64', '--ulimit', 'nofile=128:128',
        '--read-only',
        '--tmpfs', '/work:rw,nosuid,nodev,noexec,size=16m,uid=10001,gid=10001,mode=0700',
        '--tmpfs', '/tmp:rw,nosuid,nodev,size=128m,mode=1777',
        '--tmpfs', '/exec:rw,nosuid,nodev,size=256m,uid=10001,gid=10001,mode=0700',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--user', '10001:10001', '--entrypoint', 'node', IMAGE, '/opt/session-runner.js'
      ];
      docker = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      docker.stdout.setEncoding('utf8');
      docker.stdout.on('data', chunk => {
        outputBuffer += chunk;
        if (outputBuffer.length > 1_100_000 && !outputBuffer.includes('\n')) {
          send({ type: 'error', message: 'Execution service returned an invalid response.' });
          cleanup();
          return;
        }
        let newline;
        while ((newline = outputBuffer.indexOf('\n')) >= 0) {
          const line = outputBuffer.slice(0, newline);
          outputBuffer = outputBuffer.slice(newline + 1);
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { continue; }
          if (typeof event.data === 'string') {
            const decoded = Buffer.from(event.data, 'base64');
            outputBytes += decoded.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
              send({ type: 'stderr', data: '\n[Output limit reached. Process stopped.]' });
              cleanup();
              return;
            }
            event.data = decoded.toString('utf8');
          }
          send(event);
        }
      });
      docker.stderr.on('data', () => {
        // Docker diagnostics can expose host/container internals. Keep them in
        // server logs and return a stable user-facing message instead.
        send({ type: 'service-error', message: 'Execution service unavailable.' });
      });
      docker.once('error', () => {
        send({ type: 'error', message: 'Execution service unavailable.' });
        cleanup();
        releaseSlot();
      });
      docker.once('close', code => {
        releaseSlot();
        if (ws.readyState === WebSocket.OPEN) {
          if (outputBuffer.trim()) {
            try { send(JSON.parse(outputBuffer)); } catch {}
          }
          send({ type: 'closed', code: Number.isInteger(code) ? code : 1 });
          ws.close(1000, 'Execution finished');
        }
      });
      docker.stdin.write(JSON.stringify({
        language: msg.languageId,
        source: Buffer.from(msg.sourceCode, 'utf8').toString('base64'),
        timeoutMs
      }) + '\n');
      return;
    }

    if (msg.type === 'input') {
      if (typeof msg.data !== 'string' || Buffer.byteLength(msg.data, 'utf8') > MAX_INPUT_BYTES) {
        send({ type: 'error', message: 'Input line is too large.' });
        return;
      }
      if (docker && docker.stdin.writable) docker.stdin.write(msg.data + (msg.newline === false ? '' : '\n'));
      return;
    }
    if (msg.type === 'eof') {
      if (docker && docker.stdin.writable) docker.stdin.write('\u0004');
      return;
    }
    if (msg.type === 'stop') {
      send({ type: 'stopping' });
      cleanup();
      return;
    }
    send({ type: 'error', message: 'Unsupported terminal operation.' });
  });

  ws.on('close', () => { clearTimeout(handshakeTimer); cleanup(); releaseSlot(); });
  ws.on('error', () => { clearTimeout(handshakeTimer); cleanup(); releaseSlot(); });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PolyCompile interactive gateway listening on ${PORT}; max sessions ${MAX_SESSIONS}`);
});
