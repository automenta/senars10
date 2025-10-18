import { WebSocketUtils } from './WebSocketUtils.js';

class YjsManager {
  constructor() {
    this.useYjs = false;
    this.Y = null;
    this.Awareness = null;
    this.setupWSConnection = null;
    this.doc = null;
    this.yTasks = null;
    this.yConcepts = null;
    this.yLogs = null;
    this.awareness = null;
    this.yClients = new Set();
  }

  async initialize() {
    this.useYjs = process.env.ENABLE_YJS === 'true' || process.env.YJS_CRDT === 'true';

    if (!this.useYjs) {
      WebSocketUtils.debug('Running with simple WebSocket protocol only');
      return false;
    }

    try {
      const yjs = await import('yjs');
      const awarenessModule = await import('y-protocols/awareness');
      const wsModule = await import('y/websocket-server/utils');

      this.Y = yjs.default;
      this.Awareness = awarenessModule.Awareness;
      this.setupWSConnection = wsModule.setupWSConnection;

      this._initializeYjsDocument();
      WebSocketUtils.debug('Yjs CRDT support enabled');
      return true;
    } catch (error) {
      WebSocketUtils.error('Failed to load Yjs modules:', error.message);
      WebSocketUtils.debug('Falling back to simple protocol only');
      return false;
    }
  }

  _initializeYjsDocument() {
    this.doc = new this.Y.Doc();
    this.yTasks = this.doc.getArray('tasks');
    this.yConcepts = this.doc.getArray('concepts');
    this.yLogs = this.doc.getArray('logs');
    this.awareness = new this.Awareness(this.doc);
  }

  isEnabled() {
    return this.useYjs;
  }

  syncMemoryToYjs(tasksData) {
    if (!this.isEnabled() || !this.yTasks) return;

    try {
      const yTaskIds = new Set();
      this.yTasks.forEach(yTask => {
        if (yTask instanceof this.Y.Map) {
          const id = yTask.get('id');
          if (id) yTaskIds.add(id);
        }
      });

      for (const taskObj of tasksData) {
        if (!taskObj || yTaskIds.has(taskObj.id)) continue;

        try {
          const taskMap = new this.Y.Map();
          Object.entries(taskObj).forEach(([key, value]) => {
            taskMap.set(key, value);
          });
          this.yTasks.push([taskMap]);
          WebSocketUtils.debug(`Added derived task to Yjs: ${taskObj.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error converting task for Yjs sync:', taskError, taskObj);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error in syncMemoryToYjs:', error);
    }
  }

  convertYjsToPlain() {
    if (!this.isEnabled()) {
      return { tasks: [], concepts: [], logs: [] };
    }

    const convertYjsMap = (yItem) => {
      if (yItem instanceof this.Y.Map) {
        const obj = {};
        yItem.forEach((value, key) => obj[key] = value);
        return obj;
      }
      return yItem;
    };

    return {
      tasks: this.yTasks.toArray().map(convertYjsMap),
      concepts: this.yConcepts.toArray().map(convertYjsMap),
      logs: this.yLogs.toArray().map(convertYjsMap)
    };
  }

  getAwarenessState() {
    if (!this.isEnabled() || !this.awareness) {
      return {
        isRunning: false,
        isPaused: true,
        cycles: 0,
        tasks: 0,
        concepts: 0,
        timestamp: Date.now()
      };
    }

    const state = this.awareness.getLocalState()?.reasonerStats || {};
    return {
      ...state,
      tasks: this.yTasks.length,
      concepts: this.yConcepts.length,
      timestamp: Date.now()
    };
  }

  setAwarenessState(stats) {
    if (!this.isEnabled() || !this.awareness) return;

    this.awareness.setLocalStateField('reasonerStats', {
      ...stats,
      timestamp: Date.now()
    });
  }

  observeChanges(callback) {
    if (!this.isEnabled()) return;

    this.yTasks.observe(callback);
    this.yConcepts.observe(callback);
    this.yLogs.observe(callback);
    this.awareness.on('change', callback);
  }

  resetYjsData() {
    if (!this.isEnabled()) return;

    this.yTasks.delete(0, this.yTasks.length);
    this.yConcepts.delete(0, this.yConcepts.length);
  }

  cleanup() {
    this.yClients.clear();
  }
}

export default YjsManager;