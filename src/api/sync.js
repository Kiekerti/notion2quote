const { checkEnvVariables } = require('../config');
const { info, error, logRequest, logResponse } = require('../utils/logger');
const { catchAsync } = require('../utils/errorHandler');
const { addSyncTask } = require('../services/syncService');

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
  
  // 添加同步任务到队列（手动触发，不使用强制同步）
  const taskAdded = await addSyncTask({
    type: 'sync',
    forceSync: false,
    callback: (success) => {
      if (success) {
        const successMessage = '成功发送到 Quote 设备！';
        info(successMessage);
        // 只记录日志，不返回响应，因为已经返回了 202
      } else {
        const errorMessage = '发送到 Quote 设备失败';
        error(errorMessage);
        // 只记录日志，不返回响应，因为已经返回了 202
      }
    }
  });
  
  if (!taskAdded) {
    // 任务已存在或已处理，返回成功
    logResponse(res, 200, { 
      success: true, 
      message: '同步任务已在处理中'
    });
    return res.status(200).json({ 
      success: true, 
      message: '同步任务已在处理中'
    });
  }
  
  // 任务已添加到队列，返回接受状态
  logResponse(res, 202, { 
    success: true, 
    message: '同步任务已接受，正在处理'
  });
  return res.status(202).json({ 
    success: true, 
    message: '同步任务已接受，正在处理'
  });
});
