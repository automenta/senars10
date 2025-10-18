import {TermFactory} from '../term/TermFactory.js';

const PUNCTUATION_TYPE_MAP = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
const INFIX_OPERATORS = ['-->', '<->', '==>', '<=>', '^', '{{--', '--}}'];
const PREFIX_OPERATORS = [['--, ', '--'], ['&, ', '&'], ['|, ', '|'], ['&/, ', '&/']];
const BRACKET_PARSERS = [
    {start: '(', end: ')', handler: 'parseCompound'},
    {start: '{', end: '}', operator: '{}'},
    {start: '[', end: ']', operator: '[]'},
];

export class NarseseParser {
    constructor() {
        this.termFactory = new TermFactory();
    }

    parse(input) {
        if (typeof input !== 'string') throw new Error('Input must be a string');
        const trimmed = input.trim();
        if (!trimmed) throw new Error('Empty input');

        const {termPart, punctuation, truthValue} = this.splitStatement(trimmed);
        return {
            term: this.parseTerm(termPart),
            punctuation,
            truthValue,
            taskType: PUNCTUATION_TYPE_MAP[punctuation] || 'BELIEF',
        };
    }

    parseTerm(input) {
        return this.termFactory.create(this.parseTermData(input));
    }

    parseTermData(input) {
        const trimmed = input.trim();

        for (const {start, end, handler, operator} of BRACKET_PARSERS) {
            if (trimmed.startsWith(start) && trimmed.endsWith(end)) {
                const inner = trimmed.slice(1, -1).trim();
                if (handler) return this[handler](inner);
                return {operator, components: this.parseList(inner)};
            }
        }

        return {components: [trimmed]};
    }

    parseCompound(inner) {
        const infixResult = this._findInfixOperator(inner);
        if (infixResult) return infixResult;

        const prefixResult = this._findPrefixOperator(inner);
        if (prefixResult) return prefixResult;

        const components = this.parseList(inner);
        return components.length > 1 ? {operator: ',', components} : {components: [inner]};
    }

    _findInfixOperator(inner) {
        let parenDepth = 0;
        let mainOp = null;
        let mainOpIndex = -1;

        for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (['(', '{', '['].includes(char)) parenDepth++;
            else if ([')', '}', ']'].includes(char)) parenDepth--;
            else if (parenDepth === 0) {
                for (const op of INFIX_OPERATORS) {
                    const spacedOp = ` ${op} `;
                    if (inner.startsWith(spacedOp, i) && (mainOpIndex === -1 || i < mainOpIndex)) {
                        mainOp = spacedOp;
                        mainOpIndex = i;
                    }
                }
            }
        }

        if (mainOp !== null) {
            const left = inner.substring(0, mainOpIndex).trim();
            const right = inner.substring(mainOpIndex + mainOp.length).trim();
            return {
                operator: mainOp.trim(),
                components: [this.parseTermData(left), this.parseTermData(right)],
            };
        }
        return null;
    }

    _findPrefixOperator(inner) {
        for (const [prefix, op] of PREFIX_OPERATORS) {
            if (inner.startsWith(prefix)) {
                return {operator: op, components: this.parseList(inner.slice(prefix.length).trim())};
            }
        }
        return null;
    }

    parseList(str) {
        if (!str) return [];
        const parts = [];
        let current = '';
        let depth = 0;

        for (const char of str) {
            if (['(', '[', '{'].includes(char)) depth++;
            else if ([')', ']', '}'].includes(char)) depth--;
            else if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }

        if (current.trim()) parts.push(current.trim());
        return parts.map(part => this.parseTermData(part));
    }

    splitStatement(input) {
        let termPart = input;
        let punctuation = null;
        let truthValue = null;

        const truthRegex = /%([0-9]*\.?[0-9]+);([0-9]*\.?[0-9]+)%/;
        const truthMatch = termPart.match(truthRegex);

        if (truthMatch) {
            truthValue = this.parseTruth(truthMatch[0]);
            termPart = termPart.replace(truthRegex, '').trim();
        } else if (input.includes('%')) {
            throw new Error('Invalid truth value format');
        }

        const lastChar = termPart.slice(-1);
        if (!['.', '!', '?'].includes(lastChar)) {
            throw new Error('Missing punctuation');
        }
        punctuation = lastChar;
        termPart = termPart.slice(0, -1).trim();

        if (!termPart) {
            throw new Error('Missing term');
        }

        return {termPart, punctuation, truthValue};
    }

    parseTruth(truthStr) {
        const [f, c] = truthStr.slice(1, -1).split(';').map(Number);
        if (f < 0 || f > 1) throw new Error(`Invalid frequency: ${f}`);
        if (c < 0 || c > 1) throw new Error(`Invalid confidence: ${c}`);
        return {frequency: f, confidence: c};
    }
}