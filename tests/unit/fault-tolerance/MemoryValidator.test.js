import { MemoryValidator } from '../../../src/util/MemoryValidator.js';

describe('Memory Validator Tests', () => {
    let validator;

    beforeEach(() => {
        validator = new MemoryValidator();
    });

    test('Initial state is valid', () => {
        expect(validator.isEnabled).toBe(true);
        expect(validator.calculateChecksum({ test: 'value' })).not.toBeNull();
    });

    test('Checksum calculation is consistent', () => {
        const obj = { test: 'value', num: 42 };
        const checksum1 = validator.calculateChecksum(obj);
        const checksum2 = validator.calculateChecksum(obj);
        
        expect(checksum1).toBe(checksum2);
    });

    test('Different objects have different checksums', () => {
        const obj1 = { test: 'value1' };
        const obj2 = { test: 'value2' };
        
        const checksum1 = validator.calculateChecksum(obj1);
        const checksum2 = validator.calculateChecksum(obj2);
        
        expect(checksum1).not.toBe(checksum2);
    });

    test('Store and validate checksum', () => {
        const obj = { data: 'test' };
        const key = 'test-key';
        
        validator.storeChecksum(key, obj);
        const result = validator.validate(key, obj);
        
        expect(result.valid).toBe(true);
    });

    test('Detects object modification', () => {
        const obj = { data: 'original' };
        const key = 'test-key';
        
        validator.storeChecksum(key, obj);
        
        obj.data = 'modified';
        const result = validator.validate(key, obj);
        
        expect(result.valid).toBe(false);
        expect(result.message).toBe('Memory corruption detected');
    });

    test('Batch validation works', () => {
        const obj1 = { data: 'test1' };
        const obj2 = { data: 'test2' };
        
        const validations = [
            ['key1', obj1],
            ['key2', obj2]
        ];
        
        validator.storeChecksum('key1', obj1);
        validator.storeChecksum('key2', obj2);
        
        const results = validator.validateBatch(validations);
        
        expect(results).toHaveLength(2);
        expect(results[0].result.valid).toBe(true);
        expect(results[1].result.valid).toBe(true);
    });

    test('Batch validation detects corruption', () => {
        const obj1 = { data: 'test1' };
        const obj2 = { data: 'test2' };
        
        const validations = [
            ['key1', obj1],
            ['key2', obj2]
        ];
        
        validator.storeChecksum('key1', obj1);
        validator.storeChecksum('key2', obj2);
        
        obj2.data = 'modified';
        
        const results = validator.validateBatch(validations);
        
        expect(results).toHaveLength(2);
        expect(results[0].result.valid).toBe(true);
        expect(results[1].result.valid).toBe(false);
    });

    test('Disable validation', () => {
        validator.disable();
        
        const obj = { data: 'test' };
        const result = validator.validate('test-key', obj);
        
        expect(result.valid).toBe(true);
        expect(result.message).toBe('Validation disabled');
    });
});