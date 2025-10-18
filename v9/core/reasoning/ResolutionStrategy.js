import { Component } from '../components/Component.js';
import { Logger } from '../base/utilities.js';

export class ResolutionStrategy extends Component {
  constructor() {
    super();
    this.strategies = new Map();
    this._initializeDefaultStrategies();
    this.stats = {
      contradictionsResolved: 0,
      strategyUses: new Map(),
      resolutionSuccess: 0,
      resolutionFailures: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.stats = {
      contradictionsResolved: 0,
      strategyUses: new Map(),
      resolutionSuccess: 0,
      resolutionFailures: 0
    };
  }

  _initializeDefaultStrategies() {
    const strategies = {
      priority: { name: 'Priority-based Resolution', description: 'Resolves contradictions by preferring beliefs with higher priority', execute: (c, ctx) => this._resolveByPriority(c, ctx) },
      temporal: { name: 'Temporal-based Resolution', description: 'Resolves contradictions by preferring more recent beliefs', execute: (c, ctx) => this._resolveByTemporal(c, ctx) },
      confidence: { name: 'Confidence-based Resolution', description: 'Resolves contradictions by preferring beliefs with higher confidence', execute: (c, ctx) => this._resolveByConfidence(c, ctx) },
      integration: { name: 'Integration-based Resolution', description: 'Integrates contradictory beliefs into a new synthesized belief', execute: (c, ctx) => this._resolveByIntegration(c, ctx) },
      lm: { name: 'LM-assisted Resolution', description: 'Uses language model to suggest appropriate resolution strategy', execute: (c, ctx) => this._resolveWithLM(c, ctx) }
    };

    Object.entries(strategies).forEach(([key, strategy]) => this.strategies.set(key, strategy));
  }

  async resolveContradiction(contradiction, strategyName = 'priority', context = {}) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) throw new Error(`Unknown resolution strategy: ${strategyName}`);

    const currentCount = this.stats.strategyUses.get(strategyName) || 0;
    this.stats.strategyUses.set(strategyName, currentCount + 1);

    try {
      const result = await strategy.execute(contradiction, context);
      this.stats.contradictionsResolved++;
      this.stats.resolutionSuccess++;
      const currentTime = context.currentTime || Date.now();
      return {
        success: true,
        strategy: strategyName,
        result,
        timestamp: currentTime
      };
    } catch (error) {
      this.stats.resolutionFailures++;
      Logger.error(`Resolution strategy ${strategyName} failed: ${error.message}`);
      const currentTime = context.currentTime || Date.now();
      return {
        success: false,
        strategy: strategyName,
        error: error.message,
        timestamp: currentTime
      };
    }
  }

  _resolveByPriority(contradiction, context) {
    const [beliefA, beliefB] = contradiction.beliefs;
    const [priorityA, priorityB] = [beliefA.priority || 0, beliefB.priority || 0];

    if (priorityA > priorityB) {
      return {
        resolvedBelief: beliefA,
        discardedBeliefs: [beliefB],
        reason: 'Higher priority'
      };
    }
    if (priorityB > priorityA) {
      return {
        resolvedBelief: beliefB,
        discardedBeliefs: [beliefA],
        reason: 'Higher priority'
      };
    }
    return this._resolveByTemporal(contradiction, context);
  }

  _resolveByTemporal(contradiction, context) {
    const [beliefA, beliefB] = contradiction.beliefs;
    const [timeA, timeB] = [
      beliefA.creationTime || beliefA.timestamp || 0,
      beliefB.creationTime || beliefB.timestamp || 0
    ];

    return timeA > timeB ? {
      resolvedBelief: beliefA,
      discardedBeliefs: [beliefB],
      reason: 'More recent'
    } : {
      resolvedBelief: beliefB,
      discardedBeliefs: [beliefA],
      reason: 'More recent'
    };
  }

  _resolveByConfidence(contradiction, context) {
    const [beliefA, beliefB] = contradiction.beliefs;
    const [confA, confB] = [beliefA.truth?.confidence || 0, beliefB.truth?.confidence || 0];

    if (confA > confB) {
      return {
        resolvedBelief: beliefA,
        discardedBeliefs: [beliefB],
        reason: 'Higher confidence'
      };
    }
    if (confB > confA) {
      return {
        resolvedBelief: beliefB,
        discardedBeliefs: [beliefA],
        reason: 'Higher confidence'
      };
    }
    return this._resolveByTemporal(contradiction, context);
  }

  _resolveByIntegration(contradiction, context) {
    const [beliefA, beliefB] = contradiction.beliefs;
    const [freqA, freqB, confA, confB] = [
      beliefA.truth?.frequency || 0,
      beliefB.truth?.frequency || 0,
      beliefA.truth?.confidence || 0,
      beliefB.truth?.confidence || 0
    ];

    const totalWeight = confA + confB;
    const [newFrequency, newConfidence] = totalWeight > 0
      ? [(freqA * confA + freqB * confB) / totalWeight, Math.max(confA, confB) * 0.8]
      : [(freqA + freqB) / 2, 0.5];

    const currentTime = context.currentTime || Date.now();
    const synthesizedBelief = {
      ...beliefA,
      id: `${beliefA.id}_synthesized_${currentTime}`,
      truth: { frequency: newFrequency, confidence: newConfidence },
      creationTime: currentTime,
      isSynthesized: true
    };

    return {
      resolvedBelief: synthesizedBelief,
      discardedBeliefs: [beliefA, beliefB],
      reason: 'Integrated both beliefs with weighted average'
    };
  }

  async _resolveWithLM(contradiction, context) {
    if (context.lm) {
      try {
        const lmRecommendation = await this._getLMRecommendation(contradiction, context);
        return {
          resolvedBelief: contradiction.beliefs[0],
          discardedBeliefs: [contradiction.beliefs[1]],
          reason: 'LM-assisted resolution',
          lmAnalysis: lmRecommendation
        };
      } catch (error) {
        return this._resolveByConfidence(contradiction, context);
      }
    }
    return this._resolveByConfidence(contradiction, context);
  }

  async _getLMRecommendation(contradiction, context) {
    const [beliefA, beliefB] = contradiction.beliefs;
    return {
      summary: `Contradiction detected between: ${beliefA.statement} and ${beliefB.statement}`,
      recommendation: 'Use confidence-based resolution',
      confidence: 0.8
    };
  }

  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  addStrategy(name, strategy) {
    if (typeof strategy.execute !== 'function') throw new Error('Strategy must have an execute() method');

    this.strategies.set(name, {
      name: strategy.name || name,
      description: strategy.description || 'Custom resolution strategy',
      execute: strategy.execute
    });
  }

  getStats() {
    return {
      ...this.stats,
      strategyUsage: Object.fromEntries(this.stats.strategyUses)
    };
  }

  async resolveMultipleContradictions(contradictions, strategyName = 'priority', context = {}) {
    return Promise.all(contradictions.map(c => this.resolveContradiction(c, strategyName, context)));
  }
}