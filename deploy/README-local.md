# Ubuntu 本地数据库部署指南

本文档介绍如何在 Ubuntu 虚拟机上部署 XYZW Web Helper，使用本地 PostgreSQL 数据库。

## 目录

- [环境要求](#环境要求)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [数据库管理](#数据库管理)
- [常用命令](#常用命令)
- [故障排除](#故障排除)

## 环境要求

- Ubuntu 20.04 LTS 或更高版本
- 至少 2GB RAM
- 至少 20GB 磁盘空间
- root 或 sudo 权限

## 快速部署

### 一键安装

```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/mengchunzhi/xyzw-web-helper_diy/main/deploy/deploy-local.sh
chmod +x deploy-local.sh

# 执行安装
sudo ./deploy-local.sh install
```

### 安装后配置

```bash
# 1. 修改数据库密码
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '你的新密码';"

# 2. 更新后端配置
sudo nano /opt/xyzw-web-helper/backend/.env
# 修改 DB_PASSWORD 为新密码

# 3. 重启服务
sudo ./deploy-local.sh restart
```

## 手动部署

### 1. 安装系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git nginx

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 2. 配置 PostgreSQL

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE xyzw_helper;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE xyzw_helper TO postgres;
\c xyzw_helper
GRANT ALL ON SCHEMA public TO postgres;
EOF

# 修改认证方式
sudo sed -i "s/local\s*all\s*all\s*peer/local all all md5/" /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql
```

### 3. 克隆代码

```bash
sudo git clone https://github.com/mengchunzhi/xyzw-web-helper_diy.git /opt/xyzw-web-helper
cd /opt/xyzw-web-helper
```

### 4. 初始化数据库

```bash
# 设置密码环境变量
export PGPASSWORD="your_password"

# 执行初始化脚本
psql -h localhost -U postgres -d xyzw_helper -f deploy/database/init.sql
```

### 5. 安装项目依赖

```bash
# 后端依赖
cd /opt/xyzw-web-helper/backend
sudo npm install

# 前端依赖
cd /opt/xyzw-web-helper
sudo npm install
```

### 6. 配置环境变量

```bash
# 后端配置
sudo tee /opt/xyzw-web-helper/backend/.env << EOF
USE_LOCAL_DB=true
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/xyzw_helper
DB_HOST=localhost
DB_PORT=5432
DB_NAME=xyzw_helper
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
EOF

# 前端配置
sudo tee /opt/xyzw-web-helper/.env << EOF
VITE_API_URL=http://localhost:3001
VITE_USE_BACKEND=true
EOF
```

### 7. 构建前端

```bash
cd /opt/xyzw-web-helper
sudo npm run build
```

### 8. 配置 Nginx

```bash
sudo tee /etc/nginx/sites-available/xyzw-web-helper << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        root /opt/xyzw-web-helper/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/xyzw-web-helper /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 9. 启动后端服务

```bash
cd /opt/xyzw-web-helper/backend
sudo pm2 start server.js --name xyzw-backend
sudo pm2 save
sudo pm2 startup | sudo bash
```

### 10. 配置防火墙

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 数据库管理

### 连接数据库

```bash
# 使用 psql 连接
psql -h localhost -U postgres -d xyzw_helper

# 或使用 sudo
sudo -u postgres psql -d xyzw_helper
```

### 常用 SQL 命令

```sql
-- 查看所有表
\dt

-- 查看 tokens 表结构
\d tokens

-- 查询所有 tokens
SELECT id, name, server, is_active FROM tokens;

-- 查看任务列表
SELECT id, name, type, is_active, next_run FROM tasks;

-- 查看执行日志
SELECT * FROM task_executions ORDER BY started_at DESC LIMIT 10;
```

### 备份数据库

```bash
# 创建备份目录
mkdir -p /backup/xyzw

# 备份数据库
pg_dump -h localhost -U postgres xyzw_helper > /backup/xyzw/db_backup_$(date +%Y%m%d).sql

# 压缩备份
gzip /backup/xyzw/db_backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
# 解压并恢复
gunzip /backup/xyzw/db_backup_20240101.sql.gz
psql -h localhost -U postgres xyzw_helper < /backup/xyzw/db_backup_20240101.sql
```

## 常用命令

### 部署脚本命令

```bash
# 完整安装
sudo ./deploy-local.sh install

# 更新代码并重启
sudo ./deploy-local.sh update

# 重启服务
sudo ./deploy-local.sh restart

# 查看状态
sudo ./deploy-local.sh status

# 查看日志
sudo ./deploy-local.sh logs
sudo ./deploy-local.sh logs 200  # 指定行数

# 重新初始化数据库表
sudo ./deploy-local.sh db-init
```

### PM2 命令

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs xyzw-backend

# 重启
pm2 restart xyzw-backend

# 停止
pm2 stop xyzw-backend

# 监控
pm2 monit
```

### PostgreSQL 命令

```bash
# 启动
sudo systemctl start postgresql

# 停止
sudo systemctl stop postgresql

# 重启
sudo systemctl restart postgresql

# 查看状态
sudo systemctl status postgresql

# 查看日志
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Nginx 命令

```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx

# 重启
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
```

## 故障排除

### 1. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U postgres -d xyzw_helper

# 检查密码认证
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"

# 重置密码
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'new_password';"
```

### 2. 后端服务无法启动

```bash
# 查看详细日志
pm2 logs xyzw-backend --lines 500

# 检查端口占用
sudo lsof -i :3001

# 检查环境变量
cat /opt/xyzw-web-helper/backend/.env
```

### 3. 前端页面空白

```bash
# 检查构建文件
ls -la /opt/xyzw-web-helper/dist/

# 重新构建
cd /opt/xyzw-web-helper
sudo npm run build

# 检查 Nginx 配置
sudo nginx -t
```

### 4. 定时任务不执行

```bash
# 检查后端日志
pm2 logs xyzw-backend | grep -i "task\|cron\|schedule"

# 检查数据库中的任务
psql -h localhost -U postgres -d xyzw_helper -c "SELECT * FROM tasks WHERE is_active = true;"

# 检查系统时间
date
timedatectl
```

## 自动更新

创建定时任务自动更新代码：

```bash
# 编辑 crontab
crontab -e

# 添加以下内容 (每天凌晨3点检查更新)
0 3 * * * cd /opt/xyzw-web-helper && ./deploy/deploy-local.sh update >> /var/log/xyzw-update.log 2>&1
```

## 安全建议

1. **修改默认密码**:
   ```bash
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD '强密码';"
   ```

2. **配置防火墙**:
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **定期更新系统**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **启用 HTTPS** (可选):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

如有问题，请查看日志或提交 Issue。
