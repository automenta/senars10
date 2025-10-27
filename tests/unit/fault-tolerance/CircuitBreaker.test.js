import { CircuitBreaker, withCircuitBreaker } from '../../../src/util/CircuitBreaker.js';

describe('Circuit Breaker Tests', () => {
    test('Circuit breaker starts in CLOSED state', () => {
        const cb = new CircuitBreaker();
        expect(cb.getState().state).toBe('CLOSED');
    });

    test('Circuit breaker executes function successfully in CLOSED state', async () => {
        const cb = new CircuitBreaker();
        let callCount = 0;
        const fn = () => {
            callCount++;
            return Promise.resolve('success');
        };
        
        const result = await cb.execute(fn);
        expect(result).toBe('success');
        expect(callCount).toBe(1);
    });

    test('Circuit breaker opens after threshold failures', async () => {
        const cb = new CircuitBreaker({ failureThreshold: 2 });
        const fn = () => Promise.reject(new Error('failure'));
        
        await expect(cb.execute(fn)).rejects.toThrow('failure');
        expect(cb.getState().state).toBe('CLOSED');
        
        await expect(cb.execute(fn)).rejects.toThrow('failure');
        expect(cb.getState().state).toBe('OPEN');
    });

    test('Circuit breaker allows execution when CLOSED', async () => {
        const cb = new CircuitBreaker();
        let callCount = 0;
        const fn = () => {
            callCount++;
            return Promise.resolve('success');
        };
        
        await cb.execute(fn);
        expect(callCount).toBe(1);
        
        await cb.execute(fn);
        expect(callCount).toBe(2);
    });

    test('Circuit breaker blocks execution when OPEN', async () => {
        const cb = new CircuitBreaker({ failureThreshold: 1, timeout: 100 });
        let successCallCount = 0;
        const successFn = () => {
            successCallCount++;
            return Promise.resolve('success');
        };
        
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('OPEN');
        
        await expect(cb.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
        expect(successCallCount).toBe(0);
    });

    test('Circuit breaker transitions to HALF_OPEN after timeout', async () => {
        const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 10 });
        
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('CLOSED');
        
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('OPEN');
        
        await new Promise(resolve => setTimeout(resolve, 15));
        
        const fn = () => Promise.resolve('success');
        await expect(cb.execute(fn)).resolves.toBe('success');
        
        const finalState = cb.getState();
        expect(finalState.state).toBe('CLOSED');
    });

    test('Circuit breaker decorator works', async () => {
        let callCount = 0;
        const fn = () => {
            callCount++;
            return Promise.resolve('success');
        };
        const protectedFn = withCircuitBreaker(fn, { failureThreshold: 1 });
        
        const result = await protectedFn();
        expect(result).toBe('success');
        expect(callCount).toBe(1);
    });
});