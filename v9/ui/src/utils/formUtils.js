/**
 * Form utilities for validation and input handling - optimized for performance
 */

// Validation rule configuration for DRY principle
const VALIDATION_RULES = {
  task: {
    content: { required: true, maxLength: 500 },
    priority: { min: 0, max: 1 }
  },
  concept: {
    name: { required: true }
  }
};

/**
 * Generic validation function using configuration
 */
const validateField = (value, rules) => {
  const errors = [];

  if (rules.required && (!value || value.trim().length === 0)) {
    errors.push(`${value} is required`);
  }

  if (rules.maxLength && value && value.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }

  if (rules.min !== undefined && value < rules.min) {
    errors.push(`Minimum value is ${rules.min}`);
  }

  if (rules.max !== undefined && value > rules.max) {
    errors.push(`Maximum value is ${rules.max}`);
  }

  return errors;
};

/**
 * Validates a task input based on common rules
 */
export const validateTask = (task) => {
  const errors = [];

  if (!task) return { isValid: false, errors: ['Task is required'] };

  errors.push(...validateField(task.content, VALIDATION_RULES.task.content));

  if (task.priority !== undefined) {
    errors.push(...validateField(task.priority, VALIDATION_RULES.task.priority));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a concept input
 */
export const validateConcept = (concept) => {
  const errors = [];

  if (!concept) return { isValid: false, errors: ['Concept is required'] };

  errors.push(...validateField(concept.name, VALIDATION_RULES.concept.name));

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Optimized input change handlers with better error handling
 */
export const inputHandlers = {
  handleNumericChange: (e, setter, min = null, max = null) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value)) {
      if (e.target.value === '') {
        setter(min ?? 0);
      }
      return;
    }

    const clampedValue = min !== null && value < min ? min :
                        max !== null && value > max ? max : value;
    setter(clampedValue);
  },

  handleStringChange: (e, setter) => {
    setter(e.target.value);
  },

  handleToggleChange: (e, setter) => {
    setter(e.target.checked);
  }
};
