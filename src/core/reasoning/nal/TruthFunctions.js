import {TRUTH} from '../../config/constants.js';
import {clamp} from '../../../util/common.js';

/**
 * NAL Truth Value Functions for reasoning
 */
export class TruthFunctions {
    /**
     * Revision combines two truth values with the same content but different evidence bases
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Revised truth value
     */
    static revision(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        const w1 = this.w(v1.frequency, v1.confidence);
        const w2 = this.w(v2.frequency, v2.confidence);
        const w = w1 + w2;
        const f = (w1 * v1.frequency + w2 * v2.frequency) / w;
        const c = w / (w + TRUTH.WEIGHT_FACTOR);

        return {frequency: f, confidence: c};
    }

    /**
     * Deduction rule: If <a --> b> and <a> then <b>
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Deduced truth value
     */
    static deduction(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        const f = this.fDed(v1.frequency, v2.frequency);
        const c = v1.confidence * v2.confidence;

        return {frequency: f, confidence: c};
    }

    /**
     * Induction rule: If <a --> b> and <b --> a> then <a <-> b>
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Induced truth value
     */
    static induction(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        const f = this.fInd(v1.frequency, v2.frequency);
        const c = v1.confidence * v2.confidence * Math.min(v1.frequency, v2.frequency);

        return {frequency: f, confidence: c};
    }

    /**
     * Abduction rule: If <a --> b> and <b> then <a>
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Abduced truth value
     */
    static abduction(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        const f = this.fAbd(v1.frequency, v2.frequency);
        const c = v1.confidence * v2.confidence;

        return {frequency: f, confidence: c};
    }

    /**
     * Exemplification: If <a --> b> and <b --> c> then <c --> a>
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Exemplified truth value
     */
    static exemplification(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        // Similar to abduction but with different semantics
        const f = this.fAbd(v1.frequency, v2.frequency);
        const c = v1.confidence * v2.confidence * TRUTH.EXEMPLIFICATION_CONFIDENCE_FACTOR;

        return {frequency: f, confidence: c};
    }

    /**
     * Comparison: If <a --> b> and <a --> c> then <b <-> c>
     * @param {Object} v1 - First truth value {frequency, confidence}
     * @param {Object} v2 - Second truth value {frequency, confidence}
     * @returns {Object} - Comparison truth value
     */
    static comparison(v1, v2) {
        if (!v1 || !v2) return v1 || v2;

        // For comparison between similar subjects
        const f = Math.min(v1.frequency, v2.frequency);
        const c = v1.confidence * v2.confidence * TRUTH.COMPARISON_CONFIDENCE_FACTOR;

        return {frequency: f, confidence: c};
    }

    /**
     * Conversion: If <a --> b> then <b --> a>
     * @param {Object} v - Truth value {frequency, confidence}
     * @returns {Object} - Converted truth value
     */
    static conversion(v) {
        if (!v) return v;

        // Conversion reverses the inheritance direction
        const f = v.frequency;
        const c = v.confidence * TRUTH.CONVERSION_CONFIDENCE_FACTOR;

        return {frequency: f, confidence: c};
    }

    /**
     * Negation: If <a> then <-- a>
     * @param {Object} v - Truth value {frequency, confidence}
     * @returns {Object} - Negated truth value
     */
    static negation(v) {
        if (!v) return v;

        return {
            frequency: 1.0 - v.frequency,
            confidence: v.confidence
        };
    }

    /**
     * Expectation: Decision making function
     * @param {Object} v - Truth value {frequency, confidence}
     * @returns {number} - Expected likelihood
     */
    static expectation(v) {
        if (!v) return 0.5;

        return (v.frequency * v.confidence) + (0.5 * (1 - v.confidence));
    }

    // Helper functions for truth value operations
    static w(frequency, confidence) {
        return confidence / (1 - confidence);
    }

    static fDed(f1, f2) {
        return f1 * f2;
    }

    static fInd(f1, f2) {
        return Math.min(f1, f2);
    }

    static fAbd(f1, f2) {
        return f1; // In abduction, frequency of cause is influenced by the rule's frequency
    }

    /**
     * Normalize truth values to ensure they're within valid ranges
     * @param {Object} v - Truth value {frequency, confidence}
     * @returns {Object} - Normalized truth value
     */
    static normalize(v) {
        if (!v) return {frequency: 0.5, confidence: 0.9};

        return {
            frequency: clamp(v.frequency, 0, 1),
            confidence: clamp(v.confidence, 0, 1)
        };
    }
}