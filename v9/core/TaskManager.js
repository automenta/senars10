import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';

export class TaskManager {
  constructor(memory, focus, clock) {
    this.memory = memory;
    this.focus = focus;
    this.clock = clock;
  }

  input(taskData) {
    const task = this._createTask(taskData);
    this.memory.addTask(task, this.clock.getTime());
    this.focus.addTaskToFocus(task, task.getPriority());
    return task;
  }

  believe(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.input({
      term: typeof content === 'string' ? content : content.term,
      punctuation: Punctuation.BELIEF,
      truth: truth instanceof TruthValue ? truth : new TruthValue(truth.frequency, truth.confidence)
    });
  }

  want(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.input({
      term: typeof content === 'string' ? content : content.term,
      punctuation: Punctuation.GOAL,
      truth: truth instanceof TruthValue ? truth : new TruthValue(truth.frequency, truth.confidence)
    });
  }

  ask(questionData) {
    return this.input(typeof questionData === 'string'
      ? { term: questionData, punctuation: Punctuation.QUESTION }
      : { ...questionData, punctuation: Punctuation.QUESTION });
  }

  think(taskContent) {
    const task = this.input(taskContent);
    return task;
  }

  getTasks() { return this.memory.getAllTasks(); }
  getTasksByPriority() { return this.getTasks().sort((a, b) => b.getPriority() - a.getPriority()); }
  getTasksByTime() { return this.getTasks().sort((a, b) => b.createdAt - a.createdAt); }
  getBeliefs() { return this._filterTasksByPunctuation(Punctuation.BELIEF); }
  getGoals() { return this._filterTasksByPunctuation(Punctuation.GOAL); }
  getQuestions() { return this._filterTasksByPunctuation(Punctuation.QUESTION); }

  findTasksByTerm(termPattern) {
    return this.memory.getAllTasks().filter(task =>
      task.term?.name?.includes(termPattern)
    );
  }

  getTaskByHash(taskHash) { return this.memory.getTask(taskHash); }
  removeTask(taskHash) { return this.memory.removeTask(taskHash); }
  getHighestPriorityTask() { return this.getTasksByPriority()[0] || null; }
  getConcepts() { return Array.from(this.memory.conceptStorage.values()); }

  getConceptByTerm(termName) {
    for (const [hash, concept] of this.memory.conceptStorage) {
      if (concept.term?.name === termName) return concept;
    }
    return null;
  }

  _createTask(taskData) {
    const currentTime = this.clock.getTime();
    return typeof taskData === 'string'
      ? this._createTaskFromString(taskData, currentTime)
      : this._createTaskFromObject(taskData, currentTime);
  }

  _createTaskFromObject(taskData, currentTime) {
    return Task.createInput(
      typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
      taskData.punctuation || Punctuation.BELIEF,
      taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9),
      currentTime,
      currentTime,
      taskData.priority || 0.5
    );
  }

  _createTaskFromString(taskStr, currentTime) {
    const { termStr, punctuation } = this._parseTaskString(taskStr);
    return Task.createInput(
      Term.newAtom(termStr.trim()),
      punctuation,
      new TruthValue(0.9, 0.9),
      currentTime,
      currentTime
    );
  }

  _parseTaskString(taskStr) {
    const isGoal = taskStr.endsWith('!');
    const isQuestion = taskStr.endsWith('?');
    let termStr = taskStr;
    let punctuation = Punctuation.BELIEF;

    if (isGoal) {
      termStr = taskStr.slice(0, -1);
      punctuation = Punctuation.GOAL;
    } else if (isQuestion) {
      termStr = taskStr.slice(0, -1);
      punctuation = Punctuation.QUESTION;
    } else if (taskStr.endsWith('.')) {
      termStr = taskStr.slice(0, -1);
    }

    return { termStr, punctuation };
  }

  _filterTasks(filterFn) { return this.getTasks().filter(filterFn); }
  _filterTasksByPunctuation(punctuation) {
    return this._filterTasks(task => task.punctuation === punctuation);
  }
}