import { NALRule } from '../NALRule.js';
import { Task } from '../../task/Task.js';
import { Truth } from '../../Truth.js';

/**
 * A base class for temporal reasoning rules.
 */
export class TemporalRule extends NALRule {
    constructor(id, premises, conclusion, truthFunction) {
        super(id, premises, conclusion, truthFunction);
    }
}

/**
 * Implements the temporal projection rule.
 * Derives a belief about the future from a belief about the present.
 *
 * Premise: <S --> P>. %f1, c1%
 * Conclusion: <S --> P>. %f_proj, c_proj% (with a future tense)
 */
export class ProjectionRule extends TemporalRule {
    static create(termFactory) {
        const S = termFactory.create('?S');
        const P = termFactory.create('?P');

        const premise = termFactory.create({ operator: '-->', components: [S, P] });
        const conclusion = termFactory.create({ operator: '-->', components: [S, P], tense: 'future' });

        return new ProjectionRule(
            'temporal/projection',
            [premise],
            conclusion,
            (t1) => Truth.projection(t1, 10) // Project 10 cycles into the future (configurable)
        );
    }
}
