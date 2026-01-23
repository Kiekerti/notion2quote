const axios = require('axios');
const { getConfig } = require('../config');
const { info, error } = require('../utils/logger');

// 内存缓存，用于存储上次的任务哈希值
let lastTaskHash = null;
let lastSyncTime = null;

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
  let tasksText = tasks.map((task, index) => {
    // 限制任务文本长度为 11 个字，超出部分用...替代
    const limitedTask = task.length > 11 ? task.substring(0, 11) + '...' : task;
    return `${startIndex + index + 1}. ${limitedTask}`;
  }).join('\n');
  
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
  
  // 转换为北京时间（UTC+8）并格式化为 "21:15:27" 格式
  // 正确的北京时间计算：基于UTC时间加上8小时
  const utcTime = new Date(fetchTime);
  const beijingHours = (utcTime.getUTCHours() + 8) % 24;
  const beijingMinutes = utcTime.getUTCMinutes();
  const beijingSeconds = utcTime.getUTCSeconds();
  
  // 格式化时间字符串
  const formattedHours = beijingHours.toString().padStart(2, '0');
  const formattedMinutes = beijingMinutes.toString().padStart(2, '0');
  const formattedSeconds = beijingSeconds.toString().padStart(2, '0');
  const formattedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  
  return {
    refreshNow: true,
    title: `${totalTasks} 个待办事项`,
    message: tasksText,
    signature: `第 ${batchNumber} 页，共 ${totalBatches} 页 · ${formattedTime}`,
    icon: '',
    link: 'https://www.notion.so/kieker/2a8935d95ce580109f12e9ce4edf114a?v=2aa935d95ce580d99ee9000c1cee44c5',
    taskKey: ''
  };
}

/**
 * 发送任务到 Quote 设备
 * @param {Array} tasks 任务列表
 * @param {number} batchInterval 批次间隔时间（分钟）
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendToQuoteDevice(tasks, batchInterval = 3) {
  const config = getConfig();
  // 计算总任务数和批次数
  const totalTasks = tasks.length;
  const batchSize = 3; // 每批3个任务
  const totalBatches = Math.ceil(totalTasks / batchSize);
  
  // 计算当前批次
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  // 确保当前批次在有效范围内：1 到 totalBatches
  const currentBatch = Math.floor((minutesSinceMidnight / batchInterval) % totalBatches) + 1;
  
  info(`当前时间计算的批次: ${currentBatch}/${totalBatches}`);
  
  // 计算当前批次的任务范围
  const startIndex = (currentBatch - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, totalTasks);
  const batchTasks = tasks.slice(startIndex, endIndex);
  
  // 使用正确的参数构建请求数据，确保传递startIndex
  const requestData = buildRequestData(batchTasks, currentBatch, totalBatches, totalTasks, new Date(), startIndex);
  
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
 * 生成任务列表的哈希值，用于检测变更
 * @param {Array} tasks 任务列表
 * @returns {string} 任务列表的哈希值
 */
function generateTaskHash(tasks) {
  // 对任务列表进行排序，确保顺序一致
  const sortedTasks = [...tasks].sort();
  // 连接成一个字符串
  const taskString = sortedTasks.join('|');
  // 使用简单的哈希算法
  let hash = 0;
  for (let i = 0; i < taskString.length; i++) {
    const char = taskString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash.toString();
}

/**
 * 分批发送任务到 Quote 设备
 * @param {Array} tasks 任务列表
 * @param {number} batchSize 每批任务数量
 * @param {number} intervalMinutes 批次间隔时间（分钟）
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendTasksInBatches(tasks, batchSize = 3, intervalMinutes = 2) {
  info('开始同步操作');
  
  try {
    const config = getConfig();
    const totalTasks = tasks.length;
    const totalBatches = Math.ceil(totalTasks / batchSize);
    
    // 记录任务拉取时间
    const fetchTime = new Date();
    
    info(`开始分批发送任务，共 ${totalTasks} 个任务，${totalBatches} 批，每批 ${batchSize} 个任务`);
    
    // 如果任务数量为 0，更新哈希值并返回成功
    if (totalTasks === 0) {
      info('没有任务需要发送');
      // 更新哈希值，确保空任务列表也能被正确检测
      lastTaskHash = generateTaskHash([]);
      lastSyncTime = fetchTime;
      return true;
    }
    
    // 生成任务哈希值，用于检测变更
    const currentTaskHash = generateTaskHash(tasks);
    
    // 记录哈希值变化
    info(`任务哈希值变化: 上次=${lastTaskHash}, 当前=${currentTaskHash}`);
    
    // 检查任务是否有变更
    if (lastTaskHash === currentTaskHash) {
      info('任务列表没有变更，跳过同步操作');
      return true;
    }
    
    // 记录新的哈希值和同步时间
    lastTaskHash = currentTaskHash;
    lastSyncTime = fetchTime;
    
    // 根据当前时间计算应该显示的批次
    // 使用分钟数作为种子，每 intervalMinutes 分钟切换一次批次
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const batchInterval = intervalMinutes; // 使用传入的批次间隔时间
    const currentBatch = Math.floor((minutesSinceMidnight / batchInterval) % totalBatches) + 1;
    
    info(`当前时间计算的批次: ${currentBatch}/${totalBatches}`);
    
    // 计算当前批次的任务范围
    const startIndex = (currentBatch - 1) * batchSize;
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
  } catch (err) {
    error('分批发送任务时出错', { error: err.message });
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
