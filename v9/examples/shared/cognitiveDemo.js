/**
 * @file: examples/shared/cognitiveDemo.js
 * @description: Shared functionality for cognitive cycle demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateCognitiveCycle() {
  const system = new System({});

  try {
    await system.start();

    // 1. Set up the cognitive environment
    system.core.memory.focus.createFocusSet('perception-buffer', 10);
    system.core.memory.focus.createFocusSet('working-memory', 8);
    system.core.memory.focus.createFocusSet('reasoning-focus', 5);
    system.core.memory.focus.createFocusSet('learning-storage', 20);

    system.core.memory.focus.setFocus('perception-buffer');

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
          system.core.memory.set(`obs-${Date.now()}`, ctx.observation, {
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

          system.core.memory.set(`insight-${Date.now()}`, insights, {
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

          system.core.memory.set(`decision-${Date.now()}`, decision, {
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

          system.core.memory.set(`learning-${Date.now()}`, learning, {
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
    cognitiveRules.forEach(rule => system.core.rules.add(rule));

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
      const result = await system.core.rules.evaluate(obs);
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

    const patternResult = await system.core.rules.evaluate(patternData);

    // Phase 3: Decision Making
    const decisionContext = {
      requiresAction: true,
      urgency: 9,
      recommendedAction: 'activate-cooling-system',
      reasoning: 'Temperature trend indicates overheating risk',
      confidence: 0.9
    };

    const decisionResult = await system.core.rules.evaluate(decisionContext);

    // Phase 4: Learning
    const learningExperience = {
      experience: 'temperature-monitoring',
      outcome: 'cooling-activated',
      usefulness: 0.9
    };

    const learningResult = await system.core.rules.evaluate(learningExperience);

    // 4. Demonstrate memory integration
    system.core.memory.focus.setFocus('working-memory');
    const workingMemoryItems = system.core.memory.focus.getFocusItems(5);

    // Query for insights generated
    const insights = system.core.memory.query({
      type: 'insight',
      limit: 5
    });

    // Query for decisions made
    const decisions = system.core.memory.query({
      type: 'decision',
      limit: 5
    });

    // 5. Show attention dynamics
    system.core.memory.focus.updateFocusAttention('perception-buffer', 0.3);
    system.core.memory.focus.updateFocusAttention('working-memory', 0.8);
    system.core.memory.focus.updateFocusAttention('reasoning-focus', 0.7);
    system.core.memory.focus.updateFocusAttention('learning-storage', 0.5);

    const attentionStats = system.core.memory.focus.getFocusSetStats();

    // 6. Performance summary
    const ruleStats = system.core.rules.getStats();
    const memoryStats = system.core.memory.getStats();

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
      memoryStats,
      hasSystem: !!system,
      system
    };

  } finally {
    if (system) {
      await system.stop();
    }
  }
}

// Export a function specifically for testing cognitive cycle functionality
export async function testCognitiveCycleFunctionality() {
  const system = new System({});

  try {
    await system.start();

    // Test that core cognitive components exist
    const componentsAvailable = {
      hasMemory: !!system.core.memory,
      hasRules: !!system.core.rules,
      hasReasoning: !!system.core.reasoning,
      hasPlanner: !!system.core.planner
    };

    // Set up focus sets for cognitive processing
    if (system.core.memory) {
      system.core.memory.focus.createFocusSet('cognitive-input', 5);
      system.core.memory.focus.createFocusSet('cognitive-output', 5);
      system.core.memory.focus.setFocus('cognitive-input');
    }

    // Create and add a simple cognitive rule
    if (system.core.rules) {
      const cognitiveRule = {
        name: 'test-cognitive-rule',
        type: 'cognitive',
        complexity: 'simple',
        condition: (ctx) => ctx && ctx.type === 'cognitive-input',
        action: (ctx) => ({
          result: 'processed',
          output: ctx.data,
          processedAt: Date.now()
        }),
        priority: 5
      };

      system.core.rules.add(cognitiveRule);
    }

    // Execute a simple cognitive task
    let ruleEvaluationResult = null;
    if (system.core.rules) {
      ruleEvaluationResult = await system.core.rules.evaluate({
        type: 'cognitive-input',
        data: 'test cognitive input',
        priority: 5
      });
    }

    // Test memory operations in cognitive context
    let memoryResult = null;
    if (system.core.memory) {
      const testItemKey = 'cognitive-test-item';
      const testItemValue = { content: 'Cognitive cycle test item', processed: true };

      system.core.memory.set(testItemKey, testItemValue, {
        type: 'cognitive-test',
        priority: 7,
        tags: ['test', 'cognitive']
      });

      memoryResult = system.core.memory.get(testItemKey);
    }

    // Get stats for cognitive components
    const memoryStats = system.core.memory ? system.core.memory.getStats() : {};
    const ruleStats = system.core.rules ? system.core.rules.getStats() : {};

    return {
      componentsAvailable,
      ruleEvaluationResult,
      memoryResult,
      memoryStats,
      ruleStats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing rule-memory interaction
export async function testRuleMemoryInteraction() {
  const system = new System({});

  try {
    await system.start();

    // Create a rule that interacts with memory
    const memoryInteractionRule = {
      name: 'memory-interaction-rule',
      type: 'memory-interaction',
      condition: (ctx) => ctx.command === 'store-and-retrieve',
      action: (ctx) => {
        // Store something in memory
        const storageKey = `temp-${Date.now()}`;
        const storageValue = { original: ctx.payload, storedAt: Date.now(), processed: true };

        system.core.memory.set(storageKey, storageValue, {
          type: 'temp-storage',
          priority: ctx.priority || 5,
          tags: ['temp', 'processed']
        });

        // Retrieve and return
        return {
          stored: true,
          key: storageKey,
          retrievalCheck: system.core.memory.get(storageKey)
        };
      },
      priority: 8
    };

    // Add the rule
    system.core.rules.add(memoryInteractionRule);

    // Execute the rule
    const result = await system.core.rules.evaluate({
      command: 'store-and-retrieve',
      payload: 'test data for rule-memory interaction',
      priority: 7
    });

    // Test if the interaction worked correctly
    const expectedKey = result?.key;
    const storedItem = expectedKey ? system.core.memory.get(expectedKey) : null;

    return {
      ruleExecutionResult: result,
      storedItem,
      interactionSuccessful: !!storedItem && storedItem.processed === true
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing task processing flow
export async function testTaskProcessingFlow() {
  const system = new System({});

  try {
    await system.start();

    // Create a multi-step task processing rule
    const taskProcessingRule = {
      name: 'multi-step-task-processor',
      type: 'task-processing',
      condition: (ctx) => ctx.taskType === 'multi-step',
      action: async (ctx) => {
        // Step 1: Validate task
        if (!ctx.steps || ctx.steps.length === 0) {
          return { error: 'No steps defined', success: false };
        }

        // Step 2: Process each step sequentially
        const results = [];
        for (const step of ctx.steps) {
          // Simulate step processing
          const stepResult = {
            stepId: step.id,
            processedAt: Date.now(),
            result: `Processed: ${step.description}`,
            status: 'completed'
          };

          results.push(stepResult);

          // Store step result in memory
          system.core.memory.set(`step-${step.id}`, stepResult, {
            type: 'task-step',
            priority: step.priority || 5,
            tags: ['task', 'step', 'completed']
          });
        }

        // Step 3: Store final result
        const finalResult = {
          taskId: ctx.taskId,
          totalSteps: ctx.steps.length,
          completedSteps: results.length,
          results,
          completedAt: Date.now(),
          status: 'completed'
        };

        system.core.memory.set(`task-${ctx.taskId}`, finalResult, {
          type: 'task-result',
          priority: 8,
          tags: ['task', 'result', 'completed']
        });

        return finalResult;
      },
      priority: 9
    };

    // Add the task processing rule
    system.core.rules.add(taskProcessingRule);

    // Execute a multi-step task
    const taskContext = {
      taskType: 'multi-step',
      taskId: 'test-task-001',
      steps: [
        { id: 'step-1', description: 'Initialize system', priority: 7 },
        { id: 'step-2', description: 'Process data', priority: 8 },
        { id: 'step-3', description: 'Generate report', priority: 6 }
      ]
    };

    const taskResult = await system.core.rules.evaluate(taskContext);

    // Verify that task results were stored in memory
    const storedTaskResult = system.core.memory.get(`task-${taskContext.taskId}`);
    const stepResults = [];

    for (const step of taskContext.steps) {
      const stepResult = system.core.memory.get(`step-${step.id}`);
      if (stepResult) {
        stepResults.push(stepResult);
      }
    }

    return {
      taskResult,
      storedTaskResult,
      stepResults,
      taskProcessingSuccessful: taskResult?.status === 'completed',
      stepsCompleted: stepResults.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing end-to-end cognitive loop
export async function testEndToEndCognitiveLoop() {
  const system = new System({});

  try {
    await system.start();

    // Create cognitive rules for perception, reasoning, decision, learning
    const perceptionRule = {
      name: 'perception-rule',
      type: 'perception',
      condition: (ctx) => ctx.type === 'sensory-input',
      action: (ctx) => {
        return {
          type: 'perceived-event',
          data: ctx.data,
          timestamp: Date.now(),
          confidence: ctx.confidence || 0.8
        };
      },
      priority: 7
    };

    const reasoningRule = {
      name: 'reasoning-rule',
      type: 'reasoning',
      condition: (ctx) => ctx.type === 'perceived-event',
      action: (ctx) => {
        const implications = [];

        // Generate implications based on perceived data
        if (ctx.data.value > 50) {
          implications.push('high-value-detected');
        }
        if (ctx.confidence > 0.8) {
          implications.push('high-confidence');
        }

        return {
          type: 'reasoned-implication',
          source: ctx,
          implications,
          generatedAt: Date.now()
        };
      },
      priority: 8
    };

    const decisionRule = {
      name: 'decision-rule',
      type: 'decision',
      condition: (ctx) => ctx.type === 'reasoned-implication' && ctx.implications.includes('high-value-detected'),
      action: (ctx) => {
        return {
          type: 'decision-made',
          action: 'flag-for-review',
          reason: 'High value detected',
          implications: ctx.implications,
          decisionTime: Date.now()
        };
      },
      priority: 9
    };

    const learningRule = {
      name: 'learning-rule',
      type: 'learning',
      condition: (ctx) => ctx.type === 'decision-made',
      action: (ctx) => {
        // Store the learning experience
        const experience = {
          decision: ctx.action,
          reason: ctx.reason,
          learningTimestamp: Date.now(),
          context: ctx.implications
        };

        system.core.memory.set(`learning-${Date.now()}`, experience, {
          type: 'learning-experience',
          priority: 6,
          tags: ['learning', 'experience']
        });

        return {
          type: 'learned',
          experienceRecorded: true
        };
      },
      priority: 6
    };

    // Add all cognitive rules
    [perceptionRule, reasoningRule, decisionRule, learningRule].forEach(rule => {
      system.core.rules.add(rule);
    });

    // Execute the cognitive loop
    // Step 1: Perception
    const sensoryInput = {
      type: 'sensory-input',
      data: { value: 75, sensor: 'temperature' },
      confidence: 0.9
    };

    const perceptionResult = await system.core.rules.evaluate(sensoryInput);

    // Step 2: Reasoning (if perception was successful)
    let reasoningResult = null;
    if (perceptionResult) {
      reasoningResult = await system.core.rules.evaluate(perceptionResult);
    }

    // Step 3: Decision (if reasoning identified high-value)
    let decisionResult = null;
    if (reasoningResult) {
      decisionResult = await system.core.rules.evaluate(reasoningResult);
    }

    // Step 4: Learning (if decision was made)
    let learningResult = null;
    if (decisionResult) {
      learningResult = await system.core.rules.evaluate(decisionResult);
    }

    // Check memory for stored learning
    const learningItems = system.core.memory.query({ type: 'learning-experience', limit: 10 });

    return {
      perceptionResult,
      reasoningResult,
      decisionResult,
      learningResult,
      learningItems,
      cognitiveLoopCompleted: !!learningResult,
      totalStepsCompleted: [perceptionResult, reasoningResult, decisionResult, learningResult]
        .filter(r => r !== null).length
    };
  } finally {
    await system.stop();
  }
}