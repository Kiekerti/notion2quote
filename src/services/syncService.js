const { getConfig } = require('../config');
const { getNotionTasks } = require('./notion');
const { sendTasksInBatches } = require('./quote');
const { info, error } = require('../utils/logger');

/**
 * 同步服务模块
 * 封装所有同步相关的公共逻辑，包括：
 * - 同步操作协调
 * - API 调用频率限制
 * - 任务队列管理
 * - 批次计算
 */

// API 调用频率限制
const apiCalls = [];
const MAX_CALLS_PER_MINUTE = 60; // 每分钟最多 60 次调用

// 同步任务队列
const syncQueue = [];
let isProcessingQueue = false;

// 事件去重缓存
const processedEvents = new Set();
const MAX_CACHE_SIZE = 1000;

/**
 * 检查事件是否已处理
 * @param {string} eventId 事件 ID
 * @returns {boolean} 是否已处理
 */
function isEventProcessed(eventId) {
  return processedEvents.has(eventId);
}

/**
 * 添加事件到已处理集合
 * @param {string} eventId 事件 ID
 */
function addProcessedEvent(eventId) {
  if (processedEvents.size >= MAX_CACHE_SIZE) {
    // 当缓存达到上限时，清除一半的缓存
    const oldestEvents = Array.from(processedEvents).slice(0, MAX_CACHE_SIZE / 2);
    oldestEvents.forEach(id => processedEvents.delete(id));
  }
  processedEvents.add(eventId);
}

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
 * 处理同步队列
 */
async function processSyncQueue() {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  try {
    while (syncQueue.length > 0) {
      // 优先处理强制同步任务
      const forceSyncTask = syncQueue.find(task => task.forceSync);
      const task = forceSyncTask || syncQueue.shift();

      // 如果找到了强制同步任务，从队列中移除它
      if (forceSyncTask) {
        const index = syncQueue.indexOf(forceSyncTask);
        if (index > -1) {
          syncQueue.splice(index, 1);
        }
      }

      info(`处理同步任务: ${task.type}, 强制同步: ${task.forceSync}`);

      try {
        // 检查 API 调用频率限制
        if (isOverRateLimit()) {
          info('API 调用频率超过限制，等待 1 秒后重试');
          await new Promise(resolve => setTimeout(resolve, 1000));
          // 将任务重新添加到队列
          syncQueue.unshift(task);
          continue;
        }

        // 记录 API 调用
        recordApiCall();

        // 1. 获取 Notion 进行中项目
        info('正在从 Notion 获取进行中项目...');
        const tasks = await getNotionTasks();
        info(`获取到 ${tasks.length} 个进行中项目`);

        // 2. 分批发送到 Quote 设备
        info('正在分批发送到 Quote 设备...');
        const success = await sendTasksInBatches(tasks, 3, 2, task.forceSync);

        if (success) {
          info('同步操作成功完成');
        } else {
          error('同步操作失败');
        }

        // 3. 添加事件到已处理集合（如果有事件 ID）
        if (task.eventId) {
          addProcessedEvent(task.eventId);
        }

        // 通知任务完成（如果有回调）
        if (task.callback) {
          task.callback(success);
        }
      } catch (err) {
        error('处理同步任务时出错', { error: err.message, stack: err.stack });
        // 通知任务失败（如果有回调）
        if (task.callback) {
          task.callback(false);
        }
      }

      // 任务之间添加小延迟，避免并发问题
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * 添加同步任务到队列
 * @param {Object} options 任务选项
 * @param {string} options.type 任务类型（webhook 或 sync）
 * @param {boolean} options.forceSync 是否强制同步
 * @param {string} [options.eventId] 事件 ID（用于去重）
 * @param {Function} [options.callback] 任务完成回调
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addSyncTask(options) {
  const { type, forceSync = false, eventId, callback } = options;

  // 检查事件是否已处理（仅对 webhook 事件）
  if (eventId && isEventProcessed(eventId)) {
    info(`事件 ${eventId} 已处理，跳过重复处理`);
    if (callback) {
      callback(true);
    }
    return false;
  }

  // 添加任务到队列
  syncQueue.push({
    type,
    forceSync,
    eventId,
    callback,
    timestamp: Date.now()
  });

  info(`添加同步任务到队列，当前队列长度: ${syncQueue.length}`);

  // 开始处理队列
  processSyncQueue();

  return true;
}

/**
 * 执行同步操作（直接执行，不通过队列）
 * @param {boolean} forceSync 是否强制同步
 * @returns {Promise<boolean>} 是否执行成功
 */
async function executeSync(forceSync = false) {
  // 检查 API 调用频率限制
  if (isOverRateLimit()) {
    error('API 调用频率超过限制');
    return false;
  }

  // 记录 API 调用
  recordApiCall();

  try {
    // 1. 获取 Notion 进行中项目
    info('正在从 Notion 获取进行中项目...');
    const tasks = await getNotionTasks();
    info(`获取到 ${tasks.length} 个进行中项目`);

    // 2. 分批发送到 Quote 设备
    info('正在分批发送到 Quote 设备...');
    const success = await sendTasksInBatches(tasks, 3, 2, forceSync);

    return success;
  } catch (err) {
    error('执行同步操作时出错', { error: err.message, stack: err.stack });
    return false;
  }
}

/**
 * 获取队列状态
 * @returns {Object} 队列状态
 */
function getQueueStatus() {
  return {
    queueLength: syncQueue.length,
    isProcessing: isProcessingQueue,
    recentApiCalls: apiCalls.length
  };
}

module.exports = {
  addSyncTask,
  executeSync,
  getQueueStatus,
  isOverRateLimit,
  recordApiCall,
  isEventProcessed,
  addProcessedEvent
};
