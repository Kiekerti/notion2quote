const { checkEnvVariables } = require('../config');
const { getNotionTasks } = require('../services/notion');
const { sendToQuoteDevice } = require('../services/quote');
const { info, error, logRequest, logResponse } = require('../utils/logger');
const { catchAsync } = require('../utils/errorHandler');
const crypto = require('crypto');

/**
 * 验证 Notion Webhook 签名
 * @param {string} signature Notion 签名
 * @param {string} payload 请求体
 * @returns {boolean} 是否验证成功
 */
function verifyNotionSignature(signature, payload) {
  // 从环境变量获取 Webhook 密钥
  const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    error('缺少 NOTION_WEBHOOK_SECRET 环境变量');
    return false;
  }
  
  // 提取签名值（去掉 sha256= 前缀）
  const signatureValue = signature.startsWith('sha256=') ? signature.substring('sha256='.length) : signature;
  
  // 计算 HMAC-SHA256 签名
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(payload, 'utf8');
  const digest = hmac.digest('hex');
  
  // 比较签名
  return signatureValue === digest;
}

/**
 * Notion Webhook 处理函数
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
module.exports = catchAsync(async (req, res) => {
  logRequest(req);
  info('收到 Notion Webhook 事件...');
  
  try {
    // 1. 检查是否是 Notion 验证请求
    if (req.body.type === 'block.created' && req.body.data?.block?.type === 'paragraph' && req.body.data?.block?.paragraph?.rich_text?.[0]?.text?.content) {
      const verificationToken = req.body.data.block.paragraph.rich_text[0].text.content;
      info(`收到 Notion 验证请求，验证令牌: ${verificationToken}`);
      logResponse(res, 200, { success: true, message: '验证请求处理成功', token: verificationToken });
      return res.status(200).json({ 
        success: true, 
        message: '验证请求处理成功',
        token: verificationToken
      });
    }
    
    // 2. 检查是否是 page.properties_updated 事件（Notion 可能不发送签名）
    if (req.body.type === 'page.properties_updated' && req.body.workspace_id) {
      info('收到 Notion 页面属性更新事件，跳过签名验证');
      
      // 继续处理事件，不验证签名
    } else {
      // 3. 验证 Notion Webhook 签名
      const signature = req.headers['x-notion-signature'];
      const payload = JSON.stringify(req.body);
      
      if (!signature || !verifyNotionSignature(signature, payload)) {
        const errorMessage = '无效的 Notion Webhook 签名';
        error(errorMessage);
        logResponse(res, 401, { success: false, message: errorMessage });
        return res.status(401).json({ 
          success: false, 
          message: errorMessage
        });
      }
    }
    
    // 3. 检查环境变量
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
    
    // 4. 解析 Notion Webhook 数据
    const notionEvent = req.body;
    info('Notion 事件数据:', notionEvent);
    
    // 5. 检查是否是数据库更新事件
    if (notionEvent.object === 'event' || notionEvent.type === 'database_item' || notionEvent.type === 'page.created' || notionEvent.type === 'page.updated' || notionEvent.type === 'page.properties_updated') {
      info('检测到数据库项目更新事件');
      
      // 6. 执行同步操作
      info('正在执行同步操作...');
      
      // 6.1 获取 Notion 进行中项目
      const tasks = await getNotionTasks();
      info(`获取到 ${tasks.length} 个进行中项目`, { tasks });
      
      // 6.2 发送到 Quote 设备
      const success = await sendToQuoteDevice(tasks);
      
      if (success) {
        const successMessage = '成功同步到 Quote 设备！';
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
        const errorMessage = '同步到 Quote 设备失败';
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
    } else {
      // 不是我们关心的事件类型，返回成功但不执行同步
      const message = '收到非数据库更新事件，跳过同步';
      info(message);
      logResponse(res, 200, { 
        success: true, 
        message: message
      });
      return res.status(200).json({ 
        success: true, 
        message: message
      });
    }
  } catch (err) {
    error('Webhook 处理错误', { error: err.message, stack: err.stack });
    logResponse(res, 500, { 
      success: false, 
      message: '服务器内部错误'
    });
    return res.status(500).json({ 
      success: false, 
      message: '服务器内部错误'
    });
  }
});
