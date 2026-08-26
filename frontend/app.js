/**
 * ========================================
 *  前后台连接核心逻辑
 *  前端通过 fetch API 调用后端 RESTful 接口
 * ========================================
 */

// 后端 API 基础地址
const API_BASE = ''; // 同源部署，空字符串即可。若前后端分离部署则填 'http://localhost:3000'

// 当前编辑的任务 ID
let editingTaskId = null;

// 当前筛选状态
let currentFilter = 'all';

// 状态文本映射
const STATUS_MAP = {
  'pending':     { label: '待处理', class: 'badge-pending' },
  'in_progress': { label: '进行中', class: 'badge-in_progress' },
  'completed':   { label: '已完成', class: 'badge-completed' }
};

/**
 * 封装的 fetch 请求方法 —— 统一处理请求与错误
 */
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `请求失败 (${response.status})`);
    }
    return result;
  } catch (error) {
    // 网络错误或 JSON 解析失败
    if (error instanceof TypeError) {
      showToast('无法连接到服务器，请检查后端是否已启动', 'error');
    } else {
      showToast(error.message, 'error');
    }
    throw error;
  }
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  loadStats();
});

// ==================== 加载任务列表 ====================
async function loadTasks() {
  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const url = currentFilter === 'all'
      ? '/api/tasks'
      : `/api/tasks?status=${currentFilter}`;

    const res = await apiRequest(url);
    renderTasks(res.data);
  } catch (error) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>加载失败，请确认后端服务已启动</p>
        <p style="font-size:13px;margin-top:8px;">运行命令: cd backend && npm start</p>
      </div>
    `;
  }
}

// ==================== 加载统计数据 ====================
async function loadStats() {
  try {
    const res = await apiRequest('/api/stats');
    document.getElementById('stat-total').textContent = res.data.total;
    document.getElementById('stat-pending').textContent = res.data.pending;
    document.getElementById('stat-completed').textContent = res.data.completed;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// ==================== 渲染任务列表 ====================
function renderTasks(tasks) {
  const listEl = document.getElementById('task-list');

  if (!tasks || tasks.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>暂无任务，点击上方添加一个吧！</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = tasks.map(task => {
    const statusInfo = STATUS_MAP[task.status] || STATUS_MAP['pending'];
    return `
      <div class="task-item status-${task.status}">
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="task-badge ${statusInfo.class}">${statusInfo.label}</span>
            <span>📅 ${formatDate(task.created_at)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn edit" onclick="openEditModal(${task.id})" title="编辑">✏️</button>
          <button class="action-btn delete" onclick="deleteTask(${task.id})" title="删除">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== 创建任务 ====================
async function createTask(event) {
  event.preventDefault();

  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();

  if (!title) {
    showToast('请输入任务标题', 'error');
    return;
  }

  try {
    await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });

    // 清空表单
    document.getElementById('task-form').reset();

    // 刷新列表和统计
    await loadTasks();
    await loadStats();

    showToast('任务创建成功！', 'success');
  } catch (error) {
    // 错误提示已在 apiRequest 中处理
  }
}

// ==================== 打开编辑模态框 ====================
async function openEditModal(taskId) {
  try {
    const res = await apiRequest(`/api/tasks/${taskId}`);
    const task = res.data;

    editingTaskId = taskId;
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-desc').value = task.description || '';
    document.getElementById('edit-status').value = task.status;

    document.getElementById('edit-modal').classList.add('show');
  } catch (error) {
    // 错误提示已在 apiRequest 中处理
  }
}

// ==================== 更新任务 ====================
async function updateTask() {
  if (!editingTaskId) return;

  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const status = document.getElementById('edit-status').value;

  if (!title) {
    showToast('标题不能为空', 'error');
    return;
  }

  try {
    await apiRequest(`/api/tasks/${editingTaskId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, status })
    });

    closeModal();
    await loadTasks();
    await loadStats();

    showToast('任务更新成功！', 'success');
  } catch (error) {
    // 错误提示已在 apiRequest 中处理
  }
}

// ==================== 删除任务 ====================
async function deleteTask(taskId) {
  if (!confirm('确定删除这个任务吗？')) return;

  try {
    await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });

    await loadTasks();
    await loadStats();

    showToast('任务已删除', 'success');
  } catch (error) {
    // 错误提示已在 apiRequest 中处理
  }
}

// ==================== 筛选任务 ====================
function filterTasks(filter) {
  currentFilter = filter;

  // 更新筛选按钮高亮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  loadTasks();
}

// ==================== 关闭模态框 ====================
function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('edit-modal').classList.remove('show');
  editingTaskId = null;
}

// ==================== Toast 提示 ====================
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;

  setTimeout(() => {
    toast.className = 'toast';
  }, 2500);
}

// ==================== 工具函数 ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'Z');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
