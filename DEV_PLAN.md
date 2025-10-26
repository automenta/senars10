# SeNARS Complete Development Plan (Final, Reprioritized)

## Introduction

This document presents the complete, reprioritized development plan for SeNARS. It has been revised to prioritize the development and validation of a correct, reliable, and secure core reasoning system using ephemeral test cases *before* implementing end-user functionality such as persistence or visualization UIs.

Each phase includes a stated **"Agile Focus"** that defines the most critical deliverable for that stage. Initiatives within each phase are ordered by priority.

---
### Architectural Principle: Functional Core, Imperative Shell
*Throughout this roadmap, a key design principle is the separation of a **pure, functional core** from an **impure, imperative shell**. The reasoning engine, evaluation logic, and truth-value functions will be implemented as pure functions that are deterministic and easily testable. The "shell" consists of components that manage state, interact with the outside world (I/O), and handle events. This separation is critical for testability, reliability, and clarity.*
---

### Phase 9: Observability & Foundational Engineering
*Goal: Establish a comprehensive, unified observability framework and a formal plugin architecture. This phase is a foundational prerequisite for all subsequent reliability, security, and feature development.*

**Agile Focus:** Establish the event-driven backbone and implement the minimum viable logging necessary to observe and debug the core reasoning loop.

**Key Initiatives (In Priority Order):**

*   **9.1: Enforce Event-Driven Communication & Define Ubiquitous Language:**
    *   **Action:** Mandate the use of the `EventBus` for all cross-component communication. Refactor the `NAR.js` cycle and `Agent.js` loop to publish events. Establish a formal dictionary of core events.
    *   **Implementation Details:**
        *   **Ubiquitous Language Examples**: `task.new`, `cycle.start`, `rule.evaluated`, `lm.request`, `lm.response`, `memory.belief.updated`, `cycle.end`.
    *   **Pattern:**
        ```javascript
        // FROM: this.memory.store(result);
        // TO:
        this.eventBus.publish('belief.derived', {
          belief: result,
          traceId: context.traceId
        });
        ```

*   **9.2: Implement Basic Structured Logging:**
    *   **Action:** Create a single `LoggingSubscriber` that listens to all events on the bus and outputs structured JSON logs (with `timestamp`, `level`, `component`, `traceId`) to the console.

*   **9.3: Establish a Unified Configuration Schema:**
    *   **Action:** Consolidate all configuration into a single, hierarchical JSON schema, managed and validated by the `AgentBuilder`.
    *   **Example Snippet (`config.json`):**
        ```json
        {
          "agent": {
            "observability": {
              "logging": {
                "level": "info"
              }
            },
            "plugins": [
              {
                "name": "my-plugin",
                "config": {
                  "apiKey": "${ENV_VAR}"
                }
              }
            ]
          }
        }
        ```

*   **9.4: Define and Implement the Formal Plugin API:**
    *   **Action:** Specify a formal `SeNARSPlugin` interface and integrate it into the `AgentBuilder`.
    *   **Pattern:**
        ```javascript
        interface SeNARSPlugin {
          readonly name: string;
          initialize(agent: Agent, config: PluginConfig): Promise<void>;
          shutdown(): Promise<void>;
        }
        ```

**Acceptance Criteria:**
- [ ] All core reasoning loop communication is mediated by the `EventBus`.
- [ ] A `LoggingSubscriber` outputs structured logs for all core events.
- [ ] All system configuration is managed through a single, validated JSON schema.
- [ ] A formal `SeNARSPlugin` interface is defined and integrated.

---

### Phase 10: Fault Tolerance & Reliability Architecture
*Goal: Architect and implement a robust fault tolerance system that ensures predictable behavior in the face of internal and external failures.*

**Agile Focus:** Eliminate the most immediate and critical stability risks: infinite loops and cascading failures from external API calls.

**Key Initiatives (In Priority Order):**

*   **10.1: Implement Bounded Evaluation:**
    *   **Action:** Modify the `Task` object to include a `budget`. The `Cycle.js` loop must decrement this budget and halt processing of a task if it is exhausted.
    *   **Pattern:**
        ```javascript
        const task = {
          term: '(A ==> B)',
          truth: { f: 0.9, c: 0.9 },
          budget: { cycles: 100, depth: 10 }
        };
        ```

*   **10.2: Implement Circuit Breakers for External Dependencies:**
    *   **Action:** Wrap all external calls (especially to LM providers) in a Circuit Breaker pattern to prevent cascading failures.

*   **10.3: Design and Implement Fallback Strategies:**
    *   **Action:** Develop intelligent fallback mechanisms, such as degrading to pure NAL reasoning when an LM is unavailable.

*   **10.4: Memory Corruption Detection and Recovery:**
    *   **Action:** Implement checksums or other validation mechanisms for critical memory structures. (Note: Recovery will depend on persistence, but detection can be implemented first).

**Acceptance Criteria:**
- [ ] All reasoning tasks are subject to configurable resource and time bounds.
- [ ] All external API calls are protected by a configurable circuit breaker.
- [ ] The reasoning engine can gracefully degrade to a pure NAL mode when the LM is unavailable.

---

### Phase 11: Security & Advanced Validation
*Goal: Secure the agent's execution environment and rigorously validate the correctness of its reasoning on ephemeral test cases.*

**Agile Focus:** Prove that the core reasoning system is both secure and logically correct *before* adding features that expose it to the outside world or persist its state.

**Key Initiatives (In Priority Order):**

*   **11.1: Design a Capability-Based Security Model:**
    *   **Action:** Implement a security model where tools and plugins are granted specific, limited capabilities defined in a manifest.
    *   **Example: `plugin-manifest.json`**
        ```json
        {
          "name": "weather-plugin",
          "capabilities": {
            "network": { "allowedHosts": ["api.weather.com"] }
          }
        }
        ```

*   **11.2: Implement a Sandboxed Tool Execution Environment:**
    *   **Action:** Execute all external tools in a sandboxed environment with strict resource limits.

*   **11.3: Implement Property-Based Testing for NAL Rules:**
    *   **Action:** Use a property-based testing framework to test the logical invariants of the NAL rule engine and truth-value functions.

*   **11.4: Develop a Hybrid Reasoning Validation Framework:**
    *   **Action:** Create a dedicated test harness for validating the *quality* of NAL-LM hybrid reasoning against a curated set of complex, ephemeral problems.
    *   **Validation Scenario Example:**
        *   **Input:** "A Tesla is a type of car. My car is a Tesla. Cars need electricity. Does my car need electricity?"
        *   **Expected Hybrid Output:** A "Yes" answer accompanied by a complete, verifiable reasoning chain.

*   **11.5: Introduce Chaos Engineering for Reliability Validation:**
    *   **Action:** Build a "chaos testing" suite that intentionally injects failures to test the resilience features built in Phase 10.

*   **11.6: Create an Audit Logging System:**
    *   **Action:** Implement a secure, append-only audit log for all sensitive actions.

*   **11.7: Establish Performance Regression Benchmarks:**
    *   **Action:** Create a suite of performance benchmarks that run automatically in CI.

**Acceptance Criteria:**
- [ ] Tools and plugins operate under a capability-based security model.
- [ ] All tool code is executed within a resource-limited sandbox.
- [ ] The quality and correctness of hybrid reasoning are validated against a benchmark suite.
- [ ] NAL rules are validated by property-based tests.

---

### Phase 12: The Usable & Transparent Agent
*Goal: Make the validated agent useful and interactive by adding persistence and user-facing visualization tools.*

**Agile Focus:** Implement the features required for a human to interact with the agent, observe its behavior in real-time, and trust that its knowledge will persist.

**Key Initiatives (In Priority Order):**

*   **12.1: Implement State Persistence and Recovery:**
    *   **Action:** Design and build an adapter-based system for persisting the agent's memory and state to durable storage (e.g., SQLite).

*   **12.2: Develop a WebSocket API for Real-Time Monitoring:**
    *   **Action:** Implement a secure WebSocket endpoint that streams key events and metrics from the observability pipeline.

*   **12.3: Build an Interactive Visualization Suite:**
    *   **Action:** Develop a web-based UI that connects to the WebSocket API to provide a real-time view into the agent's mind (concept graph, evaluation traces, metrics).

**Acceptance Criteria:**
- [ ] The agent can persist its state to disk and successfully recover from a restart.
- [ ] A web-based UI provides real-time visualization of the agent's memory and reasoning.

---

### Phase 13: Advanced Coordination & Autonomy
*Goal: Cultivate the conditions for emergent, autonomous intelligence by enabling the agent to reason about itself and coordinate with others.*

**Agile Focus:** Implement the foundational capabilities for self-directed behavior and multi-agent systems.

**Key Initiatives:**

*   **13.1: Implement a Meta-Goal System:**
    *   **Action:** Allow the agent to pursue high-level, abstract objectives (e.g., "increase knowledge," "maintain logical consistency").

*   **13.2: Integrate Self-Monitoring with the Goal System:**
    *   **Action:** Connect the observability pipeline to the goal system, allowing the agent to reason about its own performance and generate goals for self-improvement.

*   **13.3: Multi-Agent Coordination Foundations:**
    *   **Action:** Define and implement a preliminary agent-to-agent communication protocol.
    *   **Message Format Example:**
        ```json
        {
          "protocolVersion": "1.0",
          "messageId": "uuid-v4",
          "senderId": "agent-alpha",
          "type": "BELIEF_SHARE",
          "payload": {
            "term": "(A ==> B)",
            "truth": { "f": 0.8, "c": 0.95 }
          }
        }
        ```

**Acceptance Criteria:**
- [ ] The system can be given an abstract meta-goal and generate a tree of actionable sub-tasks to pursue it.
- [ ] A foundational protocol for multi-agent communication is defined and demonstrated.

---

### Phase 14: Full Autonomy
*Goal: Achieve the final capstone of the project: an agent that exhibits genuine curiosity and self-directed learning.*

**Agile Focus:** Implement the curiosity mechanism that drives autonomous knowledge acquisition.

**Key Initiatives:**

*   **14.1: Develop a Curiosity Mechanism:**
    *   **Action:** Implement a mechanism for the system to autonomously generate questions to explore gaps in its knowledge, driven by its memory and semantic embeddings.

**Acceptance Criteria:**
- [ ] The system can demonstrate self-improvement by identifying a performance issue and creating a goal to address it.
- [ ] The system can demonstrate curiosity by autonomously generating and attempting to answer novel questions.
