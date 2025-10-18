/**
 * Advanced Neurosymbolic Test: Integrated Cognitive Architecture
 *
 * This test demonstrates the system's ability to integrate multiple cognitive
 * capabilities simultaneously:
 * 1. Real-time perception and interpretation
 * 2. Multi-step reasoning with uncertainty handling
 * 3. Goal management with conflict resolution
 * 4. Learning from experience and feedback
 * 5. Creative problem solving under constraints
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Integrated Cognitive Architecture', () => {
  it('should demonstrate holistic neurosymbolic cognition', async () => {
    const core = createCore();

    // Simulate a complex real-world scenario requiring integrated cognition
    const scenarioContext = {
      environment: 'smart_city',
      challenge: 'optimize_energy_consumption',
      constraints: ['budget_limited', 'environmental_impact', 'resident_satisfaction'],
      stakeholders: ['city_government', 'residents', 'utility_companies']
    };

    // 1. PERCEPTION: Process multi-modal input streams
    const sensorData = {
      energyUsage: 2450, // kW
      occupancy: 0.7,    // 70% of buildings occupied
      weather: 'sunny',
      timeOfDay: 'peak_hours',
      renewableCapacity: 0.6 // 60% renewable available
    };

    // Convert sensor data to natural language for neural processing
    const sensorDescription = `Current energy usage: ${sensorData.energyUsage}kW,
                              occupancy: ${(sensorData.occupancy * 100)}%,
                              weather: ${sensorData.weather},
                              renewable capacity available: ${(sensorData.renewableCapacity * 100)}%`;

    // Generate embeddings for sensor state understanding
    const sensorEmbedding = await core.lm.generateEmbedding(sensorDescription);

    // Represent sensor readings in Narsese with temporal context
    const sensorBeliefs = [
      `(current_energy_usage --> ${sensorData.energyUsage}kW).`,
      `(current_occupancy --> ${sensorData.occupancy}).`,
      `(current_weather --> ${sensorData.weather}).`,
      `(renewable_capacity_available --> ${sensorData.renewableCapacity}).`
    ];

    for (const belief of sensorBeliefs) {
      await core.addInput(belief);
    }

    // 2. UNDERSTANDING: Neural component interprets the complex situation
    const situationAnalysis = await core.lm.analyzeSituation(
      sensorData,
      scenarioContext,
      { analysisType: 'multi_stakeholder', urgency: 'medium' }
    );

    expect(situationAnalysis.keyFactors).toContain('energy_demand');
    expect(situationAnalysis.keyFactors).toContain('renewable_availability');
    expect(situationAnalysis.stakeholderImpacts).toBeDefined();

    // 3. KNOWLEDGE INTEGRATION: Combine sensor data with domain knowledge
    const domainKnowledge = [
      '(high_energy_usage * peak_hours) --> (demand_response_opportunity).',
      '(renewable_capacity_available * high * current_demand) --> (switch_to_renewables_advisable).',
      '(occupancy > 0.5) --> (energy_demand_likely_to_remain_high).',
      '((utility_cost + environmental_impact) --> optimization_target).'
    ];

    for (const knowledge of domainKnowledge) {
      await core.addInput(knowledge);
    }

    // 4. GOAL FORMULATION: Generate goals based on analysis
    const stakeholderGoals = [
      'minimize_energy_cost!',
      'reduce_environmental_impact!',
      'maintain_resident_comfort!',
      'balance_utility_profit!'
    ];

    for (const goal of stakeholderGoals) {
      await core.addInput(goal);
    }

    // 5. CONFLICT DETECTION: Identify goal conflicts using neural guidance
    const conflictAnalysis = await core.lm.analyzeMultiGoalConflicts(stakeholderGoals);

    expect(conflictAnalysis.conflicts).toContainEqual(
      expect.objectContaining({
        conflictingGoals: expect.arrayContaining([
          expect.stringContaining('cost'),
          expect.stringContaining('comfort')
        ])
      })
    );

    // 6. CREATIVITY: Generate innovative solutions to resolve conflicts
    const solutionConstraints = {
      technical: 'existing_infrastructure',
      budget: scenarioContext.constraints.find(c => c.includes('budget')),
      environmental: scenarioContext.constraints.find(c => c.includes('environmental'))
    };

    const innovativeSolutions = await core.lm.generateInnovativeSolutions(
      stakeholderGoals,
      solutionConstraints,
      { creativityThreshold: 0.7, feasibilityThreshold: 0.5 }
    );

    expect(innovativeSolutions).toContainEqual(
      expect.objectContaining({
        solution: expect.stringContaining('dynamic_pricing'),
        addresses: expect.arrayContaining([
          expect.stringContaining('cost'),
          expect.stringContaining('comfort')
        ])
      })
    );

    // 7. REASONING: Formal reasoning about solution implications
    const selectedSolution = innovativeSolutions.find(s =>
      s.solution.includes('dynamic_pricing')
    );

    // Represent the solution in Narsese
    const solutionNarsese = [
      '(dynamic_energy_pricing --> demand_response_mechanism).',
      '((high_demand * dynamic_pricing) ==> (demand_reduction)).',
      '((demand_reduction * renewable_availability) ==> (cost_optimization)).',
      '((cost_optimization, resident_comfort_maintenance) ==> balanced_solution).'
    ];

    for (const narsese of solutionNarsese) {
      await core.addInput(narsese);
    }

    // 8. PLANNING: Generate executable plan with neural guidance
    const implementationPlan = await core.lm.generateImplementationPlan(
      selectedSolution.solution,
      {
        stakeholders: scenarioContext.stakeholders,
        timeline: 'phased_implementation',
        riskMitigation: 'important'
      }
    );

    expect(implementationPlan.steps).toBeInstanceOf(Array);
    expect(implementationPlan.steps.length).toBeGreaterThan(2);

    // Represent plan as sequential conjunction in Narsese
    const narsesePlan = `(&/, ${implementationPlan.steps.map(step =>
      `step_${step.id}("${step.description}")`
    ).join(', ')})!`;

    await core.addInput(narsesePlan);

    // 9. LEARNING: Update beliefs based on the reasoning process
    const learningOutcomes = await core.lm.extractLearningFromReasoning(
      scenarioContext.challenge,
      selectedSolution.solution,
      implementationPlan
    );

    // Store learned patterns for future similar scenarios
    for (const pattern of learningOutcomes.patterns) {
      await core.addInput(`(scenario_pattern("${scenarioContext.challenge}") --> ${pattern}).`);
    }

    // 10. VALIDATION: Use embeddings to validate the solution coherence
    const solutionEmbedding = await core.lm.generateEmbedding(selectedSolution.solution);
    const constraintEmbeddings = await Promise.all(
      solutionConstraints ? Object.values(solutionConstraints) : []
    ).map(c => core.lm.generateEmbedding(c));

    const coherenceScores = constraintEmbeddings.map(emb =>
      core.lm.calculateSimilarity(solutionEmbedding, emb)
    );

    // Solution should have reasonable relationship to constraints
    const avgCoherence = coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length;
    expect(avgCoherence).toBeGreaterThan(0.3);

    // 11. META-COGNITION: Monitor and evaluate the overall process
    const processMetrics = {
      reasoningSteps: 10,
      solutionQuality: await core.lm.assessSolutionQuality(
        selectedSolution.solution,
        scenarioContext.constraints
      ),
      computationalEfficiency: core.getPerformanceMetrics(),
      learningEffectiveness: learningOutcomes.effectiveness
    };

    // The system should have produced a coherent set of beliefs, goals, and plans
    const finalBeliefs = core.memory.getBeliefs();
    const finalGoals = core.memory.getGoals();
    const finalPlans = core.memory.getPlans();

    expect(finalBeliefs.length).toBeGreaterThan(5);
    expect(finalGoals.length).toBeGreaterThan(2);
    expect(finalPlans.length).toBeGreaterThan(0);

    // Verify that the solution addresses the core challenge
    const solutionAddressesChallenge = finalBeliefs.some(belief =>
      belief.term.includes('energy_consumption') &&
      belief.term.includes('optimization')
    );

    expect(solutionAddressesChallenge).toBe(true);
  });

  it('should demonstrate adaptive intelligence under changing conditions', async () => {
    const core = createCore();

    // Set up initial situation
    const initialConditions = {
      traffic: 'light',
      weather: 'sunny',
      time: 'morning',
      event: 'none'
    };

    // Process initial conditions through neural component
    const initialAnalysis = await core.lm.analyzeSituation(initialConditions, {
      domain: 'traffic_management'
    });

    // Create initial beliefs and goals
    const initialBeliefs = [
      '(traffic_flow --> smooth).',
      '(weather_condition --> favorable).',
      '(travel_time --> optimal).'
    ];

    for (const belief of initialBeliefs) {
      await core.addInput(belief);
    }

    const initialGoals = ['maintain_traffic_flow!', 'minimize_travel_time!'];

    for (const goal of initialGoals) {
      await core.addInput(goal);
    }

    // Simulate changing conditions (e.g., sudden weather change)
    const changingConditions = {
      ...initialConditions,
      weather: 'heavy_rain',
      traffic: 'congested',
      time: 'afternoon',
      visibility: 'poor'
    };

    // The system should detect the change and adapt
    const changeDetection = await core.lm.detectSignificantChange(
      initialConditions,
      changingConditions,
      { sensitivity: 'high' }
    );

    expect(changeDetection.significantChange).toBe(true);
    expect(changeDetection.affectedAreas).toContain('traffic_flow');

    // Update beliefs to reflect new conditions
    const updatedBeliefs = [
      '(traffic_flow --> congested).',
      '(weather_condition --> challenging).',
      '(travel_time --> increased).'
    ];

    for (const belief of updatedBeliefs) {
      await core.addInput(belief);
    }

    // Use neural guidance to reformulate goals for new conditions
    const adaptedGoals = await core.lm.reformulateGoals(
      initialGoals,
      changingConditions,
      { priorityAdjustments: ['safety_over_speed'] }
    );

    // Add adapted goals to system
    for (const goal of adaptedGoals) {
      await core.addInput(goal.goal);
    }

    // Generate new plan for changed conditions
    const adaptedPlan = await core.lm.generateAdaptedPlan(
      'traffic_management',
      changingConditions,
      {
        constraints: ['safety', 'flow_optimization'],
        adaptationStrategy: 'conservative_then_aggressive'
      }
    );

    // Represent adapted plan in Narsese
    const adaptedPlanNarsese = `(&/, ${adaptedPlan.actions.map(action =>
      `${action.verb}(${action.object})`
    ).join(', ')})!`;

    await core.addInput(adaptedPlanNarsese);

    // Learn from the adaptation process
    const adaptationLearning = await core.lm.extractAdaptationLearning(
      initialConditions,
      changingConditions,
      adaptedPlan
    );

    // Store adaptation patterns for future use
    await core.addInput(`(condition_change_pattern --> ${adaptationLearning.pattern}).`);
    await core.addInput(`(adaptation_strategy --> ${adaptationLearning.strategy}).`);

    // The system should now be better prepared for similar changes
    const prediction = await core.lm.predictSystemResponse(
      { weather: 'heavy_rain', traffic: 'congested' },
      { learnedPatterns: adaptationLearning }
    );

    expect(prediction.adaptationLikelihood).toBeGreaterThan(0.8);
    expect(prediction.efficiencyImprovement).toBeGreaterThan(0.1);
  });
});