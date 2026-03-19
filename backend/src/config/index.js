export const config = {
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 10000,
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT) || 60000
  },
  task: {
    maxActiveConnections: parseInt(process.env.MAX_ACTIVE_CONNECTIONS) || 3,
    retryCount: parseInt(process.env.TASK_RETRY_COUNT) || 5
  },
  security: {
    apiKey: process.env.API_KEY || 'default-api-key'
  },
  log: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
