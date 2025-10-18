import Component from '../base/Component.js';
import { Storage } from '../base/collections.js';
import Bag from './Bag.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * AdjacencyBag - Priority-based graph structure implementation
 *
 * This class implements a priority-based adjacency collection for knowledge graph representation
 * where relationships between nodes are stored with priorities and can be sampled statistically.
 * Uses the Bag class for priority-based storage and retrieval.
 */
class AdjacencyBag extends Component {
  constructor() {
    super();

    // Adjacency bags: maps nodes to their neighbors using Bag structures for priority-based sampling
    this.adjacencyBags = new Storage();

    // Reverse adjacency bags for efficient backward traversal
    this.reverseAdjacencyBags = new Storage();

    // Node metadata storage
    this.nodeMetadata = new Storage();

    // Global configuration
    this.capacity = DEFAULTS.GRAPH_CAPACITY || 10000;
    this.nodeBagCapacity = DEFAULTS.NODE_BAG_CAPACITY || 100; // Capacity per node's adjacency bag
    this.priorityThreshold = DEFAULTS.PRIORITY_THRESHOLD || 0.1;
    this.decayRate = DEFAULTS.DECAY_RATE || 0.001;

    // Statistics
    this.stats = {
      nodeCount: 0,
      edgeCount: 0,
      totalAccesses: 0,
      samplingEfficiency: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    // Apply configuration
    this.capacity = config.capacity ?? this.capacity;
    this.nodeBagCapacity = config.nodeBagCapacity ?? this.nodeBagCapacity;
    this.priorityThreshold = config.priorityThreshold ?? this.priorityThreshold;
    this.decayRate = config.decayRate ?? this.decayRate;

    // Clear existing data
    this.adjacencyBags.clear();
    this.reverseAdjacencyBags.clear();
    this.nodeMetadata.clear();

    // Reinitialize statistics
    this.stats = {
      nodeCount: 0,
      edgeCount: 0,
      totalAccesses: 0,
      samplingEfficiency: 0
    };
  }

  /**
   * Add a relationship between two nodes with a priority value
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   * @param {number} priority - Priority value (0-1)
   * @param {Object} metadata - Additional relationship metadata
   */
  addRelationship(source, target, priority = 0.5, metadata = {}) {
    // Ensure source and target are valid strings
    if (!source || !target) {
      throw new Error('Source and target nodes must be valid strings');
    }

    // Normalize priority to 0-1 range
    priority = Math.max(0, Math.min(1, priority));

    // Initialize adjacency bag for source if not exists
    if (!this.adjacencyBags.has(source)) {
      this.adjacencyBags.set(source, new Bag(this.nodeBagCapacity));
      this.stats.nodeCount++;
    }

    // Initialize reverse adjacency bag for target if not exists
    if (!this.reverseAdjacencyBags.has(target)) {
      this.reverseAdjacencyBags.set(target, new Bag(this.nodeBagCapacity));
      if (!this.adjacencyBags.has(target)) {
        this.stats.nodeCount++;
      }
    }

    const sourceBag = this.adjacencyBags.get(source);
    const reverseBag = this.reverseAdjacencyBags.get(target);

    // Update priority in both directions
    const updatedPriority = priority; // Simplified priority handling
    sourceBag.put(target, target, updatedPriority, metadata);
    reverseBag.put(source, source, updatedPriority, metadata);

    // Store metadata
    if (Object.keys(metadata).length > 0) {
      const key = this._createEdgeKey(source, target);
      this.nodeMetadata.set(key, { ...metadata, priority: updatedPriority });
    }

    // Update statistics
    this.stats.edgeCount++;
    this._decayOldRelationships();

    // Check capacity and evict if necessary
    this._checkCapacity();
  }

  /**
   * Get neighbors of a node based on priority
   * @param {string} node - Node ID
   * @param {number} limit - Maximum number of neighbors to return
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array} Array of neighbor objects {node, priority, metadata}
   */
  getNeighbors(node, limit = 10, minPriority = this.priorityThreshold) {
    if (!this.adjacencyBags.has(node)) {
      return [];
    }

    const bag = this.adjacencyBags.get(node);
    const allItems = bag.getAll();
    const result = [];

    for (const item of allItems) {
      if (item.priority >= minPriority) {
        const key = this._createEdgeKey(node, item.key);
        const metadata = this.nodeMetadata.get(key) || {};

        result.push({
          node: item.key, // The neighbor node
          priority: item.priority,
          metadata,
          relationshipKey: key
        });
      }
    }

    // Sort by priority in descending order and limit results
    result.sort((a, b) => b.priority - a.priority);
    return result.slice(0, limit);
  }

  /**
   * Get reverse neighbors (nodes that have this node as a neighbor)
   * @param {string} node - Node ID
   * @param {number} limit - Maximum number of reverse neighbors to return
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array} Array of reverse neighbor objects {node, priority, metadata}
   */
  getReverseNeighbors(node, limit = 10, minPriority = this.priorityThreshold) {
    if (!this.reverseAdjacencyBags.has(node)) {
      return [];
    }

    const bag = this.reverseAdjacencyBags.get(node);
    const allItems = bag.getAll();
    const result = [];

    for (const item of allItems) {
      if (item.priority >= minPriority) {
        const key = this._createEdgeKey(item.key, node); // neighbor -> target
        const metadata = this.nodeMetadata.get(key) || {};

        result.push({
          node: item.key, // The neighbor node
          priority: item.priority,
          metadata,
          relationshipKey: key
        });
      }
    }

    // Sort by priority in descending order and limit results
    result.sort((a, b) => b.priority - a.priority);
    return result.slice(0, limit);
  }

  /**
   * Perform priority-based sampling of neighbors
   * @param {string} node - Node ID
   * @param {number} count - Number of neighbors to sample
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array} Sampled neighbors based on priority weights
   */
  sampleNeighbors(node, count = 1, minPriority = this.priorityThreshold) {
    if (!this.adjacencyBags.has(node)) {
      return [];
    }

    const bag = this.adjacencyBags.get(node);
    const results = [];

    for (let i = 0; i < count; i++) {
      const sampled = bag.sample();
      if (sampled && sampled.priority >= minPriority) {
        const key = this._createEdgeKey(node, sampled.key);
        const metadata = this.nodeMetadata.get(key) || {};

        results.push({
          node: sampled.key,
          priority: sampled.priority,
          metadata
        });
      } else if (sampled) {
        // If sampled item doesn't meet minPriority, try again with adjusted bag
        // For this implementation, we'll just continue
        continue;
      }
    }

    this.stats.totalAccesses += results.length;
    return results;
  }

  /**
   * Get the priority of a specific relationship
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   * @returns {number|null} Priority value or null if relationship doesn't exist
   */
  getRelationshipPriority(source, target) {
    if (!this.adjacencyBags.has(source)) {
      return null;
    }

    const entry = this.adjacencyBags.get(source).getWithPriority(target);
    return entry ? entry.priority : null;
  }

  /**
   * Update the priority of an existing relationship
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   * @param {number} newPriority - New priority value
   * @param {Object} metadata - Additional metadata to update
   */
  updateRelationship(source, target, newPriority, metadata = null) {
    if (!this.adjacencyBags.has(source) || !this.reverseAdjacencyBags.has(target)) {
      return false;
    }

    const sourceBag = this.adjacencyBags.get(source);
    const reverseBag = this.reverseAdjacencyBags.get(target);

    // Update priority in source bag
    if (!sourceBag.updatePriority(target, Math.max(0, Math.min(1, newPriority)))) {
      return false; // Relationship doesn't exist
    }

    // Update priority in reverse bag
    reverseBag.updatePriority(source, Math.max(0, Math.min(1, newPriority)));

    // Update metadata if provided
    if (metadata !== null) {
      const key = this._createEdgeKey(source, target);
      const existingMetadata = this.nodeMetadata.get(key) || {};
      this.nodeMetadata.set(key, { ...existingMetadata, ...metadata, priority: newPriority });
    }

    return true;
  }

  /**
   * Remove a relationship between two nodes
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   */
  removeRelationship(source, target) {
    if (!this.adjacencyBags.has(source) || !this.reverseAdjacencyBags.has(target)) {
      return false;
    }

    const sourceBag = this.adjacencyBags.get(source);
    const reverseBag = this.reverseAdjacencyBags.get(target);

    // Remove from forward adjacency bag
    const removedFromSource = sourceBag.remove(target);
    if (!removedFromSource) {
      return false; // Relationship doesn't exist
    }

    // Remove from reverse adjacency bag
    reverseBag.remove(source);

    // Check if bags are empty and remove if necessary
    if (sourceBag.isEmpty()) {
      this.adjacencyBags.delete(source);
      this.stats.nodeCount--;
    }

    if (reverseBag.isEmpty()) {
      this.reverseAdjacencyBags.delete(target);
      // Only decrease node count if node doesn't appear in forward adjacency bags
      if (!this.adjacencyBags.has(target)) {
        this.stats.nodeCount--;
      }
    }

    // Remove metadata
    const key = this._createEdgeKey(source, target);
    this.nodeMetadata.delete(key);

    this.stats.edgeCount--;
    return true;
  }

  /**
   * Perform depth-first traversal from a starting node
   * @param {string} startNode - Starting node ID
   * @param {number} maxDepth - Maximum traversal depth
   * @param {number} minPriority - Minimum priority threshold
   * @param {number} maxNodes - Maximum number of nodes to visit
   * @returns {Array} Traversed nodes in order
   */
  depthFirstTraversal(startNode, maxDepth = 3, minPriority = this.priorityThreshold, maxNodes = 100) {
    if (!this.adjacencyBags.has(startNode)) {
      return [];
    }

    const visited = new Set();
    const result = [];
    const stack = [{ node: startNode, depth: 0 }];

    while (stack.length > 0 && result.length < maxNodes) {
      const { node, depth } = stack.pop();

      if (visited.has(node) || depth > maxDepth) {
        continue;
      }

      visited.add(node);
      result.push(node);

      if (depth < maxDepth) {
        const neighbors = this.getNeighbors(node, 100, minPriority);
        // Add neighbors to stack in reverse order to maintain DFS behavior
        for (let i = neighbors.length - 1; i >= 0; i--) {
          if (!visited.has(neighbors[i].node)) {
            stack.push({ node: neighbors[i].node, depth: depth + 1 });
          }
        }
      }
    }

    this.stats.totalAccesses += result.length;
    return result;
  }

  /**
   * Perform breadth-first traversal from a starting node
   * @param {string} startNode - Starting node ID
   * @param {number} maxDepth - Maximum traversal depth
   * @param {number} minPriority - Minimum priority threshold
   * @param {number} maxNodes - Maximum number of nodes to visit
   * @returns {Array} Traversed nodes in level order
   */
  breadthFirstTraversal(startNode, maxDepth = 3, minPriority = this.priorityThreshold, maxNodes = 100) {
    if (!this.adjacencyBags.has(startNode)) {
      return [];
    }

    const visited = new Set();
    const result = [];
    const queue = [{ node: startNode, depth: 0 }];

    while (queue.length > 0 && result.length < maxNodes) {
      const { node, depth } = queue.shift();

      if (visited.has(node) || depth > maxDepth) {
        continue;
      }

      visited.add(node);
      result.push(node);

      if (depth < maxDepth) {
        const neighbors = this.getNeighbors(node, 100, minPriority);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.node)) {
            queue.push({ node: neighbor.node, depth: depth + 1 });
          }
        }
      }
    }

    this.stats.totalAccesses += result.length;
    return result;
  }

  /**
   * Get path between two nodes using priority-based traversal
   * @param {string} start - Starting node ID
   * @param {string} end - Target node ID
   * @param {number} maxDepth - Maximum search depth
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array|null} Path as array of nodes or null if no path found
   */
  getPath(start, end, maxDepth = 5, minPriority = this.priorityThreshold) {
    if (start === end) {
      return [start];
    }

    if (!this.adjacencyBags.has(start) || !this.adjacencyBags.has(end)) {
      return null;
    }

    const visited = new Set();
    const queue = [{ node: start, path: [start] }];

    while (queue.length > 0) {
      const current = queue.shift();
      const { node, path } = current;

      if (visited.has(node) || path.length > maxDepth) {
        continue;
      }

      visited.add(node);

      if (node === end) {
        this.stats.totalAccesses += path.length;
        return path;
      }

      const neighbors = this.getNeighbors(node, 100, minPriority);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node)) {
          queue.push({
            node: neighbor.node,
            path: [...path, neighbor.node]
          });
        }
      }
    }

    return null;
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return {
      ...this.stats,
      capacity: this.capacity,
      utilization: this.stats.nodeCount / this.capacity,
      averageConnections: this.stats.edgeCount / Math.max(1, this.stats.nodeCount),
      priorityThreshold: this.priorityThreshold,
      decayRate: this.decayRate
    };
  }

  /**
   * Get all nodes in the graph
   */
  getNodes() {
    const nodes = new Set();

    // Add all nodes from forward adjacency bags
    for (const key of this.adjacencyBags.keys()) {
      nodes.add(key);
    }

    // Add all nodes from reverse adjacency bags that aren't in forward adjacency bags
    for (const key of this.reverseAdjacencyBags.keys()) {
      nodes.add(key);
    }

    return Array.from(nodes);
  }

  /**
   * Calculate node centrality (how central a node is in the graph)
   * @param {string} node - Node ID
   * @returns {number} Centrality value
   */
  getNodeCentrality(node) {
    const forwardCount = this.adjacencyBags.has(node) ? this.adjacencyBags.get(node).size() : 0;
    const reverseCount = this.reverseAdjacencyBags.has(node) ? this.reverseAdjacencyBags.get(node).size() : 0;

    // Combined centrality based on both outgoing and incoming connections
    return (forwardCount + reverseCount) / Math.max(1, this.stats.edgeCount);
  }

  /**
   * Internal method: Create a unique key for an edge
   */
  _createEdgeKey(source, target) {
    return `${source}→${target}`;
  }

  /**
   * Internal method: Decay old relationships to prevent stale connections
   */
  _decayOldRelationships() {
    // Only perform decay occasionally to avoid performance impact
    if (Math.random() > 0.1) {  // 10% chance to perform decay
      return;
    }

    // Apply decay to all adjacency bags
    for (const [node, bag] of this.adjacencyBags.entries()) {
      bag.decay(this.decayRate);

      // Clean up any items that have been fully decayed
      const allItems = bag.getAll();
      for (const item of allItems) {
        if (item.priority < 0.001) {
          bag.remove(item.key);
        }
      }
    }

    // Apply decay to reverse adjacency bags as well
    for (const [node, bag] of this.reverseAdjacencyBags.entries()) {
      bag.decay(this.decayRate);

      // Clean up any items that have been fully decayed
      const allItems = bag.getAll();
      for (const item of allItems) {
        if (item.priority < 0.001) {
          bag.remove(item.key);
        }
      }
    }
  }

  /**
   * Internal method: Check capacity and evict low-priority relationships if necessary
   */
  _checkCapacity() {
    if (this.stats.edgeCount <= this.capacity) {
      return;
    }

    // For a more sophisticated implementation, we could implement a global decay
    // or remove relationships based on priority across the entire graph
    // For now, we'll just make sure individual bags respect their capacity
  }

  /**
   * Remove a node and all its relationships from the graph
   * @param {string} node - Node ID to remove
   */
  removeNode(node) {
    let removedCount = 0;

    // Remove all forward relationships from this node
    if (this.adjacencyBags.has(node)) {
      const bag = this.adjacencyBags.get(node);
      const allItems = bag.getAll();

      for (const item of allItems) {
        // Remove the reverse relationship
        if (this.reverseAdjacencyBags.has(item.key)) {
          this.reverseAdjacencyBags.get(item.key).remove(node);
        }

        // Remove metadata
        const key = this._createEdgeKey(node, item.key);
        this.nodeMetadata.delete(key);
        removedCount++;
      }

      this.adjacencyBags.delete(node);
      this.stats.nodeCount--;
    }

    // Remove all reverse relationships to this node
    if (this.reverseAdjacencyBags.has(node)) {
      const bag = this.reverseAdjacencyBags.get(node);
      const allItems = bag.getAll();

      for (const item of allItems) {
        // Remove the forward relationship
        if (this.adjacencyBags.has(item.key)) {
          this.adjacencyBags.get(item.key).remove(node);
        }

        // Remove metadata
        const key = this._createEdgeKey(item.key, node);
        this.nodeMetadata.delete(key);
        removedCount++;
      }

      this.reverseAdjacencyBags.delete(node);
      this.stats.nodeCount--;
    }

    // Update stats
    this.stats.edgeCount -= removedCount;

    return removedCount;
  }

  /**
   * Get the entire neighborhood of a node (both forward and reverse)
   * @param {string} node - Node ID
   * @param {number} limit - Maximum number of neighbors per direction
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Object} Object with forward and reverse neighbors
   */
  getFullNeighborhood(node, limit = 10, minPriority = this.priorityThreshold) {
    const forwardNeighbors = this.getNeighbors(node, limit, minPriority);
    const reverseNeighbors = this.getReverseNeighbors(node, limit, minPriority);

    return {
      node,
      forward: forwardNeighbors,
      reverse: reverseNeighbors,
      totalConnections: forwardNeighbors.length + reverseNeighbors.length,
      centrality: this.getNodeCentrality(node)
    };
  }

  /**
   * Find nodes that match a specific metadata condition
   * @param {Function} predicate - Function to test metadata
   * @returns {Array} Array of matching node IDs
   */
  findNodesByMetadata(predicate) {
    const matches = [];

    for (const [key, metadata] of this.nodeMetadata.entries()) {
      if (predicate(metadata)) {
        // Extract source and target from the edge key
        const parts = key.split('→');
        if (parts.length === 2) {
          const [source, target] = parts;
          if (!matches.includes(source)) matches.push(source);
          if (!matches.includes(target)) matches.push(target);
        }
      }
    }

    return matches;
  }

  /**
   * Get all relationships in the graph
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array} Array of all relationships
   */
  getAllRelationships(minPriority = this.priorityThreshold) {
    const relationships = [];

    for (const [source, bag] of this.adjacencyBags.entries()) {
      const allItems = bag.getAll();

      for (const item of allItems) {
        if (item.priority >= minPriority) {
          const key = this._createEdgeKey(source, item.key);
          const metadata = this.nodeMetadata.get(key) || {};

          relationships.push({
            source,
            target: item.key,
            priority: item.priority,
            metadata,
            relationshipKey: key
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Calculate graph density (ratio of actual edges to possible edges)
   * @returns {number} Graph density value
   */
  getGraphDensity() {
    const nodes = this.getNodes();
    const possibleEdges = nodes.length * (nodes.length - 1); // Directed graph

    if (possibleEdges === 0) return 0;

    return this.stats.edgeCount / possibleEdges;
  }

  /**
   * Get the most central nodes in the graph
   * @param {number} count - Number of nodes to return
   * @returns {Array} Array of most central nodes with their centrality scores
   */
  getMostCentralNodes(count = 5) {
    const nodes = this.getNodes();
    const centralities = nodes.map(node => ({
      node,
      centrality: this.getNodeCentrality(node)
    }));

    return centralities
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, count);
  }

  /**
   * Find clusters of highly connected nodes
   * @param {number} minClusterSize - Minimum size for a cluster
   * @param {number} minConnectionDensity - Minimum internal connection density
   * @returns {Array} Array of clusters
   */
  findClusters(minClusterSize = 3, minConnectionDensity = 0.5) {
    const clusters = [];
    const visited = new Set();
    const nodes = this.getNodes();

    for (const node of nodes) {
      if (visited.has(node)) continue;

      // Simple clustering algorithm: find closely connected nodes
      const cluster = [node];
      visited.add(node);

      // Find neighbors of the current node
      const neighbors = this.getNeighbors(node, 20, this.priorityThreshold);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node)) {
          // Check if the neighbor is well-connected to the current cluster
          let connectionsToCluster = 0;
          for (const clusterNode of cluster) {
            if (this.getRelationshipPriority(neighbor.node, clusterNode) ||
                this.getRelationshipPriority(clusterNode, neighbor.node)) {
              connectionsToCluster++;
            }
          }

          if (connectionsToCluster > 0) {
            cluster.push(neighbor.node);
            visited.add(neighbor.node);
          }
        }
      }

      if (cluster.length >= minClusterSize) {
        clusters.push({
          nodes: cluster,
          size: cluster.length,
          density: this._calculateClusterDensity(cluster)
        });
      }
    }

    return clusters.filter(cluster =>
      cluster.density >= minConnectionDensity
    );
  }

  /**
   * Calculate the density of connections within a cluster
   * @private
   */
  _calculateClusterDensity(clusterNodes) {
    if (clusterNodes.length < 2) return 0;

    let connections = 0;
    const n = clusterNodes.length;
    const possibleConnections = n * (n - 1); // Directed graph

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const priority = this.getRelationshipPriority(clusterNodes[i], clusterNodes[j]);
          if (priority !== null && priority >= this.priorityThreshold) {
            connections++;
          }
        }
      }
    }

    return possibleConnections > 0 ? connections / possibleConnections : 0;
  }

  /**
   * Internal method: Check capacity and evict low-priority relationships if necessary
   */
  _checkCapacity() {
    // Check if we're approaching capacity limits
    if (this.stats.edgeCount > this.capacity * 0.9) {  // 90% of capacity
      // Apply more aggressive decay to prevent exceeding limits
      this._decayOldRelationships(true);
    }
  }

  /**
   * Force decay of relationships with a more aggressive rate
   */
  _decayOldRelationships(force = false) {
    // Only perform decay occasionally unless forced
    if (!force && Math.random() > 0.1) {  // 10% chance to perform decay
      return;
    }

    const decayRate = force ? this.decayRate * 2 : this.decayRate;

    // Apply decay to all adjacency bags
    for (const [node, bag] of this.adjacencyBags.entries()) {
      bag.decay(decayRate);

      // Clean up any items that have been fully decayed
      const itemsToRemove = [];
      for (const item of bag.getAll()) {
        if (item.priority < 0.001) {
          itemsToRemove.push(item.key);
        }
      }

      for (const itemKey of itemsToRemove) {
        this.removeRelationship(node, itemKey);
      }
    }

    // Apply decay to reverse adjacency bags as well
    for (const [node, bag] of this.reverseAdjacencyBags.entries()) {
      bag.decay(decayRate);
    }
  }
}

export default AdjacencyBag;