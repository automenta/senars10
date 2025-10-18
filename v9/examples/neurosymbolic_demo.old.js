#!/usr/bin/env node

/**
 * @file: demos/neurosymbolic_demo.js
 * @description: Runnable demo showcasing SeNARS's neurosymbolic integration capabilities
 * This is a full-screen console TUI demonstrating the collaboration between
 * neural (LM) and symbolic (NARS) components.
 */

import System from '../core/system/System.js';
import blessed from 'blessed';

// Default configuration
const DEFAULT_INPUT = "Ensure Earth Happiness!";
const DEFAULT_LM_PROVIDER = "xenova";

// Global state
let system = null;
let isRunning = false;
let taskSortMode = 'priority'; // priority, creationTime
let taskUpdateInterval = null;
let logLines = [];
const MAX_LOG_LINES = 5000;

// Color scheme
const COLORS = {
  border: 'cyan',
  text: 'white',
  highlight: 'yellow',
  success: 'green',
  error: 'red',
  info: 'blue',
  task: {
    goal: 'magenta',
    belief: 'green',
    question: 'cyan'
  }
};

/**
 * Initialize the SeNARS system
 */
async function initializeSystem(lmProvider = DEFAULT_LM_PROVIDER) {
  console.log('🚀 Initializing SeNARS Neurosymbolic System...');

  try {
    // Initialize with configuration that includes LM provider
    // And disable WebSocket server to avoid conflicts in terminal mode
    const config = {
      components: {
        lm: {
          provider: lmProvider
        },
        webSocketServer: {
          enabled: false  // Disable WebSocket server for terminal UI
        }
      }
    };

    system = new System(config);

    await system.start();
    console.log('✅ System initialized successfully');
    return system;
  } catch (error) {
    console.error('❌ Failed to initialize system:', error);
    throw error;
  }
}

/**
 * Add initial input tasks to the system
 */
async function addInitialTasks(system, inputText) {
  console.log(`📥 Adding initial input: "${inputText}"`);

  try {
    // Parse and add the input as a task
    await system.input({
      term: inputText,
      punctuation: '!', // Goal
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    console.log('✅ Initial tasks added to system');
  } catch (error) {
    console.error('❌ Failed to add initial tasks:', error);
  }
}

/**
 * Add a line to the log with automatic cleanup
 */
function addLogLine(line) {
  logLines.push(line);
  if (logLines.length > MAX_LOG_LINES) {
    logLines = logLines.slice(-MAX_LOG_LINES);
  }
}

/**
 * Get formatted log content
 */
function getFormattedLog() {
  return logLines.join('\n');
}

/**
 * Create the TUI interface using blessed
 */
function createTUI() {
  // Create a screen object
  const screen = blessed.screen({
    smartCSR: true,
    title: 'SeNARS Neurosymbolic Demo',
    fullUnicode: true // Enable full Unicode support for emojis
  });

  // Hide cursor
  screen.cursor = false;

  // Create main layout containers
  const title = blessed.box({
    top: '0',
    left: '0',
    width: '100%',
    height: '3',
    content: '{center}🧠 SeNARS Neurosymbolic Integration Demo{/center}\n{center}Bridging Neural Understanding and Symbolic Reasoning{/center}',
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.highlight,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Left column: Tasks
  const taskBox = blessed.box({
    top: '3',
    left: '0',
    width: '50%',
    height: '80%',
    content: 'Loading tasks...',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📋 Tasks (Sorted by Priority)',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Right column: Log
  const logBox = blessed.box({
    top: '3',
    right: '0',
    width: '50%',
    height: '80%',
    content: 'System log will appear here...\n',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📜 Log',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Status bar
  const status = blessed.box({
    top: '80%',
    left: '0',
    width: '100%',
    height: '5%',
    content: '{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}',
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Info box
  const info = blessed.box({
    top: '85%',
    left: '0',
    width: '100%',
    height: '15%',
    content: `💡 Neurosymbolic Integration:
Neural (LM): Interprets natural language goals, generates hypotheses, translates between language and formal representations.
Symbolic (NARS): Validates consistency, performs logical reasoning, manages truth values, invokes LM when needed.

Example inputs: "Ensure Earth Happiness!", "Ensure User's Wealth!", etc.`,
    align: 'left',
    valign: 'top',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Add all elements to screen
  screen.append(title);
  screen.append(taskBox);
  screen.append(logBox);
  screen.append(status);
  screen.append(info);

  // Handle key events
  screen.key(['q', 'C-c'], () => {
    return process.exit(0);
  });

  screen.key(['r', 'R'], () => {
    if (system) {
      isRunning = true;
      status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();

      // Start the reasoning cycle via system
      if (system.core && system.core.cycle) {
        system.core.cycle.resume();
      }
    }
  });

  screen.key(['p', 'P'], () => {
    isRunning = false;
    status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
    screen.render();

    // Pause the reasoning cycle via system
    if (system.core && system.core.cycle) {
      system.core.cycle.pause();
    }
  });

  screen.key(['s', 'S'], () => {
    // Cycle through sort modes
    const modes = ['priority', 'creationTime'];
    const currentIndex = modes.indexOf(taskSortMode);
    taskSortMode = modes[(currentIndex + 1) % modes.length];

    let sortLabel = 'Priority';
    if (taskSortMode === 'creationTime') sortLabel = 'Creation Time';

    taskBox.setLabel(`📋 Tasks (Sorted by ${sortLabel})`);
    screen.render();
  });

  // Make the screen renderable
  screen.render();

  return {
    screen,
    taskBox,
    logBox,
    status
  };
}

/**
 * Get tasks from the system and format them for display
 */
function getFormattedTasks() {
  if (!system || !system.core || !system.core.memory) {
    return [];
  }

  try {
    // Try different ways to access tasks, in order of preference
    let allTasks = [];

    // Check if memory has getAllTasks method (defined in Memory.js)
    if (system.core.memory.getAllTasks && typeof system.core.memory.getAllTasks === 'function') {
      allTasks = system.core.memory.getAllTasks();
    }
    // Try accessing internal task maps if getAllTasks is not available at top level
    else if (system.core.memory.shortTermTasks && system.core.memory.longTermTasks) {
      allTasks = [...system.core.memory.shortTermTasks.values(), ...system.core.memory.longTermTasks.values()];
    }
    else {
      console.error('No available method to retrieve tasks from memory');
      return [];
    }

    // Make sure we have an array
    if (!Array.isArray(allTasks)) {
      console.warn('Tasks is not an array:', typeof allTasks);
      return [];
    }

    // Sort tasks based on the selected mode
    let sortedTasks = [];
    if (taskSortMode === 'priority') {
      sortedTasks = allTasks.sort((a, b) => {
        const aPriority = typeof a.getPriority === 'function' ? a.getPriority() : (a.priority || a._priority || 0);
        const bPriority = typeof b.getPriority === 'function' ? b.getPriority() : (b.priority || b._priority || 0);
        return bPriority - aPriority;
      });
    } else if (taskSortMode === 'creationTime') {
      sortedTasks = allTasks.sort((a, b) => {
        const aTime = a.createdAt || a._accessedAt || Date.now();
        const bTime = b.createdAt || b._accessedAt || Date.now();
        return bTime - aTime;
      });
    }

    // Format tasks for display
    return sortedTasks.map(task => {
      let color = COLORS.task.belief;
      let emoji = '💭';

      const punctuation = task.punctuation || (task.term && task.term.punctuation) || '.';
      if (punctuation === '!') {
        color = COLORS.task.goal;
        emoji = '🎯';
      } else if (punctuation === '?') {
        color = COLORS.task.question;
        emoji = '❓';
      }

      const priority = (typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)).toFixed(2);
      const createdAt = new Date(task.createdAt || task._accessedAt || Date.now()).toLocaleTimeString();

      // Get string representation
      let taskStr = 'Unknown task';
      if (typeof task.toString === 'function') {
        taskStr = task.toString();
      } else if (task.term) {
        taskStr = typeof task.term === 'string' ? task.term : (typeof task.term.toString === 'function' ? task.term.toString() : JSON.stringify(task.term));
      }

      return {
        content: `{${color}-fg}${emoji} ${taskStr} (Pri: ${priority}, Created: ${createdAt}){/}`,
        priority: typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)
      };
    });
  } catch (error) {
    console.error('Error getting formatted tasks:', error);
    return [];
  }
}

/**
 * Main function to set up the demo
 */
async function runDemo(inputText = DEFAULT_INPUT, lmProvider = DEFAULT_LM_PROVIDER) {
  try {
    // Initialize the system
    await initializeSystem(lmProvider);

    // Add initial tasks
    await addInitialTasks(system, inputText);

    // Create the TUI
    const { screen, taskBox, logBox, status } = createTUI();

    // Update tasks periodically
    taskUpdateInterval = setInterval(() => {
      try {
        const formattedTasks = getFormattedTasks();
        let taskContent = '';

        if (formattedTasks.length === 0) {
          taskContent = '{white-fg}No tasks in memory{/}';
        } else {
          taskContent = formattedTasks.map(t => t.content).join('\n');
        }

        // Add spacing
        taskContent = '\n' + taskContent + '\n';
        taskBox.setContent(taskContent);
        screen.render();
      } catch (error) {
        console.error('Error updating tasks:', error);
        // Show error in the UI
        taskBox.setContent(`{red-fg}Error loading tasks: ${error.message}{/}`);
        screen.render();
      }
    }, 1000); // Update every second

    // Set up event listeners to log system events
    if (system) {
      // Listen to system events and add them to the log
      system.on('task.input', (task) => {
        const line = `📥 Task input: ${task.term} (${task.punctuation})`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('task.processed', (result) => {
        const line = `✅ Task processed: ${result.content || 'Unknown'}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('cycle.stats', (stats) => {
        const line = `🔄 Cycle ${stats.cycles} executed at ${new Date(stats.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('system.started', (data) => {
        const line = `🚀 System started at ${new Date(data.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('reasoning_error', (error) => {
        const line = `⚠️  Reasoning error: ${error.message || error}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });
    }

    // Start the cycle in paused mode by default
    if (system.core && system.core.cycle) {
      // Initialize the cycle but keep it paused by default
      await system.core.cycle.start(); // Start the cycle manager
      await system.core.cycle.pause(); // Set to paused initially
    }

    // Log some initial messages
    addLogLine('✅ System initialized');
    addLogLine(`📥 Input received: "${inputText}"`);
    addLogLine('🎯 Ready to start reasoning. Press R to run.');
    logBox.setContent(getFormattedLog());
    screen.render();

    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(taskUpdateInterval);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(0);
    });

    // Catch uncaught exceptions
    process.on('uncaughtException', (err) => {
      clearInterval(taskUpdateInterval);
      console.error('Uncaught Exception:', err);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to run demo:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    input: DEFAULT_INPUT,
    provider: DEFAULT_LM_PROVIDER
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.input = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--provider' || args[i] === '-p') {
      options.provider = args[i + 1];
      i++; // Skip next argument
    }
  }

  return options;
}

// Run the demo with command line arguments
const options = parseArguments();
runDemo(options.input, options.provider).catch(console.error);