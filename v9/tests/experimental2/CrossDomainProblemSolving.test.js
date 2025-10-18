/**
 * Advanced Neurosymbolic Test: Cross-Domain Problem Solving
 *
 * This test demonstrates the system's ability to integrate multiple cognitive
 * capabilities to solve complex, real-world problems that span domains:
 * 1. Combines knowledge management, scientific research, decision support, and creativity
 * 2. Adapts to changing requirements and constraints during problem solving
 * 3. Maintains ethical considerations across all solution components
 * 4. Generates human-interpretable explanations for complex solutions
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Cross-Domain Problem Solving', () => {
  it('should solve complex real-world problems requiring multiple cognitive capabilities', async () => {
    const core = createCore();

    // Define a complex real-world challenge: sustainable urban development
    const complexChallenge = {
      problem: 'sustainable_urban_development',
      objectives: [
        'reduce_carbon_emissions',
        'improve_living_quality',
        'ensure_affordable_housing',
        'promote_economic_growth',
        'maintain_cultural_heritage'
      ],
      constraints: [
        'limited_budget',
        'existing_infrastructure',
        'regulatory_requirements',
        'stakeholder_opposition',
        'environmental_protection'
      ],
      stakeholders: [
        'city_government',
        'residents',
        'developers',
        'environmental_groups',
        'businesses',
        'cultural_preservation_orgs'
      ],
      timeframe: '10_year_horizon'
    };

    // Phase 1: Knowledge Collection and Analysis
    // Use knowledge management capabilities to gather relevant information
    const relevantKnowledge = [
      {
        domain: 'urban_planning',
        type: 'research_paper',
        content: 'Mixed-use developments reduce transportation needs by 30-40%',
        source: 'urban_studies_journal_2023'
      },
      {
        domain: 'environmental_science',
        type: 'research_paper',
        content: 'Green roofs can reduce urban heat island effect by up to 2°C',
        source: 'environmental_science_review_2022'
      },
      {
        domain: 'economics',
        type: 'study',
        content: 'Every $1 invested in public transit yields $4 in economic returns',
        source: 'transportation_economics_2023'
      }
    ];

    // Process literature through neural component
    for (const knowledge of relevantKnowledge) {
      const embedding = await core.lm.generateEmbedding(knowledge.content);

      // Create Narsese representations
      await core.addInput(`(relevant_knowledge("${knowledge.source}") --> (domain("${knowledge.domain}") & content("${knowledge.content.substring(0, 30)}..."))).`);
      await core.addInput(`(finding("${knowledge.content.substring(0, 20)}") --> (evidence_strength(high) & applicability_to("${complexChallenge.problem}"))).`);
    }

    // Phase 2: Generate Solution Approaches
    // Use creative reasoning to generate innovative solutions
    const solutionConstraints = {
      feasibility: 'high',
      innovation: 'medium',
      stakeholder_acceptance: 'required',
      environmental_impact: 'positive',
      cost_effectiveness: 'demonstrated'
    };

    const innovativeSolutions = await core.lm.generateMultiDomainSolutions(
      complexChallenge,
      solutionConstraints,
      {
        crossDomainTransfer: 'aggressive',
        solutionDiversity: 'maximized',
        constraintSatisfaction: 'optimized'
      }
    );

    expect(innovativeSolutions.length).toBeGreaterThan(2);

    // Convert solutions to Narsese goals
    for (const solution of innovativeSolutions) {
      await core.addInput(`(proposed_solution("${solution.id}") --> (addresses(${solution.addressedObjectives.length}) & constraint_compliant(${solution.constraintSatisfaction}))).`);
    }

    // Phase 3: Evaluate Solutions with Multiple Criteria
    // Use decision support system to prioritize solutions
    const evaluationCriteria = {
      environmental: 0.25,
      economic: 0.25,
      social: 0.25,
      cultural: 0.15,
      technical: 0.10
    };

    const solutionEvaluations = await core.lm.evaluateMultiCriteria(
      innovativeSolutions,
      evaluationCriteria,
      {
        stakeholderWeights: {
          residents: 0.3,
          government: 0.25,
          businesses: 0.2,
          environmental_groups: 0.15,
          others: 0.1
        },
        uncertaintyHandling: 'probabilistic',
        riskAssessment: 'comprehensive'
      }
    );

    // Identify top-ranked solutions
    const topSolutions = solutionEvaluations
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3);

    // Phase 4: Apply Ethical Reasoning
    // Ensure solutions meet ethical standards
    const ethicalReview = await core.lm.conductEthicalReview(
      topSolutions.map(s => s.solution),
      {
        frameworks: ['consequentialism', 'justice', 'rights'],
        stakeholderImpact: 'assessed',
        fairnessMetrics: 'calculated',
        transparencyRequirements: 'high'
      }
    );

    expect(ethicalReview.approvedSolutions.length).toBeGreaterThan(0);

    // Represent ethical approval in Narsese
    for (const approval of ethicalReview.approvedSolutions) {
      await core.addInput(`(solution("${approval.id}") --> (ethically_approved & implementation_permitted)).`);
    }

    // Phase 5: Create Implementation Plan
    // Generate step-by-step plan using goal reasoning
    const implementationPlan = await core.lm.generateImplementationPlan(
      topSolutions[0].solution,
      {
        phases: 5, // planning, pilot, expansion, optimization, evaluation
        stakeholderEngagement: 'continuous',
        riskMitigation: 'comprehensive',
        successMetrics: ['carbon_reduction', 'residential_satisfaction', 'economic_growth']
      }
    );

    // Represent plan as sequential goal in Narsese
    const sequentialPlan = `(&/, ${implementationPlan.phases.map((phase, idx) =>
      `phase_${idx + 1}("${phase.description.replace(/[^a-zA-Z0-9_]/g, '_')}")
    ).join(', ')})!`;

    await core.addInput(sequentialPlan);

    // Phase 6: Generate Human-Interpretable Explanation
    // Use explanation generation to make complex solution understandable
    const comprehensiveExplanation = await core.lm.generateComprehensiveExplanation(
      {
        challenge: complexChallenge,
        selectedSolution: topSolutions[0].solution,
        evaluation: topSolutions[0],
        plan: implementationPlan,
        ethicalReview: ethicalReview
      },
      {
        audience: 'city_council',
        technicalDepth: 'balanced',
        emphasis: ['feasibility', 'benefits', 'risk_mitigation'],
        visualAids: 'recommended'
      }
    );

    expect(comprehensiveExplanation).toContain('solution');
    expect(comprehensiveExplanation).toContain('benefits');
    expect(comprehensiveExplanation).toContain('risks');

    // Phase 7: Continuous Learning Setup
    // Set up the system to learn from implementation outcomes
    const learningMechanisms = [
      {
        type: 'performance_monitoring',
        metrics: ['carbon_emissions', 'residential_satisfaction', 'economic_indicators'],
        frequency: 'monthly'
      },
      {
        type: 'stakeholder_feedback',
        channels: ['surveys', 'public_forums', 'usage_metrics'],
        aggregation: 'sentiment_analysis'
      },
      {
        type: 'adaptive_optimization',
        parameters: ['resource_allocation', 'implementation_pacing', 'feature_priorities'],
        algorithm: 'multi_armed_bandit'
      }
    ];

    for (const mechanism of learningMechanisms) {
      await core.addInput(`(learning_mechanism("${mechanism.type}") --> (monitors(${mechanism.metrics?.length || mechanism.channels?.length || mechanism.parameters?.length}) & optimization_enabled)).`);
    }

    // Represent the complete solution as an integrated system
    const integratedSolution = [
      `(complex_problem("${complexChallenge.problem}") --> (solved_by("${topSolutions[0].solution.id}") & multi_capability_approach)).`,
      `(solution_approach("${topSolutions[0].solution.id}") --> (knowledge_driven & creative & ethical & practical)).`,
      `(implementation_system("${topSolutions[0].solution.id}") --> (adaptive & learning_capable & stakeholder_inclusive)).`
    ];

    for (const solution of integratedSolution) {
      await core.addInput(solution);
    }

    // Final validation: ensure all cognitive capabilities were properly integrated
    const finalAssessment = await core.lm.assessCognitiveIntegration(
      {
        knowledgeManagement: true,
        creativeReasoning: true,
        decisionSupport: true,
        ethicalReasoning: true,
        learningCapability: true
      },
      {
        integrationQuality: 'comprehensive',
        capabilityBalance: 'achieved',
        solutionCompleteness: 'verified'
      }
    );

    expect(finalAssessment.integrationScore).toBeGreaterThan(0.8);
    expect(finalAssessment.capabilityBalance).toBeGreaterThan(0.7);
  });

  it('should adapt solution when new constraints emerge', async () => {
    const core = createCore();

    // Start with a previously developed solution (simulated)
    await core.addInput('(proposed_solution("urban_planning_solution_123") --> (ethically_approved & implementation_permitted)).');
    await core.addInput('(implementation_phase(1) --> "initial_planning").');

    // Simulate emergence of new constraint (e.g., new environmental regulation)
    const newConstraint = {
      source: 'environmental_regulation_update',
      type: 'new_protected_area',
      impact: 'modifies_construction_zones',
      urgency: 'high',
      affectedComponents: ['phase_2_development', 'green_space_planning']
    };

    // The system should detect the impact of the new constraint
    const impactAnalysis = await core.lm.analyzeConstraintImpact(
      newConstraint,
      {
        solutionId: 'urban_planning_solution_123',
        affectedComponents: newConstraint.affectedComponents,
        severityAssessment: 'comprehensive'
      }
    );

    expect(impactAnalysis.significantImpact).toBe(true);
    expect(impactAnalysis.affectedPhases).toContain('phase_2_development');

    // Represent impact in Narsese
    await core.addInput(`(constraint_impact("${newConstraint.source}") --> (affects_solution("urban_planning_solution_123") & requires_adaptation)).`);

    // Generate adaptation strategies
    const adaptationStrategies = await core.lm.generateAdaptationStrategies(
      newConstraint,
      impactAnalysis,
      {
        adaptationType: 'constraint_satisfaction',
        solutionIntegrity: 'maintained',
        objectivePreservation: 'maximized',
        creativityLevel: 'medium'
      }
    );

    expect(adaptationStrategies.length).toBeGreaterThan(0);

    // Apply the most suitable adaptation
    const chosenAdaptation = adaptationStrategies[0];

    // Update the implementation plan with adaptation
    const updatedPlan = await core.lm.adaptImplementationPlan(
      'urban_planning_solution_123',
      chosenAdaptation,
      {
        planComponentsToModify: newConstraint.affectedComponents,
        constraintIntegration: 'seamless',
        timelineAdjustment: 'minimized'
      }
    );

    // Verify adaptation preserves core solution objectives
    const preservationAnalysis = await core.lm.analyzeObjectivePreservation(
      updatedPlan,
      {
        originalObjectives: ['reduce_carbon_emissions', 'improve_living_quality'],
        toleranceLevel: 0.1, // Allow 10% deviation
        priorityMaintained: 'core_objectives'
      }
    );

    expect(preservationAnalysis.objectivePreservation).toBeGreaterThan(0.9);

    // Update the system's knowledge about solution adaptability
    await core.addInput(`(solution_type("urban_planning") --> (adaptable_to_constraints & learning_enabled)).`);

    // The system should now be better prepared for similar constraint changes
    const improvedResponseTime = await core.lm.assessAdaptationImprovement();
    expect(improvedResponseTime).toBeLessThan(10000); // Should respond faster than 10 seconds
  });
});