'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.INTERACTIVE_TICKET_SECRET || '';
const IMAGE = process.env.EXECUTION_IMAGE || 'polycompile-exec:latest';
const MAX_SOURCE = 256 * 1024;
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 4);
let active = 0;
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify({status:'healthy', activeSessions:active})); }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 300000 });
server.on('upgrade', (req, socket, head) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname !== '/session' || !verifyTicket(u.searchParams.get('ticket'))) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
function verifyTicket(token) {
  if (!SECRET || !token) return false;
  const parts = token.split('.'); if (parts.length !== 2) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(parts[0]).digest('base64url');
  const a = Buffer.from(expected); const b = Buffer.from(parts[1]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return false;
  try { const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); return p.exp > Date.now() && p.scope === 'interactive-run'; } catch { return false; }
}
wss.on('connection', (ws) => {
  if (active >= MAX_SESSIONS) { ws.send(JSON.stringify({type:'error',message:'Execution capacity is full. Try again shortly.'})); return ws.close(1013); }
  let docker = null; let initialized = false; let outputBuffer = ''; let outputBytes = 0; let containerName = `pc-${crypto.randomBytes(8).toString('hex')}`;
  const cleanup = () => { if (docker && !docker.killed) docker.kill('SIGKILL'); };
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!initialized) {
      if (msg.type !== 'start' || typeof msg.sourceCode !== 'string' || msg.sourceCode.length > MAX_SOURCE || typeof msg.languageId !== 'string') { ws.send(JSON.stringify({type:'error',message:'Invalid start request or source exceeds 256 KB.'})); return ws.close(1008); }
      initialized = true; active++;
      const args = ['run','--rm','--name',containerName,'-i','--network','none','--memory','256m','--cpus','0.50','--pids-limit','64','--read-only','--tmpfs','/work:rw,nosuid,nodev,size=16m,uid=10001,gid=10001,mode=0700','--tmpfs','/tmp:rw,nosuid,nodev,size=32m','--tmpfs','/exec:rw,nosuid,nodev,size=64m,uid=10001,gid=10001,mode=0700','--cap-drop','ALL','--security-opt','no-new-privileges','--user','10001:10001','--entrypoint','node',IMAGE,'/opt/session-runner.js'];
      docker = spawn('docker', args, { stdio:['pipe','pipe','pipe'] });
      docker.stdout.setEncoding('utf8');
      docker.stdout.on('data', chunk => { outputBuffer += chunk; let idx; while ((idx=outputBuffer.indexOf('\n')) >= 0) { const line=outputBuffer.slice(0,idx); outputBuffer=outputBuffer.slice(idx+1); try { const event=JSON.parse(line); if (event.data) { const decoded=Buffer.from(event.data,'base64'); outputBytes += decoded.length; if (outputBytes > 1000000) { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'stderr',data:'\n[Output limit reached: 1 MB]'})); cleanup(); return; } event.data=decoded.toString('utf8'); } if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(event)); } catch {} } });
      docker.stderr.on('data', b => { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'stderr',data:b.toString()})); });
      docker.on('error', e => { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'error',message:`Docker launch failed: ${e.message}`})); });
      docker.on('close', code => { if (active>0) active--; if (ws.readyState===WebSocket.OPEN) { ws.send(JSON.stringify({type:'closed',code})); ws.close(); } });
      docker.stdin.write(JSON.stringify({language:msg.languageId,source:Buffer.from(msg.sourceCode).toString('base64'),timeoutMs:msg.timeoutMs||15000})+'\n');
      return;
    }
    if (msg.type === 'input' && typeof msg.data === 'string' && Buffer.byteLength(msg.data, 'utf8') <= 65536 && docker?.stdin.writable) docker.stdin.write(msg.data + (msg.newline === false ? '' : '\n'));
    if (msg.type === 'eof' && docker?.stdin.writable) docker.stdin.write('\u0004');
    if (msg.type === 'stop') cleanup();
  });
  ws.on('close', cleanup); ws.on('error', cleanup);
});
server.listen(PORT, '0.0.0.0', () => console.log(`Interactive gateway listening on ${PORT}`));
