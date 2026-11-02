/**
 * PolyCompile — Main Application Controller v2 (True Inline Interactive Terminal)
 */

document.addEventListener('DOMContentLoaded', () => {

  /* =========================================================
     DOM REFS
  ========================================================= */
  const codeEditor          = document.getElementById('codeEditor');
  const lineNumbers         = document.getElementById('lineNumbers');
  const languageSelect      = document.getElementById('languageSelect');
  const snippetSelect       = document.getElementById('snippetSelect');
  const runBtn              = document.getElementById('runBtn');
  const runBtnText          = document.getElementById('runBtnText');
  const runBtnIcon          = document.getElementById('runBtnIcon');
  const inspectPhasesBtn    = document.getElementById('inspectPhasesBtn');
  const preferLocalCheck    = document.getElementById('preferLocalCheck');
  const fileUploadInput     = document.getElementById('fileUploadInput');
  const downloadBtn         = document.getElementById('downloadBtn');
  const copyCodeBtn         = document.getElementById('copyCodeBtn');
  const clearEditorBtn      = document.getElementById('clearEditorBtn');
  const themeToggleBtn      = document.getElementById('themeToggleBtn');
  const keyboardShortcutsBtn= document.getElementById('keyboardShortcutsBtn');
  const detectionInfoBtn    = document.getElementById('detectionInfoBtn');
  const evidenceModal       = document.getElementById('evidenceModal');
  const closeEvidenceBtn    = document.getElementById('closeEvidenceBtn');
  const shortcutsModal      = document.getElementById('shortcutsModal');
  const closeShortcutsBtn   = document.getElementById('closeShortcutsBtn');
  const clearConsoleBtn     = document.getElementById('clearConsoleBtn');
  const copyOutputBtn       = document.getElementById('copyOutputBtn');
  const consoleOutput       = document.getElementById('consoleOutput');
  const toastContainer      = document.getElementById('toastContainer');

  // Detection pill
  const detectedLangName    = document.getElementById('detectedLangName');
  const detectedConfidenceBadge = document.getElementById('detectedConfidenceBadge');
  const detectedParadigmBadge   = document.getElementById('detectedParadigmBadge');

  // Stats
  const statExecTime    = document.getElementById('statExecTime');
  const statCompileTime = document.getElementById('statCompileTime');
  const statMemory      = document.getElementById('statMemory');
  const statExitCode    = document.getElementById('statExitCode');
  const statEngine      = document.getElementById('statEngine');

  // File info bar
  const fileNameDisplay  = document.getElementById('fileNameDisplay');
  const fileExtDisplay   = document.getElementById('fileExtDisplay');
  const cursorPosDisplay = document.getElementById('cursorPosDisplay');
  const charCountDisplay = document.getElementById('charCountDisplay');
  const lineCountDisplay = document.getElementById('lineCountDisplay');

  // Panels & resize
  const editorPanel    = document.getElementById('editorPanel');
  const resizeHandle   = document.getElementById('resizeHandle');
  const inspectorPanel = document.getElementById('inspectorPanel');
  const workspaceContainer = document.getElementById('workspaceContainer');

  // Timeout bar
  const timeoutBar     = document.getElementById('timeoutBar');
  const timeoutFill    = document.getElementById('timeoutFill');
  const timeoutLabel   = document.getElementById('timeoutLabel');

  // Banners
  const timeoutBanner      = document.getElementById('timeoutBanner');
  const compilationErrorBanner = document.getElementById('compilationErrorBanner');
  const runtimeErrorBanner = document.getElementById('runtimeErrorBanner');
  const successBanner      = document.getElementById('successBanner');
  const dockerErrorBanner  = document.getElementById('dockerErrorBanner');
  const errorBannerTitle   = document.getElementById('errorBannerTitle');
  const errorBannerMsg     = document.getElementById('errorBannerMsg');
  const runtimeErrorMsg    = document.getElementById('runtimeErrorMsg');
  const successBannerMsg   = document.getElementById('successBannerMsg');
  const dockerErrorMsg     = document.getElementById('dockerErrorMsg');

  // Tabs
  const tabButtons    = document.querySelectorAll('.tab-btn');
  const tabPanes      = document.querySelectorAll('.tab-pane');
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');

  // Server status
  const statusDot  = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  /* =========================================================
     STATE
  ========================================================= */
  let allLanguages       = [];
  let allSnippets        = [];
  let currentDetection   = null;
  let detectTimeout      = null;
  let detectionRequestId = 0;
  let isRunning          = false;
  let currentAbortCtrl   = null;
  let timeoutProgressInterval = null;
  const MAX_RUN_TIMEOUT_MS = 60000;

  /* =========================================================
     TOAST NOTIFICATIONS
  ========================================================= */
  function showToast(message, type = 'info', durationMs = 2800) {
    const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i>${UI.escapeHtml(message)}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 260);
    }, durationMs);
  }

  /* =========================================================
     SERVER HEALTH CHECK
  ========================================================= */
  async function checkServerHealth() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        statusDot.className = 'pulse-dot';
        statusText.textContent = 'Ready';
      } else {
        throw new Error('Non-OK status');
      }
    } catch {
      statusDot.className = 'pulse-dot warning';
      statusText.textContent = 'Degraded';
    }
  }

  /* =========================================================
     INIT DATA (Languages & Snippets)
  ========================================================= */
  async function initializeData() {
    try {
      const [langRes, snipRes] = await Promise.all([
        fetch('/api/languages').then(r => r.json()).catch(() => null),
        fetch('/api/snippets').then(r => r.json()).catch(() => null)
      ]);

      if (langRes && langRes.success) {
        allLanguages = langRes.languages;
        populateLanguagesDropdown(langRes.paradigms, langRes.languages);
      }

      if (snipRes && snipRes.success) {
        allSnippets = snipRes.snippets;
        populateSnippetsDropdown(snipRes.snippets);
        if (allSnippets.length > 0) loadSnippet(allSnippets[0].id);
      }

      await checkServerHealth();
    } catch (err) {
      console.error('Failed to initialize:', err);
      statusDot.className = 'pulse-dot error';
      statusText.textContent = 'Offline';
    }
  }

  function populateLanguagesDropdown(paradigms, languages) {
    const groups = {};
    for (const lang of languages) {
      const cat = lang.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(lang);
    }

    for (const [category, langs] of Object.entries(groups)) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      for (const l of langs) {
        const option = document.createElement('option');
        option.value = l.id;
        const ext = l.extension || (Array.isArray(l.extensions) ? l.extensions[0] : '');
        option.textContent = `${l.name}${ext ? '  ' + ext : ''}`;
        optgroup.appendChild(option);
      }
      languageSelect.appendChild(optgroup);
    }
  }

  function populateSnippetsDropdown(snippets) {
    for (const snip of snippets) {
      const option = document.createElement('option');
      option.value = snip.id;
      option.textContent = snip.title;
      snippetSelect.appendChild(option);
    }
  }

  function loadSnippet(snippetId) {
    const snip = allSnippets.find(s => s.id === snippetId);
    if (!snip) return;
    codeEditor.value = snip.code;
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
    triggerAutoDetection(snip.code);
  }

  /* =========================================================
     EDITOR — LINE NUMBERS, CURSOR, SCROLL
  ========================================================= */
  codeEditor.addEventListener('input', () => {
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
    scheduleAutoDetection();
  });

  codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
  });

  codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end   = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
    }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCode();
    }
    else if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      inspectPhases();
    }
    else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      downloadCode();
    }
    else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clearConsole();
    }
  });

  codeEditor.addEventListener('click', updateCursorPos);
  codeEditor.addEventListener('keyup', updateCursorPos);

  function updateCursorPos() {
    const pos = codeEditor.selectionStart;
    const text = codeEditor.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col  = lines[lines.length - 1].length + 1;
    cursorPosDisplay.textContent = `Ln ${line}, Col ${col}`;
  }

  function updateFileInfo() {
    const code = codeEditor.value;
    charCountDisplay.textContent = `${code.length.toLocaleString()} chars`;
    lineCountDisplay.textContent = `${(code.split('\n').length).toLocaleString()} lines`;
    const selectedId = languageSelect.value;
    const lang = allLanguages.find(l => l.id === selectedId);
    const ext = lang ? (lang.extension || (Array.isArray(lang.extensions) ? lang.extensions[0] : '')) : '';
    if (ext) {
      fileExtDisplay.textContent = ext;
      fileExtDisplay.style.display = 'inline';
    } else {
      fileExtDisplay.style.display = 'none';
    }
  }

  /* =========================================================
     AUTO-DETECTION
  ========================================================= */
  function scheduleAutoDetection() {
    if (languageSelect.value !== 'auto') return;
    clearTimeout(detectTimeout);
    detectTimeout = setTimeout(() => triggerAutoDetection(codeEditor.value), 350);
  }

  async function triggerAutoDetection(sourceCode) {
    const requestId = ++detectionRequestId;
    if (!sourceCode.trim()) {
      detectedLangName.textContent = '—';
      detectedConfidenceBadge.textContent = '—%';
      detectedParadigmBadge.textContent = '—';
      return;
    }

    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await res.json();
      if (requestId !== detectionRequestId) return;
      if (data.success) {
        currentDetection = data;
        detectedLangName.textContent        = data.detected?.name || 'Unknown';
        detectedConfidenceBadge.textContent = `${data.confidence || 0}%`;
        detectedParadigmBadge.textContent   = data.paradigm || '—';
        UI.renderTaxonomy(data.detected, data.paradigmDescription);
      }
    } catch (err) {
      if (requestId !== detectionRequestId) return;
    }
  }

  /* =========================================================
     TIMEOUT PROGRESS BAR
  ========================================================= */
  function startTimeoutBar(totalMs) {
    clearTimeoutBar();
    timeoutBar.style.display = 'block';
    timeoutFill.style.width = '0%';
    timeoutFill.classList.remove('warning');
    const startTime = Date.now();

    timeoutProgressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      timeoutFill.style.width = pct + '%';
      const sec = (elapsed / 1000).toFixed(1);
      if (timeoutLabel) {
        timeoutLabel.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running… ${sec}s`;
      }
      if (pct >= 50) timeoutFill.classList.add('warning');
    }, 250);
  }

  function clearTimeoutBar() {
    clearInterval(timeoutProgressInterval);
    timeoutProgressInterval = null;
    timeoutBar.style.display = 'none';
    timeoutFill.style.width = '0%';
    timeoutFill.classList.remove('warning');
  }

  const abortRunBtn = document.getElementById('abortRunBtn');
  if (abortRunBtn) {
    abortRunBtn.addEventListener('click', () => {
      if (currentAbortCtrl) currentAbortCtrl.abort();
      if (isRunning) setLoadingState(false);
      showToast('Execution cancelled by user.', 'info');
    });
  }

  /* =========================================================
     HIDE ALL BANNERS
  ========================================================= */
  function hideAllBanners() {
    [timeoutBanner, compilationErrorBanner, runtimeErrorBanner,
     successBanner, dockerErrorBanner].forEach(b => {
      if (b) b.style.display = 'none';
    });
  }

  /* =========================================================
     INLINE INTERACTIVE TERMINAL ENGINE
  ========================================================= */
  let terminalScreen = null;
  let terminalText = null;
  let inlineInputWrapper = null;
  let inlineInput = null;
  let lastSourceCode = '';
  let lastLanguageId = '';

  function ensureProgramizTerminal() {
    if (terminalScreen && terminalScreen.isConnected) return;
    consoleOutput.innerHTML = '';

    terminalScreen = document.createElement('div');
    terminalScreen.className = 'programiz-terminal';
    terminalScreen.style.cssText = 'font-family: Consolas, "Courier New", monospace; white-space: pre-wrap; line-height: 1.6; font-size: 14px;';
    consoleOutput.appendChild(terminalScreen);

    terminalText = document.createElement('span');
    terminalText.className = 'terminal-text';
    terminalScreen.appendChild(terminalText);

    inlineInputWrapper = document.createElement('span');
    inlineInputWrapper.className = 'terminal-input-wrapper';
    inlineInputWrapper.style.display = 'none';
    inlineInputWrapper.innerHTML = `<input type="text" class="terminal-inline-input" autocomplete="off" spellcheck="false" 
      style="background:transparent; border:none; outline:none; color:#58a6ff; font-family:inherit; font-size:inherit; padding:0; margin:0; width:2ch; caret-color:#58a6ff; border-bottom: 1.5px solid #58a6ff;" />`;
    terminalScreen.appendChild(inlineInputWrapper);

    inlineInput = inlineInputWrapper.querySelector('input');

    inlineInput.addEventListener('input', () => {
      inlineInput.style.width = Math.max(2, inlineInput.value.length + 1) + 'ch';
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    });

    inlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = inlineInput.value;

        // Print entered value directly next to the prompt and add newline
        const echo = document.createElement('span');
        echo.style.color = '#58a6ff';
        echo.style.fontWeight = 'bold';
        echo.textContent = ' ' + val + '\n';
        terminalText.appendChild(echo);

        inlineInput.value = '';
        inlineInputWrapper.style.display = 'none';

        // Trigger execution with entered input sent to stdin
        executeWithStdin(lastSourceCode, lastLanguageId, val + '\n');
      }
    });
  }

  function focusTerminal() {
    if (inlineInput && inlineInputWrapper && inlineInputWrapper.style.display !== 'none') {
      inlineInput.focus();
    }
  }

  if (consoleOutput) {
    consoleOutput.addEventListener('click', focusTerminal);
  }

  async function runCode() {
    if (isRunning) {
      if (currentAbortCtrl) currentAbortCtrl.abort();
      setLoadingState(false);
      clearTimeoutBar();
      showToast('Execution stopped.', 'info');
      return;
    }

    const sourceCode = codeEditor.value;
    const selectedLang = languageSelect.value;

    if (!sourceCode.trim()) {
      showToast('Please enter source code first.', 'warning');
      return;
    }

    if (window.innerWidth <= 900) setResponsiveView('output');
    switchTab('consoleTab');
    hideAllBanners();
    setLoadingState(true, 'Running…');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);

    ensureProgramizTerminal();
    terminalText.innerHTML = '';
    if (inlineInputWrapper) inlineInputWrapper.style.display = 'none';

    lastSourceCode = sourceCode;

    let languageId = selectedLang;
    if (!languageId || languageId === 'auto') {
      try {
        const detectedRes = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceCode }),
          signal: AbortSignal.timeout(6000)
        });
        const detected = await detectedRes.json();
        languageId = detected.detected?.id || detected.language?.id || '';
      } catch {
        languageId = '';
      }
    }
    lastLanguageId = languageId;

    // Detect input commands across all programming languages
    const requiresInput = /(?:input\s*\(|scanf\s*\(|cin\s*>>|readLine|Scanner|gets\s*\(|fgets\s*\(|read_line|readln|prompt\s*\()/i.test(sourceCode);

    if (requiresInput) {
      let promptText = '';

      // Pattern 1: Python input("prompt")
      const pyMatch = sourceCode.match(/input\s*\(\s*["']([^"']*)["']\s*\)/);
      // Pattern 2: C / C++ printf("prompt") / cout << "prompt"
      const cMatch = sourceCode.match(/(?:printf\s*\(\s*|cout\s*<<\s*)["']([^"']+)["']/);
      // Pattern 3: Java System.out.print("prompt")
      const javaMatch = sourceCode.match(/System\.out\.print(?:ln)?\s*\(\s*["']([^"']+)["']\s*\)/);

      if (pyMatch && pyMatch[1]) {
        promptText = pyMatch[1];
      } else if (cMatch && cMatch[1]) {
        promptText = cMatch[1];
      } else if (javaMatch && javaMatch[1]) {
        promptText = javaMatch[1];
      } else {
        promptText = 'Input: ';
      }

      // Display the prompt text directly in the output terminal
      const pSpan = document.createElement('span');
      pSpan.style.color = '#3fb950';
      pSpan.style.fontWeight = '500';
      pSpan.textContent = promptText;
      terminalText.appendChild(pSpan);

      // Place cursor right next to prompt
      inlineInputWrapper.style.display = 'inline-block';
      inlineInputWrapper.style.marginLeft = '4px';
      terminalScreen.appendChild(inlineInputWrapper);

      setLoadingState(false);
      clearTimeoutBar();
      focusTerminal();
      setTimeout(focusTerminal, 40);
      return;
    }

    // Run directly if no standard input needed
    executeWithStdin(sourceCode, languageId, '');
  }

  async function executeWithStdin(sourceCode, languageId, stdinData) {
    setLoadingState(true, 'Running…');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);
    currentAbortCtrl = new AbortController();

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          languageId: languageId === 'auto' ? '' : languageId,
          stdin: stdinData,
          preferLocal: Boolean(preferLocalCheck && preferLocalCheck.checked)
        }),
        signal: currentAbortCtrl.signal
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        handleExecutionError(data);
      } else {
        displayExecutionResults(data, stdinData);
      }
    } catch (err) {
      handleExecutionError({
        success: false,
        error: err.message || 'Execution failed',
        userMessage: 'Could not connect to execution server.'
      });
    } finally {
      setLoadingState(false);
      clearTimeoutBar();
    }
  }

  function handleExecutionError(data) {
    ensureProgramizTerminal();
    const errSpan = document.createElement('div');
    errSpan.style.color = '#f85149';
    errSpan.style.marginTop = '8px';
    errSpan.textContent = data.userMessage || data.error || 'Execution failed';
    terminalScreen.appendChild(errSpan);
  }

  function displayExecutionResults(data, stdinData) {
    ensureProgramizTerminal();
    const exec = data.execution || {};

    const ms = exec.executionTimeMs != null ? exec.executionTimeMs : (data.durationMs != null ? data.durationMs : null);
    if (ms != null) {
      statExecTime.textContent = `${ms} ms`;
      statExecTime.style.color = 'var(--color-success)';
    }

    const cMs = data.compileTimeMs;
    statCompileTime.textContent = cMs != null ? `${cMs} ms` : '—';
    statEngine.textContent      = exec.engine || data.language?.name || 'Judge0 Sandbox';

    const exitCode = exec.exitCode ?? data.exitCode ?? null;
    if (exitCode !== null) {
      statExitCode.textContent = String(exitCode);
      statExitCode.style.color = exitCode === 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    let stdout = exec.stdout || data.output || '';
    const stderr = exec.stderr || data.errorOutput || '';

    // If terminal already displayed the prompt, strip duplicate prompt from stdout
    if (stdinData && stdout) {
      const promptEl = terminalText.querySelector('span');
      if (promptEl) {
        const promptStr = promptEl.textContent.trim();
        if (stdout.startsWith(promptStr)) {
          stdout = stdout.slice(promptStr.length).replace(/^[\r\n]+/, '');
        }
      }
    }

    if (stdout) {
      const outSpan = document.createElement('span');
      outSpan.style.color = 'var(--text-color, #c9d1d9)';
      outSpan.textContent = stdout;
      terminalText.appendChild(outSpan);
    }

    if (stderr) {
      const errSpan = document.createElement('div');
      errSpan.style.color = '#f85149';
      errSpan.style.marginTop = '4px';
      errSpan.textContent = stderr;
      terminalText.appendChild(errSpan);
    }

    const exitDiv = document.createElement('div');
    exitDiv.style.marginTop = '12px';
    exitDiv.style.fontWeight = 'bold';
    exitDiv.style.color = exitCode === 0 ? '#3fb950' : '#f85149';
    exitDiv.textContent = exitCode === 0 
      ? '=== Code Execution Successful ===' 
      : `=== Process exited with code ${exitCode} ===`;
    terminalScreen.appendChild(exitDiv);

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  /* =========================================================
     INSPECT COMPILER PHASES
  ========================================================= */
  async function inspectPhases() {
    const sourceCode  = codeEditor.value;
    const selectedLang = languageSelect.value;

    if (!sourceCode.trim()) {
      showToast('Enter source code first.', 'warning');
      return;
    }

    if (window.innerWidth <= 900) setResponsiveView('output');
    setLoadingState(true, 'Analyzing…');

    try {
      const res = await fetch('/api/compile-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          languageId: selectedLang === 'auto' ? null : selectedLang
        }),
        signal: AbortSignal.timeout(30000)
      });

      const data = await res.json();
      setLoadingState(false);

      if (data.success) {
        populateCompilerPhases(data.phases);
        UI.renderDiagnostics(data.diagnostics || [],
          document.getElementById('diagnosticsContainer'),
          document.getElementById('diagCountBadge'));
        UI.renderTaxonomy(data.language, data.detection?.paradigmDescription);
        switchTab('lexicalTab');
        showToast('Compiler phase analysis complete.', 'success');
      } else {
        showToast(`Analysis failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      setLoadingState(false);
      showToast(`Analysis failed: ${err.message}`, 'error');
    }
  }

  function populateCompilerPhases(phases) {
    if (!phases) return;

    const p1 = phases.phase1_lexical || phases.lexical;
    if (p1) {
      document.getElementById('lexTotalTokens').textContent  = p1.totalTokens || p1.tokens?.length || 0;
      document.getElementById('lexUniqueTokens').textContent = p1.metrics?.uniqueTokens || 0;
      document.getElementById('lexKwDensity').textContent    = `${p1.metrics?.keywordDensity || 0}%`;
      document.getElementById('lexIdDensity').textContent    = `${p1.metrics?.identifierDensity || 0}%`;
      renderTokensTable(p1.tokens || []);
    }

    const p2 = phases.phase2_syntax || phases.syntax;
    if (p2) {
      document.getElementById('astTotalNodes').textContent = p2.metrics?.totalAstNodes || 0;
      document.getElementById('astTreeDepth').textContent  = p2.metrics?.treeDepth || 0;
      document.getElementById('astComplexity').textContent = p2.metrics?.cyclomaticComplexity || 1;
      AstVisualizer.render(p2.ast, document.getElementById('astVisualTree'));
      document.getElementById('astJsonViewer').textContent = JSON.stringify(p2.ast, null, 2);
    }

    const p3 = phases.phase3_semantic || phases.semantic;
    if (p3) {
      document.getElementById('semTotalSymbols').textContent  = p3.symbolTable?.length || 0;
      document.getElementById('semTotalScopes').textContent   = p3.scopes?.length || 0;
      document.getElementById('semTotalWarnings').textContent = p3.warnings?.length || 0;
      renderSymbolTable(p3.symbolTable || []);
    }

    const p4 = phases.phase4_intermediate || phases.intermediate;
    if (p4) {
      document.getElementById('tacCodeBlock').textContent = (p4.tac || []).join('\n') || '// No TAC generated';
      renderQuadruplesTable(p4.quadruples || []);
      renderBasicBlocks(p4.basicBlocks || []);
    }

    const p5 = phases.phase5_optimization || phases.optimization;
    if (p5) {
      document.getElementById('asmCodeBlock').textContent = p5.assemblyCode || '; No assembly generated';
      renderBytecodeTable(p5.bytecode || []);
      renderOptimizationsList(p5.optimizationsApplied || []);
    }
  }

  function renderTokensTable(tokens) {
    const tbody = document.getElementById('tokensTableBody');
    tbody.innerHTML = '';
    if (!tokens.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No tokens parsed.</td></tr>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const t of tokens) {
      const tr = document.createElement('tr');
      tr.dataset.type = t.type;
      tr.innerHTML = `
        <td>${t.id}</td>
        <td><span class="token-badge ${UI.escapeHtml(t.type)}">${UI.escapeHtml(t.type)}</span></td>
        <td><code>${UI.escapeHtml(t.value)}</code></td>
        <td>${t.line}</td>
        <td>${t.col}</td>
        <td>${t.length}</td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderSymbolTable(symbols) {
    const tbody = document.getElementById('symbolTableBody');
    tbody.innerHTML = '';
    if (!symbols.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No symbols recorded.</td></tr>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const s of symbols) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${UI.escapeHtml(s.name)}</strong></td>
        <td><span class="token-badge KEYWORD">${UI.escapeHtml(s.kind)}</span></td>
        <td><code>${UI.escapeHtml(s.type)}</code></td>
        <td>${UI.escapeHtml(s.scope)}</td>
        <td>Ln ${s.definedLine}</td>
        <td>${s.usages?.length ? s.usages.join(', ') : '—'}</td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderQuadruplesTable(quads) {
    const tbody = document.getElementById('quadsTableBody');
    tbody.innerHTML = '';
    if (!quads.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No quadruples generated.</td></tr>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const q of quads) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${q.id}</td>
        <td><code>${UI.escapeHtml(q.op)}</code></td>
        <td>${q.arg1 != null ? UI.escapeHtml(String(q.arg1)) : '—'}</td>
        <td>${q.arg2 != null ? UI.escapeHtml(String(q.arg2)) : '—'}</td>
        <td><strong>${q.result != null ? UI.escapeHtml(String(q.result)) : '—'}</strong></td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderBasicBlocks(blocks) {
    const container = document.getElementById('cfgBlocksContainer');
    container.innerHTML = '';
    if (!blocks.length) {
      container.innerHTML = '<div class="empty-state">No basic blocks partitioned.</div>';
      return;
    }
    for (const b of blocks) {
      const card = document.createElement('div');
      card.className = 'cfg-block-card';
      card.innerHTML = `
        <div class="cfg-block-header">
          <span>${UI.escapeHtml(b.label)}</span>
          <span>${b.instructions.length} instrs</span>
        </div>
        <div class="cfg-block-code">${UI.escapeHtml((b.instructions || []).join('\n'))}</div>`;
      container.appendChild(card);
    }
  }

  function renderBytecodeTable(bytecode) {
    const tbody = document.getElementById('bytecodeTableBody');
    tbody.innerHTML = '';
    if (!bytecode.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No bytecode emitted.</td></tr>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const b of bytecode) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong><code>${UI.escapeHtml(b.opcode)}</code></strong></td>
        <td>${b.arg != null ? `<code>${UI.escapeHtml(String(b.arg))}</code>` : '—'}</td>
        <td>${UI.escapeHtml(b.comment || '')}</td>`;
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderOptimizationsList(optimizations) {
    const list = document.getElementById('optPassList');
    list.innerHTML = '';
    if (!optimizations.length) {
      list.innerHTML = '<li class="empty-item">No optimization passes applied.</li>';
      return;
    }
    for (const opt of optimizations) {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-check" style="color:var(--color-success);font-size:0.7rem"></i>${UI.escapeHtml(opt)}`;
      list.appendChild(li);
    }
  }

  /* =========================================================
     LOADING STATE & TABS
  ========================================================= */
  function setLoadingState(loading, label = 'Compiling…') {
    isRunning = loading;
    if (loading) {
      runBtn.disabled = true;
      runBtnIcon.className = 'fa-solid fa-spinner fa-spin';
      runBtnText.textContent = label;
    } else {
      runBtn.disabled = false;
      runBtnIcon.className = 'fa-solid fa-play';
      runBtnText.innerHTML = 'Run &amp; Compile';
      clearTimeoutBar();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function switchTab(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
  }

  subTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent   = btn.closest('.tab-pane');
      const targetId = btn.dataset.subtab;
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.toggle('active', c.id === targetId));
    });
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      document.querySelectorAll('#tokensTableBody tr').forEach(r => {
        r.style.display = (filter === 'ALL' || r.dataset.type === filter) ? '' : 'none';
      });
    });
  });

  document.getElementById('expandAstBtn').addEventListener('click', () => AstVisualizer.expandAll(document.getElementById('astVisualTree')));
  document.getElementById('collapseAstBtn').addEventListener('click', () => AstVisualizer.collapseAll(document.getElementById('astVisualTree')));
  document.getElementById('toggleRawJsonBtn').addEventListener('click', () => {
    const tree = document.getElementById('astVisualTree');
    const json = document.getElementById('astJsonViewer');
    const showJson = json.style.display === 'none';
    json.style.display = showJson ? 'block' : 'none';
    tree.style.display = showJson ? 'none' : 'block';
  });

  /* =========================================================
     SNIPPETS & CONTROLS
  ========================================================= */
  snippetSelect.addEventListener('change', () => {
    if (snippetSelect.value) loadSnippet(snippetSelect.value);
  });

  clearEditorBtn.addEventListener('click', () => {
    if (!codeEditor.value.trim() || confirm('Clear the editor?')) {
      codeEditor.value = '';
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
      triggerAutoDetection('');
      showToast('Editor cleared.', 'info');
    }
  });

  function clearConsole() {
    if (terminalScreen) terminalScreen.remove();
    terminalScreen = null;
    consoleOutput.innerHTML = `<div class="console-placeholder">
      <div class="placeholder-icon"><i class="fa-solid fa-terminal"></i></div>
      <h3>Console Cleared</h3>
      <p>Press <kbd>Ctrl+Enter</kbd> to run your code.</p>
    </div>`;
    statExecTime.textContent    = '—';
    statCompileTime.textContent = '—';
    statMemory.textContent      = '—';
    statExitCode.textContent    = '—';
    statExitCode.style.color    = '';
    statEngine.textContent      = '—';
    hideAllBanners();
  }

  clearConsoleBtn.addEventListener('click', () => {
    clearConsole();
    showToast('Console cleared.', 'info');
  });

  copyCodeBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeEditor.value);
      showToast('Code copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy manually.', 'warning');
    }
  });

  copyOutputBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(consoleOutput.innerText);
      showToast('Output copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy output.', 'warning');
    }
  });

  fileUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      codeEditor.value = evt.target.result;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
      fileNameDisplay.textContent = file.name;
      triggerAutoDetection(evt.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function downloadCode() {
    const text = codeEditor.value;
    if (!text.trim()) return;
    const selectedId = languageSelect.value;
    const lang = allLanguages.find(l => l.id === selectedId);
    const ext  = lang ? (lang.extension || '.txt') : '.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `main${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadBtn.addEventListener('click', downloadCode);

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    themeToggleBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('polycompile-theme', isLight ? 'light' : 'dark');
  });

  if (localStorage.getItem('polycompile-theme') === 'light') {
    document.body.classList.add('theme-light');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  detectionInfoBtn.addEventListener('click', () => {
    if (!currentDetection) return;
    evidenceModal.classList.add('open');
  });

  closeEvidenceBtn.addEventListener('click', () => evidenceModal.classList.remove('open'));
  evidenceModal.addEventListener('click', e => { if (e.target === evidenceModal) evidenceModal.classList.remove('open'); });

  keyboardShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.add('open'));
  closeShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.remove('open'));
  shortcutsModal.addEventListener('click', e => { if (e.target === shortcutsModal) shortcutsModal.classList.remove('open'); });

  languageSelect.addEventListener('change', () => {
    updateFileInfo();
    if (languageSelect.value !== 'auto') scheduleAutoDetection();
  });

  /* =========================================================
     PANEL RESIZE
  ========================================================= */
  let isResizing = false;
  let startX = 0, startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = editorPanel.offsetWidth;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    editorPanel.style.width = Math.min(Math.max(startWidth + dx, 280), workspaceContainer.offsetWidth - 200) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  const viewBtnEditor = document.getElementById('viewBtnEditor');
  const viewBtnOutput = document.getElementById('viewBtnOutput');
  const viewBtnSplit  = document.getElementById('viewBtnSplit');

  function setResponsiveView(mode) {
    if (!workspaceContainer) return;
    workspaceContainer.classList.remove('view-editor', 'view-output', 'view-split');
    workspaceContainer.classList.add(`view-${mode}`);
    [viewBtnEditor, viewBtnOutput, viewBtnSplit].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.view === mode);
    });
  }

  if (viewBtnEditor) viewBtnEditor.addEventListener('click', () => setResponsiveView('editor'));
  if (viewBtnOutput) viewBtnOutput.addEventListener('click', () => setResponsiveView('output'));
  if (viewBtnSplit)  viewBtnSplit.addEventListener('click',  () => setResponsiveView('split'));

  /* =========================================================
     ACTION BUTTONS & INIT
  ========================================================= */
  runBtn.addEventListener('click', runCode);
  inspectPhasesBtn.addEventListener('click', inspectPhases);

  UI.syncLineNumbers(codeEditor, lineNumbers);
  updateFileInfo();
  initializeData();
});