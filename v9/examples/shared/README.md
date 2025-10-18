# Shared Example/Test Modules

This directory contains shared functionality that is used by both examples and integration tests to avoid code duplication.

## Pattern

Each shared module contains:
- Core functionality that demonstrates a specific feature or use case
- Exported functions that can be imported by both:
  - Integration tests (in `tests/integration/`)
  - Examples (in `examples/`)

## Benefits

- **No Code Duplication**: Same core functionality used for both testing and examples
- **Consistency**: Tests and examples always demonstrate the same behavior
- **Maintainability**: Changes to the core functionality automatically update both tests and examples

## Current Shared Modules

- `memoryDemo.js` - Enhanced memory system operations
- `cognitiveCycleDemo.js` - Rules and memory working together in cognitive cycle