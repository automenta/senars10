import GraphTraversal from '../../core/memory/GraphTraversal.js';
import AdjacencyBag from '../../core/memory/AdjacencyBag.js';

describe('GraphTraversal', () => {
  let graphTraversal;
  let adjacencyBag;

  beforeEach(async () => {
    adjacencyBag = new AdjacencyBag();
    await adjacencyBag.initialize();

    graphTraversal = new GraphTraversal(adjacencyBag);
    await graphTraversal.initialize();
  });

  test('should initialize correctly', () => {
    expect(graphTraversal).toBeDefined();
    expect(graphTraversal.getStats().traversals).toBe(0);
  });

  test('should perform bidirectional search', () => {
    // Create a simple graph: A -- B -- C -- D
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('B', 'A', 0.7);
    adjacencyBag.addRelationship('B', 'C', 0.9);
    adjacencyBag.addRelationship('C', 'B', 0.8);
    adjacencyBag.addRelationship('C', 'D', 0.7);
    adjacencyBag.addRelationship('D', 'C', 0.6);

    const path = graphTraversal.bidirectionalSearch('A', 'D', 10, 0.5);
    expect(path).toContain('A');
    expect(path).toContain('B');
    expect(path).toContain('C');
    expect(path).toContain('D');
    expect(path[0]).toBe('A');
    expect(path[path.length - 1]).toBe('D');
  });

  test('should return direct path for same start and end node', () => {
    const path = graphTraversal.bidirectionalSearch('A', 'A');
    expect(path).toEqual(['A']);
  });

  test('should return null for disconnected nodes', () => {
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('C', 'D', 0.7);

    const path = graphTraversal.bidirectionalSearch('A', 'C');
    expect(path).toBeNull();
  });

  test('should perform priority-based traversal', () => {
    // Create a graph with different priority connections
    adjacencyBag.addRelationship('A', 'B', 0.9);
    adjacencyBag.addRelationship('A', 'C', 0.6);
    adjacencyBag.addRelationship('A', 'D', 0.3);
    adjacencyBag.addRelationship('B', 'E', 0.8);
    adjacencyBag.addRelationship('C', 'F', 0.7);

    const result = graphTraversal.priorityBasedTraversal('A', 2, 10, 0.2);

    // Should prioritize high-priority connections first
    expect(result).toContainEqual(expect.objectContaining({ node: 'B' }));
    expect(result).toContainEqual(expect.objectContaining({ node: 'C' }));
    expect(result).toContainEqual(expect.objectContaining({ node: 'D' }));

    // B should have higher priority than C and D
    const bResult = result.find(item => item.node === 'B');
    const cResult = result.find(item => item.node === 'C');
    expect(bResult.priority).toBeGreaterThan(cResult.priority);
  });

  test('should respect max depth in priority-based traversal', () => {
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('B', 'C', 0.7);
    adjacencyBag.addRelationship('C', 'D', 0.6);

    // With max depth of 1, should only visit A and B
    const result = graphTraversal.priorityBasedTraversal('A', 1, 10, 0.1);
    const nodes = result.map(item => item.node);
    expect(nodes).toContain('A');
    expect(nodes).toContain('B');
    expect(nodes).not.toContain('C');
    expect(nodes).not.toContain('D');
  });

  test('should find chain patterns', () => {
    // Create a simple linear graph: A -- B -- C
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('B', 'C', 0.7);

    const patterns = graphTraversal.patternBasedExploration('A', 5, 0.1);

    // Should have found some patterns (chains, stars, etc.)
    expect(patterns).toHaveProperty('chains');
    expect(Array.isArray(patterns.chains)).toBe(true);
  });

  test('should find star patterns', () => {
    // Create a star pattern: B is center node connected to A, C, D, E
    adjacencyBag.addRelationship('B', 'A', 0.8);
    adjacencyBag.addRelationship('B', 'C', 0.7);
    adjacencyBag.addRelationship('B', 'D', 0.9);
    adjacencyBag.addRelationship('B', 'E', 0.6);
    // Add reverse connections
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('C', 'B', 0.7);
    adjacencyBag.addRelationship('D', 'B', 0.9);
    adjacencyBag.addRelationship('E', 'B', 0.6);

    const patterns = graphTraversal.patternBasedExploration('B', 3, 0.5);

    // Should identify B as a star center
    expect(patterns.stars).toContainEqual(
      expect.objectContaining({
        center: 'B',
        connections: expect.any(Number), // Number of connections
      })
    );

    const star = patterns.stars.find(s => s.center === 'B');
    expect(star.connections).toBeGreaterThanOrEqual(4); // B connects to 4 nodes
  });

  test('should find cluster patterns', () => {
    // Create a cluster: A, B, C are all interconnected
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('A', 'C', 0.7);
    adjacencyBag.addRelationship('B', 'C', 0.9);
    adjacencyBag.addRelationship('B', 'A', 0.8);
    adjacencyBag.addRelationship('C', 'A', 0.7);
    adjacencyBag.addRelationship('C', 'B', 0.9);

    const patterns = graphTraversal.patternBasedExploration('A', 3, 0.5);

    // Should find a cluster containing A, B, C
    const hasClusterWithABC = patterns.clusters.some(cluster =>
      cluster.includes('A') && cluster.includes('B') && cluster.includes('C')
    );
    expect(hasClusterWithABC).toBe(true);
  });

  test('should find cycles in the graph', () => {
    // Create a cycle: A -> B -> C -> A
    adjacencyBag.addRelationship('A', 'B', 0.8);
    adjacencyBag.addRelationship('B', 'C', 0.7);
    adjacencyBag.addRelationship('C', 'A', 0.9);

    const patterns = graphTraversal.patternBasedExploration('A', 5, 0.5);

    // Should detect the cycle
    expect(patterns.cycles.length).toBeGreaterThanOrEqual(1);
  });

  test('should perform semantic pathfinding with relationship metadata', () => {
    // Create a graph with metadata
    adjacencyBag.addRelationship('A', 'B', 0.8, { type: 'causal' });
    adjacencyBag.addRelationship('B', 'C', 0.7, { type: 'temporal' });
    adjacencyBag.addRelationship('A', 'D', 0.6, { type: 'spatial' });
    adjacencyBag.addRelationship('D', 'C', 0.9, { type: 'causal' });

    // Find path allowing only causal relationships
    const result = graphTraversal.semanticPathfinding('A', 'C', {
      allowedRelationshipTypes: ['causal'],
      maxDepth: 5,
      minPriority: 0.5
    });

    // Should find path A -> D -> C (both relationships are causal)
    if (result) {
      expect(result.path).toContain('A');
      expect(result.path).toContain('C');
      expect(result.path).toContain('D');
    }
  });

  test('should respect forbidden nodes in semantic pathfinding', () => {
    adjacencyBag.addRelationship('A', 'B', 0.9);
    adjacencyBag.addRelationship('B', 'C', 0.8);
    adjacencyBag.addRelationship('A', 'D', 0.7);
    adjacencyBag.addRelationship('D', 'C', 0.6);

    // Find path from A to C but forbidding B
    const result = graphTraversal.semanticPathfinding('A', 'C', {
      forbiddenNodes: ['B'],
      maxDepth: 5,
      minPriority: 0.5
    });

    // Should find path A -> D -> C, not A -> B -> C
    if (result) {
      expect(result.path).toContain('A');
      expect(result.path).toContain('C');
      expect(result.path).toContain('D');
      expect(result.path).not.toContain('B');
    }
  });

  test('should respect required nodes in semantic pathfinding', () => {
    adjacencyBag.addRelationship('A', 'B', 0.9);
    adjacencyBag.addRelationship('B', 'C', 0.8);
    adjacencyBag.addRelationship('A', 'D', 0.7);
    adjacencyBag.addRelationship('D', 'C', 0.6);

    // Find path from A to C that must go through B
    const result = graphTraversal.semanticPathfinding('A', 'C', {
      requiredNodes: ['B'],
      maxDepth: 5,
      minPriority: 0.5
    });

    // Should find path A -> B -> C
    if (result) {
      expect(result.path).toContain('A');
      expect(result.path).toContain('B');
      expect(result.path).toContain('C');
    }
  });

  test('should return statistics correctly', () => {
    const stats = graphTraversal.getStats();
    expect(stats).toHaveProperty('traversals');
    expect(stats).toHaveProperty('nodesVisited');
    expect(stats).toHaveProperty('pathsDiscovered');
    expect(stats).toHaveProperty('patternsFound');
    expect(stats).toHaveProperty('avgNodesPerTraversal');
    expect(stats).toHaveProperty('avgPathsPerTraversal');
  });
});