#!/usr/bin/env bash
# ============================================================
#  四川井明电子官网 — Ubuntu / Debian 一键部署脚本
#  用法:  sudo bash deploy.sh
#  前置: 一台已初始化 Ubuntu 20.04 / 22.04 的云服务器（轻量应用服务器）
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "============================================================"
echo "  井明电子官网 一键部署 (Ubuntu / Debian)"
echo "============================================================"

# 1. 安装 Node.js 18 LTS（若未安装或版本过低）
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//;s/\..*//')" -lt 18 ]; then
  echo ">>> [1/5] 安装 Node.js 18 LTS ..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get update && apt-get install -y nodejs
else
  echo ">>> [1/5] 已检测到 Node.js: $(node -v)"
fi

# 2. 准备 .env（后台密码等敏感配置）
if [ ! -f .env ]; then
  cp .env.example .env
  echo ">>> [2/5] 已根据 .env.example 生成 .env，请务必修改其中的 ADMIN_PASSWORD！"
else
  echo ">>> [2/5] 已存在 .env，跳过。"
fi

# 3. 安装依赖
echo ">>> [3/5] 安装 npm 依赖 ..."
npm install

# 4. 安装 pm2 并用它守护进程
echo ">>> [4/5] 启动应用 (pm2) ..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
pm2 delete pcb-website 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 5. 配置开机自启
echo ">>> [5/5] 配置开机自启 ..."
pm2 startup | sed -n '1,3p' || true

echo ""
echo "============================================================"
echo "✅ 部署完成！"
echo "   本机访问:  http://localhost:4000/"
echo "   后台管理:  http://localhost:4000/admin.html"
echo "   前台运行在 4000 端口，请用 nginx 反代到 80/443（见 nginx-pcb.conf）"
echo "   ⚠️  请修改 .env 里的 ADMIN_PASSWORD，并在云控制台放行 80/443 端口"
echo "============================================================"
