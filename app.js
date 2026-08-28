var SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4wB4mdqzA-5EYoq4qZ2lqbCTxHspG7OkSj9eURT3Pt0T9_N4DqMMErsY94bKq-fjgpQ/exec"; 

var allData = [];
var storeChartInstance = null;
var pillarChartInstance = null;

document.addEventListener("DOMContentLoaded", function() {
  var inputTgl = document.getElementById("inputTanggalWaktu");
  if (inputTgl) {
    inputTgl.value = new Date().toISOString().split("T")[0];
  }
  
  addFindingRow();
  loadData();
});

function switchTab(tabName) {
  document.getElementById("tabCharts").classList.add("hidden");
  document.getElementById("tabDashboard").classList.add("hidden");
  document.getElementById("tabAuditForm").classList.add("hidden");

  document.getElementById("navCharts").className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  document.getElementById("navDashboard").className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";
  document.getElementById("navAuditForm").className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition";

  if (tabName === "charts") {
    document.getElementById("tabCharts").classList.remove("hidden");
    document.getElementById("navCharts").className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
  } else if (tabName === "dashboard") {
    document.getElementById("tabDashboard").classList.remove("hidden");
    document.getElementById("navDashboard").className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition";
  } else if (tabName === "auditForm") {
    document.getElementById("tabAuditForm").classList.remove("hidden");
    document.getElementById("navAuditForm").className = "bg-amber-500 hover:bg-amber-400 text-gray-900 px-4 py-2 rounded text-xs font-bold transition";
  }
}

function formatDateClean(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  var str = String(dateStr);
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  if (str.length >= 10 && str.charAt(4) === "-" && str.charAt(7) === "-") {
    return str.substring(0, 10);
  }
  return str;
}

function loadData() {
  fetch(SCRIPT_URL)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      allData = data;
      applyFilter();
    })
    .catch(function(err) {
      console.error("Gagal mengambil data:", err);
    });
}

function applyFilter() {
  var filterStore = document.getElementById("filterStore").value;
  document.getElementById("lblFilterTarget").innerText = filterStore === "ALL" ? "Semua Store" : filterStore;

  var filteredData = allData.filter(function(row) {
    if (filterStore === "ALL") return true;
    return String(row.Store).toLowerCase() === filterStore.toLowerCase();
  });

  renderTable(filteredData);
  renderMetrics(filteredData);
  renderCharts(filteredData);
}

function renderTable(data) {
  var tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400">Tidak ada data audit untuk store ini.</td></tr>';
    return;
  }

  data.forEach(function(row) {
    var tr = document.createElement("tr");
    
    var statusBadgeClass = "bg-amber-100 text-amber-800";
    if (row.Status === "Done") statusBadgeClass = "bg-emerald-100 text-emerald-800 font-bold";
    if (row.Status === "In Progress") statusBadgeClass = "bg-blue-100 text-blue-800 font-bold";

    var tglFormatted = formatDateClean(row.Tanggal);
    var targetFormatted = formatDateClean(row.Target_Selesai);

    tr.innerHTML = `
      <td class="p-3 font-medium text-gray-600">${tglFormatted}</td>
      <td class="p-3 font-bold text-gray-800">${row.Store || "-"}</td>
      <td class="p-3">
        <span class="bg-gray-100 border text-gray-700 text-[10px] px-2 py-0.5 rounded font-semibold">${row.Pillar_Temuan || "Hygiene"}</span>
        <span class="text-[10px] text-gray-400 block mt-0.5">${row.Kode_Sub || "-"}</span>
      </td>
      <td class="p-3 text-gray-700">${row.Detail_Temuan || "-"}</td>
      <td class="p-3 text-gray-700 font-medium">${row.Tindakan_Awal || "-"}</td>
      <td class="p-3 text-gray-600 font-medium">${targetFormatted}</td>
      <td class="p-3">
        <span class="px-2 py-1 rounded text-[10px] ${statusBadgeClass}">${row.Status || "Pending"}</span>
      </td>
      <td class="p-3">
        <button onclick="updateStatusPrompt('${row.ID}', '${row.Status}')" class="border border-blue-500 text-blue-600 hover:bg-blue-50 text-[10px] px-2 py-1 rounded font-semibold transition">
          Change Status
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMetrics(data) {
  if (data.length === 0) {
    document.getElementById("statAvgScore").innerText = "0.0%";
    document.getElementById("statActiveTemuan").innerText = "0";
    document.getElementById("statTotalAudit").innerText = "0";
    document.getElementById("avgHygienic").innerText = "0.0%";
    document.getElementById("avgHealthy").innerText = "0.0%";
    document.getElementById("avgFresh").innerText = "0.0%";
    document.getElementById("avgHalal").innerText = "0.0%";
    document.getElementById("avgClean").innerText = "0.0%";
    return;
  }

  var sumAvg = 0, sumH = 0, sumHe = 0, sumF = 0, sumHa = 0, sumC = 0;
  var activeTemuanCount = 0;

  data.forEach(function(item) {
    sumAvg += parseFloat(item.Average_Score) || 0;
    sumH += parseFloat(item.Score_Hygienic) || 0;
    sumHe += parseFloat(item.Score_Healthy) || 0;
    sumF += parseFloat(item.Score_Fresh) || 0;
    sumHa += parseFloat(item.Score_Halal) || 0;
    sumC += parseFloat(item.Score_Clean) || 0;

    if (item.Status !== "Done" && item.Detail_Temuan !== "Tidak Ada Temuan") {
      activeTemuanCount++;
    }
  });

  var total = data.length;
  document.getElementById("statAvgScore").innerText = (sumAvg / total).toFixed(1) + "%";
  document.getElementById("statActiveTemuan").innerText = activeTemuanCount;
  document.getElementById("statTotalAudit").innerText = total;

  document.getElementById("avgHygienic").innerText = (sumH / total).toFixed(1) + "%";
  document.getElementById("avgHealthy").innerText = (sumHe / total).toFixed(1) + "%";
  document.getElementById("avgFresh").innerText = (sumF / total).toFixed(1) + "%";
  document.getElementById("avgHalal").innerText = (sumHa / total).toFixed(1) + "%";
  document.getElementById("avgClean").innerText = (sumC / total).toFixed(1) + "%";
}

function renderCharts(data) {
  var storeScores = {};
  var pillarCounts = { "Hygiene": 0, "Healthy": 0, "Fresh": 0, "Halal": 0, "Clean": 0 };

  data.forEach(function(item) {
    var storeName = item.Store || "Unknown";
    var score = parseFloat(item.Average_Score) || 0;

    if (!storeScores[storeName]) {
      storeScores[storeName] = { totalScore: 0, count: 0 };
    }
    storeScores[storeName].totalScore += score;
    storeScores[storeName].count += 1;

    var p = item.Pillar_Temuan;
    if (pillarCounts.hasOwnProperty(p) && item.Detail_Temuan !== "Tidak Ada Temuan") {
      pillarCounts[p] += 1;
    }
  });

  var storeLabels = Object.keys(storeScores);
  var storeAvgData = storeLabels.map(function(s) {
    return (storeScores[s].totalScore / storeScores[s].count).toFixed(1);
  });

  var ctxStore = document.getElementById("chartStoreScore").getContext("2d");
  if (storeChartInstance) storeChartInstance.destroy();
  storeChartInstance = new Chart(ctxStore, {
    type: "bar",
    data: {
      labels: storeLabels,
      datasets: [{
        label: "Nilai Rata-Rata (%)",
        data: storeAvgData,
        backgroundColor: "#059669"
      }]
    },
    options: {
      responsive: true,
      scales: { y: { min: 0, max: 100 } }
    }
  });

  var ctxPillar = document.getElementById("chartPillar").getContext("2d");
  if (pillarChartInstance) pillarChartInstance.destroy();
  pillarChartInstance = new Chart(ctxPillar, {
    type: "doughnut",
    data: {
      labels: Object.keys(pillarCounts),
      datasets: [{
        data: Object.values(pillarCounts),
        backgroundColor: ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"]
      }]
    },
    options: { responsive: true }
  });
}

function addFindingRow() {
  var container = document.getElementById("findingsContainer");
  var index = container.children.length + 1;

  var div = document.createElement("div");
  div.className = "finding-item bg-white p-3 rounded border border-gray-200 relative space-y-2";
  div.innerHTML = `
    <div class="flex justify-between items-center border-b pb-1">
      <span class="font-bold text-[11px] text-gray-600">Temuan #${index}</span>
      ${index > 1 ? `<button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 font-bold text-xs hover:underline">Hapus</button>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
      <div>
        <label class="block text-[10px] font-bold text-gray-500">Pillar Audit</label>
        <select class="finding-pillar w-full border rounded p-1.5 text-xs bg-gray-50 font-semibold">
          <option value="Hygiene">Hygiene</option>
          <option value="Healthy">Healthy</option>
          <option value="Fresh">Fresh</option>
          <option value="Halal">Halal</option>
          <option value="Clean">Clean</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold text-gray-500">Kode Sub Checklist</label>
        <input type="text" class="finding-code w-full border rounded p-1.5 text-xs" placeholder="Contoh: HYG-01" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-[10px] font-bold text-gray-500">Target Selesai (CAPA)</label>
        <input type="date" class="finding-dueDate w-full border rounded p-1.5 text-xs bg-white" />
      </div>
    </div>
    <div>
      <label class="block text-[10px] font-bold text-gray-500">Detail Ketidaksesuaian / Temuan Auditor</label>
      <textarea class="finding-detail w-full border rounded p-1.5 text-xs bg-white" rows="2" placeholder="Tuliskan temuan secara detail..."></textarea>
    </div>
    <div>
      <label class="block text-[10px] font-bold text-gray-500">Tindakan Koreksi Awal</label>
      <input type="text" class="finding-action w-full border rounded p-1.5 text-xs bg-white" placeholder="Contoh: Langsung dibersihkan saat audit" />
    </div>
  `;
  container.appendChild(div);
}

function submitForm(e) {
  e.preventDefault();
  var btn = document.getElementById("btnSubmit");
  btn.innerText = "Mengirim Data...";
  btn.disabled = true;

  var findingItems = document.querySelectorAll(".finding-item");
  var findingsData = [];

  findingItems.forEach(function(item) {
    var detailInput = item.querySelector(".finding-detail").value.trim();
    var actionInput = item.querySelector(".finding-action").value.trim();
    
    if (detailInput !== "") {
      findingsData.push({
        pillar: item.querySelector(".finding-pillar").value,
        code: item.querySelector(".finding-code").value.trim(),
        dueDate: item.querySelector(".finding-dueDate").value,
        detail: detailInput,
        action: actionInput !== "" ? actionInput : "-"
      });
    }
  });

  var payload = {
    action: "CREATE_MULTIPLE",
    store: document.getElementById("inputStore").value,
    tanggalWaktu: document.getElementById("inputTanggalWaktu").value,
    auditor: document.getElementById("inputAuditor").value,
    storeLeader: document.getElementById("inputStoreLeader").value,
    auditKe: document.getElementById("inputAuditKe").value,
    predikat: document.getElementById("inputPredikat").value,
    scoreH: document.getElementById("scoreH").value,
    scoreHe: document.getElementById("scoreHe").value,
    scoreF: document.getElementById("scoreF").value,
    scoreHa: document.getElementById("scoreHa").value,
    scoreC: document.getElementById("scoreC").value,
    findings: findingsData
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(res) {
    alert(res.message);
    document.getElementById("auditForm").reset();
    document.getElementById("findingsContainer").innerHTML = "";
    addFindingRow();
    switchTab("dashboard");
    loadData();
  })
  .catch(function(err) {
    alert("Gagal mengirim data: " + err);
  })
  .finally(function() {
    btn.innerText = "Simpan Seluruh Data Audit & Temuan";
    btn.disabled = false;
  });
}

function updateStatusPrompt(id, currentStatus) {
  var newStatus = prompt("Pilih status baru (Pending / In Progress / Done):", currentStatus);
  if (!newStatus) return;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "UPDATE_STATUS",
      id: id,
      newStatus: newStatus
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(res) {
    alert(res.message);
    loadData();
  })
  .catch(function(err) {
    alert("Gagal memperbarui status: " + err);
  });
}