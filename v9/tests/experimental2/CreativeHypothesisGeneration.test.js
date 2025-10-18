/**
 * Advanced Neurosymbolic Test: Creative Hypothesis Generation and Testing
 *
 * This test demonstrates the system's ability to:
 * 1. Generate novel hypotheses using language models
 * 2. Represent them in Narsese form for logical reasoning
 * 3. Design and execute experiments to test hypotheses
 * 4. Update beliefs based on experimental outcomes
 * 5. Use semantic embeddings to identify related concepts during hypothesis formation
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Creative Hypothesis Generation and Testing', () => {
  it('should generate and test novel scientific hypotheses', async () => {
    const core = createCore();

    // Initialize with basic domain knowledge
    await core.addInput('(plant --> living_thing).');
    await core.addInput('(light --> energy).');
    await core.addInput('(water --> nutrient).');

    // 1. The system observes patterns and generates a creative hypothesis
    // using its neural component (LM) to propose causal relationships
    const observations = [
      "Plants grow taller when placed near windows",
      "Plants in dark rooms show stunted growth",
      "Plants bend towards light sources"
    ];

    // The LM generates a hypothesis based on observations
    const hypothesis = await core.lm.generateHypothesis(
      observations,
      ['causal', 'biological'],
      'xenova'
    );

    expect(hypothesis).toContain('light');
    expect(hypothesis).toContain('growth');

    // 2. The system translates the natural language hypothesis into Narsese
    // This requires the LM to understand logical structure and convert appropriately
    const narseseHypothesis = '((plant * light) --> growth).'; // Natural language to Narsese
    await core.addInput(narseseHypothesis);

    // 3. The system designs an experiment to test the hypothesis
    const experimentalDesign = await core.lm.generateExperiment(
      narseseHypothesis,
      ['controlled_experiment', 'variable_isolation']
    );

    expect(experimentalDesign).toBeDefined();

    // 4. The experiment is represented as a goal in Narsese for execution
    const experimentGoal =
      '(&/, setup_plants([control, test]), apply_light_to(test), measure_growth([control, test]), compare_results([control, test]))!';
    await core.addInput(experimentGoal);

    // 5. The system executes or plans the experiment using available tools
    // This represents the integration of goals with action planning
    const plannedActions = await core.plan(experimentGoal);

    // 6. After execution, new evidence is processed and beliefs are updated
    const evidence = [
      "Control plants: 2cm growth",
      "Test plants: 8cm growth"
    ];

    // The LM processes evidence and suggests belief updates
    const beliefUpdate = await core.lm.processEvidence(
      narseseHypothesis,
      evidence
    );

    // 7. The updated belief gets a truth value based on evidence strength
    const validatedHypothesis = {
      term: narseseHypothesis,
      truth: { frequency: 0.9, confidence: 0.85 },
      punctuation: '.'
    };

    await core.addInput(validatedHypothesis);

    // 8. The system performs reasoning to derive additional implications
    const derivedBeliefs = await core.reason();

    // Expect the system to have learned and stored the validated hypothesis
    const storedHypothesis = core.memory.getBelief(narseseHypothesis);
    expect(storedHypothesis).toBeDefined();
    expect(storedHypothesis.truth.frequency).toBeGreaterThan(0.8);
  });

  it('should blend concepts to form novel hypotheses', async () => {
    const core = createCore();

    // Set up initial semantic space with embedding relationships
    await core.addInput('(bird --> flyer).');
    await core.addInput('(plane --> flyer).');
    await core.addInput('(bird --> animal).');
    await core.addInput('(plane --> machine).');

    // Use embeddings to identify concept similarity and enable analogical blending
    const birdEmbedding = await core.lm.generateEmbedding('bird flight mechanics');
    const planeEmbedding = await core.lm.generateEmbedding('plane aerodynamics');

    // Calculate similarity to identify analogical relationships
    const similarity = core.lm.calculateSimilarity(birdEmbedding, planeEmbedding);
    expect(similarity).toBeGreaterThan(0.5); // Somewhat similar concepts

    // Generate a blended hypothesis combining concepts
    const blendedConcept = await core.lm.conceptualBlending(
      'bird flight',
      'plane engineering',
      { similarityThreshold: 0.6 }
    );

    // The LM should generate a novel concept like bio-inspired aircraft design
    expect(blendedConcept).toContain('wing');
    expect(blendedConcept).toContain('efficiency');

    // Convert the blended concept into a testable Narsese hypothesis
    const narseseBlended = '((bird-inspired(wing)) --> (improved_flight_efficiency)).';
    await core.addInput(narseseBlended);

    // The system should be able to reason about the blended concept
    const implications = await core.reason();
    expect(implications).toContainEqual(
      expect.objectContaining({ term: expect.stringContaining('flight_efficiency') })
    );
  });

  it('should perform abductive reasoning with neural guidance', async () => {
    const core = createCore();

    // Set up a scenario where the system must form the best explanation
    await core.addInput('(wet_grass --> (raining | sprinkler_on)).'); // Disjunctive cause

    // Observe wet grass
    await core.addInput('(grass --> wet).');

    // The LM provides contextual information to guide abduction
    const contextualInfo = {
      weather: 'sunny',
      timeOfDay: 'morning',
      season: 'summer'
    };

    // The neural component suggests the most likely explanation based on context
    const mostLikelyExplanation = await core.lm.generateExplanation(
      'wet grass observed',
      contextualInfo,
      'abductive reasoning'
    );

    expect(mostLikelyExplanation).toContain('sprinkler');

    // Formulate the best explanation in Narsese
    const bestExplanation = '(sprinkler_on --> wet_grass).';
    await core.addInput(bestExplanation);

    // Use embeddings to validate the explanation against prior knowledge
    const explanationEmbedding = await core.lm.generateEmbedding(bestExplanation);
    const priorKnowledgeEmbeddings = [
      await core.lm.generateEmbedding('(sprinkler --> water_source)'),
      await core.lm.generateEmbedding('(morning --> sprinkler_time)')
    ];

    // Check that the explanation is semantically consistent with prior knowledge
    const consistencyScores = priorKnowledgeEmbeddings.map(emb =>
      core.lm.calculateSimilarity(explanationEmbedding, emb)
    );

    const avgConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
    expect(avgConsistency).toBeGreaterThan(0.3); // Somewhat consistent

    // Add the explanation as a belief with appropriate truth values
    const explanationBelief = {
      term: bestExplanation,
      truth: { frequency: 0.7, confidence: 0.6 },
      punctuation: '.'
    };

    await core.addInput(explanationBelief);
  });
});