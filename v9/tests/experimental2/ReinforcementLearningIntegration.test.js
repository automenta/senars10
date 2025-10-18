/**
 * Advanced Neurosymbolic Test: NARS Integration with Reinforcement Learning
 *
 * This test demonstrates the system's ability to integrate NARS reasoning with
 * reinforcement learning for:
 * 1. Hierarchical goal decomposition and achievement
 * 2. Learning optimal policies through symbolic guidance
 * 3. Transfer learning between symbolic and connectionist representations
 * 4. Multi-agent coordination with symbolic communication
 * 5. Safe exploration with symbolic constraint checking
 */

import { createCore } from '../../core/createCore';

describe('Advanced: NARS Integration with Reinforcement Learning', () => {
  it('should integrate RL agent learning with NARS goal reasoning for hierarchical tasks', async () => {
    const core = createCore();

    // Define a hierarchical task structure with high-level goals and subtasks
    const hierarchicalGoal = {
      mainGoal: 'navigate_and_manipulate_object_in_environment',
      subGoals: [
        'reach_target_location',
        'identify_target_object',
        'grasp_object',
        'transport_object',
        'place_object_at_destination'
      ],
      environment: 'simulated_warehouse',
      constraints: ['collision_avoidance', 'object_safety', 'time_efficiency']
    };

    // Represent the hierarchical goal structure in NARS
    const goalHierarchy = [
      `(main_goal("${hierarchicalGoal.mainGoal}") --> (subgoal("${hierarchicalGoal.subGoals[0]}") & subgoal("${hierarchicalGoal.subGoals[1]}") & subgoal("${hierarchicalGoal.subGoals[2]}"))).`,
      `(${hierarchicalGoal.subGoals[0]} --> prerequisite_for("${hierarchicalGoal.subGoals[2]}")).`,
      `(${hierarchicalGoal.subGoals[2]} --> prerequisite_for("${hierarchicalGoal.subGoals[3]}")).`,
      `(task_success("${hierarchicalGoal.mainGoal}") --> (subgoal_success(${hierarchicalGoal.subGoals.length}) & constraint_satisfaction)).`
    ];

    for (const narsese of goalHierarchy) {
      await core.addInput(narsese);
    }

    // Initialize RL agent for low-level control
    const rlAgentConfig = {
      algorithm: 'PPO', // Proximal Policy Optimization
      stateSpace: ['position', 'orientation', 'object_detection', 'collision_risk'],
      actionSpace: ['move_forward', 'turn_left', 'turn_right', 'grasp', 'release'],
      rewardFunction: {
        success: 100,
        failure: -50,
        timePenalty: -0.1,
        collisionPenalty: -10,
        progressReward: 10
      }
    };

    // The neural component (RL agent) learns policies for subtasks while NARS manages goal hierarchy
    const subtaskLearning = await core.rl.learnSubtaskPolicies(
      hierarchicalGoal.subGoals,
      rlAgentConfig,
      {
        curriculumLearning: true,
        transferLearning: true,
        symbolicGuidance: true
      }
    );

    expect(subtaskLearning.policies).toBeDefined();
    expect(subtaskLearning.policies.length).toBe(hierarchicalGoal.subGoals.length);

    // NARS uses RL success metrics to update goal priorities and strategies
    for (let i = 0; i < hierarchicalGoal.subGoals.length; i++) {
      const subtask = hierarchicalGoal.subGoals[i];
      const policySuccess = subtaskLearning.results[i].successRate;

      await core.addInput({
        term: `(subtask_success("${subtask}") --> rate(${policySuccess})).`,
        truth: { frequency: policySuccess, confidence: 0.8 },
        priority: Math.min(0.9, policySuccess), // Higher success = higher priority for next attempt
        punctuation: '.'
      });
    }

    // Use NARS reasoning to determine optimal subtask sequencing
    const sequencingConstraints = [
      `(${hierarchicalGoal.subGoals[0]} --> (precondition_for("${hierarchicalGoal.subGoals[2]}"))).`,
      `(${hierarchicalGoal.subGoals[1]} --> (precondition_for("${hierarchicalGoal.subGoals[2]}"))).`,
      `(${hierarchicalGoal.subGoals[2]} --> (precondition_for("${hierarchicalGoal.subGoals[3]}"))).`
    ];

    for (const constraint of sequencingConstraints) {
      await core.addInput(constraint);
    }

    // The system can reason about goal dependencies and adapt planning
    const goalReasoning = await core.reason();
    const executableSequence = goalReasoning.filter(result =>
      result.term && result.term.includes('precondition_for')
    );

    expect(executableSequence.length).toBeGreaterThan(0);

    // RL agent executes while receiving symbolic guidance from NARS
    const executionPlan = await core.lm.generateExecutionPlanFromGoals(
      executableSequence,
      {
        actionSequence: true,
        safetyConstraints: true,
        efficiencyMetrics: true
      }
    );

    // The RL agent learns to balance exploration with symbolic constraints
    const safeExploration = await core.rl.performSafeExploration(
      executionPlan,
      {
        constraintChecking: 'symbolic',
        explorationRate: 0.3,
        safetyThreshold: 0.9
      }
    );

    expect(safeExploration.safetyViolations).toBeLessThan(5); // Very few violations
    expect(safeExploration.successRate).toBeGreaterThan(0.7);  // Reasonable success

    // Learning results update NARS knowledge about task difficulty and success factors
    await core.addInput({
      term: `(task_achievement("${hierarchicalGoal.mainGoal}") --> (factor("${safeExploration.keyFactors[0]}") & difficulty("${safeExploration.difficultyEstimate}"))).`,
      truth: { frequency: safeExploration.overallSuccess, confidence: 0.85 },
      punctuation: '.'
    });
  });

  it('should use symbolic knowledge to guide RL policy learning and transfer', async () => {
    const core = createCore();

    // Define a family of related tasks that can benefit from transfer learning
    const taskFamily = {
      baseTask: 'object_manipulation',
      variations: [
        { name: 'pick_and_place_small_objects', complexity: 'low' },
        { name: 'pick_and_place_large_objects', complexity: 'medium' },
        { name: 'pick_and_place_deformable_objects', complexity: 'high' },
        { name: 'pick_and_place_transparent_objects', complexity: 'high' }
      ],
      commonElements: ['grasping', 'navigation', 'collision_avoidance']
    };

    // Represent task relationships in NARS
    for (const variation of taskFamily.variations) {
      await core.addInput(`(task("${variation.name}") --> (type("${taskFamily.baseTask}") & complexity("${variation.complexity}"))).`);
    }

    for (const element of taskFamily.commonElements) {
      await core.addInput(`(task("${taskFamily.variations[0].name}") --> (component("${element}"))).`);
    }

    // RL agent learns base task first
    const basePolicy = await core.rl.trainPolicy(
      taskFamily.variations[0].name,
      {
        algorithm: 'SAC', // Soft Actor-Critic
        episodes: 1000,
        successThreshold: 0.8
      }
    );

    // Use symbolic knowledge to guide transfer to more complex tasks
    const transferGuidance = await core.lm.generateTransferGuidance(
      basePolicy,
      taskFamily.variations.slice(1),
      {
        transferStrategy: 'progressive_complexity',
        symbolicConstraints: taskFamily.commonElements,
        adaptationMethod: 'fine_tuning_with_regularization'
      }
    );

    // Learn more complex tasks with symbolic guidance
    const complexTaskPolicies = await core.rl.trainWithTransfer(
      taskFamily.variations.slice(1),
      {
        basePolicy: basePolicy,
        transferGuidance: transferGuidance,
        regularization: true,
        symbolicSafety: true
      }
    );

    // Verify that transfer learning was effective
    expect(complexTaskPolicies[0].trainingEpisodes).toBeLessThan(1000); // Should learn faster
    expect(complexTaskPolicies[0].finalSuccessRate).toBeGreaterThan(0.7);

    // Use NARS to represent transfer effectiveness
    for (let i = 0; i < complexTaskPolicies.length; i++) {
      const policy = complexTaskPolicies[i];
      const originalTask = taskFamily.variations[i + 1]; // +1 because base task is first

      await core.addInput({
        term: `(transfer_learning("${basePolicy.taskName}", "${originalTask.name}") --> (efficiency("${policy.learningEfficiency}") & success_rate("${policy.finalSuccessRate}"))).`,
        truth: { frequency: policy.finalSuccessRate, confidence: 0.8 },
        punctuation: '.'
      });
    }

    // NARS can reason about which tasks are good for transfer
    const transferAnalysis = [
      `(task("${basePolicy.taskName}") --> (good_source_for_transfer & simple_base)).`,
      `(task_complexity("high") --> (benefits_from_simple_transfer & requires_adaptation)).`
    ];

    for (const analysis of transferAnalysis) {
      await core.addInput(analysis);
    }

    // Perform reasoning to identify optimal transfer strategies
    const reasoningResults = await core.reason();
    const transferRecommendations = reasoningResults.filter(result =>
      result.term && result.term.includes('transfer')
    );

    expect(transferRecommendations.length).toBeGreaterThan(0);

    // Use meta-learning to improve future transfer
    const metaLearning = await core.lm.extractMetaLearningFromTransfer(
      basePolicy,
      complexTaskPolicies,
      {
        patternsToExtract: ['task_similarity', 'transfer_efficiency', 'adaptation_strategies'],
        generalizationLevel: 'high',
        reusePotential: 'maximized'
      }
    );

    // Store meta-learning patterns for future transfer tasks
    for (const pattern of metaLearning.patterns) {
      await core.addInput(`(transfer_pattern("${pattern.key}") --> "${pattern.value}").`);
    }
  });

  it('should coordinate multi-agent systems with symbolic communication and RL optimization', async () => {
    const core = createCore();

    // Define a multi-agent scenario (e.g., robot coordination in warehouse)
    const multiAgentScenario = {
      agents: [
        { id: 'robot_1', capabilities: ['navigation', 'grasping'], location: 'zone_A' },
        { id: 'robot_2', capabilities: ['navigation', 'manipulation'], location: 'zone_B' },
        { id: 'robot_3', capabilities: ['navigation', 'transport'], location: 'charging_station' }
      ],
      tasks: [
        { id: 'task_1', type: 'transport', source: 'zone_A', destination: 'packaging_area', priority: 0.8 },
        { id: 'task_2', type: 'assembly', location: 'workstation_1', priority: 0.9 },
        { id: 'task_3', type: 'inspection', location: 'quality_control', priority: 0.6 }
      ],
      coordinationRules: [
        'avoid_deadlocks',
        'minimize_travel_time',
        'maximize_task_completion',
        'preserve_battery_life'
      ]
    };

    // Represent agent capabilities and task requirements in NARS
    for (const agent of multiAgentScenario.agents) {
      await core.addInput(`(agent("${agent.id}") --> (capability(${agent.capabilities.join(' & capability(')}) & location("${agent.location}"))).`);
    }

    for (const task of multiAgentScenario.tasks) {
      await core.addInput(`(task("${task.id}") --> (type("${task.type}") & priority(${task.priority}) & location("${task.source || task.location}"))).`);
    }

    for (const rule of multiAgentScenario.coordinationRules) {
      await core.addInput(`(coordination_rule("${rule}") --> mandatory_for_multi_agent).`);
    }

    // Initialize individual RL agents
    const individualAgents = await Promise.all(
      multiAgentScenario.agents.map(agent =>
        core.rl.initializeAgent(agent.id, {
          capabilities: agent.capabilities,
          initialLocation: agent.location,
          rewardStructure: {
            taskCompletion: 100,
            efficiencyBonus: 10,
            batteryPreservation: 5,
            ruleCompliance: 20
          }
        })
      )
    );

    // Use symbolic reasoning to coordinate agent assignments
    const coordinationStrategy = await core.lm.generateCoordinationStrategy(
      multiAgentScenario,
      {
        optimizationCriteria: ['efficiency', 'fairness', 'safety'],
        constraintSatisfaction: 'maximized',
        realTimeAdaptation: 'enabled'
      }
    );

    // Represent coordination plan in NARS
    for (const assignment of coordinationStrategy.assignments) {
      await core.addInput({
        term: `(assign("${assignment.agent}", "${assignment.task}") --> (efficiency_score(${assignment.efficiency}) & safety_compliant)).`,
        truth: { frequency: assignment.efficiency, confidence: 0.9 },
        priority: assignment.efficiency,
        punctuation: '!'
      });
    }

    // Multi-agent RL with centralized symbolic coordination
    const multiAgentLearning = await core.rl.trainMultiAgent(
      individualAgents,
      coordinationStrategy,
      {
        centralizedLearning: true,
        symbolicConstraintChecking: true,
        communicationProtocol: 'symbolic_narsese',
        explorationStrategy: 'coordinated'
      }
    );

    // Verify coordination effectiveness
    expect(multiAgentLearning.systemEfficiency).toBeGreaterThan(0.7);
    expect(multiAgentLearning.deadlockFree).toBe(true);
    expect(multiAgentLearning.taskCompletionRate).toBeGreaterThan(0.8);

    // Agents can communicate using Narsese for real-time coordination
    const communicationProtocol = [
      // Example: Agent reporting task completion
      `(agent(robot_1) --> task_completed(task_1)).`,
      // Example: Agent requesting assistance
      `(need_assistance(robot_2, navigation, zone_C) & available(agent(robot_3))).`,
      // Example: Coordination instruction
      `(coordinate(agent(robot_2), agent(robot_3), joint_task(task_2)).`
    ];

    for (const message of communicationProtocol) {
      await core.addInput(message);
    }

    // The system learns from coordination patterns and improves
    const coordinationLearning = await core.lm.extractCoordinationPatterns(
      multiAgentLearning.interactions,
      {
        patternTypes: ['task_allocation', 'conflict_resolution', 'resource_sharing'],
        effectivenessMetrics: ['efficiency', 'fairness', 'stability'],
        generalization: 'maximized'
      }
    );

    // Store learned coordination patterns as reusable rules
    for (const pattern of coordinationLearning.patterns) {
      await core.addInput({
        term: `(coordination_pattern("${pattern.id}") --> (applicable_to("${pattern.context}") & effectiveness("${pattern.effectiveness}"))).`,
        truth: { frequency: pattern.effectiveness, confidence: 0.8 },
        punctuation: '.'
      });
    }

    // Test system's ability to apply learned patterns to new scenarios
    const newScenario = {
      agents: [
        { id: 'robot_4', capabilities: ['navigation'], location: 'zone_D' },
        { id: 'robot_5', capabilities: ['grasping'], location: 'zone_E' }
      ],
      tasks: [
        { id: 'task_4', type: 'transport', source: 'zone_D', destination: 'zone_F', priority: 0.7 }
      ]
    };

    const patternApplication = await core.lm.applyCoordinationPatterns(
      newScenario,
      coordinationLearning.patterns,
      {
        patternMatching: 'semantic_similarity',
        adaptationRequired: 'minimal',
        confidenceThreshold: 0.6
      }
    );

    expect(patternApplication.applicablePatterns.length).toBeGreaterThan(0);
  });
});