# SeNARS Language-Agnostic Specification

This document serves as the complete specification for implementing SeNARS in any programming language. The architecture is designed to be language-agnostic while maintaining the core cognitive capabilities and neuro-symbolic integration.

## Design Specification Cheatsheets

### Task Punctuation Types

| Punctuation | Name | Description | Example Usage |
|-------------|------|-------------|---------------|
| `.` | **Belief** | Represents a statement about the world with associated truth value | `(cat --> mammal).` - "Cats are mammals" |
| `!` | **Goal** | Represents a desired state the system aims to achieve | `clean_kitchen!` - "Clean the kitchen" |
| `?` | **Question** | Represents an information query seeking specific knowledge | `cat_purr_frequency?` - "How often do cats purr?" |

### Term Operator Types

#### Core Relationship Operators

| Operator | Syntax | Description | Example | Cognitive Purpose |
|----------|--------|-------------|---------|-------------------|
| **Negation** | `(--, term)` | Logical NOT | `(--, (cat --> bird))`, shorthand: `--x` | Contradiction and negation handling |
| **Product** | `(x,y)` | Tuples/vectors/lists | `(x,y)` | Ordered data relation |
| **Inheritance** | `(subject --> predicate)` | "is-a" relationships and hierarchical knowledge | `(cat --> mammal)` | Taxonomic classification and inheritance reasoning |
| **Similarity** | `(term1 <-> term2)` | Similarity relationships | `(dog <-> wolf)` | Analogical reasoning and pattern matching |
| **Implication** | `(premise ==> conclusion)` | Predictive or causal links | `(raining ==> wet_streets)` | Forward causal and predictive reasoning |
| **Equivalence** | `(term1 <=> term2)` | Bidirectional relationships | `(cat <=> feline)` | Symmetric relationship representation |
| **Conjunction** | `(&, term1, term2, ...)` | Logical AND combination | `(&, cat, furry, pet)`, infix form: `(a & b)`==`(&,a,b)` (same for `|`) | Complex condition representation |
| **Disjunction** | `(\|, term1, term2, ...)` | Logical OR alternatives | `(\|, cat, dog, bird)` | Alternative possibility representation |
| **Sequential Conjunction** | `(&/, action, condition)` | Conditional operations | `(&/, clean, dirty_room)` | Action planning with preconditions |
| **Operation** | `(function ^ arguments)` | Operations, function call, arguments is typically a Product | alternate C-like syntax: `f(x,y)`=`(f ^ (x,y))` | Mental/physical actions |


#### Set and Property Operators

| Operator | Syntax | Description | Example | Cognitive Purpose |
|----------|--------|-------------|---------|-------------------|
| **Instance** | `(instance {-- class)` | Specific instances | `(fluffy {-- cat)` | Individual-class relationships |
| **Property** | `(object --} property)` | Attribute relationships | `(cat --} furry)` | Property and characteristic modeling |
| **Extensional Set** | `{item1, item2, ...}` | Set membership | `{cat, dog, bird}` | Collection and membership representation |
| **Intensional Set** | `[property1, property2]` | Property-based sets | `[furry, pet, mammal]` | Abstract set definition |

### System Constants Specification

#### Truth Value Ranges

| Level | Frequency | Confidence | Description |
|-------|-----------|------------|-------------|
| **High** | 1.0 | 0.9 | Strong belief with high certainty |
| **Medium-High** | 0.9 | 0.85 | Strong belief with good certainty |
| **Medium** | 0.8 | 0.85 | Moderate belief with good certainty |
| **Medium-Low** | 0.7 | 0.8 | Moderate belief with moderate certainty |
| **Low** | 0.5 | 0.7 | Weak belief with moderate certainty |
| **Very Low** | 0.1 | 0.2 | Speculative belief with low certainty |

#### Priority Levels

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| **Default** | 0.0 | No special priority | Background processing |
| **Low** | 0.1 | Minimal priority boost | Non-urgent tasks |
| **Medium** | 0.5 | Standard priority | Regular cognitive work |
| **High** | 0.8 | Elevated priority | Important goals/questions |
| **Very High** | 0.95 | Maximum priority | Critical system tasks |

#### Time Thresholds

| Threshold | Duration | Description |
|-----------|----------|-------------|
| **Default Expiration** | 24 hours | Standard task lifetime |
| **Long Expiration** | 30 days | Extended task persistence |
| **High Importance** | 0.8 | Priority threshold for focus |
| **Very High Importance** | 0.95 | Critical task threshold |

## Architecture Overview

### Core Cognitive Cycle Specification

#### Cycle Phase Definitions

| Phase | Component | Description | Input | Output | Performance Target |
|-------|-----------|-------------|-------|--------|-------------------|
| **Perception** | `TaskFactory` | Convert external input to Tasks | Raw input/events | Structured Tasks | < 10ms per task |
| **Prioritization** | `PriorityManager` | Calculate task priorities | All active tasks | Priority scores | < 5ms for 1000 tasks |
| **Focus Selection** | `Cycle.selectFocusSet` | Select tasks for current cycle | Prioritized tasks | Focus set (N tasks) | < 1ms selection |
| **Reasoning** | `Reasoner` | Apply inference rules | Focus set | Derived tasks | < 50ms per cycle |
| **Meta-Cognition** | `MetaCognition` | Detect contradictions/conflicts | New knowledge | Resolution tasks | < 20ms analysis |
| **Neural Enrichment** | `LM` | Generate creative insights | Reasoning gaps | Enriched knowledge | < 2000ms responses |
| **Planning** | `Planner` | Create action sequences | Goal tasks | Execution plans | < 100ms planning |
| **Action Execution** | `ActionExecutor` | Execute planned actions | Valid plans | Action results | Variable by action |
| **Learning** | `Memory` | Consolidate new knowledge | Experience | Updated beliefs | < 10ms integration |

#### Focus Set Selection Algorithm

```typescript
interface FocusSetSelection {
  maxSize: number;           // Maximum tasks per cycle
  priorityThreshold: number; // Minimum priority for inclusion
  diversityFactor: number;   // Encourage cognitive diversity
  urgencyWeight: number;     // Weight for time-critical tasks
  goalAlignmentWeight: number; // Weight for goal relevance
}
```

### Neuro-Symbolic Integration Specification

#### LM Service Interface (Language-Agnostic)

```typescript
interface LMService {
  // Core capabilities
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  answerQuestion(context: string, question: string): Promise<Answer>;

  // Advanced features
  generateHypothesis(observations: string[], constraints: string[]): Promise<Hypothesis[]>;
  repairPlan(failedPlan: Plan, error: Error): Promise<Plan>;
  explainReasoning(reasoningTrace: ReasoningStep[]): Promise<Explanation>;
  findSimilarConcepts(concept: string, domain?: string): Promise<SimilarConcept[]>;
}

interface GenerationOptions {
  temperature?: number;      // 0.0-2.0, creativity vs consistency
  maxTokens?: number;       // Maximum response length
  stopSequences?: string[]; // Sequences that stop generation
  provider?: string;        // Specific provider override
}
```

#### Embedding Integration

```typescript
interface EmbeddingService {
  // Vector operations
  generate(text: string): Promise<number[]>;
  similarity(vector1: number[], vector2: number[]): number;
  findNearest(query: number[], candidates: number[][], k: number): VectorSearchResult[];

  // Semantic operations
  analogicalMatch(source: string, target: string): AnalogyResult;
  clusterConcepts(concepts: string[], threshold: number): ConceptCluster[];
  semanticInterpolation(concept1: string, concept2: string, weight: number): string;
}
```

### Component Interface Specification

#### Base Component Protocol

```typescript
interface Component {
  // Lifecycle management
  initialize(config: ComponentConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Health and monitoring
  getHealth(): ComponentHealth;
  getMetrics(): ComponentMetrics;
  getStatus(): ComponentStatus;

  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: any): void;
}

interface ComponentConfig {
  name: string;
  version: string;
  dependencies: string[];
  config: { [key: string]: any };
}
```

### Core Data Structures

#### Term Structure (Language-Agnostic)

```typescript
interface Term {
  // Core properties
  readonly name: string;
  readonly type: TermType;
  readonly complexity: number;

  // Structural components for compound terms
  readonly subject?: Term;
  readonly predicate?: Term;
  readonly components?: Term[];

  // Semantic grounding
  readonly embedding?: number[];

  // Metadata
  readonly createdAt: number;
  readonly hash: string;
}
```

#### Task Structure (Language-Agnostic)

```typescript
interface TruthValue {
  frequency: number;    // 0.0 to 1.0, evidential support
  confidence: number;   // 0.0 to 1.0, certainty measure
}

interface Task {
  // Core components
  readonly term: Term;
  readonly punctuation: Punctuation;
  readonly truth: TruthValue;

  // Dynamic state
  priority: number;     // 0.0 to 1.0, current importance
  accessedAt: number;   // Last access timestamp
  createdAt: number;    // Creation timestamp

  // Temporal properties
  occurrenceTime?: number;  // When the event occurred
  expirationTime?: number;  // When task becomes obsolete

  // Cognitive state
  isInFocusSet: boolean;
  derivationPath?: string[];  // Reasoning trace
}
```

#### Memory Structure (Language-Agnostic)

```typescript
interface MemoryIndex {
  [key: string]: Set<string>;  // Efficient lookups
}

interface Memory {
  // Dual storage architecture
  shortTermTasks: Map<string, Task>;
  longTermTasks: Map<string, Task>;

  // Indexing for efficient retrieval
  implicationIndex: MemoryIndex;
  inheritanceIndex: MemoryIndex;
  temporalIndex: MemoryIndex;
  similarityIndex: MemoryIndex;

  // Statistics
  totalTasks: number;
  consolidationCount: number;
  lastConsolidation: number;
}
```

### System Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SeNARS Core                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Memory    │  │  Reasoning  │  │  Tools      │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Cycle    │  │     Self    │  │      LM     │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Plugins   │  │   Config    │  │   Messages  │              │
│  │  Component  │  │   System    │  │   System    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Core Foundation (`core/Core.js`)
- Proxy-based component access
- Lifecycle management (initialize/start/stop)
- Component registration and discovery
- Message system integration
- Rule system integration

#### 2. Configuration System (`core/Config.js`)
- Nested property access with caching
- Type validation and defaults
- Deep merge capabilities
- Performance optimization through caching
- Runtime configuration updates

#### 3. Unified Messages System (`core/Messages.js`)
- Event publishing and subscription
- Command handling and execution
- Middleware pipeline for preprocessing
- Event queue management
- Error handling and recovery

#### 4. Optimized Rules Engine (`core/Rules.js`)
- Rule indexing by type for fast lookup
- Condition-based winnowing before execution
- Priority-based strategy selection
- Self-optimizing performance
- Comprehensive rule statistics

#### 5. Component Base Class (`core/Component.js`)
- Standardized lifecycle methods
- Core integration helpers
- Event/command access methods
- Error handling patterns

### Specialized Components

#### Memory Component (`core/Memory.js`)
- Task and term storage with indexing
- Intelligent caching with TTL
- Focus set management for attention
- Memory utilization tracking
- Query optimization

#### Reasoning Component (`core/Reasoning.js`)
- Core reasoner integration
- Strategy pattern support
- Legacy compatibility layer
- Performance monitoring
- Rule statistics and analytics

#### Cycle Component (`core/Cycle.js`)
- Adaptive timing based on system load
- Performance tracking and analytics
- Memory pressure awareness
- Configurable focus set sizes
- Comprehensive cycle statistics

#### Language Model Component (`core/LM.js`)
- Multi-provider support (Ollama, Xenova)
- Hypothesis generation and evaluation
- Explanation generation
- Question-answering service
- Plan repair and enrichment
- Embedding generation and processing
- Pipeline management and optimization

#### Tools Component (`core/Tools.js`)
- Web automation (navigation, clicking, form filling)
- File operations (read, write, edit)
- Command execution with sandboxing
- Media processing (PDF, image analysis)
- API request handling
- Execution history and statistics
- Parameter validation and timeout handling

#### Plugins Component (`core/Plugins.js`)
- Runtime plugin registration
- Hot reloading support
- Plugin lifecycle management
- Metadata tracking
- Error isolation and recovery

#### Self Component (`core/Self.js`)
- Performance rule setup
- Memory pressure handling
- Priority task detection
- System statistics aggregation
- Adaptive parameter tuning

## Language-Agnostic Implementation Guidelines

### Core Implementation Principles
1. **Interface Segregation**: Each component implements only the interfaces it needs
2. **Dependency Injection**: Components receive dependencies through constructors or initialization
3. **Event-Driven Communication**: Components communicate primarily through typed events
4. **Immutable Core Data**: Term and Task structures are immutable once created
5. **Mutable State Management**: Priority and access times are managed through controlled mutation
6. **Error Boundary Pattern**: All component operations wrapped in error boundaries
7. **Resource Cleanup**: Proper cleanup of resources in component lifecycle
8. **Performance Monitoring**: Built-in metrics collection for all operations

### Memory Management Strategy

#### Short-Term vs Long-Term Storage
```typescript
interface MemoryStrategy {
  // Consolidation policies
  consolidationThreshold: number;    // Priority threshold for consolidation
  maxShortTermTasks: number;         // Maximum short-term capacity
  consolidationInterval: number;     // How often to run consolidation

  // Forgetting policies
  enableTimeBasedForgetting: boolean;
  enablePriorityBasedForgetting: boolean;
  forgettingInterval: number;

  // Indexing strategy
  indexUpdateBatchSize: number;
  enableIncrementalIndexing: boolean;
}
```

#### Indexing Implementation
```typescript
interface IndexingStrategy {
  // Index types to maintain
  maintainImplicationIndex: boolean;
  maintainInheritanceIndex: boolean;
  maintainTemporalIndex: boolean;
  maintainSimilarityIndex: boolean;

  // Index update policies
  updateOnTaskAddition: boolean;
  updateOnTaskModification: boolean;
  incrementalUpdateSize: number;
}
```

### Reasoning Engine Specification

#### Rule Engine Interface
```typescript
interface RuleEngine {
  // Rule management
  addRule(rule: InferenceRule): void;
  removeRule(ruleId: string): void;
  getRule(ruleId: string): InferenceRule | undefined;
  listRules(): InferenceRule[];

  // Rule execution
  executeRules(tasks: Task[], context: ReasoningContext): DerivedTask[];
  findApplicableRules(task: Task): InferenceRule[];

  // Performance optimization
  prefilterRules(task: Task, allRules: InferenceRule[]): InferenceRule[];
  prioritizeRules(rules: InferenceRule[]): InferenceRule[];
}

interface InferenceRule {
  id: string;
  name: string;
  description: string;

  // Rule structure
  premises: TermPattern[];
  conclusion: TermPattern;
  conditions?: RuleCondition[];

  // Metadata
  priority: number;
  complexity: number;
  categories: string[];

  // Execution
  apply(premises: Task[], context: ReasoningContext): Task[];
}
```

## Complete API Specification

### Core System API
```typescript
interface SeNARSCore {
  // System lifecycle
  initialize(config: SystemConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Component access
  readonly memory: MemoryComponent;
  readonly reasoner: ReasoningComponent;
  readonly cycle: CycleComponent;
  readonly lm: LMComponent;
  readonly tools: ToolsComponent;
  readonly plugins: PluginComponent;
  readonly self: SelfComponent;

  // Task management
  addTask(task: Task): Promise<void>;
  addTasks(tasks: Task[]): Promise<void>;
  getTask(taskId: string): Promise<Task | undefined>;
  queryTasks(query: TaskQuery): Promise<Task[]>;

  // System introspection
  getStatus(): SystemStatus;
  getMetrics(): SystemMetrics;
  getHealth(): SystemHealth;

  // Event system
  on(event: SystemEvent, handler: EventHandler): void;
  off(event: SystemEvent, handler: EventHandler): void;
  emit(event: SystemEvent, data: any): void;
}
```

### Memory Component API
```typescript
interface MemoryComponent {
  // Task storage
  storeTask(task: Task): Promise<void>;
  retrieveTask(taskId: string): Promise<Task | undefined>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  deleteTask(taskId: string): Promise<void>;

  // Query interface
  queryTasks(query: TaskQuery): Promise<Task[]>;
  findSimilarTasks(embedding: number[], threshold: number): Promise<Task[]>;

  // Memory management
  consolidateKnowledge(): Promise<ConsolidationResult>;
  forgetOldTasks(): Promise<ForgettingResult>;
  getMemoryStats(): MemoryStatistics;

  // Indexing
  rebuildIndexes(): Promise<void>;
  getIndexStats(): IndexStatistics;
}
```

### Reasoning Component API
```typescript
interface ReasoningComponent {
  // Strategy management
  addStrategy(strategy: ReasoningStrategy): void;
  removeStrategy(strategyId: string): void;
  listStrategies(): ReasoningStrategy[];

  // Reasoning execution
  reason(tasks: Task[]): Promise<DerivedTask[]>;
  reasonStep(task: Task): Promise<DerivedTask[]>;

  // Rule management
  addRule(rule: InferenceRule): void;
  removeRule(ruleId: string): void;
  getRule(ruleId: string): InferenceRule | undefined;

  // Performance
  getReasoningStats(): ReasoningStatistics;
}
```

## Configuration Management Specification

### Hierarchical Configuration Schema
```typescript
interface SystemConfig {
  // Core system settings
  core: {
    cycleIntervalMs: number;           // Cognitive cycle timing
    focusSetSize: number;             // Tasks per cycle
    maxConcurrentCycles: number;      // Parallel processing limit
    enableSelfOptimization: boolean;  // Meta-cognitive features
  };

  // Memory configuration
  memory: {
    maxShortTermTasks: number;        // Short-term capacity
    consolidationThreshold: number;   // Priority for long-term move
    enableAutoConsolidation: boolean; // Automatic knowledge consolidation
    forgettingStrategy: 'time' | 'priority' | 'hybrid';
    indexUpdateBatchSize: number;     // Batch size for index updates
  };

  // Reasoning configuration
  reasoning: {
    maxRuleApplications: number;      // Limit rule executions per cycle
    strategySelection: 'priority' | 'diversity' | 'adaptive';
    enableParallelReasoning: boolean; // Parallel rule execution
    maxDerivationDepth: number;       // Prevent infinite loops
  };

  // Language model configuration
  lm: {
    provider: 'ollama' | 'xenova' | 'openai' | 'anthropic';
    modelName?: string;               // Specific model selection
    maxTokens: number;                // Response length limit
    temperature: number;              // Creativity vs consistency
    enableFallback: boolean;          // Provider fallback on errors
    embeddingDimensions: number;      // Vector size for embeddings
  };

  // Tool system configuration
  tools: {
    enableSandboxing: boolean;        // Security isolation
    maxExecutionTime: number;         // Timeout per tool
    maxConcurrentTools: number;       // Parallel execution limit
    allowedCommands: string[];        // Whitelist of system commands
  };

  // Plugin system configuration
  plugins: {
    pluginDirectories: string[];      // Search paths for plugins
    enableHotReloading: boolean;      // Runtime plugin updates
    maxPluginMemory: number;          // Memory limit per plugin
    enablePluginIsolation: boolean;   // Process isolation
  };
}
```

### Runtime Configuration Updates
```typescript
interface ConfigUpdate {
  path: string;           // Dot-notation path to config value
  value: any;             // New value
  validate?: boolean;     // Run validation before update
  restart?: boolean;      // Restart affected components
}

interface ConfigurationManager {
  // Configuration access
  get(path: string): any;
  set(path: string, value: any): Promise<void>;
  update(updates: ConfigUpdate[]): Promise<void>;

  // Configuration management
  loadFromFile(filePath: string): Promise<void>;
  saveToFile(filePath: string): Promise<void>;
  validateConfig(config: SystemConfig): ValidationResult;

  // Hot reloading
  enableHotReloading(): void;
  disableHotReloading(): void;
  getConfigHash(): string;
}
```

## Error Handling and Resilience Specification

### Error Classification Hierarchy
```typescript
enum ErrorSeverity {
  LOW = 'low',           // Non-critical, can continue
  MEDIUM = 'medium',     // Degraded functionality
  HIGH = 'high',         // System instability
  CRITICAL = 'critical'  // System failure
}

enum ErrorCategory {
  CONFIGURATION = 'configuration',
  MEMORY = 'memory',
  REASONING = 'reasoning',
  LM_SERVICE = 'lm_service',
  TOOL_EXECUTION = 'tool_execution',
  PLUGIN = 'plugin',
  SYSTEM = 'system'
}

interface SeNARSError extends Error {
  severity: ErrorSeverity;
  category: ErrorCategory;
  component: string;
  timestamp: number;
  context: { [key: string]: any };
  recovery?: ErrorRecovery;
}

interface ErrorRecovery {
  strategy: 'retry' | 'fallback' | 'degrade' | 'restart';
  parameters?: { [key: string]: any };
  maxAttempts?: number;
  backoffMs?: number;
}
```

### Component Health Monitoring
```typescript
interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'failed';
  lastCheck: number;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
  };
  issues: HealthIssue[];
}

interface HealthIssue {
  type: string;
  severity: ErrorSeverity;
  description: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
}
```

## Technical Capabilities

### Language Model Integration
- **Multi-Provider Support**: Ollama, Xenova transformers
- **Intelligent Fallbacks**: Automatic provider switching on failures
- **Pipeline Management**: Feature extraction, text generation, Q&A
- **Embedding Generation**: Vector creation for semantic similarity
- **Hypothesis Generation**: Creative reasoning support
- **Explanation Generation**: Human-readable rationale creation

### Tool Execution Framework
- **Web Automation**: Browser control, form filling, content extraction
- **File Operations**: Intelligent reading, writing, and editing
- **Command Execution**: Sandboxed system command execution
- **Media Processing**: PDF processing, image analysis with OCR
- **API Integration**: HTTP request handling with validation
- **Safety Features**: Timeout handling, parameter validation, sandboxing

### Memory and Reasoning
- **Advanced Memory Management**: Multi-level caching, focus sets, query optimization
- **Rule-Based Reasoning**: Winnowing algorithms, strategy selection, performance optimization
- **Adaptive Cycling**: Dynamic timing based on system load and memory pressure
- **Self-Optimization**: Automatic parameter tuning, performance monitoring