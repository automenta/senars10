import {TermFactory} from '../term/TermFactory.js';

const PUNCTUATION_TYPE_MAP = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
const INFIX_OPERATORS = ['-->', '<->', '==>', '<=>', '^', '{{--', '--}}', '='];
const PREFIX_OPERATORS = [['--, ', '--'], ['&, ', '&'], ['|, ', '|'], ['&/, ', '&/']];
const BRACKETS = {'(': ')', '{': '}', '[': ']'};
const BRACKET_STARTS = Object.keys(BRACKETS);
const BRACKET_ENDS = Object.values(BRACKETS);

export class NarseseParser {
    constructor(termFactory) {
        this.termFactory = termFactory || new TermFactory();
    }

    parse = input => {
        this._validateInput(input);
        const {termPart, punctuation, truthValue} = this.splitStatement(input.trim());
        return {
            term: this.parseTerm(termPart),
            punctuation,
            truthValue,
            taskType: PUNCTUATION_TYPE_MAP[punctuation] || 'BELIEF',
        };
    };

    parseTerm = input => this.termFactory.create(this.parseTermData(input));

    parseTermData = input => {
        const trimmed = input.trim();

        // Handle function call notation: f(x,y) as shorthand for f ^ (x,y)
        if (trimmed.includes('(') && trimmed.endsWith(')')) {
            const match = trimmed.match(/^([^(]+)\((.*)\)$/);
            if (match) {
                const functionName = match[1].trim();
                const argsStr = match[2].trim();

                if (argsStr) {
                    const args = this.parseList(argsStr);
                    return {
                        operator: '^',
                        components: [
                            {components: [functionName]},
                            {
                                operator: ',',
                                components: [{components: ['*']}, ...args]
                            }
                        ]
                    };
                } else {
                    return {
                        operator: '^',
                        components: [
                            {components: [functionName]},
                            {
                                operator: ',',
                                components: [{components: ['*']}]
                            }
                        ]
                    };
                }
            }
        }

        for (const [start, end] of Object.entries(BRACKETS)) {
            if (trimmed.startsWith(start) && trimmed.endsWith(end)) {
                const inner = trimmed.slice(1, -1).trim();
                const needsCompoundParsing = /\s*(-->|<->|==>|\<\=>|\\\^|\{\{--|--\}\}|&,\s|\|\s|\&\/\s)/.test(inner);
                if (needsCompoundParsing) return this.parseCompound(inner);
                const operator = start === '(' ? ',' : (start === '{' ? '{}' : '[]');
                return {operator, components: this.parseList(inner)};
            }
        }
        return {components: [trimmed]};
    };

    parseCompound = inner => {
        return this._findInfixOperator(inner) || this._findPrefixOperator(inner) ||
            (() => {
                const components = this.parseList(inner);
                return components.length > 1 ? {operator: ',', components} : {components: [inner]};
            })();
    };

    _findInfixOperator = inner => {
        let parenDepth = 0, mainOp = null, mainOpIndex = -1;
        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            parenDepth += BRACKET_STARTS.includes(char) ? 1 : BRACKET_ENDS.includes(char) ? -1 : 0;
            if (parenDepth === 0) {
                for (const op of INFIX_OPERATORS) {
                    const spacedOp = ` ${op} `;
                    if (inner.startsWith(spacedOp, i) && (mainOpIndex === -1 || i < mainOpIndex)) {
                        mainOp = spacedOp;
                        mainOpIndex = i;
                    }
                }
            }
        }
        if (mainOp) {
            const left = inner.substring(0, mainOpIndex).trim();
            const right = inner.substring(mainOpIndex + mainOp.length).trim();
            return {operator: mainOp.trim(), components: [this.parseTermData(left), this.parseTermData(right)]};
        }
        return null;
    };

    _findPrefixOperator = inner => {
        for (const [prefix, op] of PREFIX_OPERATORS) {
            if (inner.startsWith(prefix)) return {
                operator: op,
                components: this.parseList(inner.slice(prefix.length).trim())
            };
        }
        return null;
    };

    parseList = str => {
        if (!str) return [];
        const parts = [];
        let current = '', depth = 0;
        for (const char of str) {
            depth += BRACKET_STARTS.includes(char) ? 1 : BRACKET_ENDS.includes(char) ? -1 : 0;
            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current.trim()) parts.push(current.trim());
        return parts.map(part => this.parseTermData(part));
    };

    splitStatement = input => {
        let termPart = input, punctuation = null, truthValue = null;
        const truthMatch = termPart.match(/%([0-9]*\.?[0-9]+);([0-9]*\.?[0-9]+)%/);
        if (truthMatch) {
            truthValue = this.parseTruth(truthMatch[0]);
            termPart = termPart.replace(truthMatch[0], '').trim();
        } else if (input.includes('%')) throw new Error('Invalid truth value format');

        const lastChar = termPart.slice(-1);
        if (!['.', '!', '?'].includes(lastChar)) throw new Error('Missing punctuation');
        punctuation = lastChar;
        termPart = termPart.slice(0, -1).trim();
        if (!termPart) throw new Error('Missing term');
        return {termPart, punctuation, truthValue};
    };

    parseTruth = truthStr => {
        const [f, c] = truthStr.slice(1, -1).split(';').map(Number);
        if (f < 0 || f > 1 || c < 0 || c > 1) throw new Error(`Invalid truth value: f=${f}, c=${c}`);
        return {frequency: f, confidence: c};
    };

    _validateInput = input => {
        if (typeof input !== 'string') throw new Error('Input must be a string');
        if (!input.trim()) throw new Error('Empty input');
    };
}