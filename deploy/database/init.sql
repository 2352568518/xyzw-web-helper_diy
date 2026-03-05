-- XYZW Web Helper 本地数据库初始化脚本
-- 适用于 PostgreSQL

-- 创建数据库（如果不存在）
-- CREATE DATABASE xyzw_helper;

-- 连接到数据库后执行以下语句

-- 1. tokens 表 - 存储游戏Token
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    ws_url TEXT,
    server VARCHAR(100),
    remark TEXT,
    level INTEGER DEFAULT 1,
    profession VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    source_url TEXT,
    import_method VARCHAR(50) DEFAULT 'manual',
    avatar TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tokens_is_active ON tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_sort_order ON tokens(sort_order);

-- 2. token_settings 表 - 存储Token相关设置
CREATE TABLE IF NOT EXISTS token_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_id, setting_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_token_settings_token_id ON token_settings(token_id);

-- 3. token_groups 表 - 存储Token分组
CREATE TABLE IF NOT EXISTS token_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_token_groups_sort_order ON token_groups(sort_order);

-- 4. tasks 表 - 存储定时任务
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    token_ids UUID[] DEFAULT '{}',
    run_type VARCHAR(20) DEFAULT 'daily',
    run_time VARCHAR(10) DEFAULT '08:00',
    cron_expression VARCHAR(100),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON tasks(next_run);

-- 5. task_executions 表 - 存储任务执行记录
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    steps JSONB DEFAULT '[]',
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_token_id ON task_executions(token_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_started_at ON task_executions(started_at);

-- 6. task_templates 表 - 存储任务模板
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_templates_type ON task_templates(type);

-- 7. connections 表 - 存储WebSocket连接状态
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'disconnected',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_connections_token_id ON connections(token_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- 8. global_settings 表 - 存储全局设置
CREATE TABLE IF NOT EXISTS global_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认全局设置
INSERT INTO global_settings (setting_key, setting_value, description)
VALUES 
    ('scheduler_enabled', '{"value": true}', '是否启用定时任务调度'),
    ('max_concurrent_tasks', '{"value": 5}', '最大并发任务数'),
    ('task_timeout', '{"value": 300000}', '任务超时时间(毫秒)')
ON CONFLICT (setting_key) DO NOTHING;

-- 创建更新时间自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为每个表添加更新时间触发器
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['tokens', 'token_settings', 'token_groups', 'tasks', 'task_templates', 'connections', 'global_settings'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- 完成
SELECT 'Database initialized successfully!' as status;
