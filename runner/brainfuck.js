#!/usr/bin/env node
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
const tape = new Uint8Array(30000); let pointer = 0; let pc = 0; let steps = 0;
const MAX_STEPS = 10_000_000;
const inputChunks = [];
process.stdin.on('data', chunk => inputChunks.push(Buffer.from(chunk)));
process.stdin.on('end', () => {
  const input = Buffer.concat(inputChunks); let inputAt = 0; const output = [];
  while (pc < code.length) {
    if (++steps > MAX_STEPS) { process.stderr.write('Brainfuck instruction limit exceeded.\n'); process.exitCode = 124; break; }
    switch (code[pc]) {
      case '>': pointer = (pointer + 1) % tape.length; break;
      case '<': pointer = (pointer + tape.length - 1) % tape.length; break;
      case '+': tape[pointer] = (tape[pointer] + 1) & 255; break;
      case '-': tape[pointer] = (tape[pointer] + 255) & 255; break;
      case '.': output.push(tape[pointer]); break;
      case ',': tape[pointer] = inputAt < input.length ? input[inputAt++] : 0; break;
      case '[': if (tape[pointer] === 0) pc = jump.get(pc); break;
      case ']': if (tape[pointer] !== 0) pc = jump.get(pc); break;
    }
    pc++;
  }
  if (output.length) process.stdout.write(Buffer.from(output));
});
