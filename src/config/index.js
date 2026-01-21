require('dotenv').config();

/**
 * 配置管理模块
 * 统一管理环境变量和应用配置
 */

/**
 * 必要的环境变量列表
 */
const REQUIRED_ENV_VARS = [
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'DOT_API_KEY',
  'QUOTE_DEVICE_ID'
];

/**
 * 检查环境变量是否配置完整
 * @returns {Object} 检查结果，包含是否成功和缺失的环境变量
 */
function checkEnvVariables() {
  const missingEnvs = REQUIRED_ENV_VARS.filter(env => !process.env[env]);
  
  return {
    success: missingEnvs.length === 0,
    missing: missingEnvs
  };
}

/**
 * 获取配置对象
 * @returns {Object} 配置对象
 */
function getConfig() {
  const envCheck = checkEnvVariables();
  
  if (!envCheck.success) {
    throw new Error(`缺少必要的环境变量: ${envCheck.missing.join(', ')}`);
  }
  
  return {
    notion: {
      apiKey: process.env.NOTION_API_KEY,
      databaseId: process.env.NOTION_DATABASE_ID
    },
    quote: {
      apiKey: process.env.DOT_API_KEY,
      deviceId: process.env.QUOTE_DEVICE_ID,
      apiEndpoint: `https://dot.mindreset.tech/api/authV2/open/device/${process.env.QUOTE_DEVICE_ID}/text`
    },
    app: {
      timeout: 10000, // 10秒超时
      maxMessageLength: 500 // 最大消息长度
    }
  };
}

module.exports = {
  checkEnvVariables,
  getConfig,
  REQUIRED_ENV_VARS
};