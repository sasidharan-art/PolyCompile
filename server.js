/**
 * PolyCompile - Unified Multi-Language Compiler Server v2
 *
 * Express HTTP Server providing RESTful endpoints for:
 * - Automatic Language Detection
 * - 6-Phase Compiler Design Inspection (Lexer, Parser, Semantics, IR, Optimizer, Code Gen)
 * - Secure Sandboxed Code Execution (Docker runner or remote sandbox)
 * - Code Snippets & Language Taxonomy
 *
 * Fixed: timeout handling, Docker unavailability errors, better error messages,
 *        source file mapping for all 40+ languages, request size limits.
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const { LANGUAGES, getAllLanguages, PARADIGMS, getLanguageById } = require('./src/compiler/LanguageRegistry');
const LanguageDetector = require('./src/compiler/LanguageDetector');
const Lexer = require('./src/compiler/Lexer');
const Parser = require('./src/compiler/Parser');
const SemanticAnalyzer = require('./src/compiler/SemanticAnalyzer');
const IntermediateCodeGenerator = require('./src/compiler/IntermediateCode');
const CodeOptimizer = require('./src/compiler/CodeOptimizer');
const DiagnosticEngine = require('./src/compiler/DiagnosticEngine');
const ExecutionManager = require('./src/execution/ExecutionManager');
const { SNIPPETS, getAllSnippets } = require('./src/snippets/CodeSnippets');

const app = express();
const PORT = process.env.PORT || 3000;

// Code playground requests should remain small; this also protects serverless payload limits.
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health Check for Cloud / Container Deployment Liveness Probes
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'PolyCompile Unified Compiler System',
    version: '1.0.0',
    supportedLanguagesCount: getAllLanguages().length
  });
});

// Short-lived, one-purpose ticket for the separately hosted interactive runner.
app.post('/api/interactive-ticket', (req, res) => {
  const secret = process.env.INTERACTIVE_TICKET_SECRET;
  const gatewayUrl = process.env.INTERACTIVE_GATEWAY_URL;
  if (!secret || !gatewayUrl) {
    return res.status(503).json({ success: false, error: 'Interactive terminal is not configured on this deployment.' });
  }
  const payload = Buffer.from(JSON.stringify({ scope: 'interactive-run', exp: Date.now() + 60_000, nonce: crypto.randomBytes(16).toString('hex') })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  res.json({ success: true, ticket: `${payload}.${signature}`, gatewayUrl });
});

// 1. Language Catalog & Taxonomy
app.get('/api/languages', (req, res) => {
  res.json({
    success: true,
    paradigms: PARADIGMS,
    languages: getAllLanguages()
  });
});

// 2. Preloaded Snippets Library
app.get('/api/snippets', (req, res) => {
  res.json({
    success: true,
    snippets: getAllSnippets()
  });
});


// 3. Automatic Language Detection Endpoint
app.post('/api/detect', (req, res) => {
  try {
    const { sourceCode } = req.body;
    const detectionResult = LanguageDetector.detect(sourceCode || '');
    res.json({
      success: true,
      ...detectionResult
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 4. Compiler Phases Introspection (Lexical, Syntax, Semantic, IR, Optimization)
app.post('/api/compile-phases', (req, res) => {
  try {
    const { sourceCode, languageId } = req.body;
    const code = sourceCode || '';

    // Step 0: Language Identification
    let lang = languageId ? getLanguageById(languageId) : null;
    let detection = null;
    if (!lang) {
      detection = LanguageDetector.detect(code);
      lang = detection.detected;
    }

    const startTime = Date.now();

    // Phase 1: Lexical Analysis
    const lexResult = Lexer.tokenize(code, lang);

    // Phase 2: Syntax Analysis & AST
    const parseResult = Parser.parse(lexResult.tokens, lang);

    // Phase 3: Semantic Analysis & Symbol Table
    const semanticResult = SemanticAnalyzer.analyze(parseResult.ast, lexResult.tokens, lang);

    // Phase 4: Intermediate Code Generation (TAC, Quadruples, CFG)
    const irResult = IntermediateCodeGenerator.generate(parseResult.ast, lang);

    // Phase 5: Code Optimization & Assembly Emission
    const optResult = CodeOptimizer.process(irResult.tac, irResult.quadruples, lang);

    // Diagnostic Aggregation
    const diagnostics = DiagnosticEngine.generateDiagnostics(code, {
      lexerErrors: lexResult.errors,
      syntaxErrors: parseResult.syntaxErrors,
      semanticErrors: semanticResult.semanticErrors,
      warnings: semanticResult.warnings
    });

    const elapsedMs = Date.now() - startTime;

    res.json({
      success: true,
      language: lang,
      detection,
      totalCompileAnalysisTimeMs: elapsedMs,
      diagnostics,
      phases: {
        phase1_lexical: {
          tokens: lexResult.tokens.slice(0, 500), // Limit payload for UI performance
          totalTokens: lexResult.tokens.length,
          metrics: lexResult.metrics,
          errors: lexResult.errors
        },
        phase2_syntax: {
          ast: parseResult.ast,
          metrics: parseResult.metrics,
          errors: parseResult.syntaxErrors
        },
        phase3_semantic: {
          symbolTable: semanticResult.symbolTable,
          scopes: semanticResult.scopes,
          warnings: semanticResult.warnings,
          errors: semanticResult.semanticErrors
        },
        phase4_intermediate: {
          tac: irResult.tac,
          quadruples: irResult.quadruples,
          basicBlocks: irResult.basicBlocks,
          cfg: irResult.cfg
        },
        phase5_optimization: {
          optimizedTac: optResult.optimizedTac,
          assemblyCode: optResult.assemblyCode,
          bytecode: optResult.bytecode,
          optimizationsApplied: optResult.optimizationsApplied
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 5. Full Compile & Execute Pipeline
app.post('/api/execute', async (req, res) => {
  try {
    const rawBody = req.body || {};
    const sourceCode = typeof rawBody.sourceCode === 'string' ? rawBody.sourceCode : (typeof rawBody.code === 'string' ? rawBody.code : '');
    const languageId = rawBody.languageId || rawBody.language || '';
    const rawStdin = rawBody.stdin !== undefined ? rawBody.stdin : (rawBody.input !== undefined ? rawBody.input : '');
    const preferLocal = Boolean(rawBody.preferLocal);

    if (typeof rawStdin !== 'string') {
      return res.status(400).json({ success: false, error: 'Program input must be a text string.' });
    }
    if (languageId && !getLanguageById(languageId)) {
      return res.status(400).json({ success: false, error: `Unsupported language ID: ${languageId}` });
    }
    const stdin = rawStdin;

    if (!sourceCode.trim()) {
      return res.status(400).json({ success: false, error: 'Enter source code before running.' });
    }
    if (Buffer.byteLength(sourceCode, 'utf8') > 1000000) {
      return res.status(413).json({ success: false, error: 'Source code exceeds the 1 MB execution limit.' });
    }
    const code = sourceCode;

    // Step 0: Language Identification
    let lang = languageId ? getLanguageById(languageId) : null;
    let detection = null;
    if (!lang) {
      detection = LanguageDetector.detect(code);
      lang = detection.detected;
    }

    const compileStartTime = Date.now();

    // Run Compiler Design Pipeline
    const lexResult = Lexer.tokenize(code, lang);
    const parseResult = Parser.parse(lexResult.tokens, lang);
    const semanticResult = SemanticAnalyzer.analyze(parseResult.ast, lexResult.tokens, lang);
    const irResult = IntermediateCodeGenerator.generate(parseResult.ast, lang);
    const optResult = CodeOptimizer.process(irResult.tac, irResult.quadruples, lang);

    const compileTimeMs = Date.now() - compileStartTime;

    // Run Execution in Sandbox
    const execResult = await ExecutionManager.execute({
      language: lang,
      sourceCode: code,
      stdin: stdin || '',
      preferLocal: Boolean(preferLocal)
    });

    // Aggregate Diagnostics
    const diagnostics = DiagnosticEngine.generateDiagnostics(code, {
      lexerErrors: lexResult.errors,
      syntaxErrors: parseResult.syntaxErrors,
      semanticErrors: semanticResult.semanticErrors,
      warnings: semanticResult.warnings,
      runtimeError: !execResult.success && execResult.stderr ? { message: execResult.stderr } : null
    });

    res.json({
      success: true,
      language: lang,
      detection,
      compileTimeMs,
      execution: execResult,
      diagnostics,
      compilerPhases: {
        lexical: {
          tokens: lexResult.tokens.slice(0, 300),
          totalTokens: lexResult.tokens.length,
          metrics: lexResult.metrics
        },
        syntax: {
          ast: parseResult.ast,
          metrics: parseResult.metrics
        },
        semantic: {
          symbolTable: semanticResult.symbolTable,
          scopes: semanticResult.scopes,
          warnings: semanticResult.warnings
        },
        intermediate: {
          tac: irResult.tac,
          quadruples: irResult.quadruples,
          basicBlocks: irResult.basicBlocks,
          cfg: irResult.cfg
        },
        optimization: {
          optimizedTac: optResult.optimizedTac,
          assemblyCode: optResult.assemblyCode,
          bytecode: optResult.bytecode,
          optimizationsApplied: optResult.optimizationsApplied
        }
      }
    });
  } catch (err) {
    const unavailable = err && (err.code === 'REAL_EXECUTION_UNAVAILABLE' || /REAL_EXECUTION_UNAVAILABLE/.test(err.message || ''));
    const isLocalOnly  = err && /local compiler is not configured/.test(err.message || '');

    if (unavailable || isLocalOnly) {
      return res.status(503).json({
        success: false,
        error: err.message,
        errorType: 'execution_service_unavailable',
        userMessage: isLocalOnly
          ? 'Local execution is not available for this language. Uncheck "Local Runtime" or use a cloud sandbox.'
          : 'The execution sandbox is currently busy or unreachable. Compiler phase analysis completed successfully.'
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
      errorType: 'server_error',
      userMessage: `Server error: ${err.message || 'Unknown error'}`
    });
  }
});

// Global Process Error Resilience
process.on('uncaughtException', (err) => {
  console.error('[PolyCompile Server: uncaughtException]', err && err.message ? err.message : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[PolyCompile Server: unhandledRejection]', reason && reason.message ? reason.message : reason);
});

// Start Server
const HOST = process.env.HOST || '0.0.0.0';
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(` PolyCompile v2 — http://${HOST}:${PORT}`);
    console.log(` Languages: ${getAllLanguages().length}+ | Auto-detection | Phase Inspection`);
    console.log(` Sandbox: Judge0 CE + Wandbox + Local Runtimes`);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Function & Testing
module.exports = app;
