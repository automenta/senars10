import { useCallback } from 'react';

class CommandService {
  constructor(sendRawMessage) {
    this.sendRawMessage = sendRawMessage;
  }

  execute(command, payload = {}) {
    const message = {
      type: 'control',
      command,
      payload,
      timestamp: new Date().toISOString()
    };

    return this.sendRawMessage
      ? this.sendRawMessage(message) ? Promise.resolve(true) : Promise.reject(new Error('Send failed'))
      : Promise.reject(new Error('sendRawMessage function not provided'));
  }

  // Convenience methods for common commands
  start() { return this.execute('start'); }
  stop() { return this.execute('stop'); }
  step() { return this.execute('step'); }
  reset() { return this.execute('reset'); }

  throttle(value) { return this.execute('throttle', { value }); }

  addTask(content, priority = 0.5, type = 'Input', status = 'Input') {
    return this.execute('add_task', { content, priority, type, status });
  }

  updateTask(taskId, updates) {
    return this.execute('update_task', { id: taskId, ...updates });
  }

  deleteTask(taskId) {
    return this.execute('delete_task', { id: taskId });
  }
}

export const useCommandService = (sendRawMessage) => {
  return useCallback(() => new CommandService(sendRawMessage), [sendRawMessage]);
};

export default CommandService;