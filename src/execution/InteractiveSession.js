const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class InteractiveSession {
  constructor(ws) {
    this.ws = ws;
    this.process = null;
    this.tempDir = null;

    this.ws.on('message', (msg) => this.handleMessage(msg));
    this.ws.on('close', () => this.cleanup());
  }

  async handleMessage(rawMessage) {
    try {
      const msg = JSON.parse(rawMessage);
      if (msg.type === 'start') {
        await this.startExecution(msg.sourceCode, msg.languageId, msg.timeoutMs || 60000);
      } else if (msg.type === 'input') {
        if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
          this.process.stdin.write(msg.data + '\n');
        }
      } else if (msg.type === 'stop') {
        this.cleanup();
      }
    } catch (err) {
      this.send({ type: 'error', message: err.message });
    }
  }

  send(data) {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }

  async startExecution(sourceCode, languageId, timeoutMs) {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poly-run-'));
    const lang = (languageId || 'python').toLowerCase();

    let cmd = '';
    let args = [];

    // Universal Language Dispatcher
    if (lang.includes('python')) {
      const f = path.join(this.tempDir, 'main.py');
      fs.writeFileSync(f, sourceCode);
      cmd = 'python3';
      args = ['-u', f];
    } else if (lang === 'c') {
      const f = path.join(this.tempDir, 'main.c');
      const bin = path.join(this.tempDir, 'out_c');
      fs.writeFileSync(f, sourceCode);
      await this.compileCommand('gcc', [f, '-o', bin]);
      cmd = bin;
    } else if (lang === 'cpp' || lang === 'c++') {
      const f = path.join(this.tempDir, 'main.cpp');
      const bin = path.join(this.tempDir, 'out_cpp');
      fs.writeFileSync(f, sourceCode);
      await this.compileCommand('g++', [f, '-o', bin]);
      cmd = bin;
    } else if (lang === 'java') {
      const f = path.join(this.tempDir, 'Main.java');
      fs.writeFileSync(f, sourceCode);
      await this.compileCommand('javac', [f]);
      cmd = 'java';
      args = ['-cp', this.tempDir, 'Main'];
    } else if (lang === 'javascript' || lang === 'nodejs') {
      const f = path.join(this.tempDir, 'main.js');
      fs.writeFileSync(f, sourceCode);
      cmd = 'node';
      args = [f];
    } else if (lang === 'go') {
      const f = path.join(this.tempDir, 'main.go');
      fs.writeFileSync(f, sourceCode);
      cmd = 'go';
      args = ['run', f];
    } else if (lang === 'rust') {
      const f = path.join(this.tempDir, 'main.rs');
      const bin = path.join(this.tempDir, 'out_rs');
      fs.writeFileSync(f, sourceCode);
      await this.compileCommand('rustc', [f, '-o', bin]);
      cmd = bin;
    } else if (lang === 'ruby') {
      const f = path.join(this.tempDir, 'main.rb');
      fs.writeFileSync(f, sourceCode);
      cmd = 'ruby';
      args = [f];
    } else {
      // General Scripting Fallback
      const f = path.join(this.tempDir, 'script.py');
      fs.writeFileSync(f, sourceCode);
      cmd = 'python3';
      args = ['-u', f];
    }

    const startTime = Date.now();
    this.process = spawn(cmd, args, { cwd: this.tempDir });

    this.send({ type: 'ready' });

    this.process.stdout.on('data', (d) => this.send({ type: 'stdout', data: d.toString() }));
    this.process.stderr.on('data', (d) => this.send({ type: 'stderr', data: d.toString() }));

    this.process.on('close', (code) => {
      this.send({ type: 'exit', code: code || 0, durationMs: Date.now() - startTime });
      this.cleanup();
    });

    this.process.on('error', (err) => {
      this.send({ type: 'error', message: err.message });
      this.cleanup();
    });

    setTimeout(() => {
      if (this.process) {
        this.send({ type: 'error', message: 'Execution timed out.' });
        this.cleanup();
      }
    }, timeoutMs);
  }

  compileCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { cwd: this.tempDir });
      let errBuf = '';
      p.stderr.on('data', (d) => (errBuf += d.toString()));
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(errBuf || 'Compilation failed'))));
      p.on('error', (err) => reject(new Error(`Compiler not found: ${cmd}`)));
    });
  }

  cleanup() {
    if (this.process) {
      try { this.process.kill(); } catch {}
      this.process = null;
    }
    if (this.tempDir) {
      try { fs.rmSync(this.tempDir, { recursive: true, force: true }); } catch {}
      this.tempDir = null;
    }
  }
}

module.exports = InteractiveSession;