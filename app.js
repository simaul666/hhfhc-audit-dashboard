const API_URL = "https://script.google.com/macros/s/AKfycbwPEv-sfmvtVeSoSmXf3hFYrVWmBUUiW_t_C8erYJ3fcmrV0nBlV3AhDFCKIdiU2OcV9g/exec";

let chartStoreInstance = null;
let chartPillarInstance = null;

function switchTab(tab) {
  if (tab === 'dashboard') {
    document.getElementById('tabDashboard').classList.remove('hidden');
    document.getElementById('tabAuditForm').classList.add('hidden');
    loadData();
  } else {
    document.getElementById('tabDashboard').classList.add('hidden');
    document.getElementById('tabAuditForm').classList.remove('hidden');
  }
}

async function loadData() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    renderDashboard(data);
  } catch (error) {
    console.error("Gagal mengambil data:", error);
  }
}

function renderDashboard(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">Belum ada data audit.</td></tr>`;
    return;
  }

  let totalAvg = 0;
  let activeTemuan = 0;
  let pillarCount = { Hygienic: 0, Healthy: 0, Fresh: 0, Halal: 0, Clean: 0 };
  let storeScores = {};

  data.forEach(item => {
    const currentScore = parseFloat(item.Average_Score || 0);
    totalAvg += currentScore;

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

  const overallAvg = (totalAvg / data.length).toFixed(1);
  document.getElementById('statAvgScore').innerText = `${overallAvg}%`;
  document.getElementById('statActiveTemuan').innerText = activeTemuan;
  document.getElementById('statTotalAudit').innerText = Object.keys(storeScores).length;

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
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Score: ${context.raw}%`;
            }
          }
        }
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
    scoreH: parseFloat(document.getElementById('scoreH').value),
    scoreHe: parseFloat(document.getElementById('scoreHe').value),
    scoreF: parseFloat(document.getElementById('scoreF').value),
    scoreHa: parseFloat(document.getElementById('scoreHa').value),
    scoreC: parseFloat(document.getElementById('scoreC').value),
    pillar: document.getElementById('inputPillar').value,
    temuan: document.getElementById('inputTemuan').value,
    dueDate: document.getElementById('inputDueDate').value,
    auditor: "Irfan Maulana"
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    alert("Audit berhasil disimpan!");
    document.getElementById('auditForm').reset();
    switchTab('dashboard');
  } catch (err) {
    alert("Gagal menyimpan audit.");
    console.error(err);
  } finally {
    btn.innerText = "Simpan Data Audit";
    btn.disabled = false;
  }
}

async function updateStatus(id, currentStatus) {
  let nextStatus = currentStatus === 'Pending' ? 'In Progress' : (currentStatus === 'In Progress' ? 'Done' : 'Pending');
  
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "UPDATE_STATUS", id: id, newStatus: nextStatus })
    });
    loadData();
  } catch (err) {
    alert("Gagal memperbarui status.");
  }
}

window.onload = loadData;