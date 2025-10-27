# Reasoning Benchmark Suite

This directory contains JSON-based test cases for evaluating the correctness and performance of the NAL reasoning system.

## File Structure

Each benchmark file follows this structure:

```json
{
  "name": "Benchmark Name",
  "description": "Description of what is being tested",
  "input": [
    "List of Narsese statements to input to the system"
  ],
  "expected": {
    "answer": "Expected answer from the reasoning system",
    "trace": ["List of expected reasoning steps"],
    "confidence": 0.8,
    "executionTime": "<1000"
  },
  "metadata": {
    "category": "Reasoning category",
    "complexity": "easy|medium|hard",
    "knowledgeDomain": "Domain of knowledge being tested"
  }
}
```

## Running Benchmarks

To run all benchmarks:

```bash
npm run benchmark
```

This will:
1. Load all JSON benchmark files from this directory
2. Execute each benchmark using the reasoning system
3. Compare actual results with expected results
4. Generate a summary report and export detailed results to a JSON file

## Current Benchmarks

### Tesla Premise Injection
Tests inference of electric vehicle properties from premise injection:
- Input: `(my_car --> Tesla).`, `(Tesla --> car).`, `my_car needs electricity?`
- Expected: `(my_car --> needs_electricity).`

### Syllogistic Reasoning Test
Classic syllogistic reasoning test:
- Input: `(Socrates --> human).`, `(human --> mortal).`, `Socrates ? mortal`
- Expected: `(Socrates --> mortal).`

### Inductive Reasoning Test
Tests inductive reasoning from specific observations:
- Input: `(raven1 --> black).`, `(raven2 --> black).`, `(raven3 --> black).`, `raven ? black`
- Expected: `(raven --> black).`

## Adding New Benchmarks

To add a new benchmark, create a new `.json` file in this directory with the structure shown above. Make sure your test case covers a specific reasoning pattern or validates particular behavior of the system.