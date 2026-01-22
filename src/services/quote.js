const axios = require('axios');
const { getConfig } = require('../config');
const { info, error } = require('../utils/logger');

/**
 * Quote 服务模块
 * 封装 Quote 设备 API 调用和消息发送逻辑
 */

/**
 * 格式化任务列表为消息文本
 * @param {Array} tasks 任务列表
 * @param {number} batchNumber 当前批次编号
 * @param {number} totalBatches 总批次数
 * @returns {string} 格式化后的消息文本
 */
function formatTasksMessage(tasks, batchNumber = 1, totalBatches = 1) {
  const config = getConfig();
  let tasksText = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  
  // 限制消息长度
  if (tasksText.length > config.app.maxMessageLength) {
    tasksText = tasksText.substring(0, config.app.maxMessageLength) + '...';
  }
  
  return tasksText;
}

/**
 * 构建发送到 Quote 设备的请求数据
 * @param {Array} tasks 任务列表
 * @param {number} batchNumber 当前批次编号
 * @param {number} totalBatches 总批次数
 * @param {number} totalTasks 总任务数
 * @returns {Object} 请求数据对象
 */
function buildRequestData(tasks, batchNumber = 1, totalBatches = 1, totalTasks = 0) {
  const taskCount = tasks.length;
  const tasksText = formatTasksMessage(tasks, batchNumber, totalBatches);
  
  return {
    refreshNow: true,
    title: `待办事项 (${batchNumber}/${totalBatches})`,
    message: tasksText,
    signature: `总共有 ${totalTasks} 个待办事项`,
    icon: '',
    link: 'https://www.notion.so/kieker/2a8935d95ce580109f12e9ce4edf114a?v=2aa935d95ce580d99ee9000c1cee44c5',
    taskKey: ''
  };
}

/**
 * 发送任务到 Quote 设备
 * @param {Array} tasks 任务列表
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendToQuoteDevice(tasks) {
  const config = getConfig();
  const requestData = buildRequestData(tasks);
  
  try {
    info('发送任务到 Quote 设备', { taskCount: tasks.length });
    
    const response = await axios.post(
      config.quote.apiEndpoint,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${config.quote.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.app.timeout
      }
    );
    
    // 验证响应
    if (response && (response.status === 200 || response.data.code === 200)) {
      info('发送成功！', { status: response.status });
      return true;
    } else {
      error('发送失败', { status: response?.status, data: response?.data });
      return false;
    }
  } catch (err) {
    error('发送到 Quote 设备时出错', { error: err.message });
    if (err.response) {
      // 服务器返回错误状态码
      error('响应状态错误', { status: err.response.status, data: err.response.data });
    } else if (err.request) {
      // 请求已发送但没有收到响应
      error('没有收到响应');
    }
    return false;
  }
}

/**
 * 分批发送任务到 Quote 设备
 * @param {Array} tasks 任务列表
 * @param {number} batchSize 每批任务数量
 * @returns {Promise<boolean>} 是否所有批次发送成功
 */
async function sendTasksInBatches(tasks, batchSize = 3) {
  const config = getConfig();
  const totalTasks = tasks.length;
  const totalBatches = Math.ceil(totalTasks / batchSize);
  
  info(`开始分批发送任务，共 ${totalTasks} 个任务，${totalBatches} 批，每批 ${batchSize} 个任务`);
  
  // 如果任务数量为 0，直接返回成功
  if (totalTasks === 0) {
    info('没有任务需要发送');
    return true;
  }
  
  // 获取当前应该发送的批次
  const currentBatch = getCurrentBatch(totalBatches);
  info(`当前应该发送的批次: ${currentBatch}/${totalBatches}`);
  
  // 计算当前批次的任务范围
  const startIndex = (currentBatch - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, totalTasks);
  const batchTasks = tasks.slice(startIndex, endIndex);
  
  info(`当前批次任务: ${batchTasks.length} 个`, { tasks: batchTasks });
  
  // 发送当前批次的任务
  const requestData = buildRequestData(batchTasks, currentBatch, totalBatches, totalTasks);
  
  try {
    info('发送批次任务到 Quote 设备', { 
      batch: currentBatch, 
      totalBatches, 
      taskCount: batchTasks.length 
    });
    
    const response = await axios.post(
      config.quote.apiEndpoint,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${config.quote.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.app.timeout
      }
    );
    
    // 验证响应
    if (response && (response.status === 200 || response.data.code === 200)) {
      info('批次发送成功！', { 
        batch: currentBatch, 
        status: response.status 
      });
      
      // 更新批次计数
      updateBatchCounter(currentBatch, totalBatches);
      
      return true;
    } else {
      error('批次发送失败', { 
        batch: currentBatch,
        status: response?.status, 
        data: response?.data 
      });
      return false;
    }
  } catch (err) {
    error('发送批次任务到 Quote 设备时出错', { 
      batch: currentBatch,
      error: err.message 
    });
    if (err.response) {
      // 服务器返回错误状态码
      error('响应状态错误', { status: err.response.status, data: err.response.data });
    } else if (err.request) {
      // 请求已发送但没有收到响应
      error('没有收到响应');
    }
    return false;
  }
}

/**
 * 获取当前应该发送的批次
 * @param {number} totalBatches 总批次数
 * @returns {number} 当前批次编号
 */
function getCurrentBatch(totalBatches) {
  // 使用日期作为种子，确保每天的批次顺序一致
  const today = new Date().toISOString().split('T')[0];
  const seed = parseInt(today.replace(/-/g, ''), 10);
  
  // 计算当前批次
  const currentBatch = (seed % totalBatches) + 1;
  return currentBatch;
}

/**
 * 更新批次计数器
 * 这里使用简单的内存存储，实际生产环境中可能需要使用持久化存储
 */
function updateBatchCounter(currentBatch, totalBatches) {
  // 这里可以实现持久化存储逻辑，例如使用 Redis 或文件存储
  // 目前使用内存存储，服务重启后会重置
  global.batchCounter = currentBatch;
}

module.exports = {
  sendToQuoteDevice,
  sendTasksInBatches,
  formatTasksMessage,
  buildRequestData
};
