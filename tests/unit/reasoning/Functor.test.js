import {ConcreteFunctor, Functor, FunctorRegistry} from '../../../src/reasoning/Functor.js';

describe('Functor', () => {
    test('cannot instantiate abstract class directly', () => {
        expect(() => new Functor()).toThrow(TypeError);
    });

    test('validates arguments correctly', () => {
        class TestFunctor extends Functor {
        }

        const addFunctor = new TestFunctor('add', (a, b) => a + b, {arity: 2});
        expect(addFunctor.validate(1, 2)).toBe(true);
        expect(addFunctor.validate(1)).toBe(false);
    });

    test('calls function correctly', () => {
        class TestFunctor extends Functor {
        }

        const addFunctor = new TestFunctor('add', (a, b) => a + b, {arity: 2});
        expect(addFunctor.call(2, 3)).toBe(5);
    });
});

describe('FunctorRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new FunctorRegistry();
    });

    test('registers and retrieves functors', () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, {arity: 2});
        registry.register('add', addFunctor);

        const retrieved = registry.get('add');
        expect(retrieved).not.toBeNull();
        expect(retrieved.name).toBe('add');
    });

    test('registers function directly', () => {
        const addFunc = (a, b) => a + b;
        registry.register('add', addFunc);

        const retrieved = registry.get('add');
        expect(retrieved).not.toBeNull();
        expect(retrieved.name).toBe('add');
        expect(retrieved.arity).toBe(0); // Default arity for function wrapping
    });

    test('executes registered functors', () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, {arity: 2});
        registry.register('add', addFunctor);

        const result = registry.execute('add', 3, 5);
        expect(result).toBe(8);
    });

    test('registers with aliases', () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, {arity: 2});
        registry.register('add', addFunctor, ['plus', 'sum']);

        expect(registry.has('add')).toBe(true);
        expect(registry.has('plus')).toBe(true);
        expect(registry.has('sum')).toBe(true);

        const result = registry.execute('plus', 2, 3);
        expect(result).toBe(5);
    });

    test('unregisters functors', () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, {arity: 2});
        registry.register('add', addFunctor);

        expect(registry.has('add')).toBe(true);
        registry.unregister('add');
        expect(registry.has('add')).toBe(false);
    });

    test('gets stats', () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, {arity: 2});
        registry.register('add', addFunctor, ['plus', 'sum']);

        const stats = registry.getStats();
        expect(stats.functorCount).toBe(1);
        expect(stats.aliasCount).toBe(2); // plus and sum are aliases
    });
});