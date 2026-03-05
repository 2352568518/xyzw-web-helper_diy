-- 创建 tokens 表
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  ws_url TEXT,
  server VARCHAR(255),
  remark TEXT,
  import_method VARCHAR(50),
  source_url TEXT,
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 token_settings 表（每个账号的任务设置）
CREATE TABLE IF NOT EXISTS token_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(token_id)
);

-- 创建 task_templates 表（任务模板）
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 tasks 表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  token_ids UUID[] DEFAULT '{}',
  run_type VARCHAR(50) DEFAULT 'daily',
  run_time VARCHAR(10) DEFAULT '00:00',
  cron_expression VARCHAR(100) DEFAULT '0 0 * * *',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 task_executions 表
CREATE TABLE IF NOT EXISTS task_executions (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  token_id UUID REFERENCES tokens(id),
  status VARCHAR(50) DEFAULT 'running',
  result JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建 connections 表
CREATE TABLE IF NOT EXISTS connections (
  token_id UUID PRIMARY KEY REFERENCES tokens(id),
  status VARCHAR(50) DEFAULT 'disconnected',
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 global_settings 表（全局设置）
CREATE TABLE IF NOT EXISTS global_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认全局设置
INSERT INTO global_settings (id, settings) 
VALUES ('default', '{
  "boxCount": 100,
  "fishCount": 100,
  "recruitCount": 100,
  "defaultBoxType": 2001,
  "defaultFishType": 1,
  "tokenListColumns": 2,
  "useGoldRefreshFallback": false,
  "commandDelay": 500,
  "taskDelay": 500,
  "actionDelay": 300,
  "battleDelay": 500,
  "refreshDelay": 1000,
  "longDelay": 3000,
  "maxActive": 2,
  "carMinColor": 4,
  "connectionTimeout": 10000,
  "reconnectDelay": 1000,
  "maxLogEntries": 1000,
  "enableRefresh": false,
  "refreshInterval": 360,
  "smartDepartureGoldThreshold": 0,
  "smartDepartureRecruitThreshold": 0,
  "smartDepartureJadeThreshold": 0,
  "smartDepartureTicketThreshold": 0,
  "smartDepartureMatchAll": false
}')
ON CONFLICT (id) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tokens_is_active ON tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_token_id ON task_executions(token_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_token_settings_token_id ON token_settings(token_id);
