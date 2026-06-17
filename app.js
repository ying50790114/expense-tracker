'use strict';

// ── 預設類別 ──
const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food',      name: '餐飲',   icon: '🍔', isDefault: true },
    { id: 'transport', name: '交通',   icon: '🚌', isDefault: true },
    { id: 'shopping',  name: '購物',   icon: '🛍️', isDefault: true },
    { id: 'housing',   name: '家用',   icon: '🏠', isDefault: true },
    { id: 'medical',   name: '醫療',   icon: '💊', isDefault: true },
    { id: 'entertain', name: '娛樂',   icon: '🎮', isDefault: true },
    { id: 'education', name: '進修',   icon: '📚', isDefault: true },
    { id: 'telecom',   name: '電信',   icon: '📱', isDefault: true },
    { id: 'software',  name: '軟體服務', icon: '💻', isDefault: true },
    { id: 'other_exp', name: '其他支出', icon: '💸', isDefault: true },
  ],
  income: [
    { id: 'salary',    name: '薪資',   icon: '💼', isDefault: true },
    { id: 'bonus',     name: '獎金',   icon: '🎁', isDefault: true },
    { id: 'invest',    name: '投資',   icon: '📈', isDefault: true },
    { id: 'freelance', name: '接案',   icon: '💻', isDefault: true },
    { id: 'other_inc', name: '其他收入', icon: '💰', isDefault: true },
  ],
};

const CHART_COLORS_LIGHT = [
  '#6c63ff','#48b1f3','#22c55e','#ef4444','#f59e0b',
  '#ec4899','#14b8a6','#8b5cf6','#f97316','#06b6d4',
  '#84cc16','#e11d48','#0ea5e9','#a855f7','#10b981',
];
const CHART_COLORS_DARK = [
  '#3730a3','#1e5f8a','#166534','#991b1b','#92400e',
  '#9d174d','#134e4a','#4c1d95','#9a3412','#164e63',
  '#365314','#881337','#1e40af','#581c87','#064e3b',
];

function getChartColors() {
  return document.body.classList.contains('dark') ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
}
const CHART_COLORS = CHART_COLORS_LIGHT; // fallback reference

// ── State ──
let currentUser = null;
let currentType = 'expense';
let monthlyExpenseChart = null;
let monthlyIncomeChart = null;
let annualChart = null;

function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}
function setStore(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getUserData(userId) {
  return getStore(`budget_${userId}`) || {
    records: [],
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  };
}
function saveUserData(userId, data) {
  setStore(`budget_${userId}`, data);
}

function getUserNames() {
  return getStore('budget_user_names') || { user1: '使用者 1', user2: '使用者 2' };
}
function saveUserNames() {
  const names = getUserNames();
  const v1 = document.getElementById('edit-user1-name').value.trim();
  const v2 = document.getElementById('edit-user2-name').value.trim();
  if (v1) names.user1 = v1;
  if (v2) names.user2 = v2;
  setStore('budget_user_names', names);
  refreshUserNameDisplay();
  document.getElementById('edit-user1-name').value = '';
  document.getElementById('edit-user2-name').value = '';
  alert('名稱已儲存！');
}

function refreshUserNameDisplay() {
  const names = getUserNames();
  document.getElementById('user1-display-name').textContent = names.user1;
  document.getElementById('user2-display-name').textContent = names.user2;
}

// ── Login ──
function selectUser(userId) {
  currentUser = userId;
  const names = getUserNames();
  const label = userId === 'user1' ? names.user1 : names.user2;
  document.getElementById('current-user-label').textContent = `👤 ${label}`;
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  initApp();
}

function logout() {
  currentUser = null;
  document.getElementById('main-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
}

// ── App Init ──
function initApp() {
  const today = new Date();
  document.getElementById('record-date').value = today.toISOString().split('T')[0];

  populateMonthYearSelects();
  setType('expense');
  renderCategories();
  renderRecords();
  renderMonthlyChart();
  renderAnnualChart();
  populateClearYearSelect();
  autoGenerateSubscriptions();
}

function populateMonthYearSelects() {
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const now = new Date();
  const yearNow = now.getFullYear();
  const monthNow = now.getMonth();

  ['filter-month','chart-month'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = months.map((m, i) =>
      `<option value="${i}" ${i === monthNow ? 'selected' : ''}>${m}</option>`
    ).join('');
  });

  const years = [];
  for (let y = yearNow - 3; y <= yearNow + 1; y++) years.push(y);

  ['filter-year','chart-year','annual-year'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = years.map(y =>
      `<option value="${y}" ${y === yearNow ? 'selected' : ''}>${y}年</option>`
    ).join('');
  });
}

// ── Type Toggle ──
function setType(type) {
  currentType = type;
  document.getElementById('type-expense').classList.toggle('active', type === 'expense');
  document.getElementById('type-income').classList.toggle('active', type === 'income');
  updateCategorySelect();
}

function updateCategorySelect() {
  const data = getUserData(currentUser);
  const cats = data.categories[currentType] || [];
  const sel = document.getElementById('category');
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

// ── Records ──
function addRecord() {
  const amount = parseFloat(document.getElementById('amount').value);
  const catId = document.getElementById('category').value;
  const desc = document.getElementById('description').value.trim();
  const date = document.getElementById('record-date').value;

  if (!amount || amount <= 0) { alert('請輸入有效金額'); return; }
  if (!date) { alert('請選擇日期'); return; }

  const data = getUserData(currentUser);
  const cats = data.categories[currentType];
  const cat = cats.find(c => c.id === catId);

  const record = {
    id: Date.now().toString(),
    type: currentType,
    amount,
    categoryId: catId,
    categoryName: cat ? cat.name : '',
    categoryIcon: cat ? cat.icon : '💸',
    description: desc || (cat ? cat.name : ''),
    date,
  };

  data.records.unshift(record);
  saveUserData(currentUser, data);

  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';

  renderRecords();
  renderMonthlyChart();
  renderAnnualChart();
}

function deleteRecord(id) {
  if (!confirm('確定刪除這筆記錄？')) return;
  const data = getUserData(currentUser);
  data.records = data.records.filter(r => r.id !== id);
  saveUserData(currentUser, data);
  renderRecords();
  renderMonthlyChart();
  renderAnnualChart();
}

function recordItemHTML(r) {
  return `
    <div class="record-item">
      <div class="record-icon ${r.type}">${r.categoryIcon}</div>
      <div class="record-info">
        <div class="desc">${escHtml(r.description)}</div>
        <div class="meta">${r.categoryName}</div>
        <div class="meta">${r.date}</div>
      </div>
      <div class="record-amount ${r.type}">
        ${r.type === 'expense' ? '-' : '+'}NT$${r.amount.toLocaleString()}
      </div>
      <button class="record-edit"   onclick="openEditModal('${r.id}')" title="編輯">✏️</button>
      <button class="record-delete" onclick="deleteRecord('${r.id}')"  title="刪除">✕</button>
    </div>`;
}

function getWeekOfMonth(dateStr) {
  const d = new Date(dateStr);
  return Math.ceil(d.getDate() / 7);
}

function weekRangeLabel(year, month, week) {
  const start = (week - 1) * 7 + 1;
  const end = Math.min(week * 7, new Date(year, month + 1, 0).getDate());
  return `${month + 1}/${start} - ${month + 1}/${end}`;
}

function renderRecords() {
  const month = parseInt(document.getElementById('filter-month').value);
  const year  = parseInt(document.getElementById('filter-year').value);
  const data  = getUserData(currentUser);

  // ── 本日記錄 ──
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = data.records.filter(r => r.date === todayStr);
  const todayIncome  = todayRecords.filter(r => r.type === 'income').reduce((s,r) => s + r.amount, 0);
  const todayExpense = todayRecords.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);
  document.getElementById('today-income').textContent  = `NT$${todayIncome.toLocaleString()}`;
  document.getElementById('today-expense').textContent = `NT$${todayExpense.toLocaleString()}`;
  const todayList = document.getElementById('today-list');
  todayList.innerHTML = todayRecords.length
    ? todayRecords.map(recordItemHTML).join('')
    : '<div class="today-empty">今天還沒有記錄</div>';

  // ── 本月記錄 ──
  const filtered = data.records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalIncome  = filtered.filter(r => r.type === 'income').reduce((s,r) => s + r.amount, 0);
  const totalExpense = filtered.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);
  document.getElementById('total-income').textContent  = `NT$${totalIncome.toLocaleString()}`;
  document.getElementById('total-expense').textContent = `NT$${totalExpense.toLocaleString()}`;
  const balEl = document.getElementById('total-balance');
  const balance = totalIncome - totalExpense;
  balEl.textContent = `NT$${balance.toLocaleString()}`;
  balEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';

  const list = document.getElementById('records-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-records">本月沒有記錄</div>';
    return;
  }

  // 按週分組（全部週次，升序）
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalWeeks = Math.ceil(daysInMonth / 7);
  const weekMap = {};
  for (let w = 1; w <= totalWeeks; w++) weekMap[w] = [];
  filtered.forEach(r => {
    const w = getWeekOfMonth(r.date);
    if (!weekMap[w]) weekMap[w] = [];
    weekMap[w].push(r);
  });
  // 每週內的記錄由舊到新排序
  Object.values(weekMap).forEach(recs => recs.sort((a, b) => a.date.localeCompare(b.date)));

  const weeks = Object.keys(weekMap).map(Number).sort((a,b) => a - b);
  list.innerHTML = weeks.map(w => {
    const recs = weekMap[w];
    const wExpense = recs.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);
    const totalStr = `<span class="week-expense">支出 NT$${wExpense.toLocaleString()}</span>`;
    return `
      <div class="week-group collapsed" id="week-${w}">
        <div class="week-header" onclick="toggleWeek(${w})">
          <div class="week-header-left">
            <span class="week-label">第 ${w} 週</span>
            <span class="week-meta">${weekRangeLabel(year, month, w)}</span>
          </div>
          <div class="week-header-right">
            <span class="week-total">${totalStr}</span>
            <span class="week-chevron">▼</span>
          </div>
        </div>
        <div class="week-body">
          ${recs.map(recordItemHTML).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleWeek(w) {
  document.getElementById(`week-${w}`).classList.toggle('collapsed');
}

// ── Monthly Pie Chart ──
function renderPieChart(canvasId, legendId, noDataId, records) {
  const noData = document.getElementById(noDataId);
  const chartLayout = document.getElementById(canvasId).closest('.chart-layout');

  if (records.length === 0) {
    noData.style.display = 'block';
    chartLayout.style.display = 'none';
    return null;
  }

  noData.style.display = 'none';
  chartLayout.style.display = 'flex';

  const catMap = {};
  records.forEach(r => {
    const key = r.categoryId;
    if (!catMap[key]) catMap[key] = { name: r.categoryName, icon: r.categoryIcon, amount: 0 };
    catMap[key].amount += r.amount;
  });

  const entries = Object.values(catMap).sort((a, b) => b.amount - a.amount);
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const labels = entries.map(e => `${e.icon} ${e.name}`);
  const amounts = entries.map(e => e.amount);
  const palette = getChartColors();
  const colors = entries.map((_, i) => palette[i % palette.length]);

  const ctx = document.getElementById(canvasId).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: amounts, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` NT$${ctx.parsed.toLocaleString()} (${((ctx.parsed/total)*100).toFixed(1)}%)`,
          }
        }
      }
    }
  });

  document.getElementById(legendId).innerHTML = entries.map((e, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <div class="legend-label">${e.icon} ${e.name}</div>
      <div class="legend-pct">${((e.amount/total)*100).toFixed(1)}%</div>
      <div class="legend-amt">NT$${e.amount.toLocaleString()}</div>
    </div>
  `).join('');

  return chart;
}

function renderMonthlyChart() {
  const month = parseInt(document.getElementById('chart-month').value);
  const year  = parseInt(document.getElementById('chart-year').value);
  const data  = getUserData(currentUser);

  const inMonth = r => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  };

  if (monthlyExpenseChart) { monthlyExpenseChart.destroy(); monthlyExpenseChart = null; }
  if (monthlyIncomeChart)  { monthlyIncomeChart.destroy();  monthlyIncomeChart  = null; }

  monthlyExpenseChart = renderPieChart(
    'monthly-expense-chart', 'monthly-expense-legend', 'monthly-expense-no-data',
    data.records.filter(r => r.type === 'expense' && inMonth(r))
  );
  monthlyIncomeChart = renderPieChart(
    'monthly-income-chart', 'monthly-income-legend', 'monthly-income-no-data',
    data.records.filter(r => r.type === 'income' && inMonth(r))
  );
}

// ── Annual Bar Chart ──
function renderAnnualChart() {
  const year = parseInt(document.getElementById('annual-year').value);
  const data = getUserData(currentUser);

  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const expenseByMonth = new Array(12).fill(0);
  const incomeByMonth  = new Array(12).fill(0);

  data.records.forEach(r => {
    const d = new Date(r.date);
    if (d.getFullYear() !== year) return;
    if (r.type === 'expense') expenseByMonth[d.getMonth()] += r.amount;
    else incomeByMonth[d.getMonth()] += r.amount;
  });

  if (annualChart) annualChart.destroy();
  const ctx = document.getElementById('annual-bar-chart').getContext('2d');
  annualChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: '支出', data: expenseByMonth, backgroundColor: '#ef444488', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 6 },
        { label: '收入', data: incomeByMonth,  backgroundColor: '#22c55e88', borderColor: '#22c55e', borderWidth: 1.5, borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: ctx => ` NT$${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `NT$${v.toLocaleString()}` } }
      }
    }
  });

  const summary = document.getElementById('annual-summary');
  summary.innerHTML = months.map((m, i) => `
    <div class="month-card">
      <div class="month-name">${m}</div>
      <div class="month-expense">-NT$${expenseByMonth[i].toLocaleString()}</div>
      <div class="month-income">+NT$${incomeByMonth[i].toLocaleString()}</div>
    </div>
  `).join('');
}

// ── Categories ──
function renderCategories() {
  const data = getUserData(currentUser);
  renderCategoryList('expense', data);
  renderCategoryList('income', data);
  updateCategorySelect();
}

function renderCategoryList(type, data) {
  const listEl = document.getElementById(`${type}-categories-list`);
  const cats = data.categories[type] || [];
  listEl.innerHTML = cats.map(c => `
    <div class="category-item">
      <span class="category-icon">${c.icon}</span>
      <span class="category-name">${escHtml(c.name)}</span>
      ${c.isDefault ? '<span class="category-default">預設</span>' : ''}
      ${!c.isDefault ? `<button class="category-delete" onclick="deleteCategory('${type}','${c.id}')" title="刪除">✕</button>` : ''}
    </div>
  `).join('');
}

function addCategory(type) {
  const nameEl = document.getElementById(`new-${type}-category`);
  const iconEl = document.getElementById(`new-${type}-icon`);
  const name = nameEl.value.trim();
  const icon = iconEl.value.trim() || (type === 'expense' ? '💸' : '💰');

  if (!name) { alert('請輸入類別名稱'); return; }

  const data = getUserData(currentUser);
  const id = `custom_${Date.now()}`;
  data.categories[type].push({ id, name, icon, isDefault: false });
  saveUserData(currentUser, data);

  nameEl.value = '';
  iconEl.value = '';
  renderCategories();
}

function deleteCategory(type, id) {
  if (!confirm('確定刪除此類別？相關記錄不會被刪除。')) return;
  const data = getUserData(currentUser);
  data.categories[type] = data.categories[type].filter(c => c.id !== id);
  saveUserData(currentUser, data);
  renderCategories();
}

// ── Hamburger Menu ──
function toggleMenu(e) {
  e.stopPropagation();
  document.getElementById('hamburger-menu').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('hamburger-menu').classList.remove('open');
}
document.addEventListener('click', () => closeMenu());

// ── Tab Navigation ──
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  // only highlight main tab buttons (not menu items)
  const mainTabs = { records: 0, monthly: 1, annual: 2 };
  if (name in mainTabs) {
    document.querySelectorAll('.nav-tabs .tab-btn')[mainTabs[name]].classList.add('active');
  }

  if (name === 'monthly') renderMonthlyChart();
  if (name === 'annual')  renderAnnualChart();
  if (name === 'categories') renderCategories();
  if (name === 'data') populateClearYearSelect();
  if (name === 'subscriptions') renderSubscriptions();
}

// ── Edit Modal ──
let editingRecordId = null;
let editingRecordType = null;

function openEditModal(id) {
  const data = getUserData(currentUser);
  const r = data.records.find(x => x.id === id);
  if (!r) return;
  editingRecordId   = id;
  editingRecordType = r.type;

  document.getElementById('edit-amount').value      = r.amount;
  document.getElementById('edit-description').value = r.description;
  document.getElementById('edit-date').value        = r.date;
  updateEditCategorySelect(r.type, r.categoryId);

  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal(e) {
  if (e && e.target !== document.getElementById('edit-modal')) return;
  document.getElementById('edit-modal').classList.remove('open');
  editingRecordId = null;
}

function updateEditCategorySelect(type, selectedId = null) {
  const data = getUserData(currentUser);
  const cats = data.categories[type] || [];
  const sel = document.getElementById('edit-category');
  sel.innerHTML = cats.map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
}

function saveEditRecord() {
  if (!editingRecordId) return;
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const date   = document.getElementById('edit-date').value;
  if (!amount || amount <= 0) { alert('請輸入有效金額'); return; }
  if (!date) { alert('請選擇日期'); return; }

  const type = editingRecordType;
  const catEl = document.getElementById('edit-category');
  const catId = catEl.value;
  const catOpt = catEl.options[catEl.selectedIndex];
  const catName = catOpt ? catOpt.text.slice(catOpt.text.indexOf(' ') + 1) : '';
  const catIcon = catOpt ? catOpt.text.slice(0, [...catOpt.text][0].length) : '💸';

  const data = getUserData(currentUser);
  const idx  = data.records.findIndex(r => r.id === editingRecordId);
  if (idx === -1) return;

  const cat = (data.categories[type] || []).find(c => c.id === catId);
  data.records[idx] = {
    ...data.records[idx],
    type,
    amount,
    categoryId:   catId,
    categoryName: cat ? cat.name : catName,
    categoryIcon: cat ? cat.icon : catIcon,
    description:  document.getElementById('edit-description').value.trim() || (cat ? cat.name : ''),
    date,
  };
  saveUserData(currentUser, data);
  document.getElementById('edit-modal').classList.remove('open');
  editingRecordId = null;
  renderRecords();
  renderMonthlyChart();
  renderAnnualChart();
}

// ── Helpers ──
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Subscriptions ──
function initSubForm() {
  const dayEl = document.getElementById('sub-day');
  if (dayEl) {
    dayEl.innerHTML = Array.from({length: 30}, (_, i) =>
      `<option value="${i+1}">${i+1} 日</option>`
    ).join('');
  }

  const monthEl = document.getElementById('sub-month');
  if (monthEl && !monthEl.options.length) {
    const names = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    monthEl.innerHTML = names.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
  }

  const data = getUserData(currentUser);
  const catEl = document.getElementById('sub-category');
  if (catEl) {
    catEl.innerHTML = data.categories.expense.map(c =>
      `<option value="${c.id}" data-icon="${c.icon}" data-name="${c.name}">${c.icon} ${c.name}</option>`
    ).join('');
  }
}

function onFrequencyChange() {
  const freq = document.getElementById('sub-frequency').value;
  const monthGroup = document.getElementById('sub-month-group');
  const monthLabel = document.getElementById('sub-month-label');
  if (freq === 'monthly') {
    monthGroup.style.display = 'none';
  } else if (freq === 'quarterly') {
    monthGroup.style.display = '';
    monthLabel.textContent = '起始扣款月份';
  } else if (freq === 'annual') {
    monthGroup.style.display = '';
    monthLabel.textContent = '起始扣款月份';
  }
}

function addSubscription() {
  const name   = document.getElementById('sub-name').value.trim();
  const amount = parseFloat(document.getElementById('sub-amount').value);
  const day       = parseInt(document.getElementById('sub-day').value);
  const frequency = document.getElementById('sub-frequency').value;
  const month     = frequency !== 'monthly' ? parseInt(document.getElementById('sub-month').value) : null;
  const catEl     = document.getElementById('sub-category');
  const catId     = catEl.value;
  const catOpt    = catEl.options[catEl.selectedIndex];
  const catName   = catOpt.dataset.name;
  const catIcon   = catOpt.dataset.icon;

  if (!name)               { alert('請輸入服務名稱'); return; }
  if (!amount || amount <= 0) { alert('請輸入有效金額'); return; }

  const data = getUserData(currentUser);
  if (!data.subscriptions) data.subscriptions = [];

  data.subscriptions.push({
    id: `sub_${Date.now()}`,
    name, amount, day, frequency, month,
    categoryId: catId, categoryName: catName, categoryIcon: catIcon,
  });
  saveUserData(currentUser, data);

  document.getElementById('sub-name').value = '';
  document.getElementById('sub-amount').value = '';
  renderSubscriptions();
  autoGenerateSubscriptions(); // 立即產生本月記錄
}

function deleteSubscription(id) {
  if (!confirm('確定刪除此訂閱？已產生的記錄不會被刪除。')) return;
  const data = getUserData(currentUser);
  data.subscriptions = (data.subscriptions || []).filter(s => s.id !== id);
  saveUserData(currentUser, data);
  renderSubscriptions();
}

function subFreqLabel(s) {
  const freq = s.frequency || 'monthly';
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  if (freq === 'monthly')   return `每月 ${s.day} 日`;
  if (freq === 'quarterly') return `季繳・${monthNames[(s.month - 1) % 12]} ${s.day} 日起`;
  if (freq === 'annual')    return `年繳・每年 ${monthNames[s.month - 1]} ${s.day} 日`;
  return `每月 ${s.day} 日`;
}

function renderSubscriptions() {
  initSubForm();
  const data = getUserData(currentUser);
  const subs = data.subscriptions || [];
  const today = new Date();
  const hint = document.getElementById('sub-hint');
  if (hint) hint.textContent = subs.length
    ? `共 ${subs.length} 項，每月自動新增至支出記錄。`
    : '';

  const list = document.getElementById('subscriptions-list');
  if (!list) return;
  if (!subs.length) {
    list.innerHTML = '<div class="sub-empty">尚未新增任何訂閱</div>';
    return;
  }
  list.innerHTML = subs.map(s => `
    <div class="sub-item">
      <div class="sub-icon">${s.categoryIcon}</div>
      <div class="sub-info">
        <div class="sub-title">${escHtml(s.name)}</div>
        <div class="sub-meta">${s.categoryName}・${subFreqLabel(s)}</div>
      </div>
      <div class="sub-amount">-NT$${s.amount.toLocaleString()}</div>
      <button class="sub-delete" onclick="deleteSubscription('${s.id}')" title="刪除">✕</button>
    </div>
  `).join('');
}

// 每月自動產生訂閱記錄（登入時執行）
function autoGenerateSubscriptions() {
  const data = getUserData(currentUser);
  const subs = data.subscriptions || [];
  if (!subs.length) return;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  if (!data.subGenerated) data.subGenerated = [];
  let changed = false;

  subs.forEach(s => {
    const genKey = `${s.id}_${monthKey}`;
    if (data.subGenerated.includes(genKey)) return;

    // 判斷本月是否應產生
    const freq = s.frequency || 'monthly';
    if (freq === 'quarterly') {
      const startMonth = (s.month - 1 + 12) % 12;
      const diff = (month - startMonth + 12) % 12;
      if (diff % 3 !== 0) return;
    } else if (freq === 'annual') {
      if (month + 1 !== s.month) return;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(s.day, daysInMonth);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
    data.records.unshift({
      id: `sub_rec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'expense',
      amount: s.amount,
      categoryId:   s.categoryId,
      categoryName: s.categoryName,
      categoryIcon: s.categoryIcon,
      description: s.name,
      date: dateStr,
      isSubscription: true,
    });
    data.subGenerated.push(genKey);
    changed = true;
  });

  if (changed) {
    saveUserData(currentUser, data);
    renderRecords();
  }
}

// ── Export JSON ──
function exportJSON() {
  const data = getUserData(currentUser);
  const names = getUserNames();
  const name = currentUser === 'user1' ? names.user1 : names.user2;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `記帳本_${name}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export Excel ──
function exportExcel() {
  const data = getUserData(currentUser);
  const names = getUserNames();
  const name = currentUser === 'user1' ? names.user1 : names.user2;

  const rows = data.records.map(r => ({
    日期: r.date,
    類型: r.type === 'expense' ? '支出' : '收入',
    類別: r.categoryName,
    品項: r.description,
    金額: r.amount,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '記帳記錄');
  XLSX.writeFile(wb, `記帳本_${name}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Import helpers ──
function showImportResult(msg, isError = false) {
  const el = document.getElementById('import-result');
  el.textContent = msg;
  el.className = 'import-result ' + (isError ? 'error' : 'success');
}

function mergeRecords(existing, incoming) {
  const ids = new Set(existing.map(r => r.id));
  let added = 0;
  incoming.forEach(r => {
    if (!ids.has(r.id)) { existing.push(r); added++; }
  });
  return added;
}

// ── Import JSON ──
function importJSON(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.records || !Array.isArray(parsed.records)) throw new Error('格式不符');
      const data = getUserData(currentUser);
      const added = mergeRecords(data.records, parsed.records);
      saveUserData(currentUser, data);
      renderRecords();
      showImportResult(`✅ 匯入成功，新增 ${added} 筆記錄（重複略過）`);
    } catch (err) {
      showImportResult('❌ 匯入失敗：' + err.message, true);
    }
  };
  reader.readAsText(file);
}

// ── Import Excel ──
function importExcel(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      if (!rows.length) throw new Error('檔案內沒有資料');

      const data = getUserData(currentUser);
      const cats = [...data.categories.expense, ...data.categories.income];

      const newRecords = rows.map((row, i) => {
        const typeRaw = String(row['類型'] || '').trim();
        const type = typeRaw === '收入' ? 'income' : 'expense';
        const catName = String(row['類別'] || '').trim();
        const cat = cats.find(c => c.name === catName);
        return {
          id: `import_${Date.now()}_${i}`,
          type,
          amount: parseFloat(row['金額']) || 0,
          categoryId:   cat ? cat.id   : 'other_exp',
          categoryName: cat ? cat.name : catName || '其他',
          categoryIcon: cat ? cat.icon : '💸',
          description: String(row['品項'] || '').trim() || catName || '匯入記錄',
          date: String(row['日期'] || '').trim(),
        };
      }).filter(r => r.amount > 0 && r.date);

      const added = mergeRecords(data.records, newRecords);
      saveUserData(currentUser, data);
      renderRecords();
      showImportResult(`✅ 匯入成功，新增 ${added} 筆記錄（共讀取 ${rows.length} 列）`);
    } catch (err) {
      showImportResult('❌ 匯入失敗：' + err.message, true);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Clear By Year ──
function populateClearYearSelect() {
  const data = getUserData(currentUser);
  const years = [...new Set(data.records.map(r => new Date(r.date).getFullYear()))].sort((a,b) => b - a);
  const sel = document.getElementById('clear-year-select');
  if (!sel) return;
  if (years.length === 0) {
    sel.innerHTML = '<option value="">（無資料）</option>';
    return;
  }
  sel.innerHTML = years.map(y => `<option value="${y}">${y} 年</option>`).join('');
}

function clearByYear() {
  const input = document.getElementById('clear-confirm-input').value.trim();
  if (input !== 'clear') { alert('請輸入 clear 確認清除'); return; }
  const sel = document.getElementById('clear-year-select');
  const year = parseInt(sel.value);
  if (!year) { alert('沒有可清除的年份'); return; }
  const data = getUserData(currentUser);
  const before = data.records.length;
  data.records = data.records.filter(r => new Date(r.date).getFullYear() !== year);
  const removed = before - data.records.length;
  saveUserData(currentUser, data);
  document.getElementById('clear-confirm-input').value = '';
  populateClearYearSelect();
  renderRecords();
  renderAnnualChart();
  alert(`已清除 ${year} 年共 ${removed} 筆記錄。`);
}

// ── Category name migration ──
const CATEGORY_RENAMES = { '居住': '家用', '日常開銷': '家用', '教育': '進修' };
function migrateCategories(userId) {
  const data = getUserData(userId);
  let changed = false;

  // 改名
  ['expense', 'income'].forEach(type => {
    (data.categories[type] || []).forEach(c => {
      if (CATEGORY_RENAMES[c.name]) {
        c.name = CATEGORY_RENAMES[c.name];
        changed = true;
      }
    });
  });

  // 補上新預設類別（若 id 不存在才加）
  const existingIds = new Set(data.categories.expense.map(c => c.id));
  DEFAULT_CATEGORIES.expense.forEach(c => {
    if (!existingIds.has(c.id)) {
      // 插入到「其他支出」前面
      const otherIdx = data.categories.expense.findIndex(x => x.id === 'other_exp');
      if (otherIdx >= 0) data.categories.expense.splice(otherIdx, 0, { ...c });
      else data.categories.expense.push({ ...c });
      changed = true;
    }
  });

  if (changed) saveUserData(userId, data);
}

// ── Dark Mode ──
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('budget_dark_mode', isDark ? '1' : '0');
  updateDarkModeBtn();
  closeMenu();
  // 重繪目前可見的圖表
  if (document.getElementById('tab-monthly').classList.contains('active')) renderMonthlyChart();
  if (document.getElementById('tab-annual').classList.contains('active'))  renderAnnualChart();
}

function updateDarkModeBtn() {
  const btn = document.getElementById('dark-mode-btn');
  if (!btn) return;
  const isDark = document.body.classList.contains('dark');
  btn.textContent = isDark ? '☀️ 淺色模式' : '🌙 深色模式';
}

function initDarkMode() {
  if (localStorage.getItem('budget_dark_mode') === '1') {
    document.body.classList.add('dark');
  }
  updateDarkModeBtn();
}

// ── Boot ──
migrateCategories('user1');
migrateCategories('user2');
refreshUserNameDisplay();
initDarkMode();
