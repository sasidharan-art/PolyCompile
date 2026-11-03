const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SandboxClient = require('./SandboxClient');
const { getLanguageById } = require('../compiler/LanguageRegistry');

// Only dispatch to the requested language. Never reinterpret unknown source as Python.
const RUNTIMES = {
  python: { file: 'main.py', command: () => process.platform === 'win32' ? 'py' : 'python3', args: f => process.platform === 'win32' ? ['-3', '-u', f] : ['-u', f] },
  javascript: { file: 'main.js', command: () => 'node', args: f => [f] }, nodejs: { file: 'main.js', command: () => 'node', args: f => [f] },
  ruby: { file: 'main.rb', command: () => 'ruby', args: f => [f] }, php: { file: 'main.php', command: () => 'php', args: f => [f] }, perl: { file: 'main.pl', command: () => 'perl', args: f => [f] },
  bash: { file: 'main.sh', command: () => process.platform === 'win32' ? 'bash' : '/bin/bash', args: f => [f] },
  c: { file: 'main.c', compile: 'gcc', output: 'program' }, cpp: { file: 'main.cpp', compile: 'g++', output: 'program' }, 'c++': { file: 'main.cpp', compile: 'g++', output: 'program' },
  fortran: { file: 'main.f90', compile: 'gfortran', output: 'program' }, pascal: { file: 'main.pas', compile: 'fpc', output: 'main' },
  java: { file: 'Main.java', compile: 'javac', output: 'Main.class' }, go: { file: 'main.go', command: 'go', args: f => ['run', f] },
  rust: { file: 'main.rs', compile: 'rustc', output: 'program' }, csharp: { file: 'Main.cs', command: 'dotnet', args: f => ['script', f] },
  lua: { file: 'main.lua', command: 'lua', args: f => [f] }, r: { file: 'main.R', command: 'Rscript', args: f => [f] },
  haskell: { file: 'main.hs', command: 'runghc', args: f => [f] }, elixir: { file: 'main.exs', command: 'elixir', args: f => [f] },
  ocaml: { file: 'main.ml', command: 'ocaml', args: f => [f] }, julia: { file: 'main.jl', command: 'julia', args: f => [f] },
  swift: { file: 'main.swift', command: 'swift', args: f => [f] }, kotlin: { file: 'Main.kt', command: 'kotlinc', output: 'main.jar' },
  scala: { file: 'Main.scala', command: 'scala', args: f => [f] }, groovy: { file: 'main.groovy', command: 'groovy', args: f => [f] },
  dart: { file: 'main.dart', command: 'dart', args: f => ['run', f] },
};

class InteractiveSession {
  constructor(ws) {
    this.ws = ws; this.process = null; this.tempDir = null; this.timer = null; this.startedAt = 0;
    this.ws.on('message', msg => this.handleMessage(msg));
    this.ws.on('close', () => this.cleanup());
  }
  send(data) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(data)); }
  async handleMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return this.send({ type: 'error', message: 'Invalid terminal message.' }); }
    try {
      if (msg.type === 'start') await this.startExecution(msg.sourceCode || '', msg.languageId, msg.timeoutMs || 60000);
      else if (msg.type === 'input') {
        if (this.process?.stdin && !this.process.stdin.destroyed) this.process.stdin.write(String(msg.data ?? '') + (msg.newline === false ? '' : '\n'));
      } else if (msg.type === 'stop') this.cleanup();
    } catch (e) { this.send({ type: 'error', message: e.message || 'Execution failed.' }); this.cleanup(false); }
  }
  async startExecution(sourceCode, languageId, timeoutMs) {
    this.cleanup(false);
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poly-run-'));
    const id = String(languageId || '').toLowerCase();
    const language = getLanguageById(id);
    if (!language) throw new Error(`Unsupported language identifier: ${id || '(empty)'}`);
    const spec = RUNTIMES[id];
    if (!spec) return this.runCloud(language, sourceCode);
    const sourceFile = path.join(this.tempDir, spec.file);
    fs.writeFileSync(sourceFile, sourceCode);
    let cmd, args;
    try {
      if (spec.compile) {
        const output = path.join(this.tempDir, spec.output || 'program');
        const compileArgs = id === 'java' ? [sourceFile] : id === 'kotlin' ? [sourceFile, '-include-runtime', '-d', output] : [sourceFile, '-o', output];
        await this.compileCommand(spec.compile, compileArgs);
        if (id === 'java') { cmd = 'java'; args = ['-cp', this.tempDir, 'Main']; }
        else if (id === 'kotlin') { cmd = 'java'; args = ['-jar', output]; }
        else { cmd = output; args = []; }
      } else { cmd = typeof spec.command === 'function' ? spec.command() : spec.command; args = spec.args(sourceFile); }
      this.startChild(cmd, args, timeoutMs, id, language, sourceCode);
    } catch (err) {
      // If this host does not have the compiler/interpreter, use the configured cloud
      // compiler for non-interactive completion rather than running the source as Python.
      if (/not found|ENOENT|Compiler not found/i.test(err.message)) return this.runCloud(language, sourceCode);
      throw err;
    }
  }
  startChild(cmd, args, timeoutMs, id, language, sourceCode) {
    this.startedAt = Date.now();
    this.process = spawn(cmd, args, { cwd: this.tempDir, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let settled = false;
    this.process.stdout.on('data', d => this.send({ type: 'stdout', data: d.toString() }));
    this.process.stderr.on('data', d => this.send({ type: 'stderr', data: d.toString() }));
    this.process.on('spawn', () => this.send({ type: 'ready', language: id }));
    this.process.on('error', async err => {
      if (settled) return;
      settled = true;
      this.cleanup(false);
      try { await this.runCloud(language, sourceCode); }
      catch (cloudErr) { this.send({ type: 'error', message: `Runtime '${cmd}' is unavailable and cloud execution failed: ${cloudErr.message}` }); }
    });
    this.process.on('close', code => {
      if (settled) return;
      settled = true;
      this.send({ type: 'exit', code: code ?? 1, durationMs: Date.now() - this.startedAt });
      this.cleanup(false);
    });
    this.timer = setTimeout(() => {
      this.send({ type: 'error', message: 'Execution timed out.' });
      this.cleanup(true);
    }, timeoutMs);
  }
  async runCloud(language, sourceCode) {
    this.send({ type: 'ready', language: language.id, mode: 'cloud-batch' });
    this.send({ type: 'stdout', data: '[Cloud sandbox mode: this provider accepts input before execution, not live terminal input.]\n' });
    const result = await SandboxClient.execute({ language, sourceCode, stdin: '' });
    if (result.stdout) this.send({ type: 'stdout', data: result.stdout });
    if (result.compileOutput) this.send({ type: 'stderr', data: result.compileOutput });
    if (result.stderr) this.send({ type: 'stderr', data: result.stderr });
    this.send({ type: 'exit', code: result.exitCode ?? (result.success ? 0 : 1), durationMs: result.executionTimeMs || 0 });
    this.cleanup(false);
  }
  compileCommand(command, args) {
    return new Promise((resolve, reject) => {
      const p = spawn(command, args, { cwd: this.tempDir, windowsHide: true });
      let stderr = ''; p.stderr.on('data', d => stderr += d.toString());
      p.on('error', e => reject(new Error(`Compiler not found: ${command} (${e.message})`)));
      p.on('close', code => code === 0 ? resolve() : reject(new Error(stderr || `${command} compilation failed (exit ${code}).`)));
    });
  }
  cleanup(kill = true) {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (kill && this.process) { try { this.process.kill(); } catch {} }
    this.process = null;
    if (this.tempDir) { try { fs.rmSync(this.tempDir, { recursive: true, force: true }); } catch {} this.tempDir = null; }
  }
}
module.exports = InteractiveSession;
