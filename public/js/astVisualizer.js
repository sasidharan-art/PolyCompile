/**
 * PolyCompile - AST Visualizer Component
 * 
 * Renders Abstract Syntax Trees as collapsible interactive tree hierarchies
 */

class AstVisualizer {
  /**
   * Renders the AST into the target container element
   * @param {Object} ast 
   * @param {HTMLElement} container 
   */
  static render(ast, container) {
    container.innerHTML = '';
    if (!ast || !ast.body) {
      container.innerHTML = '<div class="empty-state">No AST data available.</div>';
      return;
    }

    const rootEl = document.createElement('div');
    rootEl.className = 'ast-root';
    rootEl.appendChild(this.buildNodeElement(ast, 'Program Root', true));
    container.appendChild(rootEl);
  }

  static buildNodeElement(node, label = '', isRoot = false) {
    const el = document.createElement('div');
    el.className = 'ast-node';

    const header = document.createElement('div');
    header.className = 'ast-node-header';

    const icon = document.createElement('i');
    icon.className = this.getIconForNodeType(node.type);
    header.appendChild(icon);

    const typeSpan = document.createElement('span');
    typeSpan.className = 'ast-node-type';
    typeSpan.textContent = node.type || 'Node';
    header.appendChild(typeSpan);

    if (node.name) {
      const valSpan = document.createElement('span');
      valSpan.className = 'ast-node-val';
      valSpan.textContent = `"${node.name}"`;
      header.appendChild(valSpan);
    } else if (node.kind) {
      const valSpan = document.createElement('span');
      valSpan.className = 'ast-node-val';
      valSpan.textContent = `[${node.kind}]`;
      header.appendChild(valSpan);
    } else if (node.condition) {
      const valSpan = document.createElement('span');
      valSpan.className = 'ast-node-val';
      valSpan.textContent = `(${node.condition})`;
      header.appendChild(valSpan);
    } else if (node.expression) {
      const valSpan = document.createElement('span');
      valSpan.className = 'ast-node-val';
      valSpan.textContent = `expr: "${node.expression}"`;
      header.appendChild(valSpan);
    }

    el.appendChild(header);

    // Children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'ast-children';

    let hasChildren = false;

    if (Array.isArray(node.body) && node.body.length > 0) {
      hasChildren = true;
      for (const child of node.body) {
        childrenContainer.appendChild(this.buildNodeElement(child));
      }
    }

    if (Array.isArray(node.members) && node.members.length > 0) {
      hasChildren = true;
      for (const member of node.members) {
        childrenContainer.appendChild(this.buildNodeElement(member));
      }
    }

    if (Array.isArray(node.params) && node.params.length > 0) {
      hasChildren = true;
      const paramsNode = document.createElement('div');
      paramsNode.className = 'ast-node';
      paramsNode.innerHTML = `<div class="ast-node-header"><i class="fa-solid fa-list"></i> <span class="ast-node-type">Parameters:</span> <span class="ast-node-val">${node.params.join(', ')}</span></div>`;
      childrenContainer.appendChild(paramsNode);
    }

    if (hasChildren) {
      el.appendChild(childrenContainer);
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isCollapsed ? 'block' : 'none';
        header.classList.toggle('collapsed', !isCollapsed);
      });
    }

    return el;
  }

  static getIconForNodeType(type) {
    switch (type) {
      case 'Program': return 'fa-solid fa-file-code';
      case 'FunctionDeclaration': return 'fa-solid fa-cube';
      case 'ClassDeclaration': return 'fa-solid fa-cubes';
      case 'VariableDeclaration': return 'fa-solid fa-tag';
      case 'IfStatement': return 'fa-solid fa-code-branch';
      case 'LoopStatement': return 'fa-solid fa-rotate';
      case 'ReturnStatement': return 'fa-solid fa-arrow-turn-left';
      case 'ExpressionStatement': return 'fa-solid fa-terminal';
      case 'ModuleOrImportDeclaration': return 'fa-solid fa-box-archive';
      default: return 'fa-regular fa-circle-dot';
    }
  }

  static expandAll(container) {
    const children = container.querySelectorAll('.ast-children');
    children.forEach(c => c.style.display = 'block');
  }

  static collapseAll(container) {
    const children = container.querySelectorAll('.ast-children');
    children.forEach(c => c.style.display = 'none');
  }
}
