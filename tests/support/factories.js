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
        DEFAULT: {priority: 0.5, durability: 0.5, quality: 0.5, cycles: 100, depth: 10},
        MEDIUM: {priority: 0.7, durability: 0.6, quality: 0.7, cycles: 75, depth: 7},
        HIGH: {priority: 0.9, durability: 0.8, quality: 0.9, cycles: 100, depth: 10},
        LOW: {priority: 0.3, durability: 0.4, quality: 0.3, cycles: 25, depth: 3}
    },
    TRUTH: {
        HIGH: {f: 0.9, c: 0.8},
        MEDIUM: {f: 0.7, c: 0.6},
        LOW: {f: 0.3, c: 0.4}
    }
};

export const createStamp = (overrides = {}) => {
    const defaults = {
        id: `test-id-${Math.random()}`,
        creationTime: Date.now(),
        source: 'INPUT',
        derivations: [],
    };
    return new ArrayStamp({...defaults, ...overrides});
};

export const createTerm = (name = 'A') => termFactory.create({components: [name]});

export const createCompoundTerm = (operator, components) => termFactory.create({operator, components});

export const createTruth = (f = 0.9, c = 0.8) => new Truth(f, c);

export const createTask = (overrides = {}) => {
    const defaults = {
        term: createTerm(),
        punctuation: '.',
        truth: null,
        budget: TEST_CONSTANTS.BUDGET.DEFAULT,
    };
    const taskData = {...defaults, ...overrides};

    if (taskData.punctuation === '.' && taskData.truth === null) {
        taskData.truth = createTruth();
    }

    return new Task(taskData);
};

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
    resourceBudget: 10000,
    enableMemoryValidation: true,
    memoryValidationInterval: 30000
});

export const createTaskManager = (config = {}) => new TaskManager(config);

export const createMemory = (config = createMemoryConfig()) => new Memory(config);

export const createFocus = (config = {}) => new Focus(config);

export const createTestNAR = async (config = {}) => {
    const {NAR} = await import('../../src/nar/NAR.js');
    return new NAR(config);
};
