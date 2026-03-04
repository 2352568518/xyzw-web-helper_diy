// 前端配置
const config = {
  // API 配置
  api: {
    // 后端 API 地址
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    // 是否使用后端 API
    useBackend: import.meta.env.VITE_USE_BACKEND === 'true' || false,
    // API 超时时间
    timeout: 30000
  },
  // WebSocket 配置
  websocket: {
    // 心跳间隔
    heartbeatInterval: 5000,
    // 重连间隔
    reconnectInterval: 3000,
    // 最大重连次数
    maxReconnectAttempts: 5
  },
  // 任务配置
  task: {
    // 最大并发任务数
    maxConcurrentTasks: 3,
    // 任务执行间隔
    taskInterval: 1000
  },
  // 存储配置
  storage: {
    // 本地存储前缀
    prefix: 'xyzw_',
    // Token 过期时间（毫秒）
    tokenExpiry: 24 * 60 * 60 * 1000
  },
  // 日志配置
  log: {
    // 日志级别: error, warn, info, debug
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
};

export default config;