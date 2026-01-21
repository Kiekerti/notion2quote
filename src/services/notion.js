const { Client } = require('@notionhq/client');
const { getConfig } = require('../config');
const { info, error } = require('../utils/logger');

/**
 * Notion 服务模块
 * 封装 Notion API 调用和任务获取逻辑
 */

/**
 * 创建 Notion 客户端实例
 * @returns {Client} Notion 客户端实例
 */
function createNotionClient() {
  const config = getConfig();
  return new Client({ auth: config.notion.apiKey });
}

/**
 * 从 Notion 数据库获取进行中项目
 * @returns {Promise<Array>} 进行中项目列表
 */
async function getNotionTasks() {
  const config = getConfig();
  const notion = createNotionClient();
  const databaseId = config.notion.databaseId;

  try {
    // 先尝试获取数据库结构，了解实际的属性名
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });
    
    info('获取 Notion 数据库结构成功');
    
    // 使用正确的状态属性名：办理状态
    const statusProperty = '办理状态';
    
    // 使用正确的标题属性名：待办事项
    const titleProperty = '待办事项';
    
    // 检查状态属性是否存在
    if (!database.properties[statusProperty]) {
      error(`数据库中不存在状态属性: ${statusProperty}`);
      return [];
    }
    
    // 检查状态属性类型
    const statusPropertyType = database.properties[statusProperty].type;
    info(`状态属性类型: ${statusPropertyType}`);
    
    // 根据属性类型构建不同的过滤器
    let filter = {};
    if (statusPropertyType === 'select') {
      filter = {
        property: statusProperty,
        select: {
          equals: '进行中'
        }
      };
    } else if (statusPropertyType === 'status') {
      filter = {
        property: statusProperty,
        status: {
          equals: '进行中'
        }
      };
    } else if (statusPropertyType === 'rich_text') {
      filter = {
        property: statusProperty,
        rich_text: {
          contains: '进行中'
        }
      };
    } else {
      error(`不支持的状态属性类型: ${statusPropertyType}`);
      return [];
    }
    
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: filter
    });

    // 验证响应格式
    if (!response || !Array.isArray(response.results)) {
      error('Notion API 响应格式错误');
      return [];
    }

    const tasks = response.results.map(page => {
      // 检查属性类型并获取标题
      let title = '';
      if (page.properties[titleProperty].title) {
        // 如果是标题类型
        title = page.properties[titleProperty].title.map(t => t.plain_text).join('');
      } else if (page.properties[titleProperty].rich_text) {
        // 如果是富文本类型
        title = page.properties[titleProperty].rich_text.map(t => t.plain_text).join('');
      } else if (page.properties[titleProperty].select) {
        // 如果是选择类型
        title = page.properties[titleProperty].select?.name || '';
      } else if (page.properties[titleProperty].checkbox) {
        // 如果是复选框类型，获取页面标题
        title = page.properties.Name?.title?.map(t => t.plain_text).join('') || '';
      }
      
      return title;
    }).filter(title => title.trim() !== ''); // 过滤空标题
    
    info(`获取到 ${tasks.length} 个进行中项目`);
    return tasks;
  } catch (err) {
    error('从 Notion 获取任务时出错', { error: err.message });
    if (err.response) {
      error('Notion API 错误响应', { status: err.response.status });
    }
    return [];
  }
}

module.exports = {
  getNotionTasks,
  createNotionClient
};