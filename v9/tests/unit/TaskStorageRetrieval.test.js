import { Concept } from '../../core/Concept.js';
import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { TaskTable, SelectionCriteria, DefaultAggregationFunctions } from '../../core/TaskTable.js';
import { Answer } from '../../core/Answer.js';
import { Term } from '../../core/Term.js';

describe('Task Storage and Retrieval', () => {
  let concept;
  let term;

  beforeEach(() => {
    term = { name: 'test_term', termType: 'atom', complexity: 1, hash: 'test_hash_123' };
    concept = new Concept(term, Date.now());
  });

  describe('Basic Task Storage and Retrieval', () => {
    test('should store and retrieve tasks by punctuation type', () => {
      const beliefTask = createMockTask(Punctuation.BELIEF, 0.8, 0.9, Date.now() - 1000);
      const goalTask = createMockTask(Punctuation.GOAL, 0.7, 0.8, Date.now() - 500);
      const questionTask = createMockTask(Punctuation.QUESTION, 0, 0, Date.now());

      concept.addTask(beliefTask);
      concept.addTask(goalTask);
      concept.addTask(questionTask);

      const beliefs = concept.tasks(Punctuation.BELIEF);
      const goals = concept.tasks(Punctuation.GOAL);
      const questions = concept.tasks(Punctuation.QUESTION);

      expect(beliefs).toHaveLength(1);
      expect(goals).toHaveLength(1);
      expect(questions).toHaveLength(1);
      expect(beliefs[0]).toBe(beliefTask);
      expect(goals[0]).toBe(goalTask);
      expect(questions[0]).toBe(questionTask);
    });

    test('should retrieve tasks with default selection criteria', () => {
      // Add tasks with different timestamps and confidences
      const oldHighConfTask = createMockTask(Punctuation.BELIEF, 0.9, 0.9, Date.now() - 10000);
      const newLowConfTask = createMockTask(Punctuation.BELIEF, 0.6, 0.6, Date.now() - 1000);
      const newestTask = createMockTask(Punctuation.BELIEF, 0.7, 0.7, Date.now());

      concept.addTask(oldHighConfTask);
      concept.addTask(newLowConfTask);
      concept.addTask(newestTask);

      // Default should return most recent first
      const tasks = concept.tasks(Punctuation.BELIEF, Infinity, null, 3);
      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toBe(newestTask);
      expect(tasks[1]).toBe(newLowConfTask);
      expect(tasks[2]).toBe(oldHighConfTask);
    });
  });

  describe('Selection Criteria', () => {
    test('should select tasks using MOST_RECENT criteria', () => {
      const oldTask = createMockTask(Punctuation.BELIEF, 0.3, 0.4, Date.now() - 10000);
      const newTask = createMockTask(Punctuation.BELIEF, 0.8, 0.6, Date.now());

      concept.addTask(oldTask);
      concept.addTask(newTask);

      const tasks = concept.tasks(Punctuation.BELIEF, Infinity, SelectionCriteria.MOST_RECENT, 2);
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBe(newTask); // Most recent first
      expect(tasks[1]).toBe(oldTask);
    });

    test('should select tasks using HIGHEST_CONFIDENCE criteria', () => {
      const lowConfTask = createMockTask(Punctuation.BELIEF, 0.3, 0.4, Date.now() - 5000);
      const highConfTask = createMockTask(Punctuation.BELIEF, 0.9, 0.9, Date.now() - 10000); // Older but higher confidence

      concept.addTask(lowConfTask);
      concept.addTask(highConfTask);

      const tasks = concept.tasks(Punctuation.BELIEF, Infinity, SelectionCriteria.HIGHEST_CONFIDENCE, 2);
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBe(highConfTask); // Highest confidence first
      expect(tasks[1]).toBe(lowConfTask);
    });

    test('should select tasks using custom selection criteria', () => {
      const task1 = createMockTask(Punctuation.BELIEF, 0.7, 0.3, Date.now() - 1000);
      const task2 = createMockTask(Punctuation.BELIEF, 0.4, 0.8, Date.now()); // More recent, higher confidence

      concept.addTask(task1);
      concept.addTask(task2);

      // Custom criteria that favors confidence over time
      const customCriteria = { timeWeight: 0.2, confidenceWeight: 0.8, timeImportance: 'relevance' };
      const tasks = concept.tasks(Punctuation.BELIEF, Infinity, customCriteria, 2);

      // With high confidence weight, task2 should still come first
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBe(task2);
    });
  });

  describe('Truth Aggregation', () => {
    test('should aggregate truth values correctly', () => {
      const task1 = createMockTask(Punctuation.BELIEF, 0.8, 0.9, Date.now() - 2000);
      const task2 = createMockTask(Punctuation.BELIEF, 0.6, 0.7, Date.now() - 1000);
      const task3 = createMockTask(Punctuation.BELIEF, 0.9, 0.8, Date.now());

      concept.addTask(task1);
      concept.addTask(task2);
      concept.addTask(task3);

      // Test with weighted average aggregation
      const aggregatedTruth = concept.truth(Punctuation.BELIEF, Infinity, SelectionCriteria.BALANCED, 3);
      expect(aggregatedTruth).toBeDefined();
      // Average frequency: (0.8 + 0.6 + 0.9) / 3 = 0.767
      // Average confidence: (0.9 + 0.7 + 0.8) / 3 = 0.8
      expect(aggregatedTruth.frequency).toBeCloseTo(0.767, 1); // Using less precision
      expect(aggregatedTruth.confidence).toBeCloseTo(0.8, 1);
    });

    test('should return null for questions', () => {
      const questionTask = createMockTask(Punctuation.QUESTION, 0, 0, Date.now());
      concept.addTask(questionTask);

      const truth = concept.truth(Punctuation.QUESTION);
      expect(truth).toBeNull();
    });
  });

  describe('Capacity Management - DiscardWeakestOldest Policy', () => {
    test('should evict oldest tasks when at capacity', () => {
      // Create a table with small capacity for testing
      const table = new TaskTable(2);

      const task1 = createMockTask(Punctuation.BELIEF, 0.5, 0.6, Date.now() - 3000);
      const task2 = createMockTask(Punctuation.BELIEF, 0.7, 0.8, Date.now() - 2000);
      const task3 = createMockTask(Punctuation.BELIEF, 0.9, 0.9, Date.now() - 1000);

      table.addTask(task1);
      table.addTask(task2);
      // Adding the third task should evict the oldest (task1)
      table.addTask(task3);

      expect(table.size()).toBe(2);

      const tasks = table.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks).toContain(task2);
      expect(tasks).toContain(task3);
      expect(tasks).not.toContain(task1);
    });

    test('should obey capacity limits during multiple inserts', () => {
      const table = new TaskTable(3);

      // Add 5 tasks to a table with capacity 3
      for (let i = 0; i < 5; i++) {
        const task = createMockTask(Punctuation.BELIEF, 0.5 + i * 0.1, 0.5 + i * 0.1, Date.now() - i * 1000);
        table.addTask(task);
      }

      expect(table.size()).toBe(3);

      // Should contain the 3 most recent tasks (with creation times 0, -1000, -2000)
      const tasks = table.getAllTasks();
      expect(tasks).toHaveLength(3);
    });
  });

  describe('End-to-End Integration', () => {
    test('should handle mixed punctuation types correctly', () => {
      // Create tasks with unique timestamps
      const baseTime = Date.now();
      const tasks = [
        createMockTask(Punctuation.BELIEF, 0.8, 0.9, baseTime - 5000),
        createMockTask(Punctuation.BELIEF, 0.6, 0.7, baseTime - 4000),
        createMockTask(Punctuation.GOAL, 0.9, 0.8, baseTime - 3000),
        createMockTask(Punctuation.QUESTION, 0, 0, baseTime - 2000),
        createMockTask(Punctuation.GOAL, 0.7, 0.6, baseTime - 1000),
      ];

      tasks.forEach(task => concept.addTask(task));

      // With default capacities (1000 beliefs, 100 goals, 50 questions), all tasks should remain
      expect(concept.tasks(Punctuation.BELIEF, Infinity, null, 10)).toHaveLength(2); // 2 beliefs added
      expect(concept.tasks(Punctuation.GOAL, Infinity, null, 10)).toHaveLength(2);    // 2 goals added
      expect(concept.tasks(Punctuation.QUESTION, Infinity, null, 10)).toHaveLength(1); // 1 question added

      // Test truth aggregation for each type
      expect(concept.truth(Punctuation.BELIEF)).toBeDefined();
      expect(concept.truth(Punctuation.GOAL)).toBeDefined();
      expect(concept.truth(Punctuation.QUESTION)).toBeNull();
    });

    test('should handle selection criteria across punctuation types', () => {
      // Create different types of tasks
      const belief1 = createMockTask(Punctuation.BELIEF, 0.3, 0.4, Date.now() - 2000);
      const belief2 = createMockTask(Punctuation.BELIEF, 0.9, 0.9, Date.now() - 1000);
      const goal1 = createMockTask(Punctuation.GOAL, 0.7, 0.8, Date.now() - 1000, 0.3);
      const goal2 = createMockTask(Punctuation.GOAL, 0.6, 0.5, Date.now(), 0.9);

      concept.addTask(belief1);
      concept.addTask(belief2);
      concept.addTask(goal1);
      concept.addTask(goal2);

      // Test retrieval with different selection criteria per type
      const recentBeliefs = concept.tasks(Punctuation.BELIEF, Infinity, SelectionCriteria.MOST_RECENT, 2);
      expect(recentBeliefs[0]).toBe(belief2); // More recent

      const highConfBeliefs = concept.tasks(Punctuation.BELIEF, Infinity, SelectionCriteria.HIGHEST_CONFIDENCE, 2);
      expect(highConfBeliefs[0]).toBe(belief2); // Higher confidence

      const highPriorityGoals = concept.tasks(Punctuation.GOAL, Infinity, SelectionCriteria.GOAL_DEFAULT, 2);
      expect(highPriorityGoals[0]).toBe(goal2); // Higher priority
    });
  });

  describe('Answer-based Query API', () => {
    test('should retrieve tasks using Answer specification', () => {
      const task1 = createMockTask(Punctuation.BELIEF, 0.5, 0.6, Date.now() - 3000);
      const task2 = createMockTask(Punctuation.BELIEF, 0.8, 0.9, Date.now() - 1000); // More recent
      const task3 = createMockTask(Punctuation.BELIEF, 0.7, 0.7, Date.now() - 2000);

      concept.addTask(task1);
      concept.addTask(task2);
      concept.addTask(task3);

      // Use Answer to get most recent
      const answer = Answer.mostRecent(2, Punctuation.BELIEF);
      const results = concept.answer(answer);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(task2); // Most recent
      expect(results[1]).toBe(task3); // Second most recent
    });

    test('should retrieve tasks closest to specific time', () => {
      const referenceTime = Date.now();
      // Create tasks at different times
      const task1 = createMockTask(Punctuation.BELIEF, 0.5, 0.6, referenceTime - 10000); // Far in past
      const task2 = createMockTask(Punctuation.BELIEF, 0.8, 0.9, referenceTime - 100);  // Close to reference
      const task3 = createMockTask(Punctuation.BELIEF, 0.7, 0.7, referenceTime - 1000); // Medium distance
      const task4 = createMockTask(Punctuation.BELIEF, 0.6, 0.8, referenceTime - 20000); // Farther in past

      concept.addTask(task1);
      concept.addTask(task2);
      concept.addTask(task3);
      concept.addTask(task4);

      // Use Answer to get tasks closest to reference time
      const answer = Answer.closestToTime(referenceTime, 2, Punctuation.BELIEF);
      const results = concept.answer(answer);

      expect(results).toHaveLength(2);
      // Task2 should be first (closest to referenceTime), then task3
      expect(results[0]).toBe(task2);
      expect(results[1]).toBe(task3);
    });

    test('should aggregate truth using Answer specification', () => {
      const task1 = createMockTask(Punctuation.BELIEF, 0.7, 0.6, Date.now() - 2000);
      const task2 = createMockTask(Punctuation.BELIEF, 0.9, 0.8, Date.now() - 1000);

      concept.addTask(task1);
      concept.addTask(task2);

      const answer = Answer.highestConfidence(2, Punctuation.BELIEF);
      const truth = concept.truthFromAnswer(answer);

      expect(truth).toBeDefined();
      // With weighted average aggregation, it will be average of both tasks
      // Average frequency: (0.7 + 0.9) / 2 = 0.8
      // Average confidence: (0.6 + 0.8) / 2 = 0.7
      expect(truth.frequency).toBeCloseTo(0.8, 1);
      expect(truth.confidence).toBeCloseTo(0.7, 1);
    });

    test('should handle custom ranking through Answer', () => {
      const task1 = createMockTask(Punctuation.BELIEF, 0.5, 0.4, Date.now() - 2000); // Lower frequency
      const task2 = createMockTask(Punctuation.BELIEF, 0.9, 0.3, Date.now() - 1000); // Higher frequency

      concept.addTask(task1);
      concept.addTask(task2);

      // Custom ranking by frequency
      const customRanking = Answer.withCustomRanking(
        (a, b) => (b.truth?.frequency || 0) - (a.truth?.frequency || 0),
        2,
        Punctuation.BELIEF
      );

      const results = concept.answer(customRanking);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(task2); // Higher frequency
      expect(results[1]).toBe(task1); // Lower frequency
    });
  });
});

// Helper function to create mock task objects
function createMockTask(punctuation, frequency, confidence, createdAt, priority = 0.5) {
  return {
    term: { name: 'test_term', termType: 'atom', complexity: 1, hash: 'test_hash_123' },
    punctuation,
    truth: new TruthValue(frequency, confidence),
    createdAt,
    occurrenceTime: createdAt,
    isBelief: () => punctuation === Punctuation.BELIEF,
    isGoal: () => punctuation === Punctuation.GOAL,
    isQuestion: () => punctuation === Punctuation.QUESTION,
    getPriority: () => priority
  };
}