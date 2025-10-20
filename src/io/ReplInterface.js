import {NAR} from '../nar/NAR.js';
import readline from 'readline';

export class ReplInterface {
    constructor(config = {}) {
        this.nar = new NAR(config.nar || {});
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.sessionState = {
            history: [],
            lastResult: null,
            startTime: Date.now()
        };
        
        this.commands = new Map([
            ['help', this._help.bind(this)],
            ['h', this._help.bind(this)],
            ['?', this._help.bind(this)],
            ['quit', this._quit.bind(this)],
            ['q', this._quit.bind(this)],
            ['exit', this._quit.bind(this)],
            ['status', this._status.bind(this)],
            ['s', this._status.bind(this)],
            ['stats', this._status.bind(this)],
            ['memory', this._memory.bind(this)],
            ['m', this._memory.bind(this)],
            ['trace', this._trace.bind(this)],
            ['t', this._trace.bind(this)],
            ['reset', this._reset.bind(this)],
            ['r', this._reset.bind(this)]
        ]);
    }

    async start() {
        console.log('SENARS9.js v10 - NAR Reasoning Engine');
        console.log('Type "help" for available commands, "quit" to exit');
        
        this._prompt();
        
        this.rl.on('line', async (input) => {
            input = input.trim();
            
            if (!input) {
                this._prompt();
                return;
            }
            
            // Add to history
            this.sessionState.history.push(input);
            
            if (input.startsWith(':')) {
                // Command mode
                const [cmd, ...args] = input.slice(1).split(' ');
                await this._executeCommand(cmd.toLowerCase(), args.join(' '));
            } else {
                // Narsese input mode
                await this._processNarsese(input);
            }
            
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
        
        if (commandFn) {
            try {
                const result = await commandFn(args);
                if (result) console.log(result);
            } catch (error) {
                console.error(`Error executing command: ${error.message}`);
            }
        } else {
            console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
        }
    }
    
    async _processNarsese(input) {
        try {
            const startTime = Date.now();
            const result = await this.nar.input(input);
            const duration = Date.now() - startTime;
            
            if (result) {
                console.log(`✓ Input processed successfully (${duration}ms)`);
                
                // Show latest beliefs if any were generated
                const beliefs = this.nar.getBeliefs();
                if (beliefs.length > 0) {
                    console.log('Latest beliefs:');
                    beliefs.slice(-3).forEach(task => {
                        console.log(`  ${task.term.name} ${task.truth ? task.truth.toString() : ''}`);
                    });
                }
            } else {
                console.log('✗ Failed to process input');
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
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
        return `
System Status:
  Running: ${stats.isRunning ? 'Yes' : 'No'}
  Cycles: ${stats.cycleCount}
  Memory Concepts: ${stats.memoryStats.conceptCount}
  Focus Tasks: ${stats.memoryStats.focusTaskCount}
  Total Tasks: ${stats.taskManagerStats?.totalTasks || 'N/A'}
  Start Time: ${new Date(this.sessionState.startTime).toISOString()}
        `.trim();
    }
    
    _memory() {
        const stats = this.nar.getStats();
        return `
Memory Statistics:
  Concepts: ${stats.memoryStats.conceptCount}
  Tasks in Memory: ${stats.memoryStats.taskCount}
  Focus Set Size: ${stats.memoryStats.focusSize}
  Concept Capacity: ${stats.memoryStats.capacity}
  Forgetting Threshold: ${stats.memoryStats.forgettingThreshold}
  Average Concept Priority: ${stats.memoryStats.avgPriority?.toFixed(3) || 'N/A'}
        `.trim();
    }
    
    _trace() {
        // In a full implementation, this would show reasoning trace
        // For now, we'll show recent tasks and concepts
        const beliefs = this.nar.getBeliefs();
        if (beliefs.length === 0) return 'No recent beliefs found.';
        
        return `
Recent Beliefs (last 5):
${beliefs.slice(-5).map(task => `  ${task.term.name} ${task.truth ? task.truth.toString() : ''}`).join('\n')}
        `.trim();
    }
    
    _reset() {
        this.nar.reset();
        this.sessionState.history = [];
        this.sessionState.lastResult = null;
        return 'NAR system reset successfully.';
    }
}