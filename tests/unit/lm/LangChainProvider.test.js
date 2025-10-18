/**
 * @file tests/unit/lm/LangChainProvider.test.js
 * @description Unit tests for LangChainProvider
 */

import {LangChainProvider} from '../../../src/lm/LangChainProvider.js';

describe('LangChainProvider', () => {
    describe('Ollama Provider', () => {
        test('should initialize with correct configuration', () => {
            const provider = new LangChainProvider({
                provider: 'ollama',
                modelName: 'llama2',
                baseURL: 'http://localhost:11434'
            });

            expect(provider.providerType).toBe('ollama');
            expect(provider.modelName).toBe('llama2');
        });

        test('should return model name', () => {
            const provider = new LangChainProvider({
                provider: 'ollama',
                modelName: 'llama2',
                baseURL: 'http://localhost:11434'
            });
            expect(provider.getModelName()).toBe('llama2');
        });
    });

    describe('OpenAI Provider', () => {
        test('should initialize with API key', () => {
            expect(() => new LangChainProvider({
                provider: 'openai',
                modelName: 'gpt-3.5-turbo',
                apiKey: 'test-key'
            })).not.toThrow();
        });

        test('should throw error without API key for OpenAI', () => {
            expect(() => new LangChainProvider({
                provider: 'openai',
                modelName: 'gpt-3.5-turbo'
            })).toThrow('API key is required for OpenAI provider');
        });

        test('should throw error for unsupported provider type', () => {
            expect(() => new LangChainProvider({
                provider: 'unsupported',
                modelName: 'test-model'
            })).toThrow('Unsupported provider type: unsupported');
        });
    });

    test('should have default values when not specified', () => {
        const provider = new LangChainProvider({});

        // Test that default values are properly set
        expect(provider.providerType).toBeDefined();
        expect(provider.modelName).toBeDefined();
    });
});