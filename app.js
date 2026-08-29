// GANTI STRING DI BAWAH INI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwtVSXL_i0khg70MV75MUPnBxxj5vslCR4IYQNqig3taNwqVSvRpWQBfOg1UKcJIersQ/exec";

var rawAuditData = [];

// ==================== NAVIGASI TAB ====================
function switchTab(tabName) {
  var tabCharts = document.getElementById("tabCharts");
  var tabDashboard = document.getElementById("tabDashboard");
  var tabAuditForm = document.getElementById("tabAuditForm");

  if (tabCharts) tabCharts.classList.add("hidden");
  if (tabDashboard) tabDashboard.classList.add("hidden");
  if (tabAuditForm) tabAuditForm.classList.add("hidden");

  ["navCharts", "navDashboard", "navAuditForm"].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition cursor-pointer";
  });

  if (tabName === "charts" && tabCharts) {
    tabCharts.classList.remove("hidden");
    document.getElementById("navCharts").className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition cursor-pointer";
  } else if (tabName === "dashboard" && tabDashboard) {
    tabDashboard.classList.remove("hidden");
    document.getElementById("navDashboard").className = "bg-emerald-600 px-4 py-2 rounded text-xs font-semibold shadow transition cursor-pointer";
  } else if (tabName === "auditForm" && tabAuditForm) {
    tabAuditForm.classList.remove("hidden");
    document.getElementById("navAuditForm").className = "bg-amber-500 hover:bg-amber-400 text-gray-900 px-4 py-2 rounded text-xs font-bold transition cursor-pointer";
  }
}

// ==================== LOAD DATA DARI GOOGLE SHEETS ====================
function loadData() {
  var tbody = document.getElementById("tableBody");
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400">Memuat data dari Google Sheets...</td></tr>';
  }

  // Menggunakan redirect: "follow" untuk menangani sistem redirect Google Apps Script
  fetch(SCRIPT_URL, {
    method: "GET",
    redirect: "follow"
  })
    .then(function(res) {
      if (!res.ok) {
        throw new Error("HTTP error! status: " + res.status);
      }
      return res.json();
    })
    .then(function(response) {
      if (response.status === "success" && response.data) {
        rawAuditData = response.data;
        renderTable(rawAuditData);
        calculateMetrics(rawAuditData);
      } else {
        throw new Error(response.message || "Gagal mengambil data dari server");
      }
    })
    .catch(function(err) {
      console.error("Error Load Data:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Gagal memuat data! Periksa SCRIPT_URL atau atur akses deployment ke Anyone.</td></tr>';
      }
    });
}

// ==================== RENDER TABEL ====================
function renderTable(data) {
  var tbody = document.getElementById("tableBody");
  if (!tbody) return;

  if (!data || data.length <= 1) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400">Belum ada data audit yang tersimpan.</td></tr>';
    return;
  }

  var html = "";
  // Lewati baris 0 (Header Spreadsheet)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var tgl = row[0] ? new Date(row[0]).toLocaleDateString('id-ID') : '-';
    var store = row[1] || '-';
    var pillar = row[2] || '-';
    var temuan = row[3] || '-';
    var tindakan = row[4] || '-';
    var target = row[5] ? new Date(row[5]).toLocaleDateString('id-ID') : '-';
    var status = row[6] || 'Open';

    var statusColor = (status.toLowerCase() === 'selesai' || status.toLowerCase() === 'closed')
      ? 'bg-emerald-100 text-emerald-800' 
      : 'bg-amber-100 text-amber-800';

    html += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3">${tgl}</td>
        <td class="p-3 font-semibold text-gray-800">${store}</td>
        <td class="p-3">${pillar}</td>
        <td class="p-3">${temuan}</td>
        <td class="p-3">${tindakan}</td>
        <td class="p-3">${target}</td>
        <td class="p-3"><span class="${statusColor} text-[10px] px-2 py-1 rounded font-bold">${status}</span></td>
        <td class="p-3"><button type="button" class="text-xs text-blue-600 hover:underline font-semibold">Detail</button></td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

// ==================== HITUNG RINGKASAN STATISTIK ====================
function calculateMetrics(data) {
  if (!data || data.length <= 1) return;

  var total = data.length - 1;
  var activeTemuan = 0;

  for (var i = 1; i < data.length; i++) {
    var status = (data[i][6] || '').toString().toLowerCase();
    if (status !== 'selesai' && status !== 'closed') {
      activeTemuan++;
    }
  }

  document.getElementById("statTotalAudit").innerText = total;
  document.getElementById("statActiveTemuan").innerText = activeTemuan;
  document.getElementById("statAvgScore").innerText = "85.4%";
}

// ==================== FILTER TABEL STORE ====================
function applyFilter() {
  var selectedStore = document.getElementById("filterStore").value;
  document.getElementById("lblFilterTarget").innerText = selectedStore === "ALL" ? "Semua Store" : selectedStore;

  if (selectedStore === "ALL") {
    renderTable(rawAuditData);
  } else {
    var filtered = rawAuditData.filter(function(row, index) {
      return index === 0 || row[1] === selectedStore;
    });
    renderTable(filtered);
  }
}

// OTOMATIS JALANKAN SAAT HALAMAN SELESAI DIMUAT
document.addEventListener("DOMContentLoaded", function() {
  loadData();
});