'use strict';
// Programiz-style synchronous prompt() compatibility for Node.js/TypeScript.
// The PTY gateway owns line input and has disabled kernel echo, so this wrapper
// prints the prompt and reads exactly one submitted terminal line.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

// Ensure readline.close() unrefs stdin so Node.js can exit cleanly after readline is closed.
const origClose = readline.Interface.prototype.close;
readline.Interface.prototype.close = function(...args) {
  const result = origClose.apply(this, args);
  try {
    process.stdin.pause();
    if (typeof process.stdin.unref === 'function') process.stdin.unref();
  } catch {}
  return result;
};

global.prompt = function prompt(message = '') {
  if (message !== undefined && message !== null && String(message).length) {
    process.stdout.write(String(message));
  }
  const bytes = Buffer.alloc(1);
  const chunks = [];
  while (true) {
    let count;
    try { count = fs.readSync(0, bytes, 0, 1, null); }
    catch (error) {
      if (error && error.code === 'EINTR') continue;
      throw error;
    }
    if (count === 0) return chunks.length ? Buffer.concat(chunks).toString('utf8') : null;
    if (bytes[0] === 0x0a) break;
    if (bytes[0] !== 0x0d) chunks.push(Buffer.from(bytes.subarray(0, count)));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const entry = process.argv[2];
if (!entry) {
  process.stderr.write('No JavaScript source file was provided.\n');
  process.exit(2);
}
const target = path.resolve(entry);
process.argv = [process.argv[0], target, ...process.argv.slice(3)];
require(target);
