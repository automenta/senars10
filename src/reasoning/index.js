import {StrategyInterface} from './StrategyInterface.js';
import {ReasoningStrategy} from './ReasoningStrategy.js';
import {CoordinatedReasoningStrategy} from './CoordinatedReasoningStrategy.js';
import {NaiveExhaustiveStrategy} from './NaiveExhaustiveStrategy.js';
import {StrategySelector} from './StrategySelector.js';
import {Reasoner} from './Reasoner.js';
import {Rule} from './Rule.js';
import {LMRule} from './LMRule.js';
import {RuleEngine} from './RuleEngine.js';
import {RuleSet} from './RuleSet.js';
import {RuleComposer} from './RuleComposer.js';
import {ReasoningContext} from './ReasoningContext.js';
import {RuleProcessor} from './RuleProcessor.js';
import {SequentialRuleProcessor} from './SequentialRuleProcessor.js';
import {ParallelRuleProcessor} from './ParallelRuleProcessor.js';
import {CooperationEngine} from './CooperationEngine.js';
import {RuleCooperationManager} from './RuleCooperationManager.js';
import {PerformanceOptimizer} from './PerformanceOptimizer.js';
import {StrategyMetrics} from './StrategyMetrics.js';

export {
    // Reasoner and core components
    Reasoner,
    StrategyInterface,
    ReasoningStrategy,
    CoordinatedReasoningStrategy,
    NaiveExhaustiveStrategy,
    StrategySelector,

    // Rule system
    Rule,
    LMRule,
    RuleEngine,
    RuleSet,
    RuleComposer,
    RuleProcessor,
    SequentialRuleProcessor,
    ParallelRuleProcessor,
    CooperationEngine,
    RuleCooperationManager,

    // Supporting components
    ReasoningContext,
    PerformanceOptimizer,
    StrategyMetrics
};

// Default export for backwards compatibility
export default {
    Reasoner,
    StrategyInterface,
    ReasoningStrategy,
    CoordinatedReasoningStrategy,
    NaiveExhaustiveStrategy,
    StrategySelector,
    Rule,
    LMRule,
    RuleEngine,
    RuleSet,
    RuleComposer,
    ReasoningContext,
    RuleProcessor,
    SequentialRuleProcessor,
    ParallelRuleProcessor,
    CooperationEngine,
    RuleCooperationManager,
    PerformanceOptimizer,
    StrategyMetrics
};