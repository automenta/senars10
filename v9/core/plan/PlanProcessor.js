import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class PlanProcessor extends Component {
  constructor(lm = null, htnPlanner = null) {
    super();
    this.lm = lm;
    this.htnPlanner = htnPlanner;

    this.supportedFormats = {
      '.md': 'markdown', '.markdown': 'markdown', '.json': 'json',
      '.yaml': 'yaml', '.yml': 'yaml', '.txt': 'text', '.text': 'text',
      '.js': 'javascript', '.ts': 'typescript', '.file': 'text'
    };

    this.goalPatterns = [
      /to achieve (.+?)(?:,|\.|;)/gi, /goal(?: is to)? (.+?)(?:,|\.|;)/gi,
      /objective(?: is)? (.+?)(?:,|\.|;)/gi, /aim(?: is to)? (.+?)(?:,|\.|;)/gi,
      /need to (.+?)(?:,|\.|;)/gi, /want to (.+?)(?:,|\.|;)/gi,
      /should (.+?)(?:,|\.|;)/gi, /must (.+?)(?:,|\.|;)/gi,
      /will (.+?)(?:,|\.|;)/gi
    ];

    this.dependencyKeywords = [
      'depends on', 'requires', 'after', 'before', 'first', 'then',
      'once', 'when', 'if', 'prerequisite', 'precondition'
    ];

    this.config = {
      maxGoals: DEFAULTS.PLAN_PROCESSOR_MAX_GOALS || 50,
      confidenceThreshold: DEFAULTS.PLAN_PROCESSOR_CONFIDENCE_THRESHOLD || 0.7,
      enableLMProcessing: DEFAULTS.PLAN_PROCESSOR_ENABLE_LM !== false  // Enable by default if not explicitly disabled
    };

    this.stats = {
      documentsProcessed: 0, goalsExtracted: 0, goalsConverted: 0,
      dependenciesAnalyzed: 0, lmProcessings: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    Object.assign(this.config, config);
    this.resetStats();
  }

  async processDocument(document, format = null, options = {}) {
    const { content, detectedFormat } = await this._parseDocumentInput(document, format);
    if (!detectedFormat) throw new Error('Document format not detected');

    this.stats.documentsProcessed++;

    const formatProcessors = {
      'markdown': () => this._processMarkdown(content, options),
      'json': () => this._processJSON(content, options),
      'yaml': () => this._processYAML(content, options),
      'text': () => this._processText(content, options),
      'javascript': () => this._processText(content, options),
      'typescript': () => this._processText(content, options)
    };

    if (!formatProcessors[detectedFormat]) throw new Error(`Unsupported format: ${detectedFormat}`);

    const goals = await formatProcessors[detectedFormat]();
    const filteredGoals = goals.filter(goal => goal.confidence >= this.config.confidenceThreshold);
    const dependencies = await this._analyzeDependencies(filteredGoals, options);
    const prioritizedGoals = await this._prioritizeGoals(filteredGoals, dependencies, options);

    return {
      goals: prioritizedGoals,
      dependencies,
      metadata: {
        format: detectedFormat,
        totalGoals: goals.length,
        filteredGoals: filteredGoals.length,
        confidenceThreshold: this.config.confidenceThreshold,
        timestamp: Date.now()
      }
    };
  }

  async _parseDocumentInput(document, format) {
    let content, detectedFormat = format;

    if (typeof document === 'string') {
      const filePathPatterns = [/^\.\//, /^\.\.\//, /^[a-zA-Z]:/, /^\//];
      const hasFilePathPattern = filePathPatterns.some(pattern => pattern.test(document));
      const hasFileExtension = /\.[a-zA-Z0-9]+/.test(document);
      const looksLikeFilePath = hasFilePathPattern && hasFileExtension && document.length > 2;

      // Additional check: if content contains newlines or markdown-like structures, it's likely content
      const likelyContent = document.includes('\n') || document.includes('# ') || document.includes('- ') ||
                           document.includes('* ') || document.startsWith('{') || document.startsWith('[');

      if (looksLikeFilePath && !likelyContent) {  // Only treat as file path if not likely content
        const extension = document.substring(document.lastIndexOf('.')).toLowerCase();
        detectedFormat = detectedFormat || this.supportedFormats[extension];
        content = await this._readDocumentFromFile(document);
      } else {
        content = document;
        detectedFormat = detectedFormat || 'text';
      }
    } else {
      content = JSON.stringify(document);
      detectedFormat = detectedFormat || 'json';
    }

    return { content, detectedFormat };
  }

  async _processMarkdown(content, options) {
    const headerGoals = this._extractFromHeaders(content, options);
    const textGoals = await this._extractFromText(content, options);
    return [...headerGoals, ...textGoals];
  }

  async _processJSON(content, options) {
    let data;
    try {
      data = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
      throw new Error('Invalid JSON content');
    }

    const goals = [];
    const goalKeys = ['goal', 'goals', 'objective', 'objectives', 'task', 'tasks', 'plan', 'plans', 'todo', 'todos'];

    for (const key of goalKeys) {
      if (data[key]) {
        goals.push(...this._extractGoalsFromJSONData(data[key], key));
      }
    }

    return goals;
  }

  async _processYAML(content, options) {
    const lines = content.split('\n');
    const goals = [];

    for (const line of lines) {
      const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();

        if (['goal', 'objective', 'task', 'todo', 'plan'].includes(key)) {
          goals.push({
            text: value,
            source: `YAML:${key}`,
            confidence: 0.8,
            priority: 0.5,
            timestamp: Date.now()
          });
        }
      }
    }

    const textGoals = await this._extractFromText(content, options);
    return [...goals, ...textGoals];
  }

  async _processText(content, options) {
    return await this._extractFromText(content, options);
  }

  _extractFromHeaders(content, options) {
    const goals = [];
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;

    for (const match of content.matchAll(headerRegex)) {
      const level = match[1].length;
      const headerText = match[2].trim();
      const priority = Math.max(0.1, 1.0 - (level - 1) * 0.15);

      for (const pattern of this.goalPatterns) {
        pattern.lastIndex = 0;
        const goalMatch = pattern.exec(headerText);
        if (goalMatch) {
          goals.push({
            text: goalMatch[1],
            source: `header-level-${level}`,
            confidence: Math.min(1.0, priority + 0.2),
            priority,
            timestamp: Date.now()
          });
          break;
        }
      }

      if (level <= 2) {
        goals.push({
          text: headerText,
          source: `header-level-${level}`,
          confidence: priority,
          priority,
          timestamp: Date.now()
        });
      }
    }

    return goals;
  }

  async _extractFromText(content, options) {
    // Prioritize LM-based extraction and remove the brittle regex fallback.
    if (this.lm && this.config.enableLMProcessing) {
      return await this._extractWithLM(content, [], options);
    }

    // If LM is disabled or not available, we return an empty array
    // because the regex approach has been deemed too unreliable.
    Logger.warn('LM is not available or is disabled. Text-based goal extraction will be skipped.');
    return [];
  }

  async _extractWithLM(content, existingGoals, options) {
    this.stats.lmProcessings++;

    try {
      const response = await this.lm.generateText(this._buildExtractionPrompt(content), {
        temperature: 0.2,
        maxTokens: 1024
      });

      const extractedGoals = this._parseJSONResponse(response);

      if (!Array.isArray(extractedGoals)) {
        Logger.warn('Initial JSON parsing of LM response failed. Trying fallback extraction.');
        return this._handleFallbackExtraction(response, existingGoals);
      }

      const processedGoals = this._processExtractedGoals(extractedGoals);
      return this._mergeGoals(existingGoals, processedGoals);
    } catch (error) {
      Logger.error('LM extraction failed', error);
      return existingGoals;
    }
  }

  _buildExtractionPrompt(content) {
    return `You are a highly capable goal extraction engine. Your task is to identify and extract specific, actionable goals from the provided text.
Goals can be explicitly marked (e.g., "Goal: implement feature") or implicitly stated (e.g., "we need to build the UI").
Action-oriented statements should be treated as goals.

Analyze the following content and return ONLY a JSON array of objects, where each object has:
1. "text": The goal description.
2. "confidence": A value from 0.0 to 1.0 indicating your confidence in this being a valid goal.
3. "priority": A value from 0.0 to 1.0 indicating the goal's priority (higher is more important).

Content to analyze:
${content}`;
  }

  _handleFallbackExtraction(response, existingGoals) {
    const processedGoals = this._extractGoalsFromLMResponse(response);
    this.stats.goalsExtracted += processedGoals.length;
    return [...existingGoals, ...processedGoals];
  }

  _processExtractedGoals(extractedGoals) {
    return extractedGoals.map(goal => ({
      text: goal.text || goal.goal || goal.content || '',
      source: 'lm_extraction',
      confidence: this._normalizeConfidence(goal.confidence),
      priority: this._normalizePriority(goal.priority),
      timestamp: Date.now()
    })).filter(goal => goal.text.trim());
  }

  _normalizeConfidence(confidence) {
    if (typeof confidence === 'number') return confidence;
    if (typeof confidence === 'string') return parseFloat(confidence) || 0.8;
    return 0.8;
  }

  _normalizePriority(priority) {
    return typeof priority === 'number' ? priority : 0.5;
  }

  _mergeGoals(existingGoals, newGoals) {
    const allGoals = [...existingGoals];
    const textSet = new Set(existingGoals.map(g => g.text.toLowerCase()));

    for (const goal of newGoals) {
      if (!textSet.has(goal.text.toLowerCase())) {
        allGoals.push(goal);
        textSet.add(goal.text.toLowerCase());
      }
    }

    this.stats.goalsExtracted += newGoals.length;
    return allGoals;
  }

  _extractGoalsFromLMResponse(response) {
    const goals = [];

    // Extract using common patterns
    goals.push(...this._extractWithPatterns(response));

    // If no matches from patterns, try line-based extraction
    if (goals.length === 0) {
      goals.push(...this._extractFromLines(response));
    }

    return goals;
  }

  _extractWithPatterns(response) {
    const goals = [];
    const patterns = [
      /(?:Goal|Task|Objective):\s*(.*?)(?:\n|$)/gi,
      /-\s*(?:Goal:)?\s*(.*?)(?:\n|$)/gi,
      /(?:\d+\.\s*|\*\s*)(.*?)(?:\n|$)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const text = match[1].trim();
        if (text && text.length > 3) {
          goals.push(this._createGoal(text, 'lm_extraction_fallback', 0.75));
        }
      }
    }

    return goals;
  }

  _extractFromLines(response) {
    const goals = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (this._isGoalLikeLine(trimmed)) {
        goals.push(this._createGoal(
          trimmed.replace(/^[-\*\d\.]\s*/, '').trim(),
          'lm_extraction_line',
          0.6
        ));
      }
    }

    return goals;
  }

  _isGoalLikeLine(line) {
    return line && (
      line.toLowerCase().includes('implement') ||
      line.toLowerCase().includes('create') ||
      line.toLowerCase().includes('build') ||
      line.toLowerCase().includes('develop') ||
      line.startsWith('- ') ||
      /^\d+\./.test(line)
    );
  }

  _createGoal(text, source, confidence) {
    return {
      text,
      source,
      confidence,
      priority: 0.5,
      timestamp: Date.now()
    };
  }

  async _readDocumentFromFile(filePath) {
    const fs = await import('fs/promises');
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  _parseJSONResponse(response) {
    try {
        // Updated regex to find JSON block within backticks, and handle optional "json" language specifier
        const match = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            return JSON.parse(match[1]);
        }

        // Fallback for responses that are not in a code block but are valid JSON
        const cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('[') && cleanedResponse.endsWith(']')) {
            return JSON.parse(cleanedResponse);
        }

        // Final attempt for JSON that might have leading/trailing text
        const jsonStartIndex = cleanedResponse.indexOf('[');
        const jsonEndIndex = cleanedResponse.lastIndexOf(']');
        if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            return JSON.parse(cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1));
        }

        Logger.warn('Could not find a valid JSON block in the LM response.');
        return []; // Return an empty array instead of null to prevent downstream errors
    } catch (error) {
        Logger.error('JSON parsing failed with error:', error);
        return []; // Return empty array on parsing error
    }
  }

  _extractGoalsFromJSONData(data, parentKey = '') {
    const goals = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        goals.push(...this._extractGoalsFromJSONData(item, parentKey));
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          for (const pattern of this.goalPatterns) {
            pattern.lastIndex = 0;
            const match = pattern.exec(value);
            if (match) {
              goals.push({
                text: match[1],
                source: `JSON:${parentKey}.${key}`,
                confidence: 0.8,
                priority: 0.5,
                timestamp: Date.now()
              });
              break;
            }
          }

          if (['name', 'description', 'title'].includes(key.toLowerCase())) {
            goals.push({
              text: value,
              source: `JSON:${parentKey}.${key}`,
              confidence: 0.6,
              priority: 0.5,
              timestamp: Date.now()
            });
          }
        } else {
          goals.push(...this._extractGoalsFromJSONData(value, `${parentKey}.${key}`));
        }
      }
    } else if (typeof data === 'string') {
      for (const pattern of this.goalPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(data);
        if (match) {
          goals.push({
            text: match[1],
            source: `JSON:${parentKey}`,
            confidence: 0.7,
            priority: 0.5,
            timestamp: Date.now()
          });
          break;
        }
      }
    }

    return goals;
  }

  async _analyzeDependencies(goals, options) {
    this.stats.dependenciesAnalyzed++;
    const dependencies = {};

    for (let i = 0; i < goals.length; i++) {
      const goalA = goals[i];
      dependencies[goalA.text] = [];

      for (let j = 0; j < goals.length; j++) {
        if (i === j) continue;
        const goalB = goals[j];

        if (this._checkDependency(goalA.text, goalB.text)) {
          dependencies[goalA.text].push(goalB.text);
        }
      }
    }

    if (this.lm && this.config.enableLMProcessing) {
      return await this._analyzeDependenciesWithLM(goals, dependencies, options);
    }

    return dependencies;
  }

  _checkDependency(goalA, goalB) {
    const goalLowerA = goalA.toLowerCase();
    const goalLowerB = goalB.toLowerCase();

    for (const keyword of this.dependencyKeywords) {
      if (goalLowerA.includes(keyword) && goalLowerB.includes(keyword.split(' ')[0])) {
        return true;
      }
    }

    const wordsA = goalLowerA.split(/\s+/);
    const wordsB = goalLowerB.split(/\s+/);
    const commonWords = wordsA.filter(word =>
      wordsB.includes(word) &&
      !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );

    return commonWords.length >= 2;
  }

  async _analyzeDependenciesWithLM(goals, existingDependencies, options) {
    this.stats.lmProcessings++;

    try {
      const goalsText = goals.map((g, i) => `Goal ${i + 1}: ${g.text}`).join('\n');
      const prompt = `Analyze dependencies between goals: ${goalsText}
Return as JSON object mapping goals to their dependencies array.`;

      const response = await this.lm.generateText(prompt, { temperature: 0.2, maxTokens: 600 });
      const dependencyAnalysis = this._parseJSONResponse(response) || {};

      const finalDependencies = { ...existingDependencies };
      for (const [goal, deps] of Object.entries(dependencyAnalysis)) {
        if (Array.isArray(deps)) {
          const actualGoal = goals.find(g => g.text.includes(goal) || goal.includes(g.text));
          if (actualGoal) {
            finalDependencies[actualGoal.text] = deps;
          } else {
            finalDependencies[goal] = deps;
          }
        }
      }

      return finalDependencies;
    } catch (error) {
      Logger.error('LM dependency analysis failed', error);
      return existingDependencies;
    }
  }

  async _prioritizeGoals(goals, dependencies, options) {
    if (this.htnPlanner) {
      for (const goal of goals) {
        try {
          const complexity = this._estimateGoalComplexity(goal.text, dependencies);
          goal.priority = Math.max(0.1, Math.min(1.0, 1.0 - (complexity * 0.3) + (goal.confidence * 0.4)));
        } catch (error) {
          goal.priority = goal.priority || 0.5;
        }
      }
    }

    return goals.sort((a, b) => b.priority - a.priority);
  }

  _estimateGoalComplexity(goalText, dependencies) {
    let complexity = 0.5;
    const dependencyCount = dependencies[goalText]?.length || 0;
    complexity += (dependencyCount * 0.2);

    if (goalText.length > 100) complexity += 0.2;

    const technicalKeywords = ['implement', 'develop', 'build', 'integrate', 'refactor', 'optimize', 'debug'];
    if (technicalKeywords.some(keyword => goalText.toLowerCase().includes(keyword))) {
      complexity += 0.2;
    }

    return Math.min(1.0, complexity);
  }

  convertGoalsToTasks(goals) {
    const tasks = [];

    for (const goal of goals) {
      tasks.push({
        term: `({SELF} * {${this._sanitizeTerm(goal.text)}})`,
        type: 'goal',
        punctuation: '!',
        truth: { frequency: goal.confidence, confidence: 0.9 },
        priority: goal.priority,
        creationTime: goal.timestamp,
        source: goal.source || 'PlanProcessor',
        metadata: {
          originalText: goal.text,
          extractedFrom: goal.source,
          confidence: goal.confidence
        }
      });

      this.stats.goalsConverted++;
    }

    return tasks;
  }

  _sanitizeTerm(text) {
    return text
      .replace(/[(){}<>,.!?]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async processToTasks(document, options = {}) {
    const result = await this.processDocument(document, null, options);
    const tasks = this.convertGoalsToTasks(result.goals);

    return {
      tasks,
      metadata: result.metadata,
      dependencies: result.dependencies
    };
  }

  getStats() {
    return {
      ...this.stats,
      confidenceThreshold: this.config.confidenceThreshold,
      maxGoals: this.config.maxGoals,
      lmEnabled: this.config.enableLMProcessing,
      hasLM: !!this.lm,
      hasHTNPlanner: !!this.htnPlanner
    };
  }

  resetStats() {
    this.stats = {
      documentsProcessed: 0, goalsExtracted: 0, goalsConverted: 0,
      dependenciesAnalyzed: 0, lmProcessings: 0
    };
  }
}

export default PlanProcessor;