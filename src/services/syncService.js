const { getNotionTasks } = require('./notion');
const { sendTasksInBatches } = require('./quote');
const { info, error } = require('../utils/logger');

/**
 * 同步服务模块
 * 封装所有同步相关的公共逻辑，包括：
 * - 同步操作协调
 * - API 调用频率限制
 * - 批次计算
 */

// API 调用频率限制
const apiCalls = [];
const MAX_CALLS_PER_MINUTE = 60; // 每分钟最多 60 次调用

/**
 * 检查是否超过 API 调用频率限制
 * @returns {boolean} 是否超过限制
 */
function isOverRateLimit() {
  const now = Date.now();
  // 过滤出一分钟内的调用
  const recentCalls = apiCalls.filter(timestamp => now - timestamp < 60000);
  return recentCalls.length >= MAX_CALLS_PER_MINUTE;
}

/**
 * 记录 API 调用
 */
function recordApiCall() {
  apiCalls.push(Date.now());
  // 清理旧的调用记录
  const now = Date.now();
  while (apiCalls.length > 0 && now - apiCalls[0] >= 60000) {
    apiCalls.shift();
  }
}

/**
 * 执行同步操作
 * @returns {Promise<boolean>} 是否执行成功
 */
async function executeSync() {
  info('开始执行同步操作...');
  
  try {
    // 检查 API 调用频率限制
    if (isOverRateLimit()) {
      error('API 调用频率超过限制');
      return false;
    }

    // 记录 API 调用
    recordApiCall();

    // 1. 获取 Notion 进行中项目
    info('正在从 Notion 获取进行中项目...');
    const tasks = await getNotionTasks();
    info(`获取到 ${tasks.length} 个进行中项目`);

    // 2. 分批发送到 Quote 设备
    info('正在分批发送到 Quote 设备...');
    const success = await sendTasksInBatches(tasks, 3, 2);

    if (success) {
      info('同步操作成功完成');
    } else {
      error('同步操作失败');
    }

    return success;
  } catch (err) {
    error('执行同步操作时出错', { error: err.message, stack: err.stack });
    return false;
  }
}

module.exports = {
  executeSync,
  isOverRateLimit,
  recordApiCall
};
