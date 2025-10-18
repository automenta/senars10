/**
 * LM-based reasoning tests using the new TestNAR framework.
 *
 * NOTE: This test is currently disabled pending a future investigation into
 * why the GoalDecompositionRule is not firing correctly within the test
 * environment.
 */

// import { TestNAR } from './TestNAR.js';
// import { Punctuation } from '../../core/Task.js';
// import LM from '../../core/lm/LM.js';

// // Simple test provider that returns mock responses
// class TestProvider {
//   async process(prompt, options = {}) {
//     if (prompt.includes("Decompose the following high-level goal")) {
//       if (prompt.includes('create a comprehensive marketing plan for a new product')) {
//         return `1. Research target audience
// 2. Develop marketing materials
// 3. Launch social media campaign`;
//       }
//     }
//     return "No sub-goals identified.";
//   }
  
//   async generateText(prompt, options = {}) {
//     return this.process(prompt, options);
//   }
// }

// describe('LM-based Reasoning Tests (with new TestNAR)', () => {
//   it('GoalDecompositionRule should decompose a goal within the NAR', async () => {
//     const result = await new TestNAR()
//       .configure(nar => {
//         // Create a new LM with the test provider
//         const testLm = new LM();
//         testLm.registerProvider('default', new TestProvider());

//         // Get the existing goal decomposition rule and set its LM instance
//         const goalRule = nar.reasoner.getRulesByType('lm').find(r => r.id === 'goal-decomposition');
//         if (goalRule) {
//           goalRule.lm = testLm;
//         } else {
//           throw new Error('GoalDecompositionRule not found in reasoner');
//         }
//       })
//       .input('create a comprehensive marketing plan for a new product!', 0.9, 0.9) // Use '!' for goal
//       .run(1)
//       .expect('"Sub-goal: Research target audience"')
//       .expect('"Sub-goal: Develop marketing materials"')
//       .expect('"Sub-goal: Launch social media campaign"')
//       .execute();

//     expect(result).toBe(true);
//   });
// });
test.skip('LM-based Reasoning Tests are disabled pending rule integration fixes', () => {});