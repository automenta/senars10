export class CircuitBreaker {
    constructor(options = {}) {
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            timeout: options.timeout || 60000,
            resetTimeout: options.resetTimeout || 30000,
            halfOpenAttempts: options.halfOpenAttempts || 1,
            ...options
        };

        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(fn, context = {}) {
        if (this.state === 'OPEN' && this.isResetTimeoutExpired()) {
            this.state = 'HALF_OPEN';
            this.successCount = 0;
        }
        
        if (this.state !== 'HALF_OPEN' && this.shouldOpen()) {
            this.state = 'OPEN';
            this.lastFailureTime = Date.now();
            throw new Error('Circuit breaker is OPEN');
        }

        try {
            const result = await fn(context);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.successCount++;
        if (this.state === 'HALF_OPEN' && this.successCount >= this.options.halfOpenAttempts) {
            this.state = 'CLOSED';
            this.successCount = 0;
        }
    }

    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'OPEN';
            this.lastFailureTime = Date.now();
        }
    }

    shouldOpen() { return this.failureCount >= this.options.failureThreshold; }
    isResetTimeoutExpired() { return Date.now() - this.lastFailureTime >= this.options.resetTimeout; }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            shouldOpen: this.shouldOpen(),
            isResetTimeoutExpired: this.isResetTimeoutExpired()
        };
    }

    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
    }

    forceOpen() {
        this.state = 'OPEN';
        this.lastFailureTime = Date.now();
    }

    forceClose() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
    }
}

export const withCircuitBreaker = (fn, circuitBreakerOptions = {}) => {
    const circuitBreaker = new CircuitBreaker(circuitBreakerOptions);
    
    return async (...args) => circuitBreaker.execute(() => fn(...args));
};