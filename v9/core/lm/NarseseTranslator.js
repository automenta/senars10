import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * NarseseTranslator - Bidirectional conversion between Narsese and JavaScript
 *
 * A comprehensive converter that provides both simple conversion functions and
 * full-featured bidirectional Narsese/JavaScript conversion capabilities.
 */
class NarseseTranslator extends Component {
  constructor() {
    super();

    this.config = {
      enableValidation: DEFAULTS.NARSESE_VALIDATION ?? true,
      maxTermDepth: DEFAULTS.NARSESE_MAX_DEPTH ?? 10,
      enableMacros: DEFAULTS.NARSESE_MACROS ?? true
    };

    this.stats = {
      narseseToJs: 0,
      jsToNarsese: 0,
      validationErrors: 0,
      conversionsAttempted: 0
    };

    this.macros = new Map();
    this._initMacros();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.config = { ...this.config, ...config };
    this.stats = { narseseToJs: 0, jsToNarsese: 0, validationErrors: 0, conversionsAttempted: 0 };
  }

  _initMacros() {
    // Regex for a term, which can be a single word or a quoted string
    const termRegex = /(".*?"|\S+)/;
    const patterns = {
        inheritance: { pattern: new RegExp(`<${termRegex.source}\\s*-->\\s*${termRegex.source}>`), op: '-->', type: 'inheritance' },
        implication: { pattern: new RegExp(`<${termRegex.source}\\s*=\\/>\\s*${termRegex.source}>`), op: '=/>', type: 'implication' },
        equivalence: { pattern: new RegExp(`<${termRegex.source}\\s*<=>\\s*${termRegex.source}>`), op: '<=>', type: 'equivalence' },
        product: { pattern: /\\(([^)]+)\\*([^)]+)\\)/, op: '*', type: 'product' },
        extIntersection: { pattern: /\\(([^)]+)\\|([^)]+)\\)/, op: '|', type: 'extensional_intersection' },
        intIntersection: { pattern: /\\(([^)]+)&([^)]+)\\)/, op: '&', type: 'intensional_intersection' }
    };

    Object.entries(patterns).forEach(([name, meta]) =>
      this.macros.set(name, {
        pattern: meta.pattern,
        toJs: (m) => this._createObj(meta.type, m, meta.op),
        toNarsese: (obj) => this._formatObj(obj, meta.op)
      })
    );
  }

  _createObj(type, matches, op) {
    const [, a, b] = matches;
    const trimA = a?.trim();
    const trimB = b?.trim();

    const objBuilders = {
      'inheritance': () => ({ type, subject: trimA, predicate: trimB, operator: op }),
      'implication': () => ({ type, antecedent: trimA, consequent: trimB, operator: op }),
      'equivalence': () => ({ type, term1: trimA, term2: trimB, operator: op }),
      'product': () => ({ type, elements: [trimA, trimB], operator: op }),
      'extensional_intersection': () => ({ type, elements: [trimA, trimB], operator: op }),
      'intensional_intersection': () => ({ type, elements: [trimA, trimB], operator: op })
    };

    return objBuilders[type] ? objBuilders[type]() : { type, a: trimA, b: trimB, operator: op };
  }

  _formatObj(obj, op) {
    const formatters = {
      'inheritance': () => `<${obj.subject} ${op} ${obj.predicate}>`,
      'implication': () => `<${obj.antecedent} ${op} ${obj.consequent}>`,
      'equivalence': () => `<${obj.term1} ${op} ${obj.term2}>`,
      'product': () => `(${obj.elements?.join(` ${op} `)})`,
      'extensional_intersection': () => `(${obj.elements?.join(` ${op} `)})`,
      'intensional_intersection': () => `(${obj.elements?.join(` ${op} `)})`
    };

    return formatters[obj.type] ? formatters[obj.type]() :
           obj.term ? (obj.punctuation ? `${obj.term}${obj.punctuation}` : obj.term) :
           JSON.stringify(obj);
  }

  narseseToJs(narsese) {
    this.stats.conversionsAttempted++;
    if (!narsese || typeof narsese !== 'string') {
      this.stats.validationErrors++;
      throw new Error('Input must be a valid Narsese string');
    }

    narsese = narsese.trim();

    if (this._isComplex(narsese)) return this._parseComplex(narsese);

    for (const [name, macro] of this.macros) {
      const matches = macro.pattern.exec(narsese);
      if (matches) {
        const result = macro.toJs(matches);
        this.stats.narseseToJs++;
        return result;
      }
    }

    const result = {
      type: 'simple_term',
      value: narsese,
      punctuation: this._extractPunct(narsese),
      term: this._removePunct(narsese)
    };
    this.stats.narseseToJs++;
    return result;
  }

  jsToNarsese(jsObj) {
    this.stats.conversionsAttempted++;
    if (!jsObj || typeof jsObj !== 'object') {
      this.stats.validationErrors++;
      throw new Error('Input must be a valid JavaScript object');
    }

    const formatters = {
      inheritance: (o) => `<${o.subject} --> ${o.predicate}>`,
      implication: (o) => `<${o.antecedent} =/> ${o.consequent}>`,
      equivalence: (o) => `<${o.term1} <=> ${o.term2}>`,
      product: (o) => `(${o.elements.join(' * ')})`,
      extensional_intersection: (o) => `(${o.elements.join(' | ')})`,
      intensional_intersection: (o) => `(${o.elements.join(' & ')})`,
      compound: (o) => this._formatCompound(o),
      statement: (o) => this._formatStatement(o)
    };

    const formatter = formatters[jsObj.type];
    return formatter ? formatter(jsObj) : this._formatSimpleTerm(jsObj);
  }

  _isComplex(expr) {
    return expr.includes('(') && expr.includes(')') ||
           expr.includes('<') && expr.includes('>') ||
           expr.includes(' --> ') || expr.includes(' =/> ') || expr.includes(' <=> ');
  }

  _parseComplex(narsese) {
    if (narsese.startsWith('(') && narsese.endsWith(')')) return this._parseCompound(narsese);
    if (narsese.startsWith('<') && narsese.endsWith('>')) return this._parseStatement(narsese);

    for (const op of ['==>', '=/>', '<=>', '*']) {
      if (narsese.includes(op)) return this._parseByOp(narsese, op);
    }

    return { type: 'simple_term', value: narsese, punctuation: this._extractPunct(narsese), term: this._removePunct(narsese) };
  }

  _parseCompound(termStr) {
    const inner = termStr.substring(1, termStr.length - 1);
    const types = { '*': 'product', ' | ': 'extensional_intersection', ' & ': 'intensional_intersection' };

    for (const [op, type] of Object.entries(types)) {
      if (inner.includes(op)) {
        return { type, elements: inner.split(op).map(e => e.trim()), operator: op.trim() };
      }
    }
    return { type: 'simple_term', value: termStr, punctuation: this._extractPunct(termStr), term: this._removePunct(termStr) };
  }

  _parseStatement(stmtStr) {
    const inner = stmtStr.substring(1, stmtStr.length - 1);
    const termRegex = /(".*?"|\S+)/g;
    const parts = inner.match(termRegex);
    if (!parts || parts.length < 3) {
        return { type: 'simple_statement', value: stmtStr, punctuation: this._extractPunct(stmtStr), statement: this._removePunct(stmtStr) };
    }

    const [subject, op, predicate] = parts;
    const ops = {
        '-->': { type: 'inheritance', fields: ['subject', 'predicate'] },
        '=/>': { type: 'implication', fields: ['antecedent', 'consequent'] },
        '<=>': { type: 'equivalence', fields: ['term1', 'term2'] }
    };

    if (ops[op]) {
        const { type, fields } = ops[op];
        return { type, [fields[0]]: subject, [fields[1]]: predicate, operator: op };
    }
    return { type: 'simple_statement', value: stmtStr, punctuation: this._extractPunct(stmtStr), statement: this._removePunct(stmtStr) };
  }

  _parseByOp(expr, op) {
    const parts = expr.split(op);
    const parsers = {
      '*': () => ({ type: 'product', elements: parts.map(p => p.trim()), operator: op }),
      ' --> ': () => ({ type: 'inheritance', subject: parts[0].trim(), predicate: parts[1].trim(), operator: '-->' }),
      ' =/> ': () => ({ type: 'implication', antecedent: parts[0].trim(), consequent: parts[1].trim(), operator: '=/>' }),
      ' <=> ': () => ({ type: 'equivalence', term1: parts[0].trim(), term2: parts[1].trim(), operator: '<=>' })
    };

    return parsers[op] ? parsers[op]() : { type: 'unknown', expression: expr, operator: op };
  }

  _formatCompound(obj) {
    const compoundFormatters = {
      '*': `(${obj.elements.join(' * ')})`,
      '|': `(${obj.elements.join(' | ')})`,
      '&': `(${obj.elements.join(' & ')})`
    };

    return compoundFormatters[obj.operator] || obj.value || obj.toString();
  }

  _formatStatement(obj) {
    const statementFormatters = {
      '-->': `<${obj.subject} --> ${obj.predicate}>`,
      '=/': `<${obj.antecedent} =/> ${obj.consequent}>`,
      '<=>': `<${obj.term1} <=> ${obj.term2}>`
    };

    return statementFormatters[obj.operator] || obj.value || obj.toString();
  }

  _formatSimpleTerm(obj) {
    if (obj.term) return obj.punctuation ? `${obj.term}${obj.punctuation}` : obj.term;
    return obj.toString ? obj.toString() : JSON.stringify(obj);
  }

  _extractPunct(term) {
    if (typeof term !== 'string') return null;
    const lastChar = term.charAt(term.length - 1);
    return lastChar === '.' || lastChar === '?' || lastChar === '!' ? lastChar : null;
  }

  _removePunct(term) {
    if (typeof term !== 'string') return term;
    const lastChar = term.charAt(term.length - 1);
    return lastChar === '.' || lastChar === '?' || lastChar === '!' ? term.substring(0, term.length - 1) : term;
  }

  validateNarsese(narsese) {
    if (!narsese || typeof narsese !== 'string') return false;
    try {
      this.narseseToJs(narsese);
      return true;
    } catch (error) {
      this.stats.validationErrors++;
      return false;
    }
  }

  applyMacros(narsese) {
    if (!this.config.enableMacros) return narsese;

    let result = narsese;
    for (const [name, macro] of this.macros) {
      result = result.replace(macro.pattern, (match) => {
        try {
          const matches = macro.pattern.exec(match);
          if (matches) {
            const jsObj = macro.toJs(matches);
            return macro.toNarsese(jsObj);
          }
        } catch (error) {
          Logger.warn(`Macro application failed for ${name}: ${error.message}`);
        }
        return match;
      });
    }
    return result;
  }

  getStats() {
    const attempted = this.stats.conversionsAttempted;
    return {
      ...this.stats,
      validationErrorRate: attempted ? this.stats.validationErrors / attempted : 0,
      narseseToJsRate: attempted ? this.stats.narseseToJs / attempted : 0,
      jsToNarseseRate: attempted ? this.stats.jsToNarsese / attempted : 0
    };
  }

  taskToJs(task) {
    if (!task?.term) throw new Error('Task must have a term property');
    const termObj = this.narseseToJs(task.term);
    return { ...task, term: termObj, originalTerm: task.term };
  }

  jsToTask(jsTask) {
    if (!jsTask?.term) throw new Error('JS task must have a term property');

    const narseseTerm = typeof jsTask.term === 'string' ? jsTask.term : this.jsToNarsese(jsTask.term);
    return { ...jsTask, term: narseseTerm, originalTerm: jsTask.originalTerm || jsTask.term };
  }

  batchNarseseToJs(narseseTerms) {
    if (!Array.isArray(narseseTerms)) throw new Error('Input must be an array of Narsese strings');
    return narseseTerms.map(term => this._tryConvert(() => this.narseseToJs(term), term));
  }

  batchJsToNarsese(jsObjects) {
    if (!Array.isArray(jsObjects)) throw new Error('Input must be an array of JavaScript objects');
    return jsObjects.map(obj => this._tryConvert(() => this.jsToNarsese(obj), obj));
  }

  _tryConvert(converter, original) {
    try {
      return { original, converted: converter(), success: true };
    } catch (error) {
      return { original, error: error.message, success: false };
    }
  }

  // Simple conversion functions for backward compatibility and unified interface
  /**
   * Convert text to Narsese format
   */
  convertToNarsese(text, type = 'default') {
    try {
      // Simple conversion for basic terms
      const narsese = this._simpleConvertToNarsese(text);
      return {
        original: text,
        narsese,
        type
      };
    } catch (error) {
      // Fallback to simple placeholder if complex conversion fails
      return {
        original: text,
        narsese: `[Placeholder Narsese conversion for: ${text}]`,
        type,
        error: error.message
      };
    }
  }

  /**
   * Convert from Narsese back to text
   */
  convertFromNarsese(narsese) {
    try {
      // Attempt to parse as Narsese and extract original text parts
      // For the specific test case: <Hello --> world> should return "Hello world"

      // First try direct regex matches for common Narsese patterns
      const patterns = [
        [/^<([^>]+)-->([^>]+)>$/, (m) => `${m[1].trim()} ${m[2].trim()}`],
        [/^<([^>]+)=\/>([^>]+)>$/, (m) => `${m[1].trim()} ${m[2].trim()}`],
        [/^<([^>]+)<=>([^>]+)>$/, (m) => `${m[1].trim()} ${m[2].trim()}`]
      ];

      for (const [pattern, formatter] of patterns) {
        const match = narsese.match(pattern);
        if (match) return formatter(match);
      }

      // For the fallback case where the result is a JS object
      const result = this.narseseToJs(narsese);

      // Try to extract the most appropriate text representation
      return result.subject && result.predicate ? `${result.subject} ${result.predicate}` :
             result.term1 && result.term2 ? `${result.term1} ${result.term2}` :
             result.antecedent && result.consequent ? `${result.antecedent} ${result.consequent}` :
             result.elements && Array.isArray(result.elements) ? result.elements.join(' ') :
             result.value || narsese; // Return original if no meaningful extraction
    } catch (error) {
      // Fallback for placeholder format or invalid Narsese
      const placeholderMatch = narsese.match(/^\[Placeholder Narsese conversion for: (.+)\]$/);
      return placeholderMatch ? placeholderMatch[1] : narsese;
    }
  }

  /**
   * Simple conversion to Narsese for basic cases
   * @private
   */
  _simpleConvertToNarsese(text) {
    // This is a simplified version; real implementation would be more sophisticated
    const normalized = text.trim();

    // If it already looks like Narsese, return as is
    if (normalized.startsWith('<') && normalized.endsWith('>')) {
      return normalized;
    }

    // Quote multi-word terms
    const quoteIfNeeded = (term) => term.includes(' ') ? `"${term}"` : term;

    // Attempt to identify patterns and convert appropriately
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
        const subject = quoteIfNeeded(parts[0]);
        const predicate = quoteIfNeeded(parts.slice(1).join(' '));
        return `<${subject} --> ${predicate}>`;
    }

    return `<${quoteIfNeeded(normalized)} --> ${quoteIfNeeded(normalized)}>`;
  }

  /**
   * Batch convert multiple items to Narsese
   */
  batchConvertToNarsese(texts, type = 'default') {
    return texts.map(text => this.convertToNarsese(text, type));
  }

  /**
   * Batch convert multiple items from Narsese
   */
  batchConvertFromNarsese(narseseList) {
    return narseseList.map(narsese => this.convertFromNarsese(narsese));
  }
}

export default NarseseTranslator;