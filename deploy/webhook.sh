#!/bin/bash

# Git Webhook 自动部署脚本
# 当收到 git push 通知时自动更新部署
# 配合 GitHub Webhooks 或 Gitea Webhooks 使用

APP_DIR="/opt/xyzw-web-helper"
LOG_FILE="/var/log/xyzw-webhook.log"
SECRET="your-webhook-secret"  # 修改为你的 webhook 密钥

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 验证签名 (GitHub)
verify_github_signature() {
    local signature="sha1=$(echo -n "$1" | openssl dgst -sha1 -hmac "$SECRET" | sed 's/.*= //')"
    local hub_signature="$2"
    
    if [[ "$signature" == "$hub_signature" ]]; then
        return 0
    else
        return 1
    fi
}

# 执行更新
do_update() {
    log "开始更新..."
    
    cd "$APP_DIR"
    
    # 保存配置
    cp backend/.env backend/.env.bak 2>/dev/null || true
    cp .env .env.bak 2>/dev/null || true
    
    # 拉取代码
    git fetch origin
    git reset --hard origin/main
    
    # 恢复配置
    cp backend/.env.bak backend/.env 2>/dev/null || true
    cp .env.bak .env 2>/dev/null || true
    
    # 更新依赖
    cd "$APP_DIR/backend"
    npm install --production
    
    cd "$APP_DIR"
    npm install
    npm run build
    
    # 重启服务
    pm2 restart xyzw-backend
    
    log "更新完成!"
}

# 主入口
case "$1" in
    update)
        do_update
        ;;
    *)
        echo "用法: $0 update"
        exit 1
        ;;
esac
