#!/bin/bash

# XYZW Web Helper 一键部署脚本（本地数据库版本）
# 用法: ./deploy-local.sh [命令]

set -e

APP_NAME="xyzw-web-helper"
APP_DIR="/opt/xyzw-web-helper"
GIT_REPO="https://github.com/mengchunzhi/xyzw-web-helper_diy.git"
BRANCH="main"

# 数据库配置
DB_NAME="xyzw_helper"
DB_USER="postgres"
DB_PASSWORD="your_secure_password"  # 请修改！

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# ==================== 安装 PostgreSQL ====================
install_postgresql() {
    log_info "安装 PostgreSQL..."
    
    # 安装 PostgreSQL
    apt-get install -y postgresql postgresql-contrib
    
    # 启动服务
    systemctl start postgresql
    systemctl enable postgresql
    
    log_success "PostgreSQL 安装完成"
}

# ==================== 配置数据库 ====================
setup_database() {
    log_info "配置数据库..."
    
    # 创建数据库和用户
    sudo -u postgres psql << EOF
-- 创建数据库
CREATE DATABASE ${DB_NAME};

-- 创建用户（如果不存在）
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- 连接到数据库并授权
\c ${DB_NAME}

-- 授权 schema 权限
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF

    # 修改 PostgreSQL 配置允许密码认证
    sed -i "s/local\s*all\s*all\s*peer/local all all md5/" /etc/postgresql/*/main/pg_hba.conf
    
    # 重启 PostgreSQL
    systemctl restart postgresql
    
    log_success "数据库配置完成"
}

# ==================== 初始化数据表 ====================
init_tables() {
    log_info "初始化数据表..."
    
    # 使用初始化脚本
    export PGPASSWORD="${DB_PASSWORD}"
    psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f ${APP_DIR}/deploy/database/init.sql
    
    log_success "数据表初始化完成"
}

# ==================== 安装系统依赖 ====================
install_dependencies() {
    log_info "安装系统依赖..."
    
    apt-get update
    apt-get install -y curl wget git nginx postgresql postgresql-contrib
    
    # 安装 Node.js 20.x
    if ! command -v node &> /dev/null; then
        log_info "安装 Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # 安装 PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        npm install -g pm2
    fi
    
    log_success "系统依赖安装完成"
}

# ==================== 克隆代码 ====================
clone_repo() {
    log_info "克隆代码仓库..."
    
    if [[ -d "$APP_DIR" ]]; then
        log_warning "目录 $APP_DIR 已存在"
        read -p "是否删除并重新克隆? (y/n): " confirm
        if [[ $confirm == "y" || $confirm == "Y" ]]; then
            rm -rf "$APP_DIR"
        else
            log_info "跳过克隆"
            return
        fi
    fi
    
    git clone -b "$BRANCH" "$GIT_REPO" "$APP_DIR"
    log_success "代码克隆完成"
}

# ==================== 安装项目依赖 ====================
install_project() {
    log_info "安装项目依赖..."
    
    cd "$APP_DIR/backend"
    npm install
    
    cd "$APP_DIR"
    npm install
    
    log_success "项目依赖安装完成"
}

# ==================== 构建前端 ====================
build_frontend() {
    log_info "构建前端..."
    
    cd "$APP_DIR"
    npm run build
    
    log_success "前端构建完成"
}

# ==================== 配置环境变量 ====================
setup_env() {
    log_info "配置环境变量..."
    
    cd "$APP_DIR/backend"
    
    # 生成随机 JWT 密钥
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOF
# 使用本地数据库
USE_LOCAL_DB=true

# 数据库配置
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# 服务配置
PORT=3001
NODE_ENV=production

# JWT 密钥
JWT_SECRET=${JWT_SECRET}

# 日志级别
LOG_LEVEL=info

# 请求速率限制
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGINS=http://localhost,http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ip')
EOF
    
    cd "$APP_DIR"
    
    cat > .env << EOF
# 后端API地址
VITE_API_URL=http://localhost:3001
VITE_USE_BACKEND=true
EOF
    
    log_success "环境变量配置完成"
}

# ==================== 配置 Nginx ====================
setup_nginx() {
    log_info "配置 Nginx..."
    
    cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 前端静态文件
    location / {
        root /opt/xyzw-web-helper/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 支持
        proxy_read_timeout 86400;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
}
EOF
    
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    
    log_success "Nginx 配置完成"
}

# ==================== 配置防火墙 ====================
setup_firewall() {
    log_info "配置防火墙..."
    
    ufw --force enable
    ufw allow ssh
    ufw allow 'Nginx Full'
    
    log_success "防火墙配置完成"
}

# ==================== 启动服务 ====================
start_service() {
    log_info "启动服务..."
    
    cd "$APP_DIR/backend"
    pm2 delete xyzw-backend 2>/dev/null || true
    pm2 start server.js --name xyzw-backend
    pm2 save
    pm2 startup | bash || true
    
    systemctl reload nginx
    
    log_success "服务启动完成"
}

# ==================== 停止服务 ====================
stop_service() {
    log_info "停止服务..."
    pm2 stop xyzw-backend 2>/dev/null || true
    log_success "服务已停止"
}

# ==================== 重启服务 ====================
restart_service() {
    log_info "重启服务..."
    pm2 restart xyzw-backend 2>/dev/null || start_service
    log_success "服务已重启"
}

# ==================== 查看状态 ====================
show_status() {
    echo ""
    echo "========== 服务状态 =========="
    pm2 status
    echo ""
    echo "========== PostgreSQL 状态 =========="
    systemctl status postgresql --no-pager
    echo ""
    echo "========== Nginx 状态 =========="
    systemctl status nginx --no-pager
}

# ==================== 查看日志 ====================
show_logs() {
    local lines=${1:-100}
    pm2 logs xyzw-backend --lines "$lines"
}

# ==================== 更新代码 ====================
update_code() {
    log_info "更新代码..."
    
    cd "$APP_DIR"
    
    # 保存配置
    cp backend/.env backend/.env.bak
    cp .env .env.bak
    
    # 拉取最新代码
    git fetch origin
    git reset --hard origin/$BRANCH
    
    # 恢复配置
    cp backend/.env.bak backend/.env
    cp .env.bak .env
    
    # 安装依赖
    cd "$APP_DIR/backend"
    npm install
    
    cd "$APP_DIR"
    npm install
    npm run build
    
    # 重启服务
    pm2 restart xyzw-backend
    
    log_success "代码更新完成"
}

# ==================== 完整安装 ====================
full_install() {
    check_root
    
    log_info "开始完整安装（本地数据库版本）..."
    
    install_dependencies
    install_postgresql
    clone_repo
    setup_database
    init_tables
    install_project
    setup_env
    build_frontend
    setup_nginx
    setup_firewall
    start_service
    
    echo ""
    log_success "=========================================="
    log_success "安装完成!"
    log_success "=========================================="
    echo ""
    log_info "访问地址: http://$(curl -s ifconfig.me || echo 'your-server-ip')"
    echo ""
    log_info "数据库信息:"
    log_info "  数据库名: ${DB_NAME}"
    log_info "  用户名: ${DB_USER}"
    log_info "  密码: ${DB_PASSWORD}"
    echo ""
    log_warning "请修改数据库密码: sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'new_password';\""
    log_warning "并更新 ${APP_DIR}/backend/.env 中的 DB_PASSWORD"
    echo ""
    log_info "常用命令:"
    log_info "  ./deploy-local.sh update   - 更新代码并重启"
    log_info "  ./deploy-local.sh restart  - 重启服务"
    log_info "  ./deploy-local.sh logs     - 查看日志"
    log_info "  ./deploy-local.sh status   - 查看状态"
}

# ==================== 主入口 ====================
case "${1:-}" in
    install)
        full_install
        ;;
    update)
        check_root
        update_code
        ;;
    start)
        check_root
        start_service
        ;;
    stop)
        check_root
        stop_service
        ;;
    restart)
        check_root
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-100}"
        ;;
    db-init)
        check_root
        init_tables
        ;;
    *)
        echo "用法: $0 {install|update|start|stop|restart|status|logs|db-init}"
        echo ""
        echo "命令说明:"
        echo "  install  - 完整安装（首次部署，包含数据库）"
        echo "  update   - 更新代码并重启"
        echo "  start    - 启动服务"
        echo "  stop     - 停止服务"
        echo "  restart  - 重启服务"
        echo "  status   - 查看服务状态"
        echo "  logs     - 查看日志"
        echo "  db-init  - 重新初始化数据库表"
        exit 1
        ;;
esac
