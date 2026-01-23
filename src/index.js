const { checkEnvVariables } = require('./config');
const { executeSync } = require('./services/syncService');
const { info, error } = require('./utils/logger');

/**
 * 主函数，执行整个流程
 */
async function main() {
  info('开始执行 Notion 到 Quote 设备的同步...');
  
  // 检查环境变量
  const envCheck = checkEnvVariables();
  if (!envCheck.success) {
    error('环境变量配置不完整，无法继续', { missing: envCheck.missing });
    return;
  }
  
  try {
    // 执行同步操作
    const success = await executeSync();
    
    if (success) {
      info('成功发送到 Quote 设备！');
    } else {
      error('发送到 Quote 设备失败');
    }
  } catch (err) {
    error('执行过程中发生错误', { error: err.message, stack: err.stack });
  }
}

// 执行主函数
main();