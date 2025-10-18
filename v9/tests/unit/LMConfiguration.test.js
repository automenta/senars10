import LMConfiguration from '../../core/lm/LMConfiguration.js';

describe('LMConfiguration', () => {
  let config;

  beforeEach(() => {
    config = new LMConfiguration();
  });

  describe('Initialization', () => {
    test('should initialize with empty configuration', () => {
      expect(config.providers).toEqual([]);
      expect(config.models).toEqual([]);
      expect(config.defaults).toEqual({});
      expect(config.preferences).toEqual({});
    });

    test('should initialize with provided configuration', () => {
      const initialConfig = {
        providers: [{ name: 'test-provider', url: 'http://example.com' }],
        models: [{ name: 'test-model', provider: 'test-provider' }],
        defaults: { embedding: 'test-model' },
        preferences: { theme: 'dark' }
      };

      const newConfig = new LMConfiguration(initialConfig);
      expect(newConfig.providers).toEqual(initialConfig.providers);
      expect(newConfig.models).toEqual(initialConfig.models);
      expect(newConfig.defaults).toEqual(initialConfig.defaults);
      expect(newConfig.preferences).toEqual(initialConfig.preferences);
    });
  });

  describe('Provider Management', () => {
    test('should add providers', () => {
      const provider = { name: 'openai', url: 'https://api.openai.com' };
      config.addProvider(provider);

      expect(config.providers).toHaveLength(1);
      expect(config.providers[0]).toEqual(provider);
    });

    test('should throw error for provider without name', () => {
      expect(() => {
        config.addProvider({ url: 'https://api.openai.com' });
      }).toThrow('Provider must have a name');
    });

    test('should throw error for provider without URL', () => {
      expect(() => {
        config.addProvider({ name: 'openai' });
      }).toThrow('Provider must have a URL');
    });

    test('should throw error for duplicate provider names', () => {
      const provider1 = { name: 'openai', url: 'https://api.openai.com' };
      const provider2 = { name: 'openai', url: 'https://api.openai2.com' };

      config.addProvider(provider1);
      expect(() => {
        config.addProvider(provider2);
      }).toThrow('Provider with name "openai" already exists');
    });

    test('should get provider by name', () => {
      const provider = { name: 'openai', url: 'https://api.openai.com' };
      config.addProvider(provider);

      expect(config.getProvider('openai')).toEqual(provider);
      expect(config.getProvider('nonexistent')).toBeUndefined();
    });

    test('should remove provider by name', () => {
      const provider1 = { name: 'openai', url: 'https://api.openai.com' };
      const provider2 = { name: 'anthropic', url: 'https://api.anthropic.com' };

      config.addProvider(provider1);
      config.addProvider(provider2);

      config.removeProvider('openai');
      expect(config.providers).toHaveLength(1);
      expect(config.providers[0].name).toBe('anthropic');
    });
  });

  describe('Model Management', () => {
    test('should add models', () => {
      const model = { name: 'gpt-4', provider: 'openai', temperature: 0.7 };
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel(model);

      expect(config.models).toHaveLength(1);
      expect(config.models[0]).toEqual(model);
    });

    test('should throw error for model without name', () => {
      expect(() => {
        config.addModel({ provider: 'openai' });
      }).toThrow('Model must have a name');
    });

    test('should throw error for model without provider', () => {
      expect(() => {
        config.addModel({ name: 'gpt-4' });
      }).toThrow('Model must have a provider');
    });

    test('should throw error for duplicate model names', () => {
      const model1 = { name: 'gpt-4', provider: 'openai' };
      const model2 = { name: 'gpt-4', provider: 'anthropic' };

      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addProvider({ name: 'anthropic', url: 'https://api.anthropic.com' });

      config.addModel(model1);
      expect(() => {
        config.addModel(model2);
      }).toThrow('Model with name "gpt-4" already exists');
    });

    test('should get model by name', () => {
      const model = { name: 'gpt-4', provider: 'openai' };
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel(model);

      expect(config.getModel('gpt-4')).toEqual(model);
      expect(config.getModel('nonexistent')).toBeUndefined();
    });

    test('should remove model by name', () => {
      const model1 = { name: 'gpt-4', provider: 'openai' };
      const model2 = { name: 'claude', provider: 'anthropic' };

      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addProvider({ name: 'anthropic', url: 'https://api.anthropic.com' });
      config.addModel(model1);
      config.addModel(model2);

      config.removeModel('gpt-4');
      expect(config.models).toHaveLength(1);
      expect(config.models[0].name).toBe('claude');
    });
  });

  describe('Default Assignments', () => {
    test('should set and get default assignments', () => {
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel({ name: 'gpt-4', provider: 'openai' });

      config.setDefault('embedding', 'gpt-4');
      config.setDefault('reasoning', 'openai');

      expect(config.getDefault('embedding')).toBe('gpt-4');
      expect(config.getDefault('reasoning')).toBe('openai');
    });

    test('should throw error for invalid default type', () => {
      expect(() => {
        config.setDefault('invalid-type', 'model-name');
      }).toThrow('Invalid default type: invalid-type');
    });

    test('should throw error for non-existent default model/provider', () => {
      expect(() => {
        config.setDefault('embedding', 'nonexistent-model');
      }).toThrow('Model or Provider with name "nonexistent-model" does not exist');
    });
  });

  describe('Preferences', () => {
    test('should set and get preferences', () => {
      config.setPreference('theme', 'dark');
      config.setPreference('language', 'en');

      expect(config.getPreference('theme')).toBe('dark');
      expect(config.getPreference('language')).toBe('en');
      expect(config.getPreference('nonexistent', 'default')).toBe('default');
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel({ name: 'gpt-4', provider: 'openai' });
      config.setDefault('embedding', 'gpt-4');
      config.setPreference('theme', 'dark');

      const json = config.toJSON();
      expect(json.providers).toEqual([{ name: 'openai', url: 'https://api.openai.com' }]);
      expect(json.models).toEqual([{ name: 'gpt-4', provider: 'openai' }]);
      expect(json.defaults).toEqual({ embedding: 'gpt-4' });
      expect(json.preferences).toEqual({ theme: 'dark' });
    });

    test('should create from JSON', () => {
      const initialData = {
        providers: [{ name: 'openai', url: 'https://api.openai.com' }],
        models: [{ name: 'gpt-4', provider: 'openai' }],
        defaults: { embedding: 'gpt-4' },
        preferences: { theme: 'dark' }
      };

      const newConfig = LMConfiguration.fromJSON(initialData);
      expect(newConfig.providers).toEqual(initialData.providers);
      expect(newConfig.models).toEqual(initialData.models);
      expect(newConfig.defaults).toEqual(initialData.defaults);
      expect(newConfig.preferences).toEqual(initialData.preferences);
    });

    test('should clone configuration', () => {
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel({ name: 'gpt-4', provider: 'openai' });
      config.setDefault('embedding', 'gpt-4');
      config.setPreference('theme', 'dark');

      const cloned = config.clone();
      expect(cloned).not.toBe(config); // Different instance
      expect(cloned.toJSON()).toEqual(config.toJSON()); // Same data
    });
  });

  describe('Validation', () => {
    test('should validate correct configuration', () => {
      config.addProvider({ name: 'openai', url: 'https://api.openai.com' });
      config.addModel({ name: 'gpt-4', provider: 'openai' });
      config.setDefault('embedding', 'gpt-4');

      expect(() => config.validate()).not.toThrow();
      expect(config.validate()).toBe(true);
    });

    test('should validate complex configuration', () => {
      config
        .addProvider({ name: 'openai', url: 'https://api.openai.com' })
        .addProvider({ name: 'anthropic', url: 'https://api.anthropic.com' })
        .addModel({ name: 'gpt-4', provider: 'openai' })
        .addModel({ name: 'claude-3', provider: 'anthropic' })
        .setDefault('embedding', 'gpt-4')
        .setDefault('reasoning', 'claude-3')
        .setPreference('temperature', 0.7);

      expect(() => config.validate()).not.toThrow();
      expect(config.validate()).toBe(true);
    });
  });
});