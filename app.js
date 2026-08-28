// 1. Pastikan isi URL API Google Apps Script Anda di sini
const API_URL = "https://script.google.com/macros/s/AKfycbyd1UWrm8xPfCGYlQOXbPnzMfq4rWTKypsfRxbIljNdSBVvURmve_-FTM6M18wLZwFSxQ/exec";

// 2. PIN Rahasia Input Audit
const SECRET_PIN = "1234";

let rawAuditData = []; // Menyimpan data mentah
let chartStoreInstance = null;
let chartPillarInstance = null;

function parseDecimalInput(val) {
  if (!val) return 0;
  let cleanStr = val.toString().replace(',', '.');
  let num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

// Navigasi Menu Terpisah
function switchTab(tab) {
  const btnDashboard = document.getElementById('navDashboard');
  const btnCharts = document.getElementById('navCharts');
  const btnAuditForm = document.getElementById('navAuditForm');

  const tabDashboard = document.getElementById('tabDashboard');
  const tabCharts = document.getElementById('tabCharts');
  const tabAuditForm = document.getElementById('tabAuditForm');

  // Reset Style Tombol
  btnDashboard.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  btnCharts.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  btnAuditForm.className = "bg-amber-500 hover:bg-amber-400 text-gray-900 px-4 py-2 rounded text-xs font-bold transition";

  if (tab === 'dashboard') {
    tabDashboard.classList.remove('hidden');
    tabCharts.classList.add('hidden');
    tabAuditForm.classList.add('hidden');
    btnDashboard.className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
  } else if (tab === 'charts') {
    tabDashboard.classList.add('hidden');
    tabCharts.classList.remove('hidden');
    tabAuditForm.classList.add('hidden');
    btnCharts.className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
    applyFilter(); // Render ulang grafik saat tab dibuka
  } else if (tab === 'auditForm') {
    const userPin = prompt("Masukkan PIN Khusus Auditor untuk Mengisi Audit:");
    if (userPin === SECRET_PIN) {
      tabDashboard.classList.add('hidden');
      tabCharts.classList.add('hidden');
      tabAuditForm.classList.remove('hidden');
    } else if (userPin !== null) {
      alert("PIN Salah! Akses pengisian audit ditolak.");
    }
  }
}

async function loadData() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">Memuat data audit...</td></tr>`;

  try {
    const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
    rawAuditData = await response.json();
    applyFilter();
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500 font-bold">Gagal memuat data. Periksa koneksi internet atau URL API.</td></tr>`;
  }
}

// Fungsi Filter Per Store
function applyFilter() {
  const selectedStore = document.getElementById('filterStore').value;
  document.getElementById('lblFilterTarget').innerText = selectedStore === 'ALL' ? 'Semua Store' : selectedStore;

  let filteredData = rawAuditData;
  if (selectedStore !== 'ALL') {
    filteredData = rawAuditData.filter(item => item.Store === selectedStore);
  }

  renderDashboard(filteredData);
}

function renderDashboard(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">Belum ada data audit untuk filter ini.</td></tr>`;
    document.getElementById('statAvgScore').innerText = '0.0%';
    document.getElementById('statActiveTemuan').innerText = '0';
    document.getElementById('statTotalAudit').innerText = '0';
    document.getElementById('avgHygienic').innerText = '0.0%';
    document.getElementById('avgHealthy').innerText = '0.0%';
    document.getElementById('avgFresh').innerText = '0.0%';
    document.getElementById('avgHalal').innerText = '0.0%';
    document.getElementById('avgClean').innerText = '0.0%';
    renderCharts({}, { Hygienic: 0, Healthy: 0, Fresh: 0, Halal: 0, Clean: 0 });
    return;
  }

  let totalAvg = 0;
  let activeTemuan = 0;

  let sumH = 0, sumHe = 0, sumF = 0, sumHa = 0, sumC = 0;
  let pillarCount = { Hygienic: 0, Healthy: 0, Fresh: 0, Halal: 0, Clean: 0 };
  let storeScores = {};

  data.forEach(item => {
    const currentScore = parseDecimalInput(item.Average_Score);
    totalAvg += currentScore;

    sumH += parseDecimalInput(item.Score_Hygienic);
    sumHe += parseDecimalInput(item.Score_Healthy);
    sumF += parseDecimalInput(item.Score_Fresh);
    sumHa += parseDecimalInput(item.Score_Halal);
    sumC += parseDecimalInput(item.Score_Clean);

    if (item.Status !== 'Done') activeTemuan++;
    if (pillarCount[item.Pillar_Temuan] !== undefined) pillarCount[item.Pillar_Temuan]++;
    
    storeScores[item.Store] = currentScore.toFixed(1);

    let badgeColor = item.Status === 'Done' ? 'bg-emerald-100 text-emerald-800' : 
                    (item.Status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800');

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3">${item.Tanggal}</td>
        <td class="p-3 font-bold">${item.Store}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded bg-gray-100 border text-[10px]">${item.Pillar_Temuan}</span></td>
        <td class="p-3">${item.Detail_Temuan}</td>
        <td class="p-3">${item.Target_Selesai}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${item.Status}</span></td>
        <td class="p-3">
          <button onclick="updateStatus('${item.ID}', '${item.Status}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded text-[10px]">
            Change Status
          </button>
        </td>
      </tr>
    `;
  });

  const totalItem = data.length;
  document.getElementById('statAvgScore').innerText = `${(totalAvg / totalItem).toFixed(1)}%`;
  document.getElementById('statActiveTemuan').innerText = activeTemuan;
  document.getElementById('statTotalAudit').innerText = totalItem;

  // Render Rata-rata Pilar HHFHC
  document.getElementById('avgHygienic').innerText = `${(sumH / totalItem).toFixed(1)}%`;
  document.getElementById('avgHealthy').innerText = `${(sumHe / totalItem).toFixed(1)}%`;
  document.getElementById('avgFresh').innerText = `${(sumF / totalItem).toFixed(1)}%`;
  document.getElementById('avgHalal').innerText = `${(sumHa / totalItem).toFixed(1)}%`;
  document.getElementById('avgClean').innerText = `${(sumC / totalItem).toFixed(1)}%`;

  renderCharts(storeScores, pillarCount);
}

function renderCharts(storeScores, pillarCount) {
  if (chartStoreInstance) chartStoreInstance.destroy();
  if (chartPillarInstance) chartPillarInstance.destroy();

  const ctxStore = document.getElementById('chartStoreScore').getContext('2d');
  chartStoreInstance = new Chart(ctxStore, {
    type: 'bar',
    data: {
      labels: Object.keys(storeScores),
      datasets: [{
        label: 'Score HHFHC (%)',
        data: Object.values(storeScores),
        backgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });

  const ctxPillar = document.getElementById('chartPillar').getContext('2d');
  chartPillarInstance = new Chart(ctxPillar, {
    type: 'doughnut',
    data: {
      labels: Object.keys(pillarCount),
      datasets: [{
        data: Object.values(pillarCount),
        backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
      }]
    },
    options: { responsive: true }
  });
}

async function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  btn.innerText = "Mengirim...";
  btn.disabled = true;

  const payload = {
    action: "CREATE",
    store: document.getElementById('inputStore').value,
    scoreH: parseDecimalInput(document.getElementById('scoreH').value),
    scoreHe: parseDecimalInput(document.getElementById('scoreHe').value),
    scoreF: parseDecimalInput(document.getElementById('scoreF').value),
    scoreHa: parseDecimalInput(document.getElementById('scoreHa').value),
    scoreC: parseDecimalInput(document.getElementById('scoreC').value),
    pillar: document.getElementById('inputPillar').value,
    temuan: document.getElementById('inputTemuan').value,
    dueDate: document.getElementById('inputDueDate').value,
    auditor: "Irfan Maulana"
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    alert("Audit berhasil disimpan!");
    document.getElementById('auditForm').reset();
    switchTab('dashboard');
    loadData();
  } catch (err) {
    alert("Gagal menyimpan audit.");
    console.error(err);
  } finally {
    btn.innerText = "Simpan Data Audit";
    btn.disabled = false;
  }
}

async function updateStatus(id, currentStatus) {
  const userPin = prompt("Masukkan PIN untuk Mengubah Status Action Plan:");
  if (userPin !== SECRET_PIN) {
    if (userPin !== null) alert("PIN Salah! Gagal mengubah status.");
    return;
  }

  let nextStatus = currentStatus === 'Pending' ? 'In Progress' : (currentStatus === 'In Progress' ? 'Done' : 'Pending');
  
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "UPDATE_STATUS", id: id, newStatus: nextStatus }),
      redirect: 'follow'
    });
    loadData();
  } catch (err) {
    alert("Gagal memperbarui status.");
  }
}

window.onload = loadData;