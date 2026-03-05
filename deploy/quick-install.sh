#!/bin/bash

# 快速安装脚本 - 在新服务器上运行此脚本即可开始部署
# 用法: curl -fsSL https://raw.githubusercontent.com/your-username/xyzw_web_helper_diy/main/deploy/quick-install.sh | bash

set -e

APP_DIR="/opt/xyzw-web-helper"
REPO_URL="https://github.com/mengchunzhi/xyzw-web-helper_diy.git"

echo "=========================================="
echo "  XYZW Web Helper 快速安装脚本"
echo "=========================================="
echo ""

# 检查 root 权限
if [[ $EUID -ne 0 ]]; then
   echo "此脚本需要root权限运行"
   echo "请使用: sudo bash $0"
   exit 1
fi

# 安装基础工具
echo "[1/4] 安装基础工具..."
apt-get update
apt-get install -y curl wget git

# 安装 Node.js
echo "[2/4] 安装 Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"

# 克隆代码
echo "[3/4] 克隆代码..."
if [[ -d "$APP_DIR" ]]; then
    echo "目录 $APP_DIR 已存在，跳过克隆"
else
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
fi

# 运行部署脚本
echo "[4/4] 运行部署脚本..."
cd "$APP_DIR"
chmod +x deploy/deploy.sh

echo ""
echo "=========================================="
echo "  基础环境准备完成!"
echo "=========================================="
echo ""
echo "接下来请执行:"
echo ""
echo "  cd $APP_DIR"
echo "  ./deploy/deploy.sh install"
echo ""
echo "或者手动配置后执行:"
echo ""
echo "  1. 编辑 deploy/deploy.sh 修改 GIT_REPO 和 BRANCH"
echo "  2. 编辑 backend/.env 填入 Supabase 配置"
echo "  3. 执行 ./deploy/deploy.sh install"
echo ""
