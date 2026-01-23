/**
 * Logger utility
 * Provides standardized logging with different levels and formats
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * Log level priorities
 */
const LOG_LEVEL_PRIORITIES = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.ERROR]: 3,
  [LOG_LEVELS.FATAL]: 4
};

/**
 * Logger class
 */
class Logger {
  /**
   * Create a new logger instance
   * @param {string} name Logger name
   */
  constructor(name = 'app') {
    this.name = name;
    this.logLevel = LOG_LEVELS.INFO;
  }

  /**
   * Check if a log level should be logged
   * @param {string} level Log level to check
   * @returns {boolean} Whether the level should be logged
   */
  shouldLog(level) {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.logLevel];
  }

  /**
   * Format a log message
   * @param {string} level Log level
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   * @returns {Object} Formatted log object
   */
  formatLog(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      meta,
      pid: process.pid
    };
  }

  /**
   * Log a debug message
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   */
  debug(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const logObj = this.formatLog(LOG_LEVELS.DEBUG, message, meta);
      console.log(JSON.stringify(logObj));
    }
  }

  /**
   * Log an info message
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   */
  info(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const logObj = this.formatLog(LOG_LEVELS.INFO, message, meta);
      console.log(JSON.stringify(logObj));
    }
  }

  /**
   * Log a warning message
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   */
  warn(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const logObj = this.formatLog(LOG_LEVELS.WARN, message, meta);
      console.warn(JSON.stringify(logObj));
    }
  }

  /**
   * Log an error message
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   */
  error(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const logObj = this.formatLog(LOG_LEVELS.ERROR, message, meta);
      console.error(JSON.stringify(logObj));
    }
  }

  /**
   * Log a fatal message
   * @param {string} message Log message
   * @param {Object} meta Metadata to include
   */
  fatal(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.FATAL)) {
      const logObj = this.formatLog(LOG_LEVELS.FATAL, message, meta);
      console.error(JSON.stringify(logObj));
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger();

/**
 * Create a new logger instance
 * @param {string} name Logger name
 * @returns {Logger} Logger instance
 */
function createLogger(name) {
  return new Logger(name);
}

/**
 * Log request details
 * @param {Object} req Express request object
 */
function logRequest(req) {
  defaultLogger.info('Request received', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    ip: req.ip
  });
}

/**
 * Log response details
 * @param {Object} res Express response object
 * @param {number} statusCode Response status code
 * @param {Object} data Response data
 */
function logResponse(res, statusCode, data) {
  defaultLogger.info('Response sent', {
    statusCode,
    data: {
      success: data.success,
      message: data.message,
      taskCount: data.taskCount
    }
  });
}

// Export all logger functions and utilities
module.exports = {
  debug: defaultLogger.debug.bind(defaultLogger),
  info: defaultLogger.info.bind(defaultLogger),
  warn: defaultLogger.warn.bind(defaultLogger),
  error: defaultLogger.error.bind(defaultLogger),
  fatal: defaultLogger.fatal.bind(defaultLogger),
  createLogger,
  LOG_LEVELS,
  logRequest,
  logResponse
};
