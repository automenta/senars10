/**
 * @file tests/syntax-check.js
 * @description Basic syntax check for newly created files
 */

// This file just imports the new modules to ensure they have correct syntax
import {LangChainProvider} from '../src/lm/LangChainProvider.js';
import {HuggingFaceProvider} from '../src/lm/HuggingFaceProvider.js';
import {AdvancedNarseseTranslator} from '../src/lm/AdvancedNarseseTranslator.js';

console.log('All modules imported successfully - syntax appears correct');
console.log('Available classes:');
console.log('- LangChainProvider:', typeof LangChainProvider);
console.log('- HuggingFaceProvider:', typeof HuggingFaceProvider);
console.log('- AdvancedNarseseTranslator:', typeof AdvancedNarseseTranslator);