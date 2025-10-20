# SeNARS Re-implementation Design Document

## 1. Introduction & Goals

This document outlines the design for a complete re-implementation of the SeNARS codebase. The primary goal is to
create a more robust, maintainable, and extensible system by addressing known architectural issues and improving the
core components. The re-implementation will enable all previously implemented and planned functionality, ensuring its
presence in a usable form.

**Key Objectives:**

- **Simplicity:** Reduce complexity and eliminate over-engineering.
- **Robustness:** Create stable, predictable, and error-resistant core components.
- **Consistency:** Establish clear conventions for API design, data structures, and code style.
- **Testability:** Ensure all parts of the system are comprehensively testable with unit and integration tests.
- **Extensibility:** Design for easy addition of new features, reasoning capabilities, and rule sets.
- **Performance:** Optimize critical paths, especially for `Term` and `Memory` operations.

## 2. System Architecture

### 2.1. Core Components Overview

The system consists of several interconnected components:

- **NAR (NARS Reasoner Engine)**: The main entry point and orchestrator
- **Memory**: Manages concepts, tasks, and knowledge representation
- **Focus Manager**: Handles attention focus sets (short-term memory)
- **Term**: Core data structure for representing knowledge elements
- **Task**: Represents units of work or information processed by the system
- **Reasoning Engine**: Applies NAL and LM rules to generate inferences
- **Parser**: Handles Narsese syntax parsing and generation
- **LM (Language Model Integration)**: Provides language model capabilities

### 2.2. Proposed Directory Structure

```
/
├── src/
│   ├── core/                   # Core reasoning logic and data structures
│   │   ├── nar/                # NAR system entry point and control
│   │   │   ├── NAR.js          # Main API for system control, input, and output
│   │   │   ├── Cycle.js        # Manages the reasoning cycle execution
│   │   │   └── SystemConfig.js # Configuration for NAR instance
│   │   ├── memory/             # Memory management and knowledge representation
│   │   │   ├── Memory.js       # Central memory component, stores Concepts
│   │   │   ├── Concept.js      # Represents a concept in memory, holds related Tasks
│   │   │   └── Bag.js          # Priority-based collection for Tasks within Concepts
│   │   ├── term/               # Robust Term handling
│   │   │   ├── Term.js         # Immutable Term class
│   │   │   ├── TermFactory.js  # Factory for creating and normalizing Terms
│   │   │   └── operations/     # Subterm access, visitors, reducers, equality, hashing
│   │   ├── task/               # Task representation and management
│   │   │   ├── Task.js         # Immutable Task class
│   │   │   └── TaskManager.js  # Manages task lifecycle, priority, and selection
│   │   ├── reasoning/          # Rule application and inference
│   │   │   ├── RuleEngine.js   # Orchestrates NAL and LM rule application
│   │   │   ├── RuleSet.js      # Manages collections of rules
│   │   │   ├── nal/            # NAL-specific rules and structures
│   │   │   │   ├── NALRule.js
│   │   │   │   └── ...
│   │   │   └── lm/             # LM-specific rules and integration
│   │   │       ├── LMRule.js
│   │   │       └── ...
│   │   └── io/                 # Input/Output adapters and management
│   │       └── IOAdapterManager.js # Manages various input/output formats
├── tests/
│   ├── unit/                   # Focused tests for individual classes/functions
│   │   ├── term/Term.test.js
│   │   ├── task/Task.test.js
│   │   └── ...
│   ├── integration/            # Tests for component interactions and overall system behavior
│   │   └── NAR.integration.test.js
│   └── support/                # Test utilities and fluent API
│       └── fluentReasonerAPI.js # Fluent API for writing expressive reasoner tests
├── examples/                   # Demonstrations of system usage
│   ├── basic-usage.js
│   └── ...
├── package.json
└── README.md
```

## 3. Core Data Structures

### 3.1. `Term` Class

The `Term` class will be the cornerstone of the system, designed for strict immutability and robust operations.

**Key Features:**

- **Strict Immutability:** Once created, a `Term` instance cannot be modified. All internal data structures will be
  frozen or deeply immutable. This simplifies reasoning about state and enables efficient caching.
- **Equality, Comparators, and Hashcode:**
    - `equals(otherTerm)`: Deep equality comparison, considering structure and content.
    - `hashCode()`: A consistent hash code generation for efficient use in `Map`s and `Set`s. This will be
      pre-calculated upon creation and stored.
    - `compareTo(otherTerm)`: For ordered collections (if needed).
- **Factory Construction (`TermFactory`):**
    - All `Term` instances will be created via `TermFactory.create(termExpression)`.
    - The factory will handle parsing of Narsese-like string expressions into concrete `Term` objects.
    - **Reduction and Normalization:** The factory will automatically perform canonical reductions for compound terms,
      such as:
        - Commutativity for operators like `&` (conjunction), `|` (disjunction): `(&, B, A)` will normalize to
          `(&, A, B)`.
        - Associativity for operators: `(&, A, (&, B, C))` will normalize to `(&, A, B, C)`.
        - Elimination of redundancies: `(&, A, A)` normalizes to `A`.
    - **Caching:** The factory will cache `Term` instances to ensure that identical terms (after normalization) always
      refer to the same object, optimizing memory and equality checks.
- **Properties:**
    - `id`: A unique identifier (e.g., hash code or canonical string representation).
    - `operator`: The main operator of the term (e.g., `&`, `-->`, `_`).
    - `arity`: Number of direct sub-terms.
    - `complexity`: A numerical measure of the term's structural complexity.
    - `isAtomic`, `isCompound`, `isVariable`, `isStatement`, etc.
- **Sub-term Accessors:**
    - `getComponent(index)`: Access a direct sub-term by its 0-based index.
    - `getComponents()`: Returns an immutable array of direct sub-terms.
    - `getAllSubTerms()`: Returns a flattened, unique list of all sub-terms (including nested ones).
- **Sub-term Visitors:**
    - `visit(visitorFunction)`: Traverses the term structure, applying a function to each sub-term (pre-order, in-order,
      post-order options).
- **Sub-term Reducers:**
    - `reduce(reducerFunction, initialValue)`: Applies a reducer function across the term structure to aggregate a
      result.

### 3.2. `Task` Class

The `Task` class represents a unit of work or information within the system, also designed for robustness and clarity.

**Key Features:**

- **Immutability:** `Task` instances will be immutable.
- **Properties:**
    - `term`: The `Term` instance associated with this task.
    - `truth`: An object representing the truth value (e.g., `{ frequency: 0.9, confidence: 0.8 }`).
    - `stamp`: An object containing metadata about the task's origin and evidence, including creation timestamp, source,
      and derivation history.
    - `priority`: A numerical value indicating the task's urgency or importance in memory.
    - `type`: An enum or string indicating the task's nature (e.g., `INHERITANCE`, `BELIEF`, `GOAL`, `QUESTION`).
    - `budget`: Resources allocated to the task for processing.
- **Methods:**
    - `derive(newTruth, newStamp)`: Creates a new `Task` instance based on the current one but with updated truth and
      stamp, ensuring immutability.

## 4. Core System Components

### 4.1. `NAR` (NARS Reasoner Engine)

The `NAR` class serves as the central orchestrator and public API for the entire reasoning system.

**API:**

- `constructor(config: SystemConfig)`:
    - Initializes the `Memory`, `Focus`, `RuleEngine`, `TaskManager`, and `Cycle` with the provided configuration.
    - `SystemConfig` will specify rule sets (NAL, LM), memory parameters, and other system-wide settings.
- `input(narseseString: string)`: Parses a Narsese string, creates a `Task`, and adds it to the `TaskManager` and
  `Memory`.
- `on(eventName: string, callback: Function)`: Registers event listeners for various system outputs and internal
  events (e.g., `'output'`, `'belief_updated'`, `'question_answered'`, `'cycle_start'`, `'cycle_end'`).
- `start()`: Initiates the continuous reasoning cycle.
- `stop()`: Halts the reasoning cycle.
- `step()`: Executes a single reasoning cycle, useful for debugging and controlled execution.
- `getBeliefs(queryTerm?: Term)`: Returns a collection of current beliefs from memory, optionally filtered by a query
  term.
- `query(questionTerm: Term)`: Submits a question to the system and returns a promise that resolves with the answer.
- `reset()`: Clears memory and resets the system to its initial state.

### 4.2. Memory and Focus Management

The `Memory` component manages both long-term memory and short-term attention focus sets through the `Focus` system:

- **Structure:** Uses a `Map<Term, Concept>` for efficient lookup of concepts by their associated terms.
- **Dual Memory Architecture:** Separates focus sets (short-term memory) from long-term memory:
    - **Focus Sets:** Priority-based attention focus sets for immediate processing
    - **Long-term Memory:** Storage for all other tasks and concepts
- **Index Management:** Specialized indexes for different term types (inheritance, implication, similarity, etc.)
- **Concept:** Each concept holds related tasks, ordered by priority, and stores metadata.
- **Operations:**
    - `addConcept(term: Term)`: Creates and adds a new concept.
    - `getConcept(term: Term)`: Retrieves a concept.
    - `addOrUpdateTask(task: Task)`: Adds a task to the relevant concept's storage.
    - `consolidate(currentTime)`: Moves tasks between focus and long-term memory based on priority.

### 4.3. `Focus` and `FocusSetSelector`

Manages attention focus sets (short-term memory):

- **Short-term Memory Management**: Implements attention focus sets that represent short-term memory
- **Focus Set Management**: Creating and managing multiple named focus sets with configurable sizes
- **Priority-Based Selection**: Selecting high-priority tasks from focus sets using configurable selection strategies
- **Attention Scoring**: Maintaining attention scores for focus sets to determine their relevance
- **Task Promotion**: Mechanism for promoting high-priority tasks from focus (short-term) to long-term memory

The `FocusSetSelector` implements advanced task selection:

- **Composite Scoring**: Combining priority, urgency (time since last access), and cognitive diversity
- **Adaptive Selection**: Configurable parameters for priority thresholds, urgency weighting, and diversity factors
- **Cognitive Diversity**: Consideration of term complexity to promote reasoning diversity

### 4.4. `Cycle` and Task Processing

The `Cycle` orchestrates the flow of reasoning within the `NAR` system:

1. **Task Selection:** Uses the `FocusSetSelector` to choose tasks from the focus set.
2. **Rule Application:** The selected tasks are passed to the `RuleEngine`.
3. **Inference & Derivation:** The `RuleEngine` applies relevant NAL and LM rules, generating new `Task`s (inferences,
   derivations, questions, goals).
4. **Memory Update:** New and updated `Task`s are integrated back into `Memory`.
5. **Output Generation:** Significant inferences or answers trigger output events.

### 4.5. `RuleEngine` and Rule Management

The `RuleEngine` manages and applies both NAL and LM rules with sophisticated management capabilities:

- **Rule Types:** Supports both NAL inference rules and LM integration rules
- **Rule Registration:** System for adding and categorizing different types of rules
- **Enable/Disable Control:** Fine-grained control over which rules are active
- **Group Management:** Ability to organize rules into groups and manage them collectively
- **Rule Validation:** Validation of rule structure and functionality
- **Performance Metrics:** Comprehensive tracking of rule execution performance
- **Hybrid Reasoning:** Orchestrates NAL-LM integration through coordinated rule application
- **Base Rule Interface:** Common interface defining `canApply()` and `apply()` methods

**Rule Classifications:**

- **NAL Rules:** Implement logical inference using NAL truth functions with pattern matching
- **LM Rules:** Interact with language models for enhanced reasoning, including prompt generation and response
  processing

### 4.6. Parser System

Handles Narsese syntax parsing and generation:

- **Statement Parsing**: Complete parsing of Narsese statements including term, punctuation, and optional truth value
- **Truth Value Extraction**: Recognition and parsing of truth value syntax `%f;c%` where f is frequency and c is
  confidence
- **Punctuation Recognition**: Support for belief (.), goal (!), and question (?) punctuation
- **Term Parsing**: Recursive parsing of complex term structures
- **Atomic Term Handling**: Recognition of simple atomic terms
- **Compound Term Parsing**: Support for all NAL operator types:
    - Inheritance: `(A --> B)`
    - Similarity: `(A <-> B)`
    - Implication: `(A ==> B)`
    - Equivalence: `(A <=> B)`
    - Conjunction: `(&, A, B, ...)`
    - Disjunction: `(|, A, B, ...)`
    - Negation: `(--, A)`
    - Extensional sets: `{A, B, C}`
    - Intensional sets: `[A, B, C]`
    - Operations: `(A ^ B)`
    - Sequential conjunction: `(&/, A, B)`
    - Instance: `(A {{-- B)`
    - Property: `(A --}} B)`
    - Products: `(A, B, C)`
- **Nested Structure Support**: Proper parsing of nested compound terms with appropriate grouping
- **List Parsing**: Handling of comma-separated lists with respect for nested parentheses

### 4.7. Language Model Integration (`LM`)

Provides comprehensive language model capabilities:

- **Provider Management**: Registry and selection of multiple LM providers
- **Workflow Engine**: Support for complex LM-based reasoning workflows
- **Metrics Tracking**: Monitoring of LM usage, token counts, and processing times
- **Narsese Translation**: Conversion between Narsese and natural language
- **Resource Management**: Handling of LM resources and capacity

## 5. Algorithms and Implementation

### 5.1. Term Normalization Algorithm

The normalization algorithm in `TermFactory` must handle commutativity, associativity, and redundancy elimination
efficiently:

1. **Parse Components:** If the term is compound, parse its components.
2. **Recursive Normalization:** Recursively normalize all sub-terms.
3. **Apply Operator Rules:**
    - For commutative operators (`&`, `|`, `+`, `*`): Sort components lexicographically by their string representation.
    - For associative operators (`&`, `|`): Flatten nested structures.
    - For redundancy: Remove duplicate components.
4. **Reconstruct Term:** Build the normalized term from the processed components.
5. **Cache Check:** Check the factory's cache for an existing equivalent term.
6. **Store/Return:** If found in cache, return the cached instance; otherwise, freeze the new term, store it in the
   cache, and return it.

### 5.2. Memory Management Algorithms

- **Consolidation:** Mechanism for moving tasks between short-term and long-term memory based on priority
- **Priority Decay:** Gradual reduction of task priority over time
- **Index Management:** Efficient indexes for different term types (inheritance, implication, similarity, etc.)

### 5.3. Truth Value Operations

Implement NAL-specific truth value calculations:

1. **Revision:** Combine two truth values with the same content but different evidence bases.
2. **Deduction:** Apply deduction rules with proper truth value propagation.
3. **Induction/Abduction:** Implement induction and abduction truth value calculations.
4. **Negation:** Properly calculate negated truth values.
5. **Expectation:** Calculate expectation values for decision making.

## 6. Addressing Known Issues

### 6.1. Term Handling (String Operations vs. Concrete Objects)

**Problem:** The current codebase often relies on string manipulations for `Term` operations, leading to fragility,
inefficiency, and difficulty in ensuring correctness (e.g., `(&, A, B)` vs. `(&, B, A)` being treated as different).

**Solution:** The re-implementation will strictly enforce the use of the `Term` class as a concrete, immutable object.
All `Term` manipulations will be performed through its defined methods or the `TermFactory`.

- **Parsing:** A dedicated `NarseseParser` (within `term/`) will convert Narsese string inputs into `Term` objects.
- **Canonical Representation:** `TermFactory` will ensure that all logically equivalent terms (e.g., due to
  commutativity or associativity) resolve to the same canonical `Term` object, eliminating string comparison issues.
- **Sub-term Operations:** `Term` will provide robust methods for accessing, visiting, and reducing sub-terms, ensuring
  operations are semantic rather than syntactic.

## 7. Testing Strategy

### 7.1. Unit Tests

- **Granularity:** Each class and significant function will have its own dedicated unit test file.
- **Focus:** Unit tests will verify the correctness of individual components in isolation.
- **`Term` Class:** Extensive unit tests for `Term`'s immutability, equality, hash code, factory construction (including
  all reduction and commutativity rules), properties, and sub-term access/visitor/reducer methods.
- **`Task` Class:** Unit tests for immutability, property access, and `derive` method.
- **`Bag` and `Memory`:** Tests for correct priority-based storage, retrieval, and updates.
- **`RuleEngine` and Rules:** Tests for individual rule application and correct inference generation.

### 7.2. Integration Tests

- **Focus:** Verify the correct interaction between multiple components and the overall system behavior.
- **`NAR` Integration:** Tests will primarily target the `NAR` class, simulating real-world input sequences and
  asserting expected outputs and changes in the belief base.
- **NAL-LM Hybrid:** Specific integration tests will ensure the seamless interplay between NAL and LM rules within the
  `RuleEngine`.

### 7.3. Fluent Reasoner Test API

A fluent, expressive API will be developed to simplify the writing and reading of integration tests for the `NAR`
system.

**Example Usage:**

```javascript
import { createReasoner } from '../support/fluentReasonerAPI';

describe('NAR System Deductions', () => {
  let nar;

  beforeEach(() => {
    nar = createReasoner();
  });

  test('should deduce a simple conclusion from two premises', async () => {
    nar.input('<A --> B>.');
    nar.input('<B --> C>.');

    await nar.cycles(5); // Run for a few cycles to allow inference

    nar.expectBelief('<A --> C>.').toHaveTruth({ frequency: 1.0, confidence: 0.9 });
  });

  test('should answer a question based on existing beliefs', async () => {
    nar.input('<dog --> animal>.');
    nar.input('<cat --> animal>.');

    await nar.cycles(10);

    const answer = await nar.query('<dog --> ?x>.');
    expect(answer).toBeInferred('<dog --> animal>.');
  });

  test('should handle contradictory evidence', async () => {
    nar.input('<sky --> blue>{1.0, 0.9}.');
    nar.input('<sky --> blue>{0.0, 0.9}.'); // Contradictory evidence

    await nar.cycles(5);

    nar.expectBelief('<sky --> blue>.').toHaveTruth({ frequency: 0.5, confidence: expect.any(Number) });
  });
});
```

This API will abstract away the complexities of direct memory inspection and cycle management, allowing tests to focus
on the logical behavior of the reasoner.

## 8. Supporting Components

### 8.1. `Truth` Value Representation

The `Truth` class will encapsulate the frequency and confidence values associated with beliefs and tasks.

**Key Features:**

- **Immutability:** `Truth` instances will be immutable.
- **Properties:**
    - `frequency`: A number between 0 and 1, representing the proportion of positive evidence.
    - `confidence`: A number between 0 and 1, representing the reliability of the frequency.
- **Operations:**
    - `combine(otherTruth)`: Static method to combine two truth values according to NAL truth functions.
    - `negate()`: Returns a new `Truth` instance representing the negation of the current truth value.
    - `equals(otherTruth)`: Deep equality comparison.

### 8.2. `Stamp` and Evidence Handling

The `Stamp` class will track the origin and derivation history of `Task`s and `Belief`s.

**Key Features:**

- **Immutability:** `Stamp` instances will be immutable.
- **Properties:**
    - `id`: A unique identifier for the stamp (e.g., a UUID or a hash of its components).
    - `occurrenceTime`: Timestamp of when the task was created or observed.
    - `source`: An identifier for the source of the task (e.g., `INPUT`, `INFERENCE`, `LM_GENERATED`).
    - `derivations`: An immutable array of `Stamp` IDs from which this task was derived, forming a directed acyclic
      graph (DAG) of evidence.
    - `evidentialBase`: A set of `Term` IDs that form the direct evidential base for this task.
- **Operations:**
    - `derive(parentStamps: Stamp[], newSource: string)`: Static method to create a new `Stamp` based on parent stamps
      and a new source. This will correctly merge derivation histories.

### 8.3. Configuration Management (`SystemConfig`)

A centralized and immutable configuration system for the `NAR` instance.

**Key Features:**

- **Immutability:** Configuration objects are immutable once created.
- **Properties:**
    - `nalRuleSets`: Array of NAL rule identifiers to load.
    - `lmRuleSets`: Array of LM rule identifiers to load.
    - `memoryCapacity`: Maximum number of concepts/tasks in memory.
    - `cycleSpeed`: Delay between reasoning cycles.
    - `truthFunctions`: Custom truth combination functions (if overriding defaults).
    - `debugMode`: Boolean for enabling verbose logging.
- **Validation:** Ensures that provided configuration values are valid.
- **Default Values:** Provides sensible default values for all configuration parameters.

### 8.4. Event System (`EventBus`)

A lightweight, internal event bus for decoupled communication between components.

**Key Features:**

- **Centralized Dispatch:** A single `EventBus` instance (or a module with event methods) accessible throughout the
  system.
- **`emit(eventName: string, data: any)`:** Dispatches an event with associated data.
- **`on(eventName: string, listener: Function)`:** Registers a listener for a specific event.
- **`off(eventName: string, listener: Function)`:** Removes a registered listener.
- **Event Types:** Standardized event names (e.g., `NAR.Output`, `Memory.BeliefUpdated`, `Task.Created`).

### 8.5. Utilities (`util/`)

A collection of general-purpose utility functions and helper classes.

- **`collections.js`:** Implementations of common data structures like `Bag`, `PriorityQueue`, `ImmutableMap`,
  `ImmutableSet`.
- **`constants.js`:** System-wide constants (e.g., Narsese operators, default truth values).
- **`validation.js`:** Helper functions for input validation and assertion.
- **`logger.js`:** A simple, configurable logging utility.

## 9. API Conventions and Code Quality

### 9.1. API Design Conventions

- **Clear Naming:** Use descriptive and unambiguous names for classes, methods, and variables.
- **Functional Purity:** Favor pure functions where possible, especially for `Term` operations.
- **Asynchronous Operations:** Use `async/await` for operations that involve I/O or significant computation.
- **Configuration Objects:** Pass configuration via single, well-defined objects rather than multiple positional
  arguments.
- **Event-Driven Output:** Use an event emitter pattern for system outputs and notifications.

### 9.2. Code Quality and Maintainability

- **Type Safety:** Implement robust type checking through comprehensive JSDoc annotations with type information and
  runtime type checking for critical operations.
- **Code Organization:** Clear separation of concerns between modules, consistent naming conventions, well-defined
  module interfaces, and proper encapsulation of internal state.

## 10. Error Handling and Robustness

### 10.1. Input Validation

1. **Narsese Parsing:** Comprehensive validation of Narsese syntax before term construction.
2. **Truth Value Validation:** Ensure truth values are within valid ranges [0,1].
3. **Task Validation:** Validate task structure and components before processing.

### 10.2. Graceful Degradation

1. **Rule Application Errors:** Continue processing if a rule encounters an error, logging the issue and proceeding.
2. **Memory Errors:** Implement fallback mechanisms for memory allocation failures.
3. **Parser Errors:** Provide detailed error messages for malformed input while continuing system operation.

## 11. Configuration and Extensibility

### 11.1. Plugin Architecture

1. **Rule Plugins:** Support dynamic loading of custom NAL and LM rules.
2. **Adapter Plugins:** Allow custom IO adapters and LM adapters.
3. **Event Hooks:** Provide hooks for custom processing during reasoning cycles.

### 11.2. Parameter Tuning

The `SystemConfig` should expose parameters for fine-tuning system behavior:

- Memory capacity and forgetting thresholds
- Truth value thresholds for task acceptance
- Rule application priority and frequency
- Cycle timing and processing limits
- Activation propagation parameters

## 12. Performance and Optimization

### 12.1. Data Structure Optimizations

- **Efficient Term Indexing:** Use hash-based indexes for O(1) lookup with multiple indexing strategies (prefix trees,
  inverted indexes)
- **Memory-Efficient Task Storage:** Structural sharing for tasks with similar terms, compression for metadata where
  possible
- **Caching Strategies:** Term caching in TermFactory, rule result caching, inference path caching, query result caching

### 12.2. Performance Monitoring and Profiling

- **Built-in Metrics Collection:** Track cycles, tasks, rules, and memory metrics
- **Debugging Tools:** Interactive term inspector, rule application tracer, memory visualization tools

## 13. Implementation Examples

### 13.1. Term Class Structure

```javascript
class Term {
    constructor(components, operator = null) {
        // Store components as immutable array
        this._components = Object.freeze([...components]);
        this._operator = operator;
        this._id = this.calculateId(); // Cache immutable ID
        this._hashCode = this.calculateHashCode(); // Cache hash code
        this._complexity = this.calculateComplexity(); // Cache complexity

        // Freeze the entire object to ensure strict immutability
        Object.freeze(this);
    }

    // Getters return immutable data
    get components() {
        return this._components;
    }

    get operator() {
        return this._operator;
    }

    get id() {
        return this._id;
    }

    // Immutable operations return new Term instances
    withAddedComponent(component) {
        return TermFactory.create([...this._components, component]);
    }

    // Structural comparison
    equals(otherTerm) {
        if (!(otherTerm instanceof Term)) return false;
        if (this._hashCode !== otherTerm._hashCode) return false;
        // Deep comparison logic here
    }

    hashCode() {
        return this._hashCode;
    }

    // Sub-term operations
    visit(visitorFn, order = 'pre-order') {
        visitorFn(this);
        this._components.forEach(comp => comp.visit(visitorFn, order));
    }

    reduce(reducerFn, initialValue) {
        let result = reducerFn(initialValue, this);
        for (const comp of this._components) {
            result = comp.reduce(reducerFn, result);
        }
        return result;
    }

    // Generate string representation
    toString() {
        if (this._operator) {
            return `(${this._operator}, ${this._components.map(c => c.toString()).join(', ')})`;
        } else {
            return this._components.join('');
        }
    }
}
```

### 13.2. NAR Main Class Structure

```javascript
class NAR {
    constructor(config = {}) {
        this.config = SystemConfig.from(config);
        this.memory = new Memory(this.config.memory);
        this.focus = new Focus();  // Initialize focus component
        this.focus.createFocusSet('default');
        this.focus.setFocus('default');
        this.ruleEngine = new RuleEngine(this.config.rules);
        this.taskManager = new TaskManager(this.memory, this.focus, this.config.taskManager);
        this.cycle = new Cycle({
            memory: this.memory,
            focus: this.focus,  // Include focus in cycle
            ruleEngine: this.ruleEngine,
            taskManager: this.taskManager,
            config: this.config.cycle
        });

        this.eventBus = new EventBus();
        this.isRunning = false;
    }

    async input(narseseString) {
        try {
            const parser = new NarseseParser();
            const taskData = parser.parse(narseseString);
            const task = new Task({
                term: TermFactory.create(taskData.term),
                truth: taskData.truth,
                type: taskData.type,
                priority: this.calculateInputPriority(taskData)
            });

            this.taskManager.addTask(task);
            this.memory.addTask(task, Date.now());  // Add to memory
            this.focus.addTaskToFocus(task, task.priority);  // Add to short-term memory

            this.eventBus.emit('task.input', {task, source: 'user'});
        } catch (error) {
            this.handleError('Input parsing failed', error, {input: narseseString});
        }
    }

    on(event, callback) {
        this.eventBus.on(event, callback);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.runCycle();
    }

    stop() {
        this.isRunning = false;
    }

    async step() {
        await this.cycle.execute();
        return this.getSystemState();
    }

    async runCycle() {
        if (!this.isRunning) return;

        await this.cycle.execute();

        // Schedule next cycle based on configuration
        setTimeout(() => this.runCycle(), this.config.cycle.delay);
    }

    async query(questionTerm) {
        return new Promise((resolve, reject) => {
            const questionTask = new Task({
                term: questionTerm,
                type: 'QUESTION',
                priority: this.config.query.priority
            });

            // Register callback for when question is answered
            const answerCallback = (result) => {
                if (result.questionId === questionTask.id) {
                    this.eventBus.off('question.answered', answerCallback);
                    resolve(result.answer);
                }
            };

            this.eventBus.on('question.answered', answerCallback);
            this.taskManager.addTask(questionTask);
        });
    }

    getBeliefs(queryTerm = null) {
        if (queryTerm) {
            const concept = this.memory.getConcept(queryTerm);
            return concept ? concept.getBeliefs() : [];
        }
        return this.memory.getAllBeliefs();
    }
}
```

## 14. Future Considerations

- **Distributed NARS:** Design for multiple `NAR` instances to communicate and share knowledge.
- **Sensory-Motor Interface:** Integration with external environments for perception and action.
- **Learning Mechanisms:** More advanced learning algorithms beyond basic NAL inference.

## 15. Hybrid NAL-LM Reasoning Integration

### 15.1. LM-Enhanced Term Generation

The system will use language models to suggest new terms or relationships when NAL alone cannot make progress:

1. **Gap Detection:** Identify reasoning gaps where NAL rules cannot derive new knowledge
2. **LM Query Generation:** Convert the reasoning context to natural language for LM input
3. **Response Processing:** Parse LM responses back to Narsese terms
4. **Validation:** Validate LM-generated terms against consistency constraints
5. **Integration:** Merge validated terms with existing knowledge base

### 15.2. Cross-Validation Between NAL and LM

Implement mechanisms to validate LM-generated inferences against NAL consistency:

- Use NAL to verify logical consistency of LM-proposed relationships
- Use statistical confidence from LM to weight NAL-derived truth values
- Detect and resolve contradictions between NAL and LM outputs

### 15.3. Dynamic Rule Selection

The system will adaptively select between NAL and LM reasoning based on:

- Task complexity and type
- Available evidence in memory
- Performance metrics of previous inferences
- Confidence thresholds for different reasoning paths

## 16. Additional Implementation Considerations

### 16.1. Bag Data Structure (Priority Queue)

The `Bag` will implement an efficient priority queue mechanism for task selection:

1. **Storage:** Use a balanced binary heap or similar structure to maintain priority ordering.
2. **Insertion:** Add tasks based on their priority value, maintaining heap property.
3. **Selection:** Implement probabilistic selection based on priority weights rather than strict priority to allow
   lower-priority tasks occasional processing.
4. **Removal:** Remove tasks based on priority and internal criteria, maintaining structure.
5. **Capacity Management:** Implement decay mechanisms to remove lowest-priority items when capacity is exceeded.

### 16.2. Rule Matching and Application Algorithm

The `RuleEngine` must efficiently identify and apply relevant rules:

1. **Indexing:** Maintain indexes of rules by applicable term types and structures.
2. **Pattern Matching:** Use structural pattern matching to quickly identify applicable rules for a given task.
3. **Context Building:** Gather relevant context from memory (related concepts, beliefs, etc.) for rule application.
4. **Application:** Execute applicable rules, collecting derived tasks.
5. **Output Filtering:** Filter outputs based on truth value thresholds and relevance criteria.

### 16.3. Concept Activation and Forgetting

1. **Activation Propagation:** When a task is processed, propagate activation to related concepts based on term
   similarity and relationship strength.
2. **Decay Mechanism:** Implement exponential decay of concept activation over time.
3. **Forgetting Policy:** Remove concepts with activation below a threshold or based on recency and importance metrics.
4. **Task Prioritization:** Use concept activation to influence task selection priority.

### 16.4. Testing Implementation Details

#### Property-Based Testing

In addition to unit and integration tests, implement property-based testing for complex algorithms:

- Term normalization properties (commutativity, associativity preservation)
- Truth value operation properties (consistency, range adherence)
- Memory management properties (capacity limits, activation dynamics)

#### Performance Regression Testing

- Benchmark key operations (term creation, rule application, memory access)
- Monitor performance metrics across development iterations
- Automated performance regression detection

## 17. Existing Codebase Functionality Mapping

Based on analysis of the existing codebase, the following components and functionality need to be represented in the
specification:

### 17.0. Additional System Components

#### Agent Components

The system includes agent functionality that should be specified:

- **Bootstrap Agent**: Initial agent for system initialization and setup
- **Agent Framework**: Infrastructure for agent-based reasoning and interaction

#### Server and Infrastructure

- **Server Components**: Web server and API infrastructure for remote access
- **Messaging System**: Components for inter-system communication
- **Analysis Modules**: Tools for system analysis and debugging
- **System Configuration**: Centralized system configuration management
- **Shared Utilities**: Common utilities used across the system

### 17.1. Core Components from Existing Codebase

#### Focus Component

The existing codebase includes a `Focus` class that manages attention focus sets (short-term memory). This component
should be represented in the specification as:

- **Short-term Memory Management**: The Focus class implements attention focus sets that represent short-term memory,
  distinct from long-term memory in the Memory component.
- **Focus Set Management**: Creating and managing multiple named focus sets with configurable sizes
- **Priority-Based Selection**: Selecting high-priority tasks from focus sets using configurable selection strategies
- **Attention Scoring**: Maintaining attention scores for focus sets to determine their relevance
- **Task Promotion**: Mechanism for promoting high-priority tasks from focus (short-term) to long-term memory

#### FocusSetSelector Component

The existing `FocusSetSelector` class implements advanced task selection with:

- **Composite Scoring**: Combining priority, urgency (time since last access), and cognitive diversity
- **Adaptive Selection**: Configurable parameters for priority thresholds, urgency weighting, and diversity factors
- **Cognitive Diversity**: Consideration of term complexity to promote reasoning diversity

#### Term Implementation

The existing `Term` class includes:

- **Term Types**: Support for various NAL operators (inheritance, similarity, implication, conjunction, disjunction,
  etc.)
- **Compound Term Handling**: Recursive construction of compound terms with proper normalization
- **Component Simplification**: Associative and commutative normalization of term components
- **Complexity Calculation**: Computation of structural complexity for cognitive diversity measures
- **Hash-based Identity**: Using SHA256-based hashing for term identity and comparison

#### Task Implementation

The existing `Task` class includes:

- **Punctuation System**: Support for belief (.), goal (!), and question (?) punctuation
- **Truth Value Operations**: Implementation of NAL truth value calculations (deduction, induction, abduction,
  detachment)
- **Stamp Management**: Evidence tracking with timestamp and derivation history
- **Priority Management**: Dynamic priority updates and access time tracking
- **Task Types**: Clear distinction between beliefs, goals, and questions

#### Memory Management

The existing `Memory` class implements:

- **Dual Memory Architecture**: Separation of short-term (focus) and long-term memory components
- **Index Management**: Specialized indexes for different term types (inheritance, implication, similarity, etc.)
- **Task Consolidation**: Mechanism for moving tasks between short-term and long-term memory
- **Priority Decay**: Gradual reduction of task priority over time
- **Task Promotion**: Moving high-priority tasks from focus to long-term memory

#### Language Model Integration

The existing `LM` class provides:

- **Provider Management**: Registry and selection of multiple LM providers
- **Workflow Engine**: Support for complex LM-based reasoning workflows
- **Metrics Tracking**: Monitoring of LM usage, token counts, and processing times
- **Narsese Translation**: Conversion between Narsese and natural language
- **Resource Management**: Handling of LM resources and capacity

#### Task Management

The existing `TaskManager` handles:

- **Input Processing**: String to task parsing with punctuation recognition
- **Task Type Creation**: Convenience methods for beliefs, goals, and questions
- **Query Operations**: Finding tasks by term, priority, time, or type
- **Task Lifecycle**: Creation, retrieval, and removal of tasks

#### Cycle Management

The existing `CycleManager` implements:

- **Reasoning Cycle Execution**: Coordinated execution of reasoning cycles
- **Tracing and Debugging**: Support for detailed tracing of reasoning steps
- **Rule-Specific Execution**: Running specific subsets of rules
- **Safe Execution**: Error handling and recovery during cycle execution
- **Continuous Operation**: Start/stop controls for continuous reasoning

### 17.2. Component Architecture from Existing Codebase

#### Base Component System

The existing architecture uses a Component base class that provides:

- **Initialization Framework**: Standardized initialization with configuration support
- **Metrics Collection**: Base metrics and statistics gathering
- **Logging Integration:** Consistent logging across all components
- **Storage Abstraction:** General-purpose storage, caching, and indexing

#### Configuration System

The existing codebase has:

- **DEFAULTS Constants:** Centralized default configuration values
- **Validation Framework:** Input and configuration validation utilities
- **Modular Configuration:** Separate configuration for different subsystems

### 17.3. Integration Points to Specify

#### NAR Main Interface

The `NAR` class provides the unified interface that must be specified:

- **Initialization Methods:** Both basic and LM-enabled initialization
- **Task Input Methods:** Various input methods (input, believe, want, ask)
- **Reasoning Control:** start, stop, runCycle, runCycles methods
- **Query Interfaces:** Methods to retrieve tasks by various criteria
- **Rule Management:** Enable/disable rules and rule types
- **Statistics Access:** System-wide metrics and statistics

#### Reasoning Integration

The system integrates NAL and LM reasoning through:

- **Reasoner Component:** Main reasoning engine that coordinates rule application
- **Rule Manager:** Management of NAL and LM-enabled rules
- **Cycle Context:** Context passing for coordinated reasoning steps
- **Derived Task Processing:** Integration of LM-generated tasks into NAL reasoning

### 17.4. Required Enhancements in Reimplementation

Based on the existing codebase analysis, the reimplementation should enhance:

1. **Term Immutability**: The existing Term class has some mutability; the new version should enforce strict
   immutability
2. **Efficient Indexing**: Improve the indexing system for better performance with large knowledge bases
3. **Memory Consolidation**: Enhance the consolidation mechanism with better prioritization algorithms
4. **LM Integration**: Better integration points between LM and NAL reasoning
5. **Focus Management**: More sophisticated focus set management and attention mechanisms
6. **Task Normalization**: Better normalization of task truth values and priorities
7. **Error Handling**: More robust error handling throughout the system
8. **Performance Monitoring**: Enhanced performance metrics and monitoring capabilities

### 17.5. Rule System Architecture

The existing codebase includes a sophisticated rule system that must be specified:

#### Base Rule Class

- **Rule Identity**: Each rule has a unique ID, name, and description
- **Rule Metadata**: Priority, type, and parameters for configuration
- **Metric Tracking**: Execution counts, success/failure rates, average execution time
- **Abstract Interface**: Base class defines `canApply()` and `apply()` methods

#### NAL Rules

- **Inference Functions**: Rules that perform logical inference using NAL truth functions
- **Truth Value Operations**: Implementation of NAL truth value calculations
- **Pattern Matching**: Rules that match specific term patterns and generate inferences

#### LM Rules

- **Language Model Integration**: Rules that interact with external language models
- **Prompt Generation**: Ability to generate prompts for language model queries
- **Response Processing**: Mechanisms to process language model responses and convert them to tasks
- **Configurable Parameters**: Support for different language model options (temperature, tokens, etc.)

#### Rule Management

- **Rule Registration**: System for adding and categorizing different types of rules
- **Enable/Disable Control**: Fine-grained control over which rules are active
- **Group Management**: Ability to organize rules into groups and manage them collectively
- **Rule Validation**: Validation of rule structure and functionality
- **Performance Metrics**: Comprehensive tracking of rule execution performance
- **Dynamic Reasoning**: The `reason()` method that applies enabled rules to focus sets

## 18. Security and Internationalization

### 18.1. Security Considerations

- Input validation to prevent injection attacks
- Resource limits to prevent denial-of-service
- Secure communication for distributed instances
- Validation of external rule sources

### 18.2. Internationalization and Localization

- Support for multiple Narsese syntax variants
- Configurable output formatting
- Localization of system messages and error reports

### 18.3. Deployment Considerations

- **API Design for External Integration**: REST/GraphQL APIs for easy integration with other systems, WebSocket support
  for real-time event streaming, plugin architecture for custom extensions
- **Containerization and Scalability**: Docker configuration for easy deployment, configuration for horizontal scaling,
  state management for distributed operation, load balancing strategies for multi-instance deployment
