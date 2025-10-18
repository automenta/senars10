/**
 * Advanced Neurosymbolic Test: NARS Integration with Audio/Speech Processing
 *
 * This test demonstrates the system's ability to integrate NARS reasoning with
 * audio/speech processing for:
 * 1. Speech recognition with contextual understanding
 * 2. Voice command interpretation and action mapping
 * 3. Multimodal integration of audio and visual information
 * 4. Conversational agents with logical reasoning
 * 5. Acoustic scene analysis and classification
 */

import { createCore } from '../../core/createCore';

describe('Advanced: NARS Integration with Audio/Speech Processing', () => {
  it('should integrate speech recognition with contextual symbolic reasoning', async () => {
    const core = createCore();

    // Simulate audio input with various contextual scenarios
    const audioInputs = [
      {
        id: 'audio_1',
        text: 'Please turn on the lights in the living room',
        audioFeatures: {
          speakerId: 'user_123',
          confidence: 0.92,
          accent: 'American_English',
          emotion: 'neutral',
          urgency: 'low'
        },
        context: {
          time: 'evening',
          location: 'home',
          previousActions: ['motion_detected', 'lights_off'],
          currentState: { room: 'living_room', lights: 'off', occupancy: 'present' }
        }
      },
      {
        id: 'audio_2',
        text: 'I think I left my keys somewhere in the house',
        audioFeatures: {
          speakerId: 'user_123',
          confidence: 0.85,
          accent: 'American_English',
          emotion: 'concerned',
          urgency: 'medium'
        },
        context: {
          time: 'morning',
          location: 'home',
          previousActions: ['preparing_to_leave'],
          currentState: { room: 'any', keys: 'unknown_location', departureTime: 'soon' }
        }
      }
    ];

    // Process audio with speech-to-text and context analysis
    for (const audio of audioInputs) {
      const speechAnalysis = await core.asr.analyzeSpeech(
        audio,
        {
          speechToText: true,
          speakerIdentification: true,
          emotionDetection: true,
          contextualUnderstanding: true,
          ambiguityResolution: true
        }
      );

      // Create NARS representation with audio confidence as truth value
      await core.addInput({
        term: `(spoken_command("${audio.id}") --> (text("${audio.text.replace(/[^a-zA-Z0-9_ ]/g, '_')}") & speaker("${audio.audioFeatures.speakerId}") & emotion("${audio.audioFeatures.emotion}") & confidence(${audio.audioFeatures.confidence}))).`,
        truth: { frequency: audio.audioFeatures.confidence, confidence: 0.8 },
        priority: audio.audioFeatures.urgency === 'high' ? 0.9 : 0.6,
        punctuation: '.'
      });

      // Extract intent from speech using neural processing
      const intentAnalysis = await core.asr.extractIntent(
        audio.text,
        {
          context: audio.context,
          possibleIntents: ['control_device', 'find_object', 'answer_question', 'set_reminder'],
          ambiguityHandling: 'context_aware'
        }
      );

      // Represent intent in NARS
      await core.addInput({
        term: `(intent("${intentAnalysis.intent}") --> (command("${audio.text.replace(/[^a-zA-Z0-9_ ]/g, '_')}") & context("${JSON.stringify(audio.context)}"))).`,
        truth: { frequency: intentAnalysis.confidence, confidence: 0.85 },
        punctuation: '.'
      });

      // Use context to disambiguate command meaning
      if (audio.context.currentState) {
        for (const [stateKey, stateValue] of Object.entries(audio.context.currentState)) {
          await core.addInput({
            term: `(system_state("${stateKey}") --> "${stateValue}").`,
            truth: { frequency: 0.9, confidence: 0.95 }, // Current state is highly reliable
            punctuation: '.'
          });
        }
      }
    }

    // Define rules for command interpretation based on context
    const interpretationRules = [
      `(spoken_command(C) * intent("control_device") * system_state("room", R) * system_state("lights", "off")) ==> (action("turn_on_lights", R))).`,
      `(spoken_command(C) * intent("find_object") * system_state("object", "keys")) ==> (action("locate_object", "keys"))).`,
      `(emotion("concerned") * intent("find_object") * time("morning") * departure_soon) ==> (action("urgent_search", "object")).`
    ];

    for (const rule of interpretationRules) {
      await core.addInput({
        term: rule,
        truth: { frequency: 0.85, confidence: 0.8 },
        punctuation: '.'
      });
    }

    // Perform reasoning to generate appropriate actions
    const reasoningResults = await core.reason();

    // Look for generated actions
    const generatedActions = reasoningResults.filter(result =>
      result.term && result.term.includes('action(') && result.punctuation === '!'
    );

    expect(generatedActions.length).toBeGreaterThan(0);

    // Test speech synthesis with contextual information
    const responseContext = {
      command: 'turn_on_lights',
      result: 'success',
      time: 'evening',
      userPreference: 'informative_but_brief'
    };

    const synthesizedResponse = await core.tts.generateContextualResponse(
      responseContext,
      {
        responseStyle: 'helpful_and_natural',
        emotionalTone: 'friendly',
        informationDensity: 'appropriate'
      }
    );

    // Represent the response for future interaction learning
    await core.addInput({
      term: `(system_response("${synthesizedResponse.id}") --> (content("${synthesizedResponse.text.substring(0, 20)}...") & appropriateness("${synthesizedResponse.appropriatenessScore}"))).`,
      truth: { frequency: synthesizedResponse.appropriatenessScore, confidence: 0.8 },
      punctuation: '.'
    });

    // Process a more complex conversational exchange
    const dialogueContext = {
      user: 'user_123',
      previousUtterances: [
        'What is the weather like today?',
        'Will it rain in the afternoon?',
        'Should I take an umbrella?'
      ],
      systemResponses: [
        'The weather is currently sunny with scattered clouds',
        'There is a 30% chance of rain in the afternoon',
        'It might be wise to bring an umbrella given the possibility of rain'
      ]
    };

    // Analyze dialogue coherence and intent progression
    const dialogueAnalysis = await core.asr.analyzeDialogue(
      dialogueContext,
      {
        coherence: true,
        intentProgression: true,
        contextCarryover: true,
        ambiguityResolution: true
      }
    );

    // Represent dialogue structure in NARS
    for (let i = 0; i < dialogueContext.previousUtterances.length; i++) {
      await core.addInput({
        term: `(dialogue_turn(${i + 1}) --> (user_utterance("${dialogueContext.previousUtterances[i].replace(/[^a-zA-Z0-9_ ]/g, '_')}") & system_response("${dialogueContext.systemResponses[i].replace(/[^a-zA-Z0-9_ ]/g, '_')}"))).`,
        truth: { frequency: 0.9, confidence: 0.9 }, // Dialogue is factual
        punctuation: '.'
      });
    }

    // Use dialogue context for better understanding of follow-up questions
    const contextualUnderstanding = [
      `(question("should_I_take_umbrella") * previous_context("rain_30_percent_afternoon") * time_sensitive) ==> (answer_recommendation("take_umbrella"))).`
    ];

    for (const understanding of contextualUnderstanding) {
      await core.addInput(understanding);
    }
  });

  it('should perform multimodal integration of audio and visual information', async () => {
    const core = createCore();

    // Simulate synchronized audio and visual input (e.g., video with speech)
    const multimodalInput = {
      audioStream: {
        speechContent: 'The red ball is on the table',
        speaker: 'child',
        confidence: 0.88,
        timestamp: 1500
      },
      visualStream: {
        objects: [
          { id: 'obj_1', label: 'ball', color: 'red', position: { x: 0.4, y: 0.6 }, confidence: 0.92 },
          { id: 'obj_2', label: 'table', position: { x: 0.4, y: 0.7 }, confidence: 0.95 }
        ],
        spatialRelations: [
          { subject: 'obj_1', relation: 'on', object: 'obj_2' }
        ],
        timestamp: 1500
      }
    };

    // Process audio stream
    const audioAnalysis = await core.asr.analyzeSpeech(
      multimodalInput.audioStream,
      {
        speechToText: true,
        speakerCharacteristics: true,
        contentUnderstanding: true
      }
    );

    await core.addInput({
      term: `(audio_content("${multimodalInput.audioStream.speechContent.replace(/[^a-zA-Z0-9_ ]/g, '_')}") --> (speaker("child") & confidence(${multimodalInput.audioStream.confidence}))).`,
      truth: { frequency: multimodalInput.audioStream.confidence, confidence: 0.8 },
      punctuation: '.'
    });

    // Process visual stream
    for (const obj of multimodalInput.visualStream.objects) {
      await core.addInput({
        term: `(visual_object("${obj.id}") --> (label("${obj.label}") & color("${obj.color || 'unknown'}") & position(${obj.position.x}, ${obj.position.y}) & confidence(${obj.confidence}))).`,
        truth: { frequency: obj.confidence, confidence: 0.8 },
        punctuation: '.'
      });
    }

    // Represent spatial relationships
    for (const relation of multimodalInput.visualStream.spatialRelations) {
      await core.addInput({
        term: `(spatial_relation("${relation.subject}", "${relation.relation}", "${relation.object}") --> truth).`,
        truth: { frequency: 0.9, confidence: 0.85 },
        punctuation: '.'
      });
    }

    // Perform multimodal fusion to verify audio-visual consistency
    const multimodalFusion = await core.lm.performMultimodalFusion(
      multimodalInput,
      {
        consistencyChecking: true,
        crossModalValidation: true,
        uncertaintyIntegration: true
      }
    );

    // Check if audio content matches visual scene
    const audioMatchesVisual = multimodalFusion.consistencyScore > 0.8;

    await core.addInput({
      term: `(audio_visual_consistency("${multimodalInput.audioStream.speechContent.replace(/[^a-zA-Z0-9_ ]/g, '_')}") --> ${audioMatchesVisual ? 'truth' : 'potential_inconsistency'}).`,
      truth: { frequency: multimodalFusion.consistencyScore, confidence: 0.8 },
      punctuation: '.'
    });

    // Create a more complex multimodal scenario: instruction following
    const instructionScenario = {
      instructionAudio: {
        text: 'Put the red block on top of the blue block',
        confidence: 0.91,
        speaker: 'instructor'
      },
      currentScene: {
        objects: [
          { id: 'red_block', label: 'block', color: 'red', position: { x: 0.3, y: 0.8 }, state: 'on_table' },
          { id: 'blue_block', label: 'block', color: 'blue', position: { x: 0.5, y: 0.8 }, state: 'on_table' },
          { id: 'table', label: 'table', position: { x: 0.4, y: 0.9 } }
        ]
      },
      expectedActionSequence: [
        'locate_red_block',
        'grasp_red_block',
        'locate_blue_block',
        'place_red_on_blue'
      ]
    };

    // Represent instruction and scene
    await core.addInput({
      term: `(instruction("${instructionScenario.instructionAudio.text.replace(/[^a-zA-Z0-9_ ]/g, '_')}") --> (target_action("manipulation_sequence") & confidence(${instructionScenario.instructionAudio.confidence}))).`,
      truth: { frequency: instructionScenario.instructionAudio.confidence, confidence: 0.85 },
      punctuation: '!'
    });

    for (const obj of instructionScenario.currentScene.objects) {
      await core.addInput({
        term: `(scene_object("${obj.id}") --> (label("${obj.label}") & color("${obj.color}") & state("${obj.state}"))).`,
        truth: { frequency: 0.95, confidence: 0.9 },
        punctuation: '.'
      });
    }

    // Use both audio and visual information to generate action plan
    const multimodalActionPlan = await core.lm.generateActionPlanFromInstruction(
      instructionScenario.instructionAudio.text,
      instructionScenario.currentScene,
      {
        audioVisualIntegration: true,
        actionSequence: true,
        safetyConstraints: true,
        feasibilityChecking: true
      }
    );

    // Represent action plan in NARS as sequential goal
    const sequentialGoal = `(&/, ${multimodalActionPlan.actions.map(action =>
      `${action.verb}(${action.object})`
    ).join(', ')})!`;

    await core.addInput({
      term: sequentialGoal,
      truth: { frequency: 0.8, confidence: 0.75 },
      priority: 0.9, // High priority for following instructions
      punctuation: '!'
    });

    // Test multimodal question answering
    const multimodalQuestion = {
      question: 'What color is the object on the table?',
      audioConfidence: 0.89,
      visualContext: instructionScenario.currentScene
    };

    const multimodalQA = await core.lm.performMultimodalQuestionAnswering(
      multimodalQuestion,
      {
        audioQuestionUnderstanding: true,
        visualContextIntegration: true,
        answerConfidence: true,
        uncertaintyPropagation: true
      }
    );

    await core.addInput({
      term: `(answer("${multimodalQA.answer}") --> (question("${multimodalQuestion.question.replace(/[^a-zA-Z0-9_ ]/g, '_')}") & confidence(${multimodalQA.confidence}))).`,
      truth: { frequency: multimodalQA.confidence, confidence: 0.8 },
      punctuation: '.'
    });
  });

  it('should perform acoustic scene analysis and classification', async () => {
    const core = createCore();

    // Define acoustic scene types with characteristic features
    const acousticSceneTypes = {
      office: {
        features: ['keyboard_typing', 'muffled_conversations', 'air_conditioning_hum', 'paper_shuffling'],
        temporalPatterns: ['regular_activity_during_business_hours', 'quieter_after_hours'],
        objectsAssociated: ['computers', 'desks', 'chairs', 'telephones']
      },
      kitchen: {
        features: ['dish_washing', 'refrigerator_hum', 'food_preparation_sounds', 'water_faucet'],
        temporalPatterns: ['meal_preparation_times', 'dishwashing_cycles'],
        objectsAssociated: ['refrigerator', 'sink', 'stove', 'dishwasher']
      },
      street: {
        features: ['vehicle_traffic', 'footsteps', 'wind', 'distant_conversations'],
        temporalPatterns: ['rush_hour_traffic', 'pedestrian_flow'],
        objectsAssociated: ['vehicles', 'pedestrians', 'buildings', 'street_infrastructure']
      }
    };

    // Represent acoustic scene knowledge in NARS
    for (const [sceneType, features] of Object.entries(acousticSceneTypes)) {
      await core.addInput({
        term: `(acoustic_scene("${sceneType}") --> (characteristic_sound(${features.features.join(' & characteristic_sound(')}))).`,
        truth: { frequency: 0.9, confidence: 0.85 },
        punctuation: '.'
      });
    }

    // Simulate audio input from unknown location
    const unknownAudioInput = {
      id: 'scene_001',
      audioFeatures: {
        spectralFeatures: [0.1, 0.8, 0.3, 0.7, 0.2], // Example: MFCC features
        temporalFeatures: [0.4, 0.6, 0.3, 0.8],      // Example: rhythm/temporal features
        detectedSounds: ['keyboard_typing', 'muffled_conversation', 'air_conditioning'],
        signalCharacteristics: {
          reverb: 'medium',
          backgroundNoise: 'low_to_medium',
          dominantFrequency: 'speech_range'
        }
      },
      timestamp: Date.now(),
      duration: 10.0 // seconds
    };

    // Perform acoustic scene classification
    const sceneClassification = await core.asr.classifyAcousticScene(
      unknownAudioInput,
      {
        classificationMethod: 'spectral_and_temporal_analysis',
        featureMatching: true,
        confidenceEstimation: true,
        multipleHypothesis: true
      }
    );

    // Add classification results to NARS
    for (const hypothesis of sceneClassification.hypotheses) {
      await core.addInput({
        term: `(scene_hypothesis("${hypothesis.sceneType}") --> (probability(${hypothesis.probability}) & acoustic_features("${hypothesis.matchingFeatures.slice(0, 3).join('_')}"))).`,
        truth: { frequency: hypothesis.probability, confidence: 0.7 },
        priority: hypothesis.probability,
        punctuation: '?'
      });
    }

    // The most likely scene gets higher confidence in beliefs
    const mostLikelyScene = sceneClassification.hypotheses[0];
    await core.addInput({
      term: `(current_acoustic_scene --> "${mostLikelyScene.sceneType}").`,
      truth: { frequency: mostLikelyScene.probability, confidence: 0.8 },
      punctuation: '.'
    });

    // Use acoustic scene classification to infer activities and objects
    const inferenceRules = [
      `(acoustic_scene("office") * time_during_business_hours) ==> (activity(working) & available_objects(computer, desk)).`,
      `(acoustic_scene("kitchen") * meal_time) ==> (activity(cooking) & available_objects(refrigerator, stove)).`,
      `(acoustic_scene("street") * traffic_noise_high) ==> (activity(commuting) & available_objects(vehicles)).`
    ];

    for (const rule of inferenceRules) {
      await core.addInput({
        term: rule,
        truth: { frequency: 0.75, confidence: 0.7 },
        punctuation: '.'
      });
    }

    // Update beliefs based on acoustic scene
    const reasoningResults = await core.reason();
    const inferredActivities = reasoningResults.filter(result =>
      result.term && result.term.includes('activity(')
    );

    expect(inferredActivities.length).toBeGreaterThan(0);

    // Perform acoustic anomaly detection
    const anomalyDetection = await core.asr.detectAcousticAnomalies(
      unknownAudioInput,
      {
        referenceScene: mostLikelyScene.sceneType,
        anomalyThreshold: 0.7,
        temporalContext: true,
        uncertaintyAware: true
      }
    );

    // Represent anomalies in NARS
    for (const anomaly of anomalyDetection.anomalies) {
      await core.addInput({
        term: `(acoustic_anomaly("${anomaly.id}") --> (type("${anomaly.type}") & severity_level(${anomaly.severity}) & deviation_score(${anomaly.deviationScore}))).`,
        truth: { frequency: anomaly.confidence, confidence: 0.75 },
        priority: anomaly.severity,
        punctuation: '.'
      });
    }

    // Use acoustic information to trigger appropriate responses
    if (anomalyDetection.anomalies.length > 0) {
      // High severity acoustic anomalies trigger investigation goals
      await core.addInput({
        term: `(acoustic_anomaly(severity > 0.8) ==> investigate_sound_source!).`,
        truth: { frequency: 0.9, confidence: 0.8 },
        punctuation: '.'
      });
    }

    // Learn acoustic patterns for improved future classification
    const acousticLearning = await core.lm.extractAcousticPatterns(
      unknownAudioInput,
      sceneClassification,
      {
        patternTypes: ['spectral', 'temporal', 'combinatorial'],
        adaptationLevel: 'scene_specific',
        generalization: 'balanced'
      }
    );

    // Update acoustic scene models
    for (const pattern of acousticLearning.patterns) {
      await core.addInput({
        term: `(learned_acoustic_pattern("${pattern.sceneType}") --> (feature("${pattern.feature}") & discriminative_power(${pattern.discriminativePower}))).`,
        truth: { frequency: pattern.confidence, confidence: 0.8 },
        punctuation: '.'
      });
    }
  });
});