import Component from '../base/Component.js';
import { Cache } from '../base/collections.js';
import { ObjectUtils } from '../base/utilities.js';
import { STATES, DEFAULTS } from '../base/constants.js';

class Config extends Component {
  constructor() {
    super();
    this.cache = new Cache();
    this.config = {};
  }

  async initialize(config = {}) {
    this.config = config;
    this.cache.clear();
    await super.initialize(config);
  }

  get(key, defaultValue) {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const value = ObjectUtils.safeAccess(this.config, key, undefined);

    if (value !== undefined) {
      this.cache.set(key, value);
      return value;
    }

    return defaultValue;
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();

    const target = keys.reduce((obj, k) =>
      ObjectUtils.isObject(obj[k]) ? obj[k] : (obj[k] = {}), this.config);

    target[lastKey] = value;

    this.cache.clear();
  }

  merge(newConfig) {
    this.config = this._deepMerge(this.config, newConfig);
    this.cache.clear();
  }

  _deepMerge(target, source) {
    if (!ObjectUtils.isObject(target) || !ObjectUtils.isObject(source)) {
      return source ?? target;
    }

    const result = { ...target };

    for (const key of Object.keys(source)) {
      result[key] = ObjectUtils.isObject(source[key])
        ? this._deepMerge(result[key] || {}, source[key])
        : source[key];
    }

    return result;
  }
}

export default Config;