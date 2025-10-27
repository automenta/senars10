# SeNARS Complete Development Plan (Final, Enhanced)

## Introduction

This document presents the complete, reprioritized development plan for SeNARS. It has been revised to prioritize the development and validation of a correct, reliable, and secure core reasoning system using ephemeral test cases *before* implementing end-user functionality such as persistence or visualization UIs.

This plan codifies key architectural principles and technology choices to ensure a robust, maintainable, and agile foundation for research and development. Each phase includes a stated **"Agile Focus"** and initiatives ordered by priority.

---
## Core Development Principles & Technology Choices

To align with the JavaScript platform and modern development practices, we will adhere to the following principles:

1.  **Flexible Configuration:** Configuration can be provided via inline JSON within `.js` initialization code, overriding sane defaults. For sensitive information like API keys, `.env` files (or similar conventions) will be consulted. This approach simplifies testing by unifying configuration within the code, while still allowing for external configuration files in application-level functionality.

2.  **Jest for Testing:** The project will standardize on the **Jest** testing framework. Instead of building custom test runners or fluent APIs, we will leverage Jest's powerful ecosystem for assertions, mocking, and coverage reporting, which is already established in the project.

3.  **Zod for Validation:** For all data validation (configuration schemas, API inputs, event payloads), we will use **Zod**. Its schema-first approach provides robust, static, and runtime type safety with minimal boilerplate, improving reliability and developer experience.

4.  **Lightweight Event Emitter:** The `EventBus` will be implemented using a minimal, well-tested library like `mitt` or `tiny-emitter`. This avoids reinventing core eventing logic and ensures high performance.

5.  **Functional Core, Imperative Shell:** The reasoning engine, evaluation logic, and truth-value functions will be implemented as **pure functions**. The "shell" will manage state and side effects (I/O, etc.). This separation is critical for testability and reliability.

6.  **Configuration as Code:** All agent behaviors, rule sets, and plugin configurations will be defined declaratively in the `config.json`, not hard-coded. The `AgentBuilder` is the mechanism that enforces this principle.

---

### Phase 9: Observability & Foundational Engineering
*Goal: Establish a comprehensive, unified observability framework and a formal plugin architecture.*

**Agile Focus:** Establish the event-driven backbone and implement the minimum viable logging and developer tools necessary to observe and debug the core reasoning loop.

**Key Initiatives (In Priority Order):**

*   **9.1: Enforce Event-Driven Communication & Define Ubiquitous Language:**
    *   **Action:** Mandate the use of the `EventBus` for all cross-component communication. Refactor to publish events.
    *   **Implementation Details:**
        *   **Ubiquitous Language**: Events (`task.new`, `cycle.start`, etc.) will carry a `traceId` to allow for tracing a single causal chain of operations through the asynchronous system.

*   **9.2: Implement Basic Structured Logging:**
    *   **Action:** Create a single `LoggingSubscriber` that listens to all events on the bus and outputs structured JSON logs to the console.

*   **9.3: Establish a Unified Configuration Schema with Zod:**
    *   **Action:** Consolidate all configuration into a single, hierarchical JSON schema. Use **Zod** to parse and validate the configuration object at startup.
    *   **Example Snippet (`config.json`):**
        ```json
        {
          "agent": {
            "observability": { "logging": { "level": "info" } },
            "plugins": [ { "name": "my-plugin", "config": { "apiKey": "${ENV_VAR}" } } ]
          }
        }
        ```

*   **9.4: Define and Implement the Formal Plugin API:**
    *   **Action:** Specify a formal `Plugin` interface and integrate it into the `AgentBuilder`.

*   **9.5: Create a Core Agent Factory:**
    *   **Action:** Develop a simple factory function (e.g., `createAgent(config)`) that abstracts the `AgentBuilder` for common use cases, making it easier for researchers to start experiments.

**Acceptance Criteria:**
- [ ] All core reasoning loop communication is mediated by the `EventBus` and includes a `traceId`.
- [ ] A `LoggingSubscriber` outputs structured logs for all core events.
- [ ] All system configuration is managed through a single, Zod-validated JSON schema.

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
    *   **Action:** Wrap all external calls (especially to LM providers) in a Circuit Breaker pattern.

*   **10.3: Design and Implement Fallback Strategies:**
    *   **Action:** Develop intelligent fallback mechanisms, such as degrading to pure NAL reasoning when an LM is unavailable.

*   **10.4: Memory Corruption Detection:**
    *   **Action:** Implement checksums or other validation mechanisms for critical memory structures. (Note: Recovery will depend on persistence, but detection can be implemented first).

**Acceptance Criteria:**
- [ ] All reasoning tasks are subject to configurable resource and time bounds.
- [ ] All external API calls are protected by a configurable circuit breaker.

---

### Phase 11: Security & Advanced Validation
*Goal: Secure the agent's execution environment and rigorously validate the correctness of its reasoning on ephemeral test cases.*

**Agile Focus:** Prove that the core reasoning system is both secure and logically correct *before* adding features that expose it to the outside world or persist its state.

**Key Initiatives (In Priority Order):**

*   **11.1: Design a Capability-Based Security Model:**
    *   **Action:** Implement a security model where tools and plugins are granted specific, limited capabilities defined in a manifest.

*   **11.2: Implement a Sandboxed Tool Execution Environment:**
    *   **Action:** Execute all external tools in a sandboxed environment with strict resource limits.

*   **11.3: Implement Property-Based Testing for NAL Rules:**
    *   **Action:** Use **Jest** with a library like `fast-check` to test the logical invariants of the NAL rule engine and truth-value functions.

*   **11.4: Establish a Reasoning Benchmark Suite:**
    *   **Action:** Create a dedicated test harness and a suite of complex, ephemeral problems stored in JSON files. The CI pipeline will run these benchmarks to validate the *quality* and *correctness* of NAL-LM hybrid reasoning and catch regressions.
    *   **Validation Scenario Example (`/benchmarks/tesla_premise.json`):**
        ```json
        {
          "name": "Tesla Premise Injection",
          "input": [
            "(my_car --> Tesla).",
            "(Tesla --> car).",
            "my_car needs electricity?"
          ],
          "expected": {
            "answer": "(my_car --> needs_electricity).",
            "trace": [ "lm.request", "nal.deduction" ]
          }
        }
        ```

**Acceptance Criteria:**
- [ ] Tools and plugins operate under a capability-based security model.
- [ ] The quality and correctness of hybrid reasoning are validated against a JSON-based benchmark suite.
- [ ] NAL rules are validated by property-based tests.

---

### Phase 12: The Usable & Transparent Agent

*   **Agile Focus:** Implement the features required for a human to interact with the agent, observe its behavior in real-time, and trust that its knowledge will persist.

*   **Key Initiatives (In Priority Order):**

    *   **12.0: Standardize on `zod` for validation:**
        *   Replace the `joi` implementation in `SystemConfig.js` with `zod`.
        *   Remove `joi` from `package.json` dependencies and add `zod`.
    *   **12.1: Replace custom `EventBus` with `mitt`:**
        *   Replace the custom `EventBus` implementation with `mitt`.
        *   **Implementation Detail:** A wrapper module will be created around `mitt` to re-implement middleware and error handling hooks, ensuring compatibility with existing components like `LoggingSubscriber`.
    *   **12.2: Develop a Command-Line Interface (CLI):**
        *   Create a simple, interactive CLI for sending Narsese statements to the agent and viewing the output. This will be the primary interface for interacting with the agent.
        *   **Implementation Detail:** The CLI will be built by enhancing `src/io/ReplInterface.js` using Node.js's built-in `readline` module.
    *   **12.3: Implement State Persistence and Recovery:**
        *   Design and build an adapter-based system for persisting the agent's memory and state to durable storage.
        *   **Implementation Detail:** The default adapter will serialize the agent's state to a root `agent.json` file, triggered by a `.save` command in the CLI or on graceful shutdown.
    *   **12.4: Develop a WebSocket API for Real-Time Monitoring:**
        *   Implement a secure WebSocket endpoint that streams key events and metrics from the observability pipeline. This will be used by the future web UI.
        *   **Implementation Detail:** The `ws` library will be added as a dependency to create the WebSocket server.

---

### Phase 13: Advanced Interaction & Visualization

*   **Agile Focus:** Enhance the user experience with a web-based visualization suite and more advanced CLI capabilities.

*   **Key Initiatives:**

    *   **13.1: Build an Interactive Visualization Suite:**
        *   Develop a web-based UI that connects to the WebSocket API to provide a real-time view into the agent's mind.
    *   **13.2: Enhance the CLI:**
        *   Add features to the CLI for managing the agent's state (e.g., saving/loading memory, inspecting concepts).

---

### Phase 14: Full Autonomy
*Goal: Achieve the final capstone of the project: an agent that exhibits genuine curiosity and self-directed learning.*

**Agile Focus:** Implement the curiosity mechanism that drives autonomous knowledge acquisition.

**Key Initiatives:**

*   **14.1: Develop a Curiosity Mechanism:**
    *   **Action:** Implement a mechanism for the system to autonomously generate questions to explore gaps in its knowledge.

**Acceptance Criteria:**
- [ ] The system can demonstrate self-improvement by identifying a performance issue and creating a goal to address it.
- [ ] The system can demonstrate curiosity by autonomously generating and attempting to answer novel questions.
