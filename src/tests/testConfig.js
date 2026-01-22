/**
 * 测试配置文件
 * 统一管理测试环境和配置
 */

const { getConfig } = require('../src/config');

/**
 * 测试配置
 */
const testConfig = {
  ...getConfig(),
  // 测试环境特定配置
  test: {
    timeout: 5000,
    retryCount: 3
  }
};

/**
 * 获取测试配置
 * @returns {Object} 测试配置对象
 */
function getTestConfig() {
  return testConfig;
}

module.exports = {
  getTestConfig
};