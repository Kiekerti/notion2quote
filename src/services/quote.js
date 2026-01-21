const axios = require('axios');
const { getConfig } = require('../config');

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
    link: '',
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
    console.log(`使用 API 端点: ${config.quote.apiEndpoint}`);
    console.log(`设备 ID: ${config.quote.deviceId}`);
    console.log('请求数据:', requestData);
    
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
      console.log('发送成功！');
      console.log('响应状态:', response.status);
      console.log('响应数据:', response.data);
      return true;
    } else {
      console.log('发送失败:', response?.status, response?.data);
      return false;
    }
  } catch (error) {
    console.error('Error sending to Quote device:', error.message);
    if (error.response) {
      // 服务器返回错误状态码
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到响应:', error.request);
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message);
    }
    return false;
  }
}

module.exports = {
  sendToQuoteDevice,
  formatTasksMessage,
  buildRequestData
};