import { EvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { VariableBindingUtils } from '../../src/reasoning/VariableBindingUtils.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { Term } from '../../src/term/Term.js';
import { SYSTEM_ATOMS } from '../../src/reasoning/SystemAtoms.js';
import { PatternMatcher } from '../../src/reasoning/nal/PatternMatcher.js';

describe('Phase 8: Debugging Atomic Equality', () => {
    let engine;
    let termFactory;

    beforeEach(() => {
        engine = new EvaluationEngine(null, null, { enableCaching: false });
        termFactory = new TermFactory();
    });

    test('debug simple atomic equality', async () => {
        const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        const anotherFiveTerm = termFactory.create({ name: '5', type: 'atomic' });
        
        // Check what values they return
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, anotherFiveTerm] });
        
        const result = await engine.evaluate(equalityTerm);
        
        expect(result.success).toBe(true);
        expect(result.result).toBe(SYSTEM_ATOMS.True);
    });
});