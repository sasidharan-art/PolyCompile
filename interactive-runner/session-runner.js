'use strict';
/**
 * One execution per container. Protocol on stdin:
 *   first line: JSON session header
 *   subsequent bytes: live program stdin
 * Protocol on stdout: newline-delimited JSON events; stdout/stderr payloads are base64.
 *
 * A PTY is deliberately used for the program phase so prompts without a newline
 * are flushed. The browser owns input echo; PTY echo is disabled to avoid doubles.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const REGISTRY_PATH = process.env.POLYCOMPILE_LANGUAGE_REGISTRY || '/opt/languages.json';
const WORK_DIR = process.env.POLYCOMPILE_WORK_DIR || '/work';
const EXEC_DIR = process.env.POLYCOMPILE_EXEC_DIR || '/exec';
const MAX_HEADER_BYTES = 2 * 1024 * 1024;
const MAX_QUEUED_INPUT_BYTES = 256 * 1024;
const MAX_TIMEOUT_MS = 60_000;

let registry;
try { registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); }
catch { process.stderr.write('Execution runtime registry is unavailable.\n'); process.exit(70); }

let header = Buffer.alloc(0);
let headerComplete = false;
let child = null;
let childPhase = null;
let pendingInput = [];
let pendingInputBytes = 0;
let inputEnded = false;
let sessionFinished = false;
let sessionTimedOut = false;
let compileFailed = false;
let timer = null;
let startedAt = 0;
let timeoutMs = 15_000;
let compileDurationMs = 0;
let activeLanguage = null;

function send(type, extra = {}) {
  if (sessionFinished && type !== 'exit') return;
  try { process.stdout.write(JSON.stringify({ type, ...extra }) + '\n'); } catch {}
}
function encode(value) { return Buffer.from(String(value)).toString('base64'); }
function emitOutput(type, chunk, phase) {
  if (!chunk || !chunk.length) return;
  send(type, { data: chunk.toString('base64'), phase });
}
function safeMessage(error) {
  const message = error && typeof error.message === 'string' ? error.message : 'Execution could not be started.';
  return message.replace(/[\r\n]+/g, ' ').slice(0, 500);
}
function shellQuote(value) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function validCommand(command) {
  return Array.isArray(command) && command.length > 0 && command.every(x => typeof x === 'string' && x.length > 0);
}
function flushPendingInput() {
  if (!child || !child.stdin || !child.stdin.writable || childPhase !== 'run') return;
  for (const chunk of pendingInput) child.stdin.write(chunk);
  pendingInput = [];
  pendingInputBytes = 0;
  if (inputEnded) child.stdin.end();
}
function deliverInput(chunk) {
  if (!chunk || !chunk.length || sessionFinished) return;
  if (!hasScriptCommand()) {
    const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    if (str.includes('\u0004')) {
      const parts = str.split('\u0004');
      if (parts[0].length && child && childPhase === 'run' && child.stdin && child.stdin.writable) {
        child.stdin.write(parts[0]);
      }
      endInput();
      return;
    }
  }
  if (child && childPhase === 'run' && child.stdin && child.stdin.writable) {
    child.stdin.write(chunk);
    return;
  }
  // Input arriving during compilation/startup is queued for the program, never
  // sent to a compiler process. The cap prevents an unbounded pre-start buffer.
  if (pendingInputBytes + chunk.length > MAX_QUEUED_INPUT_BYTES) {
    send('error', { message: 'Too much input was queued before the program started.' });
    stopSession(1);
    return;
  }
  pendingInput.push(Buffer.from(chunk));
  pendingInputBytes += chunk.length;
}
function endInput() {
  inputEnded = true;
  if (child && childPhase === 'run' && child.stdin && child.stdin.writable) child.stdin.end();
}
function killCurrent(signal = 'SIGKILL') {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      child.kill(signal);
    } else {
      process.kill(-child.pid, signal);
    }
  }
  catch { try { child.kill(signal); } catch {} }
}
function stopSession(code = 130) {
  if (sessionFinished) return;
  killCurrent('SIGKILL');
  finish(code);
}
function readPeakMemoryBytes() {
  for (const file of ['/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory/memory.max_usage_in_bytes']) {
    try { const value = Number(fs.readFileSync(file, 'utf8').trim()); if (Number.isFinite(value) && value > 0) return value; } catch {}
  }
  return null;
}
function finish(code, extra = {}) {
  if (sessionFinished) return;
  sessionFinished = true;
  clearTimeout(timer);
  const finalCode = sessionTimedOut ? 124 : (Number.isInteger(code) ? code : 1);
  send('exit', {
    code: finalCode,
    durationMs: Math.max(0, Date.now() - startedAt),
    compileDurationMs,
    memoryBytes: readPeakMemoryBytes(),
    timedOut: sessionTimedOut,
    compileFailed,
    ...extra
  });
  setTimeout(() => process.exit(finalCode), 25).unref();
}

let scriptAvailable = null;
function hasScriptCommand() {
  if (scriptAvailable !== null) return scriptAvailable;
  if (process.platform === 'win32') {
    scriptAvailable = false;
    return false;
  }
  try {
    const res = require('node:child_process').spawnSync('script', ['--version'], { stdio: 'ignore' });
    scriptAvailable = res.status === 0;
  } catch {
    scriptAvailable = false;
  }
  return scriptAvailable;
}

function runCommand(argv, phase) {
  return new Promise(resolve => {
    if (!validCommand(argv)) return resolve(127);
    const command = argv.map(shellQuote).join(' ');
    let settled = false;
    let spawned = false;
    const finishCommand = code => {
      if (settled) return;
      settled = true;
      if (childPhase === phase) { child = null; childPhase = null; }
      resolve(Number.isInteger(code) ? code : 1);
    };
    try {
      let proc;
      if (hasScriptCommand()) {
        // `script` allocates a PTY for the child program. The command itself is
        // selected exclusively from the trusted language registry.
        proc = spawn('script', ['--quiet', '--return', '--flush', '--echo', 'never', '--command', `stty -echo; exec ${command}`, '/dev/null'], {
          cwd: WORK_DIR,
          env: {
            PATH: process.env.POLYCOMPILE_PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            HOME: '/tmp', TMPDIR: '/tmp', GOCACHE: '/tmp/go-cache',
            DOTNET_CLI_HOME: '/tmp/dotnet', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
            DOTNET_NOLOGO: '1', LANG: 'C.UTF-8', TERM: 'xterm-256color'
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: true
        });
      } else {
        let cmd = argv[0];
        let args = argv.slice(1);
        if (process.platform === 'win32' && cmd === 'python3') {
          cmd = 'python';
        }
        proc = spawn(cmd, args, {
          cwd: WORK_DIR,
          env: {
            ...process.env,
            PATH: process.env.POLYCOMPILE_PATH || process.env.PATH,
            HOME: process.env.HOME || '/tmp',
            TMPDIR: process.env.TMPDIR || '/tmp',
            LANG: 'C.UTF-8',
            TERM: 'xterm-256color'
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: process.platform !== 'win32',
          shell: process.platform === 'win32' && (cmd === 'sh' || cmd.endsWith('.sh'))
        });
      }
      child = proc;
      childPhase = phase;
      proc.stdout.on('data', chunk => emitOutput('stdout', chunk, phase));
      proc.stderr.on('data', chunk => emitOutput('stderr', chunk, phase));
      proc.once('spawn', () => {
        spawned = true;
        if (phase === 'run') {
          send('ready', { language: activeLanguage.name, compileDurationMs });
          flushPendingInput();
        }
      });
      proc.once('error', error => {
        emitOutput('stderr', Buffer.from(safeMessage(error)), phase);
        finishCommand(127);
      });
      proc.once('close', (code, signal) => finishCommand(Number.isInteger(code) ? code : (signal ? 128 : (spawned ? 1 : 127))));
    } catch (error) {
      emitOutput('stderr', Buffer.from(safeMessage(error)), phase);
      finishCommand(127);
    }
  });
}

async function start(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return fail('Invalid session configuration.');
  const languageId = typeof config.language === 'string' ? config.language : '';
  const lang = registry.find(item => item.id === languageId);
  if (!lang || !validCommand(lang.run) || (lang.compile && !validCommand(lang.compile))) return fail('This language is not configured on the interactive execution service.');
  const source = Buffer.from(typeof config.source === 'string' ? config.source : '', 'base64').toString('utf8');
  const sourceFile = typeof lang.sourceFile === 'string' ? lang.sourceFile : 'main.txt';
  if (path.basename(sourceFile) !== sourceFile || sourceFile.includes('..')) return fail('Invalid source filename in runtime configuration.');
  try {
    fs.mkdirSync(WORK_DIR, { recursive: true });
    fs.mkdirSync(EXEC_DIR, { recursive: true });
    fs.writeFileSync(path.join(WORK_DIR, sourceFile), source, { mode: 0o600 });
  } catch (error) { return fail(`Unable to prepare the execution workspace: ${safeMessage(error)}`); }

  activeLanguage = lang;
  startedAt = Date.now();
  const requestedTimeout = Number(config.timeoutMs);
  timeoutMs = Number.isFinite(requestedTimeout) ? Math.max(1000, Math.min(requestedTimeout, MAX_TIMEOUT_MS)) : 15_000;
  timer = setTimeout(() => {
    if (sessionFinished) return;
    sessionTimedOut = true;
    send('timeout', { message: 'Program execution exceeded the allowed time.' });
    killCurrent('SIGKILL');
    finish(124);
  }, timeoutMs);
  timer.unref?.();

  if (lang.compile) {
    send('compiling', { language: lang.name });
    const compileStartedAt = Date.now();
    const compileCode = await runCommand(lang.compile, 'compile');
    compileDurationMs = Math.max(0, Date.now() - compileStartedAt);
    if (sessionFinished) return;
    if (compileCode !== 0) {
      compileFailed = true;
      finish(compileCode);
      return;
    }
  }
  if (sessionFinished) return;
  const runCode = await runCommand(lang.run, 'run');
  if (sessionFinished) return;
  finish(runCode);
}
function fail(message, code = 1) {
  send('error', { message: String(message).slice(0, 500) });
  finish(code);
}

function onStdinData(chunk) {
  if (!headerComplete) {
    header = Buffer.concat([header, chunk]);
    if (header.length > MAX_HEADER_BYTES) return fail('Session header is too large.');
    const newline = header.indexOf(0x0a);
    if (newline < 0) return;
    const headerLine = header.subarray(0, newline).toString('utf8');
    const remainder = header.subarray(newline + 1);
    headerComplete = true;
    header = Buffer.alloc(0);
    let config;
    try { config = JSON.parse(headerLine); }
    catch { return fail('Invalid session header.'); }
    // Start is synchronous until the first await; subsequent input is buffered
    // while compilation occurs and flushed only to the program's PTY.
    start(config).catch(error => fail(safeMessage(error)));
    if (remainder.length) deliverInput(remainder);
    return;
  }
  deliverInput(chunk);
}
process.stdin.on('data', onStdinData);
process.stdin.on('end', endInput);
process.stdin.on('error', error => fail(`Input stream failed: ${safeMessage(error)}`));
