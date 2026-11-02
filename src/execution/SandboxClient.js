/**
 * PolyCompile - Unified Multi-Engine Sandbox Client
 * 
 * Provides robust, resilient cloud-sandboxed execution across 30+ programming languages
 * spanning Structured, Unstructured, OOP, Functional, Scripting, Systems, and Declarative paradigms.
 * 
 * Architecture:
 * - Engine Tier 1: Judge0 CE Cloud Engine (70+ native runtimes, execution time & memory monitoring)
 * - Engine Tier 2: Wandbox Cloud Compiler (170+ native compilers, GCC/Clang/OpenJDK/CPython)
 * - Engine Tier 3: Self-Hosted / Whitelisted Piston Engine (configurable via PISTON_URL)
 * - Automatic Cascading Failover: Never fails with 401/429; seamlessly falls back between engines.
 */

/**
 * Wandbox compiles Java submissions from a fixed filename. Remove `public` only
 * from a top-level class declaration so the source can compile as prog.java.
 * This scanner deliberately ignores comments, strings, chars, and Java text blocks;
 * a plain regex corrupts generated Java source embedded inside string literals.
 */
function normalizeJavaForWandbox(source) {
  let out = '';
  let i = 0;
  let depth = 0;
  let state = 'code';
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    const tri = source.slice(i, i + 3);

    if (state === 'code') {
      if (depth === 0 && source.startsWith('public', i) &&
          (i === 0 || !/[\w$]/.test(source[i - 1])) &&
          !/[\w$]/.test(source[i + 6] || ' ')) {
        const match = source.slice(i).match(/^public\s+(?:(?:final|abstract|strictfp)\s+)*class\s+[A-Za-z_$][\w$]*/);
        if (match) {
          out += match[0].slice('public'.length);
          i += match[0].length;
          continue;
        }
      }
      if (tri === '"""') { out += tri; i += 3; state = 'textblock'; continue; }
      if (c === '"') { out += c; i++; state = 'string'; continue; }
      if (c === "'") { out += c; i++; state = 'char'; continue; }
      if (c === '/' && n === '/') { out += '//'; i += 2; state = 'lineComment'; continue; }
      if (c === '/' && n === '*') { out += '/*'; i += 2; state = 'blockComment'; continue; }
      if (c === '{') depth++;
      if (c === '}') depth = Math.max(0, depth - 1);
      out += c; i++; continue;
    }
    if (state === 'string' || state === 'char') {
      out += c; i++;
      if (c === '\\' && i < source.length) { out += source[i++]; continue; }
      if ((state === 'string' && c === '"') || (state === 'char' && c === "'")) state = 'code';
      continue;
    }
    if (state === 'textblock') {
      if (tri === '"""') { out += tri; i += 3; state = 'code'; continue; }
      if (c === '\\' && i + 1 < source.length) { out += source.slice(i, i + 2); i += 2; continue; }
      out += c; i++; continue;
    }
    if (state === 'lineComment') {
      out += c; i++;
      if (c === '\n') state = 'code';
      continue;
    }
    if (state === 'blockComment') {
      if (c === '*' && n === '/') { out += '*/'; i += 2; state = 'code'; continue; }
      out += c; i++; continue;
    }
  }
  return out;
}

class SandboxClient {
  static JUDGE0_BASE_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com';
  static JUDGE0_API_KEY = process.env.JUDGE0_KEY || null;
  static JUDGE0_RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || null;

  static WANDBOX_COMPILE_URL = 'https://wandbox.org/api/compile.json';

  static PISTON_ENDPOINT = process.env.PISTON_URL || null;
  static PISTON_API_KEY = process.env.PISTON_KEY || null;

  // Language mapping for Judge0
  static JUDGE0_LANGUAGE_MAP = {
    c: 103,            // C (GCC 14.1.0)
    cpp: 105,          // C++ (GCC 14.1.0)
    java: 91,          // Java (JDK 17.0.6)
    python: 100,       // Python (3.12.5)
    csharp: 51,        // C# (Mono 6.6.0.161)
    rust: 108,         // Rust (1.85.0)
    go: 107,           // Go (1.23.5)
    javascript: 97,    // JavaScript (Node.js 20.17.0)
    typescript: 101,   // TypeScript (5.6.2)
    php: 98,           // PHP (8.3.11)
    ruby: 72,          // Ruby (2.7.0)
    swift: 83,         // Swift (5.2.3)
    kotlin: 111,       // Kotlin (2.1.10)
    scala: 112,        // Scala (3.4.2)
    haskell: 61,       // Haskell (GHC 8.8.1)
    clojure: 86,       // Clojure (1.10.1)
    elixir: 57,        // Elixir (1.9.4)
    ocaml: 65,         // OCaml (4.09.0)
    lisp: 55,          // Common Lisp (SBCL 2.0.0)
    pascal: 67,        // Pascal (FPC 3.0.4)
    fortran: 59,       // Fortran (GFortran 9.2.0)
    basic: 47,         // Basic (FBC 1.07.1)
    assembly: 45,      // Assembly (NASM 2.14.02)
    perl: 85,          // Perl (5.28.1)
    lua: 64,           // Lua (5.3.5)
    bash: 46,          // Bash (5.0.0)
    sql: 82,           // SQL (SQLite 3.27.2)
    prolog: 69,        // Prolog (GNU Prolog 1.4.5)
    r: 99,             // R (4.4.1)
    cobol: 77,         // COBOL (GnuCOBOL 3.1.2)
    d: 56,             // D (DMD 2.091.0)
    erlang: 58,        // Erlang (OTP 22.2)
    scheme: 74,        // Scheme (Gauche 0.9.9)
    octave: 66,        // Octave (5.1.0)
    dart: 90,          // Dart (2.19.2)
    groovy: 88,        // Groovy (3.0.3)
    fsharp: 87,        // F# (.NET Core SDK 3.1.202)
    objectivec: 79,    // Objective-C (Clang 7.0.1)
    vbnet: 84          // Visual Basic .NET (vbnc 0.0.0.5943)
  };

  // Language mapping for Wandbox
  static WANDBOX_COMPILER_MAP = {
    c: 'gcc-head-c',
    cpp: 'gcc-head',
    java: 'openjdk-jdk-22+36',
    python: 'cpython-head',
    csharp: 'mono-6.12.0.199',
    rust: 'rust-1.82.0',
    go: 'go-1.23.2',
    javascript: 'nodejs-20.17.0',
    typescript: 'typescript-5.6.2',
    php: 'php-8.3.12',
    ruby: 'ruby-4.0.2',
    swift: 'swift-6.0.1',
    scala: 'scala-3.5.1',
    haskell: 'ghc-9.10.1',
    elixir: 'elixir-1.17.3',
    ocaml: 'ocaml-5.2.0',
    lisp: 'clisp-2.49',
    pascal: 'fpc-3.2.2',
    perl: 'perl-5.44.0',
    lua: 'lua-5.4.7',
    bash: 'bash',
    zig: 'zig-head',
    sql: 'sqlite-3.46.1',
    d: 'dmd-2.109.1',
    nim: 'nim-2.2.10',
    erlang: 'erlang-27.1',
    crystal: 'crystal-1.13.3',
    julia: 'julia-1.10.5',
    groovy: 'groovy-4.0.23',
    r: 'r-4.4.1'
  };

  /**
   * Main entrypoint: Executes code with smart priority and automatic cascading failover
   */
  static async execute({ language, sourceCode, stdin = '', extension = '.txt' }) {
    const langId = (language.id || '').toLowerCase();
    const errorsEncountered = [];

    // Strategy 1: For Java, Wandbox is ideal as Primary because it allows any class name
    // (with top-level class normalization) rather than forcing class name to be 'Main'.
    if (langId === 'java' && this.WANDBOX_COMPILER_MAP[langId]) {
      try {
        const wandboxRes = await this.executeWandbox({ language, sourceCode, stdin });
        if (wandboxRes && wandboxRes.success !== undefined) {
          return wandboxRes;
        }
      } catch (err) {
        errorsEncountered.push(`Wandbox: ${err.message}`);
      }
    }

    // Strategy 2: Self-hosted / Custom Piston if explicitly configured
    if (this.PISTON_ENDPOINT && language.pistonName) {
      try {
        const pistonRes = await this.executePiston({ language, sourceCode, stdin, extension });
        if (pistonRes && (pistonRes.success || !pistonRes.stderr.includes('401'))) {
          return pistonRes;
        }
      } catch (err) {
        errorsEncountered.push(`Piston: ${err.message}`);
      }
    }

    // Strategy 3: Judge0 CE Cloud Engine (Primary for most languages)
    if (this.JUDGE0_LANGUAGE_MAP[langId]) {
      try {
        const judge0Res = await this.executeJudge0({ language, sourceCode, stdin });
        if (judge0Res && judge0Res.success !== undefined) {
          // If Judge0 compilation error in Java was due to class naming, try Wandbox next
          if (langId === 'java' && !judge0Res.success && (judge0Res.compileOutput || '').includes('should be declared in a file named')) {
            // Fall through to Wandbox
          } else {
            return judge0Res;
          }
        }
      } catch (err) {
        errorsEncountered.push(`Judge0: ${err.message}`);
      }
    }

    // Strategy 4: Wandbox Cloud Compiler (Secondary fallback)
    if (this.WANDBOX_COMPILER_MAP[langId]) {
      try {
        const wandboxRes = await this.executeWandbox({ language, sourceCode, stdin });
        if (wandboxRes && wandboxRes.success !== undefined) {
          return wandboxRes;
        }
      } catch (err) {
        errorsEncountered.push(`Wandbox: ${err.message}`);
      }
    }

    // If all remote services failed or were unavailable, throw error with details for local fallback
    throw new Error(`Remote execution services unreachable for ${language.name}. (${errorsEncountered.join('; ') || 'No remote runner configured'})`);
  }

  /**
   * Execute via Judge0 CE Cloud Engine
   */
  static async executeJudge0({ language, sourceCode, stdin = '' }) {
    const langId = (language.id || '').toLowerCase();
    const judge0LangId = this.JUDGE0_LANGUAGE_MAP[langId];
    if (!judge0LangId) throw new Error(`Judge0 does not support language ${language.name}`);

    // If Java has a class other than Main, normalize and provide a Main proxy so Judge0 never fails on class name
    let codeToSend = sourceCode;
    if (langId === 'java' && !/\bclass\s+Main\b/.test(sourceCode)) {
      const match = sourceCode.match(/(?:public\s+)?class\s+([A-Za-z0-9_$]+)[\s\S]*?public\s+static\s+void\s+main\s*\(/);
      if (match && match[1] && match[1] !== 'Main') {
        const targetClass = match[1];
        const normalized = normalizeJavaForWandbox(sourceCode);
        codeToSend = `${normalized}\n\nclass Main {\n  public static void main(String[] args) throws Exception {\n    ${targetClass}.main(args);\n  }\n}\n`;
      }
    }

    // FreeBASIC: If source doesn't declare a dialect, prepend #lang "fblite" for legacy BASIC compatibility
    if (langId === 'basic' && !/#lang\b/i.test(codeToSend)) {
      codeToSend = `#lang "fblite"\n${codeToSend}`;
    }

    // Erlang: escript requires main/1. If user provided main/0, proxy it with main(_) -> main().
    if (langId === 'erlang') {
      if (!/\bmain\s*\(\s*_[A-Za-z0-9_]*\s*\)/.test(codeToSend) && !/\bmain\s*\(\s*[A-Za-z0-9_]+\s*\)/.test(codeToSend)) {
        if (codeToSend.includes('-export([main/0]).')) {
          codeToSend = codeToSend.replace('-export([main/0]).', '-export([main/0, main/1]).');
        } else if (codeToSend.includes('-export([')) {
          codeToSend = codeToSend.replace('-export([', '-export([main/1, ');
        } else {
          codeToSend = `-export([main/1]).\n${codeToSend}`;
        }
        codeToSend += '\nmain(_) -> main().\n';
      }
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const headers = { 'Content-Type': 'application/json' };
    if (this.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = this.JUDGE0_API_KEY;
      headers['X-Auth-Token'] = this.JUDGE0_API_KEY;
    }
    if (this.JUDGE0_RAPIDAPI_HOST) {
      headers['X-RapidAPI-Host'] = this.JUDGE0_RAPIDAPI_HOST;
    }

    const payload = {
      language_id: judge0LangId,
      source_code: Buffer.from(codeToSend).toString('base64'),
      stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
      cpu_time_limit: 15,
      wall_time_limit: 20
    };

    // Judge0 recommends asynchronous submissions; wait=true is disabled on many hosts.
    const submitUrl = `${this.JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=false`;
    let response;
    try {
      response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    let data = await response.json();

    // If still in queue or processing, poll
    if (data.token && (!data.status || data.status.id === 1 || data.status.id === 2)) {
      data = await this.pollJudge0Submission(data.token, headers);
    }

    const wallElapsed = Date.now() - startTime;

    const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf8') : '';
    const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf8') : '';
    const compileOutput = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf8') : '';

    // Calculate execution time (use reported CPU execution time if available, or wall-clock elapsed)
    let executionTimeMs = wallElapsed;
    if (data.time && !isNaN(parseFloat(data.time))) {
      executionTimeMs = Math.round(parseFloat(data.time) * 1000);
      if (executionTimeMs === 0 && wallElapsed > 0) executionTimeMs = wallElapsed;
    }

    // Status ID: 3 is 'Accepted' (Success), Status ID: 5 is 'Time Limit Exceeded'
    if (data.status?.id === 13) {
      throw new Error(`Judge0 internal runner error: ${data.message || data.status?.description}`);
    }
    const isSuccess = data.status?.id === 3;
    const isTimeout = data.status?.id === 5;
    const exitCode = isSuccess ? 0 : (data.status?.id === 6 ? 1 : (isTimeout ? 124 : (data.exit_code || 1)));

    return {
      success: isSuccess,
      stdout,
      stderr: stderr || (isTimeout ? 'Time Limit Exceeded: Execution time exceeded the limit (15.0s). Check for infinite loops.' : (data.status?.id > 3 && data.status?.id !== 6 ? (data.message || data.status?.description || '') : '')),
      compileOutput,
      exitCode,
      executionTimeMs,
      timedOut: isTimeout,
      memoryKb: data.memory || null,
      engine: `Judge0 Cloud Sandbox (${language.name})`
    };
  }

  /**
   * Poll Judge0 submission until completion
   */
  static async pollJudge0Submission(token, headers, maxAttempts = 45) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let response;
      try {
        response = await fetch(
          `${this.JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=true`,
          { headers, signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }
      if (response.ok) {
        const result = await response.json();
        if (result.status && result.status.id > 2) return result;
      } else if (response.status >= 500) {
        throw new Error(`Judge0 polling failed with HTTP ${response.status}.`);
      }
    }
    throw new Error('Judge0 execution timed out during queue processing.');
  }

  /**
   * Execute via Wandbox Cloud Compiler
   */
  static async executeWandbox({ language, sourceCode, stdin = '' }) {
    const langId = (language.id || '').toLowerCase();
    const compiler = this.WANDBOX_COMPILER_MAP[langId];
    if (!compiler) throw new Error(`Wandbox does not support compiler for ${language.name}`);

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    // Code normalization:
    // In Java, single-file online compilers save to prog.java. Top-level 'public class'
    // causes javac to insist on <ClassName>.java. Changing top-level 'public class' to 'class'
    // allows any class name (including DynamicCompiler) to compile cleanly.
    let code = sourceCode;
    if (langId === 'java') {
      code = code.replace(/\bpublic\s+class\b/g, 'class');
    }

    const payload = {
      compiler,
      code,
      stdin: stdin || ''
    };

    let response;
    try {
      response = await fetch(this.WANDBOX_COMPILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    const stdout = data.program_output || (data.status === '0' && data.program_message ? data.program_message : '');
    const stderr = data.program_error || (data.status !== '0' && data.program_message ? data.program_message : '');
    const compileOutput = data.compiler_error || data.compiler_output || data.compiler_message || '';
    const parsedStatus = Number.parseInt(data.status, 10);
    const exitCode = Number.isFinite(parsedStatus) ? parsedStatus : 1;

    // If Wandbox host environment itself is corrupted (e.g. missing dynamic libraries on their container, OCI runtime errors, clone failures),
    // throw so ExecutionManager falls back to LocalEngines.
    const allOut = `${stderr} ${compileOutput}`;
    if (exitCode !== 0 && (
      allOut.includes('error while loading shared libraries') ||
      allOut.includes('OCI runtime') ||
      allOut.includes('crun:') ||
      allOut.includes('Resource temporarily unavailable') ||
      allOut.includes('Cannot allocate memory') ||
      allOut.includes('fatal error: cannot execute') ||
      allOut.includes('signal: killed')
    )) {
      throw new Error(`Compiler runtime error on host: ${stderr || compileOutput}`);
    }

    const isTimeout = data.status === 'TIMEOUT' || (stderr || '').toLowerCase().includes('time out') || (stderr || '').toLowerCase().includes('timeout');

    return {
      success: exitCode === 0,
      stdout,
      stderr: isTimeout ? (stderr || 'Time Limit Exceeded: Wandbox execution timed out.') : stderr,
      compileOutput,
      exitCode: isTimeout ? 124 : exitCode,
      executionTimeMs: elapsed,
      timedOut: isTimeout,
      engine: `Wandbox Cloud Compiler (${language.name} - ${compiler})`
    };
  }

  /**
   * Execute via Custom / Whitelisted Piston instance
   */
  static async executePiston({ language, sourceCode, stdin = '', extension = '.txt' }) {
    if (!this.PISTON_ENDPOINT) throw new Error('Piston endpoint not configured');

    const startTime = Date.now();
    const fileName = `main${extension}`;

    const payload = {
      language: language.pistonName || language.id,
      version: language.pistonVersion || '*',
      files: [{ name: fileName, content: sourceCode }],
      stdin: stdin || '',
      run_timeout: 6000,
      compile_timeout: 10000
    };

    const headers = { 'Content-Type': 'application/json' };
    if (this.PISTON_API_KEY) {
      headers['Authorization'] = this.PISTON_API_KEY;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(this.PISTON_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    const compileOutput = data.compile?.output || data.compile?.stderr || '';
    const stdout = data.run?.stdout || (data.run?.output && !data.run?.stderr ? data.run.output : '') || '';
    const stderr = data.run?.stderr || (compileOutput ? `[Compilation Phase]\n${compileOutput}` : '');
    const exitCode = data.run?.code !== undefined ? data.run.code : (data.compile?.code || 0);

    return {
      success: exitCode === 0,
      stdout,
      stderr,
      compileOutput,
      exitCode,
      executionTimeMs: elapsed,
      engine: `Piston Sandbox (${language.name})`
    };
  }
}

module.exports = SandboxClient;
module.exports.normalizeJavaForWandbox = normalizeJavaForWandbox;
