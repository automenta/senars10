import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';

/**
 * ExtendedNALRule: Implements additional NAL reasoning patterns beyond basic syllogism
 * Includes conditional reasoning, equivalence transformations, and more complex patterns
 */
export class ExtendedNALRule extends NALRule {
    constructor(name, config) {
        super(name, config || {
            name: 'Extended NAL Rule',
            description: 'Implements extended NAL reasoning patterns',
            priority: 0.5,
            category: 'extended'
        });
        
        this.ruleType = config?.ruleType || 'general';
    }

    _matches(task, context) {
        // This is a base class - specific implementations will override
        return false;
    }

    async _apply(task, context) {
        // This is a base class - specific implementations will override
        return [];
    }

    /**
     * Helper: Check if two terms are structurally equivalent
     */
    _structuralEquivalence(term1, term2) {
        if (!term1 || !term2) return false;
        if (term1.operator !== term2.operator) return false;
        if ((term1.components?.length || 0) !== (term2.components?.length || 0)) return false;
        if (term1.name !== term2.name) return false;
        
        return !term1.components || term1.components.every((comp, i) => 
            this._structuralEquivalence(comp, term2.components[i]));
    }

    /**
     * Helper: Calculate truth value based on NAL principles
     */
    _calculateNALTruth(truth1, truth2, operation = 'intersection') {
        if (!truth1 && !truth2) return new Truth(0.5, 0.5);
        if (!truth1) return truth2;
        if (!truth2) return truth1;

        const operations = {
            intersection: (t1, t2) => ({ f: t1.frequency * t2.frequency, c: t1.confidence * t2.confidence }),
            union: (t1, t2) => ({ f: t1.frequency + t2.frequency - (t1.frequency * t2.frequency), c: t1.confidence * t2.confidence }),
            difference: (t1, t2) => ({ f: Math.max(0, t1.frequency - t2.frequency), c: t1.confidence * t2.confidence }),
            comparison: (t1, t2) => ({ f: Math.min(t1.frequency, t2.frequency) / Math.max(t1.frequency, t2.frequency || 0.001), c: t1.confidence * t2.confidence }),
            default: (t1, t2) => ({ f: (t1.frequency + t2.frequency) / 2, c: Math.min(t1.confidence, t2.confidence) })
        };

        const {f, c} = (operations[operation] || operations.default)(truth1, truth2);
        return new Truth(f, c);
    }

    /**
     * Transform an inheritance statement (-->)
     */
    _transformInheritance(term) {
        if (!term.isCompound || term.operator !== '-->') {
            return null;
        }

        const [subject, predicate] = term.components || [];
        if (!subject || !predicate) return null;

        // Conversion: <S --> P> ⊣⊢ <P --> S> (with lower confidence)
        const converted = new Term('compound', 
            `(--> ${predicate.name}, ${subject.name})`, 
            [predicate, subject], 
            '-->');
            
        return converted;
    }

    /**
     * Transform an implication statement (==>)
     */
    _transformImplication(term) {
        if (!term.isCompound || term.operator !== '==>') {
            return null;
        }

        const [antecedent, consequent] = term.components || [];
        if (!antecedent || !consequent) return null;

        // Contraposition: (A ==> B) ⊢ (¬B ==> ¬A)
        const contrapositive = new Term('compound', 
            `(==> (not ${consequent.name}), (not ${antecedent.name}))`, 
            [new Term('compound', `(not ${consequent.name})`, [consequent], 'not'), 
             new Term('compound', `(not ${antecedent.name})`, [antecedent], 'not')], 
            '==>');
            
        return contrapositive;
    }
}

/**
 * ConversionRule: Implements conversion between subject-predicate relationships
 * <S --> P> ⊣⊢ <P --> S>
 */
export class ConversionRule extends ExtendedNALRule {
    constructor() {
        super('conversion', {
            name: 'Conversion Rule',
            description: 'Converts inheritance relationships: <S --> P> ⊣⊢ <P --> S>',
            priority: 0.3,
            category: 'extended'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound && 
               task.term.operator === '-->' && 
               task.term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) {
            return [];
        }

        const [subject, predicate] = task.term.components;
        
        // Create the converted statement <P --> S>
        const convertedTerm = new Term('compound', 
            `(--> ${predicate.name}, ${subject.name})`, 
            [predicate, subject], 
            '-->');
        
        const derivedTruth = new Truth(
            task.truth.frequency,  // Same frequency
            task.truth.confidence * 0.8  // Lower confidence due to conversion
        );

        return [this._createDerivedTask(task, {
            term: convertedTerm,
            truth: derivedTruth,
            type: task.type,
            priority: task.priority * this.priority
        })];
    }
}

/**
 * EquivalenceRule: Handles equivalence relationships and their implications
 * <A <=> B> ≡ (<A ==> B> AND <B ==> A>)
 * This rule derives implications from equivalences and vice versa
 */
export class EquivalenceRule extends ExtendedNALRule {
    constructor() {
        super('equivalence', {
            name: 'Equivalence Rule',
            description: 'Handles equivalence relationships and their implications',
            priority: 0.7,
            category: 'extended'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound && 
               task.term.operator === '<=>' && 
               task.term.components?.length === 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) {
            return [];
        }

        const [left, right] = task.term.components;
        const results = [];

        // From <A <=> B>, derive <A ==> B>
        const implication1 = new Term('compound',
            `(==> ${left.name}, ${right.name})`,
            [left, right],
            '==>');
        
        results.push(this._createDerivedTask(task, {
            term: implication1,
            truth: this._calculateNALTruth(task.truth, new Truth(1.0, 0.9), 'intersection'),
            type: task.type,
            priority: task.priority * this.priority * 0.9
        }));

        // From <A <=> B>, derive <B ==> A>
        const implication2 = new Term('compound',
            `(==> ${right.name}, ${left.name})`,
            [right, left],
            '==>');
        
        results.push(this._createDerivedTask(task, {
            term: implication2,
            truth: this._calculateNALTruth(task.truth, new Truth(1.0, 0.9), 'intersection'),
            type: task.type,
            priority: task.priority * this.priority * 0.9
        }));

        return results;
    }
}

/**
 * NegationRule: Handles negation operations in NAL
 */
export class NegationRule extends ExtendedNALRule {
    constructor() {
        super('negation', {
            name: 'Negation Rule',
            description: 'Handles negation operations in NAL',
            priority: 0.4,
            category: 'extended'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound && 
               task.term.operator === '--' &&  // NAL negation operator
               task.term.components?.length >= 1;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) {
            return [];
        }

        const operand = task.term.components[0];
        const results = [];

        // Double negation elimination: ¬¬A ⊢ A
        if (operand.isCompound && operand.operator === '--' && operand.components?.length >= 1) {
            const doubleNegationTerm = operand.components[0];
            const derivedTruth = new Truth(
                operand.truth?.frequency || 0.5,
                (operand.truth?.confidence || 0.5) * 0.9  // Slightly reduced confidence
            );

            results.push(this._createDerivedTask(task, {
                term: doubleNegationTerm,
                truth: derivedTruth,
                type: task.type,
                priority: task.priority * this.priority
            }));
        }

        return results;
    }
}

/**
 * ConjunctionRule: Handles conjunction operations in NAL
 */
export class ConjunctionRule extends ExtendedNALRule {
    constructor() {
        super('conjunction', {
            name: 'Conjunction Rule',
            description: 'Handles conjunction operations in NAL',
            priority: 0.6,
            category: 'extended'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound && 
               task.term.operator === '&' && 
               task.term.components?.length >= 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) {
            return [];
        }

        const results = [];
        const components = task.term.components;

        // Extract components: from (A & B & C...), derive A, B, C individually
        for (const component of components) {
            const derivedTruth = new Truth(
                task.truth.frequency,  // Preserve frequency
                task.truth.confidence * 0.9  // Slightly reduced confidence for extraction
            );

            results.push(this._createDerivedTask(task, {
                term: component,
                truth: derivedTruth,
                type: task.type,
                priority: task.priority * this.priority * 0.8
            }));
        }

        return results;
    }
}

/**
 * DisjunctionRule: Handles disjunction operations in NAL
 */
export class DisjunctionRule extends ExtendedNALRule {
    constructor() {
        super('disjunction', {
            name: 'Disjunction Rule',
            description: 'Handles disjunction operations in NAL',
            priority: 0.5,
            category: 'extended'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound && 
               task.term.operator === '|' && 
               task.term.components?.length >= 2;
    }

    async _apply(task, context) {
        if (!this._matches(task, context)) {
            return [];
        }

        // For disjunction, we typically can't derive individual components without additional information
        // This is a placeholder for more sophisticated disjunction handling
        return [];
    }
}

