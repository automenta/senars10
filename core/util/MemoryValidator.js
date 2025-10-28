export class MemoryValidator {
    constructor(options = {}) {
        this.options = {
            enableChecksums: options.enableChecksums !== false,
            validationInterval: options.validationInterval || 30000,
            algorithm: options.algorithm || 'simple-hash',
            ...options
        };
        
        this.checksums = new Map();
        this.isEnabled = true;
    }

    calculateChecksum(obj) {
        if (!this.isEnabled || !this.options.enableChecksums) {
            return null;
        }

        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString();
    }

    storeChecksum(key, obj) {
        if (!this.isEnabled) return;
        
        const checksum = this.calculateChecksum(obj);
        if (checksum) {
            this.checksums.set(key, checksum);
        }
        return checksum;
    }

    validate(key, obj) {
        if (!this.isEnabled || !this.options.enableChecksums) {
            return { valid: true, message: 'Validation disabled' };
        }

        const expectedChecksum = this.checksums.get(key);
        if (!expectedChecksum) {
            this.storeChecksum(key, obj);
            return { valid: true, message: 'First validation - stored checksum' };
        }

        const actualChecksum = this.calculateChecksum(obj);
        if (!actualChecksum) {
            return { valid: false, message: 'Could not calculate checksum' };
        }

        if (expectedChecksum !== actualChecksum) {
            return {
                valid: false,
                message: 'Memory corruption detected',
                expected: expectedChecksum,
                actual: actualChecksum
            };
        }

        return { valid: true, message: 'Valid' };
    }

    validateBatch(validations) {
        return validations.map(([key, obj]) => ({
            key,
            result: this.validate(key, obj)
        }));
    }

    enable() { this.isEnabled = true; }
    disable() { this.isEnabled = false; }
    clear() { this.checksums.clear(); }
    getChecksums() { return new Map(this.checksums); }

    updateChecksum(key, obj) {
        if (!this.isEnabled) return;
        
        const checksum = this.calculateChecksum(obj);
        if (checksum) {
            this.checksums.set(key, checksum);
        }
        return checksum;
    }
}