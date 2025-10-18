import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * GraphTraversal - Specialized algorithms for knowledge discovery in graph structures
 *
 * Implements various graph traversal algorithms optimized for knowledge discovery
 * including bidirectional search, priority-based traversal, and pattern-based exploration.
 */
class GraphTraversal extends Component {
  constructor(adjacencyBag) {
    super();
    this.adjacencyBag = adjacencyBag;
    this.stats = {
      traversals: 0,
      nodesVisited: 0,
      pathsDiscovered: 0,
      patternsFound: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.stats = {
      traversals: 0,
      nodesVisited: 0,
      pathsDiscovered: 0,
      patternsFound: 0
    };
  }

  /**
   * Bidirectional search between two nodes
   * @param {string} start - Starting node
   * @param {string} end - Target node
   * @param {number} maxDepth - Maximum search depth
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array|null} Path or null if no path found
   */
  bidirectionalSearch(start, end, maxDepth = 5, minPriority = 0.3) {
    if (start === end) return [start];

    // For bidirectional search, we need parent tracking to reconstruct paths
    const forwardParent = new Map(); // node -> parent
    const backwardParent = new Map(); // node -> parent
    const forwardDepth = new Map(); // node -> depth from start
    const backwardDepth = new Map(); // node -> depth from end

    const forwardQueue = [start];
    const backwardQueue = [end];

    forwardParent.set(start, null);
    backwardParent.set(end, null);
    forwardDepth.set(start, 0);
    backwardDepth.set(end, 0);

    while (forwardQueue.length > 0 || backwardQueue.length > 0) {
      // Expand forward search
      if (forwardQueue.length > 0) {
        const node = forwardQueue.shift();
        const depth = forwardDepth.get(node);

        // If this node was visited by backward search, path is found
        if (backwardDepth.has(node) && depth + backwardDepth.get(node) <= maxDepth) {
          return this._reconstructPath(forwardParent, backwardParent, node, start, end);
        }

        if (depth < maxDepth / 2) { // Limit expansion to half depth for balance
          const neighbors = this.adjacencyBag.getNeighbors(node, 100, minPriority);
          for (const neighbor of neighbors) {
            if (!forwardParent.has(neighbor.node)) {
              forwardParent.set(neighbor.node, node);
              forwardDepth.set(neighbor.node, depth + 1);
              forwardQueue.push(neighbor.node);
            }
          }
        }
      }

      // Expand backward search
      if (backwardQueue.length > 0) {
        const node = backwardQueue.shift();
        const depth = backwardDepth.get(node);

        // If this node was visited by forward search, path is found
        if (forwardDepth.has(node) && depth + forwardDepth.get(node) <= maxDepth) {
          return this._reconstructPath(forwardParent, backwardParent, node, start, end);
        }

        if (depth < maxDepth / 2) { // Limit expansion to half depth for balance
          const reverseNeighbors = this.adjacencyBag.getReverseNeighbors(node, 100, minPriority);
          for (const neighbor of reverseNeighbors) {
            if (!backwardParent.has(neighbor.node)) {
              backwardParent.set(neighbor.node, node);
              backwardDepth.set(neighbor.node, depth + 1);
              backwardQueue.push(neighbor.node);
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Reconstruct path from bidirectional search
   * @private
   */
  _reconstructPath(forwardParent, backwardParent, meetingNode, start, end) {
    // Reconstruct path from start to meeting node
    const pathForward = [];
    let current = meetingNode;
    while (current !== null) {
      pathForward.unshift(current);
      current = forwardParent.get(current);
    }

    // Reconstruct path from meeting node to end (in reverse)
    const pathBackward = [];
    current = backwardParent.get(meetingNode); // Skip the meeting node as it's already in pathForward
    while (current !== null) {
      pathBackward.push(current);
      current = backwardParent.get(current);
    }

    this.stats.traversals++;
    this.stats.pathsDiscovered++;
    return [...pathForward, ...pathBackward];
  }

  /**
   * Priority-based traversal focusing on high-priority connections
   * @param {string} start - Starting node
   * @param {number} maxDepth - Maximum traversal depth
   * @param {number} maxNodes - Maximum nodes to visit
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Array} Ordered list of traversed nodes based on priority
   */
  priorityBasedTraversal(start, maxDepth = 3, maxNodes = 50, minPriority = 0.3) {
    const result = [];
    const visited = new Set();
    const queue = [{ node: start, depth: 0, priority: 1.0 }]; // Start with full priority

    while (queue.length > 0 && result.length < maxNodes) {
      // Sort by priority to process high-priority nodes first
      queue.sort((a, b) => b.priority - a.priority);
      const current = queue.shift();
      const { node, depth, priority } = current;

      if (visited.has(node) || depth > maxDepth) {
        continue;
      }

      visited.add(node);
      result.push({ node, priority, depth });

      if (depth < maxDepth) {
        // Get neighbors sorted by priority
        const neighbors = this.adjacencyBag.getNeighbors(node, 100, minPriority);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.node)) {
            // Use the neighbor's priority for traversal prioritization
            queue.push({
              node: neighbor.node,
              depth: depth + 1,
              priority: neighbor.priority
            });
          }
        }
      }
    }

    this.stats.traversals++;
    this.stats.nodesVisited += result.length;
    return result;
  }

  /**
   * Pattern-based exploration algorithm
   * Discovers common patterns in the knowledge graph such as:
   * - Chains: A -> B -> C -> D
   * - Stars: Center node connected to multiple others
   * - Clusters: Tightly connected groups
   * @param {string} start - Starting node
   * @param {number} maxDepth - Maximum exploration depth
   * @param {number} minPriority - Minimum priority threshold
   * @returns {Object} Discovered patterns
   */
  patternBasedExploration(start, maxDepth = 3, minPriority = 0.3) {
    const patterns = {
      chains: [],
      stars: [],
      clusters: [],
      cycles: []
    };

    const globallyVisited = new Set(); // Prevent infinite loops by tracking globally visited nodes
    const traversalStack = [{ node: start, path: [start], depth: 0, visitedInPath: new Set([start]) }];
    const allNodes = [];

    // First, perform traversal to collect nodes and relationships
    while (traversalStack.length > 0) {
      const current = traversalStack.pop();
      const { node, path, depth, visitedInPath } = current;

      if (globallyVisited.has(node) || depth > maxDepth) {
        continue;
      }

      // Mark as globally visited to prevent infinite loops
      globallyVisited.add(node);
      allNodes.push(node);

      if (depth < maxDepth) {
        const neighbors = this.adjacencyBag.getNeighbors(node, 50, minPriority);
        for (const neighbor of neighbors) {
          if (!visitedInPath.has(neighbor.node)) { // Prevent cycles in current path
            const newVisitedInPath = new Set(visitedInPath);
            newVisitedInPath.add(neighbor.node);

            traversalStack.push({
              node: neighbor.node,
              path: [...path, neighbor.node],
              depth: depth + 1,
              visitedInPath: newVisitedInPath
            });
          } else if (path.length > 1 && path[path.length - 2] !== neighbor.node) {
            // Found a cycle (excluding immediate back-and-forth)
            patterns.cycles.push([...path, neighbor.node]);
          }
        }
      }
    }

    // Discover chains: sequences of nodes with mostly one-to-one connections
    this._findChains(start, patterns, maxDepth, minPriority);

    // Discover stars: nodes with high centrality (many connections)
    this._findStars(allNodes, patterns, minPriority);

    // Discover clusters: groups of nodes with dense interconnections
    this._findClusters(allNodes, patterns, minPriority);

    this.stats.traversals++;
    this.stats.patternsFound += patterns.chains.length + patterns.stars.length + patterns.clusters.length + patterns.cycles.length;

    return patterns;
  }

  /**
   * Find chain patterns in the graph
   * @private
   */
  _findChains(start, patterns, maxDepth, minPriority) {
    // Use DFS to find long chains where each node has ~1-2 high-priority connections
    const visited = new Set();
    const chains = [];
    const stack = [{ node: start, path: [start], depth: 0 }];

    while (stack.length > 0) {
      const { node, path, depth } = stack.pop();

      // Mark as visited first to avoid processing the same node multiple times
      if (visited.has(node)) {
        continue;
      }
      visited.add(node);

      if (depth > maxDepth) {
        if (path.length > 2) { // Only consider chains of 3+ nodes
          chains.push(path);
        }
        continue;
      }

      const neighbors = this.adjacencyBag.getNeighbors(node, 10, minPriority);
      // Consider a chain if the node has limited high-priority connections
      if (neighbors.length <= 2) {
        for (const neighbor of neighbors) {
          if (!path.includes(neighbor.node)) {
            stack.push({
              node: neighbor.node,
              path: [...path, neighbor.node],
              depth: depth + 1
            });
          }
        }
      } else if (path.length > 2) {
        // End of a chain
        chains.push(path);
      }
    }

    patterns.chains = chains;
  }

  /**
   * Find star patterns (highly connected nodes)
   * @private
   */
  _findStars(nodes, patterns, minPriority) {
    const stars = [];

    for (const node of nodes) {
      const neighbors = this.adjacencyBag.getNeighbors(node, 100, minPriority);
      const reverseNeighbors = this.adjacencyBag.getReverseNeighbors(node, 100, minPriority);

      // Calculate centrality score
      const centrality = this.adjacencyBag.getNodeCentrality(node);

      if (neighbors.length + reverseNeighbors.length > 3 || centrality > 0.1) { // Threshold for "star"
        stars.push({
          center: node,
          centrality,
          connections: neighbors.length + reverseNeighbors.length,
          neighbors: [...neighbors.map(n => n.node), ...reverseNeighbors.map(n => n.node)],
          outConnections: neighbors.length,
          inConnections: reverseNeighbors.length
        });
      }
    }

    patterns.stars = stars.sort((a, b) => b.centrality - a.centrality);
  }

  /**
   * Find cluster patterns (tightly connected groups)
   * @private
   */
  _findClusters(nodes, patterns, minPriority) {
    const clusters = [];
    const visited = new Set();

    for (const node of nodes) {
      if (visited.has(node)) continue;

      // Simple clustering based on mutual connections
      const cluster = new Set([node]);
      visited.add(node);

      const neighbors = this.adjacencyBag.getNeighbors(node, 20, minPriority);

      // Add neighbors that have high connectivity to the cluster
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node) && this._isWellConnectedToCluster(neighbor.node, cluster, minPriority)) {
          cluster.add(neighbor.node);
          visited.add(neighbor.node);
        }
      }

      if (cluster.size > 2) { // Only consider clusters with more than 2 nodes
        clusters.push(Array.from(cluster));
      }
    }

    patterns.clusters = clusters;
  }

  /**
   * Check if a node is well connected to a cluster
   * @private
   */
  _isWellConnectedToCluster(node, cluster, minPriority) {
    let connections = 0;
    for (const clusterNode of cluster) {
      if (this.adjacencyBag.getRelationshipPriority(node, clusterNode) >= minPriority ||
          this.adjacencyBag.getRelationshipPriority(clusterNode, node) >= minPriority) {
        connections++;
      }
    }
    // A node is well connected if it connects to at least half the cluster
    return connections >= cluster.size * 0.5;
  }

  /**
   * Semantic pathfinding with meaning-aware traversal
   * Considers relationship types and semantic similarity during pathfinding
   * @param {string} start - Starting node
   * @param {string} end - Target node
   * @param {Object} options - Traversal options
   * @returns {Object} Path with semantic information
   */
  semanticPathfinding(start, end, options = {}) {
    const {
      maxDepth = 5,
      minPriority = 0.3,
      allowedRelationshipTypes = null, // e.g., ['causal', 'temporal', 'spatial']
      forbiddenNodes = [],
      requiredNodes = []
    } = options;

    if (start === end) {
      return { path: [start], relationships: [], score: 1.0 };
    }

    const visited = new Set();
    const queue = [{
      node: start,
      path: [start],
      relationships: [],
      score: 1.0,
      depth: 0
    }];

    while (queue.length > 0) {
      const current = queue.shift();
      const { node, path, relationships, score, depth } = current;

      if (visited.has(node) || depth > maxDepth || forbiddenNodes.includes(node)) {
        continue;
      }

      visited.add(node);

      if (node === end) {
        // Check if required nodes are in path
        if (requiredNodes.length > 0) {
          const hasRequired = requiredNodes.every(req => path.includes(req));
          if (!hasRequired) continue;
        }

        this.stats.traversals++;
        this.stats.pathsDiscovered++;
        return {
          path,
          relationships,
          score,
          depth
        };
      }

      if (depth < maxDepth) {
        const neighbors = this.adjacencyBag.getNeighbors(node, 50, minPriority);
        for (const neighbor of neighbors) {
          // Check relationship constraints
          if (allowedRelationshipTypes && neighbor.metadata.type &&
              !allowedRelationshipTypes.includes(neighbor.metadata.type)) {
            continue;
          }

          if (!visited.has(neighbor.node)) {
            const newRelationships = [...relationships, {
              from: node,
              to: neighbor.node,
              priority: neighbor.priority,
              metadata: neighbor.metadata
            }];

            const newScore = score * neighbor.priority; // Multiply scores along the path

            queue.push({
              node: neighbor.node,
              path: [...path, neighbor.node],
              relationships: newRelationships,
              score: newScore,
              depth: depth + 1
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Get traversal statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgNodesPerTraversal: this.stats.traversals ? this.stats.nodesVisited / this.stats.traversals : 0,
      avgPathsPerTraversal: this.stats.traversals ? this.stats.pathsDiscovered / this.stats.traversals : 0
    };
  }
}

export default GraphTraversal;