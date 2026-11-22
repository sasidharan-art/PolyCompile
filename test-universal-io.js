// test-universal-io.js
// Comprehensive PolyCompile Universal Input/Output & Terminal Test Suite
// Verifies all input categories across both Mode A (Interactive Live) and Mode B (Predefined Stdin)

'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { WebSocket } = require('ws');
const { setupInteractiveGateway } = require('./src/execution/InteractiveGateway');

const TEST_PORT = 8092;

async function runTest() {
  console.log('========================================================');
  console.log(' PolyCompile Universal I/O & Terminal Verification Suite');
  console.log('========================================================');

  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('OK');
  });
  setupInteractiveGateway(server);

  await new Promise(resolve => server.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`[INIT] Test gateway listening on port ${TEST_PORT}`);

  try {
    // -----------------------------------------------------------------
    // TEST 1: Mode A — Single & Multiple Integers (Python)
    // -----------------------------------------------------------------
    console.log('\n[TEST 1] Mode A: Single & Multiple Integers (Python)');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      let output = '';
      let turn = 0;

      ws.on('open', () => {
        const code = `
a = int(input("Enter single int: "))
b, c = map(int, input("Enter two ints: ").split())
print(f"SUM: {a + b + c}")
`;
        ws.send(JSON.stringify({ type: 'start', languageId: 'python', sourceCode: code }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') {
          output += msg.data;
          if (output.includes('Enter single int:') && turn === 0) {
            turn = 1;
            ws.send(JSON.stringify({ type: 'input', data: '10', newline: true }));
          } else if (output.includes('Enter two ints:') && turn === 1) {
            turn = 2;
            ws.send(JSON.stringify({ type: 'input', data: '20 30', newline: true }));
          }
        } else if (msg.type === 'exit') {
          try {
            assert.equal(msg.code, 0);
            assert.match(output, /SUM: 60/);
            console.log('  [PASS] Single integer (10) and multiple space-separated integers (20 30) => SUM: 60');
            ws.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
      ws.on('error', reject);
    });

    // -----------------------------------------------------------------
    // TEST 2: Mode A — Strings with spaces, Unicode, Negative & Float numbers
    // -----------------------------------------------------------------
    console.log('\n[TEST 2] Mode A: Strings with Spaces, Unicode, Negatives, Floats (Python)');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      let output = '';
      let turn = 0;

      ws.on('open', () => {
        const code = `
name = input("Enter name: ")
val = float(input("Enter float: "))
print(f"HELLO: {name} | VAL: {val:.2f}")
`;
        ws.send(JSON.stringify({ type: 'start', languageId: 'python', sourceCode: code }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') {
          output += msg.data;
          if (output.includes('Enter name:') && turn === 0) {
            turn = 1;
            ws.send(JSON.stringify({ type: 'input', data: 'Surya Kumar 🚀', newline: true }));
          } else if (output.includes('Enter float:') && turn === 1) {
            turn = 2;
            ws.send(JSON.stringify({ type: 'input', data: '-123.456', newline: true }));
          }
        } else if (msg.type === 'exit') {
          try {
            assert.equal(msg.code, 0);
            assert.match(output, /HELLO: Surya Kumar 🚀 \| VAL: -123.46/);
            console.log('  [PASS] Full string with spaces and unicode ("Surya Kumar 🚀") & negative float (-123.456) => SUCCESS');
            ws.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
      ws.on('error', reject);
    });

    // -----------------------------------------------------------------
    // TEST 3: Mode B — Predefined Stdin (Matrix Multiplication)
    // -----------------------------------------------------------------
    console.log('\n[TEST 3] Mode B: Predefined Stdin Matrix Multiplication (Python)');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      let output = '';

      const code = `
r1 = int(input())
c1 = int(input())
A = [list(map(int, input().split())) for _ in range(r1)]

r2 = int(input())
c2 = int(input())
B = [list(map(int, input().split())) for _ in range(r2)]

C = [[sum(A[i][k] * B[k][j] for k in range(c1)) for j in range(c2)] for i in range(r1)]
print("RESULT:")
for row in C:
    print(" ".join(map(str, row)))
`;
      // Matrix A (2x2): [[1, 2], [3, 4]]
      // Matrix B (2x2): [[2, 0], [1, 2]]
      // C = [[4, 4], [10, 8]]
      const stdinData = "2\n2\n1 2\n3 4\n2\n2\n2 0\n1 2\n";

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'start',
          languageId: 'python',
          sourceCode: code,
          stdin: stdinData
        }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') output += msg.data;
        else if (msg.type === 'exit') {
          try {
            assert.equal(msg.code, 0);
            assert.match(output, /RESULT:\s*4 4\s*10 8/);
            console.log('  [PASS] 2x2 Matrix Multiplication with predefined stdin executed cleanly => [[4,4],[10,8]]');
            ws.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
      ws.on('error', reject);
    });

    // -----------------------------------------------------------------
    // TEST 4: Mode B — Competitive Programming Test Cases (T blocks)
    // -----------------------------------------------------------------
    console.log('\n[TEST 4] Mode B: Competitive Programming Multi-Test-Case Block (Python)');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      let output = '';

      const code = `
t = int(input())
for case in range(1, t + 1):
    n = int(input())
    arr = list(map(int, input().split()))
    print(f"Case {case}: max={max(arr)} min={min(arr)} sum={sum(arr)}")
`;
      const stdinData = "3\n5\n10 20 5 40 15\n3\n-5 0 5\n4\n100 200 300 400\n";

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'start',
          languageId: 'python',
          sourceCode: code,
          stdin: stdinData
        }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') output += msg.data;
        else if (msg.type === 'exit') {
          try {
            assert.equal(msg.code, 0);
            assert.match(output, /Case 1: max=40 min=5 sum=90/);
            assert.match(output, /Case 2: max=5 min=-5 sum=0/);
            assert.match(output, /Case 3: max=400 min=100 sum=1000/);
            console.log('  [PASS] 3 competitive programming test case blocks processed in batch Mode B');
            ws.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
      ws.on('error', reject);
    });

    // -----------------------------------------------------------------
    // TEST 5: Mode A — Interactive JavaScript prompt()
    // -----------------------------------------------------------------
    console.log('\n[TEST 5] Mode A: Interactive JavaScript prompt()');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/`);
      let output = '';
      let turn = 0;

      ws.on('open', () => {
        const code = `
const name = prompt("Name: ");
const role = prompt("Role: ");
console.log("Registered: " + name + " as " + role);
`;
        ws.send(JSON.stringify({ type: 'start', languageId: 'javascript', sourceCode: code }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'stdout') {
          output += msg.data;
          if (output.includes('Name:') && turn === 0) {
            turn = 1;
            ws.send(JSON.stringify({ type: 'input', data: 'Alice', newline: true }));
          } else if (output.includes('Role:') && turn === 1) {
            turn = 2;
            ws.send(JSON.stringify({ type: 'input', data: 'Lead Architect', newline: true }));
          }
        } else if (msg.type === 'exit') {
          try {
            assert.equal(msg.code, 0);
            assert.match(output, /Registered: Alice as Lead Architect/);
            console.log('  [PASS] Interactive JavaScript prompt() synchronous input works seamlessly');
            ws.close();
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
      ws.on('error', reject);
    });

    console.log('\n========================================================');
    console.log(' ALL UNIVERSAL I/O & TERMINAL TESTS PASSED (100%)');
    console.log('========================================================\n');
  } finally {
    server.close();
  }
}

runTest().catch(err => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
