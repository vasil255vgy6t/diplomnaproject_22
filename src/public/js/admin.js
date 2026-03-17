const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const statsCards = document.getElementById('statsCards');
const resultsTableWrap = document.getElementById('resultsTableWrap');
const applyFilter = document.getElementById('applyFilter');

let token = localStorage.getItem('adminToken') || null;
let dailyChartInstance = null;
let levelChartInstance = null;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;

  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  const data = await response.json();

  if (!response.ok) {
    loginMessage.textContent = data.message || 'Помилка авторизації.';
    return;
  }

  token = data.token;
  localStorage.setItem('adminToken', token);
  loginMessage.textContent = 'Успішний вхід.';
  await initDashboard();
});

async function initDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  await Promise.all([loadStats(), loadResults(), loadAdmins()]);
}

async function loadStats() {
  const response = await fetch('/api/admin/dashboard', { headers: authHeaders() });
  if (!response.ok) return;

  const data = await response.json();
  statsCards.innerHTML = `
    <article class="card"><h4>Кількість тестів</h4><p>${data.summary.tests}</p></article>
    <article class="card"><h4>Загальна кількість результатів</h4><p>${data.summary.results}</p></article>
    <article class="card"><h4>Середній бал</h4><p>${data.summary.averageScore}</p></article>
  `;

  const dailyCtx = document.getElementById('dailyChart');
  const levelCtx = document.getElementById('levelChart');

  if (dailyChartInstance) dailyChartInstance.destroy();
  if (levelChartInstance) levelChartInstance.destroy();

  dailyChartInstance = new Chart(dailyCtx, {
    type: 'line',
    data: {
      labels: data.dailyStats.map((item) => item.day),
      datasets: [{
        label: 'Кількість проходжень',
        data: data.dailyStats.map((item) => item.count),
        borderColor: '#1f6feb',
        backgroundColor: 'rgba(31, 111, 235, 0.15)',
        fill: true,
        tension: 0.25
      }]
    }
  });

  levelChartInstance = new Chart(levelCtx, {
    type: 'doughnut',
    data: {
      labels: data.levelStats.map((item) => item.result_level),
      datasets: [{
        data: data.levelStats.map((item) => item.count),
        backgroundColor: ['#1f6feb', '#60a5fa', '#93c5fd', '#bfdbfe']
      }]
    }
  });
}

async function loadResults() {
  const from = document.getElementById('fromDate').value;
  const to = document.getElementById('toDate').value;
  const testId = document.getElementById('filterTestId').value;
  const level = document.getElementById('filterLevel').value;

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (testId) params.append('testId', testId);
  if (level) params.append('level', level);

  const response = await fetch(`/api/admin/results?${params.toString()}`, { headers: authHeaders() });
  if (!response.ok) return;

  const results = await response.json();
  resultsTableWrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>ID</th><th>Тест</th><th>Бал</th><th>Рівень</th><th>Дата</th>
        </tr>
      </thead>
      <tbody>
        ${results.map((row) => `
          <tr>
            <td>${row.id}</td>
            <td>${row.test_title}</td>
            <td>${row.total_score}</td>
            <td>${row.result_level}</td>
            <td>${row.created_at}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

applyFilter.addEventListener('click', loadResults);

document.getElementById('newTestForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('newTestTitle').value;
  const description = document.getElementById('newTestDescription').value;

  const response = await fetch('/api/admin/tests', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, description })
  });

  if (response.ok) {
    alert('Тест додано.');
    e.target.reset();
    loadStats();
  }
});

async function loadAdmins() {
  const response = await fetch('/api/admin/admins', { headers: authHeaders() });
  if (!response.ok) return;
  const admins = await response.json();

  const el = document.getElementById('adminsList');
  el.innerHTML = `
    <table class="table">
      <thead><tr><th>ID</th><th>Логін</th><th>Email</th></tr></thead>
      <tbody>
      ${admins.map((admin) => `<tr><td>${admin.id}</td><td>${admin.username}</td><td>${admin.email}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('newAdminForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value;
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;

  const response = await fetch('/api/admin/admins', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, email, password })
  });

  if (response.ok) {
    alert('Адміністратора створено.');
    e.target.reset();
    loadAdmins();
  }
});

if (token) initDashboard();
