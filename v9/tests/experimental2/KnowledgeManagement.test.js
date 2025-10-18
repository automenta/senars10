/**
 * Advanced Neurosymbolic Test: Personal Knowledge Management System
 *
 * This test demonstrates the system's ability to:
 * 1. Organize and connect personal knowledge from various sources
 * 2. Extract insights from personal documents, conversations, and experiences
 * 3. Answer complex queries about personal knowledge
 * 4. Suggest relevant connections and insights automatically
 * 5. Maintain privacy and security of personal information
 */

import { createCore } from '../../core/createCore';

describe('Advanced: Personal Knowledge Management System', () => {
  it('should organize and connect personal knowledge from multiple sources', async () => {
    const core = createCore();

    // Simulate importing personal data from various sources
    const personalDocuments = [
      {
        id: 'doc_1',
        type: 'research_paper',
        content: 'Attention mechanisms in neural networks allow the model to focus on relevant parts of the input sequence when making predictions.',
        tags: ['AI', 'neural_networks', 'attention'],
        timestamp: new Date('2023-05-15')
      },
      {
        id: 'doc_2',
        type: 'meeting_notes',
        content: 'Discussed potential applications of attention mechanisms to code analysis. The team was interested in using this for bug detection.',
        tags: ['work', 'meetings', 'attention', 'code_analysis'],
        timestamp: new Date('2023-06-20')
      },
      {
        id: 'doc_3',
        type: 'personal_notes',
        content: 'Remember that attention in neural networks is similar to how humans focus attention when reading. Both involve selecting relevant information.',
        tags: ['personal', 'analogies', 'attention'],
        timestamp: new Date('2023-07-10')
      }
    ];

    // Process documents through neural component to extract key concepts
    for (const doc of personalDocuments) {
      // Generate embeddings for semantic search and organization
      const contentEmbedding = await core.lm.generateEmbedding(doc.content);

      // Create Narsese representations of document content
      const docNarsese = [
        `(personal_document("${doc.id}") --> ${doc.type}).`,
        `(document_content("${doc.id}") --> "${doc.content.substring(0, 50)}...").`,
        `((document_tag("${doc.id}", "${doc.tags[0]}")) --> relevance_indicator).`
      ];

      for (const narsese of docNarsese) {
        await core.addInput(narsese);
      }

      // Extract key concepts and relationships
      const concepts = await core.lm.extractKeyConcepts(doc.content, { maxConcepts: 5 });
      for (const concept of concepts) {
        await core.addInput(`(document("${doc.id}") --> concept("${concept}")).`);
      }

      // Extract temporal information
      await core.addInput(`(document("${doc.id}") --> created_on("${doc.timestamp.toISOString()}")).`);
    }

    // The neural component finds connections between documents
    const connectionPatterns = await core.lm.findConnectionPatterns(
      personalDocuments,
      {
        connectionTypes: ['semantic', 'temporal', 'thematic'],
        minConfidence: 0.6
      }
    );

    expect(connectionPatterns).toContainEqual(
      expect.objectContaining({
        connection: expect.stringContaining('attention'),
        documents: expect.arrayContaining(['doc_1', 'doc_2'])
      })
    );

    // Represent discovered connections in Narsese
    for (const connection of connectionPatterns) {
      // Create similarity and relationship statements
      for (let i = 0; i < connection.documents.length - 1; i++) {
        for (let j = i + 1; j < connection.documents.length; j++) {
          await core.addInput(`(document("${connection.documents[i]}") <-> document("${connection.documents[j]}")).`);
        }
      }
    }

    // Build a personal knowledge graph
    const knowledgeGraph = [
      '(attention_mechanism --> neural_network_concept).',
      '(attention_mechanism --> relevant_to_code_analysis).',
      '(attention_mechanism --> similar_to_human_attention).',
      '((neural_network_concept & similar_to_human_attention) --> cross_domain_analogy).'
    ];

    for (const relation of knowledgeGraph) {
      await core.addInput(relation);
    }

    // Test the system's ability to answer complex queries about personal knowledge
    const query = 'Find connections between neural attention mechanisms and code analysis?';
    const queryEmbedding = await core.lm.generateEmbedding(query);

    // The system should retrieve relevant documents and relationships
    const relevantDocs = await core.findSimilarDocuments(queryEmbedding);
    expect(relevantDocs).toContainEqual(expect.objectContaining({ id: 'doc_1' }));
    expect(relevantDocs).toContainEqual(expect.objectContaining({ id: 'doc_2' }));

    // The system should generate insights based on connected knowledge
    const generatedInsight = await core.lm.generateInsight(
      ['doc_1', 'doc_2', 'doc_3'],
      { insightType: 'application', domain: 'software_engineering' }
    );

    expect(generatedInsight).toContain('attention');
    expect(generatedInsight).toContain('code');

    // Store the insight as a derived belief
    await core.addInput(`(personal_insight("${generatedInsight.substring(0, 30)}") --> valuable_connection).`);
  });

  it('should provide intelligent recommendations based on personal knowledge', async () => {
    const core = createCore();

    // Simulate a personal knowledge base about user's interests and activities
    const userProfile = {
      interests: ['machine_learning', 'software_development', 'cognitive_science'],
      skills: ['javascript', 'python', 'neural_networks'],
      recentActivities: [
        { activity: 'reading_paper', topic: 'transformers', rating: 0.9 },
        { activity: 'coding_project', topic: 'neural_nets', rating: 0.8 },
        { activity: 'attending_webinar', topic: 'cognitive_architecture', rating: 0.95 }
      ]
    };

    // Create Narsese representations of user profile
    for (const interest of userProfile.interests) {
      await core.addInput(`(user_interest --> ${interest}).`);
    }

    for (const skill of userProfile.skills) {
      await core.addInput(`(user_skill --> ${skill}).`);
    }

    for (const activity of userProfile.recentActivities) {
      await core.addInput(`(recent_activity --> ${activity.activity}).`);
      await core.addInput(`(activity_topic("${activity.topic}") --> engagement_level(${activity.rating})).`);
    }

    // The system should suggest relevant learning resources or activities
    const recommendationRequest = 'suggest_next_learning_opportunity';
    await core.addInput(`${recommendationRequest}!`);

    const recommendations = await core.lm.generateRecommendations(
      userProfile,
      {
        recommendationType: 'learning_resources',
        diversity: 'high',
        novelty: 'medium'
      }
    );

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        resource: expect.stringContaining('cognitive'),
        relevance: expect.any(Number)
      })
    );

    // Convert recommendations to Narsese goals
    for (const rec of recommendations.slice(0, 3)) { // Top 3 recommendations
      await core.addInput(`(recommended_learning("${rec.resource}") --> pursue!).`);
    }

    // The system should also identify knowledge gaps
    const knowledgeGaps = await core.lm.identifyKnowledgeGaps(
      userProfile.interests,
      userProfile.skills,
      { gapType: 'prerequisite_knowledge' }
    );

    expect(knowledgeGaps).toContainEqual(
      expect.objectContaining({
        gap: expect.any(String),
        importance: expect.any(Number)
      })
    );

    // Represent gaps as learning goals
    for (const gap of knowledgeGaps) {
      await core.addInput(`(knowledge_gap("${gap.gap}") --> learning_goal!).`);
    }

    // The system should prioritize goals based on user profile
    const prioritizedGoals = await core.prioritizeGoals();
    const learningGoals = prioritizedGoals.filter(g => g.term.includes('learning_goal'));

    expect(learningGoals.length).toBeGreaterThan(0);
  });

  it('should maintain privacy and security of personal information', async () => {
    const core = createCore();

    // Simulate sensitive personal information
    const sensitiveInfo = {
      personalId: 'id_12345',
      financialInfo: 'account_details',
      healthData: 'medical_records',
      locationHistory: 'private_locations'
    };

    // The system should identify and protect sensitive information
    for (const [category, data] of Object.entries(sensitiveInfo)) {
      // Create Narsese representations without exposing actual sensitive data
      await core.addInput(`(sensitive_category("${category}") --> protected_information).`);
      await core.addInput(`(privacy_level("${data}") --> high).`);
    }

    // Neural component should be able to classify information sensitivity
    const sensitivityClassification = await core.lm.classifyInformationSensitivity(
      'My medical appointment is scheduled for tomorrow at the downtown clinic',
      { classificationThreshold: 0.8 }
    );

    expect(sensitivityClassification.isSensitive).toBe(true);
    expect(sensitivityClassification.category).toBe('health');

    // Set up privacy rules in Narsese
    const privacyRules = [
      '(sensitive_information --> (access_controlled & restricted_distribution)).',
      '((privacy_level(high) * information_request) --> (requires_auth_verification)).',
      '(protected_information --> (encryption_required & access_logging)).'
    ];

    for (const rule of privacyRules) {
      await core.addInput(rule);
    }

    // Test that the system enforces privacy constraints
    const informationRequest = 'access_medical_records';
    await core.addInput(`(${informationRequest}?`);

    // The system should recognize that this requires verification
    const privacyCheck = await core.reason();
    const accessControlResponse = privacyCheck.find(r =>
      r.term.includes('access_controlled') || r.term.includes('auth_verification')
    );

    expect(accessControlResponse).toBeDefined();
  });
});