/**
 * PolyCompile — Interactive Programiz-style Terminal Controller
 */

document.addEventListener('DOMContentLoaded', () => {

  const codeEditor          = document.getElementById('codeEditor');
  const lineNumbers         = document.getElementById('lineNumbers');
  const languageSelect      = document.getElementById('languageSelect');
  const snippetSelect       = document.getElementById('snippetSelect');
  const runBtn              = document.getElementById('runBtn');
  const runBtnText          = document.getElementById('runBtnText');
  const runBtnIcon          = document.getElementById('runBtnIcon');
  const consoleOutput       = document.getElementById('consoleOutput');
  const toastContainer      = document.getElementById('toastContainer');
  const statExecTime        = document.getElementById('statExecTime');
  const statExitCode        = document.getElementById('statExitCode');
  const statEngine          = document.getElementById('statEngine');

  let allLanguages       = [];
  let allSnippets        = [];
  let isRunning          = false;
  let interactiveSocket  = null;

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  async function initializeData() {
    try {
      const [langRes, snipRes] = await Promise.all([
        fetch('/api/languages').then(r => r.json()).catch(() => null),
        fetch('/api/snippets').then(r => r.json()).catch(() => null)
      ]);

      if (langRes && langRes.success) {
        allLanguages = langRes.languages;
        for (const l of allLanguages) {
          const opt = document.createElement('option');
          opt.value = l.id;
          opt.textContent = l.name;
          languageSelect.appendChild(opt);
        }
      }

      if (snipRes && snipRes.success) {
        allSnippets = snipRes.snippets;
        for (const s of allSnippets) {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.title;
          snippetSelect.appendChild(opt);
        }
      }
    } catch {}
  }

  snippetSelect.addEventListener('change', () => {
    const snip = allSnippets.find(s => s.id === snippetSelect.value);
    if (snip) {
      codeEditor.value = snip.code;
      UI.syncLineNumbers(codeEditor, lineNumbers);
    }
  });

  codeEditor.addEventListener('input', () => UI.syncLineNumbers(codeEditor, lineNumbers));

  /* =========================================================
     PROGRAMIZ TERMINAL CORE
  ========================================================= */
  let terminalScreen = null;
  let terminalText = null;
  let inlineInput = null;

  function initProgramizTerminal() {
    consoleOutput.innerHTML = '';

    terminalScreen = document.createElement('div');
    terminalScreen.style.cssText = 'font-family: Consolas, "Courier New", monospace; white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #c9d1d9;';
    consoleOutput.appendChild(terminalScreen);

    terminalText = document.createElement('span');
    terminalScreen.appendChild(terminalText);

    inlineInput = document.createElement('input');
    inlineInput.type = 'text';
    inlineInput.autocomplete = 'off';
    inlineInput.spellcheck = false;
    inlineInput.style.cssText = 'background:transparent; border:none; outline:none; color:#c9d1d9; font-family:inherit; font-size:inherit; padding:0; margin:0 0 0 6px; width:2ch; caret-color:#58a6ff;';

    inlineInput.addEventListener('input', () => {
      inlineInput.style.width = Math.max(2, inlineInput.value.length + 1) + 'ch';
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    });

    inlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = inlineInput.value;

        // Print input directly to the terminal stream
        const echo = document.createElement('span');
        echo.textContent = val + '\n';
        terminalText.appendChild(echo);

        inlineInput.value = '';
        inlineInput.style.width = '2ch';

        // Stream input to process stdin
        if (interactiveSocket && interactiveSocket.readyState === WebSocket.OPEN) {
          interactiveSocket.send(JSON.stringify({ type: 'input', data: val }));
        }

        consoleOutput.scrollTop = consoleOutput.scrollHeight;
      }
    });

    consoleOutput.addEventListener('click', () => inlineInput.focus());
  }

  function appendStream(text, color = '#c9d1d9') {
    const span = document.createElement('span');
    span.style.color = color;
    span.textContent = text;
    terminalText.appendChild(span);

    // Keep active typing cursor right after output
    terminalScreen.appendChild(inlineInput);
    inlineInput.focus();
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function runCode() {
    if (isRunning) {
      if (interactiveSocket) interactiveSocket.close();
      setRunningState(false);
      return;
    }

    const sourceCode = codeEditor.value;
    if (!sourceCode.trim()) {
      showToast('Please enter code first.', 'warning');
      return;
    }

    initProgramizTerminal();
    setRunningState(true);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/session`;

    interactiveSocket = new WebSocket(wsUrl);

    let languageId = languageSelect.value;
    if (!languageId || languageId === 'auto') {
      if (sourceCode.includes('#include')) languageId = 'c';
      else if (sourceCode.includes('public class')) languageId = 'java';
      else languageId = 'python';
    }

    interactiveSocket.onopen = () => {
      interactiveSocket.send(JSON.stringify({
        type: 'start',
        sourceCode,
        languageId,
        timeoutMs: 60000
      }));
    };

    interactiveSocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'stdout') {
        appendStream(msg.data, '#c9d1d9');
      } else if (msg.type === 'stderr') {
        appendStream(msg.data, '#f85149');
      } else if (msg.type === 'error') {
        appendStream(`\nError: ${msg.message}\n`, '#f85149');
        setRunningState(false);
      } else if (msg.type === 'exit') {
        inlineInput.remove();
        statExitCode.textContent = String(msg.code);
        if (msg.durationMs) statExecTime.textContent = `${msg.durationMs} ms`;
        statEngine.textContent = 'Interactive Process';
        setRunningState(false);
      }
    };

    interactiveSocket.onerror = () => {
      appendStream('\nConnection error to execution server.\n', '#f85149');
      setRunningState(false);
    };

    interactiveSocket.onclose = () => {
      setRunningState(false);
    };
  }

  function setRunningState(loading) {
    isRunning = loading;
    runBtn.disabled = loading;
    runBtnIcon.className = loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play';
    runBtnText.textContent = loading ? 'Running…' : 'Run & Compile';
  }

  runBtn.addEventListener('click', runCode);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCode();
    }
  });

  UI.syncLineNumbers(codeEditor, lineNumbers);
  initializeData();
});