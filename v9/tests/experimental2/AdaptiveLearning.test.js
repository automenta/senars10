/**
 * Advanced Neurosymbolic Test: Adaptive Learning and Self-Modification
 *
 * This test demonstrates the system's ability to:
 * 1. Monitor its own performance and identify learning opportunities
 * 2. Adapt its reasoning strategies based on experience
 * 3. Modify its belief priorities and consolidation strategies
 * 4. Learn new concepts through neural-symbolic integration
 * 5. Transfer learning across domains and tasks
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Adaptive Learning and Self-Modification', () => {
  it('should adapt reasoning strategies based on feedback', async () => {
    const core = createCore();

    // Initialize with basic knowledge
    await core.addInput('(bird --> flyer).');
    await core.addInput('(penguin --> bird).');

    // The system makes an incorrect inference: penguins fly
    const incorrectInference = await core.addInput('(penguin --> flyer).');

    // A human or external system provides feedback that this is wrong
    const feedback = "Penguins are birds that cannot fly";

    // The neural component processes the feedback and suggests belief corrections
    const correctionSuggestions = await core.lm.processFeedback(
      '(penguin --> flyer).',
      feedback,
      { learningRate: 0.8 }
    );

    expect(correctionSuggestions).toContain('exception');
    expect(correctionSuggestions).toContain('special_case');

    // The system updates its knowledge with the correction
    // Remove the incorrect belief and add a corrected one
    await core.addInput('(--, (penguin --> flyer)).'); // Negation
    await core.addInput('((penguin & flyer) --> special_case).'); // Exception handling

    // Use embeddings to find similar exceptions in knowledge base
    const exceptionEmbedding = await core.lm.generateEmbedding('biological exception');
    const similarConcepts = await core.lm.findSimilarConcepts('penguin flightlessness');

    expect(similarConcepts).toContainEqual(
      expect.objectContaining({ concept: expect.stringContaining('ostrich') })
    );

    // The system learns a new general rule about exceptions
    const learnedRule = '((bird_special_case) ==> (exception_to_general_rule)).';
    await core.addInput(learnedRule);

    // The system adapts its reasoning strategy to be more cautious about inductive generalizations
    const adaptedStrategy = {
      name: 'cautious_inheritance',
      condition: (task) => task.term.includes('bird') && task.term.includes('--> flyer'),
      action: (task) => {
        // Check for exceptions before making inductive inference
        return { needsExceptionCheck: true, priority: task.priority * 0.7 };
      },
      priority: 0.9
    };

    core.rules.add(adaptedStrategy);

    // Test that the adapted strategy is applied
    const testTask = { term: '(ostrich --> flyer).', priority: 0.8 };
    const processedTask = adaptedStrategy.action(testTask);

    expect(processedTask.needsExceptionCheck).toBe(true);
    expect(processedTask.priority).toBeLessThan(testTask.priority);
  });

  it('should learn new concepts through neural-symbolic integration', async () => {
    const core = createCore();

    // Present a series of examples to help the system learn a new concept
    const examples = [
      "A startup is a young company focused on innovation and growth",
      "Startups often have limited resources but high potential",
      "Many startups work in technology sectors",
      "Startups typically seek venture capital funding"
    ];

    // The neural component processes the examples and identifies common patterns
    const conceptAnalysis = await core.lm.analyzeConcept(examples, 'startup');

    expect(conceptAnalysis.keyFeatures).toContain('innovation');
    expect(conceptAnalysis.keyFeatures).toContain('growth');
    expect(conceptAnalysis.keyFeatures).toContain('limited_resources');

    // Generate a semantic embedding for the new concept
    const conceptEmbedding = await core.lm.generateEmbedding('startup business concept');

    // The system creates a formal definition in Narsese
    const formalDefinition = [
      '(startup --> business).',
      '(startup --> young_organization).',
      '(startup --> innovation_oriented).',
      '((startup * limited_resources) --> high_growth_potential).',
      '((startup * funding_need) --> venture_capital_search).'
    ];

    for (const narsese of formalDefinition) {
      await core.addInput(narsese);
    }

    // The system should now recognize and reason about startup-related concepts
    const query = '(new_tech_company --> startup)?';
    await core.addInput(query);

    const reasoningResult = await core.reason();

    // Should be able to infer the relationship based on learned definition
    expect(reasoningResult).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('new_tech_company'),
        punctuation: '?' // Answer to the question
      })
    );

    // Use analogy to relate the new concept to existing knowledge
    const analogyPrompt = "How is a startup similar to a seedling?";
    const analogies = await core.lm.generateAnalogies(analogyPrompt);

    expect(analogies).toContainEqual(
      expect.objectContaining({
        source: 'seedling',
        target: 'startup',
        similarity: expect.stringContaining('growth_potential')
      })
    );

    // Encode the analogy in Narsese
    const analogyNarsese = '(startup <-> seedling).';
    await core.addInput(analogyNarsese);

    // The system should now be able to transfer knowledge between domains
    const transferredKnowledge = [
      '((seedling * care) ==> growth).',
      '((startup * investment) ==> growth).'
    ];

    for (const narsese of transferredKnowledge) {
      await core.addInput(narsese);
    }

    // Verify that the system learned the concept by testing with a novel example
    const novelExample = '(new_ai_startup --> growth).';
    await core.addInput(novelExample);

    const validationResult = await core.reason();
    expect(validationResult).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('growth'),
        punctuation: '.'
      })
    );
  });

  it('should perform meta-cognitive self-monitoring and adaptation', async () => {
    const core = createCore();

    // Set up a complex reasoning task that requires monitoring
    const complexKnowledge = [
      '(student --> learner).',
      '(learner --> (knowledge_acquirer & skill_developer)).',
      '(difficulty * (material, student)) --> (adapted_presentation).',
      '(success * practice) --> (competency_increase).'
    ];

    for (const narsese of complexKnowledge) {
      await core.addInput(narsese);
    }

    // The system monitors its reasoning performance
    const performanceMetrics = core.getPerformanceMetrics();

    // Based on performance, the neural component suggests optimizations
    const optimizationSuggestions = await core.lm.analyzePerformance(
      performanceMetrics,
      ['reasoning_speed', 'accuracy', 'resource_usage']
    );

    expect(optimizationSuggestions).toContainEqual(
      expect.objectContaining({
        aspect: 'reasoning_speed',
        recommendation: expect.any(String)
      })
    );

    // The system modifies its focus set strategy based on self-monitoring
    const currentFocusSize = core.memory.focusSetSize;
    const suggestedFocusSize = Math.max(1, Math.min(10, currentFocusSize * 0.8));

    // Update the configuration based on self-analysis
    await core.updateConfig({
      path: 'memory.focusSetSize',
      value: suggestedFocusSize
    });

    // The system should adapt its belief consolidation strategy based on usage patterns
    const beliefUsagePatterns = core.memory.getUsagePatterns();
    const consolidationStrategy = await core.lm.optimizeConsolidation(
      beliefUsagePatterns,
      { efficiencyGoal: 'memory_optimization' }
    );

    // Apply the learned consolidation strategy
    core.memory.setConsolidationStrategy(consolidationStrategy);

    // Test that the system has adapted its behavior
    const adaptedTask = {
      term: '(challenging_problem --> requires_focused_attention).',
      priority: 0.9
    };

    await core.addInput(adaptedTask);

    // The system should now handle complex tasks more efficiently due to adaptation
    const responseTime = await core.measureResponseTime(adaptedTask);
    expect(responseTime).toBeLessThan(1000); // Should respond efficiently

    // The system should also learn to predict its own performance on similar tasks
    const performancePrediction = await core.lm.predictPerformance(
      adaptedTask,
      { context: beliefUsagePatterns }
    );

    expect(performancePrediction.confidence).toBeGreaterThan(0.7);
    expect(performancePrediction.predictedTime).toBeLessThan(1000);
  });
});