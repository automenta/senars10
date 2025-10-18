/**
 * Advanced Neurosymbolic Test: Real-Time Decision Support
 *
 * This test demonstrates the system's ability to:
 * 1. Process real-time data streams for immediate decision making
 * 2. Balance speed and accuracy in decision processes
 * 3. Handle uncertainty and incomplete information
 * 4. Learn from decision outcomes to improve future decisions
 * 5. Explain decision rationales to users
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Real-Time Decision Support', () => {
  it('should process real-time data streams and make immediate decisions', async () => {
    const core = createCore();

    // Simulate real-time data streams (e.g., for an autonomous system)
    const dataStreams = {
      sensor: [
        { type: 'temperature', value: 24.5, location: 'room_1', timestamp: Date.now() },
        { type: 'humidity', value: 65, location: 'room_1', timestamp: Date.now() },
        { type: 'motion', value: true, location: 'room_1', timestamp: Date.now() },
        { type: 'power_usage', value: 350, location: 'room_1', timestamp: Date.now() }
      ],
      market: [
        { symbol: 'AAPL', price: 175.43, change: -1.2, timestamp: Date.now() },
        { symbol: 'GOOGL', price: 2780.12, change: 2.5, timestamp: Date.now() },
        { symbol: 'TSLA', price: 260.30, change: -5.7, timestamp: Date.now() }
      ],
      social: [
        { source: 'twitter', sentiment: 'positive', topic: 'tech_innovation', volume: 1240, timestamp: Date.now() },
        { source: 'news', sentiment: 'negative', topic: 'market_volatility', volume: 890, timestamp: Date.now() }
      ]
    };

    // The neural component processes real-time data for pattern recognition
    for (const [streamType, dataItems] of Object.entries(dataStreams)) {
      for (const item of dataItems) {
        // Generate embeddings for semantic processing
        const itemEmbedding = await core.lm.generateEmbedding(
          `${item.type || item.symbol || item.source}: ${item.value || item.price || item.sentiment}`
        );

        // Create Narsese representations of the data
        let narsese;
        if (item.location) {
          narsese = `(realtime_${streamType}("${item.type}") --> (value(${item.value}) & location("${item.location}"))).`;
        } else if (item.symbol) {
          narsese = `(realtime_${streamType}("${item.symbol}") --> (price(${item.price}) & change(${item.change}))).`;
        } else {
          narsese = `(realtime_${streamType}("${item.source}") --> (sentiment("${item.sentiment}") & topic("${item.topic}"))).`;
        }

        await core.addInput(narsese);

        // Identify anomalies or significant patterns
        const patternAnalysis = await core.lm.analyzeRealtimePattern(item, {
          baselineType: 'historical_average',
          sensitivity: 'high',
          streamType: streamType
        });

        if (patternAnalysis.isAnomalous || patternAnalysis.significance > 0.7) {
          await core.addInput(`(anomaly("${item.type || item.symbol}") --> (significance(${patternAnalysis.significance}) & requires_attention)).`);
        }
      }
    }

    // Define decision rules for different scenarios
    const decisionRules = [
      // Energy management decisions
      '((high_power_usage, occupancy_detected) --> (evaluate_energy_efficiency)).',
      '((temperature > 25, power_usage > 500) --> (cooling_advice)).',

      // Financial decision triggers
      '((market_volatility_high, negative_sentiment_high) --> (risk_assessment_required)).',
      '((stock_price_drop > 5, positive_news_volume_low) --> (sell_consideration)).',

      // General decision urgency
      '((anomaly_high_significance, time_sensitive) --> (immediate_decision_needed)).'
    ];

    for (const rule of decisionRules) {
      await core.addInput(rule);
    }

    // Process the incoming data through reasoning system
    const immediateDecisions = await core.reason();

    // The system should identify time-sensitive decisions that require immediate attention
    const urgentDecisions = immediateDecisions.filter(decision =>
      decision.term.includes('immediate_decision') ||
      decision.term.includes('requires_attention')
    );

    expect(urgentDecisions.length).toBeGreaterThan(0);

    // Simulate decision execution in a simulated environment
    for (const decision of urgentDecisions) {
      const decisionAction = await core.lm.generateDecisionAction(
        decision.term,
        {
          actionType: 'corrective',
          constraints: ['safety', 'efficiency', 'cost'],
          priority: decision.priority
        }
      );

      // Convert action to executable Narsese goal
      if (decisionAction.action) {
        await core.addInput(`(${decisionAction.action})!`);
      }
    }

    // The system should also predict the potential outcomes of decisions
    const outcomePredictions = await core.lm.predictDecisionOutcomes(
      urgentDecisions,
      {
        predictionHorizon: 'short_term',
        confidenceThreshold: 0.6
      }
    );

    // Store predictions for decision validation
    for (const prediction of outcomePredictions) {
      await core.addInput(`(decision("${prediction.decision}") --> (predicted_outcome("${prediction.outcome}") & confidence(${prediction.confidence}))).`);
    }
  });

  it('should handle uncertainty and incomplete information in decisions', async () => {
    const core = createCore();

    // Simulate incomplete information scenario
    const incompleteData = {
      situation: 'network_anomaly',
      observedSymptoms: [
        'increased_latency',
        'packet_loss',
        'high_cpu_usage'
      ],
      missingInformation: [
        'root_cause',
        'affected_users_count',
        'business_impact'
      ],
      potentialCauses: [
        'hardware_failure',
        'ddos_attack',
        'configuration_error',
        'bandwidth_saturation'
      ]
    };

    // Represent known information in Narsese
    for (const symptom of incompleteData.observedSymptoms) {
      await core.addInput(`(observed_symptom("${symptom}") --> (relevance(known) & requires_analysis)).`);
    }

    for (const cause of incompleteData.potentialCauses) {
      await core.addInput(`(potential_cause("${cause}") --> (probability(unknown) & testable)).`);
    }

    // The neural component handles uncertainty by providing probabilistic assessments
    const uncertaintyAnalysis = await core.lm.analyzeUncertainty(
      incompleteData,
      {
        uncertaintyType: 'epistemic',
        analysisDepth: 'comprehensive',
        confidenceThreshold: 0.5
      }
    );

    expect(uncertaintyAnalysis.probabilities).toBeDefined();
    expect(Object.keys(uncertaintyAnalysis.probabilities).length).toBeGreaterThan(0);

    // Convert uncertainty analysis to Narsese with truth values reflecting confidence
    for (const [cause, probability] of Object.entries(uncertaintyAnalysis.probabilities)) {
      await core.addInput({
        term: `(potential_cause("${cause}") --> most_likely_cause).`,
        truth: { frequency: probability, confidence: 0.7 },
        punctuation: '.'
      });
    }

    // Generate information-gathering goals to reduce uncertainty
    const informationGatheringGoals = await core.lm.generateInformationGatheringPlan(
      incompleteData,
      {
        goalType: 'diagnostic',
        priority: 'maximize_information_gain',
        resourceConstraint: 'minimal'
      }
    );

    // Convert to Narsese goals
    for (const goal of informationGatheringGoals) {
      await core.addInput(`(${goal.action})!`);
    }

    // The system should make the best possible decision given uncertainty
    const uncertaintyDecision = await core.lm.makeDecisionUnderUncertainty(
      incompleteData.situation,
      incompleteData.potentialCauses,
      uncertaintyAnalysis,
      {
        riskTolerance: 'conservative',
        decisionCriterion: 'minimize_expected_loss'
      }
    );

    // Represent the decision with appropriate uncertainty quantification
    await core.addInput({
      term: `(decision("${uncertaintyDecision.action}") --> (uncertainty_level("${uncertaintyDecision.confidence_level}") & risk_mitigated)).`,
      truth: { frequency: 0.8, confidence: uncertaintyDecision.confertainty },
      punctuation: '!'
    });

    // The system should also plan for decision validation
    const validationPlan = await core.lm.generateValidationPlan(
      uncertaintyDecision.action,
      {
        validationType: 'effect_measurement',
        successMetrics: ['problem_resolution', 'side_effect_absence'],
        timeline: 'short_term'
      }
    );

    // Convert validation plan to Narsese
    const validationGoal = `(&/, implement_decision("${uncertaintyDecision.action}"), monitor_effects, validate_outcomes)!`;
    await core.addInput(validationGoal);

    // Update beliefs based on new information as it becomes available
    const newInformation = {
      diagnosticResult: 'hardware_failure_confirmed',
      confidence: 0.9
    };

    await core.addInput({
      term: `(diagnostic_result("${newInformation.diagnosticResult}") --> truth).`,
      truth: { frequency: newInformation.confidence, confidence: 0.85 },
      punctuation: '.'
    });

    // Reasoning should update previous beliefs based on new information
    const updatedReasoning = await core.reason();
    const updatedBeliefs = updatedReasoning.filter(task => task.punctuation === '.');

    expect(updatedBeliefs.length).toBeGreaterThan(0);
  });

  it('should learn from decision outcomes and improve over time', async () => {
    const core = createCore();

    // Simulate historical decisions with outcomes
    const historicalDecisions = [
      {
        decision: 'increase_server_capacity',
        context: { load: 'high', resources: 'available', time: 'peak_hours' },
        action: 'scale_up_resources',
        outcome: 'performance_improved',
        success: true,
        timestamp: Date.now() - 3600000 // 1 hour ago
      },
      {
        decision: 'reduce_network_bandwidth',
        context: { usage: 'low', cost_pressure: 'high', time: 'off_hours' },
        action: 'bandwidth_reduction',
        outcome: 'cost_reduced',
        success: true,
        timestamp: Date.now() - 7200000 // 2 hours ago
      },
      {
        decision: 'delay_maintenance',
        context: { scheduled_time: 'nearby', system_stable: true, resources_constrained: true },
        action: 'postpone_maintenance',
        outcome: 'system_failure',
        success: false,
        timestamp: Date.now() - 86400000 // 1 day ago
      }
    ];

    // Process historical decisions to extract patterns
    for (const decision of historicalDecisions) {
      // Create Narsese representations of each decision
      await core.addInput(`(historical_decision("${decision.decision}") --> (context("${JSON.stringify(decision.context)}") & outcome("${decision.outcome}"))).`);
      await core.addInput(`(decision_success("${decision.decision}") --> ${decision.success}).`);

      // Extract features from context
      for (const [key, value] of Object.entries(decision.context)) {
        await core.addInput(`(context_feature("${key}") --> "${value}").`);
      }

      // Associate outcomes with contexts
      await core.addInput(`((context("${JSON.stringify(decision.context)}") * decision("${decision.decision}")) --> outcome("${decision.outcome}")).`);
    }

    // The neural component learns patterns from successful and unsuccessful decisions
    const decisionPatterns = await core.lm.learnFromDecisionHistory(
      historicalDecisions,
      {
        patternType: 'context-outcome',
        successThreshold: 0.7,
        timeDecay: true // More recent decisions more important
      }
    );

    expect(decisionPatterns.successfulContexts).toBeDefined();
    expect(decisionPatterns.failurePatterns).toBeDefined();

    // Represent learned patterns as decision rules
    for (const pattern of decisionPatterns.successfulPatterns) {
      await core.addInput(`((situation("${pattern.context}")) ==> (decision("${pattern.action}") --> successful)).`);
    }

    for (const pattern of decisionPatterns.failurePatterns) {
      await core.addInput(`((situation("${pattern.context}")) ==> (avoid_decision("${pattern.action}"))).`);
    }

    // Test the system on a new scenario using learned patterns
    const newScenario = {
      context: { load: 'high', resources: 'available', time: 'peak_hours', deadline: 'urgent' },
      goal: 'maintain_performance'
    };

    // The system should retrieve relevant historical decisions
    const relevantHistory = await core.lm.findRelevantHistoricalDecisions(
      newScenario.context,
      {
        similarityThreshold: 0.6,
        maxMatches: 5,
        successFocus: true
      }
    );

    expect(relevantHistory).toContainEqual(
      expect.objectContaining({
        context: expect.objectContaining({ load: 'high', resources: 'available' }),
        success: true
      })
    );

    // Generate decision based on historical patterns
    const patternBasedDecision = await core.lm.generateDecisionFromPatterns(
      newScenario,
      relevantHistory,
      {
        creativity: 'low', // Stick to proven patterns
        riskTolerance: 'medium',
        urgency: 'high'
      }
    );

    expect(patternBasedDecision.action).toContain('scale');

    // Convert to Narsese goal
    await core.addInput(`(${patternBasedDecision.action})!`);

    // The system should predict the outcome based on historical patterns
    const predictedOutcome = await core.lm.predictOutcomeFromHistory(
      patternBasedDecision.action,
      newScenario.context,
      relevantHistory
    );

    // Represent prediction with confidence based on historical success
    await core.addInput({
      term: `(predicted_outcome("${predictedOutcome.outcome}") --> (confidence(${predictedOutcome.confidence}) & based_on_history)).`,
      truth: { frequency: 0.8, confidence: predictedOutcome.confidence },
      punctuation: '.'
    });

    // Simulate feedback on the decision outcome to continue learning cycle
    const feedback = {
      decision: patternBasedDecision.action,
      actualOutcome: 'performance_maintained',
      success: true,
      explanation: 'Decision aligned with successful historical patterns'
    };

    // Update the learning model with new feedback
    await core.lm.updateDecisionModel(feedback);

    // The system should now have improved decision-making capability
    const improvedMetrics = core.getDecisionLearningMetrics();
    expect(improvedMetrics.accuracy).toBeGreaterThan(0.7);
  });
});