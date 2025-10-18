// Simple resource manager
class ResourceManager {
  constructor() {
    this.resources = new Map();
  }

  registerProvider(id, provider) {
    this.resources.set(id, {
      provider,
      usage: 0,
      tokensUsed: 0,
      lastAccess: Date.now()
    });
  }

  getUsage() {
    const usage = {};
    for (const [id, resource] of this.resources) {
      usage[id] = {
        usage: resource.usage,
        tokensUsed: resource.tokensUsed
      };
    }
    return usage;
  }
}

export default ResourceManager;