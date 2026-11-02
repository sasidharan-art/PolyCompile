/**
 * PolyCompile - UI Component Utilities v2
 * Improved diagnostics, taxonomy, and helper functions.
 */

const UI = {

  /**
   * Synchronizes line numbers column with textarea content
   */
  syncLineNumbers(textarea, lineNumbersEl) {
    const lines = textarea.value.split('\n');
    const count = lines.length;
    let numbers = '';
    for (let i = 1; i <= count; i++) {
      numbers += i + '\n';
    }
    lineNumbersEl.textContent = numbers;
    lineNumbersEl.scrollTop = textarea.scrollTop;
  },

  /**
   * Renders diagnostic cards with severity coloring, code frames, and fix tips
   */
  renderDiagnostics(diagnostics, container, countBadge) {
    if (!container) return;
    container.innerHTML = '';
    const total = Array.isArray(diagnostics) ? diagnostics.length : 0;

    if (countBadge) {
      countBadge.textContent = total;
      countBadge.style.display = total > 0 ? 'inline-flex' : 'none';
    }

    if (total === 0) {
      container.innerHTML = `
        <div class="empty-state-success">
          <i class="fa-solid fa-circle-check"></i>
          <p>No compilation errors or warnings!</p>
        </div>`;
      return;
    }

    // Sort by severity: error > warning > info
    const sorted = [...diagnostics].sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });

    for (const diag of sorted) {
      const card = document.createElement('div');
      const severity = diag.severity || 'info';
      card.className = `diagnostic-card ${severity}`;

      // Severity icon
      const icons = { error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
      const icon  = icons[severity] || icons.info;

      // Code frame HTML
      let frameHtml = '';
      if (diag.codeFrame) {
        const prev   = diag.codeFrame.prev;
        const target = diag.codeFrame.target;
        const next   = diag.codeFrame.next;
        const ptr    = diag.codeFrame.pointer || '';

        frameHtml = `<div class="code-frame-box">
          ${prev   ? `<div class="code-frame-line">${String(prev.line).padStart(3)} | ${this.escapeHtml(prev.text)}</div>` : ''}
          ${target ? `<div class="code-frame-line target">${String(target.line).padStart(3)} | ${this.escapeHtml(target.text)}</div>` : ''}
          ${ptr    ? `<div class="code-frame-pointer">    | ${this.escapeHtml(ptr)}</div>` : ''}
          ${next   ? `<div class="code-frame-line">${String(next.line).padStart(3)} | ${this.escapeHtml(next.text)}</div>` : ''}
        </div>`;
      }

      // Recommendation
      const recHtml = diag.recommendation
        ? `<div class="diag-recommendation"><i class="fa-solid fa-lightbulb"></i> <strong>Fix tip:</strong> ${this.escapeHtml(diag.recommendation)}</div>`
        : '';

      card.innerHTML = `
        <div class="diag-header">
          <i class="fa-solid ${icon}" style="font-size:0.8rem"></i>
          <span class="diag-phase">${this.escapeHtml(diag.phase || severity.toUpperCase())}</span>
          ${diag.line ? `<span class="diag-location">Line ${diag.line}${diag.col ? `:${diag.col}` : ''}</span>` : ''}
        </div>
        <div class="diag-message">${this.escapeHtml(diag.message || 'Unknown diagnostic')}</div>
        ${frameHtml}
        ${recHtml}`;

      container.appendChild(card);
    }
  },

  /**
   * Updates the Language Taxonomy tab with language metadata
   */
  renderTaxonomy(language, paradigmDesc) {
    if (!language) return;

    const el = (id) => document.getElementById(id);
    if (!el('taxoLangTitle')) return;

    el('taxoLangTitle').textContent   = `${language.name || '?'} — Architecture & Design`;
    el('taxoParadigmTag').textContent = language.paradigm || 'General';
    el('taxoCategoryTag').textContent = language.category || 'Language';
    el('taxoDescription').textContent = language.description || `${language.name} is a ${language.paradigm || 'general-purpose'} programming language.`;
    el('taxoParadigmDesc').textContent = paradigmDesc || (language.paradigm || 'General computational model.');

    // Type system guess
    let typeSystem = 'Dynamically typed';
    if (language.features?.hasPointers) {
      typeSystem = 'Manual memory management, pointers, statically typed';
    } else if (language.features?.strictOOP) {
      typeSystem = 'Class-based OOP, statically typed, JVM garbage collected';
    } else if (language.id && ['haskell','ocaml','rust','scala','kotlin','typescript','go','d','ada','pascal'].includes(language.id)) {
      typeSystem = 'Statically typed with strong type inference';
    } else if (language.id && ['python','ruby','javascript','lua','php','perl','r'].includes(language.id)) {
      typeSystem = 'Dynamically typed, garbage collected';
    }
    el('taxoTypeSystem').textContent = typeSystem;

    // Toolchain
    const ext = language.extension || (Array.isArray(language.extensions) ? language.extensions[0] : '?');
    el('taxoToolchain').textContent = `${language.pistonName || language.id || language.name} — ${language.compiled ? 'Compiled' : 'Interpreted'} language`;
    el('taxoExtension').textContent = `Primary extension: ${ext}`;
  },

  /**
   * HTML entity escape to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }
};
