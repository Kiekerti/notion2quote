# notion2quote

从 Notion 数据库导出进行中项目并通过文字 API 发送到 Quote 设备

## 功能

- 从 Notion 数据库获取"进行中"状态的项目
- 通过 dot. API 发送到 Quote 设备
- 显示待办事项总数
- 支持 Vercel 部署

## 配置

1. **本地运行**：
   - 打开 `.env` 文件
   - 填写以下配置：
     - `NOTION_API_KEY`: Notion API 密钥
     - `NOTION_DATABASE_ID`: Notion 数据库 ID
     - `DOT_API_KEY`: dot. API 密钥
     - `QUOTE_DEVICE_ID`: Quote 设备 ID

2. **Vercel 部署**：
   - 在 Vercel 项目设置中添加上述环境变量
   - 确保环境变量名称完全一致

## 运行

### 本地运行

```bash
npm start
```

### Vercel 部署

1. 推送代码到 GitHub 仓库
2. 在 Vercel 上导入该仓库
3. 配置环境变量
4. 部署完成后，访问 `https://your-vercel-app.vercel.app/api/sync` 触发同步

## 依赖

- @notionhq/client: Notion API 客户端
- axios: HTTP 请求库
- dotenv: 环境变量管理

## 项目结构

- `api/index.js`: Vercel API 入口文件
- `index.js`: 本地运行入口文件
- `.env`: 本地环境变量配置
- `.env.example`: 环境变量示例
- `vercel.json`: Vercel 配置文件
- `.gitignore`: Git 忽略文件

## 注意事项

- 请确保 Notion 数据库中有 "Status" 属性，且包含 "进行中" 选项
- 请确保 Notion 数据库中有 "Name" 属性用于存储项目标题
- Vercel 部署时，环境变量需要在 Vercel 控制台中设置
- 每次访问 `/api/sync` 端点都会触发一次同步操作
