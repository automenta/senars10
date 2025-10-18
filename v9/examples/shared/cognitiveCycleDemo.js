/**
 * @file: examples/shared/cognitiveCycleDemo.js
 * @description: Shared functionality for cognitive cycle demonstration used by both tests and examples
 */

import createCore from '../../core/orchestration/createCore.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateCognitiveCycle() {
  const core = await createCore();

  try {
    // 1. Set up the cognitive environment
    core.memory.focus.createFocusSet('perception-buffer', 10);
    core.memory.focus.createFocusSet('working-memory', 8);
    core.memory.focus.createFocusSet('reasoning-focus', 5);
    core.memory.focus.createFocusSet('learning-storage', 20);

    core.memory.focus.setFocus('perception-buffer');

    // 2. Create cognitive rules for processing
    const cognitiveRules = [
      {
        name: 'perception-filter',
        type: 'perception',
        complexity: 'simple',
        preFilterTags: ['input', 'observation'],
        condition: (ctx) => ctx.inputType === 'observation' && ctx.confidence > 0.7,
        action: (ctx) => {
          // Store in perception buffer
          core.memory.set(`obs-${Date.now()}`, ctx.observation, {
            type: 'observation',
            tags: ['perceived', 'filtered'],
            priority: Math.floor(ctx.confidence * 10)
          });

          return { result: 'perceived', stored: true };
        },
        priority: 9
      },
      {
        name: 'pattern-recognition',
        type: 'reasoning',
        complexity: 'complex',
        preFilterTags: ['pattern', 'analysis'],
        condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 50,
        action: (ctx) => {
          // Analyze pattern and generate insights
          const insights = {
            pattern: ctx.pattern,
            confidence: ctx.confidence,
            implications: ['trend-detected', 'action-required'],
            generatedAt: new Date().toISOString()
          };

          core.memory.set(`insight-${Date.now()}`, insights, {
            type: 'insight',
            tags: ['pattern', 'analysis', 'generated'],
            priority: 8
          });

          return { result: 'pattern-analyzed', insights };
        },
        priority: 8
      },
      {
        name: 'decision-making',
        type: 'decision',
        complexity: 'medium',
        preFilterTags: ['decision', 'action'],
        condition: (ctx) => ctx.requiresAction && ctx.urgency > 7,
        action: (ctx) => {
          // Make decision and create action plan
          const decision = {
            action: ctx.recommendedAction,
            reasoning: ctx.reasoning,
            confidence: ctx.confidence,
            timestamp: new Date().toISOString()
          };

          core.memory.set(`decision-${Date.now()}`, decision, {
            type: 'decision',
            tags: ['action', 'decision', 'executed'],
            priority: 10
          });

          return { result: 'decision-made', decision };
        },
        priority: 10
      },
      {
        name: 'learning-storage',
        type: 'learning',
        complexity: 'simple',
        preFilterTags: ['experience', 'outcome'],
        condition: (ctx) => ctx.experience && ctx.outcome,
        action: (ctx) => {
          // Store experience for future learning
          const learning = {
            experience: ctx.experience,
            outcome: ctx.outcome,
            learnedAt: new Date().toISOString(),
            usefulness: ctx.usefulness || 0.5
          };

          core.memory.set(`learning-${Date.now()}`, learning, {
            type: 'learning',
            tags: ['experience', 'knowledge', 'stored'],
            priority: Math.floor((ctx.usefulness || 0.5) * 8)
          });

          return { result: 'learned', stored: true };
        },
        priority: 6
      }
    ];

    // Add cognitive rules
    cognitiveRules.forEach(rule => core.rules.add(rule));

    // 3. Run cognitive cycle simulation

    // Phase 1: Perception
    const observations = [
      {
        inputType: 'observation',
        confidence: 0.9,
        observation: { sensor: 'temperature', value: 85, unit: 'celsius', location: 'server-room' }
      },
      {
        inputType: 'observation',
        confidence: 0.6,
        observation: { sensor: 'humidity', value: 45, unit: 'percent', location: 'server-room' }
      }
    ];

    const perceptionResults = [];
    for (const obs of observations) {
      const result = await core.rules.evaluate(obs);
      if (result) {
        perceptionResults.push(result);
      }
    }

    // Phase 2: Pattern Recognition
    const patternData = {
      dataType: 'pattern',
      size: 120,
      pattern: { type: 'temperature-trend', direction: 'increasing', rate: 2.5 },
      confidence: 0.85
    };

    const patternResult = await core.rules.evaluate(patternData);

    // Phase 3: Decision Making
    const decisionContext = {
      requiresAction: true,
      urgency: 9,
      recommendedAction: 'activate-cooling-system',
      reasoning: 'Temperature trend indicates overheating risk',
      confidence: 0.9
    };

    const decisionResult = await core.rules.evaluate(decisionContext);

    // Phase 4: Learning
    const learningExperience = {
      experience: 'temperature-monitoring',
      outcome: 'cooling-activated',
      usefulness: 0.9
    };

    const learningResult = await core.rules.evaluate(learningExperience);

    // 4. Demonstrate memory integration
    core.memory.focus.setFocus('working-memory');
    const workingMemoryItems = core.memory.focus.getFocusItems(5);

    // Query for insights generated
    const insights = core.memory.query({
      type: 'insight',
      limit: 5
    });

    // Query for decisions made
    const decisions = core.memory.query({
      type: 'decision',
      limit: 5
    });

    // 5. Show attention dynamics
    core.memory.focus.updateFocusAttention('perception-buffer', 0.3);
    core.memory.focus.updateFocusAttention('working-memory', 0.8);
    core.memory.focus.updateFocusAttention('reasoning-focus', 0.7);
    core.memory.focus.updateFocusAttention('learning-storage', 0.5);

    const attentionStats = core.memory.focus.getFocusSetStats();

    // 6. Performance summary
    const ruleStats = core.rules.getStats();
    const memoryStats = core.memory.getStats();

    // Return results for verification
    return {
      perceptionResults,
      patternResult,
      decisionResult,
      learningResult,
      workingMemoryItems,
      insights,
      decisions,
      attentionStats,
      ruleStats,
      memoryStats
    };

  } finally {
    await core.stop();
    await core.destroy();
  }
}