import {TaskManager} from '../../../src/task/TaskManager.js';
import {Memory} from '../../../src/memory/Memory.js';
import {Focus} from '../../../src/memory/Focus.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {Truth} from '../../../src/Truth.js';

describe('TaskManager', () => {
    let taskManager;
    let memory;
    let focus;
    let termFactory;
    let term;
    let config;

    beforeEach(() => {
        termFactory = new TermFactory();
        term = termFactory.create({name: 'A'});
        config = {
            priorityThreshold: 0.6,
            defaultBudget: {priority: 0.5, durability: 0.5, quality: 0.5},
        };
        memory = new Memory(config);
        focus = new Focus();
        taskManager = new TaskManager(memory, focus, config);
    });

    test('should initialize correctly', () => {
        expect(taskManager.pendingTasksCount).toBe(0);
        expect(taskManager.stats.totalTasksCreated).toBe(0);
    });

    test('should add a task to pending queue', () => {
        const task = new Task({term});
        taskManager.addTask(task);
        expect(taskManager.pendingTasksCount).toBe(1);
        expect(taskManager.getPendingTasks()).toContain(task);
    });

    test('should process pending tasks', () => {
        const highPriorityTask = new Task({term, budget: {priority: 0.8}});
        const lowPriorityTask = new Task({term: termFactory.create({name: 'B'}), budget: {priority: 0.4}});

        taskManager.addTask(highPriorityTask);
        taskManager.addTask(lowPriorityTask);

        const processedTasks = taskManager.processPendingTasks();
        expect(taskManager.pendingTasksCount).toBe(0);
        expect(processedTasks).toHaveLength(2);
        expect(memory.getConcept(term).totalTasks).toBe(1);
    });

    test('should create belief, goal, and question tasks', () => {
        const belief = taskManager.createBelief(term, new Truth(0.9, 0.8));
        const goal = taskManager.createGoal(term);
        const question = taskManager.createQuestion(term);

        expect(belief.type).toBe('BELIEF');
        expect(goal.type).toBe('GOAL');
        expect(question.type).toBe('QUESTION');
    });

    test('should find tasks by term', () => {
        const task = new Task({term});
        taskManager.addTask(task);
        taskManager.processPendingTasks();
        const foundTasks = taskManager.findTasksByTerm(term);
        expect(foundTasks).toHaveLength(1);
        expect(foundTasks[0].term).toEqual(term);
    });

    test('should get highest priority tasks correctly', () => {
        const task1 = new Task({term, budget: {priority: 0.6}});
        const task2 = new Task({term: termFactory.create({name: 'B'}), budget: {priority: 0.8}});
        taskManager.addTask(task1);
        taskManager.addTask(task2);
        taskManager.processPendingTasks();

        const highestPriorityTasks = taskManager.getHighestPriorityTasks(2);
        expect(highestPriorityTasks).toHaveLength(2);
        expect(highestPriorityTasks[0].budget.priority).toBe(0.8);
        expect(highestPriorityTasks[1].budget.priority).toBe(0.6);
    });

    test('should update task priority correctly', () => {
        const task = new Task({term, budget: {priority: 0.5}});
        taskManager.addTask(task);
        taskManager.processPendingTasks();

        const updated = taskManager.updateTaskPriority(task, 0.9);
        expect(updated).toBe(true);
        const concept = memory.getConcept(term);
        expect(concept.getTask(task.stamp.id).budget.priority).toBe(0.9);
    });
});