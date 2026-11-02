/**
 * PolyCompile — Main Application Controller v2
 *
 * Improvements over v1:
 *  - Proper side-by-side layout with resizable panels
 *  - Timeout progress bar with countdown
 *  - Error / success / docker-unavailable banners
 *  - All error types handled gracefully
 *  - Toast notification system
 *  - Cursor position tracker
 *  - Keyboard shortcuts (Ctrl+Enter, Ctrl+L, Ctrl+/, Ctrl+S)
 *  - Copy code & copy output buttons
 *  - Language file extensions shown in dropdown
 *  - Font-size controls
 *  - Request AbortController for cancellation
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
  const stdinInput          = document.getElementById('stdinInput');
  const stdinToggleHeader   = document.getElementById('stdinToggleHeader');
  const stdinBody           = document.getElementById('stdinBody');
  const stdinArrow          = document.getElementById('stdinArrow');
  const toggleStdinBtn      = document.getElementById('toggleStdinBtn');
  const clearStdinBtn       = document.getElementById('clearStdinBtn');
  const stdinBadge          = document.getElementById('stdinBadge');
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
  let editorFontSize     = 14;
  let timeoutTimer       = null;
  let timeoutProgress    = 0;
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
    // Group by category
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
        // Show name + primary extension
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
    // Tab → 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end   = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
    }
    // Ctrl+Enter → Run
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCode();
    }
    // Ctrl+/ → Inspect
    else if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      inspectPhases();
    }
    // Ctrl+S → Download
    else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      downloadCode();
    }
    // Ctrl+L → Clear console
    else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clearConsole();
    }
    // Ctrl+D → Duplicate line
    else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      duplicateLine();
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
    // Update file extension badge from selected language
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

  function duplicateLine() {
    const pos   = codeEditor.selectionStart;
    const lines  = codeEditor.value.split('\n');
    const linesBefore = codeEditor.value.substring(0, pos).split('\n');
    const lineIndex   = linesBefore.length - 1;
    const currentLine = lines[lineIndex] || '';
    lines.splice(lineIndex + 1, 0, currentLine);
    codeEditor.value = lines.join('\n');
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
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
      if (err.name !== 'TimeoutError' && err.name !== 'AbortError') {
        console.warn('Detection failed:', err.message);
      }
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
    timeoutProgress = 0;
    const startTime = Date.now();

    timeoutProgressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      timeoutFill.style.width = pct + '%';
      const sec = (elapsed / 1000).toFixed(1);
      if (timeoutLabel) {
        timeoutLabel.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${elapsed > 10000 ? 'Processing complex code…' : 'Running…'} ${sec}s`;
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

  // Hook abort button on timeout progress bar
  const abortRunBtn = document.getElementById('abortRunBtn');
  if (abortRunBtn) {
    abortRunBtn.addEventListener('click', () => {
      if (interactiveSocket && interactiveSocket.readyState === WebSocket.OPEN) {
        interactiveSocket.send(JSON.stringify({ type: 'stop' }));
        interactiveSocket.close();
      }
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
     RUN & COMPILE
  ========================================================= */
  let interactiveSocket = null;
  let terminalInput = null;
  let terminalText = null;

  function terminalWrite(text, className = 'stdout-chunk') {
    if (!terminalText) {
      consoleOutput.innerHTML = '';
      terminalText = document.createElement('pre');
      terminalText.className = 'interactive-terminal-text';
      consoleOutput.appendChild(terminalText);
    }
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    terminalText.appendChild(span);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function ensureTerminalInput() {
    if (terminalInput) return terminalInput;
    const row = document.createElement('form');
    row.className = 'interactive-terminal-input-row';
    row.innerHTML = '<span class="terminal-prompt">›</span><input class="interactive-terminal-input" type="text" autocomplete="off" spellcheck="false" aria-label="Program input" placeholder="Type program input and press Enter…"><button type="submit">Send</button>';
    consoleOutput.appendChild(row);
    terminalInput = row.querySelector('input');
    row.addEventListener('submit', event => {
      event.preventDefault();
      if (!terminalInput || !interactiveSocket || interactiveSocket.readyState !== WebSocket.OPEN) return;
      const value = terminalInput.value;
      terminalWrite(value + '\n', 'terminal-input-echo');
      interactiveSocket.send(JSON.stringify({ type: 'input', data: value }));
      terminalInput.value = '';
      terminalInput.focus();
    });
    return terminalInput;
  }

  async function runCode() {
    if (isRunning) {
      if (interactiveSocket && interactiveSocket.readyState === WebSocket.OPEN) {
        interactiveSocket.send(JSON.stringify({ type: 'stop' }));
        interactiveSocket.close();
      }
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
    setLoadingState(true, 'Compiling...');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);
    consoleOutput.innerHTML = '';

    currentAbortCtrl = new AbortController();

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          languageId: selectedLang === 'auto' ? '' : selectedLang,
          stdin: stdinInput ? stdinInput.value : '',
          preferLocal: Boolean(preferLocalCheck && preferLocalCheck.checked)
        }),
        signal: currentAbortCtrl.signal
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = {
          success: false,
          error: 'The execution server returned an invalid response.',
          userMessage: 'Unable to read the execution server response.',
          errorType: 'server_error'
        };
      }

      if (!response.ok || !data.success) {
        handleExecutionError(data);
        return;
      }

      displayExecutionResults(data);

    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Execution stopped.', 'info');
      } else {
        handleExecutionError({
          success: false,
          error: err.message || 'Network request failed.',
          userMessage: 'Could not connect to the execution server. Please try again.',
          errorType: 'server_error'
        });
      }
    } finally {
      currentAbortCtrl = null;
      setLoadingState(false);
      clearTimeoutBar();
    }
  }
  function handleExecutionError(data) {
    const isDockerDown = data.errorType === 'execution_service_unavailable';
    const isTimeout    = data.status === 'TIMEOUT';

    if (isTimeout) {
      showBanner(timeoutBanner);
    } else if (isDockerDown) {
      showBanner(dockerErrorBanner, dockerErrorMsg,
        data.userMessage || 'Execution sandbox is currently busy. Try enabling "Local Runtime".');
    } else {
      showBanner(compilationErrorBanner, errorBannerTitle, 'Execution Error');
      if (errorBannerMsg) errorBannerMsg.textContent = data.userMessage || data.error || 'The request could not be completed.';
    }

    consoleOutput.innerHTML = `<div class="service-error-card">
      <strong>${UI.escapeHtml(data.errorType === 'execution_service_unavailable' ? 'Execution Service Unavailable' : 'Execution Failed')}</strong>
      <p>${UI.escapeHtml(data.userMessage || data.error || 'Unknown error')}</p>
      ${data.error ? `<details><summary>Details</summary><pre>${UI.escapeHtml(data.error)}</pre></details>` : ''}
    </div>`;
  }

  function showBanner(banner, textEl, message) {
    if (!banner) return;
    banner.style.display = 'flex';
    if (textEl && message !== undefined) textEl.textContent = message;
  }

  function displayExecutionResults(data) {
    const exec = data.execution || {};

    // Accurate Execution & Compile Time formatting
    const ms = exec.executionTimeMs != null ? exec.executionTimeMs : (data.durationMs != null ? data.durationMs : null);
    const timedOut = exec.timedOut || data.timedOut || false;

    if (ms != null) {
      statExecTime.textContent = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s (${ms} ms)` : `${ms} ms`;
      if (timedOut) {
        statExecTime.textContent += ' [TIMEOUT]';
        statExecTime.style.color = 'var(--color-error)';
      } else {
        statExecTime.style.color = 'var(--color-success)';
      }
    } else {
      statExecTime.textContent = '—';
      statExecTime.style.color = '';
    }

    const cMs = data.compileTimeMs;
    statCompileTime.textContent = cMs != null ? (cMs >= 1000 ? `${(cMs / 1000).toFixed(2)}s (${cMs} ms)` : `${cMs} ms`) : '—';
    statEngine.textContent      = exec.engine || data.language?.name || '—';

    if (exec.memoryKb && exec.memoryKb > 0) {
      statMemory.textContent = exec.memoryKb >= 1024
        ? `${(exec.memoryKb / 1024).toFixed(1)} MB`
        : `${exec.memoryKb} KB`;
    } else {
      statMemory.textContent = '—';
    }

    const exitCode = exec.exitCode ?? data.exitCode ?? null;
    if (exitCode !== null) {
      statExitCode.textContent  = String(exitCode);
      statExitCode.style.color  = exitCode === 0 ? 'var(--color-success)' : 'var(--color-error)';
    } else {
      statExitCode.textContent = '—';
      statExitCode.style.color = '';
    }

    // Build output HTML
    let outputHtml = '';
    const compileOutput = exec.compileOutput || data.compileOutput || '';
    const stdout        = exec.stdout  || data.output      || '';
    const stderr        = exec.stderr  || data.errorOutput || '';
    const compileFailed = exec.compileFailed || data.compileFailed || false;

    if (compileOutput) {
      outputHtml += `<span class="compile-chunk"><i class="fa-solid fa-gears" style="margin-right:5px"></i>Compiler output:\n${UI.escapeHtml(compileOutput)}</span>\n`;
    }

    if (stdout) {
      outputHtml += `<span class="stdout-chunk">${UI.escapeHtml(stdout)}</span>`;
    }

    if (stderr) {
      outputHtml += `\n<span class="stderr-chunk">⚠ stderr:\n${UI.escapeHtml(stderr)}</span>`;
    }

    if (!stdout && !stderr && !compileOutput) {
      outputHtml = `<span class="stdout-chunk" style="color:var(--text-muted)">(no output)</span>`;
    }

    if (stdinInput && stdinInput.value.trim()) {
      outputHtml += `\n<div class="stdin-echo-chip" style="margin-top:8px;padding:4px 8px;font-size:0.75rem;background:rgba(56,189,248,0.08);border-left:2px solid #38bdf8;border-radius:2px;color:var(--text-muted);"><i class="fa-solid fa-keyboard" style="color:#38bdf8;margin-right:5px"></i>stdin passed: <code style="color:#e2e8f0;font-family:var(--font-mono);">${UI.escapeHtml(stdinInput.value.trim().replace(/\n/g, ' ↵ '))}</code></div>`;
    }

    consoleOutput.innerHTML = outputHtml;

    // Show appropriate banner
    if (timedOut) {
      showBanner(timeoutBanner);
    } else if (compileFailed) {
      showBanner(compilationErrorBanner, errorBannerMsg, `Compilation failed. Check the stderr output below.`);
    } else if (exitCode !== null && exitCode !== 0) {
      showBanner(runtimeErrorBanner, runtimeErrorMsg, `Program exited with code ${exitCode}.`);
    } else if (exitCode === 0 && !stderr) {
      showBanner(successBanner, successBannerMsg, `Program completed successfully in ${statExecTime.textContent}.`);
    }
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

    if (window.innerWidth <= 900) {
      setResponsiveView('output');
    }

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
      if (err.name !== 'AbortError') {
        showToast(`Analysis failed: ${err.message}`, 'error');
      }
    }
  }

  function populateCompilerPhases(phases) {
    if (!phases) return;

    // Phase 1: Lexical
    const p1 = phases.phase1_lexical || phases.lexical;
    if (p1) {
      document.getElementById('lexTotalTokens').textContent  = p1.totalTokens || p1.tokens?.length || 0;
      document.getElementById('lexUniqueTokens').textContent = p1.metrics?.uniqueTokens || 0;
      document.getElementById('lexKwDensity').textContent    = `${p1.metrics?.keywordDensity || 0}%`;
      document.getElementById('lexIdDensity').textContent    = `${p1.metrics?.identifierDensity || 0}%`;
      renderTokensTable(p1.tokens || []);
    }

    // Phase 2: Syntax / AST
    const p2 = phases.phase2_syntax || phases.syntax;
    if (p2) {
      document.getElementById('astTotalNodes').textContent = p2.metrics?.totalAstNodes || 0;
      document.getElementById('astTreeDepth').textContent  = p2.metrics?.treeDepth || 0;
      document.getElementById('astComplexity').textContent = p2.metrics?.cyclomaticComplexity || 1;
      AstVisualizer.render(p2.ast, document.getElementById('astVisualTree'));
      document.getElementById('astJsonViewer').textContent = JSON.stringify(p2.ast, null, 2);
    }

    // Phase 3: Semantic
    const p3 = phases.phase3_semantic || phases.semantic;
    if (p3) {
      document.getElementById('semTotalSymbols').textContent  = p3.symbolTable?.length || 0;
      document.getElementById('semTotalScopes').textContent   = p3.scopes?.length || 0;
      document.getElementById('semTotalWarnings').textContent = p3.warnings?.length || 0;
      renderSymbolTable(p3.symbolTable || []);
    }

    // Phase 4: IR / CFG
    const p4 = phases.phase4_intermediate || phases.intermediate;
    if (p4) {
      document.getElementById('tacCodeBlock').textContent = (p4.tac || []).join('\n') || '// No TAC generated';
      renderQuadruplesTable(p4.quadruples || []);
      renderBasicBlocks(p4.basicBlocks || []);
    }

    // Phase 5: CodeGen
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
     LOADING STATE
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
      runBtnText.textContent = 'Run & Compile';
      clearTimeoutBar();
    }
  }

  /* =========================================================
     TAB NAVIGATION
  ========================================================= */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function switchTab(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
  }

  // Sub-tabs
  subTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent   = btn.closest('.tab-pane');
      const targetId = btn.dataset.subtab;
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.toggle('active', c.id === targetId));
    });
  });

  // Token filters
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

  // AST controls
  document.getElementById('expandAstBtn').addEventListener('click', () => {
    AstVisualizer.expandAll(document.getElementById('astVisualTree'));
  });
  document.getElementById('collapseAstBtn').addEventListener('click', () => {
    AstVisualizer.collapseAll(document.getElementById('astVisualTree'));
  });
  document.getElementById('toggleRawJsonBtn').addEventListener('click', () => {
    const tree = document.getElementById('astVisualTree');
    const json = document.getElementById('astJsonViewer');
    const showJson = json.style.display === 'none';
    json.style.display = showJson ? 'block' : 'none';
    tree.style.display = showJson ? 'none' : 'block';
  });

  /* =========================================================
     STDIN PANEL (INTEGRATED IN CONSOLE OUTPUT WINDOW)
  ========================================================= */
  function toggleStdin(forceState) {
    if (!stdinBody) return;
    const shouldOpen = forceState !== undefined ? forceState : !stdinBody.classList.contains('open');
    stdinBody.classList.toggle('open', shouldOpen);
    if (stdinArrow) {
      stdinArrow.style.transform = shouldOpen ? 'rotate(180deg)' : '';
    }
    if (shouldOpen && stdinInput) {
      stdinInput.focus();
    }
  }

  function updateStdinBadge() {
    if (!stdinBadge || !stdinInput) return;
    const hasContent = stdinInput.value.trim().length > 0;
    if (hasContent) {
      const lineCount = stdinInput.value.trim().split('\n').length;
      stdinBadge.textContent = `${lineCount} line${lineCount > 1 ? 's' : ''}`;
      stdinBadge.classList.add('active');
    } else {
      stdinBadge.textContent = 'Optional';
      stdinBadge.classList.remove('active');
    }
  }

  if (stdinToggleHeader) {
    stdinToggleHeader.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'clearStdinBtn') return;
      toggleStdin();
    });
  }

  if (toggleStdinBtn) {
    toggleStdinBtn.addEventListener('click', () => {
      toggleStdin();
    });
  }

  if (clearStdinBtn) {
    clearStdinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (stdinInput) {
        stdinInput.value = '';
        updateStdinBadge();
        stdinInput.focus();
      }
    });
  }

  if (stdinInput) {
    stdinInput.addEventListener('input', updateStdinBadge);
  }

  /* =========================================================
     SNIPPET LOADER
  ========================================================= */
  snippetSelect.addEventListener('change', () => {
    if (snippetSelect.value) loadSnippet(snippetSelect.value);
  });

  /* =========================================================
     CLEAR EDITOR
  ========================================================= */
  clearEditorBtn.addEventListener('click', () => {
    if (!codeEditor.value.trim() || confirm('Clear the editor?')) {
      codeEditor.value = '';
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
      triggerAutoDetection('');
      showToast('Editor cleared.', 'info');
    }
  });

  /* =========================================================
     CLEAR CONSOLE
  ========================================================= */
  function clearConsole() {
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

  /* =========================================================
     COPY BUTTONS
  ========================================================= */
  copyCodeBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeEditor.value);
      showToast('Code copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy — try selecting and copying manually.', 'warning');
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

  /* =========================================================
     FILE UPLOAD
  ========================================================= */
  fileUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      codeEditor.value = evt.target.result;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
      // Set file name
      fileNameDisplay.textContent = file.name;
      // Auto-detect language from extension
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const matched = allLanguages.find(l =>
        Array.isArray(l.extensions)
          ? l.extensions.some(e2 => e2.toLowerCase() === ext)
          : (l.extension || '').toLowerCase() === ext
      );
      if (matched) {
        languageSelect.value = matched.id;
        updateFileInfo();
        showToast(`Detected ${matched.name} from file extension.`, 'success');
      }
      triggerAutoDetection(evt.target.result);
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  });

  /* =========================================================
     FILE DOWNLOAD
  ========================================================= */
  function downloadCode() {
    const text = codeEditor.value;
    if (!text.trim()) {
      showToast('Nothing to download.', 'warning');
      return;
    }
    const selectedId = languageSelect.value;
    const lang = allLanguages.find(l => l.id === selectedId);
    const ext  = lang
      ? (lang.extension || (Array.isArray(lang.extensions) ? lang.extensions[0] : '.txt'))
      : (currentDetection?.detected?.extension || '.txt');
    const filename = `main${ext}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Downloaded as ${filename}`, 'success');
  }

  downloadBtn.addEventListener('click', downloadCode);

  /* =========================================================
     THEME TOGGLE
  ========================================================= */
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    themeToggleBtn.innerHTML = isLight
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('polycompile-theme', isLight ? 'light' : 'dark');
  });

  // Restore theme preference
  if (localStorage.getItem('polycompile-theme') === 'light') {
    document.body.classList.add('theme-light');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  /* =========================================================
     EVIDENCE MODAL
  ========================================================= */
  detectionInfoBtn.addEventListener('click', () => {
    if (!currentDetection) {
      showToast('No detection data yet. Type some code first.', 'info');
      return;
    }
    const d = currentDetection;
    document.getElementById('evidenceSummary').textContent =
      `${d.detected?.name || '?'} detected with ${d.confidence || 0}% confidence (${d.paradigm || '—'} paradigm).`;

    const candidatesList = document.getElementById('candidatesList');
    candidatesList.innerHTML = '';
    for (const c of (d.candidates || [])) {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.innerHTML = `<span class="candidate-name">${UI.escapeHtml(c.name)}</span><span class="candidate-pct">${c.percentage}%</span>`;
      candidatesList.appendChild(card);
    }

    const reasoningList = document.getElementById('reasoningList');
    reasoningList.innerHTML = '';
    for (const r of (d.reasoning || [])) {
      const li = document.createElement('li');
      li.textContent = r;
      reasoningList.appendChild(li);
    }

    evidenceModal.classList.add('open');
  });

  closeEvidenceBtn.addEventListener('click', () => evidenceModal.classList.remove('open'));
  evidenceModal.addEventListener('click', e => { if (e.target === evidenceModal) evidenceModal.classList.remove('open'); });

  /* =========================================================
     KEYBOARD SHORTCUTS MODAL
  ========================================================= */
  keyboardShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.add('open'));
  closeShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.remove('open'));
  shortcutsModal.addEventListener('click', e => { if (e.target === shortcutsModal) shortcutsModal.classList.remove('open'); });

  // Global ESC to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      evidenceModal.classList.remove('open');
      shortcutsModal.classList.remove('open');
    }
  });

  /* =========================================================
     LANGUAGE CHANGE
  ========================================================= */
  languageSelect.addEventListener('change', () => {
    updateFileInfo();
    if (languageSelect.value !== 'auto') scheduleAutoDetection();
  });

  /* =========================================================
     RESIZABLE PANELS
  ========================================================= */
  let isResizing = false;
  let startX     = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX     = e.clientX;
    startWidth = editorPanel.offsetWidth;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dx       = e.clientX - startX;
    const totalW   = workspaceContainer.offsetWidth;
    const newWidth = Math.min(Math.max(startWidth + dx, 280), totalW - 200);
    editorPanel.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Touch resize support
  resizeHandle.addEventListener('touchstart', (e) => {
    isResizing = true;
    startX     = e.touches[0].clientX;
    startWidth = editorPanel.offsetWidth;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;
    const dx       = e.touches[0].clientX - startX;
    const totalW   = workspaceContainer.offsetWidth;
    const newWidth = Math.min(Math.max(startWidth + dx, 280), totalW - 200);
    editorPanel.style.width = newWidth + 'px';
  }, { passive: false });

  document.addEventListener('touchend', () => { isResizing = false; });

  /* =========================================================
     RESPONSIVE PANEL VIEW SWITCHER (Mobile & Tablet)
  ========================================================= */
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
     GLOBAL KEYBOARD SHORTCUTS
  ========================================================= */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' && (e.ctrlKey || e.metaKey) && document.activeElement !== codeEditor) {
      e.preventDefault();
      clearConsole();
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && document.activeElement !== codeEditor) {
      e.preventDefault();
      downloadCode();
    }
    if (e.key === '/' && (e.ctrlKey || e.metaKey) && document.activeElement !== codeEditor) {
      e.preventDefault();
      inspectPhases();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.activeElement !== codeEditor) {
      e.preventDefault();
      runCode();
    }
  });

  /* =========================================================
     ACTION BUTTONS
  ========================================================= */
  runBtn.addEventListener('click', runCode);
  inspectPhasesBtn.addEventListener('click', inspectPhases);

  /* =========================================================
     BOOT
  ========================================================= */
  UI.syncLineNumbers(codeEditor, lineNumbers);
  updateFileInfo();
  initializeData();
});
