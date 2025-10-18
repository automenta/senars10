import { Component } from '../components/Component.js';
import { Logger } from '../base/utilities.js';

export class ContradictionAnalyzer extends Component {
  constructor() {
    super();
    Object.assign(this, {
      contradictions: new Map(),
      stats: {
        contradictionsDetected: 0,
        directNegations: 0,
        partialContradictions: 0,
        resolvedContradictions: 0,
        falsePositives: 0
      },
      config: {
        detectDirectNegations: true,
        detectPartialContradictions: true,
        threshold: 0.1
      }
    });
  }

  async initialize(config = {}) {
    await super.initialize(config);
    Object.assign(this, {
      config: { ...this.config, ...config },
      contradictions: new Map(),
      stats: {
        contradictionsDetected: 0,
        directNegations: 0,
        partialContradictions: 0,
        resolvedContradictions: 0,
        falsePositives: 0
      }
    });
  }

  async analyzeBeliefs(beliefs, context = {}) {
    if (!Array.isArray(beliefs) || beliefs.length < 2) return [];

    const contradictions = [];
    for (let i = 0; i < beliefs.length; i++) {
      for (let j = i + 1; j < beliefs.length; j++) {
        const contradiction = this._findContradiction(beliefs[i], beliefs[j], context);
        if (contradiction) {
          contradictions.push(contradiction);
          this._recordContradiction(contradiction);
        }
      }
    }
    return contradictions;
  }

  _findContradiction(beliefA, beliefB, context = {}) {
    if (!beliefA || !beliefB) return null;

    if (!this._areEquivalentStatements(beliefA.statement, beliefB.statement)) return null;

    const currentTime = context.currentTime || Date.now();
    
    if (this.config.detectDirectNegations && this._isDirectNegation(beliefA, beliefB)) {
      return {
        type: 'direct_negation',
        beliefs: [beliefA, beliefB],
        strength: 1.0,
        timestamp: currentTime,
        confidence: 1.0
      };
    }

    if (this.config.detectPartialContradictions && this._isPartialContradiction(beliefA, beliefB)) {
      const strength = 1 - Math.abs(beliefA.truth.frequency - beliefB.truth.frequency);
      return {
        type: 'partial_contradiction',
        beliefs: [beliefA, beliefB],
        strength,
        timestamp: currentTime,
        confidence: strength
      };
    }

    return null;
  }

  _areEquivalentStatements(stmtA, stmtB) {
    return stmtA && stmtB && stmtA.toString() === stmtB.toString();
  }

  _isDirectNegation(beliefA, beliefB) {
    const [freqA, freqB] = [beliefA.truth?.frequency || 0, beliefB.truth?.frequency || 0];
    return (freqA > 0.9 && freqB < 0.1) || (freqA < 0.1 && freqB > 0.9);
  }

  _isPartialContradiction(beliefA, beliefB) {
    const [freqA, freqB, confA, confB] = [
      beliefA.truth?.frequency || 0,
      beliefB.truth?.frequency || 0,
      beliefA.truth?.confidence || 0,
      beliefB.truth?.confidence || 0
    ];
    const diff = Math.abs(freqA - freqB);
    return confA > 0.8 && confB > 0.8 && diff > this.config.threshold;
  }

  _recordContradiction(contradiction) {
    const id = this._generateContradictionId(contradiction);
    this.contradictions.set(id, { ...contradiction, resolved: false, resolution: null });

    this.stats.contradictionsDetected++;
    this.stats[contradiction.type === 'direct_negation' ? 'directNegations' : 'partialContradictions']++;
  }

  _generateContradictionId(contradiction) {
    const stmt = contradiction.beliefs[0].statement || 'unknown';
    const timestamp = contradiction.timestamp || Date.now();
    return `${stmt.toString()}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
  }

  getContradictions() {
    return Array.from(this.contradictions.values());
  }

  getUnresolvedContradictions() {
    return Array.from(this.contradictions.values()).filter(c => !c.resolved);
  }

  getStats() {
    return {
      ...this.stats,
      totalContradictions: this.contradictions.size,
      unresolvedContradictions: this.getUnresolvedContradictions().length
    };
  }

  clearContradictions() {
    this.contradictions.clear();
    Object.assign(this.stats, { resolvedContradictions: 0, falsePositives: 0 });
  }

  isBeliefContradicted(belief) {
    return Array.from(this.contradictions.values()).some(c => c.beliefs.some(b => b.id === belief.id));
  }
}