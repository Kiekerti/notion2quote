/**
 * 错误处理工具模块
 * 统一管理错误处理逻辑和错误类型
 */

/**
 * 自定义错误类
 */
class AppError extends Error {
  /**
   * 创建应用错误实例
   * @param {string} message 错误消息
   * @param {number} statusCode HTTP 状态码
   * @param {string} code 错误代码
   * @param {boolean} isOperational 是否为操作错误
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误类型定义
 */
const ErrorTypes = {
  CONFIG_ERROR: { code: 'CONFIG_ERROR', statusCode: 500 },
  NOTION_API_ERROR: { code: 'NOTION_API_ERROR', statusCode: 500 },
  QUOTE_API_ERROR: { code: 'QUOTE_API_ERROR', statusCode: 500 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', statusCode: 400 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', statusCode: 500 }
};

/**
 * 处理异步函数错误的包装器
 * @param {Function} fn 异步函数
 * @returns {Function} 包装后的函数
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 全局错误处理中间件
 * @param {Error} err 错误对象
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {Function} next 下一个中间件
 */
function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.statusCode >= 400 && err.statusCode < 500 ? 'fail' : 'error';
  
  console.error('全局错误处理:', {
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    stack: err.stack
  });
  
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      statusCode: err.statusCode
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 创建配置错误
 * @param {string} message 错误消息
 * @returns {AppError} 配置错误实例
 */
function createConfigError(message) {
  return new AppError(
    message,
    ErrorTypes.CONFIG_ERROR.statusCode,
    ErrorTypes.CONFIG_ERROR.code
  );
}

/**
 * 创建 Notion API 错误
 * @param {string} message 错误消息
 * @returns {AppError} Notion API 错误实例
 */
function createNotionApiError(message) {
  return new AppError(
    message,
    ErrorTypes.NOTION_API_ERROR.statusCode,
    ErrorTypes.NOTION_API_ERROR.code
  );
}

/**
 * 创建 Quote API 错误
 * @param {string} message 错误消息
 * @returns {AppError} Quote API 错误实例
 */
function createQuoteApiError(message) {
  return new AppError(
    message,
    ErrorTypes.QUOTE_API_ERROR.statusCode,
    ErrorTypes.QUOTE_API_ERROR.code
  );
}

/**
 * 创建验证错误
 * @param {string} message 错误消息
 * @returns {AppError} 验证错误实例
 */
function createValidationError(message) {
  return new AppError(
    message,
    ErrorTypes.VALIDATION_ERROR.statusCode,
    ErrorTypes.VALIDATION_ERROR.code
  );
}

module.exports = {
  AppError,
  ErrorTypes,
  catchAsync,
  globalErrorHandler,
  createConfigError,
  createNotionApiError,
  createQuoteApiError,
  createValidationError
};