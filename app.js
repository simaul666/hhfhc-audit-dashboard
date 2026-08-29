// GANTI STRING DI BAWAH INI DENGAN URL WEB APP ANDA
var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGEu75NxXsdCldX-CPDvYdJuwUkbNXyVdKhw5dhjwE6zvVEj_2yOazVDVKq60l2aw1HQ/exec";

var rawAuditData = [];

// ==================== NAVIGASI TAB ====================
function switchTab(tabName) {
  var tabCharts = document.getElementById("tabCharts");
  var tabDashboard = document.getElementById("tabDashboard");
  var tabAuditForm = document.getElementById("tabAuditForm");

  if (tabCharts) tabCharts.classList.add("hidden");
  if (tabDashboard) tabDashboard.classList.add("hidden");
  if (tabAuditForm) tabAuditForm.classList.add("hidden");

  // Reset Style Tombol Navigasi
  ["navCharts", "navDashboard", "navAuditForm"].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.className = "bg-emerald-900 hover:bg-emerald-600 px-4 py-2 rounded text-xs font-semibold transition cursor-pointer";
  });

  // Tampilkan Tab yang Dipilih
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

// ==================== LOAD DATA (JSONP) ====================
function loadData() {
  var tbody = document.getElementById("tableBody");
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400">Memuat data dari Google Sheets...</td></tr>';
  }

  // Definisikan fungsi callback untuk menangkap JSONP
  window.handleScriptData = function(response) {
    if (response && response.status === "success" && response.data) {
      rawAuditData = response.data;
      renderTable(rawAuditData);
      calculateMetrics(rawAuditData);
    } else {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Gagal mengambil data valid dari server.</td></tr>';
      }
    }
  };

  // Buat element script dan bypass keamanan CORS lokal menggunakan JSONP
  var script = document.createElement("script");
  script.src = SCRIPT_URL + (SCRIPT_URL.indexOf("?") >= 0 ? "&" : "?") + "callback=handleScriptData";
  script.onerror = function() {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Koneksi diblokir atau SCRIPT_URL salah.</td></tr>';
    }
  };

  document.body.appendChild(script);
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
  // Lewati baris ke-0 (Header tabel)
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

// ==================== HITUNG RINGKASAN METRIK ====================
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

// ==================== FILTER DATA STORE ====================
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

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", function() {
  loadData();
});