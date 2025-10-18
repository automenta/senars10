/**
 * Advanced Neurosymbolic Test: Goal Reasoning and Strategic Planning
 *
 * This test demonstrates the system's ability to:
 * 1. Decompose complex goals into subgoals using neural guidance
 * 2. Plan multi-step strategies with symbolic reasoning
 * 3. Handle goal conflicts and prioritization
 * 4. Adapt plans when obstacles are encountered
 * 5. Learn from goal achievement patterns
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Goal Reasoning and Strategic Planning', () => {
  it('should perform hierarchical goal decomposition with neural guidance', async () => {
    const core = createCore();

    // Set up basic operational knowledge
    await core.addInput('(achievement --> (goal_attainment & resource_utilization)).');
    await core.addInput('(goal_decomposition --> (subgoal_identification & dependency_mapping)).');

    // Present a complex, high-level goal
    const highLevelGoal = 'become_a_successful_software_engineer!';

    // Submit goal task that triggers GoalDecompositionRule
    await core.input({
      term: highLevelGoal,
      punctuation: '!',
      truth: { frequency: 0.9, confidence: 0.8 }
    });
    const subgoals = `Goal submitted: ${highLevelGoal} - rule system will handle decomposition`;

    expect(subgoals).toContainEqual(
      expect.objectContaining({ goal: expect.stringContaining('learn_programming') })
    );
    expect(subgoals).toContainEqual(
      expect.objectContaining({ goal: expect.stringContaining('build_portfolio') })
    );
    expect(subgoals).toContainEqual(
      expect.objectContaining({ goal: expect.stringContaining('apply_for_jobs') })
    );

    // Convert the goal decomposition into Narsese goal structure
    const narseseGoals = [
      '(learn_programming_skill --> subgoal(become_a_successful_software_engineer))!',
      '(build_project_portfolio --> subgoal(become_a_successful_software_engineer))!',
      '(network_with_professionals --> subgoal(become_a_successful_software_engineer))!',
      '(apply_for_engineering_positions --> subgoal(become_a_successful_software_engineer))!'
    ];

    for (const goal of narseseGoals) {
      await core.addInput(goal);
    }

    // Represent dependencies between subgoals in Narsese
    const dependencies = [
      '((learn_programming_skill, build_project_portfolio) ==> apply_for_engineering_positions).',
      '((build_project_portfolio, network_with_professionals) ==> apply_for_engineering_positions).'
    ];

    for (const dependency of dependencies) {
      await core.addInput(dependency);
    }

    // The system should be able to reason about goal dependencies
    const reasoningResults = await core.reason();

    expect(reasoningResults).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('apply_for_engineering_positions'),
        punctuation: '!'
      })
    );

    // Use embeddings to identify similar goal structures from past experience
    const goalEmbedding = await core.lm.generateEmbedding(highLevelGoal);
    const similarGoals = await core.lm.findSimilarGoals(
      goalEmbedding,
      { threshold: 0.7 }
    );

    // Apply lessons learned from similar goals
    const lessons = similarGoals.map(goal => goal.lessons).flat();
    for (const lesson of lessons) {
      await core.addInput(`(successful_career_path --> ${lesson}).`);
    }

    // The system should now have a strategic plan based on decomposition
    const strategicPlan = await core.plan(highLevelGoal);
    expect(strategicPlan.steps).toBeDefined();
    expect(strategicPlan.steps.length).toBeGreaterThan(3);
  });

  it('should handle goal conflicts and perform strategic reasoning', async () => {
    const core = createCore();

    // Set up conflicting goals
    const goal1 = 'maximize_income!';
    const goal2 = 'maximize_leisure_time!';
    const goal3 = 'maintain_work_life_balance!';

    await core.addInput(goal1);
    await core.addInput(goal2);
    await core.addInput(goal3);

    // The neural component analyzes the goal conflicts
    const conflictAnalysis = await core.lm.analyzeGoalConflicts([goal1, goal2, goal3]);

    expect(conflictAnalysis.conflicts).toContainEqual(
      expect.objectContaining({
        goals: expect.arrayContaining([expect.stringContaining('income'), expect.stringContaining('leisure')])
      })
    );

    // The system represents the conflict in Narsese for formal reasoning
    const conflictRepresentation = [
      '((maximize_income & maximize_leisure_time) --> resource_conflict).',
      '(resource_conflict --> (prioritization_needed | compromise_required)).'
    ];

    for (const narsese of conflictRepresentation) {
      await core.addInput(narsese);
    }

    // Use neural component to suggest resolution strategies
    const resolutionStrategies = await core.lm.generateResolutionStrategies(
      conflictAnalysis,
      { approach: 'compromise', constraints: ['time', 'energy'], preferences: ['balance'] }
    );

    expect(resolutionStrategies).toContainEqual(
      expect.objectContaining({ strategy: expect.stringContaining('compromise') })
    );
    expect(resolutionStrategies).toContainEqual(
      expect.objectContaining({ strategy: expect.stringContaining('prioritization') })
    );

    // Convert the best strategy to a Narsese plan
    const compromisePlan = [
      '(&/, (allocate_time(0.7, work), allocate_time(0.3, leisure)), (optimize_efficiency(work)), (set_boundaries(work, leisure)))!',
      '(maintain_work_life_balance --> higher_priority_than individual_goals).'
    ];

    for (const plan of compromisePlan) {
      await core.addInput(plan);
    }

    // The system should prioritize the balance goal over conflicting individual goals
    const prioritizedGoals = await core.prioritizeGoals();

    const balanceGoal = prioritizedGoals.find(g => g.term.includes('work_life_balance'));
    expect(balanceGoal.priority).toBeGreaterThan(0.8);

    // The system should be able to execute the compromise plan
    const executionPlan = await core.plan(balanceGoal.term);
    expect(executionPlan).toBeDefined();

    // Validate semantic consistency of the compromise approach
    const compromiseEmbedding = await core.lm.generateEmbedding('work-life compromise strategy');
    const goalEmbeddings = await Promise.all([
      core.lm.generateEmbedding('maximize_income'),
      core.lm.generateEmbedding('maximize_leisure_time')
    ]);

    const consistencyScores = goalEmbeddings.map(emb =>
      core.lm.calculateSimilarity(compromiseEmbedding, emb)
    );

    // The compromise should have some relation to both original goals
    expect(consistencyScores.some(score => score > 0.3)).toBe(true);
  });

  it('should adapt goals and plans when encountering obstacles', async () => {
    const core = createCore();

    // Set up an initial goal and plan
    const originalGoal = 'complete_phd_in_two_years!';
    const initialPlan = [
      '(&/, enroll_in_program, complete_courses, conduct_research, write_dissertation, defend_thesis)!'
    ];

    await core.addInput(originalGoal);
    for (const plan of initialPlan) {
      await core.addInput(plan);
    }

    // Simulate an obstacle (e.g., research is taking longer than expected)
    const obstacleReport = {
      type: 'timeline_delay',
      cause: 'research_complexity_higher_than_expected',
      impact: 'original_timeline_unfeasible'
    };

    // The neural component helps re-plan around the obstacle
    const adaptedPlan = await core.lm.adaptPlan(
      initialPlan[0],
      obstacleReport,
      { alternativeApproaches: ['extend_timeline', 'narrow_scope', 'change_methodology'] }
    );

    expect(adaptedPlan).toContain('extend_timeline');
    expect(adaptedPlan).toContain('narrow_scope');

    // Represent the adapted approach in Narsese
    const adaptedNarsese = [
      '(extend_timeline --> revised_phd_plan).',
      '(narrow_research_scope --> feasible_alternative).',
      '((research_complexity_high, two_year_constraint) ==> (realistic_timeline_extension)).'
    ];

    for (const narsese of adaptedNarsese) {
      await core.addInput(narsese);
    }

    // Update the original goal with realistic constraints
    const revisedGoal = 'complete_phd_in_realistic_timeline!';
    await core.addInput(revisedGoal);

    // The neural component learns from the adaptation experience
    const learningOutcome = await core.lm.extractLearningFromAdaptation(
      originalGoal,
      obstacleReport,
      adaptedPlan
    );

    expect(learningOutcome).toContain('conservative_estimation');
    expect(learningOutcome).toContain('risk_assessment');

    // Store the learned insight for future planning
    await core.addInput(`(phd_planning --> (risk_factor(research_complexity), buffer_time_required)).`);

    // Create a general rule for similar situations
    const generalRule = [
      '((goal_with_uncertain_factors, optimistic_estimate) ==> (add_contingency_buffer)).',
      '((research_goal, complexity_underrated) ==> (extend_timeline)).'
    ];

    for (const rule of generalRule) {
      await core.addInput(rule);
    }

    // The system should now apply learned patterns to new goals
    const newGoal = 'complete_research_project_on_time!';
    await core.addInput(newGoal);

    const derivedPlanningAdvice = await core.reason();

    expect(derivedPlanningAdvice).toContainEqual(
      expect.objectContaining({
        term: expect.stringContaining('contingency_buffer'),
        punctuation: '.'
      })
    );

    // Test that the system can predict potential obstacles
    const obstaclePrediction = await core.lm.predictObstacles(
      newGoal,
      { learnedPatterns: learningOutcome }
    );

    expect(obstaclePrediction).toContainEqual(
      expect.objectContaining({
        obstacle: expect.stringContaining('complexity_underestimation'),
        probability: expect.any(Number)
      })
    );
  });
});