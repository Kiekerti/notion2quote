const axios = require('axios');
const { getConfig } = require('../config');
const { info, error } = require('../utils/logger');

// 同步锁，确保同一时间只有一个同步操作在执行
let syncLock = false;
let currentSyncId = 0;

/**
 * Quote 服务模块
 * 封装 Quote 设备 API 调用和消息发送逻辑
 */

/**
 * 格式化任务列表为消息文本
 * @param {Array} tasks 任务列表
 * @param {number} batchNumber 当前批次编号
 * @param {number} totalBatches 总批次数
 * @param {number} startIndex 任务起始索引
 * @returns {string} 格式化后的消息文本
 */
function formatTasksMessage(tasks, batchNumber = 1, totalBatches = 1, startIndex = 0) {
  const config = getConfig();
  // 使用起始索引确保任务编号在整个列表中是唯一的
  let tasksText = tasks.map((task, index) => `${startIndex + index + 1}. ${task}`).join('\n');
  
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
 * @param {Date} fetchTime 任务拉取时间
 * @param {number} startIndex 任务起始索引
 * @returns {Object} 请求数据对象
 */
function buildRequestData(tasks, batchNumber = 1, totalBatches = 1, totalTasks = 0, fetchTime = new Date(), startIndex = 0) {
  const taskCount = tasks.length;
  const tasksText = formatTasksMessage(tasks, batchNumber, totalBatches, startIndex);
  
  // 转换为北京时间（UTC+8）并格式化为 "9:15:22" 格式
  const beijingTime = new Date(fetchTime.getTime() + 8 * 60 * 60 * 1000);
  const hours = beijingTime.getHours();
  const minutes = beijingTime.getMinutes().toString().padStart(2, '0');
  const seconds = beijingTime.getSeconds().toString().padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  
  return {
    refreshNow: true,
    title: `待办事项 (${batchNumber}/${totalBatches})`,
    message: tasksText,
    signature: `${totalTasks} 个 · ${formattedTime}`,
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
 * @param {number} intervalMinutes 批次间隔时间（分钟）
 * @param {boolean} forceSync 是否强制同步（Webhook 触发时使用）
 * @returns {Promise<boolean>} 是否所有批次发送成功
 */
async function sendTasksInBatches(tasks, batchSize = 3, intervalMinutes = 2, forceSync = false) {
  // 生成新的同步 ID
  const syncId = ++currentSyncId;
  info(`开始同步操作，ID: ${syncId}, 强制同步: ${forceSync}`);
  
  // 检查是否有同步操作正在执行
  if (syncLock && !forceSync) {
    info('有同步操作正在执行，跳过本次操作');
    return true;
  }
  
  // 如果是强制同步且有操作正在执行，先释放锁
  if (forceSync && syncLock) {
    info('强制同步，释放现有锁');
    syncLock = false;
  }
  
  // 获取锁
  syncLock = true;
  
  try {
    const config = getConfig();
    const totalTasks = tasks.length;
    const totalBatches = Math.ceil(totalTasks / batchSize);
    
    // 计算动态切换时间：15分钟除以总页数再除以3
    const totalPages = totalBatches;
    const dynamicIntervalMinutes = 15 / totalPages / 3;
    const dynamicIntervalSeconds = Math.max(Math.floor(dynamicIntervalMinutes * 60), 5); // 最小5秒
    
    // 记录任务拉取时间
    const fetchTime = new Date();
    
    info(`开始分批发送任务，共 ${totalTasks} 个任务，${totalBatches} 批，每批 ${batchSize} 个任务，动态间隔 ${dynamicIntervalSeconds} 秒`);
    
    // 如果任务数量为 0，直接返回成功
    if (totalTasks === 0) {
      info('没有任务需要发送');
      return true;
    }
    
    // 存储所有批次的发送结果
    const results = [];
    
    // 循环 3 次显示所有批次
    for (let loop = 0; loop < 3; loop++) {
      info(`开始第 ${loop + 1} 轮循环`);
      
      // 遍历所有批次，依次发送
      for (let i = 0; i < totalBatches; i++) {
        const currentBatch = i + 1;
        
        // 计算当前批次的任务范围
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, totalTasks);
        const batchTasks = tasks.slice(startIndex, endIndex);
        
        info(`当前批次任务: ${batchTasks.length} 个 (${currentBatch}/${totalBatches})`, { tasks: batchTasks });
        
        // 发送当前批次的任务
        const requestData = buildRequestData(batchTasks, currentBatch, totalBatches, totalTasks, fetchTime, startIndex);
        
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
            results.push(true);
          } else {
            error('批次发送失败', { 
              batch: currentBatch,
              status: response?.status, 
              data: response?.data 
            });
            results.push(false);
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
          results.push(false);
        }
        
        // 如果不是最后一批，等待动态计算的间隔时间
        if (currentBatch < totalBatches) {
          info(`等待 ${dynamicIntervalSeconds} 秒后发送下一批次...`);
          await new Promise(resolve => setTimeout(resolve, dynamicIntervalSeconds * 1000));
        }
      }
      
      // 如果不是最后一轮，等待一个批次的间隔时间
      if (loop < 2) {
        info(`等待 ${dynamicIntervalSeconds} 秒后开始下一轮循环...`);
        await new Promise(resolve => setTimeout(resolve, dynamicIntervalSeconds * 1000));
      }
    }
    
    // 检查所有批次是否都发送成功
    const allSuccess = results.every(result => result === true);
    info(`所有批次发送完成，成功率: ${results.filter(r => r).length}/${results.length}`);
    
    return allSuccess;
  } catch (err) {
    error('分批发送任务时出错', { error: err.message });
    return false;
  } finally {
    // 释放锁
    syncLock = false;
    info('同步锁已释放');
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
