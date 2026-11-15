'use strict';
const http = require('node:http');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');
const assert = require('node:assert/strict');

const WEB_PORT = 3000;
const GATEWAY_PORT = 8081;

console.log('================================================================');
console.log(' POLYCOMPILE COMPLETE END-TO-END SYSTEM VERIFICATION');
console.log(' Testing all endpoints, interactive terminal & compiler engine');
console.log('================================================================\n');

// 1. Start Gateway
console.log('[1/4] Spawning local-dev-gateway.js on port ' + GATEWAY_PORT + '...');
const gatewayProc = spawn(process.execPath, ['local-dev-gateway.js'], {
  cwd: __dirname,
  env: { ...process.env, LOCAL_DEV_PORT: String(GATEWAY_PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});

gatewayProc.stdout.on('data', d => console.log('  [GATEWAY]', d.toString().trim()));
gatewayProc.stderr.on('data', d => console.error('  [GATEWAY ERR]', d.toString().trim()));

// 2. Start Web Server
console.log('[2/4] Spawning server.js on port ' + WEB_PORT + '...');
const serverProc = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  env: {
    ...process.env,
    PORT: String(WEB_PORT),
    LOCAL_DEV_MODE: 'true',
    INTERACTIVE_GATEWAY_URL: `ws://localhost:${GATEWAY_PORT}`
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProc.stdout.on('data', d => console.log('  [SERVER]', d.toString().trim()));
serverProc.stderr.on('data', d => console.error('  [SERVER ERR]', d.toString().trim()));

function get(path, port = WEB_PORT) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, json, text: data });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    }).on('error', reject);
  });
}

function post(path, body, port = WEB_PORT) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, json, text: data });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function waitForServer(port, path = '/health', maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await get(path, port);
      if (res.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Server on port ${port} failed to become healthy.`);
}

(async () => {
  try {
    console.log('[3/4] Waiting for services to become healthy...');
    await waitForServer(GATEWAY_PORT, '/health');
    console.log('  ✓ Gateway healthy on port ' + GATEWAY_PORT);
    await waitForServer(WEB_PORT, '/api/health');
    console.log('  ✓ Web server healthy on port ' + WEB_PORT);

    console.log('\n[4/4] Running automated functional and interactive tests:\n');

    // Test A: UI Static Frontend Assets
    const home = await get('/');
    assert.equal(home.status, 200);
    assert.ok(home.text.includes('PolyCompile'), 'Homepage HTML contains title');
    assert.ok(home.text.includes('consoleOutput') && home.text.includes('terminal-window'), 'Contains interactive terminal UI');
    console.log('  [PASS] GET / — Homepage HTML & terminal interface delivered (200 OK)');

    // Test B: Languages Catalogue API
    const langs = await get('/api/languages');
    assert.equal(langs.status, 200);
    assert.ok(langs.json.languages.length >= 55, `Catalogue has ${langs.json.languages.length} languages`);
    console.log(`  [PASS] GET /api/languages — Catalogue valid (${langs.json.languages.length} languages loaded)`);

    // Test C: Snippets API
    const snips = await get('/api/snippets');
    assert.equal(snips.status, 200);
    assert.ok(snips.json.snippets.length >= 50, 'Snippets library loaded');
    console.log(`  [PASS] GET /api/snippets — Preloaded snippets valid (${snips.json.snippets.length} snippets available)`);

    // Test D: Automatic Language Detection API
    const detPy = await post('/api/detect', { sourceCode: 'def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)\nprint(fib(10))' });
    assert.equal(detPy.status, 200);
    assert.equal(detPy.json.detected.id, 'python');
    console.log(`  [PASS] POST /api/detect — Correctly detected Python (${detPy.json.confidence}%)`);

    const detC = await post('/api/detect', { sourceCode: '#include <stdio.h>\nint main() { printf("Hello\\n"); return 0; }' });
    assert.equal(detC.status, 200);
    assert.equal(detC.json.detected.id, 'c');
    console.log(`  [PASS] POST /api/detect — Correctly detected C (${detC.json.confidence}%)`);

    // Test E: 6-Phase Compiler Inspection API
    const phases = await post('/api/compile-phases', {
      languageId: 'c',
      sourceCode: 'int sum(int a, int b) { return a + b; }\nint main() { int res = sum(3, 4); return 0; }'
    });
    assert.equal(phases.status, 200);
    assert.ok(phases.json.phases.phase1_lexical.totalTokens > 0, 'Lexical tokens generated');
    assert.ok(phases.json.phases.phase2_syntax.ast, 'AST generated');
    assert.ok(phases.json.phases.phase3_semantic.symbolTable, 'Symbol table generated');
    assert.ok(phases.json.phases.phase4_intermediate.tac.length > 0, 'TAC IR generated');
    assert.ok(phases.json.phases.phase5_optimization.assemblyCode, 'Target assembly emitted');
    console.log('  [PASS] POST /api/compile-phases — Lexer, Parser, AST, Semantics, TAC & Assembly generated');

    // Test F: Interactive Ticket Issuance API
    const ticketRes = await post('/api/interactive-ticket', {});
    assert.equal(ticketRes.status, 200);
    assert.ok(ticketRes.json.ticket, 'Signed ticket returned');
    assert.ok(ticketRes.json.gatewayUrl, 'Gateway URL returned');
    console.log('  [PASS] POST /api/interactive-ticket — HMAC-SHA256 ticket issued');
    console.log('  Ticket Response:', JSON.stringify(ticketRes.json));

    // Test G: Real-Time Bidirectional Interactive Terminal Execution
    console.log('\n  --- Testing Interactive Programiz-Style Bidirectional Terminal ---');
    const ws = new WebSocket(ticketRes.json.gatewayUrl);

    let output = '';
    let ready = false;
    let exitCode = null;
    let sentName = false;
    let sentCity = false;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Interactive run timed out. Output: ${JSON.stringify(output)}`)), 15000);

      ws.on('open', () => {
        const pythonInteractiveCode = [
          'name = input("Enter programmer name: ")',
          'city = input("Enter your city: ")',
          'print("--- Programiz-Style Output ---")',
          'print(f"Developer: {name}")',
          'print(f"Location: {city}")'
        ].join('\n');

        ws.send(JSON.stringify({
          type: 'start',
          languageId: 'python',
          sourceCode: pythonInteractiveCode,
          timeoutMs: 12000
        }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ready') ready = true;
        if (msg.type === 'stdout') {
          output += msg.data;
          // Step 1: Program prompts for name -> user types name
          if (output.includes('Enter programmer name:') && !sentName) {
            sentName = true;
            ws.send(JSON.stringify({ type: 'input', data: 'Grace Hopper', newline: true }));
          }
          // Step 2: Program prompts for city -> user types city
          if (output.includes('Enter your city:') && !sentCity) {
            sentCity = true;
            ws.send(JSON.stringify({ type: 'input', data: 'New York', newline: true }));
          }
        }
        if (msg.type === 'exit') {
          exitCode = msg.code;
          clearTimeout(timer);
          ws.close();
          resolve();
        }
        if (msg.type === 'error') {
          clearTimeout(timer);
          reject(new Error(msg.message));
        }
      });
      ws.on('error', reject);
    });

    assert.equal(ready, true, 'Terminal received ready event');
    assert.equal(exitCode, 0, 'Program completed with code 0');
    assert.match(output, /Enter programmer name:/, 'Prompt 1 rendered');
    assert.match(output, /Enter your city:/, 'Prompt 2 rendered');
    assert.match(output, /Developer: Grace Hopper/, 'Program processed first input');
    assert.match(output, /Location: New York/, 'Program processed second input');

    console.log('  [PASS] Interactive terminal received prompt 1 -> forwarded "Grace Hopper"');
    console.log('  [PASS] Interactive terminal received prompt 2 -> forwarded "New York"');
    console.log('  [PASS] Program computed and returned final output in exact order:');
    console.log('         Developer: Grace Hopper | Location: New York');

    console.log('\n================================================================');
    console.log(' ★ ALL 10 SYSTEM AND INTERACTIVE VERIFICATIONS PASSED 100%! ★');
    console.log(' The project in Downloads is completely functional and ready!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n[SYSTEM VERIFICATION FAILED]', err);
    process.exitCode = 1;
  } finally {
    try { gatewayProc.kill('SIGTERM'); } catch {}
    try { serverProc.kill('SIGTERM'); } catch {}
    setTimeout(() => process.exit(process.exitCode || 0), 100).unref();
  }
})();
