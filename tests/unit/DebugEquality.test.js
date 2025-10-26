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
        console.log('Five term name:', fiveTerm.name);
        console.log('Another five term name:', anotherFiveTerm.name);
        console.log('Five term isAtomic:', fiveTerm.isAtomic);
        console.log('Five term value via _termToValue:', engine._termToValue(fiveTerm));
        
        const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, anotherFiveTerm] });
        console.log('Equality term operator:', equalityTerm.operator);
        console.log('Equality term components:', equalityTerm.components);
        
        const result = await engine.evaluate(equalityTerm);
        console.log('Result of equality evaluation:', result);
        console.log('Result result:', result.result);
        console.log('Result success:', result.success);
        
        expect(result.success).toBe(true);
        expect(result.result).toBe(SYSTEM_ATOMS.True);
    });
});