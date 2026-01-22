/**
 * ErrorHandler 工具测试
 */

const { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, RateLimitError, ExternalApiError, errorHandler, catchAsync } = require('../../utils/errorHandler');

describe('ErrorHandler 工具测试', () => {
  test('AppError 应该正常创建', () => {
    const error = new AppError('测试错误', 500);
    expect(error.message).toBe('测试错误');
    expect(error.statusCode).toBe(500);
    expect(error.status).toBe('error');
    expect(error.isOperational).toBe(true);
  });

  test('ValidationError 应该正常创建', () => {
    const error = new ValidationError('验证失败');
    expect(error.message).toBe('验证失败');
    expect(error.statusCode).toBe(400);
  });

  test('UnauthorizedError 应该正常创建', () => {
    const error = new UnauthorizedError('未授权');
    expect(error.message).toBe('未授权');
    expect(error.statusCode).toBe(401);
  });

  test('ForbiddenError 应该正常创建', () => {
    const error = new ForbiddenError('禁止访问');
    expect(error.message).toBe('禁止访问');
    expect(error.statusCode).toBe(403);
  });

  test('NotFoundError 应该正常创建', () => {
    const error = new NotFoundError('资源未找到');
    expect(error.message).toBe('资源未找到');
    expect(error.statusCode).toBe(404);
  });

  test('RateLimitError 应该正常创建', () => {
    const error = new RateLimitError('速率限制');
    expect(error.message).toBe('速率限制');
    expect(error.statusCode).toBe(429);
  });

  test('ExternalApiError 应该正常创建', () => {
    const error = new ExternalApiError('外部API错误');
    expect(error.message).toBe('外部API错误');
    expect(error.statusCode).toBe(503);
  });

  test('catchAsync 应该正常工作', () => {
    const mockFn = async () => {
      return '测试结果';
    };
    
    const wrappedFn = catchAsync(mockFn);
    expect(typeof wrappedFn).toBe('function');
  });

  test('errorHandler 应该正常工作', () => {
    const mockReq = {};
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockNext = jest.fn();
    
    const error = new AppError('测试错误', 500);
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: '测试错误',
        status: 'error'
      }
    });
  });
});