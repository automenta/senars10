/**
 * Data transformation utilities
 * Provides consistent data formatting and validation across server operations
 */

import MessageUtils from '../messageUtils.js';

export class DataTransformer {
  static transformTask(task) {
    return MessageUtils.formatTaskData(task);
  }

  static transformConcept(concept) {
    return MessageUtils.formatConceptData(concept);
  }

  static transformTasks(tasks) {
    return Array.isArray(tasks) ? tasks.map(task => this.transformTask(task)).filter(Boolean) : [];
  }

  static transformConcepts(concepts) {
    return Array.isArray(concepts) ? concepts.map(concept => this.transformConcept(concept)).filter(Boolean) : [];
  }

  static validateTaskData(data) {
    const errors = [];

    if (!data.content || typeof data.content !== 'string') {
      errors.push('Task content is required and must be a string');
    }

    if (data.priority !== undefined && (data.priority < 0 || data.priority > 1)) {
      errors.push('Task priority must be between 0 and 1');
    }

    if (data.type && !['belief', 'goal', 'question'].includes(data.type.toLowerCase())) {
      errors.push('Task type must be belief, goal, or question');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeTaskData(data) {
    return {
      content: String(data.content || ''),
      priority: Math.max(0, Math.min(1, parseFloat(data.priority) || 0.5)),
      type: data.type || 'belief',
      status: data.status || 'pending'
    };
  }

  static validateConceptData(data) {
    const errors = [];

    if (!data.term || typeof data.term !== 'string') {
      errors.push('Concept term is required and must be a string');
    }

    if (data.priority !== undefined && (data.priority < 0 || data.priority > 1)) {
      errors.push('Concept priority must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeConceptData(data) {
    return {
      term: String(data.term || ''),
      priority: Math.max(0, Math.min(1, parseFloat(data.priority) || 0)),
      type: data.type || 'concept'
    };
  }

  static createResponse(success, data = null, error = null) {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };
  }

  static createPaginatedResponse(items, page, limit, total) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default DataTransformer;