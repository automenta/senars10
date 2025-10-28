/**
 * PrologParser.js - Parser that translates Prolog syntax into SeNARS beliefs/goals
 */

import { TermFactory } from '../term/TermFactory.js';
import { Task } from '../task/Task.js';
import { Truth } from '../Truth.js';

export class PrologParser {
    constructor(termFactory = null) {
        this.termFactory = termFactory || new TermFactory();
    }

    /**
     * Parse Prolog syntax and convert to SeNARS tasks (beliefs/goals)
     */
    parseProlog(prologInput) {
        return prologInput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('%'))
            .flatMap(line => this._parseLine(line));
    }
    
    _parseLine(line) {
        if (this._isRule(line)) return this._parseRule(line);
        if (this._isFact(line)) return [this._parseFact(line)];
        if (this._isQuery(line)) return [this._parseQuery(line)];
        return [];
    }

    _isFact(line) {
        return line.endsWith('.') && !line.includes(':-');
    }

    _isRule(line) {
        return line.includes(':-');
    }

    _isQuery(line) {
        return line.endsWith(' ?');
    }

    /**
     * Parse a Prolog fact: predicate(args).
     * Translates to: <predicate(args) --> True>. %1.0;0.9%
     */
    _parseFact(factLine) {
        const fact = factLine.replace(/\.$/, '').trim(); // Remove trailing dot
        
        // Parse: predicate(arg1, arg2, ...)
        const match = fact.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(.*)\s*\)$/);
        if (!match) {
            throw new Error(`Invalid fact format: ${factLine}`);
        }
        
        const [_, predicate, argsStr] = match;
        const args = this._parseArguments(argsStr);
        
        // Create the relation term: predicate(args) using helper
        const relationTerm = this._createPredicateTerm(predicate, args);
        
        // Create a belief task with high truth value
        return new Task({
            term: relationTerm,
            punctuation: '.',  // Belief
            truth: new Truth(1.0, 0.9),  // High frequency and confidence
            budget: { priority: 0.8, durability: 0.7, quality: 0.8 }
        });
    }

    /**
     * Parse a Prolog rule: head :- body.
     * Translates to conditional statements in NARS format
     */
    _parseRule(ruleLine) {
        const rule = ruleLine.replace(/\.$/, '').trim(); // Remove trailing dot
        const parts = rule.split(':-');
        
        if (parts.length !== 2) {
            throw new Error(`Invalid rule format: ${ruleLine}`);
        }
        
        const [headStr, bodyStr] = parts;
        const head = headStr.trim();
        const body = bodyStr.trim();
        
        const tasks = [];
        
        // Parse the head of the rule (conclusion)
        const headTask = this._parseFact(`${head}.`);
        tasks.push(headTask);
        
        // For body components, parse each part separated by comma
        // Need to handle commas inside parentheses properly
        const bodyParts = this._splitRuleBody(body);
        
        for (const bodyPart of bodyParts) {
            const bodyTask = this._parseFact(`${bodyPart.trim()}.`);
            tasks.push(bodyTask);
        }
        
        return tasks;
    }
    
    /**
     * Split rule body by commas, respecting nested structures
     */
    _splitRuleBody(bodyStr) {
        if (!bodyStr) return [];
        
        const parts = [];
        let currentPart = '';
        let parenLevel = 0;
        
        for (let i = 0; i < bodyStr.length; i++) {
            const char = bodyStr[i];
            
            if (char === '(') {
                parenLevel++;
                currentPart += char;
            } else if (char === ')') {
                parenLevel--;
                currentPart += char;
            } else if (char === ',' && parenLevel === 0) {
                parts.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }
        
        return parts;
    }

    /**
     * Parse a Prolog query: predicate(args) ?
     * Translates to a question in SeNARS
     */
    _parseQuery(queryLine) {
        const query = queryLine.replace(/\s*\?$/, '').trim(); // Remove trailing question mark
        
        const match = query.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(.*)\s*\)$/);
        if (!match) {
            throw new Error(`Invalid query format: ${queryLine}`);
        }
        
        const [_, predicate, argsStr] = match;
        const args = this._parseArguments(argsStr);
        
        // Create the query term using helper
        const queryTerm = this._createPredicateTerm(predicate, args);
        
        // Create a question task
        return new Task({
            term: queryTerm,
            punctuation: '?'  // Question
        });
    }
    
    /**
     * Helper method to create predicate term structure from arguments
     * @param {string} predicate - Predicate name
     * @param {Array} args - Array of argument strings
     * @returns {Term} Created predicate term
     */
    _createPredicateTerm(predicate, args) {
        // Create the predicate term: predicate(args)
        const argTerms = args.map(arg => {
            if (arg.startsWith('_') || /^[A-Z]/.test(arg)) {
                // Variable
                return this.termFactory.create({ name: `?${arg.toLowerCase()}`, type: 'variable' });
            } else {
                // Constant
                return this.termFactory.create({ name: arg.toLowerCase(), type: 'atomic' });
            }
        });
        
        const argsTerm = this.termFactory.create({ 
            operator: ',', 
            components: argTerms 
        });
        
        const predicateTerm = this.termFactory.create({ name: predicate, type: 'atomic' });
        
        return this.termFactory.create({
            operator: '^',  // Operation operator in NARS
            components: [predicateTerm, argsTerm]
        });
    }

    /**
     * Parse arguments string, handling nested terms and lists
     */
    _parseArguments(argsStr) {
        // Simple argument parsing for basic cases
        // In a full implementation, this would handle nested terms and lists
        const args = [];
        let currentArg = '';
        let parenLevel = 0;
        let inQuotes = false;
        let quoteChar = null;

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            
            if (!inQuotes) {
                if (char === '(') {
                    parenLevel++;
                    currentArg += char;
                } else if (char === ')') {
                    parenLevel--;
                    currentArg += char;
                } else if (char === ',' && parenLevel === 0) {
                    args.push(currentArg.trim());
                    currentArg = '';
                } else if (char === '"' || char === "'") {
                    inQuotes = true;
                    quoteChar = char;
                    currentArg += char;
                } else {
                    currentArg += char;
                }
            } else {
                currentArg += char;
                if (char === quoteChar && argsStr[i - 1] !== '\\') {
                    inQuotes = false;
                    quoteChar = null;
                }
            }
        }
        
        if (currentArg.trim()) {
            args.push(currentArg.trim());
        }
        
        return args;
    }
}

/**
 * Convenience function to parse Prolog and return SeNARS tasks
 */
export function parsePrologToNars(prologString, termFactory = null) {
    const parser = new PrologParser(termFactory);
    return parser.parseProlog(prologString);
}