/**
 * Validation utilities
 * Provides validation functions and schemas for input validation
 */

const { ValidationError } = require('../utils/errorHandler');

/**
 * Validate that a value is not empty
 * @param {*} value Value to validate
 * @param {string} fieldName Field name for error message
 * @returns {*} The validated value
 * @throws {ValidationError} If value is empty
 */
function validateRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validate that a value is a string
 * @param {*} value Value to validate
 * @param {string} fieldName Field name for error message
 * @returns {string} The validated string
 * @throws {ValidationError} If value is not a string
 */
function validateString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  return value;
}

/**
 * Validate that a value is a number
 * @param {*} value Value to validate
 * @param {string} fieldName Field name for error message
 * @returns {number} The validated number
 * @throws {ValidationError} If value is not a number
 */
function validateNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  return num;
}

/**
 * Validate that a value is an array
 * @param {*} value Value to validate
 * @param {string} fieldName Field name for error message
 * @returns {Array} The validated array
 * @throws {ValidationError} If value is not an array
 */
function validateArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
  return value;
}

/**
 * Validate that a value is an object
 * @param {*} value Value to validate
 * @param {string} fieldName Field name for error message
 * @returns {Object} The validated object
 * @throws {ValidationError} If value is not an object
 */
function validateObject(value, fieldName) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`);
  }
  return value;
}

/**
 * Validate that a string is within length limits
 * @param {string} value Value to validate
 * @param {number} min Minimum length
 * @param {number} max Maximum length
 * @param {string} fieldName Field name for error message
 * @returns {string} The validated string
 * @throws {ValidationError} If string length is outside limits
 */
function validateLength(value, min, max, fieldName) {
  validateString(value, fieldName);
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
  }
  return value;
}

/**
 * Validate that a number is within range
 * @param {number} value Value to validate
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @param {string} fieldName Field name for error message
 * @returns {number} The validated number
 * @throws {ValidationError} If number is outside range
 */
function validateRange(value, min, max, fieldName) {
  const num = validateNumber(value, fieldName);
  if (num < min || num > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

/**
 * Validate webhook request
 * @param {Object} req Express request object
 * @throws {ValidationError} If validation fails
 */
function validateWebhookRequest(req) {
  validateRequired(req.body, 'Request body');
  
  // Validate Notion webhook structure
  if (req.body.type === 'block.created') {
    validateRequired(req.body.data, 'Event data');
    validateRequired(req.body.data.block, 'Block data');
  }
  
  if (req.body.object === 'event' || req.body.type === 'database_item') {
    validateRequired(req.body.workspace_id, 'Workspace ID');
  }
}

/**
 * Validate sync request
 * @param {Object} req Express request object
 * @throws {ValidationError} If validation fails
 */
function validateSyncRequest(req) {
  // Sync request doesn't require body parameters
  // But we can validate query parameters if needed
  if (req.query.batchSize) {
    validateRange(req.query.batchSize, 1, 10, 'Batch size');
  }
}

module.exports = {
  validateRequired,
  validateString,
  validateNumber,
  validateArray,
  validateObject,
  validateLength,
  validateRange,
  validateWebhookRequest,
  validateSyncRequest
};
