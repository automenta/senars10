import { CryptoUtils } from './base/utilities.js';

export const TermType = {
  // Core Relationship Operators
  NEGATION: 'negation',
  PRODUCT: 'product',
  INHERITANCE: 'inheritance',
  SIMILARITY: 'similarity',
  IMPLICATION: 'implication',
  EQUIVALENCE: 'equivalence',
  CONJUNCTION: 'conjunction',
  DISJUNCTION: 'disjunction',
  SEQUENTIAL_CONJUNCTION: 'sequential_conjunction',
  OPERATION: 'operation',

  // Set and Property Operators
  INSTANCE: 'instance',
  PROPERTY: 'property',
  EXTENSIONAL_SET: 'extensional_set',
  INTENSIONAL_SET: 'intensional_set',

  // Atomic term
  ATOM: 'atom'
};

export class Term {
  constructor({ name, termType, complexity, subject, predicate, components, hash }) {
    this.name = name;
    this.termType = termType;
    this.complexity = complexity;
    this.subject = subject;
    this.predicate = predicate;
    this.components = components;
    this.hash = hash;
    Object.freeze(this);
  }

  static newAtom(name) {
    if (name.indexOf(' ')!==-1 && !name.startsWith("\"")) {
      //TODO proper escaping and quoting
      name = '"' + name + '"';
      console.log(name);
    }

    const termType = TermType.ATOM;
    return new Term({
      name,
      termType,
      complexity: 1,
      components: null,
      hash: Term.computeHash(name, termType, null)
    });
  }

  static createCompound(termType, components) {
    const simplifiedComponents = Term.simplifyComponents(termType, [...components]);
    const name = Term.generateName(termType, simplifiedComponents);
    const complexity = 1 + simplifiedComponents.reduce((sum, comp) => sum + comp.complexity, 0);
    const [subject, predicate] = Term._extractSubjectPredicate(termType, simplifiedComponents);

    return new Term({
      name,
      termType,
      complexity,
      subject,
      predicate,
      components: simplifiedComponents,
      hash: Term.computeHash(name, termType, simplifiedComponents)
    });
  }

  static _extractSubjectPredicate(termType, components) {
    const hasSubjectPredicate = Term._hasSubjectPredicate(termType) && components.length === 2;
    return hasSubjectPredicate ? [components[0], components[1]] : [null, null];
  }

  static _hasSubjectPredicate(termType) {
    return [TermType.INHERITANCE, TermType.SIMILARITY, TermType.IMPLICATION,
            TermType.EQUIVALENCE, TermType.SEQUENTIAL_CONJUNCTION, TermType.INSTANCE,
            TermType.PROPERTY, TermType.OPERATION].includes(termType);
  }

  static computeHash(name, termType, components) {
    const content = `${name}|${termType}|${components ? components.map(c => c.hash).join(',') : ''}`;
    return CryptoUtils.sha256(content);
  }

  static generateName(termType, components) {
    const [first, second] = components.map(comp => comp.name);
    const names = components.map(comp => comp.name);
    
    const namePatterns = {
      [TermType.NEGATION]: `(--, ${first})`,
      [TermType.INHERITANCE]: `(${first} --> ${second})`,
      [TermType.SIMILARITY]: `(${first} <-> ${second})`,
      [TermType.IMPLICATION]: `(${first} ==> ${second})`,
      [TermType.EQUIVALENCE]: `(${first} <=> ${second})`,
      [TermType.CONJUNCTION]: `(&, ${names.join(', ')})`,
      [TermType.DISJUNCTION]: `(|, ${names.join(', ')})`,
      [TermType.SEQUENTIAL_CONJUNCTION]: `(&/, ${first}, ${second})`,
      [TermType.OPERATION]: `(${first} ^ ${second})`,
      [TermType.PRODUCT]: `(${names.join(', ')})`,
      [TermType.INSTANCE]: `(${first} {{-- ${second})`,
      [TermType.PROPERTY]: `(${first} --}} ${second})`,
      [TermType.EXTENSIONAL_SET]: `{${names.join(', ')}}`,
      [TermType.INTENSIONAL_SET]: `[${names.join(', ')}]`
    };

    return namePatterns[termType] || `(${termType}, ${names.join(', ')})`;
  }

  static simplifyComponents(termType, components) {
    const [associativeOps, commutativeOps] = [Term._getAssociativeOps(), Term._getCommutativeOps()];
    let simplified = true;
    let currentComponents = [...components];

    while (simplified) {
      simplified = false;

      if (associativeOps.includes(termType)) {
        const result = Term._flattenComponents(currentComponents, termType);
        if (result.changed) {
          simplified = true;
          currentComponents = result.components;
        }
      }

      if (commutativeOps.includes(termType)) {
        const result = Term._deduplicateAndSort(currentComponents);
        if (result.changed) {
          simplified = true;
          currentComponents = result.components;
        }
      }
    }

    return currentComponents;
  }

  static _getAssociativeOps() {
    return [TermType.CONJUNCTION, TermType.DISJUNCTION];
  }

  static _getCommutativeOps() {
    return [TermType.CONJUNCTION, TermType.DISJUNCTION, TermType.SIMILARITY, TermType.EQUIVALENCE];
  }

  static _flattenComponents(components, termType) {
    let flattened = [];
    let changed = false;
    
    for (const comp of components) {
      if (comp.termType === termType && comp.components) {
        flattened.push(...comp.components);
        changed = true;
      } else {
        flattened.push(comp);
      }
    }
    
    return { components: flattened, changed };
  }

  static _deduplicateAndSort(components) {
    // Sort lexicographically by hash to ensure canonical form
    const sorted = components.sort((a, b) => a.hash.localeCompare(b.hash));

    // Remove duplicates efficiently using a Set based on hash
    const seenHashes = new Set();
    const uniqueComponents = sorted.filter(comp => {
      if (seenHashes.has(comp.hash)) return false;
      seenHashes.add(comp.hash);
      return true;
    });

    const changed = uniqueComponents.length !== components.length;
    return { components: uniqueComponents, changed };
  }

  toString() {
    return this.name;
  }

  equals(other) {
    return other instanceof Term && this.hash === other.hash;
  }
}