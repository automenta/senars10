import { WebSocketUtils } from './WebSocketUtils.js';
import { randomUUID } from 'crypto';

/**
 * Unified data management for tasks, concepts, and memory synchronization.
 * Consolidates TaskDataManager and MemorySyncManager functionality for DRY compliance.
 */
class DataManager {
  constructor(memory = null, webSocketServer = null) {
    this.memory = memory;
    this.wss = webSocketServer;
    this.mockDataInterval = null;
  }

  // Task Management Methods
  loadInitialTasks() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        try {
          const task = this.createTask(taskData);
          this.memory?.addTask(task, Date.now());
          WebSocketUtils.debug(`Loaded task: ${taskData.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error creating task:', taskError, taskData);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error loading initial tasks:', error);
    }
  }

  createTask(taskData) {
    // If we have access to the core memory system, delegate task creation to it
    if (this.memory?.createTask) {
      return this.memory.createTask(taskData);
    }
    
    // Otherwise, use the fallback method
    const { term, truth } = this.parseTaskContent(taskData.content, taskData.truth);

    const punctuation = taskData.punctuation || this.inferPunctuation(taskData.content);

    // If we have access to core memory, we can try to import these from there
    if (this.memory?.createTaskFromData) {
      return this.memory.createTaskFromData({
        term,
        punctuation,
        truth,
        createdAt: taskData.createdAt,
        occurrenceTime: taskData.occurrenceTime,
        priority: taskData.priority,
        id: taskData.id
      });
    }
    
    // Fallback - return task data object instead of creating actual task
    return {
      id: taskData.id || randomUUID(),
      content: taskData.content,
      priority: taskData.priority || 0.5,
      status: taskData.status || 'Input',
      type: taskData.type || 'Input',
      createdAt: taskData.createdAt || Date.now(),
      lastModified: Date.now(),
      punctuation: punctuation,
      truth: truth
    };
  }

  parseTaskContent(content, truthValue = null) {
    const cleanContent = content.replace(/[.!?:]+$/, '').trim();

    const impMatch = cleanContent.match(/\(([^(]+)-->([^)]+)\)/);
    if (impMatch) {
      return this.createInheritanceTerm(impMatch[1].trim(), impMatch[2].trim(), truthValue);
    }

    return this.createAtomicTerm(cleanContent, truthValue);
  }

  createInheritanceTerm(subject, predicate, truthValue) {
    // If we have access to memory system, delegate to it
    if (this.memory?.createInheritanceTerm) {
      return this.memory.createInheritanceTerm(subject, predicate, truthValue);
    }
    
    // Fallback handling for undefined Term objects
    try {
      // Check if Term and TermType are defined before using them
      if (typeof Term !== 'undefined' && typeof TermType !== 'undefined') {
        const subjTerm = Term.newAtom(subject);
        const predTerm = Term.newAtom(predicate);
        const term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);

        const truth = this.normalizeTruthValue(truthValue, 0.8, 0.8);

        return { term, truth };
      } else {
        // Safe fallback if Term is not available
        return { 
          term: `(${subject}-->${predicate})`, 
          truth: truthValue 
        };
      }
    } catch (error) {
      // Safe fallback if Term is not available or error occurs
      return { 
        term: `(${subject}-->${predicate})`, 
        truth: truthValue 
      };
    }
  }

  createAtomicTerm(content, truthValue) {
    // If we have access to memory system, delegate to it
    if (this.memory?.createAtomicTerm) {
      return this.memory.createAtomicTerm(content, truthValue);
    }
    
    // Fallback handling for undefined Term objects
    try {
      if (typeof Term !== 'undefined') {
        const term = Term.newAtom(content);
        const truth = this.normalizeTruthValue(truthValue, 0.5, 0.5);

        return { term, truth };
      } else {
        // Safe fallback if Term is not available
        return { 
          term: content, 
          truth: truthValue 
        };
      }
    } catch (error) {
      // Safe fallback if Term is not available or error occurs
      return { 
        term: content, 
        truth: truthValue 
      };
    }
  }

  normalizeTruthValue(truthValue, defaultFreq, defaultConf) {
    // If we have access to memory system, delegate to it
    if (this.memory?.normalizeTruthValue) {
      return this.memory.normalizeTruthValue(truthValue, defaultFreq, defaultConf);
    }
    
    if (!truthValue) {
      // Check if TruthValue constructor is available
      if (typeof TruthValue !== 'undefined') {
        return new TruthValue(defaultFreq, defaultConf);
      } else {
        // Return a plain object as fallback
        return { frequency: defaultFreq, confidence: defaultConf };
      }
    }

    if (typeof truthValue === 'object' && !truthValue.hasOwnProperty('frequency')) {
      if (typeof TruthValue !== 'undefined') {
        return new TruthValue(truthValue.frequency || defaultFreq, truthValue.confidence || defaultConf);
      } else {
        // Return a plain object as fallback
        return { 
          frequency: truthValue.frequency || defaultFreq, 
          confidence: truthValue.confidence || defaultConf 
        };
      }
    }

    return truthValue;
  }

  inferPunctuation(content) {
    if (content.endsWith('!')) return '!';
    if (content.endsWith('?')) return '?';
    return '.';
  }

  addTask(taskData) {
    if (!taskData.content) {
      throw new Error('Task content is required');
    }

    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    const newTaskData = {
      id: randomUUID(),
      content: taskData.content,
      priority: typeof taskData.priority === 'number' ? Math.max(0, Math.min(1, taskData.priority)) : 0.5,
      status: taskData.status || 'Input',
      type: taskData.type || 'Input',
      createdAt: Date.now(),
      lastModified: Date.now(),
      dependencies: Array.isArray(taskData.dependencies) ? taskData.dependencies : [],
      metadata: typeof taskData.metadata === 'object' ? taskData.metadata : {}
    };

    const task = this.createTask(newTaskData);
    this.memory.addTask(task, Date.now());

    return newTaskData.id;
  }

  updateTask(taskId, updates) {
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    const task = this.memory.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const allowedFields = ['priority', 'status', 'type', 'content'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && key !== 'id') {
        if (key === 'priority') {
          task.priority = Math.max(0, Math.min(1, value));
        } else {
          task[key] = value;
        }
      }
    }

    if (task.setAccessedAt) {
      task.setAccessedAt(Date.now());
    }

    return true;
  }

  deleteTask(taskId) {
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    return this.memory.removeTask(taskId);
  }

  // Memory Synchronization Methods
  syncMemoryToClients() {
    if (!this.wss?.core?.memory) return;

    try {
      const allMemoryTasks = this.wss.core.memory.getAllTasks?.() || [];
      if (!Array.isArray(allMemoryTasks) || allMemoryTasks.length === 0) return;

      const tasksData = allMemoryTasks.map((task, index) => {
        if (!task) return null;

        const taskId = task.id || `task_${task.createdAt || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          return {
            id: taskId,
            content: task.toString ? task.toString() : (task.content || 'Unknown Task'),
            priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
            status: task.status || 'Derived',
            type: task.isBelief ? (task.isBelief() ? 'Belief' : task.isGoal() ? 'Goal' : 'Question') : (task.type || 'Derived'),
            createdAt: task.createdAt || Date.now(),
            lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
            punctuation: task.punctuation || (task.content?.endsWith('!') ? '!' : task.content?.endsWith('?') ? '?' : '.'),
            truth: task.truth || null,
            occurrenceTime: task.occurrenceTime || Date.now(),
            derivationPath: task.derivationPath || []
          };
        } catch (taskError) {
          WebSocketUtils.error('Error converting task:', taskError, task);
          return null;
        }
      }).filter(task => task !== null);

      this.wss.broadcastState();
      WebSocketUtils.debug(`Synced ${tasksData.length} tasks to clients`);
    } catch (error) {
      WebSocketUtils.error('Error syncing memory to clients:', error);
    }
  }

  startMockData(interval = 5000) {
    this.stopMockData();
    this.mockDataInterval = setInterval(() => {
      this.wss?.broadcastState();
    }, interval);
  }

  stopMockData() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  // State Management Methods
  getCurrentState() {
    return {
      tasks: this.getInitialTasks(),
      concepts: this.getInitialConcepts(),
      logs: this.getInitialLogs()
    };
  }

  getInitialTasks() {
    if (this.memory?.getInitialTasks) {
      return this.memory.getInitialTasks();
    } else if (this.memory?.getTopTasks) {
      const topTasks = this.memory.getTopTasks(20);
      return topTasks.map(task => ({
        id: task.id || `task-${Date.now()}`,
        content: task.toString ? task.toString() : (task.content || 'Unknown Task'),
        priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
        status: task.status || 'Derived',
        type: task.isBelief ? (task.isBelief() ? 'Belief' : task.isGoal() ? 'Goal' : 'Question') : (task.type || 'Derived'),
        createdAt: task.createdAt || Date.now(),
        lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
        punctuation: task.punctuation || '.',
        truth: task.truth || null,
        occurrenceTime: task.occurrenceTime || Date.now(),
        derivationPath: task.derivationPath || []
      }));
    }
    return [];
  }

  getInitialConcepts() {
    if (this.memory?.getInitialConcepts) {
      return this.memory.getInitialConcepts();
    } else if (this.memory?.getTopConcepts) {
      const topConcepts = this.memory.getTopConcepts(20);
      return topConcepts.map(concept => ({
        id: concept.id || `concept-${Date.now()}`,
        content: concept.term?.toString() || concept.concept?.term?.toString() || concept.term || 'Unknown Concept',
        priority: concept.priority || 0,
        name: concept.term?.toString() || concept.concept?.term?.toString() || concept.term || 'Unknown Concept',
        type: concept.term?.termType || 'concept',
        taskCount: concept.taskCount || 0,
        createdAt: concept.createdAt || Date.now()
      }));
    }
    return [];
  }

  getInitialLogs() {
    if (this.memory?.logs) {
      return this.memory.logs.getRecentLogs ? this.memory.logs.getRecentLogs(20) : [];
    }
    return [];
  }

  // Cleanup
  cleanup() {
    this.stopMockData();
  }
}

export default DataManager;