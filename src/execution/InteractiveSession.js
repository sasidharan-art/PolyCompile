const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class InteractiveSession {
  constructor(ws) {
    this.ws = ws;
    this.process = null;
    this.tempDir = null;
    this.isAlive = true;

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
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polycompile-'));
    const lang = (languageId || 'python').toLowerCase();

    let cmd = '';
    let args = [];

    if (lang.includes('python')) {
      const file = path.join(this.tempDir, 'main.py');
      fs.writeFileSync(file, sourceCode);
      cmd = 'python3';
      args = ['-u', file];
    } else if (lang === 'c') {
      const src = path.join(this.tempDir, 'main.c');
      const bin = path.join(this.tempDir, 'main');
      fs.writeFileSync(src, sourceCode);
      const compile = spawn('gcc', [src, '-o', bin]);
      await new Promise((res, rej) => {
        let errBuf = '';
        compile.stderr.on('data', d => errBuf += d.toString());
        compile.on('close', code => code === 0 ? res() : rej(new Error(errBuf || 'Compilation error')));
      });
      cmd = bin;
      args = [];
    } else if (lang === 'cpp') {
      const src = path.join(this.tempDir, 'main.cpp');
      const bin = path.join(this.tempDir, 'main');
      fs.writeFileSync(src, sourceCode);
      const compile = spawn('g++', [src, '-o', bin]);
      await new Promise((res, rej) => {
        let errBuf = '';
        compile.stderr.on('data', d => errBuf += d.toString());
        compile.on('close', code => code === 0 ? res() : rej(new Error(errBuf || 'Compilation error')));
      });
      cmd = bin;
      args = [];
    } else {
      // Fallback command
      const file = path.join(this.tempDir, 'script.py');
      fs.writeFileSync(file, sourceCode);
      cmd = 'python3';
      args = ['-u', file];
    }

    const startTime = Date.now();
    this.process = spawn(cmd, args, { cwd: this.tempDir });

    this.send({ type: 'ready' });

    this.process.stdout.on('data', (data) => {
      this.send({ type: 'stdout', data: data.toString() });
    });

    this.process.stderr.on('data', (data) => {
      this.send({ type: 'stderr', data: data.toString() });
    });

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