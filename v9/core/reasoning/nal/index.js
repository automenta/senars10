/**
 * @file core/reasoning/nal/index.js
 * @description NAL reasoning module entry point
 */

export { 
  DeductionRule, 
  InductionRule, 
  AbductionRule 
} from './NALRules.js';

export { 
  ModusPonensRule 
} from './ModusPonensRule.js';

export { 
  DeductiveSyllogismRule, 
  InductionRule as NALInductionRule, 
  AbductionRule as NALAbductionRule 
} from './SyllogisticRules.js';

export { 
  Analogy 
} from './AnalogyRule.js';