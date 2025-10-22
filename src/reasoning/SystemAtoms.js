import {Term} from '../term/Term.js';

/**
 * System constants and primitive terms for evaluation
 */

export const TRUE_TERM = new Term('atom', 'True', ['True']);
export const FALSE_TERM = new Term('atom', 'False', ['False']);
export const NULL_TERM = new Term('atom', 'Null', ['Null']);

export const SYSTEM_ATOMS = {
    'True': TRUE_TERM,
    'False': FALSE_TERM,
    'Null': NULL_TERM
};

export const isSystemAtom = (term) => {
    if (!term || !term.name) return false;
    return ['True', 'False', 'Null'].includes(term.name);
};

export const isTrue = (term) => {
    return term && term.name === 'True';
};

export const isFalse = (term) => {
    return term && term.name === 'False';
};

export const isNull = (term) => {
    return term && term.name === 'Null';
};