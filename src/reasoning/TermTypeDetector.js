/**
 * Term Type Detection Utility for SeNARS v10
 * Provides methods to identify different types of terms for type-directed evaluation
 */

import { SYSTEM_ATOMS } from './SystemAtoms.js';

export class TermTypeDetector {
    /**
     * Determine the type of a term for type-directed processing
     * @param {Term} term - The term to analyze
     * @returns {string} - One of: 'INT', 'NUMERIC', 'VARIABLE', 'ATOM', 'BOOLEAN', 'COMPOUND'
     */
    static getTermType(term) {
        if (!term) return 'UNKNOWN';
        
        // Check if it's a system atom (True, False, Null)
        if (this.isBooleanAtom(term)) {
            return 'BOOLEAN';
        }
        
        // Check if it's a variable (typically starts with ? in NARS)
        if (this.isVariable(term)) {
            return 'VARIABLE';
        }
        
        // Check if it's a numeric atom
        if (this.isNumeric(term)) {
            return this.isInteger(term) ? 'INT' : 'NUMERIC';
        }
        
        // Check if it's a compound term
        if (term.isCompound) {
            return 'COMPOUND';
        }
        
        // Default to ATOM for all other atomic terms
        return 'ATOM';
    }
    
    /**
     * Check if a term is a boolean atom (True, False, Null)
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term is a boolean atom
     */
    static isBooleanAtom(term) {
        return term && term.isAtomic && 
               (term.name === SYSTEM_ATOMS.True.name || 
                term.name === SYSTEM_ATOMS.False.name || 
                term.name === SYSTEM_ATOMS.Null.name);
    }
    
    /**
     * Check if a term is a variable (typically starts with ? in this implementation)
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term is a variable
     */
    static isVariable(term) {
        return term && term.isAtomic && term.name && term.name.startsWith('?');
    }
    
    /**
     * Check if a term represents a numeric value
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term is numeric
     */
    static isNumeric(term) {
        if (!term || !term.isAtomic || !term.name) return false;
        const numValue = Number(term.name);
        return !isNaN(numValue);
    }
    
    /**
     * Check if a term represents an integer value
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term is an integer
     */
    static isInteger(term) {
        if (!term || !term.isAtomic || !term.name) return false;
        const numValue = Number(term.name);
        return !isNaN(numValue) && Number.isInteger(numValue);
    }
    
    /**
     * Check if all components of a term are of a specific type
     * @param {Term} term - The compound term to check
     * @param {string} type - The type to check for
     * @returns {boolean} - True if all components match the type
     */
    static allComponentsOfType(term, type) {
        if (!term || !term.isCompound || !term.components) return false;
        
        return term.components.every(comp => this.getTermType(comp) === type);
    }
    
    /**
     * Check if a term is suitable for functional evaluation (boolean values)
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term should be functionally evaluated
     */
    static isForFunctionalEvaluation(term) {
        return this.getTermType(term) === 'BOOLEAN';
    }
    
    /**
     * Check if all components are suitable for functional evaluation
     * @param {Term} term - The compound term to check
     * @returns {boolean} - True if all components are boolean types
     */
    static shouldDoFunctionalEvaluation(term) {
        if (!term || !term.isCompound) return false;
        
        // Only do functional evaluation for operators that can be unified
        const unifiedOperators = ['&', '|', '==>', '<=>', '='];
        if (!unifiedOperators.includes(term.operator)) return false;
        
        // Check if all components are boolean types
        return this.allComponentsOfType(term, 'BOOLEAN');
    }
}