/**
 * HTTP client utilities
 * Provides standardized HTTP client functionality
 */

const axios = require('axios');
const { info, error } = require('./logger');
const { ExternalApiError } = require('./errorHandler');

/**
 * Create a standardized axios instance
 * @param {Object} config Configuration options
 * @returns {Object} Axios instance
 */
function createHttpClient(config = {}) {
  return axios.create({
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    },
    ...config
  });
}

/**
 * Make a GET request
 * @param {string} url Request URL
 * @param {Object} options Request options
 * @returns {Promise<Object>} Response data
 */
async function get(url, options = {}) {
  const client = createHttpClient(options);
  
  try {
    info(`Making GET request to ${url}`);
    const response = await client.get(url, options);
    info(`GET request to ${url} successful`, { status: response.status });
    return response.data;
  } catch (err) {
    error(`GET request to ${url} failed`, { error: err.message });
    throw new ExternalApiError(`Failed to get ${url}: ${err.message}`);
  }
}

/**
 * Make a POST request
 * @param {string} url Request URL
 * @param {Object} data Request data
 * @param {Object} options Request options
 * @returns {Promise<Object>} Response data
 */
async function post(url, data, options = {}) {
  const client = createHttpClient(options);
  
  try {
    info(`Making POST request to ${url}`);
    const response = await client.post(url, data, options);
    info(`POST request to ${url} successful`, { status: response.status });
    return response.data;
  } catch (err) {
    error(`POST request to ${url} failed`, { error: err.message });
    throw new ExternalApiError(`Failed to post to ${url}: ${err.message}`);
  }
}

/**
 * Make a PUT request
 * @param {string} url Request URL
 * @param {Object} data Request data
 * @param {Object} options Request options
 * @returns {Promise<Object>} Response data
 */
async function put(url, data, options = {}) {
  const client = createHttpClient(options);
  
  try {
    info(`Making PUT request to ${url}`);
    const response = await client.put(url, data, options);
    info(`PUT request to ${url} successful`, { status: response.status });
    return response.data;
  } catch (err) {
    error(`PUT request to ${url} failed`, { error: err.message });
    throw new ExternalApiError(`Failed to put to ${url}: ${err.message}`);
  }
}

/**
 * Make a DELETE request
 * @param {string} url Request URL
 * @param {Object} options Request options
 * @returns {Promise<Object>} Response data
 */
async function del(url, options = {}) {
  const client = createHttpClient(options);
  
  try {
    info(`Making DELETE request to ${url}`);
    const response = await client.delete(url, options);
    info(`DELETE request to ${url} successful`, { status: response.status });
    return response.data;
  } catch (err) {
    error(`DELETE request to ${url} failed`, { error: err.message });
    throw new ExternalApiError(`Failed to delete ${url}: ${err.message}`);
  }
}

module.exports = {
  createHttpClient,
  get,
  post,
  put,
  delete: del
};
