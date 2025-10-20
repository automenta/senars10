/**
 * @file examples/lm-providers.js
 * @description Example demonstrating the use of different LM providers
 */

// Note: This example is simplified for demonstration
// Actual implementation would require proper installation of dependencies

import {NAR} from '../src/nar/NAR.js';
import {DummyProvider} from '../src/lm/DummyProvider.js';
import {AdvancedNarseseTranslator} from '../src/lm/AdvancedNarseseTranslator.js';

console.log('=== LM Provider Examples ===\n');

// Example 1: Basic NAR with Dummy Provider (Symbolic Mode)
console.log('1. NAR with Dummy Provider (Symbolic Mode):');
const narSymbolic = new NAR({lm: {enabled: true}});
const dummyProvider = new DummyProvider({
    id: 'dummy',
    responseTemplate: 'Processing: {prompt}'
});
narSymbolic.registerLMProvider('dummy', dummyProvider);

console.log('   - Registered Dummy Provider');
console.log('   - NAR can operate in symbolic-mode only');

// Example 2: Advanced Narsese Translator
console.log('\n2. Advanced Narsese Translator:');
const translator = new AdvancedNarseseTranslator();

// Add some context for better translation quality
translator.addContext('This conversation is about animals and their properties.');

// Test natural language to Narsese
const naturalToNarsese = translator.toNarsese('Cats are animals');
console.log(`   Natural: "Cats are animals"`);
console.log(`   Narsese: "${naturalToNarsese.narsese}" (confidence: ${naturalToNarsese.confidence})`);

// Test Narsese to natural language
const narseseToNatural = translator.fromNarsese('(cat --> animal).');
console.log(`   Narsese: "(cat --> animal)."`);
console.log(`   Natural: "${narseseToNatural.text}" (confidence: ${narseseToNatural.confidence})`);

// Show quality metrics
const metrics = translator.getQualityMetrics();
console.log(`   Translation Metrics: ${metrics.totalTranslations} total, avg confidence: ${metrics.averageConfidence.toFixed(2)}`);

// Example 3: Validation of semantic preservation
console.log('\n3. Semantic Preservation Validation:');
const validation = translator.validateSemanticPreservation(
    'birds can fly',
    '<birds --> [flying]>.',
    'birds are flying things'
);
console.log(`   Original: "${validation.original}"`);
console.log(`   Preserved: ${validation.preserved} (similarity: ${(validation.similarity * 100).toFixed(1)}%)`);

// Example 4: Error correction demonstration
console.log('\n4. Error Correction:');
const resultWithIssue = {
    narsese: '(cat --> animal)', // Missing punctuation
    confidence: 0.9
};
const corrected = translator.applyErrorCorrection(resultWithIssue);
console.log(`   Before: "${resultWithIssue.narsese}"`);
console.log(`   After:  "${corrected.narsese}"`);

// Example 5: Context-aware translation
console.log('\n5. Context-aware Translation:');
const translator2 = new AdvancedNarseseTranslator();
translator2.addContext('This is about logical relationships in NARS.');
translator2.addContext('The statements follow Narsese syntax rules.');

const withContext = translator2.toNarsese('birds can fly');
console.log(`   With context: "${withContext.narsese}" (confidence: ${withContext.confidence})`);

// Example 6: Note about LangChain and HuggingFace providers
console.log('\n6. LangChain and HuggingFace Providers:');
console.log('   - LangChainProvider supports Ollama and OpenAI-compatible endpoints');
console.log('   - HuggingFaceProvider supports local models like MobileBERT and SmolLM-135M');
console.log('   - Both provide advanced NLP capabilities for hybrid reasoning');

// Demonstrate the configuration approach
const langchainConfig = {
    provider: 'ollama',
    modelName: 'llama2',
    baseURL: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 100
};
console.log('   - LangChain config example:', JSON.stringify(langchainConfig, null, 2));

const huggingfaceConfig = {
    modelName: 'HuggingFaceTB/SmolLM-135M',
    temperature: 0.7,
    maxTokens: 100,
    device: 'cpu'
};
console.log('   - HuggingFace config example:', JSON.stringify(huggingfaceConfig, null, 2));

console.log('\n=== End of Examples ===');