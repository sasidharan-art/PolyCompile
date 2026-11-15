'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-pty-test-'));
const registryPath = path.join(root, 'languages.json');
const workDir = path.join(root, 'work');
const execDir = path.join(root, 'exec');
fs.mkdirSync(workDir); fs.mkdirSync(execDir);
const pythonProgram = [
  'import sys',
  'print("READY FOR INPUT", flush=True)',
  'first = sys.stdin.readline()',
  'print("FIRST=" + first.rstrip("\\n"), flush=True)',
  'second = sys.stdin.readline()',
  'print("SECOND=" + second.rstrip("\\n"), flush=True)',
  'third = sys.stdin.readline()',
  'print("THIRD_EOF=" + str(third == ""), flush=True)'
].join('; ');
const defaultPython = process.platform === 'win32' ? 'python' : 'python3';
fs.writeFileSync(registryPath, JSON.stringify([{
  id: 'pty-test', name: 'PTY protocol test', sourceFile: 'main.py',
  run: [process.env.PYTHON || defaultPython, '-c', pythonProgram]
}]));

function run() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, 'session-runner.js')], {
      env: { ...process.env, POLYCOMPILE_LANGUAGE_REGISTRY: registryPath, POLYCOMPILE_WORK_DIR: workDir, POLYCOMPILE_EXEC_DIR: execDir },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let buffer = '';
    let output = '';
    let ready = false;
    let exited = false;
    let stderr = '';
    const timeout = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error(`PTY protocol test timed out. output=${JSON.stringify(output)} stderr=${stderr}`)); }, 12000);
    const finish = (error, result) => {
      if (exited) return;
      exited = true;
      clearTimeout(timeout);
      if (error) reject(error); else resolve(result);
    };
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', chunk => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.data) output += Buffer.from(event.data, 'base64').toString('utf8');
        if (event.type === 'ready' && !ready) {
          ready = true;
          proc.stdin.write('Alpha value\n');
          setTimeout(() => proc.stdin.write('Beta value with spaces\n'), 100);
          setTimeout(() => proc.stdin.write('\u0004'), 200);
        }
        if (event.type === 'exit') {
          try {
            assert.equal(event.code, 0, `Unexpected exit ${event.code}; ${output}; ${stderr}`);
            assert.match(output, /READY FOR INPUT/);
            assert.match(output, /FIRST=Alpha value/);
            assert.match(output, /SECOND=Beta value with spaces/);
            assert.match(output, /THIRD_EOF=True/);
            assert.equal((output.match(/Alpha value/g) || []).length, 1, 'PTY must not echo submitted input a second time.');
            finish(null, { output, event });
          } catch (error) { finish(error); }
        }
      }
    });
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.once('error', error => finish(error));
    proc.once('close', code => { if (!exited) finish(new Error(`PTY session closed with ${code}; ${output}; ${stderr}`)); });
    const header = JSON.stringify({ language: 'pty-test', source: Buffer.from('print("PTY test")').toString('base64'), timeoutMs: 8000 }) + '\n';
    proc.stdin.write(header);
  });
}

(async () => {
  try {
    const result = await run();
    console.log('[PASS] PTY accepts sequential line input, preserves spaces, handles Ctrl+D/EOF, and does not echo input twice.');
    console.log(`[PASS] Interactive protocol completed in ${result.event.durationMs} ms.`);
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }); } catch {}
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
