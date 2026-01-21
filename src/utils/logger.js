/**
 * 日志工具模块
 * 提供统一的日志接口和不同级别的日志输出
 */

/**
 * 日志级别
 */
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * 当前日志级别
 */
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * 设置日志级别
 * @param {string} level 日志级别
 */
function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
  }
}

/**
 * 获取当前日志级别
 * @returns {string} 当前日志级别
 */
function getLogLevel() {
  return currentLogLevel;
}

/**
 * 检查日志级别是否应该输出
 * @param {string} level 日志级别
 * @returns {boolean} 是否应该输出
 */
function shouldLog(level) {
  const levelOrder = [LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN, LOG_LEVELS.ERROR];
  return levelOrder.indexOf(level) >= levelOrder.indexOf(currentLogLevel);
}

/**
 * 生成带时间戳的日志消息
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} meta 附加元数据
 * @returns {string} 格式化的日志消息
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

/**
 * 调试级别日志
 * @param {string} message 日志消息
 * @param {Object} meta 附加元数据
 */
function debug(message, meta = {}) {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.debug(formatLogMessage(LOG_LEVELS.DEBUG, message, meta));
  }
}

/**
 * 信息级别日志
 * @param {string} message 日志消息
 * @param {Object} meta 附加元数据
 */
function info(message, meta = {}) {
  if (shouldLog(LOG_LEVELS.INFO)) {
    console.info(formatLogMessage(LOG_LEVELS.INFO, message, meta));
  }
}

/**
 * 警告级别日志
 * @param {string} message 日志消息
 * @param {Object} meta 附加元数据
 */
function warn(message, meta = {}) {
  if (shouldLog(LOG_LEVELS.WARN)) {
    console.warn(formatLogMessage(LOG_LEVELS.WARN, message, meta));
  }
}

/**
 * 错误级别日志
 * @param {string} message 日志消息
 * @param {Object} meta 附加元数据
 */
function error(message, meta = {}) {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    console.error(formatLogMessage(LOG_LEVELS.ERROR, message, meta));
  }
}

/**
 * 记录 API 请求日志
 * @param {Object} req 请求对象
 */
function logRequest(req) {
  info('API 请求', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
}

/**
 * 记录 API 响应日志
 * @param {Object} res 响应对象
 * @param {number} statusCode 状态码
 * @param {Object} data 响应数据
 */
function logResponse(res, statusCode, data) {
  info('API 响应', {
    statusCode,
    data
  });
}

module.exports = {
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warn,
  error,
  logRequest,
  logResponse,
  LOG_LEVELS
};