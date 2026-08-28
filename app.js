// 1. Pastikan isi URL Web App Google Apps Script Anda di sini
const API_URL = "https://script.google.com/macros/s/AKfycbyhZZoZUOfGvZR7NnOeb__6RyDzP_yZ3QS39SHnGvLzIpYqgXE271-zh2XeeiA0r8YVwg/exec";

// 2. PIN Rahasia Input Audit
const SECRET_PIN = "1234";

let rawAuditData = [];
let chartStoreInstance = null;
let chartPillarInstance = null;
let findingCounter = 0;

// Pembersih angka desimal super aman
function cleanNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  let str = val.toString().replace('%', '').replace(',', '.').trim();
  let num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Fungsi Menambah Input Temuan Baru (Multiple Findings)
function addFindingRow() {
  findingCounter++;
  const container = document.getElementById('findingsContainer');
  const rowId = `finding_row_${findingCounter}`;

  const html = `
    <div id="${rowId}" class="bg-white p-3 rounded border border-gray-200 relative space-y-2 shadow-sm">
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-[11px] font-bold text-emerald-700">Temuan #${findingCounter}</span>
        ${findingCounter > 1 ? `<button type="button" onclick="removeFindingRow('${rowId}')" class="text-red-500 font-bold text-[10px] hover:underline">Hapus</button>` : ''}
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold mb-1">Tingkat & Pilar</label>
          <div class="flex gap-1">
            <select class="finding-level border rounded p-1 text-xs w-1/3 bg-gray-50">
              <option value="Minor">Minor</option>
              <option value="Mayor">Mayor</option>
              <option value="Kritis">Kritis</option>
            </select>
            <select class="finding-pillar border rounded p-1 text-xs w-2/3 bg-gray-50">
              <option value="Hygiene">Hygiene</option>
              <option value="Healthy">Healthy</option>
              <option value="Fresh">Fresh</option>
              <option value="Halal">Halal</option>
              <option value="Clean">Clean</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold mb-1">Kode / Sub-Pilar (opsional)</label>
          <input type="text" class="finding-code border rounded p-1 text-xs w-full" placeholder="Misal: H1, He1, C7" />
        </div>

        <div>
          <label class="block text-[10px] font-bold mb-1">Target Selesai Perbaikan</label>
          <input type="date" class="finding-duedate border rounded p-1 text-xs w-full" required />
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold mb-1">Detail Temuan Auditor</label>
        <input type="text" class="finding-detail border rounded p-1.5 text-xs w-full" placeholder="Jelaskan temuan ketidaksesuaian..." required />
      </div>

      <div>
        <label class="block text-[10px] font-bold mb-1">Tindakan Awal (Koreksi Langsung)</label>
        <input type="text" class="finding-action border rounded p-1.5 text-xs w-full" placeholder="Contoh: Peneguran untuk memakai masker / Retraining cook" />
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

function removeFindingRow(rowId) {
  const elem = document.getElementById(rowId);
  if (elem) elem.remove();
}

// Navigasi Menu
function switchTab(tab) {
  const btnCharts = document.getElementById('navCharts');
  const btnDashboard = document.getElementById('navDashboard');
  const btnAuditForm = document.getElementById('navAuditForm');

  const tabCharts = document.getElementById('tabCharts');
  const tabDashboard = document.getElementById('tabDashboard');
  const tabAuditForm = document.getElementById('tabAuditForm');

  btnCharts.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  btnDashboard.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  btnAuditForm.className = "bg-amber-500 hover:bg-amber-400 text-gray-900 px-4 py-2 rounded text-xs font-bold transition";

  if (tab === 'charts') {
    tabCharts.classList.remove('hidden');
    tabDashboard.classList.add('hidden');
    tabAuditForm.classList.add('hidden');
    btnCharts.className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
    applyFilter();
  } else if (tab === 'dashboard') {
    tabDashboard.classList.remove('hidden');
    tabCharts.classList.add('hidden');
    tabAuditForm.classList.add('hidden');
    btnDashboard.className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
  } else if (tab === 'auditForm') {
    const userPin = prompt("Masukkan PIN Khusus Auditor untuk Mengisi Audit:");
    if (userPin === SECRET_PIN) {
      tabAuditForm.classList.remove('hidden');
      tabDashboard.classList.add('hidden');
      tabCharts.classList.add('hidden');
    } else if (userPin !== null) {
      alert("PIN Salah! Akses pengisian audit ditolak.");
    }
  }
}

async function loadData() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400">Memuat data audit...</td></tr>`;

  try {
    const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
    rawAuditData = await response.json();
    applyFilter();
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Gagal memuat data. Periksa koneksi internet atau URL API.</td></tr>`;
  }
}

function applyFilter() {
  const selectedStore = document.getElementById('filterStore').value;
  document.getElementById('lblFilterTarget').innerText = selectedStore === 'ALL' ? 'Semua Store' : selectedStore;

  let filteredData = rawAuditData;
  if (selectedStore !== 'ALL') {
    filteredData = rawAuditData.filter(item => {
      let storeName = item.Store || item.store || '';
      return storeName.toString().trim().toLowerCase() === selectedStore.trim().toLowerCase();
    });
  }

  renderDashboard(filteredData);
}

function renderDashboard(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400">Belum ada data audit untuk filter ini.</td></tr>`;
    document.getElementById('statAvgScore').innerText = '0.0%';
    document.getElementById('statActiveTemuan').innerText = '0';
    document.getElementById('statTotalAudit').innerText = '0';
    document.getElementById('avgHygienic').innerText = '0.0%';
    document.getElementById('avgHealthy').innerText = '0.0%';
    document.getElementById('avgFresh').innerText = '0.0%';
    document.getElementById('avgHalal').innerText = '0.0%';
    document.getElementById('avgClean').innerText = '0.0%';
    renderCharts({}, { Hygiene: 0, Healthy: 0, Fresh: 0, Halal: 0, Clean: 0 });
    return;
  }

  let totalAvgAll = 0;
  let activeTemuan = 0;

  let sumH = 0, sumHe = 0, sumF = 0, sumHa = 0, sumC = 0;
  let pillarCount = { Hygiene: 0, Healthy: 0, Fresh: 0, Halal: 0, Clean: 0 };
  let storeScores = {};

  data.forEach(item => {
    let h = cleanNumber(item.Score_Hygienic || item.Score_H || item.Hygienic);
    let he = cleanNumber(item.Score_Healthy || item.Score_He || item.Healthy);
    let f = cleanNumber(item.Score_Fresh || item.Score_F || item.Fresh);
    let ha = cleanNumber(item.Score_Halal || item.Score_Ha || item.Halal);
    let c = cleanNumber(item.Score_Clean || item.Score_C || item.Clean);

    let currentAvg = cleanNumber(item.Average_Score || item.Average);
    if (currentAvg === 0) {
      currentAvg = (h + he + f + ha + c) / 5;
    }

    totalAvgAll += currentAvg;
    sumH += h;
    sumHe += he;
    sumF += f;
    sumHa += ha;
    sumC += c;

    let status = item.Status || item.status || 'Pending';
    if (status !== 'Done') activeTemuan++;

    let pillar = item.Pillar_Temuan || item.Pillar || item.pillar || 'Hygiene';
    if (pillarCount[pillar] !== undefined) pillarCount[pillar]++;

    let storeName = item.Store || item.store || 'Unknown';
    storeScores[storeName] = currentAvg.toFixed(1);

    let badgeColor = status === 'Done' ? 'bg-emerald-100 text-emerald-800' : 
                    (status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800');

    let itemID = item.ID || item.id || '';
    let tgl = item.Tanggal || item.tanggal || '-';
    let detail = item.Detail_Temuan || item.Detail || item.temuan || '-';
    let tindakanAwal = item.Tindakan_Awal || item.tindakan || '-';
    let target = item.Target_Selesai || item.DueDate || item.dueDate || '-';
    let kodeSub = item.Kode_Sub || item.kode || '';

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3">${tgl}</td>
        <td class="p-3 font-bold">${storeName}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded bg-gray-100 border text-[10px]">${pillar} ${kodeSub ? `(${kodeSub})` : ''}</span></td>
        <td class="p-3">${detail}</td>
        <td class="p-3 text-gray-600 font-medium">${tindakanAwal}</td>
        <td class="p-3">${target}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${status}</span></td>
        <td class="p-3">
          <button onclick="updateStatus('${itemID}', '${status}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded text-[10px]">
            Change Status
          </button>
        </td>
      </tr>
    `;
  });

  const totalItem = data.length;
  
  document.getElementById('statAvgScore').innerText = `${(totalAvgAll / totalItem).toFixed(1)}%`;
  document.getElementById('statActiveTemuan').innerText = activeTemuan;
  document.getElementById('statTotalAudit').innerText = totalItem;

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

// Submit Multiple Findings ke Google Sheets
async function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  btn.innerText = "Mengirim...";
  btn.disabled = true;

  const store = document.getElementById('inputStore').value;
  const tglWaktu = document.getElementById('inputTanggalWaktu').value;
  const auditor = document.getElementById('inputAuditor').value;
  const storeLeader = document.getElementById('inputStoreLeader').value;
  const auditKe = document.getElementById('inputAuditKe').value;
  const predikat = document.getElementById('inputPredikat').value;

  const scoreH = cleanNumber(document.getElementById('scoreH').value);
  const scoreHe = cleanNumber(document.getElementById('scoreHe').value);
  const scoreF = cleanNumber(document.getElementById('scoreF').value);
  const scoreHa = cleanNumber(document.getElementById('scoreHa').value);
  const scoreC = cleanNumber(document.getElementById('scoreC').value);

  const findingRows = document.querySelectorAll('#findingsContainer > div');
  const findingsList = [];

  findingRows.forEach(row => {
    findingsList.push({
      level: row.querySelector('.finding-level').value,
      pillar: row.querySelector('.finding-pillar').value,
      code: row.querySelector('.finding-code').value,
      dueDate: row.querySelector('.finding-duedate').value,
      detail: row.querySelector('.finding-detail').value,
      action: row.querySelector('.finding-action').value
    });
  });

  const payload = {
    action: "CREATE_MULTIPLE",
    store: store,
    tanggalWaktu: tglWaktu,
    auditor: auditor,
    storeLeader: storeLeader,
    auditKe: auditKe,
    predikat: predikat,
    scoreH: scoreH,
    scoreHe: scoreHe,
    scoreF: scoreF,
    scoreHa: scoreHa,
    scoreC: scoreC,
    findings: findingsList
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    alert("Seluruh data audit dan temuan berhasil disimpan!");
    document.getElementById('auditForm').reset();
    document.getElementById('findingsContainer').innerHTML = '';
    addFindingRow();
    switchTab('charts');
    loadData();
  } catch (err) {
    alert("Gagal menyimpan audit.");
    console.error(err);
  } finally {
    btn.innerText = "Simpan Seluruh Data Audit & Temuan";
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

window.onload = function() {
  addFindingRow();
  loadData();
};