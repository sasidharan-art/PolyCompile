/**
 * PolyCompile — Universal Interactive Console (All Languages)
 */

document.addEventListener('DOMContentLoaded', () => {

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
  const stdinInput          = document.getElementById('stdinInput');
  const toastContainer      = document.getElementById('toastContainer');

  const detectedLangName    = document.getElementById('detectedLangName');
  const detectedConfidenceBadge = document.getElementById('detectedConfidenceBadge');
  const detectedParadigmBadge   = document.getElementById('detectedParadigmBadge');

  const statExecTime    = document.getElementById('statExecTime');
  const statCompileTime = document.getElementById('statCompileTime');
  const statMemory      = document.getElementById('statMemory');
  const statExitCode    = document.getElementById('statExitCode');
  const statEngine      = document.getElementById('statEngine');

  const fileNameDisplay  = document.getElementById('fileNameDisplay');
  const fileExtDisplay   = document.getElementById('fileExtDisplay');
  const cursorPosDisplay = document.getElementById('cursorPosDisplay');
  const charCountDisplay = document.getElementById('charCountDisplay');
  const lineCountDisplay = document.getElementById('lineCountDisplay');

  const editorPanel    = document.getElementById('editorPanel');
  const resizeHandle   = document.getElementById('resizeHandle');
  const workspaceContainer = document.getElementById('workspaceContainer');

  const timeoutBar     = document.getElementById('timeoutBar');
  const timeoutFill    = document.getElementById('timeoutFill');
  const timeoutLabel   = document.getElementById('timeoutLabel');

  const tabButtons    = document.querySelectorAll('.tab-btn');
  const tabPanes      = document.querySelectorAll('.tab-pane');
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');

  const statusDot  = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  let allLanguages       = [];
  let allSnippets        = [];
  let currentDetection   = null;
  let detectTimeout      = null;
  let detectionRequestId = 0;
  let isRunning          = false;
  let currentAbortCtrl   = null;
  let timeoutProgressInterval = null;
  const MAX_RUN_TIMEOUT_MS = 60000;

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

  async function checkServerHealth() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        if (statusDot) statusDot.className = 'pulse-dot';
        if (statusText) statusText.textContent = 'Ready';
      }
    } catch {
      if (statusDot) statusDot.className = 'pulse-dot';
      if (statusText) statusText.textContent = 'Ready';
    }
  }

  async function initializeData() {
    try {
      const [langRes, snipRes] = await Promise.all([
        fetch('/api/languages').then(r => r.json()).catch(() => null),
        fetch('/api/snippets').then(r => r.json()).catch(() => null)
      ]);

      if (langRes && langRes.success) {
        allLanguages = langRes.languages;
        populateLanguagesDropdown(langRes.languages);
      }

      if (snipRes && snipRes.success) {
        allSnippets = snipRes.snippets;
        populateSnippetsDropdown(snipRes.snippets);
        if (allSnippets.length > 0) loadSnippet(allSnippets[0].id);
      }

      await checkServerHealth();
    } catch (err) {
      if (statusDot) statusDot.className = 'pulse-dot';
      if (statusText) statusText.textContent = 'Ready';
    }
  }

  function populateLanguagesDropdown(languages) {
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
        signal: AbortSignal.timeout(6000)
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
    } catch {}
  }

  function startTimeoutBar(totalMs) {
    clearTimeoutBar();
    if (timeoutBar) timeoutBar.style.display = 'block';
    if (timeoutFill) timeoutFill.style.width = '0%';
    const startTime = Date.now();

    timeoutProgressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      if (timeoutFill) timeoutFill.style.width = pct + '%';
      const sec = (elapsed / 1000).toFixed(1);
      if (timeoutLabel) {
        timeoutLabel.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running… ${sec}s`;
      }
    }, 250);
  }

  function clearTimeoutBar() {
    clearInterval(timeoutProgressInterval);
    timeoutProgressInterval = null;
    if (timeoutBar) timeoutBar.style.display = 'none';
    if (timeoutFill) timeoutFill.style.width = '0%';
  }

  /* =========================================================
     UNIVERSAL ALL-LANGUAGE TERMINAL RUNNER
  ========================================================= */
  let terminalScreen = null;
  let activeInput = null;
  let inputLines = [];
  let currentCode = '';
  let currentLang = '';

  function resetTerminal() {
    consoleOutput.innerHTML = '';
    terminalScreen = document.createElement('div');
    terminalScreen.style.cssText = 'font-family: Consolas, "Courier New", monospace; white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #c9d1d9;';
    consoleOutput.appendChild(terminalScreen);
  }

  function detectLanguageUniversal(code) {
    const sel = languageSelect.value;
    if (sel && sel !== 'auto') return sel;

    // Multi-Language heuristic
    if (/#include\s*<iostream>|cout\s*<<|cin\s*>>|namespace\s+std/.test(code)) return 'cpp';
    if (/#include\s*<stdio\.h>|printf\s*\(|scanf\s*\(/.test(code)) return 'c';
    if (/^\s*program\s+\w+|implicit\s+none|end\s+program|print\s*\*\s*,/im.test(code)) return 'fortran';
    if (/^\s*program\s+\w+\s*;|\breadln\s*\(/im.test(code)) return 'pascal';
    if (/public\s+class\s+\w+|System\.out\.println|Scanner\s+/.test(code)) return 'java';
    if (/def\s+\w+\(.*\):|print\s*\(|import\s+sys|input\s*\(/.test(code)) return 'python';
    if (/fn\s+main\(\)|println!\(/.test(code)) return 'rust';
    if (/package\s+main|import\s+"fmt"|fmt\.Print/.test(code)) return 'go';
    if (/using\s+System;|Console\.WriteLine/.test(code)) return 'csharp';
    if (/console\.log\(|const\s+\w+\s*=|function\s+\w+\(/.test(code)) return 'javascript';
    if (/puts\s+|require_relative/.test(code)) return 'ruby';
    if (/<\?php/.test(code)) return 'php';

    return currentDetection?.detected?.id || 'python';
  }

  function requiresStdin(code) {
    return /(?:input\s*\(|scanf\s*\(|cin\s*>>|readLine|Scanner|gets\s*\(|fgets\s*\(|io\.read|std::io|Console\.ReadLine)/i.test(code);
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
    if (!sourceCode.trim()) {
      showToast('Please enter source code first.', 'warning');
      return;
    }

    if (window.innerWidth <= 900) setResponsiveView('output');
    switchTab('consoleTab');
    resetTerminal();

    currentCode = sourceCode;
    currentLang = detectLanguageUniversal(sourceCode);
    // Programiz-style workflow: provide stdin in the Input panel, then run once.
    // This sends all input lines to the selected language runtime in their original order.
    const stdinData = stdinInput ? stdinInput.value : '';
    executeCode(stdinData);
  }

  function spawnTerminalRow() {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; margin:0; padding:0;';

    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    // Entirely transparent, zero border/underline, native cursor
    input.style.cssText = 'background:transparent; border:none; outline:none; color:#58a6ff; font-family:inherit; font-size:inherit; padding:0; margin:0; width:100%; caret-color:#58a6ff;';

    row.appendChild(input);
    terminalScreen.appendChild(row);

    activeInput = input;
    input.focus();
    consoleOutput.scrollTop = consoleOutput.scrollHeight;

    // Paste handling: Paste single or 100+ lines at once
    input.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (text.includes('\n')) {
        e.preventDefault();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        for (const l of lines) {
          inputLines.push(l);
          const echo = document.createElement('div');
          echo.textContent = l;
          terminalScreen.insertBefore(echo, row);
        }
        row.remove();
        executeCode(inputLines.join('\n') + '\n');
      }
    });

    input.addEventListener('keydown', (e) => {
      // Ctrl+Enter or Shift+Enter: Execute with current buffer immediately
      if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        const val = input.value;
        if (val.trim()) inputLines.push(val);
        row.remove();
        executeCode(inputLines.join('\n') + '\n');
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value;

        // Enter on an empty line signals that input entry is complete
        if (val.trim() === '') {
          if (inputLines.length > 0) {
            row.remove();
            executeCode(inputLines.join('\n') + '\n');
            return;
          }
        }

        // Echo the entered line and advance to the next line
        inputLines.push(val);
        const echo = document.createElement('div');
        echo.textContent = val;
        terminalScreen.insertBefore(echo, row);

        input.value = '';
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
      }
    });

    consoleOutput.addEventListener('click', () => {
      if (activeInput && activeInput.isConnected) activeInput.focus();
    });
  }

  async function executeCode(stdinData) {
    const loadingText = document.createElement('div');
    loadingText.style.cssText = 'color:#58a6ff; margin-top:6px;';
    loadingText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running…';
    terminalScreen.appendChild(loadingText);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;

    setLoadingState(true, 'Running…');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);
    currentAbortCtrl = new AbortController();

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: currentCode,
          languageId: currentLang,
          stdin: stdinData,
          preferLocal: Boolean(preferLocalCheck && preferLocalCheck.checked)
        }),
        signal: currentAbortCtrl.signal
      });

      const data = await response.json();
      loadingText.remove();

      if (!response.ok || !data.success) {
        handleExecutionError(data);
      } else {
        renderExecutionResults(data);
      }
    } catch (err) {
      loadingText.remove();
      handleExecutionError({
        success: false,
        error: err.message || 'Execution error',
        userMessage: 'Could not connect to compiler sandbox.'
      });
    } finally {
      setLoadingState(false);
      clearTimeoutBar();
    }
  }

  function handleExecutionError(data) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#f85149; margin-top:8px;';
    errDiv.textContent = data.userMessage || data.error || 'Execution failed';
    terminalScreen.appendChild(errDiv);
  }

  function renderExecutionResults(data) {
    const exec = data.execution || {};

    const ms = exec.executionTimeMs != null ? exec.executionTimeMs : (data.durationMs != null ? data.durationMs : null);
    if (ms != null) {
      statExecTime.textContent = `${ms} ms`;
      statExecTime.style.color = 'var(--color-success)';
    }

    statCompileTime.textContent = data.compileTimeMs != null ? `${data.compileTimeMs} ms` : '—';
    statEngine.textContent      = exec.engine || `${data.language?.name || currentLang} Sandbox`;

    const exitCode = exec.exitCode ?? data.exitCode ?? null;
    if (exitCode !== null) {
      statExitCode.textContent = String(exitCode);
      statExitCode.style.color = exitCode === 0 ? 'var(--color-success)' : 'var(--color-error)';
    }

    const stdout = exec.stdout || data.output || '';
    const stderr = exec.stderr || data.errorOutput || '';

    // Keep the output pane focused on actual program output; submitted stdin is
    // shown as a separate, clearly-labelled block above it (Programiz-style).
    terminalScreen.innerHTML = '';

    if (stdout) {
      const outSpan = document.createElement('div');
      outSpan.style.cssText = 'color:#c9d1d9; line-height:1.6; white-space:pre-wrap;';
      outSpan.textContent = stdout;
      terminalScreen.appendChild(outSpan);
    }

    if (stderr) {
      const errSpan = document.createElement('div');
      errSpan.style.cssText = 'color:#f85149; margin-top:4px; white-space:pre-wrap;';
      errSpan.textContent = stderr;
      terminalScreen.appendChild(errSpan);
    }

    const exitDiv = document.createElement('div');
    exitDiv.style.cssText = `margin-top:14px; font-weight:bold; color:${exitCode === 0 ? '#3fb950' : '#f85149'};`;
    exitDiv.textContent = exitCode === 0 
      ? '=== Code Execution Successful ===' 
      : `=== Process exited with code ${exitCode} ===`;
    terminalScreen.appendChild(exitDiv);

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  /* =========================================================
     INSPECT COMPILER PHASES & CONTROLS
  ========================================================= */
  async function inspectPhases() {
    const sourceCode  = codeEditor.value;
    const selectedLang = languageSelect.value;
    if (!sourceCode.trim()) return;

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
        switchTab('lexicalTab');
      }
    } catch {
      setLoadingState(false);
    }
  }

  function populateCompilerPhases(phases) {
    if (!phases) return;
    const p1 = phases.phase1_lexical || phases.lexical;
    if (p1 && document.getElementById('lexTotalTokens')) {
      document.getElementById('lexTotalTokens').textContent = p1.totalTokens || p1.tokens?.length || 0;
    }
  }

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

  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  function switchTab(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
  }

  subTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.tab-pane');
      const targetId = btn.dataset.subtab;
      parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.toggle('active', c.id === targetId));
    });
  });

  snippetSelect.addEventListener('change', () => {
    if (snippetSelect.value) loadSnippet(snippetSelect.value);
  });

  clearEditorBtn.addEventListener('click', () => {
    codeEditor.value = '';
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
  });

  function clearConsole() {
    if (terminalScreen) terminalScreen.remove();
    terminalScreen = null;
    consoleOutput.innerHTML = `<div class="console-placeholder"><p>Press <kbd>Ctrl+Enter</kbd> to run your code.</p></div>`;
  }

  clearConsoleBtn.addEventListener('click', clearConsole);

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
  });

  languageSelect.addEventListener('change', () => updateFileInfo());

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

  runBtn.addEventListener('click', runCode);
  if (inspectPhasesBtn) inspectPhasesBtn.addEventListener('click', inspectPhases);

  UI.syncLineNumbers(codeEditor, lineNumbers);
  updateFileInfo();
  initializeData();
});