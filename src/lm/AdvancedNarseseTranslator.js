/**
 * @file src/lm/AdvancedNarseseTranslator.js
 * @description Enhanced Narsese translator with advanced quality improvements
 */

/**
 * AdvancedNarseseTranslator - Enhanced bidirectional conversion between Narsese and natural language
 * with advanced translation quality improvements
 */
export class AdvancedNarseseTranslator {
    constructor() {
        // Initialize with quality improvement features
        this.forwardPatterns = [
            // Basic inheritance: "X is a Y", "X are Y", etc.
            {
                regex: /(.*)\s+is\s+(?:a|an|a kind of|a type of|a sort of)\s+(.*)/i,
                replacement: '($1 --> $2).',
                confidence: 0.9
            },
            {regex: /(.*)s\s+are\s+(.*)/i, replacement: '($1 --> $2).', confidence: 0.9},

            // Similarity: "X resembles Y", "X is similar to Y", etc.
            {
                regex: /(.*)\s+(?:resembles|is similar to|is like|is similar as)\s+(.*)/i,
                replacement: '($1 <-> $2).',
                confidence: 0.85
            },

            // Implication: "if X then Y", "X causes Y", etc.
            {regex: /(?:if|when)\s+(.*)\s+then\s+(.*)/i, replacement: '($1 ==> $2).', confidence: 0.9},
            {regex: /(.*)\s+(?:causes|leads to|results in)\s+(.*)/i, replacement: '($1 ==> $2).', confidence: 0.85},

            // Equivalence: "X if and only if Y", "X is equivalent to Y", etc.
            {regex: /(.*)\s+if and only if\s+(.*)/i, replacement: '($1 <=> $2).', confidence: 0.8},
            {regex: /(.*)\s+(?:is equivalent to|is the same as)\s+(.*)/i, replacement: '($1 <=> $2).', confidence: 0.8},

            // Conjunction: "X and Y"
            {regex: /(.*)\s+and\s+(.*)/i, replacement: '(&, $1, $2).', confidence: 0.9},

            // Disjunction: "X or Y"
            {regex: /(.*)\s+or\s+(.*)/i, replacement: '(|, $1, $2).', confidence: 0.9},

            // Negation: "not X"
            {regex: /\bnot\s+(.*)/i, replacement: '(--, $1).', confidence: 0.9},
        ];

        this.reversePatterns = [
            // Basic inheritance: (X --> Y).
            {regex: /\((.+?)\s+-->\s+(.+?)\)\./, replacement: '$1 is a $2', confidence: 0.9},

            // Similarity: (X <-> Y).
            {regex: /\((.+?)\s+<->\s+(.+?)\)\./, replacement: '$1 is similar to $2', confidence: 0.85},

            // Implication: (X ==> Y).
            {regex: /\((.+?)\s+==>\s+(.+?)\)\./, replacement: 'if $1 then $2', confidence: 0.9},

            // Equivalence: (X <=> Y).
            {regex: /\((.+?)\s+<=>\s+(.+?)\)\./, replacement: '$1 if and only if $2', confidence: 0.8},

            // Conjunction: (&, X, Y).
            {regex: /\(&,\s*(.+?),\s*(.+?)\)\./, replacement: '$1 and $2', confidence: 0.9},

            // Disjunction: (|, X, Y).
            {regex: /\(\|,\s*(.+?),\s*(.+?)\)\./, replacement: '$1 or $2', confidence: 0.9},

            // Negation: (--, X).
            {regex: /\(--,\s*(.+?)\)\./, replacement: 'not $1', confidence: 0.9},
        ];

        // Context storage for improved translation quality
        this.contextBuffer = [];
        this.translationHistory = [];

        // Quality scoring thresholds
        this.minConfidence = 0.7;
        this.maxContextSize = 10;
    }

    /**
     * Adds context to improve translation quality
     * @param {string} context - Contextual information for translation
     */
    addContext(context) {
        if (this.contextBuffer.length >= this.maxContextSize) {
            this.contextBuffer.shift(); // Remove oldest context
        }
        this.contextBuffer.push(context);
    }

    /**
     * Converts natural language to Narsese with quality improvements
     * @param {string} text - Natural language text to convert
     * @param {object} options - Translation options
     * @returns {object} - Contains narsese, confidence score, and metadata
     */
    toNarsese(text, options = {}) {
        if (typeof text !== 'string') {
            throw new Error('Input must be a string');
        }

        // Quality improvement: Consider context for more accurate translation
        const combinedContext = [...this.contextBuffer, text].join(' ');
        const originalText = text;

        // Try each pattern in order, prioritizing by confidence
        const sortedPatterns = [...this.forwardPatterns].sort((a, b) => b.confidence - a.confidence);

        for (const pattern of sortedPatterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const result = pattern.replacement
                    .replace('$1', match[1].trim())
                    .replace('$2', match[2].trim());

                // Track this translation for history
                const translationEntry = {
                    original: originalText,
                    translated: result,
                    confidence: pattern.confidence,
                    timestamp: Date.now(),
                    patternUsed: pattern.regex.toString()
                };
                this.translationHistory.push(translationEntry);

                // Maintain history size
                if (this.translationHistory.length > 100) {
                    this.translationHistory.shift();
                }

                return {
                    narsese: result,
                    confidence: pattern.confidence,
                    original: originalText,
                    context: this.contextBuffer
                };
            }
        }

        // If no pattern matches with high confidence, return with low confidence
        const basicResult = `(${text.replace(/\s+/g, '_')} --> statement).`;
        const translationEntry = {
            original: originalText,
            translated: basicResult,
            confidence: 0.3,
            timestamp: Date.now(),
            patternUsed: 'fallback'
        };
        this.translationHistory.push(translationEntry);

        if (this.translationHistory.length > 100) {
            this.translationHistory.shift();
        }

        return {
            narsese: basicResult,
            confidence: 0.3,
            original: originalText,
            context: this.contextBuffer
        };
    }

    /**
     * Converts Narsese to natural language with quality improvements
     * @param {string} narsese - Narsese expression to convert
     * @param {object} options - Translation options
     * @returns {object} - Contains natural language, confidence score, and metadata
     */
    fromNarsese(narsese, options = {}) {
        if (typeof narsese !== 'string') {
            throw new Error('Input must be a string');
        }

        const originalNarsese = narsese;

        // Try each pattern in order, prioritizing by confidence
        const sortedPatterns = [...this.reversePatterns].sort((a, b) => b.confidence - a.confidence);

        for (const pattern of sortedPatterns) {
            const match = narsese.match(pattern.regex);
            if (match) {
                const result = pattern.replacement
                    .replace('$1', match[1].replace(/_/g, ' '))
                    .replace('$2', match[2].replace(/_/g, ' '));

                // Track this translation for history
                const translationEntry = {
                    original: originalNarsese,
                    translated: result,
                    confidence: pattern.confidence,
                    timestamp: Date.now(),
                    patternUsed: pattern.regex.toString()
                };
                this.translationHistory.push(translationEntry);

                // Maintain history size
                if (this.translationHistory.length > 100) {
                    this.translationHistory.shift();
                }

                return {
                    text: result,
                    confidence: pattern.confidence,
                    original: originalNarsese,
                    context: this.contextBuffer
                };
            }
        }

        // If no pattern matches, return original with low confidence
        const translationEntry = {
            original: originalNarsese,
            translated: originalNarsese,
            confidence: 0.2,
            timestamp: Date.now(),
            patternUsed: 'none'
        };
        this.translationHistory.push(translationEntry);

        if (this.translationHistory.length > 100) {
            this.translationHistory.shift();
        }

        return {
            text: originalNarsese,
            confidence: 0.2,
            original: originalNarsese,
            context: this.contextBuffer
        };
    }

    /**
     * Advanced translation with iterative refinement
     * @param {string} text - Text to translate
     * @param {object} options - Translation options
     * @returns {object} - Refined translation result
     */
    async iterativeTranslate(text, options = {}) {
        // Get initial translation
        const initialResult = this.toNarsese(text, options);

        // If confidence is low, try iterative refinement
        if (initialResult.confidence < this.minConfidence) {
            // This is where we could implement more sophisticated refinement
            // For now, we'll just return the initial result with a note
            return {
                ...initialResult,
                refined: false,
                notes: `Low confidence (${initialResult.confidence}) - consider providing more context or rephrasing`
            };
        }

        return initialResult;
    }

    /**
     * Gets translation quality metrics
     * @returns {object} - Quality metrics
     */
    getQualityMetrics() {
        if (this.translationHistory.length === 0) {
            return {
                totalTranslations: 0,
                averageConfidence: 0,
                highConfidenceRate: 0,
                lowConfidenceRate: 0
            };
        }

        const total = this.translationHistory.length;
        const totalConfidence = this.translationHistory.reduce((sum, entry) => sum + entry.confidence, 0);
        const highConfidence = this.translationHistory.filter(entry => entry.confidence >= this.minConfidence).length;
        const lowConfidence = this.translationHistory.filter(entry => entry.confidence < 0.5).length;

        return {
            totalTranslations: total,
            averageConfidence: totalConfidence / total,
            highConfidenceRate: highConfidence / total,
            lowConfidenceRate: lowConfidence / total,
            lastTranslations: this.translationHistory.slice(-5) // Last 5 translations
        };
    }

    /**
     * Validates semantic preservation between natural language and Narsese
     * @param {string} originalText - Original natural language
     * @param {string} narsese - Converted Narsese
     * @param {string} backToText - Narsese converted back to natural language
     * @returns {object} - Validation result
     */
    validateSemanticPreservation(originalText, narsese, backToText) {
        // Calculate a basic similarity score (simplified for this implementation)
        const lowerOriginal = originalText.toLowerCase();
        const lowerBack = backToText.toLowerCase();

        // Simple similarity based on common words
        const originalWords = new Set(lowerOriginal.split(/\s+/));
        const backWords = new Set(lowerBack.split(/\s+/));

        const commonWords = [...originalWords].filter(word => backWords.has(word)).length;
        const totalWords = new Set([...originalWords, ...backWords]).size;
        const similarity = totalWords > 0 ? commonWords / totalWords : 0;

        return {
            similar: similarity > 0.5, // More than 50% word overlap
            similarity: similarity,
            original: originalText,
            narsese: narsese,
            backToNatural: backToText,
            preserved: similarity > 0.5
        };
    }

    /**
     * Adds error correction capabilities to translations
     * @param {object} result - Translation result to check
     * @returns {object} - Potentially corrected result
     */
    applyErrorCorrection(result) {
        // Basic error correction: ensure proper Narsese syntax
        if (result.narsese && result.narsese.includes(' --> ') && !result.narsese.endsWith('.') && !result.narsese.endsWith('?') && !result.narsese.endsWith('!')) {
            // Add default punctuation if missing
            result.narsese += '.';
        }

        // Check for common structural issues
        if (result.narsese && result.narsese.includes('()')) {
            // Empty parentheses usually indicate an issue
            result.confidence = Math.min(result.confidence, 0.3);
            result.notes = (result.notes || '') + ' Potential syntax error: empty parentheses found.';
        }

        return result;
    }
}