const assert = require('node:assert/strict');
const ExecutionManager = require('./src/execution/ExecutionManager');
const SandboxClient = require('./src/execution/SandboxClient');
const { getLanguageById } = require('./src/compiler/LanguageRegistry');

(async () => {
  const originalEnv = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL };
  const originalExecute = SandboxClient.execute;
  const originalFetch = global.fetch;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;

    await assert.rejects(
      ExecutionManager.execute({
        language: getLanguageById('javascript'),
        sourceCode: 'console.log("must not run locally")',
        preferLocal: true
      }),
      (error) => error.code === 'REAL_EXECUTION_UNAVAILABLE'
    );

    SandboxClient.execute = async () => { throw new Error('provider offline'); };
    await assert.rejects(
      ExecutionManager.execute({
        language: getLanguageById('nim'),
        sourceCode: 'echo "hello"'
      }),
      (error) => error.code === 'REAL_EXECUTION_UNAVAILABLE' && /provider offline/.test(error.message)
    );

    // Judge0's asynchronous API returns a token first; verify that PolyCompile
    // submits with wait=false and polls the token rather than relying on wait=true.
    const requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      if (String(url).includes('/submissions?')) {
        return new Response(JSON.stringify({ token: 'test-token' }), { status: 201 });
      }
      return new Response(JSON.stringify({
        status: { id: 3, description: 'Accepted' },
        stdout: Buffer.from('judge0 protocol ok').toString('base64'),
        stderr: '',
        compile_output: '',
        exit_code: 0,
        time: '0.001',
        memory: 1024
      }), { status: 200 });
    };
    const judge0 = await SandboxClient.executeJudge0({
      language: getLanguageById('javascript'),
      sourceCode: 'console.log("judge0 protocol ok")'
    });
    assert.equal(judge0.success, true);
    assert.match(judge0.stdout, /judge0 protocol ok/);
    assert.match(requests[0], /wait=false/);
    assert.ok(requests.some((url) => url.includes('/submissions/test-token?')));

    process.env.NODE_ENV = 'development';
    global.fetch = originalFetch;
    const local = await ExecutionManager.execute({
      language: getLanguageById('javascript'),
      sourceCode: 'console.log("local runtime ok")',
      preferLocal: true
    });
    assert.equal(local.success, true);
    assert.match(local.stdout, /local runtime ok/);

    console.log('[PASS] Production refuses unsafe local execution and does not disguise provider outages as successful runs.');
    console.log('[PASS] Explicit local development execution remains available.');
  } finally {
    SandboxClient.execute = originalExecute;
    global.fetch = originalFetch;
    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalEnv.VERCEL;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
