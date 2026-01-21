const { checkEnvVariables } = require('../config');
const { getNotionTasks } = require('../services/notion');
const { sendToQuoteDevice } = require('../services/quote');
const { info, error, logRequest, logResponse } = require('../utils/logger');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Vercel API 处理函数
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
module.exports = catchAsync(async (req, res) => {
  logRequest(req);
  info('开始执行 Notion 到 Quote 设备的同步...');
  
  // 检查环境变量
  const envCheck = checkEnvVariables();
  if (!envCheck.success) {
    const errorMessage = '环境变量配置不完整';
    error(errorMessage, { missing: envCheck.missing });
    logResponse(res, 500, { success: false, message: errorMessage });
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
  
  // 1. 获取 Notion 进行中项目
  info('正在从 Notion 获取进行中项目...');
  const tasks = await getNotionTasks();
  info(`获取到 ${tasks.length} 个进行中项目`, { tasks });
  
  // 2. 发送到 Quote 设备
  info('正在发送到 Quote 设备...');
  const success = await sendToQuoteDevice(tasks);
  
  if (success) {
    const successMessage = '成功发送到 Quote 设备！';
    info(successMessage);
    logResponse(res, 200, { 
      success: true, 
      message: successMessage,
      taskCount: tasks.length,
      tasks: tasks
    });
    return res.status(200).json({ 
      success: true, 
      message: successMessage,
      taskCount: tasks.length,
      tasks: tasks
    });
  } else {
    const errorMessage = '发送到 Quote 设备失败';
    error(errorMessage);
    logResponse(res, 500, { 
      success: false, 
      message: errorMessage
    });
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});