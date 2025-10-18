/**
 * @file: examples/shared/planProcessorDemo.js
 * @description: Shared functionality for plan processing demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Shared utilities for plan processing demos
const createSystem = () => new System({});

const withSystem = async (fn) => {
  const system = createSystem();
  try {
    await system.start();
    return await fn(system);
  } finally {
    await system.stop();
  }
};

const createSamplePlan = () => `# Development Plan

## Goals
- Implement user authentication system
- Design database schema for user management
- Create API endpoints for user operations
- Build user interface for registration and login

## Objectives
- Ensure secure password storage using hashing
- Implement rate limiting for authentication endpoints
- Add two-factor authentication support

## Tasks
- Set up development environment
- Create user model with validation
- Implement login/logout functionality
- Test authentication flow with various scenarios
`;

const logProcessingResults = (processingResult, tasks) => {
  console.log('\\n📊 Processing Results:');
  console.log('   Goals extracted:', processingResult.goals.length);
  console.log('   Dependencies analyzed:', Object.keys(processingResult.dependencies).length);

  // Display extracted goals
  processingResult.goals.forEach((goal, index) => {
    console.log(`   ${index + 1}. ${goal.text} (Confidence: ${goal.confidence.toFixed(2)}, Priority: ${goal.priority.toFixed(2)})`);
  });

  // Display dependencies
  console.log('\\n🔗 Dependencies:');
  for (const [goal, deps] of Object.entries(processingResult.dependencies)) {
    if (deps.length > 0) {
      console.log(`   ${goal}: depends on ${deps.length} other goals`);
    }
  }

  // Display generated tasks
  console.log('\\n📋 Tasks Generated:', tasks.length);
  tasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.term} (Priority: ${task.priority.toFixed(2)})`);
  });
};

// Main demonstration function
export async function demonstratePlanProcessing() {
  const system = createSystem();

  try {
    await system.start();
    console.log('✅ System started successfully');

    const planProcessor = system.core.planProcessor;
    if (!planProcessor) {
      console.log('⚠️  PlanProcessor not available in this configuration');
      return null;
    }

    console.log('\\n📋 Plan Processor Initial Stats:');
    const initialStats = planProcessor.getStats();
    console.log('   Documents Processed:', initialStats.documentsProcessed);
    console.log('   Goals Extracted:', initialStats.goalsExtracted);
    console.log('   Goals Converted:', initialStats.goalsConverted);

    console.log('\\n📝 Creating sample plan document...');
    const samplePlan = createSamplePlan();

    console.log('\\n🔄 Processing plan document...');
    const processingResult = await planProcessor.processDocument(samplePlan, 'markdown');
    const tasks = planProcessor.convertGoalsToTasks(processingResult.goals);

    logProcessingResults(processingResult, tasks);

    console.log('\\n🎯 Testing goal prioritization...');
    const prioritizedGoals = [...processingResult.goals].sort((a, b) => b.priority - a.priority);
    console.log('   Goals sorted by priority');

    console.log('\\n✅ Testing goal validation...');
    const validGoals = processingResult.goals.filter(goal => goal.confidence >= planProcessor.config.confidenceThreshold);
    console.log('   Valid goals after threshold filter:', validGoals.length);

    console.log('\\n📈 Updated Plan Processor Stats:');
    const finalStats = planProcessor.getStats();
    console.log('   Documents Processed:', finalStats.documentsProcessed);
    console.log('   Goals Extracted:', finalStats.goalsExtracted);
    console.log('   Goals Converted:', finalStats.goalsConverted);
    console.log('   LM Processings:', finalStats.lmProcessings);

    return {
      initialStats,
      finalStats,
      processingResult,
      tasks,
      prioritizedGoals,
      validGoals,
      hasPlanProcessor: !!planProcessor,
      system
    };

  } catch (error) {
    console.error('❌ Error during plan processing example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Test function for plan processing functionality
export async function testPlanProcessingFunctionality() {
  return await withSystem(async (system) => {
    const processor = system.core.planProcessor;
    if (!processor) throw new Error('PlanProcessor not available');

    const componentsAvailable = {
      hasPlanProcessor: !!processor,
      hasProcessDocument: typeof processor.processDocument === 'function',
      hasConvertGoalsToTasks: typeof processor.convertGoalsToTasks === 'function',
      hasGetStats: typeof processor.getStats === 'function',
      hasProcessToTasks: typeof processor.processToTasks === 'function'
    };

    const samplePlan = `# Sample Plan
## Goals
- Implement feature A
- Test feature A
- Deploy feature A

## Dependencies
- Feature A depends on framework upgrade
- Testing requires test environment
`;

    const result = await processor.processDocument(samplePlan, 'markdown');
    const tasks = processor.convertGoalsToTasks(result.goals);
    const directResult = await processor.processToTasks(samplePlan);

    return {
      componentsAvailable,
      result,
      tasks,
      directResult,
      stats: processor.getStats()
    };
  });
}

// Test function for document parsing and goal extraction
export async function testDocumentParsingAndGoalExtraction() {
  return await withSystem(async (system) => {
    const processor = system.core.planProcessor;
    if (!processor) throw new Error('PlanProcessor not available');

    const testDocuments = {
      markdown: `# Development Goals
- Implement login functionality
- Design user interface
- Create database schema

## Priorities
- Security features (high priority)
- Performance optimizations (medium priority)
`,

      text: `
GOAL: Create authentication system
OBJECTIVE: Secure user data
TASK: Implement password hashing
NEED TO: Test with multiple scenarios
`,

      json: JSON.stringify({
        goals: [
          "Implement user management",
          "Create reporting system",
          "Add notification service"
        ],
        objectives: [
          "Improve user experience",
          "Increase system reliability"
        ]
      })
    };

    const extractionResults = {};
    extractionResults.markdown = await processor.processDocument(testDocuments.markdown, 'markdown');
    extractionResults.text = await processor.processDocument(testDocuments.text, 'text');
    extractionResults.json = await processor.processDocument(testDocuments.json, 'json');

    return {
      extractionResults,
      markdownGoals: extractionResults.markdown.goals.length,
      textGoals: extractionResults.text.goals.length,
      jsonGoals: extractionResults.json.goals.length
    };
  });
}

// Test function for goal prioritization and validation
export async function testGoalPrioritizationAndValidation() {
  return await withSystem(async (system) => {
    const processor = system.core.planProcessor;
    if (!processor) throw new Error('PlanProcessor not available');

    const planWithConfidence = `# Project Plan
## High Priority Goals
- Implement core authentication system (confident: 90%)
- Set up database for user management (confident: 85%)

## Medium Priority Goals
- Create user dashboard interface (confident: 70%)
- Implement data export functionality (confident: 60%)

## Lower Priority Goals
- Add advanced analytics (confident: 40%)
- Implement experimental features (confident: 30%)
`;

    const result = await processor.processDocument(planWithConfidence, 'markdown');
    const validGoals = result.goals.filter(goal => goal.confidence >= processor.config.confidenceThreshold);

    return {
      allGoals: result.goals,
      validGoals,
      sortedGoals: [...result.goals].sort((a, b) => b.priority - a.priority),
      confidenceThreshold: processor.config?.confidenceThreshold || 0.7,
      goalsCount: result.goals.length,
      validGoalsCount: validGoals.length
    };
  });
}

// Test function for task generation from structured plans
export async function testTaskGenerationFromStructuredPlans() {
  return await withSystem(async (system) => {
    const processor = system.core.planProcessor;
    if (!processor) throw new Error('PlanProcessor not available');

    // Setup mock LM for testing
    const mockLM = {
      generateText: async (prompt) => {
        const goals = [
          { text: "Implement user authentication system", confidence: 0.9, priority: 0.8 },
          { text: "Design database schema", confidence: 0.85, priority: 0.7 },
          { text: "Create API endpoints", confidence: 0.8, priority: 0.6 },
          { text: "Build frontend UI components", confidence: 0.75, priority: 0.5 },
          { text: "Write unit tests", confidence: 0.7, priority: 0.4 },
          { text: "Deploy to staging", confidence: 0.65, priority: 0.3 },
          { text: "Deploy to production", confidence: 0.6, priority: 0.2 }
        ];
        return `\`\`\`json\n${JSON.stringify(goals)}\n\`\`\``;
      }
    };

    system.core.lm = mockLM;
    processor.lm = mockLM;

    if (processor.config) {
      processor.config.enableLMProcessing = true;
      processor.config.confidenceThreshold = 0.5;
    }

    const structuredPlan = `# Project Plan

## Goals
- Goal: Implement user authentication system. (confident: 90%)
- Goal: Design database schema. (confident: 85%)
- Goal: Create API endpoints. (confident: 80%)
- Goal: Build frontend UI components. (confident: 75%)
- Goal: Write unit tests. (confident: 70%)
- Goal: Deploy to staging. (confident: 65%)
- Goal: Deploy to production. (confident: 60%)

## Objectives
- Must implement core features
- Need to set up CI/CD pipeline
- Should optimize performance
- Will create documentation

## Action Items
- Implement login functionality
- Create user management system
- Build dashboard UI
- Set up monitoring

## Dependencies
- Phase 2 depends on Phase 1 completion.
- Phase 3 depends on Phase 2 completion.
`;

    const result = await processor.processDocument(structuredPlan, 'markdown');
    const tasks = processor.convertGoalsToTasks(result.goals);

    return {
      result,
      tasks,
      hasDependencies: Object.keys(result.dependencies).length > 0,
      tasksGenerated: result.goals.length > 0 && tasks.length > 0,
      validTasks: tasks.filter(task => task.term && task.type && task.punctuation && task.truth),
      totalGoals: result.goals.length,
      taskCount: tasks.length
    };
  });
}