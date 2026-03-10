import express from 'express';
import cors from 'cors';
import tokenRoutes from './api/tokens.js';
import taskRoutes from './api/tasks.js';
import testRoutes from './api/test.js';
import tokenSettingsRoutes from './api/tokenSettings.js';
import taskTemplatesRoutes from './api/taskTemplates.js';
import globalSettingsRoutes from './api/globalSettings.js';
import tokenGroupsRoutes from './api/tokenGroups.js';
import favoriteTasksRoutes from './api/favoriteTasks.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'xyzw-backend',
    uptime: process.uptime()
  });
});

// 保活接口（用于外部 cron 服务调用）
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'awake', 
    timestamp: new Date().toISOString(),
    scheduledTasks: global.taskService?.getTaskStats?.() || { scheduledTasks: 0 }
  });
});

// 简单 API Key 校验中间件
// 使用方式：在请求头中携带 X-API-Key，值为后端环境变量 API_KEY
// 如果没有显式配置 API_KEY（仍为默认值），则不启用校验，保持开发环境兼容
const apiKeyMiddleware = (req, res, next) => {
  const expected = config.security.apiKey;
  // 默认值视为未配置，为了避免误锁死服务，这种情况下不做校验
  if (!expected || expected === 'default-api-key') {
    return next();
  }

  const provided =
    req.header('x-api-key') ||
    req.header('X-API-Key') ||
    req.query.api_key;

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// API 路由（统一挂在 /api 下，并应用 API Key 保护）
app.use('/api', apiKeyMiddleware);
app.use('/api/tokens', tokenRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/test', testRoutes);
app.use('/api/token-settings', tokenSettingsRoutes);
app.use('/api/task-templates', taskTemplatesRoutes);
app.use('/api/global-settings', globalSettingsRoutes);
app.use('/api/token-groups', tokenGroupsRoutes);
app.use('/api/favorite-tasks', favoriteTasksRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;