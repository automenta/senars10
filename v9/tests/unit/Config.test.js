import Config from '../../core/config/Config.js';

describe('Config', () => {
  let config;

  beforeEach(async () => {
    config = new Config();
    await config.initialize({
      core: {
        cycleIntervalMs: 50,
        focusSetSize: 10,
      },
      nested: {
        a: {
          b: {
            c: 123,
          },
        },
      },
    });
  });

  test('should initialize with a default configuration', () => {
    expect(config.get('core.cycleIntervalMs')).toBe(50);
  });

  test('get should retrieve a value using dot notation', () => {
    expect(config.get('core.cycleIntervalMs')).toBe(50);
    expect(config.get('nested.a.b.c')).toBe(123);
  });

  test('get should return a default value if key is not found', () => {
    expect(config.get('nonexistent.key', 'default')).toBe('default');
    expect(config.get('core.nonexistent', null)).toBeNull();
  });

  test('get should return undefined if key is not found and no default is provided', () => {
    expect(config.get('nonexistent.key')).toBeUndefined();
  });

  test('set should add a new value using dot notation', () => {
    config.set('new.key.value', 'hello');
    expect(config.get('new.key.value')).toBe('hello');
  });

  test('set should update an existing value', () => {
    config.set('core.cycleIntervalMs', 100);
    expect(config.get('core.cycleIntervalMs')).toBe(100);
  });

  test('set should create nested objects if they do not exist', () => {
    config.set('a.b.c.d', 999);
    expect(config.get('a.b.c.d')).toBe(999);
  });

  test('merge should deeply merge a new configuration object', () => {
    const newConfig = {
      core: {
        focusSetSize: 20,
        newParam: true,
      },
      other: {
        setting: 'enabled',
      },
    };
    config.merge(newConfig);
    expect(config.get('core.cycleIntervalMs')).toBe(50); // Unchanged
    expect(config.get('core.focusSetSize')).toBe(20); // Updated
    expect(config.get('core.newParam')).toBe(true); // Added
    expect(config.get('other.setting')).toBe('enabled'); // Added
  });

  test('cache should be invalidated after set', () => {
    config.get('core.cycleIntervalMs'); // Cache the value
    expect(config.cache.has('core.cycleIntervalMs')).toBe(true);
    config.set('core.cycleIntervalMs', 200);
    expect(config.cache.size).toBe(0);
  });

  test('cache should be invalidated after merge', () => {
    config.get('core.cycleIntervalMs'); // Cache the value
    expect(config.cache.has('core.cycleIntervalMs')).toBe(true);
    config.merge({ core: { anotherParam: 1 } });
    expect(config.cache.size).toBe(0);
  });

  test('get should use cache for subsequent reads', () => {
    const key = 'nested.a.b.c';
    const value = config.get(key);
    expect(config.cache.get(key)).toBe(value);

    // To be sure it's from the cache, we can tamper with the underlying config
    config.config.nested.a.b.c = 999;
    expect(config.get(key)).toBe(value); // Should still be the cached value
  });
});