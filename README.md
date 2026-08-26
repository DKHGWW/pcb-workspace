# PCB 工作区（统一管理）

本工作区包含两套相互独立、但共用同一 Node/Express 技术栈的项目，端口已错开部署，可同时运行。

| 子项目 | 目录 | 端口 | 说明 |
|--------|------|------|------|
| 任务管理系统（示例） | `backend/` + `frontend/` | **3000** | Express + sql.js(SQLite) 的全栈任务管理示例 |
| 井明电子官网 | `website/` | **4000** | 四川井明电子动态官网（前台 + 后台 + 在线留言落库） |

## 一键启动（双服务）

- **Windows**：双击或在 PowerShell 运行 `start.ps1`
- **Linux / macOS**：`./start.sh`

脚本会同时启动任务管理系统(3000) 与官网(4000)，避免端口冲突。

访问地址：
- 任务管理系统： http://localhost:3000
- 井明官网前台： http://localhost:4000/
- 井明官网后台： http://localhost:4000/admin.html （默认密码 `admin123`）

---

## 项目一：任务管理系统（`backend/` + `frontend/`）

一个完整的全栈 Web 应用示例，演示前端如何通过 API 与后端进行数据交互。

### 项目结构
```
backend/
├── server.js      # Express 服务器 + API 路由（端口 3000）
├── database.js     # SQLite 数据库模块（sql.js 纯 JS 实现）
├── app.db         # SQLite 数据库文件（自动生成）
└── package.json
frontend/
├── index.html     # 页面结构
├── style.css      # 样式
└── app.js         # 前端逻辑（fetch API 调用后端）
```

### 启动
```bash
cd backend && npm install && npm start   # 访问 http://localhost:3000
```

### API
| 操作 | 方法 | 路径 |
|------|------|------|
| 任务列表 | GET | /api/tasks |
| 单个任务 | GET | /api/tasks/:id |
| 创建 | POST | /api/tasks |
| 更新 | PUT | /api/tasks/:id |
| 删除 | DELETE | /api/tasks/:id |
| 统计 | GET | /api/stats |
| 健康检查 | GET | /api/health |

技术栈：Node.js + Express + sql.js(SQLite)；数据持久化在 `backend/app.db`。

---

## 项目二：井明电子官网（`website/`）

四川井明电子动态官网：「前端单页 (`public/index.html`) + Node/Express 后端 (`server.js`)」结构。后台可在线改全站文案与轮播图（数据持久化于 `config.json`），访客「在线留言」提交后落库于 `messages.json`。

### 启动
```bash
cd website && npm install && npm start   # 默认端口 4000
# 自定义端口： PORT=3000 npm start
```

### 关键接口
- `GET /api/config` 公开读取站点配置（前台加载，失败回退默认值）
- `POST /api/login` 后台登录换 token（密码 `admin123`，可用环境变量 `ADMIN_PASSWORD` 修改）
- `POST /api/config` 保存配置（需 `Authorization: Bearer <token>`，未授权 401）
- `POST /api/contact` 公开提交在线留言（校验姓名/邮箱/内容，落库 `messages.json`）
- `GET /api/contact` 查看留言列表（需登录，供后台「留言管理」标签页）

### 部署上线
官网默认端口 4000，已配套完整部署文件（`website/` 内）：
- `deploy.sh` Ubuntu 一键部署（装 Node18 + pm2 守护 + 开机自启）
- `nginx-pcb.conf` nginx 反代模板（含 certbot 免费 HTTPS 说明）
- `ecosystem.config.js` pm2 配置、`Dockerfile` + `docker-compose.yml` Docker 部署
- `.env.example` 环境变量样例（密码 / 端口）

详见 `website/README.md`。

### 用 Render 一键部署（海外 PaaS）
仓库根目录已带 `render.yaml`，Render 部署时：
1. 在 Render Dashboard 选择 **Use a Blueprint** 或直接把 GitHub 仓库连到 Render。
2. 确认服务类型为 **Web Service**、Runtime 为 **Node**、启动目录为 `website/`。
3. 在环境变量里设置 `ADMIN_PASSWORD`（后台登录密码，切勿使用默认 `admin123`）。
4. 点击部署；Render 会自动注入 `PORT` 环境变量，应用会以该端口启动。

> ⚠️ Render 免费实例磁盘是**临时**的：后台修改的 `config.json` 和访客留言 `messages.json` 会在每次重新部署或实例休眠后丢失。如需持久保存，请升级到付费 Disk 或改用国内云服务器方案（见 `deploy.sh` / `nginx-pcb.conf`）。

> 注意：官网默认端口设为 **4000** 是为了与任务管理系统的 **3000** 错开，本地可同时运行。上传到云服务器单独部署时，nginx 会将 80/443 反代到 4000，对外无感。
