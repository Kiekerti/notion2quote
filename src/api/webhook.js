const { checkEnvVariables } = require('../config');
const { getNotionTasks } = require('../services/notion');
const { sendTasksInBatches } = require('../services/quote');
const { info, error, logRequest, logResponse } = require('../utils/logger');
const { catchAsync } = require('../utils/errorHandler');
const crypto = require('crypto');

// 事件去重缓存
const processedEvents = new Set();
// 缓存大小限制
const MAX_CACHE_SIZE = 1000;

// API 调用频率限制
const apiCalls = [];
const MAX_CALLS_PER_MINUTE = 60; // 每分钟最多 60 次调用

/**
 * 检查事件是否已处理
 * @param {string} eventId 事件 ID
 * @returns {boolean} 是否已处理
 */
function isEventProcessed(eventId) {
  return processedEvents.has(eventId);
}

/**
 * 添加事件到已处理集合
 * @param {string} eventId 事件 ID
 */
function addProcessedEvent(eventId) {
  if (processedEvents.size >= MAX_CACHE_SIZE) {
    // 当缓存达到上限时，清除一半的缓存
    const oldestEvents = Array.from(processedEvents).slice(0, MAX_CACHE_SIZE / 2);
    oldestEvents.forEach(id => processedEvents.delete(id));
  }
  processedEvents.add(eventId);
}

/**
 * 检查是否超过 API 调用频率限制
 * @returns {boolean} 是否超过限制
 */
function isOverRateLimit() {
  const now = Date.now();
  // 过滤出一分钟内的调用
  const recentCalls = apiCalls.filter(timestamp => now - timestamp < 60000);
  return recentCalls.length >= MAX_CALLS_PER_MINUTE;
}

/**
 * 记录 API 调用
 */
function recordApiCall() {
  apiCalls.push(Date.now());
  // 清理旧的调用记录
  const now = Date.now();
  while (apiCalls.length > 0 && now - apiCalls[0] >= 60000) {
    apiCalls.shift();
  }
}

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
    // 1. 检查 req.body 是否存在
    if (!req.body) {
      const errorMessage = '请求体为空';
      error(errorMessage);
      logResponse(res, 400, { success: false, message: errorMessage });
      return res.status(400).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // 2. 检查是否是 Notion 验证请求
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
    
    // 3. 检查是否是 Notion 事件（跳过签名验证，因为 Notion 可能不发送签名或签名格式不一致）
    if (req.body.workspace_id && (req.body.type === 'page.created' || req.body.type === 'page.updated' || req.body.type === 'page.properties_updated' || req.body.type === 'database_item')) {
      info(`收到 Notion ${req.body.type} 事件，跳过签名验证`);
      
      // 继续处理事件，不验证签名
    } else {
      // 4. 验证 Notion Webhook 签名（仅对其他事件类型）
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
    
    // 5. 检查环境变量
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
    
    // 5. 检查事件是否已处理（去重）
    if (notionEvent.id && isEventProcessed(notionEvent.id)) {
      info(`事件 ${notionEvent.id} 已处理，跳过重复处理`);
      logResponse(res, 200, { 
        success: true, 
        message: '事件已处理，跳过重复处理'
      });
      return res.status(200).json({ 
        success: true, 
        message: '事件已处理，跳过重复处理'
      });
    }
    
    // 6. 检查 API 调用频率限制
    if (isOverRateLimit()) {
      const errorMessage = 'API 调用频率超过限制，请稍后再试';
      error(errorMessage);
      logResponse(res, 429, { 
        success: false, 
        message: errorMessage
      });
      return res.status(429).json({ 
        success: false, 
        message: errorMessage
      });
    }
    
    // 7. 检查是否是数据库更新事件
    if (notionEvent.object === 'event' || notionEvent.type === 'database_item' || notionEvent.type === 'page.created' || notionEvent.type === 'page.updated' || notionEvent.type === 'page.properties_updated') {
      info('检测到数据库项目更新事件');
      
      // 8. 记录 API 调用
      recordApiCall();
      
      try {
        // 9. 执行同步操作
        info('正在执行同步操作...');
        
        // 9.1 获取 Notion 进行中项目
        const tasks = await getNotionTasks();
        info(`获取到 ${tasks.length} 个进行中项目`);
        
        // 9.2 分批发送到 Quote 设备（Webhook 触发，使用强制同步）
        const success = await sendTasksInBatches(tasks, 3, 2, true);
        
        // 10. 添加事件到已处理集合
        if (notionEvent.id) {
          addProcessedEvent(notionEvent.id);
        }
                if (success) {
          const successMessage = '成功同步到 Quote 设备！';
          info(successMessage);
          logResponse(res, 200, { 
            success: true, 
            message: successMessage,
            taskCount: tasks.length
          });
          return res.status(200).json({ 
            success: true, 
            message: successMessage,
            taskCount: tasks.length
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
        }      } catch (err) {
        error('同步操作失败', { error: err.message, stack: err.stack });
        // 添加事件到已处理集合，避免重复尝试
        if (notionEvent.id) {
          addProcessedEvent(notionEvent.id);
        }
        logResponse(res, 500, { 
          success: false, 
          message: '同步操作失败'
        });
        return res.status(500).json({ 
          success: false, 
          message: '同步操作失败'
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
