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
 * @returns {string} 格式化后的消息文本
 */
function formatTasksMessage(tasks) {
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
 * @returns {Object} 请求数据对象
 */
function buildRequestData(tasks) {
  const taskCount = tasks.length;
  const tasksText = formatTasksMessage(tasks);
  
  return {
    refreshNow: true,
    title: '待办事项',
    message: tasksText,
    signature: `总共有 ${taskCount} 个待办事项`,
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

module.exports = {
  sendToQuoteDevice,
  formatTasksMessage,
  buildRequestData
};
