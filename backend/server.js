const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件 ====================
app.use(cors());                          // 允许跨域请求
app.use(express.json());                  // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 —— 直接把前端托管在后端
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ==================== API 路由 ====================

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// ---------- 获取所有任务 ----------
app.get('/api/tasks', (req, res) => {
  const { status } = req.query;
  let tasks;

  if (status && status !== 'all') {
    tasks = db.query('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC', [status]);
  } else {
    tasks = db.query('SELECT * FROM tasks ORDER BY created_at DESC');
  }

  res.json({
    code: 0,
    message: 'success',
    data: tasks
  });
});

// ---------- 获取单个任务 ----------
app.get('/api/tasks/:id', (req, res) => {
  const task = db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id])[0];

  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在' });
  }

  res.json({ code: 0, message: 'success', data: task });
});

// ---------- 创建任务 ----------
app.post('/api/tasks', (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ code: 400, message: '任务标题不能为空' });
  }

  const insertId = db.insert(
    'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)',
    [title.trim(), description || '', 'pending']
  );

  const newTask = db.query('SELECT * FROM tasks WHERE id = ?', [insertId])[0];

  res.status(201).json({
    code: 0,
    message: '任务创建成功',
    data: newTask
  });
});

// ---------- 更新任务 ----------
app.put('/api/tasks/:id', (req, res) => {
  const { title, description, status } = req.body;
  const task = db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id])[0];

  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在' });
  }

  db.run(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title || task.title,
      description !== undefined ? description : task.description,
      status || task.status,
      req.params.id
    ]
  );

  const updatedTask = db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id])[0];

  res.json({
    code: 0,
    message: '任务更新成功',
    data: updatedTask
  });
});

// ---------- 删除任务 ----------
app.delete('/api/tasks/:id', (req, res) => {
  const task = db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id])[0];

  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在' });
  }

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);

  res.json({ code: 0, message: '任务删除成功' });
});

// ---------- 获取统计信息 ----------
app.get('/api/stats', (req, res) => {
  const total = db.query('SELECT COUNT(*) as count FROM tasks')[0].count;
  const pending = db.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'")[0].count;
  const completed = db.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'")[0].count;

  res.json({
    code: 0,
    message: 'success',
    data: { total, pending, completed }
  });
});

// ==================== 前端页面入口（SPA 兜底） ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ==================== 启动服务器（等待数据库初始化完成） ====================
async function start() {
  await db.initDatabase();

  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  服务器已启动: http://localhost:${PORT}`);
    console.log(`  API 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`  前端页面:     http://localhost:${PORT}/`);
    console.log(`========================================\n`);
  });
}

start().catch(err => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});
