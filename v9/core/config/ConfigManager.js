import { Storage } from './collections.js';
import { Logger, ObjectUtils } from './utilities.js';
import { Validation } from './validation.js';
import CommonMiddleware from './Middleware.js';

const CONFIG_STORAGE_SIZE = 1000;

class ConfigManager {
  constructor(messagesComponent = null) {
    this.storage = new Storage({
      enableEvents: true,
      eventTarget: messagesComponent,
      namespace: 'config',
      maxSize: CONFIG_STORAGE_SIZE
    });
    this.messages = messagesComponent;
    this.validators = new Map();
    this.watchers = new Map();
    this.defaults = new Map();
  }

  set(key, value, options = {}) {
    const { validate = true, silent = false, merge = false } = options;

    try {
      const currentValue = this.storage.get(key);

      let finalValue = value;
      if (merge && currentValue && typeof currentValue === 'object' && typeof value === 'object') {
        finalValue = { ...currentValue, ...value };
      }

      if (validate) {
        const validationError = this._validateValue(key, finalValue);
        if (validationError) {
          throw new Error(`Validation failed for ${key}: ${validationError}`);
        }
      }

      this.storage.set(key, finalValue);
      this._notifyWatchers(key, finalValue, currentValue);

      if (this.messages && !silent) {
        this.messages.emit('config:changed', {
          key,
          value: finalValue,
          previousValue: currentValue,
          timestamp: new Date(),
          merged: merge
        });
      }

      Logger.debug('Configuration updated', { key, hasValue: !!finalValue });
      return true;
    } catch (error) {
      Logger.error('Failed to set configuration', { key, error: error.message });
      if (this.messages) {
        this.messages.emit('config:error', {
          operation: 'set',
          key,
          error: error.message,
          timestamp: new Date()
        });
      }
      return false;
    }
  }

  get(key, defaultValue = null) {
    const value = this.storage.get(key);

    if (value === undefined || value === null) {
      if (this.defaults.has(key)) {
        return this.defaults.get(key);
      }
      return defaultValue;
    }

    return value;
  }

  getNested(path, defaultValue = null) {
    return ObjectUtils.safeAccess(this.getAll(), path, defaultValue);
  }

  getAll() {
    const all = {};
    for (const [key, value] of this.storage.entries()) {
      all[key] = value;
    }
    return all;
  }

  has(key) {
    return this.storage.has(key);
  }

  delete(key, options = {}) {
    const { silent = false } = options;
    const deletedValue = this.storage.get(key);

    const success = this.storage.delete(key);

    if (success) {
      this._notifyWatchers(key, null, deletedValue);

      if (this.messages && !silent) {
        this.messages.emit('config:deleted', {
          key,
          previousValue: deletedValue,
          timestamp: new Date()
        });
      }

      Logger.debug('Configuration deleted', { key });
    }

    return success;
  }

  registerValidator(key, validatorFn, options = {}) {
    const { required = false, description = '' } = options;

    this.validators.set(key, {
      validator: validatorFn,
      required,
      description
    });

    Logger.debug('Configuration validator registered', { key, required, description });
  }

  setDefault(key, defaultValue) {
    this.defaults.set(key, defaultValue);
    Logger.debug('Configuration default set', { key });
  }

  watch(key, callback, options = {}) {
    const { pattern = false } = options;

    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const watcher = { callback, pattern, timestamp: new Date() };
    this.watchers.get(key).add(watcher);

    Logger.debug('Configuration watcher added', { key, pattern });

    return () => {
      const watchers = this.watchers.get(key);
      if (watchers) {
        watchers.delete(watcher);
        if (watchers.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  setMultiple(configObject, options = {}) {
    const results = [];
    for (const [key, value] of Object.entries(configObject)) {
      results.push({ key, success: this.set(key, value, options) });
    }
    return results;
  }

  load(configObject, options = {}) {
    const { validate = true, merge = true } = options;
    return this.setMultiple(configObject, { validate, merge });
  }

  export() {
    return {
      config: this.getAll(),
      defaults: Object.fromEntries(this.defaults.entries()),
      validators: Object.fromEntries(
        Array.from(this.validators.entries()).map(([key, validator]) => [
          key,
          { required: validator.required, description: validator.description }
        ])
      ),
      timestamp: new Date().toISOString()
    };
  }

  import(configExport, options = {}) {
    const { validate = true, merge = true } = options;

    if (configExport.defaults) {
      for (const [key, value] of Object.entries(configExport.defaults)) {
        this.setDefault(key, value);
      }
    }

    if (configExport.validators) {
      for (const [key, validator] of Object.entries(configExport.validators)) {
        this.registerValidator(key, (value) => {
          // Basic validation - can be enhanced
          if (validator.required && (value === null || value === undefined)) {
            throw new Error('Value is required');
          }
          return true;
        }, validator);
      }
    }

    if (configExport.config) {
      return this.load(configExport.config, { validate, merge });
    }

    return [];
  }

  getStats() {
    return {
      ...this.storage.getStats(),
      validators: this.validators.size,
      watchers: this.watchers.size,
      defaults: this.defaults.size
    };
  }

  clear() {
    const keys = Array.from(this.storage.keys());
    this.storage.clear();

    if (this.messages) {
      this.messages.emit('config:cleared', {
        keys,
        timestamp: new Date()
      });
    }

    Logger.debug('Configuration cleared', { keyCount: keys.length });
  }

  _validateValue(key, value) {
    const validator = this.validators.get(key);
    if (!validator) return null;

    try {
      return validator.validator(value) ? null : `Validation failed for ${key}`;
      } catch (error) {
        return error.message;
      }
    }

    _notifyWatchers(key, newValue, oldValue) {
      const watchers = this.watchers.get(key);
      if (!watchers) return;

      for (const watcher of watchers) {
        try {
          watcher.callback(newValue, oldValue, key);
        } catch (error) {
          Logger.error('Configuration watcher error', {
            key,
            error: error.message
          });
        }
      }
    }

    createMiddleware() {
    return [
      CommonMiddleware.validationMiddleware(['key'], {
        key: { type: 'string', required: true },
        value: { type: 'any' }
      }),

      CommonMiddleware.loggingMiddleware({
        prefix: '[Config]',
        includeData: true
      }),

      async (context, next) => {
        if (context.name.startsWith('config:')) {
          await this._processConfigMessage(context);
        }
        return next();
      }
    ];
  }

  async _processConfigMessage(context) {
    const parts = context.name.split(':');
    const operation = parts[1];

    switch (operation) {
      case 'set':
        if (context.data.key && context.data.value !== undefined) {
          this.set(context.data.key, context.data.value, context.data.options);
        }
        break;
      case 'get':
        if (context.data.key) {
          context.results.push({
            type: 'config_value',
            data: this.get(context.data.key, context.data.defaultValue)
          });
        }
        break;
      case 'delete':
        if (context.data.key) {
          this.delete(context.data.key, context.data.options);
        }
        break;
    }
  }
}

export default ConfigManager;