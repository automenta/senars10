/**
 * @file TestNAR.js
 * @description Simple test framework for NAR functionality
 */

/**
 * Task matcher for test expectations
 */
export class TaskMatch {
    constructor(term) {
        this.termFilter = term || null;
        this.punctuationFilter = null;
        this.minFreq = null;
        this.maxFreq = null;
        this.minConf = null;
        this.maxConf = null;
        this.expectedFreq = null;
        this.expectedConf = null;
        this.tolerance = null;
    }

    withPunctuation(punctuation) {
        this.punctuationFilter = punctuation;
        return this;
    }

    withTruth(minFrequency, minConfidence) {
        this.minFreq = minFrequency;
        this.minConf = minConfidence;
        return this;
    }

    /**
     * Add flexible truth matching with tolerance
     * @param {number} expectedFrequency - Expected frequency value
     * @param {number} expectedConfidence - Expected confidence value
     * @param {number} tolerance - Tolerance for matching (e.g., 0.01 for 1% tolerance)
     * @returns {TaskMatch} - Returns this for method chaining
     */
    withFlexibleTruth(expectedFrequency, expectedConfidence, tolerance) {
        this.expectedFreq = expectedFrequency;
        this.expectedConf = expectedConfidence;
        this.tolerance = tolerance;
        return this;
    }

    async matches(task) {
        // Check term match
        if (this.termFilter) {
            const {NarseseParser} = await import('../parser/NarseseParser.js');
            const {TermFactory} = await import('../term/TermFactory.js');
            const termFactory = new TermFactory();
            const parser = new NarseseParser(termFactory);
            // Add punctuation to satisfy the parser
            const expectedTerm = parser.parse(this.termFilter + '.').term;
            if (!task.term.equals(expectedTerm)) {
                return false;
            }
        }

        // Check punctuation match
        if (this.punctuationFilter) {
            const expectedType = this._punctToType(this.punctuationFilter);
            if (task.type !== expectedType) {
                return false;
            }
        }

        // Check truth values
        if (this.minFreq !== null && task.truth && task.truth.f < this.minFreq) {
            return false;
        }
        if (this.minConf !== null && task.truth && task.truth.c < this.minConf) {
            return false;
        }

        // Check flexible truth matching if specified
        if (this.expectedFreq !== null && this.expectedConf !== null && this.tolerance !== null && task.truth) {
            const freqDiff = Math.abs(task.truth.f - this.expectedFreq);
            const confDiff = Math.abs(task.truth.c - this.expectedConf);
            if (freqDiff > this.tolerance || confDiff > this.tolerance) {
                return false;
            }
        }

        // Check range-based truth matching if specified
        if (this.minFreq !== null && this.maxFreq !== null && task.truth &&
            (task.truth.f < this.minFreq || task.truth.f > this.maxFreq)) {
            return false;
        }
        if (this.minConf !== null && this.maxConf !== null && task.truth &&
            (task.truth.c < this.minConf || task.truth.c > this.maxConf)) {
            return false;
        }

        return true;
    }

    _punctToType(punct) {
        const map = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
        return map[punct] || 'BELIEF';
    }
}

/**
 * Simplified test framework for NAR
 */
export class TestNAR {
    constructor() {
        this.operations = [];
        this.nar = null;
    }

    static _matchesTruth(taskTruth, criteriaTruth) {
        if (!taskTruth) return false;
        return (!criteriaTruth.minFreq || taskTruth.f >= criteriaTruth.minFreq) &&
            (!criteriaTruth.minConf || taskTruth.c >= criteriaTruth.minConf);
    }

    getNAR() {
        return this.nar;
    }

    input(termStr, freq = 0.9, conf = 0.9) {
        this.operations.push({type: 'input', termStr, freq, conf});
        return this;
    }

    run(cycles = 1) {
        this.operations.push({type: 'run', cycles});
        return this;
    }

    expect(criteria) {
        const matcher = criteria instanceof TaskMatch ? criteria : new TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(criteria) {
        const matcher = criteria instanceof TaskMatch ? criteria : new TaskMatch(criteria);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
    }

    async execute() {
        // Dynamically import NAR to avoid circular dependencies
        const {NAR} = await import('../nar/NAR.js');
        this.nar = new NAR();
        await this.nar.initialize(); // Initialize the NAR to ensure components are set up

        // Allow for more cycles to ensure reasoning completion
        const maxCycles = 5; // Increase default cycles for reasoning

        // Process operations
        const expectations = [];

        for (const op of this.operations) {
            switch (op.type) {
                case 'input':
                    try {
                        // Format input with truth values: "term. %freq;conf%"
                        const inputStr = `${op.termStr}. %${op.freq};${op.conf}%`;
                        await this.nar.input(inputStr);
                    } catch (error) {
                        this.logger?.warn(`Input failed: ${op.termStr}`, error);
                    }
                    break;

                case 'run':
                    for (let i = 0; i < op.cycles; i++) {
                        await this.nar.step();
                    }
                    break;

                case 'expect':
                    expectations.push(op);
                    break;
            }
        }

        // Additional reasoning cycles after all inputs to allow for inference
        for (let i = 0; i < maxCycles; i++) {
            await this.nar.step();
        }

        // Get all beliefs from NAR after processing
        const allBeliefs = this.nar.memory.getAllConcepts().flatMap(c => c.getAllTasks().filter(t => t.type === 'BELIEF'));

        // Get all tasks (not just beliefs) to catch derived results
        const allTasks = this.nar.memory.getAllConcepts().flatMap(c => c.getAllTasks());

        // Validate expectations
        for (const exp of expectations) {
            const {matcher, shouldExist} = exp;

            let found = false;
            for (const task of allTasks) {
                if (await matcher.matches(task)) {
                    found = true;
                    break;
                }
            }

            if ((shouldExist && !found) || (!shouldExist && found)) {
                const taskList = allTasks.length
                    ? allTasks.map(t => `  - ${t.toString()}`).join('\n')
                    : '  (None)';

                throw new Error(`
          ==================== TEST FAILED ====================
          Expectation: ${shouldExist ? 'FIND' : 'NOT FIND'} a task matching criteria.
          Criteria: Term="${matcher.termFilter}", MinFreq="${matcher.minFreq}", MinConf="${matcher.minConf}"

          ----- All Tasks (${allTasks.length}) -----
${taskList}
          ---------------------------------------------------
        `);
            }
        }

        return true;
    }
}