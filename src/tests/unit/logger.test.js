/**
 * Logger 工具测试
 */

const { info, error, debug, warn, fatal, logRequest, logResponse } = require('../../utils/logger');

describe('Logger 工具测试', () => {
  test('info 函数应该正常工作', () => {
    // 测试 info 函数不会抛出错误
    expect(() => {
      info('测试信息日志');
    }).not.toThrow();
  });

  test('error 函数应该正常工作', () => {
    // 测试 error 函数不会抛出错误
    expect(() => {
      error('测试错误日志');
    }).not.toThrow();
  });

  test('debug 函数应该正常工作', () => {
    // 测试 debug 函数不会抛出错误
    expect(() => {
      debug('测试调试日志');
    }).not.toThrow();
  });

  test('warn 函数应该正常工作', () => {
    // 测试 warn 函数不会抛出错误
    expect(() => {
      warn('测试警告日志');
    }).not.toThrow();
  });

  test('fatal 函数应该正常工作', () => {
    // 测试 fatal 函数不会抛出错误
    expect(() => {
      fatal('测试致命错误日志');
    }).not.toThrow();
  });

  test('logRequest 函数应该正常工作', () => {
    // 测试 logRequest 函数不会抛出错误
    const mockReq = {
      method: 'GET',
      url: '/test',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      },
      ip: '127.0.0.1'
    };
    expect(() => {
      logRequest(mockReq);
    }).not.toThrow();
  });

  test('logResponse 函数应该正常工作', () => {
    // 测试 logResponse 函数不会抛出错误
    const mockRes = {};
    expect(() => {
      logResponse(mockRes, 200, {
        success: true,
        message: '测试响应',
        taskCount: 5
      });
    }).not.toThrow();
  });
});