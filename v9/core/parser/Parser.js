import { Term, TermType } from '../Term.js';
import { Task, Punctuation, TruthValue } from '../Task.js';

/**
 * Parses a Narsese string into a Task.
 *
 * This is the main entry point for the parser. It handles a complete Narsese statement,
 * including the term, punctuation, and an optional truth value. The resulting Task is
 * not yet stored in memory.
 *
 * @param {string} input - A string representing the Narsese statement
 * @param {number} currentTime - The current timestamp to assign to the created task
 * @returns {Task} The parsed task
 * @throws {Error} If the input cannot be parsed
 */
export function parse(input, currentTime) {
  // Trim whitespace and remove trailing punctuation for processing
  const trimmed = input.trim();

  // Extract punctuation and truth value if present
  const { statement, punctuation, truthValue } = _extractStatementComponents(trimmed);

  // Parse the term component
  const term = _parseTerm(statement);

  // Create and return the task
  return new Task(
    term,
    punctuation,
    truthValue,
    currentTime,
    currentTime
  );
}

/**
 * Parses a Narsese string representing a term into a Term.
 *
 * This is a convenience function for use in other parsing functions.
 *
 * @param {string} input - A string representing the Narsese term
 * @returns {Term} The parsed term
 * @throws {Error} If the input cannot be parsed
 */
export function parseTerm(input) {
  return _parseTerm(input.trim());
}

/**
 * Extracts statement components (term, punctuation, truth value) from a Narsese string.
 * @private
 */
function _extractStatementComponents(input) {
  // Match truth value pattern: %f;c% at the end
  const truthMatch = input.match(/(.*)%(\d*\.?\d+);(\d*\.?\d+)%\s*([.!?]?)$/);

  let statement, frequency, confidence, punct;

  if (truthMatch) {
    statement = truthMatch[1].trim();
    frequency = parseFloat(truthMatch[2]);
    confidence = parseFloat(truthMatch[3]);
    punct = truthMatch[4] || input.charAt(input.length - 1);
  } else {
    // No truth value, just extract punctuation
    statement = input.replace(/[.!?]+$/, '').trim();
    punct = input.match(/[.!?]+$/)?.[0]?.charAt(0) || '.';
  }

  // Determine the punctuation type
  const punctuation = {
    '.': Punctuation.BELIEF,
    '!': Punctuation.GOAL,
    '?': Punctuation.QUESTION
  }[punct] || Punctuation.BELIEF; // default

  // Create truth value if both frequency and confidence were found
  const truthValue = (frequency !== undefined && confidence !== undefined)
    ? new TruthValue(frequency, confidence)
    : null;

  return { statement, punctuation, truthValue };
}

/**
 * Recursively parses a term from a Narsese string.
 * @private
 */
function _parseTerm(input) {
  const trimmed = input.trim();

  // Handle atomic terms (simple words without operators)
  if (!_isCompoundTerm(trimmed)) {
    return Term.newAtom(trimmed);
  }

  // Handle compound terms by identifying the main operator
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    // Remove outer parentheses
    const inner = trimmed.slice(1, -1).trim();

    // Check for various compound term types
    if (inner.startsWith('--, ')) {
      // Negation: (--, A)
      const component = _parseTerm(inner.slice(4).trim());
      return Term.createCompound(TermType.NEGATION, [component]);
    } else if (inner.includes(' --> ')) {
      // Inheritance: (A --> B)
      const [subject, predicate] = _splitByOperator(inner, ' --> ');
      return Term.createCompound(TermType.INHERITANCE, [subject, predicate]);
    } else if (inner.includes(' <-> ')) {
      // Similarity: (A <-> B)
      const [left, right] = _splitByOperator(inner, ' <-> ');
      return Term.createCompound(TermType.SIMILARITY, [left, right]);
    } else if (inner.includes(' ==> ')) {
      // Implication: (A ==> B)
      const [premise, conclusion] = _splitByOperator(inner, ' ==> ');
      return Term.createCompound(TermType.IMPLICATION, [premise, conclusion]);
    } else if (inner.includes(' <=> ')) {
      // Equivalence: (A <=> B)
      const [left, right] = _splitByOperator(inner, ' <=> ');
      return Term.createCompound(TermType.EQUIVALENCE, [left, right]);
    } else if (inner.startsWith('&, ')) {
      // Conjunction: (&, A, B, ...)
      const components = _parseList(inner.slice(3).trim());
      return Term.createCompound(TermType.CONJUNCTION, components);
    } else if (inner.startsWith('|, ')) {
      // Disjunction: (|, A, B, ...)
      const components = _parseList(inner.slice(3).trim());
      return Term.createCompound(TermType.DISJUNCTION, components);
    } else if (inner.startsWith('&/, ')) {
      // Sequential conjunction: (&/, A, B)
      const components = _parseList(inner.slice(4).trim());
      return Term.createCompound(TermType.SEQUENTIAL_CONJUNCTION, components);
    } else if (inner.includes(' ^ ')) {
      // Operation: (A ^ B)
      const [operator, operand] = _splitByOperator(inner, ' ^ ');
      return Term.createCompound(TermType.OPERATION, [operator, operand]);
    } else if (inner.includes(' {{-- ')) {
      // Instance: (A {{-- B)
      const [instance, classTerm] = _splitByOperator(inner, ' {{-- ');
      return Term.createCompound(TermType.INSTANCE, [instance, classTerm]);
    } else if (inner.includes(' --}} ')) {
      // Property: (A --}} B)
      const [thing, property] = _splitByOperator(inner, ' --}} ');
      return Term.createCompound(TermType.PROPERTY, [thing, property]);
    } else {
      // Product: (A, B, C) - comma-separated terms without operators
      const components = _parseList(inner);
      if (components.length > 1) {
        return Term.createCompound(TermType.PRODUCT, components);
      } else {
        // If it's just one term in parentheses, treat as atomic
        return Term.newAtom(trimmed);
      }
    }
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    // Extensional set: {A, B, C}
    const inner = trimmed.slice(1, -1).trim();
    const components = _parseList(inner);
    return Term.createCompound(TermType.EXTENSIONAL_SET, components);
  } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    // Intensional set: [A, B, C]
    const inner = trimmed.slice(1, -1).trim();
    const components = _parseList(inner);
    return Term.createCompound(TermType.INTENSIONAL_SET, components);
  }

  // If nothing matched, treat as atomic
  return Term.newAtom(trimmed);
}

/**
 * Determines if a term string represents a compound term.
 * @private
 */
function _isCompoundTerm(str) {
  // Check for common compound term indicators
  return (
    str.includes(' --> ') ||  // Inheritance
    str.includes(' <-> ') ||  // Similarity
    str.includes(' ==> ') ||  // Implication
    str.includes(' <=> ') ||  // Equivalence
    str.startsWith('(') ||    // Parenthetical expressions
    str.startsWith('{') ||    // Extensional set
    str.startsWith('[') ||    // Intensional set
    str.includes(' ^ ') ||    // Operation
    str.includes(' {{-- ') ||  // Instance
    str.includes(' --}} ') || // Property
    str.startsWith('--, ') || // Negation
    str.startsWith('&, ') ||  // Conjunction
    str.startsWith('|, ') ||  // Disjunction
    str.startsWith('&/, ')    // Sequential conjunction
  );
}

/**
 * Splits a string by a binary operator and parses the components.
 * @private
 */
function _splitByOperator(str, operator) {
  const parts = str.split(operator);
  if (parts.length !== 2) {
    throw new Error(`Invalid term format: expected binary operation with '${operator}'`);
  }
  return [parseTerm(parts[0].trim()), parseTerm(parts[1].trim())];
}

/**
 * Parses a comma-separated list of terms.
 * @private
 */
function _parseList(str) {
  // Split by commas but respect nested parentheses
  const parts = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '(' || char === '[' || char === '{') {
      parenDepth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      parenDepth--;
      current += char;
    } else if (char === ',' && parenDepth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim() !== '') {
    parts.push(current.trim());
  }

  return parts.map(part => parseTerm(part));
}