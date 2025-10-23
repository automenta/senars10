/**
 * Vector Operations Module for SeNARS v10
 * Implements vector-aware arithmetic operations
 */

export class VectorOperations {
    static add(a, b) {
        // Check if either argument is a vector (array)
        if (Array.isArray(a) && Array.isArray(b)) {
            // Vector addition: (1,2) + (3,4) = (4,6)
            if (a.length !== b.length) return null; // Cannot add vectors of different lengths
            return a.map((val, i) => val + b[i]);
        } else if (Array.isArray(a) && typeof b === 'number') {
            // Scalar addition to vector: (1,2) + 3 = (4,5)
            return a.map(val => val + b);
        } else if (Array.isArray(b) && typeof a === 'number') {
            // Scalar addition to vector: 3 + (1,2) = (4,5)
            return b.map(val => val + a);
        } else {
            // Regular number addition
            return a + b;
        }
    }

    static subtract(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            // Vector subtraction: (4,6) - (3,4) = (1,2)
            if (a.length !== b.length) return null; // Cannot subtract vectors of different lengths
            return a.map((val, i) => val - b[i]);
        } else if (Array.isArray(a) && typeof b === 'number') {
            // Scalar subtraction from vector: (4,6) - 3 = (1,3)
            return a.map(val => val - b);
        } else if (Array.isArray(b) && typeof a === 'number') {
            // Scalar vector from number: 5 - (1,2) = (4,3)
            return b.map(val => a - val);
        } else {
            // Regular number subtraction
            return a - b;
        }
    }

    static multiply(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            // Element-wise vector multiplication: (1,2) * (3,4) = (3,8)
            if (a.length !== b.length) return null; // Cannot multiply vectors of different lengths
            return a.map((val, i) => val * b[i]);
        } else if (Array.isArray(a) && typeof b === 'number') {
            // Scalar multiplication: (2,3) * 2 = (4,6)
            return a.map(val => val * b);
        } else if (Array.isArray(b) && typeof a === 'number') {
            // Scalar multiplication: 2 * (2,3) = (4,6)
            return b.map(val => val * a);
        } else {
            // Regular number multiplication
            return a * b;
        }
    }

    static divide(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            // Element-wise vector division: (4,6) / (2,3) = (2,2)
            if (a.length !== b.length) return null; // Cannot divide vectors of different lengths
            return a.map((val, i) => b[i] !== 0 ? val / b[i] : null);
        } else if (Array.isArray(a) && typeof b === 'number') {
            // Scalar division of vector: (4,6) / 2 = (2,3)
            return a.map(val => b !== 0 ? val / b : null);
        } else if (Array.isArray(b) && typeof a === 'number') {
            // Division of number by vector: 6 / (2,3) = (3,2)
            return b.map(val => val !== 0 ? a / val : null);
        } else {
            // Regular number division
            return b !== 0 ? a / b : null;
        }
    }

    static compare(a, b) {
        if (typeof a === 'number' && typeof b === 'number') {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
        // For non-numbers, return appropriate comparison or null
        return null;
    }
}