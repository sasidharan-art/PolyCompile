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
     PROGRAMIZ-STYLE LIVE INTERACTIVE TERMINAL
     Input is sent to the running process; output and echoed input
     are appended to the same transcript in the order they occur.
  ========================================================= */
  let interactiveSocket = null;
  let terminalText = null;
  let terminalInput = null;
  let terminalInputRow = null;
  let terminalFinished = false;
  let currentCode = '';
  let currentLang = '';

  function resetTerminal() {
    consoleOutput.innerHTML = '';
    terminalText = document.createElement('pre');
    terminalText.className = 'interactive-terminal-text';
    consoleOutput.appendChild(terminalText);
    terminalInput = null;
    terminalInputRow = null;
    terminalFinished = false;
    consoleOutput.scrollTop = 0;
  }

  function terminalWrite(value, className = 'stdout-chunk') {
    if (!terminalText) resetTerminal();
    const span = document.createElement('span');
    span.className = className;
    // Preserve exact whitespace and never interpret program output as HTML.
    span.textContent = String(value ?? '').replace(/\r\n/g, '\n');
    terminalText.appendChild(span);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function ensureTerminalInput() {
    if (terminalInputRow && terminalInputRow.isConnected) return terminalInput;
    const row = document.createElement('form');
    row.className = 'interactive-terminal-input-row';
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '›';
    const input = document.createElement('input');
    input.className = 'interactive-terminal-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Program standard input');
    input.placeholder = 'Type program input and press Enter…';
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'terminal-send-button';
    send.textContent = 'Send';
    row.append(prompt, input, send);
    terminalInputRow = row;
    terminalInput = input;
    consoleOutput.appendChild(row);

    const sendInput = (withNewline) => {
      if (!interactiveSocket || interactiveSocket.readyState !== WebSocket.OPEN || terminalFinished) return;
      const value = input.value;
      // Echo exactly where the user supplied the input, including blank lines.
      terminalWrite(value + (withNewline ? '\n' : ''), 'terminal-input-echo');
      interactiveSocket.send(JSON.stringify({ type: 'input', data: value, newline: withNewline }));
      input.value = '';
      input.focus();
    };

    row.addEventListener('submit', event => {
      event.preventDefault();
      sendInput(true);
    });
    input.addEventListener('paste', event => {
      const pasted = (event.clipboardData || window.clipboardData)?.getData('text') || '';
      if (!pasted.includes('\n') && !pasted.includes('\r')) return;
      event.preventDefault();
      if (!interactiveSocket || interactiveSocket.readyState !== WebSocket.OPEN || terminalFinished) return;
      const normalized = pasted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const payload = normalized.endsWith('\n') ? normalized : normalized + '\n';
      terminalWrite(payload, 'terminal-input-echo');
      interactiveSocket.send(JSON.stringify({ type: 'input', data: payload, newline: false }));
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendInput(true);
      } else if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
        event.preventDefault();
        if (interactiveSocket?.readyState === WebSocket.OPEN && !terminalFinished) {
          terminalWrite('^D\n', 'terminal-input-echo');
          interactiveSocket.send(JSON.stringify({ type: 'eof' }));
          input.disabled = true;
          send.disabled = true;
        }
      }
    });
    consoleOutput.addEventListener('click', focusTerminalInput);
    return input;
  }

  function focusTerminalInput() {
    if (terminalInput && !terminalInput.disabled) terminalInput.focus();
  }

  function closeInteractiveSession(sendStop = false) {
    if (interactiveSocket) {
      if (sendStop && interactiveSocket.readyState === WebSocket.OPEN) {
        interactiveSocket.send(JSON.stringify({ type: 'stop' }));
      }
      try { interactiveSocket.close(); } catch (_) {}
      interactiveSocket = null;
    }
    terminalFinished = true;
    if (terminalInput) terminalInput.disabled = true;
    const send = terminalInputRow?.querySelector('button');
    if (send) send.disabled = true;
  }

  function sourceReadsStdin(source, languageId) {
    const patterns = {
      c: /\b(scanf|getchar|fgets|fscanf)\s*\(/,
      cpp: /\b(cin|getline|getchar|scanf)\b/,
      java: /\b(Scanner|BufferedReader|System\.in|readLine|nextInt|nextLine|nextDouble)\b/,
      python: /\b(input|stdin\.read|stdin\.readline)\s*\(/,
      javascript: /\b(readline|createInterface|question|prompt)\s*\(/,
      typescript: /\b(readline|createInterface|question|prompt)\s*\(/,
      csharp: /\b(ReadLine|ReadKey|ReadToEnd)\s*\(/,
      go: /\b(Scan|Scanln|Scanf|ReadString|ReadBytes)\s*\(/,
      rust: /\b(read_line|stdin)\b/,
      php: /\b(fgets|readline)\s*\(/,
      ruby: /\b(gets|readline)\b/,
      bash: /\bread\s+/,
      pascal: /\b(read|readln)\s*\(/i,
      fortran: /\bread\s*\s*\(/i
    };
    return (patterns[languageId] || /\b(input|scanf|cin|readLine|readline|gets|readln|stdin)\b/i).test(source);
  }

  async function runBatchFallback(sourceCode, languageId, stdin = '') {
    terminalWrite('[Live gateway unavailable — using cloud batch execution. Output appears after the run.]\n', 'terminal-system');
    setLoadingState(true, 'Running…');
    const ctrl = new AbortController();
    currentAbortCtrl = ctrl;
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode, languageId, stdin, preferLocal: Boolean(preferLocalCheck?.checked) }),
        signal: ctrl.signal
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.userMessage || payload.error || `Execution failed (${response.status})`);
      const result = payload.execution || {};
      if (result.compileOutput) terminalWrite(result.compileOutput + (result.compileOutput.endsWith('\n') ? '' : '\n'), 'stderr-chunk');
      if (result.stdout) terminalWrite(result.stdout);
      if (result.stderr) terminalWrite(result.stderr + (result.stderr.endsWith('\n') ? '' : '\n'), 'stderr-chunk');
      if (!result.stdout && !result.stderr && !result.compileOutput) terminalWrite('[Program completed with no output]\n', 'terminal-system');
      statEngine.textContent = result.engine || 'Cloud Sandbox';
      statExitCode.textContent = String(result.exitCode ?? (result.success ? 0 : 1));
      statExitCode.style.color = result.success ? 'var(--color-success)' : 'var(--color-error)';
      if (result.executionTimeMs != null) statExecTime.textContent = `${result.executionTimeMs} ms`;
      if (result.memoryKb != null) statMemory.textContent = `${result.memoryKb} KB`;
      terminalWrite(`\n[Process exited with code ${result.exitCode ?? (result.success ? 0 : 1)}]\n`, 'terminal-system');
      if (result.success) showToast('Program completed successfully.', 'success');
      else showToast('Program finished with an error.', 'error');
    } catch (err) {
      if (err.name !== 'AbortError') {
        terminalWrite(`\n${err.message || 'Execution failed.'}\n`, 'stderr-chunk');
        showToast('Execution failed.', 'error');
      }
    } finally {
      currentAbortCtrl = null;
      terminalFinished = true;
      setLoadingState(false);
      clearTimeoutBar();
    }
  }

  function showBatchInput(sourceCode, languageId) {
    terminalWrite('Live input gateway is not connected. Enter standard input below; it will be supplied when the program starts.\n', 'terminal-system');
    const wrap = document.createElement('div');
    wrap.className = 'interactive-terminal-input-row';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px 0;';
    const area = document.createElement('textarea');
    area.className = 'interactive-terminal-input';
    area.rows = 4;
    area.style.cssText = 'width:100%;min-height:88px;resize:vertical;white-space:pre;font-family:inherit;';
    area.placeholder = 'Enter program input here (one value per line)…';
    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'terminal-send-button';
    run.textContent = 'Run with this input';
    run.addEventListener('click', () => {
      const stdin = area.value;
      terminalWrite(stdin ? stdin + (stdin.endsWith('\n') ? '' : '\n') : '[No input supplied]\n', 'terminal-input-echo');
      wrap.remove();
      runBatchFallback(sourceCode, languageId, stdin);
    });
    wrap.append(area, run);
    consoleOutput.appendChild(wrap);
    area.focus();
    setLoadingState(false);
    clearTimeoutBar();
  }

  async function runCode() {
    if (isRunning) {
      closeInteractiveSession(true);
      if (currentAbortCtrl) currentAbortCtrl.abort();
      setLoadingState(false);
      terminalWrite('\n[Execution stopped by user]\n', 'terminal-system');
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
    currentLang = languageSelect.value;
    currentAbortCtrl = new AbortController();
    setLoadingState(true, 'Connecting…');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);
    terminalWrite('Connecting to interactive execution service…\n', 'terminal-system');

    try {
      if (!currentLang || currentLang === 'auto') {
        const detectRes = await fetch('/api/detect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceCode }), signal: currentAbortCtrl.signal
        });
        const detected = await detectRes.json();
        currentLang = detected.detected?.id || detected.language?.id || '';
      }
      if (!currentLang) throw new Error('Could not identify the language. Select it from the language list and run again.');

      const ticketRes = await fetch('/api/interactive-ticket', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        signal: currentAbortCtrl.signal
      });
      const ticketData = await ticketRes.json();
      if (!ticketRes.ok || !ticketData.success) {
        // Keep the compiler usable while the separately hosted PTY gateway is not deployed.
        // Input-driven programs get an inline stdin form; no-input programs execute immediately.
        if (sourceReadsStdin(sourceCode, currentLang)) {
          showBatchInput(sourceCode, currentLang);
          return;
        }
        await runBatchFallback(sourceCode, currentLang, '');
        return;
      }

      const wsUrl = new URL(ticketData.gatewayUrl);
      if (wsUrl.protocol === 'https:') wsUrl.protocol = 'wss:';
      else if (wsUrl.protocol === 'http:') wsUrl.protocol = 'ws:';
      if (!['ws:', 'wss:'].includes(wsUrl.protocol)) throw new Error('Invalid interactive gateway URL. Use ws:// or wss://.');
      wsUrl.searchParams.set('ticket', ticketData.ticket);
      interactiveSocket = new WebSocket(wsUrl.toString());

      interactiveSocket.onopen = () => {
        if (!interactiveSocket) return;
        interactiveSocket.send(JSON.stringify({
          type: 'start', sourceCode: currentCode, languageId: currentLang, timeoutMs: MAX_RUN_TIMEOUT_MS
        }));
        setLoadingState(true, 'Compiling…');
      };

      interactiveSocket.onmessage = event => {
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        if (message.type === 'ready') {
          statEngine.textContent = 'PolyCompile Interactive Sandbox';
          setLoadingState(true, 'Running…');
          terminalWrite(`[${message.language || currentLang}] Running…\n`, 'terminal-system');
          ensureTerminalInput().focus();
        } else if (message.type === 'stdout') {
          terminalWrite(message.data || '');
        } else if (message.type === 'stderr') {
          terminalWrite(message.data || '', 'stderr-chunk');
        } else if (message.type === 'error') {
          terminalWrite(`\n${message.message || 'Interactive execution failed.'}\n`, 'stderr-chunk');
          terminalFinished = true;
          setLoadingState(false);
          closeInteractiveSession(false);
        } else if (message.type === 'exit') {
          terminalFinished = true;
          statExitCode.textContent = String(message.code);
          statExitCode.style.color = message.code === 0 ? 'var(--color-success)' : 'var(--color-error)';
          if (message.durationMs != null) statExecTime.textContent = `${message.durationMs} ms`;
          terminalWrite(`\n[Process exited with code ${message.code}]\n`, 'terminal-system');
          if (terminalInput) terminalInput.disabled = true;
          const send = terminalInputRow?.querySelector('button');
          if (send) send.disabled = true;
          if (message.code === 0) showToast('Program completed successfully.', 'success');
          else showToast(`Program exited with code ${message.code}.`, 'error');
          setLoadingState(false);
          clearTimeoutBar();
        } else if (message.type === 'closed' && !terminalFinished) {
          terminalWrite('\n[Execution container closed unexpectedly]\n', 'stderr-chunk');
          terminalFinished = true;
          setLoadingState(false);
          clearTimeoutBar();
        }
      };

      interactiveSocket.onerror = () => {
        if (!terminalFinished) terminalWrite('\nInteractive connection failed. Check the gateway URL, TLS, and shared ticket secret.\n', 'stderr-chunk');
        terminalFinished = true;
        setLoadingState(false);
        clearTimeoutBar();
      };
      interactiveSocket.onclose = () => {
        if (isRunning) {
          setLoadingState(false);
          clearTimeoutBar();
        }
        interactiveSocket = null;
      };
    } catch (err) {
      if (err.name !== 'AbortError') {
        terminalWrite(`\n${err.message || 'Could not start interactive execution.'}\n`, 'stderr-chunk');
        showToast('Interactive execution could not start.', 'error');
      }
      closeInteractiveSession(false);
      setLoadingState(false);
      clearTimeoutBar();
    } finally {
      currentAbortCtrl = null;
    }
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
    if (isRunning) {
      closeInteractiveSession(true);
      if (currentAbortCtrl) currentAbortCtrl.abort();
      setLoadingState(false);
    }
    consoleOutput.innerHTML = `<div class="console-placeholder"><p>Run your program, then enter values in this terminal when prompted.</p></div>`;
    terminalText = null;
    terminalInput = null;
    terminalInputRow = null;
  }

  clearConsoleBtn.addEventListener('click', clearConsole);

  const abortRunBtn = document.getElementById('abortRunBtn');
  if (abortRunBtn) abortRunBtn.addEventListener('click', () => {
    if (interactiveSocket && interactiveSocket.readyState === WebSocket.OPEN) {
      closeInteractiveSession(true);
      terminalWrite('\n[Execution cancelled]\n', 'terminal-system');
    }
    if (currentAbortCtrl) currentAbortCtrl.abort();
    if (isRunning) setLoadingState(false);
    clearTimeoutBar();
  });

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