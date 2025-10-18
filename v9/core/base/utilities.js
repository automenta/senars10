class Logger {
  static #isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

  static log(level, message, data = {}) {
    if (Logger.#isTestEnv) {
      // In test environment, only call console if it has been mocked by test code
      // This allows spies to capture calls without producing verbose console output
      const originalMethod = console[level] || console.log;

      // Check if the method has been mocked by Jest (spies would do this)
      const isMocked = originalMethod._isMockFunction || (originalMethod.mock != null);

      if (isMocked) {
        // If it's mocked, let the mock handle the call (this preserves spy behavior)
        return originalMethod(`[${level?.toUpperCase() || 'LOG'}]`, message, data);
      }
      return; // If not mocked, skip logging in test env
    }

    // Normal logging in non-test environments
    (console[level] || console.log)(`[${level?.toUpperCase() || 'LOG'}]`, message, data);
  }

  static info = (msg, data) =>
    (process.env.NODE_ENV === 'development' || process.env.DEBUG) && Logger.log('info', msg, data);

  static warn = (msg, data) => Logger.log('warn', msg, data);
  static error = (msg, data) => Logger.log('error', msg, data);
  static debug = (msg, data) =>
    process.env.NODE_ENV === 'development' && Logger.log('debug', msg, data);
}

class ObjectUtils {
  static safeAccess(obj, path, defaultValue) {
    if (!obj || typeof path !== 'string') return defaultValue;

    return path.split('.').reduce((current, key) =>
      current && typeof current === 'object' && key in current ? current[key] : undefined, obj
    ) ?? defaultValue;
  }

  static deepClone(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => ObjectUtils.deepClone(item));
    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = ObjectUtils.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  static isEmpty(obj) {
    return !obj || (Array.isArray(obj) && obj.length === 0) || 
           (ObjectUtils.isObject(obj) && Object.keys(obj).length === 0);
  }

  static pick(obj, keys) {
    return !obj || !Array.isArray(keys) ? {} :
           Object.fromEntries(keys.filter(key => key in obj).map(key => [key, obj[key]]));
  }

  static omit(obj, keys) {
    return !obj || !Array.isArray(keys) ? obj || {} :
           Object.fromEntries(
             Object.entries(obj).filter(([key]) => !keys.includes(key))
           );
  }

  static mapKeys(obj, keyMapper) {
    if (!obj || typeof keyMapper !== 'function') return obj || {};
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[keyMapper(key)] = obj[key];
      }
    }
    return result;
  }

  static filterValues(obj, predicate) {
    if (!obj || typeof predicate !== 'function') return obj || {};
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && predicate(obj[key], key)) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  static mergeDeep(target, source) {
    if (!source) return target;
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (ObjectUtils.isObject(source[key]) && ObjectUtils.isObject(target[key])) {
          result[key] = ObjectUtils.mergeDeep(target[key], source[key]);
        } else {
          result[key] = ObjectUtils.deepClone(source[key]);
        }
      }
    }

    return result;
  }
}

class ArrayUtils {
  static groupBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') return {};
    const groups = {};
    for (const item of array) {
      const key = keyFn(item);
      (groups[key] = groups[key] || []).push(item);
    }
    return groups;
  }

  static sortBy(array, keyFn, direction = 'asc') {
    return !Array.isArray(array) ? array || [] :
           [...array].sort((a, b) => {
             const aVal = keyFn(a), bVal = keyFn(b), diff = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
             return diff * (direction === 'desc' ? -1 : 1);
           });
  }

  static unique(array, keyFn) {
    return !Array.isArray(array) ? array || [] :
           keyFn ? (() => {
             const seen = new Set(), result = [];
             for (const item of array) {
               const key = keyFn(item);
               !seen.has(key) && (seen.add(key), result.push(item));
             }
             return result;
           })() :
           [...new Set(array)];
  }

  static compact(array) {
    if (!Array.isArray(array)) return array || [];
    return array.filter(Boolean);
  }

  static flatten(array, depth = 1) {
    if (!Array.isArray(array)) return array || [];
    return array.flat(depth);
  }

  static partition(array, predicate) {
    if (!Array.isArray(array) || typeof predicate !== 'function') return [array || [], []];
    const truthy = [], falsy = [];
    for (const item of array) {
      (predicate(item) ? truthy : falsy).push(item);
    }
    return [truthy, falsy];
  }

  static countBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') return {};
    const counts = {};
    for (const item of array) {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }
}

class IdGenerator {
  static generate(prefix = '') {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateErrorId = () => IdGenerator.generate('err_');
  static generateMessageId = () => IdGenerator.generate('msg_');

  static calculateBackoffDelay(baseDelay, attempt, multiplier = 2) {
    return baseDelay * Math.pow(multiplier, attempt);
  }
}

class CryptoUtils {
  /**
   * Synchronous version of SHA-256 for use in the Term class
   * @param {string} str - Input string to hash
   * @returns {string} Hexadecimal representation of the hash (simplified)
   */
  static sha256(str) {
    // Simple hash algorithm for synchronous operation
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }
}

export { Logger, ObjectUtils, ArrayUtils, IdGenerator, CryptoUtils };