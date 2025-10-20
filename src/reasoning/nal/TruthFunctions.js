import {TRUTH} from '../../config/constants.js';
import {Truth} from '../../Truth.js';
import {clamp} from '../../util/common.js';

/**
 * NAL Truth Value Functions for reasoning
 * This class provides NAL-specific truth value operations that build on the core Truth class
 */
export class TruthFunctions {
    /**
     * Revision combines two truth values with the same content but different evidence bases
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Revised truth value as {frequency, confidence}
     */
    static revision(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return v1 || v2;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const revised = Truth.revision(t1, t2);
        return {frequency: revised.f, confidence: revised.c};
    }

    /**
     * Deduction rule: If <a --> b> and <a> then <b>
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Deduced truth value as {frequency, confidence}
     */
    static deduction(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return null;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const result = Truth.deduction(t1, t2);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Induction rule: If <a --> b> and <b --> a> then <a <-> b>
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Induced truth value as {frequency, confidence}
     */
    static induction(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return null;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const result = Truth.induction(t1, t2);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Abduction rule: If <a --> b> and <b> then <a>
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Abduced truth value as {frequency, confidence}
     */
    static abduction(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return null;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const result = Truth.abduction(t1, t2);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Exemplification: If <a --> b> and <b --> c> then <c --> a>
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Exemplified truth value as {frequency, confidence}
     */
    static exemplification(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return null;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const result = Truth.op(t1, t2, (t, u) => {
            const f = t.f; // Similar to abduction
            const c = t.c * u.c * (TRUTH.EXEMPLIFICATION_CONFIDENCE_FACTOR || 0.1);
            return new Truth(f, c);
        });

        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Comparison: If <a --> b> and <a --> c> then <b <-> c>
     * @param {Object} v1 - First truth value {frequency, confidence} or Truth instance
     * @param {Object} v2 - Second truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Comparison truth value as {frequency, confidence}
     */
    static comparison(v1, v2) {
        // Handle null inputs gracefully
        if (!v1 || !v2) return null;

        // Convert to Truth instances if they're not already
        const t1 = v1 instanceof Truth ? v1 : new Truth(v1?.frequency || 0.5, v1?.confidence || 0.9);
        const t2 = v2 instanceof Truth ? v2 : new Truth(v2?.frequency || 0.5, v2?.confidence || 0.9);

        const result = Truth.comparison(t1, t2);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Conversion: If <a --> b> then <b --> a>
     * @param {Object} v - Truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Converted truth value as {frequency, confidence}
     */
    static conversion(v) {
        // Handle null inputs gracefully
        if (!v) return null;

        // Convert to Truth instance if it's not already
        const t = v instanceof Truth ? v : new Truth(v?.frequency || 0.5, v?.confidence || 0.9);

        const result = Truth.conversion(t);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Negation: If <a> then <-- a>
     * @param {Object} v - Truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Negated truth value as {frequency, confidence}
     */
    static negation(v) {
        // Handle null inputs gracefully
        if (!v) return null;

        // Convert to Truth instance if it's not already
        const t = v instanceof Truth ? v : new Truth(v?.frequency || 0.5, v?.confidence || 0.9);

        const result = Truth.negation(t);
        return result ? {frequency: result.f, confidence: result.c} : null;
    }

    /**
     * Expectation: Decision making function
     * @param {Object} v - Truth value {frequency, confidence} or Truth instance
     * @returns {number} - Expected likelihood
     */
    static expectation(v) {
        // Handle null inputs gracefully
        if (!v) return 0.5;

        // Convert to Truth instance if it's not already
        const t = v instanceof Truth ? v : new Truth(v?.frequency || 0.5, v?.confidence || 0.9);

        return Truth.expectation(t);
    }

    /**
     * Normalize truth values to ensure they're within valid ranges
     * @param {Object} v - Truth value {frequency, confidence} or Truth instance
     * @returns {Object} - Normalized truth value as {frequency, confidence}
     */
    static normalize(v) {
        if (!v) return {frequency: 0.5, confidence: 0.9};

        // Convert to Truth instance if it's not already
        const t = v instanceof Truth ? v : new Truth(v?.frequency || 0.5, v?.confidence || 0.9);

        return {
            frequency: clamp(t.f, 0, 1),
            confidence: clamp(t.c, 0, 1)
        };
    }
}