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
        this.minConf = null;
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

    matches(task) {
        // Check term match
        if (this.termFilter && task.term.toString() !== this.termFilter) {
            return false;
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

    getNAR() {
        return this.nar;
    }

    static _matchesTruth(taskTruth, criteriaTruth) {
        if (!taskTruth) return false;
        return (!criteriaTruth.minFreq || taskTruth.f >= criteriaTruth.minFreq) &&
            (!criteriaTruth.minConf || taskTruth.c >= criteriaTruth.minConf);
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
        
        // Allow for more cycles to ensure reasoning completion
        const maxCycles = 10; // Increase default cycles for reasoning

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
                        console.warn(`Input failed: ${op.termStr}`, error);
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
            const matches = allTasks.filter(task => matcher.matches(task));
            const found = matches.length > 0;

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