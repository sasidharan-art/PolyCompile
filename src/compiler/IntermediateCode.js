/**
 * PolyCompile - Intermediate Code Generator (Phase 4 of Compiler Design)
 * 
 * Generates machine-independent Three-Address Code (TAC),
 * structured Quadruples, and constructs a Control Flow Graph (CFG) of basic blocks.
 */

class IntermediateCodeGenerator {
  /**
   * Generates TAC, Quadruples, and CFG from an AST
   * @param {Object} ast 
   * @param {Object} language 
   * @returns {Object} { tac, quadruples, basicBlocks, cfg }
   */
  static generate(ast, language = {}) {
    const tac = [];
    const quadruples = [];
    let tempCounter = 0;
    let labelCounter = 0;

    function newTemp() {
      return `t${tempCounter++}`;
    }

    function newLabel(prefix = 'L') {
      return `${prefix}${labelCounter++}`;
    }

    function emit(op, arg1 = null, arg2 = null, result = null, formatted = '') {
      quadruples.push({ id: quadruples.length, op, arg1, arg2, result });
      tac.push(formatted || (arg2 !== null ? `${result} = ${arg1} ${op} ${arg2}` : arg1 !== null ? `${result} = ${op} ${arg1}` : `${op} ${result || ''}`.trim()));
    }

    // Traverse AST nodes and emit IR
    function translate(node) {
      if (!node) return;

      switch (node.type) {
        case 'PreprocessorDirective':
        case 'ModuleOrImportDeclaration':
          emit('IMPORT', node.target || node.directive, null, null, `// IR Directive: ${node.target || node.directive}`);
          break;

        case 'FunctionDeclaration': {
          const fnLabel = `FUNC_${node.name}`;
          emit('LABEL', null, null, fnLabel, `${fnLabel}:`);
          emit('ENTER_SCOPE', node.name, null, null, `  ENTER_FRAME ${node.name} (params: ${node.params?.join(', ') || 'none'})`);

          if (Array.isArray(node.body)) {
            for (const stmt of node.body) translate(stmt);
          }

          emit('LEAVE_SCOPE', node.name, null, null, `  LEAVE_FRAME ${node.name}`);
          emit('RETURN', null, null, null, `  RETURN_VOID`);
          break;
        }

        case 'VariableDeclaration': {
          if (node.init) {
            const temp = newTemp();
            emit('ASSIGN', node.init, null, temp, `  ${temp} = ${node.init}`);
            emit('STORE', temp, null, node.name, `  ${node.name} = ${temp}`);
          } else {
            emit('ALLOC', node.varType, null, node.name, `  ALLOC ${node.name} (${node.varType})`);
          }
          break;
        }

        case 'IfStatement': {
          const lTrue = newLabel('L_THEN_');
          const lFalse = newLabel('L_ELSE_');
          const lEnd = newLabel('L_END_');

          const condTemp = newTemp();
          emit('EVAL_COND', node.condition, null, condTemp, `  ${condTemp} = EVAL(${node.condition || 'true'})`);
          emit('IF_GOTO', condTemp, null, lTrue, `  IF ${condTemp} GOTO ${lTrue}`);
          emit('GOTO', null, null, lFalse, `  GOTO ${lFalse}`);

          emit('LABEL', null, null, lTrue, `${lTrue}:`);
          emit('NOP', null, null, null, `  // Then branch execution`);

          emit('LABEL', null, null, lFalse, `${lFalse}:`);
          emit('NOP', null, null, null, `  // Else branch continuation`);

          emit('LABEL', null, null, lEnd, `${lEnd}:`);
          break;
        }

        case 'LoopStatement': {
          const lStart = newLabel('L_LOOP_START_');
          const lBody = newLabel('L_LOOP_BODY_');
          const lExit = newLabel('L_LOOP_EXIT_');

          emit('LABEL', null, null, lStart, `${lStart}:`);
          const condTemp = newTemp();
          emit('EVAL_COND', node.condition, null, condTemp, `  ${condTemp} = EVAL(${node.condition || 'true'})`);
          emit('IF_FALSE_GOTO', condTemp, null, lExit, `  IF_FALSE ${condTemp} GOTO ${lExit}`);

          emit('LABEL', null, null, lBody, `${lBody}:`);
          emit('NOP', null, null, null, `  // Loop body execution`);
          emit('GOTO', null, null, lStart, `  GOTO ${lStart}`);

          emit('LABEL', null, null, lExit, `${lExit}:`);
          break;
        }

        case 'ReturnStatement': {
          if (node.value) {
            const retTemp = newTemp();
            emit('ASSIGN', node.value, null, retTemp, `  ${retTemp} = ${node.value}`);
            emit('RETURN_VAL', retTemp, null, null, `  RETURN ${retTemp}`);
          } else {
            emit('RETURN_VOID', null, null, null, `  RETURN`);
          }
          break;
        }

        case 'ExpressionStatement': {
          emit('EXPR', node.expression, null, null, `  EVAL_STMT: ${node.expression}`);
          break;
        }

        default:
          if (Array.isArray(node.body)) {
            for (const child of node.body) translate(child);
          }
          break;
      }
    }

    if (ast && Array.isArray(ast.body)) {
      for (const node of ast.body) {
        translate(node);
      }
    }

    if (tac.length === 0) {
      tac.push('// No intermediate code generated (empty translation unit)');
    }

    // 2. Partition into Basic Blocks for CFG
    const basicBlocks = this.constructBasicBlocks(tac);
    const cfg = this.buildControlFlowGraph(basicBlocks);

    return {
      tac,
      quadruples,
      basicBlocks,
      cfg
    };
  }

  /**
   * Partitions TAC into Basic Blocks based on branch leaders
   */
  static constructBasicBlocks(tac) {
    if (tac.length === 0) return [];

    const blocks = [];
    let currentBlock = { id: 0, label: 'Entry Block (B0)', instructions: [] };

    for (let i = 0; i < tac.length; i++) {
      const line = tac[i];
      const isLeader = line.endsWith(':') || line.includes('GOTO') || i === 0;

      if (isLeader && currentBlock.instructions.length > 0) {
        blocks.push(currentBlock);
        currentBlock = {
          id: blocks.length,
          label: `Block B${blocks.length}`,
          instructions: []
        };
      }

      currentBlock.instructions.push(line);

      if (line.includes('GOTO') || line.includes('RETURN')) {
        blocks.push(currentBlock);
        currentBlock = {
          id: blocks.length,
          label: `Block B${blocks.length}`,
          instructions: []
        };
      }
    }

    if (currentBlock.instructions.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Constructs the Control Flow Graph edges between Basic Blocks
   */
  static buildControlFlowGraph(basicBlocks) {
    const nodes = basicBlocks.map((b) => ({ id: b.id, label: b.label, count: b.instructions.length }));
    const edges = [];

    for (let i = 0; i < basicBlocks.length; i++) {
      const block = basicBlocks[i];
      const lastInstr = block.instructions[block.instructions.length - 1] || '';

      if (lastInstr.includes('GOTO')) {
        const match = lastInstr.match(/GOTO\s+([a-zA-Z0-9_]+)/);
        if (match) {
          const targetLabel = match[1];
          const targetBlock = basicBlocks.find((b) => b.instructions.some((ins) => ins.startsWith(targetLabel)));
          if (targetBlock) {
            edges.push({ from: block.id, to: targetBlock.id, type: 'jump' });
          }
        }
      }

      // Fallthrough edge
      if (i + 1 < basicBlocks.length && !lastInstr.startsWith('  GOTO') && !lastInstr.includes('RETURN')) {
        edges.push({ from: block.id, to: basicBlocks[i + 1].id, type: 'fallthrough' });
      }
    }

    return { nodes, edges };
  }
}

module.exports = IntermediateCodeGenerator;
