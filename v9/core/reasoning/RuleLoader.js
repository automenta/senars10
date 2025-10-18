/**
 * @file core/reasoning/RuleLoader.js
 * @description Utility for loading and initializing reasoning rules.
 */

import { glob } from 'glob';
import path from 'path';
import { Logger } from '../base/utilities.js';

/**
 * Validates a loaded rule to ensure it meets the expected interface.
 * @param {object} rule - The rule object to validate
 * @returns {Array<string>} Array of validation error messages, empty if valid
 */
function validateRule(rule) {
  const errors = [];
  
  if (!rule) {
    errors.push('Rule is null or undefined');
    return errors;
  }
  
  if (!rule.id || typeof rule.id !== 'string') {
    errors.push('Rule must have a valid string ID');
  }
  
  if (typeof rule.apply !== 'function') {
    errors.push('Rule must have an apply method');
  }
  
  if (rule.type && !['nal', 'lm', 'general'].includes(rule.type)) {
    errors.push(`Rule type must be 'nal', 'lm', or 'general', got '${rule.type}'`);
  }
  
  // Validate NAL-specific requirements
  if (rule.type === 'nal' && typeof rule.performInference !== 'function' && typeof rule.apply !== 'function') {
    errors.push('NAL rule must have either performInference or apply method');
  }
  
  // Validate LM-specific requirements
  if (rule.type === 'lm' && typeof rule.executeLM !== 'function' && typeof rule.apply !== 'function') {
    errors.push('LM rule must have either executeLM or apply method');
  }
  
  return errors;
}

/**
 * Dynamically loads and initializes reasoning rules from a specified directory.
 *
 * @param {string} ruleDir - The directory to search for rule files.
 * @param {object} dependencies - An object containing dependencies to be injected into the rule constructors (e.g., { lm }).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of initialized rule instances.
 */
export async function loadRules(ruleDir, dependencies) {
  const rules = [];
  const loadErrors = [];
  
  try {
    const ruleFiles = await glob(`${ruleDir}/*.js`);
    Logger.info(`Found ${ruleFiles.length} rule files in ${ruleDir}: ${ruleFiles.map(f => path.basename(f)).join(', ')}`);

    for (const file of ruleFiles) {
      if (file.endsWith('RuleHelpers.js') || file.endsWith('index.js')) continue;

      try {
        const module = await import(file);
        const createRuleFn = Object.values(module).find(v => typeof v === 'function' && v.name.startsWith('create'));
        
        if (!createRuleFn) {
          Logger.warn(`No create function found in rule file: ${file}`);
          continue;
        }

        const rule = createRuleFn(dependencies);
        
        // Validate the rule after creation
        const validationErrors = validateRule(rule);
        if (validationErrors.length > 0) {
          Logger.error(`Validation failed for rule from ${file}:`, validationErrors.join('; '));
          loadErrors.push({
            file: file,
            ruleId: rule?.id || 'unknown',
            errors: validationErrors
          });
          continue;
        }
        
        rules.push(rule);
        Logger.info(`Successfully loaded and validated rule: ${rule.id} (type: ${rule.type || 'unknown'}) from ${path.basename(file)}`);
      } catch (loadError) {
        Logger.error(`Failed to load rule from ${file}:`, { error: loadError.message, stack: loadError.stack });
        loadErrors.push({
          file: file,
          error: loadError.message
        });
      }
    }
    
    if (loadErrors.length > 0) {
      Logger.warn(`Rule loading completed with ${loadErrors.length} errors. Loaded ${rules.length} rules successfully.`);
    } else {
      Logger.info(`Rule loading completed successfully. Loaded ${rules.length} rules.`);
    }
    
    return rules;
  } catch (directoryError) {
    Logger.error(`Failed to access rule directory ${ruleDir}:`, { error: directoryError.message });
    throw new Error(`Cannot access rule directory: ${directoryError.message}`);
  }
}

/**
 * Validates rules after loading to provide detailed validation reports.
 * @param {Array<object>} rules - Array of loaded rules to validate
 * @returns {object} Validation report with valid and invalid rules
 */
export function validateLoadedRules(rules) {
  const validRules = [];
  const invalidRules = [];
  
  for (const rule of rules) {
    const validationErrors = validateRule(rule);
    
    if (validationErrors.length === 0) {
      validRules.push(rule);
    } else {
      invalidRules.push({
        rule: rule,
        errors: validationErrors
      });
    }
  }
  
  return {
    valid: validRules,
    invalid: invalidRules,
    validCount: validRules.length,
    invalidCount: invalidRules.length,
    totalCount: rules.length
  };
}