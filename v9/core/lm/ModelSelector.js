class ModelSelector {
  constructor(providerRegistry) {
    this.providerRegistry = providerRegistry;
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
    this.modelTypes = {
      'reasoning': 'reasoningModel',
      'embedding': 'embeddingModel',
      'fast_response': 'fastModel',
      'temporal': 'temporalModel',
      'counterfactual': 'counterfactualModel'
    };
    this.typePatterns = [
      { type: 'reasoningModel', pattern: /reasoning|reasoner/ },
      { type: 'fastModel', pattern: /fast|quick/ },
      { type: 'temporalModel', pattern: /temporal/ },
      { type: 'counterfactualModel', pattern: /counterfactual|hypothetical/ }
    ];
  }

  async select(task, constraints = {}) {
    const cacheKey = `${task.type}-${JSON.stringify(constraints)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) return cached.model;
    this.cache.delete(cacheKey);

    const availableModels = this.getAvailableModels();
    const modelType = this.modelTypes[task.type];
    const result = modelType && availableModels.has(modelType)
      ? availableModels.get(modelType)
      : this.providerRegistry.get();

    this.cache.set(cacheKey, { model: result, timestamp: Date.now() });
    return result;
  }

  getAvailableModels() {
    const availableModels = new Map();

    for (const [id, provider] of this.providerRegistry.providers) {
      if (provider.generateEmbedding) availableModels.set('embeddingModel', provider);

      for (const { type, pattern } of this.typePatterns) {
        if (pattern.test(id)) availableModels.set(type, provider);
      }

      availableModels.set('generalModel', provider);
    }

    return availableModels;
  }

  clearCache() {
    this.cache.clear();
  }
}

export default ModelSelector;