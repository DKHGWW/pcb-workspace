#!/usr/bin/env bash
# 统一启动脚本（Linux / macOS）
# 任务管理系统(3000) + 井明官网(4000)，端口错开避免冲突
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> 启动 任务管理系统 (3000)"
(cd "$ROOT/backend" && npm start) &

echo "==> 启动 井明官网 (4000)"
(cd "$ROOT/website" && PORT=4000 npm start) &

wait
