const { checkEnvVariables } = require('../config');
const { info, error, logRequest, logResponse } = require('../utils/logger');
const { catchAsync } = require('../utils/errorHandler');
const { executeSync } = require('../services/syncService');

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
  
  // 直接执行同步操作（手动触发）
  const success = await executeSync();
  
  if (success) {
    const successMessage = '成功发送到 Quote 设备！';
    info(successMessage);
    logResponse(res, 200, { success: true, message: successMessage });
    return res.status(200).json({ 
      success: true, 
      message: successMessage
    });
  } else {
    const errorMessage = '发送到 Quote 设备失败';
    error(errorMessage);
    logResponse(res, 500, { success: false, message: errorMessage });
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});
