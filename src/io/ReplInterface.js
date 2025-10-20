import {NAR} from '../nar/NAR.js';
import readline from 'readline';

const COMMANDS = {
    help: ['help', 'h', '?'],
    quit: ['quit', 'q', 'exit'],
    status: ['status', 's', 'stats'],
    memory: ['memory', 'm'],
    trace: ['trace', 't'],
    reset: ['reset', 'r']
};

export class ReplInterface {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.rl = readline.createInterface({input: process.stdin, output: process.stdout});
        this.sessionState = {history: [], lastResult: null, startTime: Date.now()};
        this.commands = this._buildCommandMap();
    }

    _buildCommandMap() {
        const commandMap = new Map();
        Object.entries(COMMANDS).forEach(([method, aliases]) => {
            aliases.forEach(alias => commandMap.set(alias, this[`_${method}`].bind(this)));
        });
        return commandMap;
    }

    async start() {
        console.log('SENARS9.js v10 - NAR Reasoning Engine');
        console.log('Type "help" for available commands, "quit" to exit');

        this._prompt();

        this.rl.on('line', async (input) => {
            const trimmedInput = input.trim();
            if (!trimmedInput) return this._prompt();

            this.sessionState.history.push(trimmedInput);

            const isCommand = trimmedInput.startsWith(':');
            isCommand
                ? await this._executeCommand(...trimmedInput.slice(1).split(' '))
                : await this._processNarsese(trimmedInput);

            this._prompt();
        });

        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });
    }

    _prompt() {
        process.stdout.write('\nNAR> ');
    }

    async _executeCommand(cmd, args) {
        const commandFn = this.commands.get(cmd);
        if (!commandFn) return console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);

        try {
            const result = await commandFn(args);
            if (result) console.log(result);
        } catch (error) {
            console.error(`Error executing command: ${error.message}`);
        }
    }

    async _processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            const duration = Date.now() - startTime;

            result
                ? this._showSuccess(duration)
                : console.log('✗ Failed to process input');
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
    }

    _showSuccess(duration) {
        console.log(`✓ Input processed successfully (${duration}ms)`);
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) return;

        console.log('Latest beliefs:');
        beliefs.slice(-3).forEach(task =>
            console.log(`  ${task.term.name} ${task.truth?.toString() || ''}`));
    }

    _help() {
        return `
Available commands:
  :help, :h, :?     - Show this help message
  :quit, :q, :exit  - Quit the REPL
  :status, :s, :stats - Show system status
  :memory, :m       - Show memory statistics
  :trace, :t        - Show reasoning trace
  :reset, :r        - Reset the NAR system

Narsese input examples:
  (bird --> animal).                     (inheritance statement)
  (robin --> bird). %1.0;0.9%           (with truth values)
  (robin --> animal)?                   (question)
  (robin --> fly)!                      (goal)
        `.trim();
    }

    _quit() {
        this.rl.close();
    }

    _status() {
        const stats = this.nar.getStats();
        return `System Status:
  Running: ${stats.isRunning ? 'Yes' : 'No'}
  Cycles: ${stats.cycleCount}
  Memory Concepts: ${stats.memoryStats.conceptCount}
  Focus Tasks: ${stats.memoryStats.focusTaskCount}
  Total Tasks: ${stats.taskManagerStats?.totalTasks || 'N/A'}
  Start Time: ${new Date(this.sessionState.startTime).toISOString()}`;
    }

    _memory() {
        const stats = this.nar.getStats();
        return `Memory Statistics:
  Concepts: ${stats.memoryStats.conceptCount}
  Tasks in Memory: ${stats.memoryStats.taskCount}
  Focus Set Size: ${stats.memoryStats.focusSize}
  Concept Capacity: ${stats.memoryStats.capacity}
  Forgetting Threshold: ${stats.memoryStats.forgettingThreshold}
  Average Concept Priority: ${stats.memoryStats.avgPriority?.toFixed(3) || 'N/A'}`;
    }

    _trace() {
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) return 'No recent beliefs found.';

        return `Recent Beliefs (last 5):
${beliefs.slice(-5).map(task => `  ${task.term.name} ${task.truth?.toString() || ''}`).join('\n')}`;
    }

    _reset() {
        this.nar.reset();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        return 'NAR system reset successfully.';
    }
}