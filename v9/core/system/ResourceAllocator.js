import Component from '../base/Component.js';
import { Storage } from '../base/collections.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * ResourceAllocator - Efficient resource management for actions
 *
 * Enables allocation and tracking of resources for action execution,
 * ensuring that actions have access to necessary resources while
 * preventing resource conflicts and managing lifecycle properly.
 */
class ResourceAllocator extends Component {
  constructor() {
    super();
    this.resources = new Storage();
    this.allocations = new Map();
    this.pools = new Map();
    this.lifecycleHooks = new Map();

    this.config = {
      enablePooling: DEFAULTS.RESOURCE_POOLING ?? true,
      maxResourceLifetime: DEFAULTS.RESOURCE_MAX_LIFETIME ?? 300000, // 5 minutes
      cleanupInterval: DEFAULTS.RESOURCE_CLEANUP_INTERVAL ?? 60000, // 1 minute
      maxAllocationsPerAction: DEFAULTS.RESOURCE_MAX_PER_ACTION ?? 10
    };

    this.stats = {
      resourcesRegistered: 0,
      resourcesAllocated: 0,
      resourcesFreed: 0,
      allocationFailures: 0,
      cleanupOperations: 0
    };

    this.cleanupTimer = null;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.config = { ...this.config, ...config };
    this.resources.clear();
    this.allocations.clear();
    this.pools.clear();
    this.lifecycleHooks.clear();
    this.stats = { resourcesRegistered: 0, resourcesAllocated: 0, resourcesFreed: 0, allocationFailures: 0, cleanupOperations: 0 };
    this._startCleanup();
  }

  _startCleanup() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => this._cleanup(), this.config.cleanupInterval);
  }

  _stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  registerResource(id, resource, metadata = {}) {
    if (!id || !resource) throw new Error('Resource ID and resource object are required');

    if (this.resources.has(id)) Logger.warn(`Resource with ID ${id} already exists, overwriting`);

    const wrapper = {
      id,
      resource,
      metadata: {
        ...metadata,
        registeredAt: Date.now(),
        status: 'available',
        lastAccessed: Date.now(),
        lifetime: metadata.lifetime ?? this.config.maxResourceLifetime
      },
      hooks: {
        validate: metadata.validate ?? (() => true),
        prepare: metadata.prepare ?? (() => Promise.resolve()),
        cleanup: metadata.cleanup ?? (() => Promise.resolve())
      }
    };

    this.resources.set(id, wrapper);
    this.stats.resourcesRegistered++;

    if (this.config.enablePooling && metadata.pool) this._addToPool(id, wrapper);
    return true;
  }

  unregisterResource(id) {
    const resource = this.resources.get(id);
    if (!resource) return false;

    if (this.allocations.has(id)) this._freeResource(id);
    this._removeFromPool(id, resource);
    this.resources.delete(id);
    return true;
  }

  _addToPool(id, resource) {
    const poolName = resource.metadata.pool;
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, { resources: [], available: [], allocated: new Set(), config: resource.metadata.poolConfig || {} });
    }
    const pool = this.pools.get(poolName);
    pool.resources.push(id);
    pool.available.push(id);
  }

  _removeFromPool(id, resource) {
    const poolName = resource.metadata.pool;
    if (this.pools.has(poolName)) {
      const pool = this.pools.get(poolName);
      pool.resources = pool.resources.filter(resId => resId !== id);
      pool.available = pool.available.filter(resId => resId !== id);
      pool.allocated.delete(id);
    }
  }

  async allocateResource(actionId, resourceId, context = {}) {
    if (!actionId || !resourceId) throw new Error('Action ID and Resource ID are required for allocation');

    const resource = this.resources.get(resourceId);
    if (!resource) {
      this.stats.allocationFailures++;
      throw new Error(`Resource ${resourceId} not found`);
    }

    if (this._isAllocatedToAction(resourceId, actionId)) return this._getForAction(resourceId, actionId);
    if (this._isAllocated(resourceId)) {
      this.stats.allocationFailures++;
      throw new Error(`Resource ${resourceId} is already allocated`);
    }

    if (!resource.hooks.validate()) {
      this.stats.allocationFailures++;
      throw new Error(`Resource ${resourceId} failed validation`);
    }

    try {
      await resource.hooks.prepare(context);
    } catch (error) {
      this.stats.allocationFailures++;
      throw new Error(`Resource ${resourceId} preparation failed: ${error.message}`);
    }

    const currentAllocations = this._getActionAllocs(actionId).length;
    if (currentAllocations >= this.config.maxAllocationsPerAction) {
      this.stats.allocationFailures++;
      throw new Error(`Action ${actionId} has reached maximum allocations: ${this.config.maxAllocationsPerAction}`);
    }

    const allocation = { actionId, resourceId, allocatedAt: Date.now(), context, status: 'active', expiry: Date.now() + (resource.metadata.lifetime ?? this.config.maxResourceLifetime) };

    if (!this.allocations.has(resourceId)) this.allocations.set(resourceId, []);
    this.allocations.get(resourceId).push(allocation);

    resource.metadata.status = 'allocated';
    resource.metadata.lastAccessed = Date.now();
    this._removeFromPoolAvail(resourceId, resource);

    this.stats.resourcesAllocated++;

    return {
      id: resourceId,
      resource: resource.resource,
      allocationId: allocation.resourceId + '_' + allocation.allocatedAt,
      allocatedAt: allocation.allocatedAt,
      expiry: allocation.expiry,
      context: allocation.context
    };
  }

  async allocateFromPool(actionId, poolName, count = 1, context = {}) {
    if (!this.pools.has(poolName)) throw new Error(`Pool ${poolName} does not exist`);

    const pool = this.pools.get(poolName);
    const availableCount = pool.available.length;

    if (availableCount < count) throw new Error(`Not enough resources available in pool ${poolName}. Requested: ${count}, Available: ${availableCount}`);

    const allocatedResources = [];
    for (let i = 0; i < count; i++) {
      const resourceId = pool.available.pop();
      if (resourceId) {
        const resource = await this.allocateResource(actionId, resourceId, context);
        allocatedResources.push(resource);
        pool.allocated.add(resourceId);
      }
    }

    return allocatedResources;
  }

  async releaseResource(actionId, resourceId) {
    const allocations = this.allocations.get(resourceId);
    if (!allocations) return false;

    const allocationIndex = allocations.findIndex(alloc => alloc.actionId === actionId);
    if (allocationIndex === -1) return false;

    const allocation = allocations[allocationIndex];

    const resource = this.resources.get(resourceId);
    if (resource) {
      try {
        await resource.hooks.cleanup(allocation.context);
      } catch (error) {
        Logger.error(`Resource ${resourceId} cleanup failed:`, error);
      }
      resource.metadata.status = 'available';
      resource.metadata.lastAccessed = Date.now();
    }

    allocations.splice(allocationIndex, 1);
    if (allocations.length === 0) this.allocations.delete(resourceId);

    if (resource && resource.metadata.pool) this._addToPoolAvail(resourceId, resource);

    this.stats.resourcesFreed++;
    return true;
  }

  async releaseAllResources(actionId) {
    const allocsToRelease = [];
    for (const [resourceId, allocations] of this.allocations) {
      const actionAllocs = allocations.filter(alloc => alloc.actionId === actionId);
      if (actionAllocs.length > 0) {
        allocsToRelease.push(...actionAllocs.map(alloc => alloc.resourceId));
      }
    }

    const results = await Promise.allSettled(allocsToRelease.map(id => this.releaseResource(actionId, id)));
    return results.filter(r => r.status === 'fulfilled' && r.value).length;
  }

  addLifecycleHooks(resourceId, hooks) {
    const resource = this.resources.get(resourceId);
    if (!resource) throw new Error(`Resource ${resourceId} not found`);
    resource.hooks = { ...resource.hooks, ...hooks };
  }

  getResourceStatus(resourceId) {
    const resource = this.resources.get(resourceId);
    if (!resource) return null;

    const isAllocated = this._isAllocated(resourceId);
    const allocations = this.allocations.get(resourceId) || [];

    return {
      id: resourceId,
      available: !isAllocated,
      allocatedTo: allocations.map(alloc => alloc.actionId),
      status: resource.metadata.status,
      registeredAt: resource.metadata.registeredAt,
      lastAccessed: resource.metadata.lastAccessed,
      lifetime: resource.metadata.lifetime
    };
  }

  getActionResources(actionId) {
    const resources = [];
    for (const [resourceId, allocations] of this.allocations) {
      const actionAllocations = allocations.filter(alloc => alloc.actionId === actionId);
      for (const allocation of actionAllocations) {
        const resource = this.resources.get(resourceId);
        if (resource) {
          resources.push({
            id: resourceId,
            resource: resource.resource,
            allocatedAt: allocation.allocatedAt,
            context: allocation.context,
            expiry: allocation.expiry
          });
        }
      }
    }
    return resources;
  }

  _isAllocated(resourceId) {
    const allocations = this.allocations.get(resourceId);
    return allocations && allocations.length > 0;
  }

  _isAllocatedToAction(resourceId, actionId) {
    const allocations = this.allocations.get(resourceId);
    return allocations && allocations.some(alloc => alloc.actionId === actionId);
  }

  _getForAction(resourceId, actionId) {
    const allocations = this.allocations.get(resourceId);
    const allocation = allocations?.find(alloc => alloc.actionId === actionId);
    if (!allocation) return null;

    const resource = this.resources.get(resourceId);
    if (!resource) return null;

    return {
      id: resourceId,
      resource: resource.resource,
      allocationId: allocation.resourceId + '_' + allocation.allocatedAt,
      allocatedAt: allocation.allocatedAt,
      expiry: allocation.expiry,
      context: allocation.context
    };
  }

  _getActionAllocs(actionId) {
    let allocations = [];
    for (const [, allocList] of this.allocations) {
      const actionAllocs = allocList.filter(alloc => alloc.actionId === actionId);
      allocations = allocations.concat(actionAllocs);
    }
    return allocations;
  }

  _removeFromPoolAvail(resourceId, resource) {
    const poolName = resource.metadata.pool;
    if (poolName && this.pools.has(poolName)) {
      const pool = this.pools.get(poolName);
      pool.available = pool.available.filter(id => id !== resourceId);
      pool.allocated.add(resourceId);
    }
  }

  _addToPoolAvail(resourceId, resource) {
    const poolName = resource.metadata.pool;
    if (poolName && this.pools.has(poolName)) {
      const pool = this.pools.get(poolName);
      if (!pool.allocated.has(resourceId)) pool.available.push(resourceId);
      pool.allocated.delete(resourceId);
    }
  }

  async _freeResource(resourceId) {
    const allocations = this.allocations.get(resourceId) || [];
    for (const allocation of allocations) {
      await this.releaseResource(allocation.actionId, resourceId);
    }
  }

  _cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [resourceId, allocations] of this.allocations) {
      const expiredIndexes = [];
      for (let i = 0; i < allocations.length; i++) {
        if (allocations[i].expiry < now) expiredIndexes.push(i);
      }

      for (let j = expiredIndexes.length - 1; j >= 0; j--) {
        const index = expiredIndexes[j];
        const allocation = allocations[index];

        const resource = this.resources.get(resourceId);
        if (resource) {
          resource.hooks.cleanup(allocation.context).catch(error => {
            Logger.error(`Expired resource ${resourceId} cleanup failed:`, error);
          });
          resource.metadata.status = 'available';
        }

        allocations.splice(index, 1);
        cleanedCount++;
      }

      if (allocations.length === 0) this.allocations.delete(resourceId);
    }

    this.stats.cleanupOperations++;
    Logger.debug(`ResourceAllocator cleanup: ${cleanedCount} expired resources cleaned up`);
  }

  getStats() {
    return {
      ...this.stats,
      totalResources: this.resources.size(),
      activeAllocations: Array.from(this.allocations.values()).flat().length,
      activePools: this.pools.size,
      pooledResources: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.resources.length, 0),
      poolUtilization: Array.from(this.pools.entries()).map(([name, pool]) => ({
        name,
        total: pool.resources.length,
        available: pool.available.length,
        allocated: pool.allocated.size,
        utilization: pool.resources.length > 0 ? (pool.allocated.size / pool.resources.length) : 0
      }))
    };
  }

  getPoolInfo(poolName) {
    if (!poolName) {
      return Array.from(this.pools.entries()).map(([name, pool]) => ({
        name,
        total: pool.resources.length,
        available: pool.available.length,
        allocated: pool.allocated.size
      }));
    }

    const pool = this.pools.get(poolName);
    if (!pool) return null;

    return {
      name: poolName,
      total: pool.resources.length,
      available: pool.available.length,
      allocated: pool.allocated.size,
      utilization: pool.resources.length > 0 ? (pool.allocated.size / pool.resources.length) : 0
    };
  }

  registerPool(name, config = {}) {
    if (this.pools.has(name)) throw new Error(`Pool ${name} already exists`);

    this.pools.set(name, {
      resources: [],
      available: [],
      allocated: new Set(),
      config: {
        maxSize: config.maxSize ?? DEFAULTS.POOL_MAX_SIZE ?? 10,
        minSize: config.minSize ?? DEFAULTS.POOL_MIN_SIZE ?? 0,
        ...config
      }
    });
  }

  async shutdown() {
    this._stopCleanup();
    for (const [resourceId] of this.allocations) await this._freeResource(resourceId);
    this.resources.clear();
    this.allocations.clear();
    this.pools.clear();
    this.lifecycleHooks.clear();
  }
}

export default ResourceAllocator;