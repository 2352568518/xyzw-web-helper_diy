# Ubuntu 部署指南

本文档介绍如何在 Ubuntu 虚拟机上部署 XYZW Web Helper。

## 目录

- [环境要求](#环境要求)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [故障排除](#故障排除)

## 环境要求

- Ubuntu 20.04 LTS 或更高版本
- 至少 1GB RAM
- 至少 10GB 磁盘空间
- root 或 sudo 权限

## 快速部署

### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 创建工作目录
sudo mkdir -p /opt/xyzw-web-helper
```

### 2. 上传部署脚本

将 `deploy/deploy.sh` 上传到服务器：

```bash
# 方法1: 使用 scp (在本地执行)
scp deploy/deploy.sh root@your-server-ip:/opt/xyzw-web-helper/

# 方法2: 直接下载 (在服务器执行)
curl -o /opt/xyzw-web-helper/deploy.sh https://raw.githubusercontent.com/your-username/xyzw_web_helper_diy/main/deploy/deploy.sh
```

### 3. 修改配置

```bash
# 编辑部署脚本，修改以下变量
nano /opt/xyzw-web-helper/deploy.sh

# 需要修改的配置:
# GIT_REPO="https://github.com/your-username/xyzw_web_helper_diy.git"  # 你的仓库地址
# BRANCH="main"  # 分支名称
```

### 4. 执行安装

```bash
# 添加执行权限
chmod +x /opt/xyzw-web-helper/deploy.sh

# 执行安装
cd /opt/xyzw-web-helper
./deploy.sh install
```

### 5. 配置环境变量

```bash
# 编辑后端环境变量
nano /opt/xyzw-web-helper/backend/.env

# 填入你的 Supabase 配置:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
```

### 6. 重启服务

```bash
./deploy.sh restart
```

## 手动部署

如果需要手动部署，请按以下步骤操作：

### 1. 安装依赖

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx
```

### 2. 克隆代码

```bash
sudo mkdir -p /opt/xyzw-web-helper
cd /opt/xyzw-web-helper
sudo git clone https://github.com/your-username/xyzw_web_helper_diy.git .
```

### 3. 安装项目依赖

```bash
# 后端
cd /opt/xyzw-web-helper/backend
npm install

# 前端
cd /opt/xyzw-web-helper
npm install
```

### 4. 配置环境变量

```bash
# 后端
cp /opt/xyzw-web-helper/backend/.env.example /opt/xyzw-web-helper/backend/.env
nano /opt/xyzw-web-helper/backend/.env

# 前端
nano /opt/xyzw-web-helper/.env
```

### 5. 构建前端

```bash
cd /opt/xyzw-web-helper
npm run build
```

### 6. 配置 Nginx

```bash
sudo cp /opt/xyzw-web-helper/deploy/nginx.conf /etc/nginx/sites-available/xyzw-web-helper
sudo ln -s /etc/nginx/sites-available/xyzw-web-helper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 启动后端

```bash
cd /opt/xyzw-web-helper/backend
pm2 start server.js --name xyzw-backend
pm2 save
pm2 startup
```

## 配置说明

### 后端环境变量 (.env)

```env
# 服务配置
PORT=3001
NODE_ENV=production

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT 密钥
JWT_SECRET=your-random-secret-key
```

### 前端环境变量 (.env)

```env
# 后端API地址
VITE_API_URL=http://your-domain.com/api
VITE_USE_BACKEND=true
```

### Nginx 配置

修改 `/etc/nginx/sites-available/xyzw-web-helper`:

```nginx
server_name your-domain.com;  # 改为你的域名
```

## 常用命令

### 部署脚本命令

```bash
# 完整安装
./deploy.sh install

# 更新代码并重启
./deploy.sh update

# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs
./deploy.sh logs 200  # 指定行数
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
```

### Git 命令

```bash
# 查看当前版本
cd /opt/xyzw-web-helper
git log -1

# 查看远程更新
git fetch origin
git log HEAD..origin/main --oneline

# 回滚到指定版本
git checkout <commit-hash>
```

## 故障排除

### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3001
sudo lsof -i :80

# 杀死进程
sudo kill -9 <PID>
```

### 2. 权限问题

```bash
# 修改目录所有者
sudo chown -R $USER:$USER /opt/xyzw-web-helper

# 给予执行权限
chmod +x /opt/xyzw-web-helper/deploy.sh
```

### 3. 数据库连接失败

检查 `.env` 文件中的 Supabase 配置：

```bash
# 测试连接
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/
```

### 4. 前端页面空白

检查前端构建和 Nginx 配置：

```bash
# 重新构建
cd /opt/xyzw-web-helper
npm run build

# 检查 Nginx 配置
sudo nginx -t
```

### 5. 查看详细日志

```bash
# 后端日志
pm2 logs xyzw-backend --lines 500

# Nginx 访问日志
sudo tail -f /var/log/nginx/xyzw-access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/xyzw-error.log

# 系统日志
sudo journalctl -u nginx -f
```

## HTTPS 配置 (可选)

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

## 备份与恢复

### 备份

```bash
# 创建备份目录
mkdir -p /backup/xyzw-web-helper

# 备份配置文件
cp /opt/xyzw-web-helper/backend/.env /backup/xyzw-web-helper/backend.env
cp /opt/xyzw-web-helper/.env /backup/xyzw-web-helper/frontend.env

# 备份数据库 (如果使用本地数据库)
# pg_dump xyzw_db > /backup/xyzw-web-helper/db_backup.sql
```

### 恢复

```bash
# 恢复配置文件
cp /backup/xyzw-web-helper/backend.env /opt/xyzw-web-helper/backend/.env
cp /backup/xyzw-web-helper/frontend.env /opt/xyzw-web-helper/.env

# 重启服务
./deploy.sh restart
```

## 自动更新 (可选)

创建定时任务自动更新：

```bash
# 编辑 crontab
crontab -e

# 添加以下内容 (每天凌晨3点检查更新)
0 3 * * * cd /opt/xyzw-web-helper && ./deploy.sh update >> /var/log/xyzw-update.log 2>&1
```

---

如有问题，请查看日志或提交 Issue。
