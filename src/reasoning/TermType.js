import { isTrue, isFalse, isNull } from './SystemAtoms.js';

/**
 * Term Type Detection for SeNARS v10
 * Distinguishes between different types of terms for type-directed evaluation
 */
export class TermType {
    static isBooleanValue(term) {
        return isTrue(term) || isFalse(term) || isNull(term);
    }

    static isNumeric(term) {
        if (term.isAtomic) {
            const numValue = Number(term.name);
            return !isNaN(numValue);
        }
        return false;
    }

    static isVariable(term) {
        return term.isAtomic && term.name?.startsWith('?');
    }

    static isNALConcept(term) {
        // A NAL concept is any term that is not specifically a boolean value, variable, or numeric
        return !this.isBooleanValue(term) && !this.isVariable(term) && !this.isNumeric(term);
    }

    static isCompoundWithBooleanArgs(term) {
        if (!term.isCompound) return false;
        return term.components && term.components.every(comp => this.isBooleanValue(comp));
    }

    static isCompoundWithNALConcepts(term) {
        if (!term.isCompound) return false;
        return term.components && term.components.every(comp => this.isNALConcept(comp));
    }

    static getEvaluationType(term) {
        if (this.isBooleanValue(term)) return 'BOOLEAN';
        if (this.isNumeric(term)) return 'NUMERIC';
        if (this.isVariable(term)) return 'VARIABLE';
        if (this.isNALConcept(term)) return 'NAL_CONCEPT';
        
        return 'UNKNOWN';
    }

    static wouldBeFunctionalEvaluation(operator, components) {
        // Check if all components are boolean values for operators like &, |, ==>
        return components.every(comp => this.isBooleanValue(comp));
    }

    static wouldBeStructuralComposition(operator, components) {
        // Check if components are NAL concepts for operators like &, |, ==>
        return components.every(comp => this.isNALConcept(comp));
    }
}