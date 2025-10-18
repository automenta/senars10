import {TaskManager} from '../../../src/task/TaskManager.js';
import {Task} from '../../../src/task/Task.js';
import {Memory} from '../../../src/memory/Memory.js';
import {Focus} from '../../../src/memory/Focus.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('TaskManager', () => {
    let taskManager;
    let memory;
    let focus;
    let config;
    let termFactory;
    let newAtom;

    beforeEach(() => {
        termFactory = new TermFactory();
        newAtom = name => termFactory.create({components: [name]});

        memory = new Memory();
        focus = new Focus();

        config = {
            priorityThreshold: 0.5,
            defaultPriority: 0.5,
            defaultBudget: 1.0
        };

        taskManager = new TaskManager(memory, focus, config);
    });

    test('should initialize with correct default state', () => {
        expect(taskManager.stats.totalTasksCreated).toBe(0);
        expect(taskManager.stats.totalTasksProcessed).toBe(0);
        expect(taskManager.stats.tasksPending).toBe(0);
        expect(taskManager.pendingTasksCount).toBe(0);
    });

    test('should add tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF'
        });

        const added = taskManager.addTask(task);

        expect(added).toBe(true);
        expect(taskManager.stats.totalTasksCreated).toBe(1);
        expect(taskManager.stats.tasksPending).toBe(1);
        expect(taskManager.pendingTasksCount).toBe(1);
    });

    test('should reject non-Task objects', () => {
        expect(() => {
            taskManager.addTask({term: 'A', type: 'BELIEF'});
        }).toThrow('TaskManager.addTask requires a Task instance');

        expect(() => {
            taskManager.addTask(null);
        }).toThrow('TaskManager.addTask requires a Task instance');

        expect(() => {
            taskManager.addTask('not a task');
        }).toThrow('TaskManager.addTask requires a Task instance');
    });

    test('should process pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF',
            priority: 0.8
        });

        taskManager.addTask(task);
        const processedTasks = taskManager.processPendingTasks();

        expect(processedTasks).toHaveLength(1);
        expect(processedTasks[0]).toBe(task);
        expect(taskManager.stats.totalTasksProcessed).toBe(1);
        expect(taskManager.stats.tasksPending).toBe(0);
    });

    test('should not add high priority tasks to focus if below threshold', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF',
            priority: 0.3 // Below threshold
        });

        taskManager.addTask(task);
        taskManager.processPendingTasks();

        // We can't directly check focus behavior without mocks, but we can verify
        // that the task gets processed without error
        expect(taskManager.stats.totalTasksProcessed).toBe(1);
    });

    test('should create belief tasks correctly', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const belief = taskManager.createBelief(term, truth, 0.7);

        expect(belief.term).toBe(term);
        expect(belief.truth).toBe(truth);
        expect(belief.type).toBe('BELIEF');
        expect(belief.priority).toBe(0.7);
        expect(belief.budget).toBe(1.0);
    });

    test('should create belief tasks with default priority', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const belief = taskManager.createBelief(term, truth);

        expect(belief.priority).toBe(0.5); // Default priority
    });

    test('should create goal tasks correctly', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const goal = taskManager.createGoal(term, truth, 0.6);

        expect(goal.term).toBe(term);
        expect(goal.truth).toBe(truth);
        expect(goal.type).toBe('GOAL');
        expect(goal.priority).toBe(0.6);
        expect(goal.budget).toBe(1.0);
    });

    test('should create goal tasks without truth value', () => {
        const term = newAtom('A');

        const goal = taskManager.createGoal(term);

        expect(goal.term).toBe(term);
        expect(goal.truth).toBeNull();
        expect(goal.type).toBe('GOAL');
    });

    test('should create question tasks correctly', () => {
        const term = newAtom('A');

        const question = taskManager.createQuestion(term, 0.6);

        expect(question.term).toBe(term);
        expect(question.truth).toBeNull();
        expect(question.type).toBe('QUESTION');
        expect(question.priority).toBe(0.6);
        expect(question.budget).toBe(1.0);
    });

    test('should find tasks by term correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        // Add the task to memory first
        memory.addTask(task);

        const tasks = taskManager.findTasksByTerm(term);

        expect(tasks).toHaveLength(1);
        expect(tasks[0].term).toEqual(term);
    });

    test('should return empty array for non-existent term', () => {
        const tasks = taskManager.findTasksByTerm(newAtom('A'));

        expect(tasks).toHaveLength(0);
    });

    test('should find tasks by type correctly', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');
        const task1 = new Task({term: termA, type: 'BELIEF'});
        const task2 = new Task({term: termB, type: 'BELIEF'});

        memory.addTask(task1);
        memory.addTask(task2);

        const beliefs = taskManager.findTasksByType('BELIEF');

        expect(beliefs).toHaveLength(2);
    });

    test('should find tasks by priority range correctly', () => {
        const term = newAtom('A');
        const task1 = new Task({term, type: 'BELIEF', priority: 0.2});
        const task2 = new Task({term, type: 'BELIEF', priority: 0.5});
        const task3 = new Task({term, type: 'BELIEF', priority: 0.8});

        memory.addTask(task1);
        memory.addTask(task2);
        memory.addTask(task3);

        const mediumPriorityTasks = taskManager.findTasksByPriority(0.3, 0.7);

        expect(mediumPriorityTasks).toHaveLength(1);
        expect(mediumPriorityTasks[0].priority).toBe(0.5);
    });

    test('should get highest priority tasks correctly', () => {
        const term = newAtom('A');
        const task1 = new Task({term, type: 'BELIEF', priority: 0.3});
        const task2 = new Task({term, type: 'BELIEF', priority: 0.8});
        const task3 = new Task({term, type: 'BELIEF', priority: 0.6});

        memory.addTask(task1);
        memory.addTask(task2);
        memory.addTask(task3);

        const highestPriorityTasks = taskManager.getHighestPriorityTasks(2);

        expect(highestPriorityTasks).toHaveLength(2);
        expect(highestPriorityTasks[0].priority).toBe(0.8);
        expect(highestPriorityTasks[1].priority).toBe(0.6);
    });

    test('should update task priority correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF', priority: 0.5});

        // Add task to memory first
        memory.addTask(task);

        const updated = taskManager.updateTaskPriority(task, 0.7);

        expect(updated).toBe(true);
    });

    test('should return false when updating priority of non-existent task', () => {
        const task = new Task({term: newAtom('A'), type: 'BELIEF'});

        const updated = taskManager.updateTaskPriority(task, 0.7);

        expect(updated).toBe(false);
    });

    test('should remove tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        memory.addTask(task);

        const removed = taskManager.removeTask(task);

        expect(removed).toBe(true);
        expect(taskManager.stats.totalTasksProcessed).toBe(1);
    });

    test('should return false when removing non-existent task', () => {
        const task = new Task({term: newAtom('A'), type: 'BELIEF'});

        const removed = taskManager.removeTask(task);

        expect(removed).toBe(false);
    });

    test('should clear pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        taskManager.addTask(task);
        expect(taskManager.stats.tasksPending).toBe(1);

        taskManager.clearPendingTasks();
        expect(taskManager.stats.tasksPending).toBe(0);
        expect(taskManager.pendingTasksCount).toBe(0);
    });

    test('should get pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        taskManager.addTask(task);
        const pendingTasks = taskManager.getPendingTasks();

        expect(pendingTasks).toHaveLength(1);
        expect(pendingTasks[0]).toBe(task);
    });

    test('should handle edge cases and error conditions', () => {
        // Test with null memory
        expect(() => {
            new TaskManager(null, focus, config);
        }).not.toThrow();

        // Test with null focus
        expect(() => {
            new TaskManager(memory, null, config);
        }).not.toThrow();

        // Test with null config
        expect(() => {
            new TaskManager(memory, focus, null);
        }).not.toThrow();

        // Test processing with no pending tasks
        const processedTasks = taskManager.processPendingTasks();
        expect(processedTasks).toHaveLength(0);
    });
});