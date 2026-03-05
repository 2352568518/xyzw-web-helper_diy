import express from 'express';
import cors from 'cors';
import tokenRoutes from './api/tokens.js';
import taskRoutes from './api/tasks.js';
import testRoutes from './api/test.js';
import tokenSettingsRoutes from './api/tokenSettings.js';
import taskTemplatesRoutes from './api/taskTemplates.js';
import globalSettingsRoutes from './api/globalSettings.js';
import { logger } from './utils/logger.js';

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

// API 路由
app.use('/api/tokens', tokenRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/test', testRoutes);
app.use('/api/token-settings', tokenSettingsRoutes);
app.use('/api/task-templates', taskTemplatesRoutes);
app.use('/api/global-settings', globalSettingsRoutes);

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