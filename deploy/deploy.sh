#!/bin/bash

# XYZW Web Helper 一键部署脚本
# 用法: ./deploy.sh [命令]
# 命令: install | update | start | stop | restart | status | logs

set -e

# ==================== 配置区域 ====================
APP_NAME="xyzw-web-helper"
APP_DIR="/opt/xyzw-web-helper"
GIT_REPO="https://github.com/your-username/xyzw_web_helper_diy.git"  # 修改为你的仓库地址
BRANCH="main"

# 端口配置
BACKEND_PORT=3001
FRONTEND_PORT=80

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== 辅助函数 ====================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        log_info "请使用: sudo $0 $1"
        exit 1
    fi
}

# ==================== 安装依赖 ====================
install_dependencies() {
    log_info "安装系统依赖..."
    
    apt-get update
    apt-get install -y \
        curl \
        wget \
        git \
        nginx \
        nodejs \
        npm \
        certbot \
        python3-certbot-nginx \
        ufw
    
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
    
    cd "$APP_DIR"
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd "$APP_DIR/backend"
    npm install
    
    # 安装前端依赖
    log_info "安装前端依赖..."
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
    
    if [[ ! -f ".env" ]]; then
        log_info "创建后端 .env 文件..."
        cat > .env << EOF
# 服务配置
PORT=$BACKEND_PORT
NODE_ENV=production

# Supabase 配置 (请修改为你的配置)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT 密钥 (请修改)
JWT_SECRET=$(openssl rand -hex 32)
EOF
        log_warning "请编辑 $APP_DIR/backend/.env 文件，填入正确的配置"
    fi
    
    cd "$APP_DIR"
    
    if [[ ! -f ".env" ]]; then
        log_info "创建前端 .env 文件..."
        cat > .env << EOF
# 后端API地址
VITE_API_URL=http://localhost:$BACKEND_PORT
VITE_USE_BACKEND=true
EOF
    fi
    
    log_success "环境变量配置完成"
}

# ==================== 配置 Nginx ====================
setup_nginx() {
    log_info "配置 Nginx..."
    
    cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
server {
    listen 80;
    server_name _;  # 修改为你的域名
    
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
    
    # 启用站点
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # 删除默认站点
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试并重载 Nginx
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
    
    # 使用 PM2 启动后端
    pm2 start server.js --name "$APP_NAME-backend"
    pm2 save
    pm2 startup | bash || true
    
    # 重载 Nginx
    systemctl reload nginx
    
    log_success "服务启动完成"
}

# ==================== 停止服务 ====================
stop_service() {
    log_info "停止服务..."
    
    pm2 stop "$APP_NAME-backend" 2>/dev/null || true
    
    log_success "服务已停止"
}

# ==================== 重启服务 ====================
restart_service() {
    log_info "重启服务..."
    
    pm2 restart "$APP_NAME-backend" 2>/dev/null || start_service
    
    log_success "服务已重启"
}

# ==================== 查看状态 ====================
show_status() {
    echo ""
    echo "========== 服务状态 =========="
    pm2 status
    echo ""
    echo "========== Nginx 状态 =========="
    systemctl status nginx --no-pager
    echo ""
    echo "========== 端口监听 =========="
    netstat -tlnp | grep -E ":(80|443|$BACKEND_PORT)" || ss -tlnp | grep -E ":(80|443|$BACKEND_PORT)"
}

# ==================== 查看日志 ====================
show_logs() {
    local lines=${1:-100}
    log_info "显示最近 $lines 行日志..."
    pm2 logs "$APP_NAME-backend" --lines "$lines"
}

# ==================== 更新代码 ====================
update_code() {
    log_info "更新代码..."
    
    cd "$APP_DIR"
    
    # 保存当前 .env 文件
    cp backend/.env backend/.env.bak 2>/dev/null || true
    cp .env .env.bak 2>/dev/null || true
    
    # 拉取最新代码
    git fetch origin
    git reset --hard origin/$BRANCH
    
    # 恢复 .env 文件
    cp backend/.env.bak backend/.env 2>/dev/null || true
    cp .env.bak .env 2>/dev/null || true
    
    # 安装依赖
    cd "$APP_DIR/backend"
    npm install
    
    cd "$APP_DIR"
    npm install
    
    # 构建前端
    npm run build
    
    # 重启服务
    restart_service
    
    log_success "代码更新完成"
}

# ==================== 完整安装 ====================
full_install() {
    check_root "install"
    
    log_info "开始完整安装..."
    
    install_dependencies
    clone_repo
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
    log_info "后端API: http://$(curl -s ifconfig.me || echo 'your-server-ip')/api"
    echo ""
    log_warning "请记得修改以下配置:"
    log_warning "1. $APP_DIR/backend/.env - 填入Supabase配置"
    log_warning "2. /etc/nginx/sites-available/$APP_NAME - 修改server_name为你的域名"
    echo ""
    log_info "常用命令:"
    log_info "  ./deploy.sh update   - 更新代码并重启"
    log_info "  ./deploy.sh restart  - 重启服务"
    log_info "  ./deploy.sh logs     - 查看日志"
    log_info "  ./deploy.sh status   - 查看状态"
}

# ==================== 主入口 ====================
case "${1:-}" in
    install)
        full_install
        ;;
    update)
        check_root "update"
        update_code
        ;;
    start)
        check_root "start"
        start_service
        ;;
    stop)
        check_root "stop"
        stop_service
        ;;
    restart)
        check_root "restart"
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-100}"
        ;;
    *)
        echo "用法: $0 {install|update|start|stop|restart|status|logs}"
        echo ""
        echo "命令说明:"
        echo "  install  - 完整安装（首次部署）"
        echo "  update   - 更新代码并重启"
        echo "  start    - 启动服务"
        echo "  stop     - 停止服务"
        echo "  restart  - 重启服务"
        echo "  status   - 查看服务状态"
        echo "  logs     - 查看日志 (可选参数: 行数, 默认100)"
        exit 1
        ;;
esac
