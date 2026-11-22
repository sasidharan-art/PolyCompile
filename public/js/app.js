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

  const toggleCustomStdinBtn = document.getElementById('toggleCustomStdinBtn');
  const customStdinPanel     = document.getElementById('customStdinPanel');
  const customStdin          = document.getElementById('customStdin');
  const clearCustomStdinBtn  = document.getElementById('clearCustomStdinBtn');
  const closeCustomStdinBtn  = document.getElementById('closeCustomStdinBtn');

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
        else inspectPhases({ switchTabToPhases: false, silent: true });
      } else {
        inspectPhases({ switchTabToPhases: false, silent: true });
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

  function downloadCode() {
    const code = codeEditor.value;
    if (!code) {
      showToast('No code to download.', 'warning');
      return;
    }
    const selectedId = languageSelect.value;
    const lang = allLanguages.find(l => l.id === selectedId);
    const ext = lang ? (lang.extension || (Array.isArray(lang.extensions) ? lang.extensions[0] : '.txt')) : '.txt';
    const langTag = selectedId === 'auto' ? (currentDetection?.detected?.id || 'code') : (selectedId || 'code');
    const filename = `polycompile-${langTag}${ext.startsWith('.') ? ext : '.' + ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Saved as ${filename}`, 'success');
  }

  function openShortcutsModal() {
    if (shortcutsModal) shortcutsModal.classList.add('open');
  }
  function closeShortcutsModal() {
    if (shortcutsModal) shortcutsModal.classList.remove('open');
  }
  if (keyboardShortcutsBtn) keyboardShortcutsBtn.addEventListener('click', openShortcutsModal);
  if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeShortcutsModal);
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', e => {
      if (e.target === shortcutsModal) closeShortcutsModal();
    });
  }

  function openEvidenceModal() {
    if (!evidenceModal) return;
    const summary = document.getElementById('evidenceSummary');
    const candidates = document.getElementById('candidatesList');
    const reasoning = document.getElementById('reasoningList');

    if (currentDetection) {
      if (summary) {
        summary.innerHTML = `Identified <strong>${currentDetection.detected?.name || 'Unknown'}</strong> with <strong>${currentDetection.confidence || 0}%</strong> confidence. Paradigm: <em>${currentDetection.paradigm || 'N/A'}</em>.`;
      }
      if (candidates) {
        candidates.replaceChildren();
        const list = currentDetection.allCandidates || (currentDetection.detected ? [{ name: currentDetection.detected.name, confidence: currentDetection.confidence }] : []);
        list.forEach(c => {
          const item = document.createElement('div');
          item.className = 'candidate-card';
          item.innerHTML = `<span class="candidate-name">${c.name || c.id}</span><span class="candidate-score">${c.confidence || c.score || 0}%</span>`;
          candidates.appendChild(item);
        });
      }
      if (reasoning) {
        reasoning.replaceChildren();
        const rules = currentDetection.matchedRules || currentDetection.features || currentDetection.reasons || ['Syntax and signature pattern match'];
        rules.forEach(r => {
          const li = document.createElement('li');
          li.textContent = typeof r === 'string' ? r : (r.rule || r.feature || JSON.stringify(r));
          reasoning.appendChild(li);
        });
      }
    } else {
      if (summary) summary.textContent = 'Type code in the editor to trigger automatic language detection.';
      if (candidates) candidates.replaceChildren();
      if (reasoning) reasoning.replaceChildren();
    }
    evidenceModal.classList.add('open');
  }
  function closeEvidenceModal() {
    if (evidenceModal) evidenceModal.classList.remove('open');
  }
  if (detectionInfoBtn) detectionInfoBtn.addEventListener('click', openEvidenceModal);
  if (closeEvidenceBtn) closeEvidenceBtn.addEventListener('click', closeEvidenceModal);
  if (evidenceModal) {
    evidenceModal.addEventListener('click', e => {
      if (e.target === evidenceModal) closeEvidenceModal();
    });
  }

  if (downloadBtn) downloadBtn.addEventListener('click', downloadCode);
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeEditor.value);
        showToast('Code copied to clipboard.', 'success');
      } catch {
        showToast('Unable to copy code.', 'error');
      }
    });
  }
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        codeEditor.value = ev.target.result;
        UI.syncLineNumbers(codeEditor, lineNumbers);
        updateFileInfo();
        scheduleAutoDetection();
        inspectPhases({ switchTabToPhases: false, silent: true });
        showToast(`Loaded ${file.name}`, 'success');
      };
      reader.readAsText(file);
      fileUploadInput.value = '';
    });
  }

  function sanitizeSourceCode(raw) {
    if (raw == null) return '';
    let code = String(raw);
    code = code
      .replace(/<br\s*\/?>\r?\n?/gi, '\n')
      .replace(/<\/br>\r?\n?/gi, '\n')
      .replace(/<\/p>\r?\n?/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>\r?\n?/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;quot;/gi, '&quot;')
      .replace(/&amp;apos;/gi, '&apos;')
      .replace(/&amp;#39;/gi, '&#39;')
      .replace(/&amp;amp;/gi, '&amp;')
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#0*62;/g, '>')
      .replace(/&#0*60;/g, '<')
      .replace(/&#0*34;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#0*38;/g, '&')
      .replace(/&#0*160;/g, ' ');
    code = code.replace(/&#(\d+);/g, (match, dec) => {
      const num = parseInt(dec, 10);
      return num >= 32 && num <= 126 ? String.fromCharCode(num) : match;
    });
    code = code.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const num = parseInt(hex, 16);
      return num >= 32 && num <= 126 ? String.fromCharCode(num) : match;
    });
    code = code.replace(/&amp;/gi, '&');

    // Auto-heal fused lines if browser stripped <node> tags in Dijkstra/Graph codes
    if (/distcontinue/i.test(code)) {
      code = code.replace(/if\s+current_dist\s*>\s*distcontinue/gi, 'if current_dist > dist[node]:\n        continue');
    }
    if (/graphnew_dist/i.test(code)) {
      code = code.replace(/for\s+neighbor,\s*weight\s+in\s+graphnew_dist\s*=\s*current_dist\s*\+\s*weight/gi, 'for neighbor, weight in graph[node]:\n        new_dist = current_dist + weight');
    }
    if (/distdist\[neighbor\]/i.test(code)) {
      code = code.replace(/if\s+new_dist\s*<\s*distdist\[neighbor\]\s*=\s*new_dist/gi, 'if new_dist < dist[neighbor]:\n            dist[neighbor] = new_dist');
    }
    return code;
  }

  function loadSnippet(snippetId) {
    const snip = allSnippets.find(s => s.id === snippetId);
    if (!snip) return;
    codeEditor.value = snip.code;
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
    triggerAutoDetection(snip.code);
    inspectPhases({ switchTabToPhases: false, silent: true });
  }

  codeEditor.addEventListener('paste', e => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (text && (/&(?:gt|lt|quot|amp|#0*39|apos|nbsp);/i.test(text) || /<br\s*\/?>/i.test(text) || /distcontinue|graphnew_dist|distdist\[/i.test(text))) {
      e.preventDefault();
      const clean = sanitizeSourceCode(text);
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + clean + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + clean.length;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
      scheduleAutoDetection();
      showToast('Cleaned HTML entities & formatted source code.', 'info');
    }
  });

  codeEditor.addEventListener('input', () => {
    UI.syncLineNumbers(codeEditor, lineNumbers);
    updateFileInfo();
    scheduleAutoDetection();
  });

  codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
  });

  // Global Keyboard Shortcuts (Runs from anywhere on the page)
  window.addEventListener('keydown', e => {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const key = e.key;

    // Escape closes modals
    if (key === 'Escape') {
      closeShortcutsModal();
      closeEvidenceModal();
      return;
    }

    // Ctrl+Enter or Cmd+Enter -> Run Code
    if (isCtrlOrMeta && key === 'Enter') {
      e.preventDefault();
      runCode();
      return;
    }

    // Ctrl+/ or Cmd+/ -> Inspect Compiler Phases
    if (isCtrlOrMeta && key === '/') {
      e.preventDefault();
      inspectPhases({ switchTabToPhases: true, silent: false });
      return;
    }

    // Ctrl+L or Cmd+L -> Clear Console
    if (isCtrlOrMeta && (key === 'l' || key === 'L')) {
      e.preventDefault();
      clearConsole();
      return;
    }

    // Ctrl+S or Cmd+S -> Download Code
    if (isCtrlOrMeta && (key === 's' || key === 'S')) {
      e.preventDefault();
      downloadCode();
      return;
    }

    // F1 or Ctrl+K -> Toggle Shortcuts Modal
    if (key === 'F1' || (isCtrlOrMeta && (key === 'k' || key === 'K'))) {
      e.preventDefault();
      if (shortcutsModal?.classList.contains('open')) closeShortcutsModal();
      else openShortcutsModal();
      return;
    }

    // '?' opens shortcuts modal when not in an active input/textarea
    if (key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    // Editor-specific shortcuts
    if (document.activeElement === codeEditor) {
      if (key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end   = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        UI.syncLineNumbers(codeEditor, lineNumbers);
        updateFileInfo();
        return;
      }
      if (isCtrlOrMeta && (key === 'd' || key === 'D')) {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end   = codeEditor.selectionEnd;
        const val   = codeEditor.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        const line = val.substring(lineStart, lineEnd);
        codeEditor.value = val.substring(0, lineEnd) + '\n' + line + val.substring(lineEnd);
        codeEditor.selectionStart = codeEditor.selectionEnd = end + line.length + 1;
        UI.syncLineNumbers(codeEditor, lineNumbers);
        updateFileInfo();
        scheduleAutoDetection();
        return;
      }
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
    clearTimeout(detectTimeout);
    detectTimeout = setTimeout(() => {
      if (languageSelect.value === 'auto') {
        triggerAutoDetection(codeEditor.value);
      }
      inspectPhases({ switchTabToPhases: false, silent: true });
    }, 450);
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
  let terminalCompileErrorShown = false;
  let terminalProgramOutputSeen = false;
  let terminalTimeoutShown = false;
  let currentCode = '';
  let currentLang = '';
  let xtermInstance = null;
  let fitAddon = null;
  let currentInputLine = '';

  function initXterm() {
    if (typeof Terminal === 'undefined' || xtermInstance) return;
    try {
      xtermInstance = new Terminal({
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          selectionBackground: 'rgba(56, 139, 253, 0.4)',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4'
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 14,
        lineHeight: 1.4,
        cursorBlink: true,
        convertEol: true,
        scrollback: 5000
      });

      if (typeof FitAddon !== 'undefined' && FitAddon.FitAddon) {
        fitAddon = new FitAddon.FitAddon();
        xtermInstance.loadAddon(fitAddon);
      }

      consoleOutput.innerHTML = '';
      const mount = document.createElement('div');
      mount.className = 'xterm-terminal-view';
      consoleOutput.appendChild(mount);
      xtermInstance.open(mount);
      if (fitAddon) {
        setTimeout(() => fitAddon.fit(), 30);
      }

      xtermInstance.onData(data => {
        if (!interactiveSocket || interactiveSocket.readyState !== WebSocket.OPEN || terminalFinished) return;

        if (data === '\r') {
          xtermInstance.write('\r\n');
          const value = currentInputLine;
          currentInputLine = '';
          interactiveSocket.send(JSON.stringify({ type: 'input', data: value, newline: true }));
        } else if (data === '\u007f' || data === '\b') {
          if (currentInputLine.length > 0) {
            currentInputLine = currentInputLine.slice(0, -1);
            xtermInstance.write('\b \b');
          }
        } else if (data === '\u0003') {
          xtermInstance.write('^C\r\n');
          interactiveSocket.send(JSON.stringify({ type: 'stop' }));
          terminalFinished = true;
          setLoadingState(false);
          clearTimeoutBar();
        } else if (data === '\u0004') {
          if (currentInputLine.length > 0) {
            const value = currentInputLine;
            currentInputLine = '';
            interactiveSocket.send(JSON.stringify({ type: 'input', data: value, newline: true }));
          } else {
            xtermInstance.write('^D\r\n');
            interactiveSocket.send(JSON.stringify({ type: 'eof' }));
          }
        } else if (data >= ' ' || data === '\t' || data.length > 1) {
          currentInputLine += data;
          xtermInstance.write(data);
        }
      });
    } catch (e) {
      console.warn('Xterm initialization skipped:', e);
      xtermInstance = null;
    }
  }

  function resetTerminal() {
    currentInputLine = '';
    terminalFinished = false;
    terminalCompileErrorShown = false;
    terminalProgramOutputSeen = false;
    terminalTimeoutShown = false;

    if (typeof Terminal !== 'undefined' && !xtermInstance) {
      initXterm();
    }

    if (xtermInstance) {
      xtermInstance.reset();
      xtermInstance.focus();
      return;
    }

    consoleOutput.innerHTML = '';
    terminalText = document.createElement('pre');
    terminalText.className = 'interactive-terminal-text';
    consoleOutput.appendChild(terminalText);
    terminalInput = null;
    terminalInputRow = null;
    consoleOutput.scrollTop = 0;
  }

  function terminalWrite(value, className = 'stdout-chunk') {
    const text = String(value ?? '');
    if (xtermInstance) {
      let formatted = text.replace(/\r?\n/g, '\r\n');
      if (className === 'stderr-chunk' || className === 'terminal-error') {
        formatted = `\x1b[31m${formatted}\x1b[0m`;
      } else if (className === 'terminal-success') {
        formatted = `\x1b[32m${formatted}\x1b[0m`;
      } else if (className === 'terminal-system') {
        formatted = `\x1b[90m${formatted}\x1b[0m`;
      }
      xtermInstance.write(formatted);
      return;
    }

    if (!terminalText) resetTerminal();
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text.replace(/\r\n/g, '\n');
    terminalText.appendChild(span);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function ensureTerminalInput() {
    if (xtermInstance) {
      xtermInstance.focus();
      return { disabled: false, placeholder: '', focus: () => xtermInstance.focus(), value: '' };
    }
    if (terminalInputRow && terminalInputRow.isConnected) return terminalInput;
    const row = document.createElement('form');
    row.className = 'interactive-terminal-input-row';
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '$ ';
    const input = document.createElement('input');
    input.className = 'interactive-terminal-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Program standard input');
    input.placeholder = 'Type input and press Enter…';
    // Keep a single shell-like prompt line; Enter submits directly.
    row.append(prompt, input);
    terminalInputRow = row;
    terminalInput = input;
    consoleOutput.appendChild(row);

    let isSubmitting = false;
    const sendInput = (withNewline) => {
      if (isSubmitting) return;
      isSubmitting = true;
      try {
        if (!interactiveSocket || interactiveSocket.readyState !== WebSocket.OPEN || terminalFinished) {
          if (!terminalFinished) {
            terminalFinished = true;
            if (input) {
              input.disabled = true;
              input.placeholder = 'Program finished.';
            }
            terminalWrite('\n[Connection closed. Click Run to execute again.]\n', 'terminal-system');
            setLoadingState(false);
            clearTimeoutBar();
          }
          return;
        }
        const value = input.value;
        // Echo exactly where the user supplied the input, including blank lines.
        terminalWrite(value + (withNewline ? '\n' : ''), 'terminal-input-echo');
        interactiveSocket.send(JSON.stringify({ type: 'input', data: value, newline: withNewline }));
        input.value = '';
        input.focus();
      } finally {
        setTimeout(() => { isSubmitting = false; }, 30);
      }
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
      const prefix = input.value;
      const normalized = (prefix + pasted).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
      } else if (event.key.toLowerCase() === 'c' && event.ctrlKey) {
        event.preventDefault();
        if (interactiveSocket?.readyState === WebSocket.OPEN && !terminalFinished) {
          terminalWrite('^C\n', 'terminal-system');
          interactiveSocket.send(JSON.stringify({ type: 'stop' }));
          terminalFinished = true;
          input.disabled = true;
          setLoadingState(false);
          clearTimeoutBar();
        }
      } else if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
        event.preventDefault();
        if (interactiveSocket?.readyState === WebSocket.OPEN && !terminalFinished) {
          if (input.value.length) {
            sendInput(true);
          } else {
            terminalWrite('^D\n', 'terminal-input-echo');
            interactiveSocket.send(JSON.stringify({ type: 'eof' }));
            input.disabled = true;
          }
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
      c: /\b(scanf|getchar|fgets|fscanf|gets)\s*\(/,
      cpp: /\b(cin|getline|getchar|scanf)\b/,
      java: /\b(Scanner|BufferedReader|System\.in|readLine|nextInt|nextLine|nextDouble)\b/,
      python: /\b(input|stdin\.read|stdin\.readline)\s*\(/,
      javascript: /\b(readline|createInterface|question|prompt|readFileSync)\s*\(|\bprocess\.stdin\b/,
      typescript: /\b(readline|createInterface|question|prompt|readFileSync)\s*\(|\bprocess\.stdin\b/,
      csharp: /\b(ReadLine|ReadKey|ReadToEnd)\s*\(/,
      go: /\b(Scan|Scanln|Scanf|ReadString|ReadBytes|ReadAll)\s*\(|\bos\.Stdin\b/,
      rust: /\b(read_line|read_to_string|stdin)\b/,
      php: /\b(fgets|readline|file_get_contents)\s*\(|php:\/\/stdin/,
      ruby: /\b(gets|readline)\b|\bSTDIN\.read\b/,
      ruby_script: /\b(gets|readline)\b|\bSTDIN\.read\b/,
      bash: /\bread\s+/,
      zsh: /\bread\s+/,
      fish: /\bread\s+/,
      powershell: /\b(Read-Host)\b/i,
      pascal: /\b(read|readln)\s*\(/i,
      fortran: /\bread\s*\(/i,
      ada: /\b(Get|Get_Line)\s*\(/,
      basic: /\b(INPUT|LINE INPUT)\b/i,
      kotlin: /\b(readLine|Scanner|System\.in)\b/,
      swift: /\b(readLine|readLine\s*\()/,
      scala: /\b(StdIn\.read|readLine|readInt)\b/,
      haskell: /\b(getLine|getContents|getChar)\b/,
      clojure: /\b(read-line|read-string)\b/,
      lisp: /\b(read-line|read)\b/,
      'common-lisp': /\b(read-line|read)\b/,
      scheme: /\b(read-line|read)\b/,
      racket: /\b(read-line|read)\b/,
      ocaml: /\b(read_line|read_int|input_line)\b/,
      erlang: /\bio:get_line|io:read\b/,
      elixir: /\b(IO\.getn|IO\.gets|IO\.read)\b/,
      perl: /\b(<STDIN>|readline|chomp)\b/,
      lua: /\bio\.read|\bio\.stdin\b/,
      sql: /\b(ACCEPT|PROMPT)\b/i,
      octave: /\b(input|fscanf|scanf)\s*\(/,
      r: /\b(readline|scan|readLines)\s*\(/,
      julia: /\b(readline|read)\s*\(/i,
      dart: /\b(stdin\.readLineSync|stdin\.listen)\b/,
      groovy: /\b(System\.in|readLine|nextLine)\b/,
      fsharp: /\b(Console\.ReadLine|stdin\.ReadLine)\b/,
      crystal: /\b(gets|read_line)\b/,
      objectivec: /\b(scanf|fgets|getchar)\s*\(/,
      vbnet: /\b(Console\.ReadLine)\b/,
      zig: /\b(stdin|readAll|reader)\b/,
      vlang: /\b(os\.input|read_line)\b/,
      cobol: /\b(ACCEPT)\b/i,
      prolog: /\b(read|read_line_to_string)\s*\(/,
      awk: /\b(getline)\b/,
      forth: /\b(ACCEPT|KEY)\b/,
      brainfuck: /[,]/,
      verilog: /\$fscanf|\$readmemh|\$readmemb/,
      vhdl: /\breadline|\bread\s*\(/i,
      nim: /\breadLine|stdin\b/,
      d: /\b(readln|readf|stdin)\b/,
      assembly: /\b(read|scanf|sys_read)\b/i
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
      if (!response.ok || !payload.success) {
        if (response.status >= 500) throw new Error('Execution service unavailable.');
        throw new Error(payload.userMessage || 'Program execution failed.');
      }
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
      if (result.success) { showToast('Program completed successfully.', 'success'); setRunButtonResult(true); }
      else { showToast('Program finished with an error.', 'error'); setRunButtonResult(false); }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const message = err instanceof TypeError ? 'Unable to connect to compiler service.' : (err.message || 'Execution service unavailable.');
        terminalWrite(`\n${message}\n`, 'stderr-chunk');
        showToast(message, 'error');
        setRunButtonResult(false);
      }
    } finally {
      currentAbortCtrl = null;
      terminalFinished = true;
      setLoadingState(false);
      clearTimeoutBar();
    }
  }

  // Batch providers cannot accept keyboard input after a process has started.
  // Never replace the terminal with a separate stdin textarea: input-driven
  // programs must use the live terminal session above.
  function showInteractiveUnavailable(reason = '') {
    const detail = typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : 'Live keyboard input requires the Docker-backed interactive execution gateway.';
    terminalWrite(`\n✗ Interactive execution unavailable\n${detail}\nCheck the gateway URL, shared ticket secret, Docker daemon and polycompile-exec:latest image.\n`, 'stderr-chunk');
    terminalFinished = true;
    setLoadingState(false);
    setRunButtonResult(false);
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

    let sourceCode = sanitizeSourceCode(codeEditor.value);
    if (sourceCode !== codeEditor.value) {
      codeEditor.value = sourceCode;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
    }
    if (!sourceCode.trim()) {
      showToast('Please enter source code first.', 'warning');
      return;
    }

    if (window.innerWidth <= 900) setResponsiveView('output');
    switchTab('consoleTab');
    resetTerminal();
    currentCode = sourceCode;
    inspectPhases({ switchTabToPhases: false, silent: true });
    runBtn.classList.remove('run-success', 'run-failed');
    currentLang = languageSelect.value;
    currentAbortCtrl = new AbortController();
    statExecTime.textContent = '—';
    statCompileTime.textContent = '—';
    statMemory.textContent = '—';
    statExitCode.textContent = '—';
    statEngine.textContent = 'Connecting…';
    setLoadingState(true, 'Connecting…');
    startTimeoutBar(MAX_RUN_TIMEOUT_MS);
    terminalWrite(`[${new Date().toLocaleTimeString()}] Execution started — ${currentLang || 'Auto-detect'}\n`, 'terminal-system');
    const customStdinVal = (customStdin && customStdin.value) ? customStdin.value : '';
    if (customStdinVal.trim().length > 0) {
      terminalWrite(`[Mode B: Predefined input fed to stdin (${customStdinVal.trim().split(/\r?\n/).length} lines)]\n`, 'terminal-system');
    }

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

      let ticketRes;
      let ticketData;
      let ticketNetworkFailure = false;
      try {
        ticketRes = await fetch('/api/interactive-ticket', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
          signal: currentAbortCtrl.signal
        });
        ticketData = await ticketRes.json();
      } catch (ticketError) {
        if (ticketError.name === 'AbortError') throw ticketError;
        ticketNetworkFailure = true;
        ticketRes = { ok: false, status: 0 };
        ticketData = { success: false };
      }
      if (ticketNetworkFailure) {
        terminalWrite('\nUnable to connect to compiler service.\n', 'stderr-chunk');
        terminalFinished = true;
        setLoadingState(false);
        setRunButtonResult(false);
        return;
      }
      if (!ticketRes.ok || !ticketData.success) {
        showInteractiveUnavailable(ticketData.userMessage || ticketData.error || 'The interactive compiler gateway returned an error.');
        setLoadingState(false);
        setRunButtonResult(false);
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
        const customStdinVal = (customStdin && customStdin.value) ? customStdin.value : '';
        interactiveSocket.send(JSON.stringify({
          type: 'start',
          sourceCode: currentCode,
          languageId: currentLang,
          timeoutMs: MAX_RUN_TIMEOUT_MS,
          stdin: customStdinVal
        }));
        setLoadingState(true, 'Compiling…');
      };

      interactiveSocket.onmessage = event => {
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        if (message.type === 'compiling') {
          setLoadingState(true, 'Compiling…');
          terminalWrite(`[Compiling ${message.language || currentLang}...]\n`, 'terminal-system');
        } else if (message.type === 'ready') {
          statEngine.textContent = 'PolyCompile Interactive Sandbox';
          if (message.compileDurationMs != null) statCompileTime.textContent = `${message.compileDurationMs} ms`;
          setLoadingState(true, 'Running…');
          const compiledMsg = message.compileDurationMs != null && message.compileDurationMs > 0
            ? `[✓ Compiled in ${message.compileDurationMs}ms — Running...]\n`
            : `[✓ Ready — Running...]\n`;
          terminalWrite(compiledMsg, 'terminal-success');
          terminalWrite('────────────────────\n', 'terminal-system');
          const inp = ensureTerminalInput();
          inp.placeholder = 'Type input and press Enter…';
          inp.focus();
        } else if (message.type === 'stdout') {
          if (message.phase !== 'compile' && message.data) terminalProgramOutputSeen = true;
          terminalWrite(message.data || '', message.phase === 'compile' ? 'compile-output-chunk' : 'stdout-chunk');
        } else if (message.type === 'stderr') {
          if (message.phase !== 'compile' && message.data) terminalProgramOutputSeen = true;
          if (message.phase === 'compile' && !terminalCompileErrorShown) {
            terminalWrite('\n[Compiler diagnostics]\n', 'terminal-system');
            terminalCompileErrorShown = true;
          }
          terminalWrite(message.data || '', 'stderr-chunk');
        } else if (message.type === 'timeout') {
          if (!terminalTimeoutShown) {
            terminalWrite('\n✗ Time Limit Exceeded\n' + (message.message || 'Program execution exceeded the allowed time.') + '\n', 'stderr-chunk');
            terminalTimeoutShown = true;
          }
          terminalFinished = true;
          if (terminalInput) {
            terminalInput.disabled = true;
            terminalInput.placeholder = 'Execution timed out.';
          }
          setLoadingState(false);
          setRunButtonResult(false);
          clearTimeoutBar();
          closeInteractiveSession(false);
        } else if (message.type === 'service-error') {
          terminalWrite('\nExecution service unavailable.\n', 'stderr-chunk');
          terminalFinished = true;
          closeInteractiveSession(false);
          setLoadingState(false);
          setRunButtonResult(false);
          clearTimeoutBar();
        } else if (message.type === 'error') {
          terminalWrite(`\n${message.message || 'Interactive execution failed.'}\n`, 'stderr-chunk');
          terminalFinished = true;
          setLoadingState(false);
          setRunButtonResult(false);
          closeInteractiveSession(false);
        } else if (message.type === 'exit') {
          terminalFinished = true;
          statExitCode.textContent = String(message.code);
          statExitCode.style.color = message.code === 0 ? 'var(--color-success)' : 'var(--color-error)';
          if (message.durationMs != null) statExecTime.textContent = `${message.durationMs} ms`;
          if (message.compileDurationMs != null) statCompileTime.textContent = `${message.compileDurationMs} ms`;
          if (message.memoryBytes != null) statMemory.textContent = `${(message.memoryBytes / (1024 * 1024)).toFixed(1)} MB`;
          if (message.timedOut && !terminalTimeoutShown) terminalWrite('\n✗ Time Limit Exceeded\n', 'stderr-chunk');
          else if (message.compileFailed) terminalWrite('\n✗ Compilation Failed\n', 'stderr-chunk');
          else if (message.code === 0) {
            terminalWrite('\n[✓ Process finished with exit code 0]\n', 'terminal-success');
            if (!terminalProgramOutputSeen) terminalWrite('Program executed successfully. No output generated.\n', 'terminal-system');
          } else terminalWrite(`\n[✗ Process exited with code ${message.code}]\n`, 'stderr-chunk');
          terminalWrite(`\n[Process exited with code ${message.code}]\n`, 'terminal-system');
          if (terminalInput) terminalInput.disabled = true;
          const send = terminalInputRow?.querySelector('button');
          if (send) send.disabled = true;
          if (message.code === 0) showToast('Program completed successfully.', 'success');
          else showToast(`Program exited with code ${message.code}.`, 'error');
          setLoadingState(false);
          setRunButtonResult(message.code === 0);
          clearTimeoutBar();
        } else if (message.type === 'closed' && !terminalFinished) {
          terminalWrite('\n[Execution container closed unexpectedly]\n', 'stderr-chunk');
          terminalFinished = true;
          setLoadingState(false);
          setRunButtonResult(false);
          clearTimeoutBar();
        }
      };

      interactiveSocket.onerror = () => {
        if (!terminalFinished) terminalWrite('\nUnable to connect to compiler service.\n', 'stderr-chunk');
        terminalFinished = true;
        setLoadingState(false);
        setRunButtonResult(false);
        clearTimeoutBar();
      };
      interactiveSocket.onclose = () => {
        if (isRunning) {
          setLoadingState(false);
          if (!terminalFinished) setRunButtonResult(false);
          clearTimeoutBar();
        }
        if (!terminalFinished) {
          terminalFinished = true;
          if (terminalInput) {
            terminalInput.disabled = true;
            terminalInput.placeholder = 'Session closed.';
          }
        }
        interactiveSocket = null;
      };
    } catch (err) {
      if (err.name !== 'AbortError') {
        const message = err instanceof TypeError ? 'Unable to connect to compiler service.' : 'Execution service unavailable.';
        terminalWrite(`\n${message}\n`, 'stderr-chunk');
        showToast(message, 'error');
        setRunButtonResult(false);
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
  let lastPhaseTokens = [];
  let activeTokenFilter = 'ALL';
  let hasInspectedPhases = false;

  async function inspectPhases(opts = {}) {
    const { switchTabToPhases = true, silent = false } = opts;
    let sourceCode = sanitizeSourceCode(codeEditor.value);
    if (sourceCode !== codeEditor.value) {
      codeEditor.value = sourceCode;
      UI.syncLineNumbers(codeEditor, lineNumbers);
      updateFileInfo();
    }
    const selectedLang = languageSelect.value;
    if (!sourceCode.trim()) {
      if (!silent) showToast('Enter code before inspecting compiler phases.', 'warning');
      return;
    }

    if (window.innerWidth <= 900 && switchTabToPhases) setResponsiveView('output');
    if (!silent && statusText) statusText.textContent = 'Analyzing';
    if (!silent && inspectPhasesBtn) {
      inspectPhasesBtn.disabled = true;
      inspectPhasesBtn.classList.add('is-loading');
      if (inspectPhasesBtn.querySelector('span')) inspectPhasesBtn.querySelector('span').textContent = 'Analyzing…';
    }

    try {
      const res = await fetch('/api/compile-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode, languageId: selectedLang === 'auto' ? null : selectedLang }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (!silent) throw new Error(data.userMessage || data.error || `Analysis failed (${res.status}).`);
        return;
      }
      populateCompilerPhases(data.phases);
      hasInspectedPhases = true;
      if (switchTabToPhases) switchTab('lexicalTab');
      if (!silent) {
        if (statusText) statusText.textContent = 'Analysis complete';
        showToast('Compiler phases inspected successfully.', 'success');
      }
    } catch (error) {
      if (!silent) {
        const message = error.name === 'TimeoutError' ? 'Compiler phase analysis timed out.' : (error.message || 'Unable to inspect compiler phases.');
        showToast(message, 'error');
        if (statusText) statusText.textContent = 'Analysis failed';
      }
    } finally {
      if (!silent && inspectPhasesBtn) {
        inspectPhasesBtn.disabled = false;
        inspectPhasesBtn.classList.remove('is-loading');
        if (inspectPhasesBtn.querySelector('span')) inspectPhasesBtn.querySelector('span').textContent = 'Inspect Phases';
      }
    }
  }

  function setMetric(id, value, suffix = '') {
    const node = document.getElementById(id);
    if (node) node.textContent = `${value ?? 0}${suffix}`;
  }

  function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value == null ? '—' : String(value);
    row.appendChild(cell);
  }

  function renderTableBody(id, rows, columns, emptyMessage) {
    const body = document.getElementById(id);
    if (!body) return;
    body.replaceChildren();
    if (!Array.isArray(rows) || rows.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = columns;
      cell.className = 'empty-cell';
      cell.textContent = emptyMessage;
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    const fragment = document.createDocumentFragment();
    rows.forEach(values => {
      const row = document.createElement('tr');
      values.forEach(value => appendCell(row, value));
      fragment.appendChild(row);
    });
    body.appendChild(fragment);
  }

  function renderTokenTable() {
    const filtered = activeTokenFilter === 'ALL'
      ? lastPhaseTokens
      : lastPhaseTokens.filter(token => token.type === activeTokenFilter || (activeTokenFilter === 'DELIMITER' && ['DELIMITER', 'PUNCTUATION'].includes(token.type)));
    renderTableBody('tokensTableBody', filtered.map((token, index) => [token.id ?? index + 1, token.type, token.value, token.line, token.col, token.length ?? String(token.value || '').length]), 6, 'No tokens match this filter.');
  }

  function renderAstTree(ast) {
    const root = document.getElementById('astVisualTree');
    if (!root) return;
    root.replaceChildren();
    if (!ast) {
      root.textContent = 'No AST was generated.';
      return;
    }
    let rendered = 0;
    const maxNodes = 1500;
    function makeNode(node, depth = 0) {
      if (!node || typeof node !== 'object' || rendered >= maxNodes || depth > 80) return null;
      rendered++;
      const details = document.createElement('details');
      details.className = 'ast-tree-node';
      details.open = depth < 2;
      const summary = document.createElement('summary');
      const type = document.createElement('strong');
      type.textContent = node.type || 'Node';
      summary.appendChild(type);
      const attrs = Object.entries(node).filter(([key, value]) => !['type', 'body', 'members'].includes(key) && (typeof value !== 'object' || value === null));
      if (attrs.length) {
        const meta = document.createElement('span');
        meta.className = 'ast-node-meta';
        meta.textContent = attrs.map(([key, value]) => `${key}: ${String(value)}`).join(' · ').slice(0, 300);
        summary.appendChild(meta);
      }
      details.appendChild(summary);
      const children = [...(Array.isArray(node.body) ? node.body : []), ...(Array.isArray(node.members) ? node.members : [])];
      children.forEach(child => {
        const childNode = makeNode(child, depth + 1);
        if (childNode) details.appendChild(childNode);
      });
      return details;
    }
    const tree = makeNode(ast);
    if (tree) root.appendChild(tree);
    if (rendered >= maxNodes) {
      const note = document.createElement('p');
      note.className = 'empty-state';
      note.textContent = `AST display limited to ${maxNodes.toLocaleString()} nodes for browser performance.`;
      root.appendChild(note);
    }
  }

  function populateCompilerPhases(phases) {
    if (!phases) throw new Error('Compiler analysis returned no phase data.');
    const p1 = phases.phase1_lexical || phases.lexical || {};
    const p2 = phases.phase2_syntax || phases.syntax || {};
    const p3 = phases.phase3_semantic || phases.semantic || {};
    const p4 = phases.phase4_intermediate || phases.intermediate || {};
    const p5 = phases.phase5_optimization || phases.optimization || {};
    const tokens = Array.isArray(p1.tokens) ? p1.tokens : [];
    const lexMetrics = p1.metrics || {};
    const astMetrics = p2.metrics || {};
    const symbols = Array.isArray(p3.symbolTable) ? p3.symbolTable : [];
    const scopes = Array.isArray(p3.scopes) ? p3.scopes : [];
    const warnings = Array.isArray(p3.warnings) ? p3.warnings : [];
    const quads = Array.isArray(p4.quadruples) ? p4.quadruples : [];
    const blocks = Array.isArray(p4.basicBlocks) ? p4.basicBlocks : [];
    const bytecode = Array.isArray(p5.bytecode) ? p5.bytecode : [];

    lastPhaseTokens = tokens;
    renderTokenTable();
    setMetric('lexTotalTokens', p1.totalTokens ?? lexMetrics.totalTokens ?? tokens.length);
    setMetric('lexUniqueTokens', lexMetrics.uniqueTokens ?? new Set(tokens.map(t => t.value)).size);
    setMetric('lexKwDensity', lexMetrics.keywordDensity ?? 0, '%');
    setMetric('lexIdDensity', lexMetrics.identifierDensity ?? 0, '%');

    setMetric('astTotalNodes', astMetrics.totalAstNodes ?? 0);
    setMetric('astTreeDepth', astMetrics.treeDepth ?? 0);
    setMetric('astComplexity', astMetrics.cyclomaticComplexity ?? 1);
    renderAstTree(p2.ast);
    const jsonViewer = document.getElementById('astJsonViewer');
    if (jsonViewer) jsonViewer.textContent = JSON.stringify(p2.ast || {}, null, 2);

    setMetric('semTotalSymbols', symbols.length);
    setMetric('semTotalScopes', scopes.length);
    setMetric('semTotalWarnings', warnings.length);
    renderTableBody('symbolTableBody', symbols.map(symbol => [symbol.name, symbol.kind, symbol.type, symbol.scope, symbol.definedLine, Array.isArray(symbol.usages) ? symbol.usages.length : 0]), 6, 'No symbols were identified.');

    const tac = Array.isArray(p4.tac) ? p4.tac : [];
    const tacNode = document.getElementById('tacCodeBlock');
    if (tacNode) tacNode.textContent = tac.join('\n') || '// No intermediate representation generated.';
    renderTableBody('quadsTableBody', quads.map(q => [q.id, q.op, q.arg1, q.arg2, q.result]), 5, 'No quadruples generated.');
    const cfgNode = document.getElementById('cfgBlocksContainer');
    if (cfgNode) {
      cfgNode.replaceChildren();
      if (!blocks.length) cfgNode.textContent = 'No basic blocks generated.';
      blocks.forEach(block => {
        const card = document.createElement('section');
        card.className = 'cfg-block-card';
        const heading = document.createElement('h4');
        heading.textContent = block.label || `Block B${block.id}`;
        const pre = document.createElement('pre');
        pre.className = 'cfg-block-code';
        pre.textContent = Array.isArray(block.instructions) ? block.instructions.join('\n') : '';
        card.append(heading, pre);
        cfgNode.appendChild(card);
      });
    }

    const asmNode = document.getElementById('asmCodeBlock');
    if (asmNode) asmNode.textContent = p5.assemblyCode || '; No target representation generated.';
    renderTableBody('bytecodeTableBody', bytecode.map(item => [item.opcode, item.arg, item.comment]), 3, 'No bytecode emitted.');
    const optList = document.getElementById('optPassList');
    if (optList) {
      optList.replaceChildren();
      const passes = Array.isArray(p5.optimizationsApplied) ? p5.optimizationsApplied : [];
      (passes.length ? passes : ['No optimization passes reported.']).forEach(pass => {
        const li = document.createElement('li');
        li.textContent = pass;
        optList.appendChild(li);
      });
    }

    // The compiler-analysis pipeline is an educational, language-aware model;
    // it is not the native compiler's AST or machine code for every language.
    const phaseErrors = [...(p1.errors || []), ...(p2.errors || []), ...(p3.errors || [])];
    const diagnosticsNode = document.getElementById('diagnosticsContainer');
    const allDiagnostics = [...phaseErrors, ...warnings].slice(0, 250);
    const diagBadge = document.getElementById('diagCountBadge');
    if (diagBadge) {
      diagBadge.textContent = String(allDiagnostics.length);
      diagBadge.style.display = allDiagnostics.length ? 'inline-flex' : 'none';
    }
    if (diagnosticsNode) {
      diagnosticsNode.replaceChildren();
      if (!allDiagnostics.length) diagnosticsNode.textContent = 'No analysis diagnostics reported.';
      allDiagnostics.forEach(item => {
        const row = document.createElement('div');
        row.className = 'diagnostic-item';
        row.textContent = `${item.line ? `Line ${item.line}${item.col ? `, Col ${item.col}` : ''}: ` : ''}${item.message || 'Diagnostic'}`;
        diagnosticsNode.appendChild(row);
      });
    }
  }

  document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => {
    activeTokenFilter = button.dataset.filter || 'ALL';
    document.querySelectorAll('.filter-chip').forEach(item => item.classList.toggle('active', item === button));
    renderTokenTable();
  }));
  document.getElementById('expandAstBtn')?.addEventListener('click', () => document.querySelectorAll('#astVisualTree details').forEach(node => { node.open = true; }));
  document.getElementById('collapseAstBtn')?.addEventListener('click', () => document.querySelectorAll('#astVisualTree details').forEach(node => { node.open = false; }));
  document.getElementById('toggleRawJsonBtn')?.addEventListener('click', () => {
    const viewer = document.getElementById('astJsonViewer');
    if (viewer) viewer.style.display = viewer.style.display === 'none' ? 'block' : 'none';
  });

  function setLoadingState(loading, label = 'Compiling…') {
    isRunning = loading;
    if (loading) {
      runBtn.disabled = true;
      runBtnIcon.className = 'fa-solid fa-spinner fa-spin';
      runBtnText.textContent = label;
    } else {
      runBtn.disabled = false;
      if (!runBtn.classList.contains('run-success') && !runBtn.classList.contains('run-failed')) {
        runBtnIcon.className = 'fa-solid fa-play';
        runBtnText.innerHTML = 'Run &amp; Compile';
      }
      clearTimeoutBar();
    }
  }

  function setRunButtonResult(success) {
    runBtn.classList.remove('run-success', 'run-failed');
    runBtn.classList.add(success ? 'run-success' : 'run-failed');
    runBtn.disabled = false;
    runBtnIcon.className = success ? 'fa-solid fa-check' : 'fa-solid fa-circle-exclamation';
    runBtnText.textContent = success ? 'Success' : 'Failed';
  }

  tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  function switchTab(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanes.forEach(p => p.classList.toggle('active', p.id === tabId));
    if (tabId !== 'consoleTab' && !hasInspectedPhases) {
      inspectPhases({ switchTabToPhases: false, silent: true });
    }
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
    if (xtermInstance) {
      xtermInstance.clear();
      return;
    }
    // Clear only the visible transcript. Never kill a running process just
    // because the user wants a clean terminal view. Preserve unsent input.
    const pendingLine = terminalInput?.value || '';
    consoleOutput.innerHTML = '';
    terminalText = document.createElement('pre');
    terminalText.className = 'interactive-terminal-text';
    consoleOutput.appendChild(terminalText);
    terminalInput = null;
    terminalInputRow = null;
    if (interactiveSocket?.readyState === WebSocket.OPEN && !terminalFinished) {
      const input = ensureTerminalInput();
      input.value = pendingLine;
      input.focus();
    }
  }

  clearConsoleBtn.addEventListener('click', clearConsole);

  if (toggleCustomStdinBtn && customStdinPanel) {
    toggleCustomStdinBtn.addEventListener('click', () => {
      const isHidden = customStdinPanel.style.display === 'none';
      customStdinPanel.style.display = isHidden ? 'flex' : 'none';
      toggleCustomStdinBtn.classList.toggle('active', isHidden);
      if (isHidden && customStdin) {
        customStdin.focus();
      }
    });
  }
  if (closeCustomStdinBtn && customStdinPanel) {
    closeCustomStdinBtn.addEventListener('click', () => {
      customStdinPanel.style.display = 'none';
      if (toggleCustomStdinBtn) toggleCustomStdinBtn.classList.remove('active');
    });
  }
  if (clearCustomStdinBtn && customStdin) {
    clearCustomStdinBtn.addEventListener('click', () => {
      customStdin.value = '';
      customStdin.focus();
    });
  }

  if (copyOutputBtn) copyOutputBtn.addEventListener('click', async () => {
    const text = terminalText?.textContent || consoleOutput.innerText || '';
    try {
      await navigator.clipboard.writeText(text);
      showToast('Output copied to clipboard.', 'success');
    } catch (_) {
      showToast('Unable to copy output. Check clipboard permissions.', 'error');
    }
  });

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

  languageSelect.addEventListener('change', () => {
    updateFileInfo();
    inspectPhases({ switchTabToPhases: false, silent: true });
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

  runBtn.addEventListener('click', runCode);
  if (inspectPhasesBtn) inspectPhasesBtn.addEventListener('click', () => inspectPhases({ switchTabToPhases: true, silent: false }));

  UI.syncLineNumbers(codeEditor, lineNumbers);
  updateFileInfo();
  initializeData();
});