#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const sourcePath = process.argv[2];
if (!sourcePath) { process.stderr.write('Brainfuck source path missing.\n'); process.exit(2); }
let code;
try { code = fs.readFileSync(sourcePath, 'utf8').replace(/[^><+\-.,\[\]]/g, ''); }
catch (error) { process.stderr.write(`Cannot read source: ${error.message}\n`); process.exit(2); }
const jump = new Map(); const stack = [];
for (let i = 0; i < code.length; i++) {
  if (code[i] === '[') stack.push(i);
  else if (code[i] === ']') {
    if (!stack.length) { process.stderr.write(`Unmatched ] at source command ${i + 1}\n`); process.exit(1); }
    const j = stack.pop(); jump.set(i, j); jump.set(j, i);
  }
}
if (stack.length) { process.stderr.write(`Unmatched [ at source command ${stack.pop() + 1}\n`); process.exit(1); }

// Live stdin queue: the interpreter pauses exactly at `,` and resumes when
// the terminal submits more bytes. It does not wait for EOF before executing.
let inputQueue = Buffer.alloc(0);
let inputEnded = false;
const inputWaiters = [];
function wakeReaders() { while (inputWaiters.length) inputWaiters.shift()(); }
process.stdin.on('data', chunk => { inputQueue = Buffer.concat([inputQueue, Buffer.from(chunk)]); wakeReaders(); });
process.stdin.on('end', () => { inputEnded = true; wakeReaders(); });
async function readByte() {
  while (!inputQueue.length && !inputEnded) await new Promise(resolve => inputWaiters.push(resolve));
  if (!inputQueue.length) return 0;
  const value = inputQueue[0];
  inputQueue = inputQueue.subarray(1);
  return value;
}

(async () => {
  const tape = new Uint8Array(30000); let pointer = 0; let pc = 0; let steps = 0;
  const MAX_STEPS = 10_000_000;
  while (pc < code.length) {
    if (++steps > MAX_STEPS) { process.stderr.write('Brainfuck instruction limit exceeded.\n'); process.exitCode = 124; break; }
    switch (code[pc]) {
      case '>': pointer = (pointer + 1) % tape.length; break;
      case '<': pointer = (pointer + tape.length - 1) % tape.length; break;
      case '+': tape[pointer] = (tape[pointer] + 1) & 255; break;
      case '-': tape[pointer] = (tape[pointer] + 255) & 255; break;
      case '.': process.stdout.write(Buffer.from([tape[pointer]])); break;
      case ',': tape[pointer] = await readByte(); break;
      case '[': if (tape[pointer] === 0) pc = jump.get(pc); break;
      case ']': if (tape[pointer] !== 0) pc = jump.get(pc); break;
    }
    pc++;
  }
  process.stdin.pause();
})().catch(error => { process.stderr.write(`Brainfuck runtime error: ${error.message}\n`); process.exitCode = 1; process.stdin.pause(); });
