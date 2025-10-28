// src/module.js - ES module exports for library usage
import { NAR } from './nar/NAR.js';
import { Agent, InputTasks } from './Agent.js';
import { EvaluationEngine } from './reasoning/EvaluationEngine.js';
import { PrologParser } from './parser/PrologParser.js';
import { ReplInterface } from './io/ReplInterface.js';
import { MonitoringAPI } from './io/MonitoringAPI.js';

export {
    NAR,
    Agent,
    InputTasks,
    EvaluationEngine,
    PrologParser,
    ReplInterface,
    MonitoringAPI
};

// Default export for convenience
export default {
    NAR,
    Agent,
    InputTasks,
    EvaluationEngine,
    PrologParser,
    ReplInterface,
    MonitoringAPI
};