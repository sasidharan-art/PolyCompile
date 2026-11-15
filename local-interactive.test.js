'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');

const TEST_PORT = 8089;
process.env.LOCAL_DEV_PORT = String(TEST_PORT);

console.log('[TEST] Starting local-dev-gateway on port ' + TEST_PORT + '...');
const gateway = spawn(process.execPath, ['local-dev-gateway.js'], {
  cwd: __dirname,
  env: { ...process.env, LOCAL_DEV_PORT: String(TEST_PORT) },
  stdio: ['pipe', 'pipe', 'pipe']
});

gateway.stdout.on('data', chunk => {
  // console.log('[GATEWAY STDOUT]', chunk.toString());
});
gateway.stderr.on('data', chunk => {
  console.error('[GATEWAY STDERR]', chunk.toString());
});

function waitGatewayReady(retries = 20) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`http://127.0.0.1:${TEST_PORT}/health`, res => {
        if (res.statusCode === 200) resolve();
        else if (retries > 0) setTimeout(check, 150);
        else reject(new Error('Gateway failed to start'));
      }).on('error', () => {
        if (retries > 0) setTimeout(check, 150);
        else reject(new Error('Gateway unreachable'));
      });
    };
    check();
  });
}

(async () => {
  try {
    await waitGatewayReady();
    console.log('[PASS] Local gateway health check succeeded.');

    // Test 1: Python interactive two-input program
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);

    let output = '';
    let readyReceived = false;
    let exitCode = null;
    let sentName = false;
    let sentAge = false;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out. Output so far: ${JSON.stringify(output)}`));
      }, 15000);

      ws.on('open', () => {
        const pythonCode = [
          'name = input("Enter name: ")',
          'age = input("Enter age: ")',
          'print(f"HELLO {name} AGE {age}")'
        ].join('\n');

        ws.send(JSON.stringify({
          type: 'start',
          languageId: 'python',
          sourceCode: pythonCode,
          timeoutMs: 10000
        }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') {
          output += msg.data;
          if (output.includes('Enter name:') && !sentName) {
            sentName = true;
            ws.send(JSON.stringify({ type: 'input', data: 'John', newline: true }));
          }
          if (output.includes('Enter age:') && !sentAge) {
            sentAge = true;
            ws.send(JSON.stringify({ type: 'input', data: '25', newline: true }));
          }
        }
        if (msg.type === 'ready') {
          readyReceived = true;
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

    assert.equal(readyReceived, true, 'Gateway should emit ready event');
    assert.equal(exitCode, 0, `Exit code should be 0, got ${exitCode}`);
    assert.match(output, /Enter name:/, 'Output should contain prompt 1');
    assert.match(output, /Enter age:/, 'Output should contain prompt 2');
    assert.match(output, /HELLO John AGE 25/, 'Output should contain calculated result');

    console.log('[PASS] Interactive Python program completed successfully:');
    console.log('       Received prompts and processed inputs in correct order.');
    console.log('       Final program output: HELLO John AGE 25');

    // Test 2: JavaScript Prompt polyfill test
    const ws2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
    let output2 = '';
    let exitCode2 = null;
    let sentAda = false;
    let sentCity = false;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`JS test timed out. Output: ${JSON.stringify(output2)}`));
      }, 15000);

      ws2.on('open', () => {
        const jsCode = [
          'const name = prompt("Name: ");',
          'const city = prompt("City: ");',
          'console.log(`GREETINGS: ${name} from ${city}`);'
        ].join('\n');

        ws2.send(JSON.stringify({
          type: 'start',
          languageId: 'javascript',
          sourceCode: jsCode,
          timeoutMs: 10000
        }));
      });

      ws2.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') {
          output2 += msg.data;
          if (output2.includes('Name:') && !sentAda) {
            sentAda = true;
            ws2.send(JSON.stringify({ type: 'input', data: 'Ada', newline: true }));
          }
          if (output2.includes('City:') && !sentCity) {
            sentCity = true;
            ws2.send(JSON.stringify({ type: 'input', data: 'London', newline: true }));
          }
        }
        if (msg.type === 'exit') {
          exitCode2 = msg.code;
          clearTimeout(timer);
          ws2.close();
          resolve();
        }
        if (msg.type === 'error') {
          clearTimeout(timer);
          reject(new Error(msg.message));
        }
      });

      ws2.on('error', reject);
    });

    assert.equal(exitCode2, 0, `JS exit code should be 0, got ${exitCode2}`);
    assert.match(output2, /GREETINGS: Ada from London/, 'Output should contain JS result');
    console.log('[PASS] Interactive JavaScript program with synchronous prompt() succeeded.');

    console.log('\n======================================================');
    console.log(' ALL LOCAL INTERACTIVE TESTS PASSED!');
    console.log(' Real-time bidirectional terminal works end-to-end.');
    console.log('======================================================');
    try { gateway.kill(); } catch {}
    process.exit(0);
  } finally {
    try { gateway.kill(); } catch {}
  }
})().catch(err => {
  console.error('[FAIL]', err.message);
  gateway.kill('SIGTERM');
  process.exit(1);
});
