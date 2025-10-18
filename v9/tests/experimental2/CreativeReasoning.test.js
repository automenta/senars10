/**
 * Advanced Neurosymbolic Test: Creative and Analogical Reasoning
 *
 * This test demonstrates the system's ability to:
 * 1. Perform creative reasoning by combining distant concepts
 * 2. Generate novel solutions through analogical transfer
 * 3. Use embeddings to identify creative connections
 * 4. Evaluate creative solutions for feasibility
 * 5. Learn creative patterns for future innovation
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Creative and Analogical Reasoning', () => {
  it('should perform creative concept blending and idea generation', async () => {
    const core = createCore();

    // Present two distant concepts for creative blending
    const concept1 = 'tree';
    const concept2 = 'computer';

    // The neural component identifies creative connections between distant concepts
    const creativeConnections = await core.lm.findCreativeConnections(
      concept1,
      concept2,
      {
        distanceThreshold: 0.8, // Looking for distant analogies
        connectionTypes: ['structure', 'function', 'process']
      }
    );

    expect(creativeConnections).toContainEqual(
      expect.objectContaining({
        connection: expect.stringContaining('network'),
        similarity: expect.stringContaining('hierarchical')
      })
    );

    // Use embeddings to quantitatively assess creative similarity
    const treeEmbedding = await core.lm.generateEmbedding('tree structure and growth');
    const computerEmbedding = await core.lm.generateEmbedding('computer architecture and processing');
    const combinedEmbedding = await core.lm.generateEmbedding('tree computer hybrid concept');

    // Check if the combined concept has semantic relationships to both originals
    const treeSimilarity = core.lm.calculateSimilarity(combinedEmbedding, treeEmbedding);
    const computerSimilarity = core.lm.calculateSimilarity(combinedEmbedding, computerEmbedding);

    // The blended concept should be related to both original concepts
    expect(treeSimilarity).toBeGreaterThan(0.4);
    expect(computerSimilarity).toBeGreaterThan(0.4);

    // Generate a creative blend concept
    const blendedConcept = await core.lm.conceptualBlending(
      concept1,
      concept2,
      {
        blendType: 'structural_analogy',
        outputFormat: 'functional_description'
      }
    );

    expect(blendedConcept).toContain('network');
    expect(blendedConcept).toContain('branching');
    expect(blendedConcept).toContain('processing');

    // Represent the creative concept in Narsese
    const creativeNarsese = [
      '(tree_computer --> (network_structure & growth_process & information_processing)).',
      '((tree_branching * computer_networking) <=> tree_computer).',
      '(tree_computer --> novel_architecture).'
    ];

    for (const narsese of creativeNarsese) {
      await core.addInput(narsese);
    }

    // The system should be able to reason about the creative concept
    const creativeReasoning = await core.reason();

    expect(creativeReasoning).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('novel_architecture'),
        punctuation: '.'
      })
    );

    // Apply the creative concept to solve a problem
    const problem = 'design_a_scalable_network!';
    await core.addInput(problem);

    const creativeSolution = await core.lm.generateCreativeSolution(
      problem,
      [blendedConcept],
      { noveltyConstraint: 'high', feasibilityConstraint: 'medium' }
    );

    expect(creativeSolution).toContain('tree');
    expect(creativeSolution).toContain('network');

    // Represent the creative solution in Narsese
    const solutionNarsese = `((tree_structure * scalable_network) --> ${problem.replace('!', '')}).`;
    await core.addInput(solutionNarsese);

    // Validate the creative solution with feasibility analysis
    const feasibilityAnalysis = await core.lm.analyzeFeasibility(
      creativeSolution,
      { constraints: ['technical', 'resource', 'time'] }
    );

    expect(feasibilityAnalysis.score).toBeGreaterThan(0.4); // Reasonably feasible
    expect(feasibilityAnalysis.challenges).toBeDefined();
  });

  it('should transfer solutions across domains through analogical reasoning', async () => {
    const core = createCore();

    // Establish a source domain with a known solution
    const sourceDomain = [
      '(city_traffic --> problem).',
      '(traffic_light --> solution).',
      '(traffic_light --> (timed_control & flow_management)).',
      '(timed_control --> reduce_congestion).'
    ];

    for (const narsese of sourceDomain) {
      await core.addInput(narsese);
    }

    // Present a target domain requiring an analogous solution
    const targetDomain = [
      '(computer_process_scheduling --> problem).',
      '(cpu_resources --> limited_resource_like_road_space).',
      '(process_requests --> similar_to_traffic_flow).'
    ];

    for (const narsese of targetDomain) {
      await core.addInput(narsese);
    }

    // The neural component identifies the structural analogy
    const analogy = await core.lm.identifyStructuralAnalogy(
      'traffic_management',
      'process_scheduling',
      {
        mappingCriteria: ['resource_constraint', 'flow_control', 'timing'],
        similarityThreshold: 0.7
      }
    );

    expect(analogy.source).toContain('traffic');
    expect(analogy.target).toContain('process');
    expect(analogy.mapping).toContainEqual(
      expect.objectContaining({
        sourceElement: 'traffic_light',
        targetElement: 'scheduler'
      })
    );

    // Represent the analogy in Narsese
    const analogyNarsese = [
      '(traffic_light <-> process_scheduler).',
      '((resource_constraint, flow_control, timing) ==> solution_transfer_opportunity).'
    ];

    for (const narsese of analogyNarsese) {
      await core.addInput(narsese);
    }

    // Apply the source solution to the target domain
    const analogicalSolution = [
      '(process_scheduler --> (timed_control & flow_management)).',
      '(timed_process_control --> reduce_system_congestion).'
    ];

    for (const solution of analogicalSolution) {
      await core.addInput(solution);
    }

    // Use embeddings to validate the analogical transfer
    const trafficEmbedding = await core.lm.generateEmbedding('traffic flow management');
    const processEmbedding = await core.lm.generateEmbedding('process flow management');
    const solutionEmbedding = await core.lm.generateEmbedding('timed control solution');

    // Check semantic similarity between analogous concepts
    const structuralSimilarity = core.lm.calculateSimilarity(trafficEmbedding, processEmbedding);
    expect(structuralSimilarity).toBeGreaterThan(0.5); // Structurally similar

    // The neural component evaluates the transferred solution
    const solutionEvaluation = await core.lm.evaluateAnalogicalSolution(
      analogicalSolution[0],
      {
        adaptationRequirements: ['domain_specific_constraints'],
        successCriteria: ['efficiency', 'fairness', 'scalability']
      }
    );

    expect(solutionEvaluation.applicability).toBeGreaterThan(0.6);
    expect(solutionEvaluation.suggestedAdaptations).toContain('quantum_times');

    // Store the learned analogical pattern for future use
    await core.addInput('((resource_constrained_flow_control, timed_regulation) ==> effective_solution).');

    // Test the solution in a practical scenario
    const practicalTest = 'optimize_cpu_scheduling!';
    await core.addInput(practicalTest);

    const solutionDerivation = await core.reason();

    expect(solutionDerivation).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('timed_control'),
        punctuation: '!'
      })
    );
  });

  it('should generate and evaluate creative hypotheses', async () => {
    const core = createCore();

    // Present a creative challenge
    const challenge = 'how_to_reduce_urban_pollution_through_biological_means?';

    // Use neural component to generate creative hypotheses
    const creativeHypotheses = await core.lm.generateCreativeHypotheses(
      challenge,
      {
        generationType: 'biological_solutions',
        constraintRelaxation: 'high',
        crossDomainTransfer: 'encouraged'
      }
    );

    expect(creativeHypotheses).toContainEqual(
      expect.objectContaining({
        hypothesis: expect.stringContaining('plant'),
        hypothesis: expect.stringContaining('filter')
      })
    );

    // Convert the most promising hypothesis to Narsese
    const selectedHypothesis = '(urban_trees --> air_pollution_filter).';
    await core.addInput(selectedHypothesis);

    // Use embeddings to find related concepts and strengthen the hypothesis
    const hypothesisEmbedding = await core.lm.generateEmbedding('urban trees as pollution filters');
    const relatedConcepts = await core.lm.findRelatedConcepts(
      hypothesisEmbedding,
      { domain: 'environmental_science', threshold: 0.6 }
    );

    // Enhance the hypothesis with related knowledge
    const enhancementKnowledge = relatedConcepts.map(concept =>
      `(${concept.name} --> ${selectedHypothesis.split(' --> ')[1]}).`
    );

    for (const enhancement of enhancementKnowledge) {
      await core.addInput(enhancement);
    }

    // Perform reasoning to derive implications of the creative hypothesis
    const implications = await core.reason();

    // The system should derive testable predictions from the hypothesis
    const predictedEffects = implications.filter(imp =>
      imp.term.includes('pollution') && imp.term.includes('reduction')
    );

    expect(predictedEffects).toContainEqual(
      expect.objectContaining({
        punctuation: '.'
      })
    );

    // Use neural component to design a feasibility test for the creative hypothesis
    const feasibilityTest = await core.lm.designFeasibilityTest(
      selectedHypothesis,
      {
        testType: 'pilot_study',
        constraints: ['cost', 'space', 'maintenance'],
        successMetrics: ['pollution_reduction_percentage']
      }
    );

    expect(feasibilityTest.methodology).toContain('controlled');
    expect(feasibilityTest.metrics).toContain('baseline');

    // Represent the test as a goal in Narsese
    const testGoal =
      `(&/, establish_control_area, plant_trees(test_area), measure_pollution_levels([control, test]), compare_results)!`;
    await core.addInput(testGoal);

    // The system should prioritize this experimental goal
    const prioritizedTasks = core.memory.getPriorityTasks();
    const testTask = prioritizedTasks.find(t => t.term.includes('measure_pollution'));

    expect(testTask).toBeDefined();
    expect(testTask.priority).toBeGreaterThan(0.6); // High priority for experimental validation

    // Learn patterns from the creative reasoning process
    const learningPattern = await core.lm.extractCreativityPattern(
      challenge,
      selectedHypothesis,
      feasibilityTest
    );

    // Store the pattern for future creative problem-solving
    await core.addInput(`(creative_problem_solving_pattern --> ${learningPattern.mechanism}).`);

    // The system should now be able to apply this creativity pattern to new challenges
    const newChallenge = 'how_to_improve_urban_temperature_through_natural_means?';
    await core.addInput(newChallenge);

    const creativeResponse = await core.reason();

    expect(creativeResponse).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('natural'),
        term: expect.stringContaining('urban')
      })
    );
  });
});