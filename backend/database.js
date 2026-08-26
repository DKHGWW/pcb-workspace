/**
 * 数据库模块 —— 基于 sql.js（纯 JavaScript SQLite，无原生编译依赖）
 * 数据持久化到 JSON 文件
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'app.db');
const init = initSqlJs();

// 数据库实例（Promise 解包后使用）
let db = null;

// ==================== 初始化数据库 ====================
async function initDatabase() {
  const SQL = await init;

  // 如果磁盘上有数据库文件，则加载；否则新建
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表结构
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      status      TEXT    DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 检查是否已有数据，没有则插入演示数据
  const result = db.exec('SELECT COUNT(*) as count FROM tasks');
  const count = result[0].values[0][0];

  if (count === 0) {
    const stmt = db.prepare(
      'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)'
    );
    const demoData = [
      ['设计数据库表结构', '规划任务表字段：标题、描述、状态、时间戳', 'completed'],
      ['搭建后端 API 服务', '使用 Express 创建 RESTful 接口', 'completed'],
      ['完成前后台连接', '前端通过 fetch API 调用后端接口，实现 CRUD', 'in_progress'],
      ['编写前端交互页面', 'HTML + CSS + JavaScript 实现任务管理界面', 'pending']
    ];
    demoData.forEach(([title, desc, status]) => {
      stmt.run([title, desc, status]);
    });
    stmt.free();
  }

  saveDatabase();
  return db;
}

// ==================== 保存数据库到磁盘 ====================
function saveDatabase() {
  const data = db.export(); // Uint8Array
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// ==================== 查询（返回对象数组） ====================
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ==================== 执行（增删改） ====================
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// ==================== 执行并返回插入的行 ID ====================
function insert(sql, params = []) {
  db.run(sql, params);
  const result = query('SELECT last_insert_rowid() as id');
  saveDatabase();
  return result[0].id;
}

// 等待初始化完成后导出
module.exports = {
  initDatabase,
  query,
  run,
  insert,
  getDb: () => db
};
