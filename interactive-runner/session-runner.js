'use strict';
// Runs inside a fresh, resource-limited container. First stdin line is session JSON;
// all following stdin bytes are forwarded to the compiled program's stdin.
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const registry = JSON.parse(fs.readFileSync('/opt/languages.json', 'utf8'));
let header = ''; let initialized = false; let child = null; let timeout;
function send(type, extra = {}) { process.stdout.write(JSON.stringify({ type, ...extra }) + '\n'); }
function fail(message, code = 1) { send('stderr', { data: Buffer.from(message).toString('base64') }); send('exit', { code }); setTimeout(() => process.exit(code), 40).unref(); }
async function start(config) {
  const lang = registry.find(x => x.id === config.language);
  if (!lang || !Array.isArray(lang.run) || !lang.run.length) return fail('Unsupported or invalid language configuration.');
  const source = Buffer.from(config.source, 'base64').toString('utf8');
  const file = lang.sourceFile || 'main.txt';
  fs.writeFileSync('/work/' + file, source, { mode: 0o600 });
  const env = { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', HOME: '/tmp', TMPDIR: '/tmp', LANG: 'C.UTF-8' };
  const run = (argv, done) => {
    child = spawn(argv[0], argv.slice(1), { cwd: '/work', env, stdio: ['pipe','pipe','pipe'], detached: true });
    child.stdout.on('data', b => send('stdout', { data: b.toString('base64') }));
    child.stderr.on('data', b => send('stderr', { data: b.toString('base64') }));
    child.on('error', e => { send('stderr', { data: Buffer.from(e.message).toString('base64') }); done(127); });
    child.on('close', (code, signal) => done(Number.isInteger(code) ? code : (signal ? 128 : 1)));
  };
  const finish = code => { clearTimeout(timeout); send('exit', { code, durationMs: Date.now() - started }); setTimeout(() => process.exit(code), 40).unref(); };
  const started = Date.now();
  const runProgram = () => {
    send('ready', { language: lang.name });
    timeout = setTimeout(() => { if (child && child.pid) { send('stderr', { data: Buffer.from('\nExecution timed out.').toString('base64') }); try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } } }, Math.min(Math.max(Number(config.timeoutMs) || 15000, 1000), 60000));
    run(lang.run, finish);
  };
  if (lang.compile) {
    run(lang.compile, code => { child = null; if (code !== 0) finish(code); else runProgram(); });
  } else runProgram();
  process.stdin.on('data', chunk => { if (child && child.stdin.writable) child.stdin.write(chunk); });
  process.stdin.on('end', () => { if (child && child.stdin.writable) child.stdin.end(); });
}
process.stdin.on('data', function first(chunk) {
  if (initialized) return;
  header += chunk.toString('utf8');
  const nl = header.indexOf('\n');
  if (nl < 0) { if (header.length > 2000000) { initialized = true; fail('Session header too large.'); } return; }
  initialized = true; process.stdin.removeListener('data', first);
  const line = header.slice(0, nl); const remainder = Buffer.from(header.slice(nl + 1));
  let cfg; try { cfg = JSON.parse(line); } catch { return fail('Invalid session header.'); }
  start(cfg).then(() => { if (remainder.length && child?.stdin.writable) child.stdin.write(remainder); }).catch(e => fail(e.message));
});
