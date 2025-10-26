import {ArrayStamp} from '../../src/Stamp.js';
import {TermFactory} from '../../src/term/TermFactory.js';
import {Task} from '../../src/task/Task.js';
import {Truth} from '../../src/Truth.js';
import {TaskManager} from '../../src/task/TaskManager.js';
import {Memory} from '../../src/memory/Memory.js';
import {Focus} from '../../src/memory/Focus.js';

const termFactory = new TermFactory();

export const TEST_CONSTANTS = {
    BUDGET: {
        DEFAULT: {priority: 0.5, durability: 0.5, quality: 0.5},
        MEDIUM: {priority: 0.7, durability: 0.6, quality: 0.7},
        HIGH: {priority: 0.9, durability: 0.8, quality: 0.9},
        LOW: {priority: 0.3, durability: 0.4, quality: 0.3}
    },
    TRUTH: {
        HIGH: {f: 0.9, c: 0.8},
        MEDIUM: {f: 0.7, c: 0.6},
        LOW: {f: 0.3, c: 0.4}
    }
};

/**
 * Factory function for creating ArrayStamp instances for testing.
 * @param {object} [overrides={}] - Properties to override the defaults.
 * @returns {ArrayStamp} A new ArrayStamp instance.
 */
export const createStamp = (overrides = {}) => {
    const defaults = {
        id: `test-id-${Math.random()}`,
        creationTime: Date.now(),
        source: 'INPUT',
        derivations: [],
    };
    return new ArrayStamp({...defaults, ...overrides});
};

/**
 * Factory function for creating Term instances for testing.
 * @param {string} [name='A'] - The name of the term.
 * @returns {Term} A new Term instance.
 */
export const createTerm = (name = 'A') => {
    return termFactory.create({components: [name]});
};

/**
 * Factory function for creating compound Term instances for testing.
 * @param {string} operator - The operator of the compound term.
 * @param {Array<Term>} components - The components of the compound term.
 * @returns {Term} A new compound Term instance.
 */
export const createCompoundTerm = (operator, components) => {
    return termFactory.create({operator, components});
};

/**
 * Factory function for creating Truth instances for testing.
 * @param {number} [f=0.9] - The frequency of the truth value.
 * @param {number} [c=0.8] - The confidence of the truth value.
 * @returns {Truth} A new Truth instance.
 */
export const createTruth = (f = 0.9, c = 0.8) => new Truth(f, c);

/**
 * Factory function for creating Task instances for testing.
 * @param {object} [overrides={}] - Properties to override the defaults.
 * @returns {Task} A new Task instance.
 */
export const createTask = (overrides = {}) => {
    const defaults = {
        term: createTerm(),
        punctuation: '.',
        truth: null,
        budget: TEST_CONSTANTS.BUDGET.DEFAULT,
    };
    const taskData = {...defaults, ...overrides};

    // Automatically assign truth for beliefs if not specified
    if (taskData.punctuation === '.' && taskData.truth === null) {
        taskData.truth = createTruth();
    }

    return new Task(taskData);
};

/**
 * Factory function for creating MemoryConfig instances for testing.
 * @returns {object} A new MemoryConfig instance.
 */
export const createMemoryConfig = () => ({
    priorityThreshold: 0.5,
    consolidationInterval: 10,
    priorityDecayRate: 0.9,
    maxConcepts: 1000,
    maxTasksPerConcept: 100,
    forgetPolicy: 'priority',
    activationDecayRate: 0.005,
    enableAdaptiveForgetting: true,
    memoryPressureThreshold: 0.8,
    resourceBudget: 10000
});

/**
 * Factory function for creating TaskManager instances for testing.
 * @param {object} [config={}] - Configuration for the TaskManager.
 * @returns {TaskManager} A new TaskManager instance.
 */
export const createTaskManager = (config = {}) => {
    return new TaskManager(config);
};

/**
 * Factory function for creating Memory instances for testing.
 * @param {object} [config={}] - Configuration for Memory.
 * @returns {Memory} A new Memory instance.
 */
export const createMemory = (config = createMemoryConfig()) => {
    return new Memory(config);
};

/**
 * Factory function for creating Focus instances for testing.
 * @param {object} [config={}] - Configuration for Focus.
 * @returns {Focus} A new Focus instance.
 */
export const createFocus = (config = {}) => {
    return new Focus(config);
};

/**
 * Utility function for creating a test-ready NAR for integration tests.
 * @param {object} [config={}] - Configuration for the NAR.
 * @returns {Promise<NAR>} A new NAR instance.
 */
export const createTestNAR = async (config = {}) => {
    const {NAR} = await import('../../src/nar/NAR.js');
    return new NAR(config);
};
