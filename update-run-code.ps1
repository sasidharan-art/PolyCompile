
$ErrorActionPreference = 'Stop'

$path = 'public/js/app.js'
$content = [System.IO.File]::ReadAllText($path)

$start = $content.IndexOf('  async function runCode() {')
$end = $content.IndexOf('  function handleExecutionError(data) {', $start)

if ($start -lt 0 -or $end -lt 0) {
    throw 'Function boundaries not found. No changes made.'
}

$backup = $path + '.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
Copy-Item $path $backup

$replacement = @'
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

'@

$updated = $content.Substring(0, $start) + $replacement + $content.Substring($end)

[System.IO.File]::WriteAllText(
    $path,
    $updated,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Output 'SUCCESS: runCode() updated to use /api/execute'
Write-Output "Backup created: $backup"
