# SeNARS v11: The Agentic Cognitive Architecture Roadmap

## 1. Introduction: Architectural Elegance & Functional Enhancement

This document refines the development plan for SeNARS, leveraging the existing sophisticated implementation while focusing on strategic enhancements for additional functionality, design elegance, architectural coherence, and system integrity. The current codebase demonstrates substantial progress with a component-based architecture, hybrid NAL-LM reasoning, advanced memory management, and extensible tool integration. This plan redirects focus toward refinement and advanced capabilities rather than foundational implementation.

## 2. Current Architecture Assessment & Enhancement Priorities

The existing system features:

- **Component-based Architecture**: Integrated EventBus, term factory with caching, dual memory systems
- **Reasoning Engine**: Hybrid NAL-LM reasoning with performance optimization and rule management
- **Memory & Focus**: Sophisticated dual memory with indexing, consolidation, and attention mechanisms
- **Tool Integration**: Execution framework with explanation services and safety features
- **Interfaces**: REPL, server, and monitoring capabilities

### 2.1 Architectural Coherence Priorities

- **Consolidation**: Eliminate redundant patterns and unify similar implementations
- **Elegance**: Reduce complexity through more efficient abstractions and algorithms
- **Performance**: Optimize critical reasoning and memory paths for scale and efficiency
- **Extensibility**: Enhance plugin architecture and API consistency for third-party integration

### 2.2 Integrity & Reliability Enhancements

- **Robustness**: Implement comprehensive validation and graceful error handling
- **Consistency**: Establish uniform interfaces and predictable behavior patterns
- **Testability**: Expand coverage with property-based and integration tests
- **Maintainability**: Improve documentation and architectural clarity

## 3. Strategic Enhancement Roadmap: The Leap to Agency

The initial phases of development have successfully laid down the foundational components of the SeNARS system. We have a working reasoning cycle, a sophisticated memory model, and initial implementations of advanced features. However, this rapid progress has introduced significant technical debt, particularly in the form of conceptual overlap and duplicated logic across the various evaluation engines.

This revised roadmap outlines the strategic leap from a passive **reasoner** to a proactive, goal-oriented **agent**. Our vision is to create a system that can continuously operate, manage a dynamic set of goals, and learn from its experience, all while being transparent and controllable by a human user. This plan is heavily inspired by the clean, modular architecture of mature NARS implementations and it prioritizes architectural elegance, modularity, and theoretical completeness as the foundation for emergent intelligence.

We are not just adding features; we are sculpting an architecture capable of genuine autonomy.

---

### Phase 5: The Unified Evaluation Core & Agentic Loop
*Goal: Refactor the reasoning core into a single, hardened engine and establish the foundational "sense-reason-act" loop of an agentic system. This phase prioritizes architectural purity and the creation of a dynamic, user-controllable goal management system.*

**Architectural Vision:**
The `Agent` is the top-level entity that orchestrates the system's lifecycle. It is the "executive function" that manages high-level goals and interacts with the external world. The `Agent` contains and delegates to a `NAR` instance, which serves as the "cognitive core." This clean separation of concerns allows the `NAR` to focus solely on reasoning, while the `Agent` handles the complexities of continuous, open-ended operation.

**Key Initiatives:**

*   **5.1: Forge the Unified `EvaluationEngine`:**
    *   **Action:** Consolidate all logic from `OperationEvaluationEngine`, `UnifiedOperatorEvaluator`, and `BooleanReductionEngine` into a single, renamed `EvaluationEngine.js`. This engine will be the heart of the system, responsible for all term simplification, evaluation, and back-solving.
    *   **Outcome:** A dramatic reduction in technical debt and a single, authoritative source for all computational and logical truth.

*   **5.2: Implement the `Agent` and the `Global Task Buffer`:**
    *   **Action:** Create a new top-level `Agent.js` class that orchestrates the system's lifecycle. The `Agent` will manage a `GlobalTaskBuffer`—a real-time, editable, and prioritizable list of top-level Tasks (beliefs, goals, questions).
    *   **Action:** Develop a simple, WebSocket-powered UI that visualizes the `GlobalTaskBuffer` as a "TODO list." Users will be able to add, remove, and reprioritize tasks in this list in real time, directly steering the agent's focus.
    *   **Outcome:** The system is no longer a fire-and-forget reasoner. It is a continuously operating agent with a transparent "reactive surface" that anchors its cognitive and behavioral scaffolding.

*   **5.3: Integrate the `EvaluationEngine` into the Agentic Loop:**
    *   **Action:** The `Agent`'s core loop will be to select high-priority tasks from the `GlobalTaskBuffer` and pass them to the `NAR`'s reasoning cycle. All derived sub-tasks and beliefs generated by the `NAR` will be passed through the `EvaluationEngine` before being added to memory.
    *   **Outcome:** A clean separation of concerns: the `Agent` manages high-level goals, the `NAR` performs inference, and the `EvaluationEngine` ensures all knowledge is maximally simplified and evaluated.

*   **5.4: Achieve Prolog Parity (Declarative Logic):**
    *   **Action:** Enhance the `EvaluationEngine`'s back-solving and unification capabilities to the point where any standard Prolog program can be translated into an equivalent set of SeNARS beliefs and queried.
    *   **Action:** Create a test suite with classic Prolog examples (e.g., family trees, logic puzzles) to validate this functional parity.
    *   **Outcome:** The system is demonstrably powerful for declarative, logic-based problem solving.

### Acceptance Criteria for Phase 5:
- [ ] The codebase contains a single, unified `EvaluationEngine.js`.
- [ ] A top-level `Agent` class manages the main processing loop and delegates to a `NAR` instance.
- [ ] A functional UI allows real-time viewing and manipulation of the `GlobalTaskBuffer`.
- [ ] The system can successfully execute a suite of Prolog translation tests.

---

### Phase 6: A Composable, Configurable Architecture
*Goal: Re-architect the system to be highly modular and configurable at construction time. This enables tailored deployments for specific use cases and enforces a clean, loosely-coupled design.*

**Rationale:** A one-size-fits-all architecture is inefficient and inflexible. By leveraging dependency injection and eventing, we can allow developers to compose the exact system they need, from a lightweight core reasoner to a full-fledged, self-aware agent.

**Key Initiatives:**

*   **6.1: Implement an `AgentBuilder` with Dependency Injection:**
    *   **Action:** Create an `AgentBuilder` utility that takes a configuration object and constructs the `Agent` instance with only the specified subsystems.
    *   **Example Config:**
        ```json
        {
          "subsystems": {
            "metrics": true,
            "embeddingLayer": { "model": "text-embedding-ada-002" },
            "functors": ["core-arithmetic", "set-operations"],
            "rules": ["syllogistic-core", "temporal"]
          }
        }
        ```
    *   **Outcome:** A clean, declarative way to assemble agent instances.

*   **6.2: Modularize Subsystems:**
    *   **Action:** Refactor key components so they can be optionally included. Each module will register itself with the core `Agent` or `NAR` via an event bus or injected dependencies.
    *   **Modules to Isolate:**
        *   **`MetricsMonitor`**: The entire metrics and self-optimization subsystem.
        *   **`EmbeddingLayer`**: The semantic reasoning and LM-interaction module.
        *   **`Functor` Collections**: Registerable libraries of functions (e.g., arithmetic, list processing, term manipulation).
        *   **`Rule` Sets**: Collections of NAL rules that can be enabled or disabled (e.g., core syllogistic, temporal, higher-order).
        *   **`Tool` Engine**: The entire subsystem for interacting with the external world.
    *   **Outcome:** A highly flexible architecture that improves testability, allows for lightweight deployments, and encourages community contributions of new modules.

### Acceptance Criteria for Phase 6:
- [ ] An `AgentBuilder` can construct an agent from a configuration object.
- [ ] The system can be successfully built and run with key subsystems (metrics, embeddings, tools, rule sets) disabled.
- [ ] Functor libraries and Rule sets are modular and can be selectively registered.

---

### Phase 7: Achieving NARS & MeTTa Theoretical Parity
*Goal: Ensure the system is a complete and powerful implementation of Non-Axiomatic Reasoning, capable of handling the full spectrum of reasoning patterns described in NARS theory and demonstrated in systems like OpenCog Hyperon MeTTa.*

**Rationale:** To transcend the limitations of current LLM agents, the system must be grounded in a principled, well-understood reasoning framework. Achieving parity with other leading-edge systems demonstrates our commitment to this theoretical rigor.

**Key Initiatives:**

*   **7.1: Implement the Full Spectrum of NAL Rules:**
    *   **Action:** Review the NAL rulebook and the OpenNARS/ONA implementations. Implement any missing syllogistic, conditional, and temporal reasoning rules as modular, configurable sets.
    *   **Focus:** Pay special attention to higher-order concepts like reasoning about implication chains (`(A ==> B) ==> C`).

*   **7.2: AIKR-Compliant Caching and Control:**
    *   **Action:** Implement capacity-limited, priority-based (bag) caches for all major knowledge stores (terms, beliefs, rule results) to strictly adhere to the Assumption of Insufficient Knowledge and Resources (AIKR).
    *   **Action:** Refine the `FocusSetSelector` and task prioritization mechanisms to be more dynamic and context-sensitive, inspired by the control strategies in mature NARS implementations.

*   **7.3: MeTTa-Style Higher-Order Reasoning:**
    *   **Action:** Enhance the `EvaluationEngine` to treat logical statements themselves as terms that can be manipulated.
    *   **Example:** The system should be able to process a statement like `(Similar, (Human ==> Mortal), (Socrates ==> Mortal))` as a valid input for higher-order pattern matching and reasoning.
    *   **Outcome:** The system can reason *about* patterns of knowledge, not just base facts, enabling a powerful new level of abstraction.

### Acceptance Criteria for Phase 7:
- [ ] The system includes a comprehensive suite of modular NAL rules, including temporal and higher-order forms.
- [ ] All major caches and buffers are strictly capacity-limited and prioritized.
- [ ] The system can successfully execute a test suite of MeTTa examples involving higher-order pattern matching.

---

### Phase 8: The Transparent Mind (UX/DX)
*Goal: Make the system transparent, debuggable, and a pleasure to interact with. Focus on building high-quality interfaces for both developers and end-users.*

**Rationale:** The most powerful system is useless if it's an opaque black box. To foster adoption, research, and development, we must invest in making the system's complex internal workings observable and understandable.

**Key Initiatives:**

*   **8.1: Develop a Comprehensive WebSocket API:**
    *   **Action:** Implement a real-time API for monitoring and interacting with the system.
    *   **Details:** Provide endpoints for subscribing to events (e.g., new beliefs, goals achieved), inspecting memory, manipulating the `GlobalTaskBuffer`, and tracing the evaluation of a specific term.

*   **8.2: Create an Interactive Visualization Suite:**
    *   **Action:** Build a web-based UI that provides a real-time view into the agent's mind.
    *   **Details:**
        *   Visualize the concept graph and memory structure.
        *   Provide an interactive "evaluation tracer" that shows, step-by-step, how a complex term is reduced.
        *   Display real-time performance metrics from the `MetricsMonitor`.
        *   Integrate the `GlobalTaskBuffer` UI from Phase 5 into this comprehensive suite.

*   **8.3: Author World-Class Documentation:**
    *   **Action:** Write comprehensive documentation covering the architecture, APIs, and core concepts.
    *   **Details:** Include tutorials for common use cases, a guide for developing new `Functor`s and `Tool`s, and detailed explanations of the agentic framework.

### Acceptance Criteria for Phase 8:
- [ ] A documented WebSocket API is available for real-time monitoring and control.
- [ ] A web-based visualization tool exists for inspecting memory and tracing evaluations.
- [ ] The project has a public documentation site with tutorials and API references.

---

### Phase 9: Production & Emergent Autonomy
*Goal: Prepare the system for real-world deployment and begin cultivating the conditions for emergent, autonomous intelligence.*

**Rationale:** This final phase is about hardening the system for production use and, more importantly, enabling the self-directed, goal-oriented behavior that is the hallmark of true intelligence.

**Key Initiatives:**

*   **9.1: Production Readiness:**
    *   **Action:** Containerize the application and develop deployment scripts (e.g., Docker, Kubernetes).
    *   **Action:** Implement robust logging, monitoring, and alerting.
    *   **Action:** Conduct a thorough security audit and implement necessary safeguards for `Tool` execution and API endpoints.

*   **9.2: Cultivating Autonomous Behavior:**
    *   **Action:** Introduce a high-level "meta-goal" system, allowing the agent to pursue abstract objectives (e.g., "increase knowledge," "maintain logical consistency").
    *   **Action:** Integrate the `MetricsMonitor` with the goal system, allowing the agent to reason about its own performance and form goals to improve itself (e.g., "the `deduction` rule has a low success rate, I should investigate why").
    *   **Action:** Implement a "curiosity" mechanism where the system generates its own questions to explore gaps in its knowledge, driven by the `EmbeddingLayer` and associative memory.

### Acceptance Criteria for Phase 9:
- [ ] The system can be deployed and monitored in a production-like environment.
- [ ] The system can be given an abstract goal and generate sub-tasks to pursue it.
- [ ] The system can demonstrate "curiosity" by autonomously generating and attempting to answer novel questions.
