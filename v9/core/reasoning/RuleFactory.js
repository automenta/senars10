import { NALRule } from './NALRule.js';
import { DeductionRule, InductionRule, AbductionRule } from './nal/NALRules.js';
import { ModusPonensRule } from './nal/ModusPonensRule.js';
import { DeductiveSyllogismRule, InductionRule as NALInductionRule, AbductionRule as NALAbductionRule } from './nal/SyllogisticRules.js';
import { Analogy as AnalogyRule } from './nal/AnalogyRule.js';
import { createGoalDecompositionRule } from './lm/rules/GoalDecompositionRule.js';
import { createHypothesisGenerationRule } from './lm/rules/HypothesisGenerationRule.js';
import { createVariableGroundingRule } from './lm/rules/VariableGroundingRule.js';
import { createAnalogicalReasoningRule } from './lm/rules/AnalogicalReasoningRule.js';
import { createBeliefRevisionRule } from './lm/rules/BeliefRevisionRule.js';
import { createExplanationGenerationRule } from './lm/rules/ExplanationGenerationRule.js';
import { createInteractiveClarificationRule } from './lm/rules/InteractiveClarificationRule.js';
import { createMetaReasoningGuidanceRule } from './lm/rules/MetaReasoningGuidanceRule.js';
import { createSchemaInductionRule } from './lm/rules/SchemaInductionRule.js';
import { createTemporalCausalModelingRule } from './lm/rules/TemporalCausalModelingRule.js';
import { createUncertaintyCalibrationRule } from './lm/rules/UncertaintyCalibrationRule.js';

const NAL_RULES = {
  deduction: DeductionRule,
  induction: InductionRule,
  abduction: AbductionRule,
  modusPonens: ModusPonensRule,
  syllogism: DeductiveSyllogismRule,
  nalInduction: NALInductionRule,
  nalAbduction: NALAbductionRule,
  analogy: AnalogyRule
};

const LM_RULES = {
  goalDecomposition: createGoalDecompositionRule,
  hypothesisGeneration: createHypothesisGenerationRule,
  variableGrounding: createVariableGroundingRule,
  analogicalReasoning: createAnalogicalReasoningRule,
  beliefRevision: createBeliefRevisionRule,
  explanationGeneration: createExplanationGenerationRule,
  interactiveClarification: createInteractiveClarificationRule,
  metaReasoningGuidance: createMetaReasoningGuidanceRule,
  schemaInduction: createSchemaInductionRule,
  temporalCausalModeling: createTemporalCausalModelingRule,
  uncertaintyCalibration: createUncertaintyCalibrationRule
};

export class RuleFactory {
  static createNALRule(type, options = {}) {
    const RuleClass = NAL_RULES[type];
    if (!RuleClass) throw new Error(`Unknown NAL rule type: ${type}`);
    return new RuleClass(options);
  }

  static createLMRule(type, dependencies = {}, options = {}) {
    const RuleClass = LM_RULES[type];
    if (!RuleClass) throw new Error(`Unknown LM rule type: ${type}`);
    return RuleClass(dependencies, options);
  }

  static getAvailableNALRules() {
    return Object.keys(NAL_RULES);
  }

  static getAvailableLMRules() {
    return Object.keys(LM_RULES);
  }

  static createRule(type, config = {}) {
    const { ruleType = 'nal', dependencies = {}, options = {} } = config;

    return ruleType === 'nal'
      ? this.createNALRule(type, options)
      : ruleType === 'lm'
        ? this.createLMRule(type, dependencies, options)
        : (() => { throw new Error(`Unknown rule type: ${ruleType}`); })();
  }
}