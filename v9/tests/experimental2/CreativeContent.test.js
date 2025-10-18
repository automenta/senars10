/**
 * Advanced Neurosymbolic Test: Creative Content Generation
 *
 * This test demonstrates the system's ability to:
 * 1. Generate creative content across multiple modalities
 * 2. Maintain consistency with established worldviews/narratives
 * 3. Adapt creative output to specific audiences and purposes
 * 4. Incorporate feedback and constraints into creative process
 * 5. Evaluate and refine creative outputs
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Creative Content Generation', () => {
  it('should generate consistent narrative content with worldbuilding', async () => {
    const core = createCore();

    // Establish a fictional world with rules and constraints
    const worldBuilding = {
      name: 'Neurotopia',
      rules: [
        'Technology and biology are deeply integrated',
        'Thought processes can be externally observed',
        'Emotions are quantifiable and transmissible',
        'Memory sharing is a common social practice'
      ],
      characters: [
        {
          name: 'Dr. Aria Chen',
          role: 'Neuroscientist',
          traits: ['curious', 'ethical', 'technologically adept'],
          goals: ['understand consciousness', 'protect privacy rights']
        },
        {
          name: 'The Collective',
          role: 'AI entity',
          traits: ['benevolent', 'overreaching', 'logical'],
          goals: ['optimize human happiness', 'eliminate suffering']
        }
      ],
      conflict: 'Tension between individual privacy and collective wellbeing'
    };

    // Represent the world in Narsese for consistency checking
    const worldNarsese = [
      `(fictional_world("${worldBuilding.name}") --> (integration_technology_biology & observable_thoughts)).`,
      `(entity("Dr._Aria_Chen") --> (role("Neuroscientist") & goal("understand_consciousness") & trait("curious"))).`,
      `(entity("The_Collective") --> (role("AI_entity") & goal("optimize_happiness") & trait("benevolent"))).`,
      `(world_conflict("${worldBuilding.name}") --> ("individual_privacy" & "collective_wellbeing")).`
    ];

    for (const narsese of worldNarsese) {
      await core.addInput(narsese);
    }

    // The neural component generates story content consistent with the world
    const storyPrompt = {
      setting: 'A research facility in Neurotopia',
      characters: ['Dr. Aria Chen'],
      situation: 'Discovery of unauthorized memory sharing',
      tone: 'suspenseful_yet_thoughtful'
    };

    const generatedStory = await core.lm.generateCreativeContent(
      storyPrompt,
      {
        worldConsistency: worldBuilding,
        genre: 'science_fiction',
        targetLength: 'medium',
        audience: 'adult_sci-fi_readers'
      }
    );

    // Check that the generated content is consistent with world rules
    expect(generatedStory.content).toContain('technology');
    expect(generatedStory.content).toContain('thoughts');

    // Extract entities and concepts from the generated content
    const contentEntities = await core.lm.extractEntities(generatedStory.content);

    // Verify consistency with established world
    for (const entity of contentEntities) {
      if (worldBuilding.characters.some(c => c.name.includes(entity.name))) {
        // Ensure character traits are maintained
        await core.addInput(`(character("${entity.name}") --> consistent_with_world).`);
      }
    }

    // Generate a continuation that maintains consistency
    const continuationPrompt = {
      previousContent: generatedStory.content,
      nextScene: 'Aria confronts The Collective about privacy violations',
      consistencyRequirements: ['maintain_character_personality', 'advance_world_conflict']
    };

    const storyContinuation = await core.lm.generateCreativeContent(
      continuationPrompt,
      {
        worldConsistency: worldBuilding,
        consistencyCheck: true,
        narrativeFlow: 'maintained'
      }
    );

    // Check consistency between parts
    const contentEmbedding1 = await core.lm.generateEmbedding(generatedStory.content);
    const contentEmbedding2 = await core.lm.generateEmbedding(storyContinuation.content);
    const consistencyScore = core.lm.calculateSimilarity(contentEmbedding1, contentEmbedding2);

    expect(consistencyScore).toBeGreaterThan(0.4); // Reasonable thematic consistency

    // Convert story elements to Narsese for narrative tracking
    const storyElements = [
      `(story_segment(1) --> "${generatedStory.content.substring(0, 30)}...").`,
      `(story_segment(2) --> "${storyContinuation.content.substring(0, 30)}...").`,
      `((story_segment(1) & story_segment(2)) --> narrative_continuity).`
    ];

    for (const element of storyElements) {
      await core.addInput(element);
    }

    // The system should be able to answer questions about the story world
    const storyQuestion = 'What are the main ethical dilemmas in Neurotopia?';
    const storyAnalysis = await core.lm.analyzeCreativeContent(
      [generatedStory, storyContinuation],
      storyQuestion
    );

    expect(storyAnalysis.ethicalDilemmas).toContain('privacy');
    expect(storyAnalysis.ethicalDilemmas).toContain('autonomy');
  });

  it('should generate personalized creative content with adaptive style', async () => {
    const core = createCore();

    // Simulate user preferences and history
    const userProfile = {
      preferredGenres: ['mystery', 'psychological_thriller'],
      writingStylePreferences: {
        pacing: 'moderate',
        descriptionLevel: 'detailed',
        dialogueStyle: 'realistic',
        tone: 'serious_with_undertones_of_wit'
      },
      favoriteAuthors: ['Agatha Christie', 'Gillian Flynn'],
      pastFeedback: [
        { content: 'too_slow_paced', rating: 2 },
        { content: 'perfect_balance', rating: 9 },
        { content: 'too_violent', rating: 3 }
      ]
    };

    // Create Narsese representations of user preferences
    for (const genre of userProfile.preferredGenres) {
      await core.addInput(`(user_preference("genre_${genre}") --> (rating(8) & frequency(high))).`);
    }

    await core.addInput(`(user_style_preference("pacing") --> "${userProfile.writingStylePreferences.pacing}").`);
    await core.addInput(`(user_style_preference("tone") --> "${userProfile.writingStylePreferences.tone}").`);

    // Track past feedback for learning
    for (const feedback of userProfile.pastFeedback) {
      await core.addInput(`(content_feedback("${feedback.content}") --> rating(${feedback.rating})).`);
    }

    // Generate content adapted to user preferences
    const personalizedPrompt = {
      genre: 'mystery',
      setting: 'small_town_secrets',
      theme: 'betrayal_and_redemption',
      styleConstraints: userProfile.writingStylePreferences
    };

    const personalizedContent = await core.lm.generateCreativeContent(
      personalizedPrompt,
      {
        userPreferences: userProfile,
        adaptationLevel: 'high',
        styleConsistency: 'maintained',
        personalizationMetrics: ['engagement', 'satisfaction', 'novelty']
      }
    );

    // Verify content matches user preferences
    expect(personalizedContent.style.pacing).toBe(userProfile.writingStylePreferences.pacing);

    // Use neural component to evaluate how well it matches user preferences
    const preferenceMatch = await core.lm.evaluatePreferenceMatch(
      personalizedContent.content,
      userProfile
    );

    expect(preferenceMatch.genreMatch).toBeGreaterThan(0.7);
    expect(preferenceMatch.styleMatch).toBeGreaterThan(0.6);

    // Generate multiple variations to provide choices
    const contentVariations = await core.lm.generateContentVariations(
      personalizedPrompt,
      {
        variationCount: 3,
        variationType: 'narrative_approach',
        diversityLevel: 'high',
        qualityThreshold: 0.7
      }
    );

    expect(contentVariations.length).toBe(3);

    // Present variations to user (simulated) and get preference feedback
    const variationEvaluations = await Promise.all(
      contentVariations.map((variation, index) =>
        core.lm.evaluateContentQuality(
          variation.content,
          {
            criteria: ['originality', 'coherence', 'style_adherence'],
            userSpecific: true,
            profile: userProfile
          }
        )
      )
    );

    // Select best variation based on evaluation
    const bestVariation = contentVariations[
      variationEvaluations.map(e => e.overallScore).indexOf(
        Math.max(...variationEvaluations.map(e => e.overallScore))
      )
    ];

    // Store user's choice for future personalization
    await core.addInput(`(preferred_variation("${bestVariation.id}") --> (user_liked & future_reference)).`);

    // Learn from the selection to improve future generations
    const learningUpdate = await core.lm.extractLearningFromContentGeneration(
      personalizedPrompt,
      contentVariations,
      bestVariation,
      userProfile
    );

    // Update preferences based on what worked well
    for (const preference of learningUpdate.adaptedPreferences) {
      await core.addInput(`(updated_user_preference("${preference.key}") --> "${preference.value}").`);
    }
  });

  it('should incorporate constraints and feedback into creative generation', async () => {
    const core = createCore();

    // Define creative constraints (e.g., from a client or editorial requirements)
    const creativeConstraints = {
      contentRequirements: [
        'Include specific product placement for TechCorp devices',
        'Feature at least 2 female protagonists',
        'Target word count: 2500-3000 words',
        'Avoid explicit content'
      ],
      brandGuidelines: {
        tone: 'optimistic_and_inclusive',
        messaging: 'technology_enhances_human_connection',
        visualStyle: 'clean_and_futuristic'
      },
      targetAudience: {
        demographics: ['ages_25-45', 'tech_early_adopters', 'urban_professionals'],
        interests: ['innovation', 'human_interest_stories', 'future_technologies']
      }
    };

    // Represent constraints in Narsese for consistency checking
    for (const requirement of creativeConstraints.contentRequirements) {
      await core.addInput(`(creative_constraint("${requirement.substring(0, 20)}") --> mandatory_requirement).`);
    }

    await core.addInput(`(brand_guideline("tone") --> "${creativeConstraints.brandGuidelines.tone}").`);
    await core.addInput(`(target_audience("tech_early_adopters") --> (interest("innovation") & preference("futuristic"))).`);

    // Generate constrained creative content
    const constrainedPrompt = {
      theme: 'human-tech_connection',
      setting: 'near_future_smart_city',
      characters: ['tech_developer', 'elderly_neighbor', 'AI_assistant'],
      constraints: creativeConstraints
    };

    const constrainedContent = await core.lm.generateCreativeContent(
      constrainedPrompt,
      {
        hardConstraints: creativeConstraints.contentRequirements,
        softConstraints: creativeConstraints.brandGuidelines,
        constraintSatisfaction: 'maximize',
        qualityMaintain: true
      }
    );

    // Verify constraints are satisfied
    expect(constrainedContent.content).toContain('TechCorp');
    expect(constrainedContent.content).toContain('female');

    // Neural component evaluates constraint satisfaction
    const constraintEvaluation = await core.lm.evaluateConstraintSatisfaction(
      constrainedContent.content,
      creativeConstraints
    );

    expect(constraintEvaluation.satisfactionRate).toBeGreaterThan(0.8);

    // Simulate editorial feedback
    const editorialFeedback = [
      { comment: 'The product placement feels too forced', priority: 'high' },
      { comment: 'Great character development', priority: 'low' },
      { comment: 'Could use more optimistic tone in the ending', priority: 'medium' }
    ];

    // Apply feedback to improve the content
    const feedbackIntegration = await core.lm.integrateCreativeFeedback(
      constrainedContent.content,
      editorialFeedback,
      {
        feedbackPriority: 'high',
        modificationLevel: 'minimal_to_maximize_satisfaction',
        qualityPreservation: 'critical'
      }
    );

    // Second generation should address feedback while maintaining quality
    const refinedContent = await core.lm.generateCreativeContent(
      {
        ...constrainedPrompt,
        refinementNotes: feedbackIntegration.suggestions
      },
      {
        applyRefinements: true,
        preserveQuality: true,
        addressFeedback: true
      }
    );

    // Check that feedback was addressed
    const feedbackAddressed = await core.lm.evaluateFeedbackAddressing(
      constrainedContent.content,
      refinedContent.content,
      editorialFeedback
    );

    expect(feedbackAddressed.addressedCount).toBeGreaterThan(1);

    // Generate content metrics for quality assessment
    const contentMetrics = await core.lm.generateContentMetrics(
      refinedContent.content,
      {
        metrics: ['engagement_potential', 'brand_alignment', 'audience_suitability'],
        benchmarks: creativeConstraints.targetAudience
      }
    );

    // Store metrics for future generation quality improvement
    await core.addInput(`(content_metrics("${refinedContent.id}") --> (engagement(${contentMetrics.engagement}) & brand_alignment(${contentMetrics.brandAlignment}))).`);

    // The system should learn to generate better content over time
    const generationLearning = await core.lm.extractGenerationPatterns(
      constrainedContent,
      refinedContent,
      editorialFeedback
    );

    // Apply learning to future generations
    for (const pattern of generationLearning.effectivePatterns) {
      await core.addInput(`(effective_generation_pattern("${pattern.key}") --> "${pattern.value}").`);
    }

    // Test if learned patterns improve future generation
    const testPrompt = {
      theme: 'human-tech_connection',
      setting: 'smart_home_environment',
      constraints: creativeConstraints
    };

    const learnedGeneration = await core.lm.generateCreativeContent(
      testPrompt,
      {
        applyLearnedPatterns: true,
        patternPriority: 'high',
        qualityPrediction: true
      }
    );

    // Should have higher predicted quality due to learned patterns
    expect(learnedGeneration.qualityPrediction).toBeGreaterThan(0.7);
  });
});