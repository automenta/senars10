import {TermFactory} from '../../src/term/TermFactory.js';
import {Task} from '../../src/task/Task.js';
import {Truth} from '../../src/Truth.js';
import {Stamp} from '../../src/Stamp.js';

// Common test constants
export const TEST_CONSTANTS = {
  PRIORITY: {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.3,
    DEFAULT: 0.5
  },
  TRUTH: {
    HIGH: {f: 0.9, c: 0.8},
    MEDIUM: {f: 0.7, c: 0.6},
    LOW: {f: 0.3, c: 0.4}
  },
  BUDGET: {
    HIGH: {priority: 0.9, durability: 0.8, quality: 0.9},
    MEDIUM: {priority: 0.7, durability: 0.6, quality: 0.7},
    LOW: {priority: 0.3, durability: 0.4, quality: 0.3}
  }
};

// Test factory functions
export const createTerm = (name) => new TermFactory().create({name});

export const createAtom = (name) => new TermFactory().create({components: [name]});

export const createTask = (config = {}) => {
  const {
    term = createAtom('A'),
    punctuation = '.',
    truth = null,
    budget = TEST_CONSTANTS.BUDGET.DEFAULT,
    type = punctuation === '.' ? 'BELIEF' : punctuation === '!' ? 'GOAL' : 'QUESTION'
  } = config;

  return new Task({term, punctuation, truth, budget});
};

export const createTruth = (f = 0.9, c = 0.8) => new Truth(f, c);

export const createMemoryConfig = () => ({
  priorityThreshold: 0.5,
  consolidationInterval: 10,
  priorityDecayRate: 0.9
});

// Common test data generators
export const generateTasks = (count, config = {}) => {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push(createTask({
      ...config,
      term: createAtom(`A${i}`)
    }));
  }
  return tasks;
};

export const generateTerms = (count) => {
  const terms = [];
  for (let i = 0; i < count; i++) {
    terms.push(createAtom(`T${i}`));
  }
  return terms;
};