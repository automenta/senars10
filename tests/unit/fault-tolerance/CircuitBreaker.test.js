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
        let failureCount = 0;
        const fn = () => {
            failureCount++;
            return Promise.reject(new Error('failure'));
        };
        
        // First failure
        await expect(cb.execute(fn)).rejects.toThrow('failure');
        expect(cb.getState().state).toBe('CLOSED');
        
        // Second failure - should open the circuit
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
        
        // Cause circuit to open
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('OPEN');
        
        // Try to execute while open - should throw circuit breaker error
        await expect(cb.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
        expect(successCallCount).toBe(0);
    });

    test('Circuit breaker transitions to HALF_OPEN after timeout', async () => {
        const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 10 }); // Need 2 failures to open
        
        // Cause first failure (doesn't open circuit yet)
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('CLOSED'); // Should still be closed after 1 failure
        
        // Cause second failure (now opens circuit)
        await expect(cb.execute(() => Promise.reject(new Error('failure')))).rejects.toThrow();
        expect(cb.getState().state).toBe('OPEN'); // Should now be open after 2 failures
        
        // Wait for reset timeout to expire
        await new Promise(resolve => setTimeout(resolve, 15));
        
        // After timeout, the next call should succeed (transitioning from OPEN -> HALF_OPEN -> CLOSED after success)
        const fn = () => Promise.resolve('success');
        await expect(cb.execute(fn)).resolves.toBe('success');
        
        // After a successful call, it should be CLOSED
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