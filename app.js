// GANTI STRING DI BAWAH INI DENGAN URL WEB APP ANDA
var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvBm9ThNQDHmRz5PmHpHgoeCNBlkKiCzLSCjfrKcoljkGHRfOYYWl02BUduqE6bTmgiA/exec";

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

  window.handleScriptData = function(response) {
    if (response && response.status === "success" && Array.isArray(response.data)) {
      rawAuditData = response.data;
      renderTable(rawAuditData);
      calculateMetrics(rawAuditData);
    } else {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Gagal mengambil data dari Google Sheets.</td></tr>';
      }
    }
  };

  var script = document.createElement("script");
  script.src = SCRIPT_URL + (SCRIPT_URL.indexOf("?") >= 0 ? "&" : "?") + "callback=handleScriptData&t=" + new Date().getTime();
  script.onerror = function() {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">Gagal memuat script data. Pastikan SCRIPT_URL benar.</td></tr>';
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
  // Baris ke-0 adalah Header
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;

    var tgl = row[0] ? formatDate(row[0]) : '-';
    var store = row[1] || '-';
    var pillar = row[2] || '-';
    var temuan = row[3] || '-';
    var tindakan = row[4] || '-';
    var target = row[5] ? formatDate(row[5]) : '-';
    var status = row[6] || 'Open';

    var statusColor = (status.toString().toLowerCase() === 'selesai' || status.toString().toLowerCase() === 'closed')
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

// ==================== HITUNG METRIK & NILAI AUDIT TERAKHIR ====================
function calculateMetrics(data) {
  if (!data || data.length <= 1) return;

  var total = data.length - 1;
  var activeTemuan = 0;
  var lastScore = "0%";

  // 1. Cari Nilai Audit Terakhir (Diambil dari baris paling bawah/terakhir yang memiliki angka nilai)
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    // Mengecek apakah ada nilai di kolom ke-8 (Kolom H) atau kolom ke-4/9 tergantung letak skor di Sheet Anda
    var rawScore = row[7] !== undefined ? row[7] : (row[8] !== undefined ? row[8] : null);
    
    if (rawScore !== null && rawScore !== "" && !isNaN(parseFloat(rawScore))) {
      var numScore = parseFloat(rawScore);
      // Jika angka desimal kecil (contoh 0.85 -> 85%)
      if (numScore <= 1 && numScore > 0) {
        lastScore = (numScore * 100).toFixed(1) + "%";
      } else {
        lastScore = numScore.toFixed(1) + "%";
      }
      break; // Ambil yang paling akhir lalu hentikan loop
    }
  }

  // 2. Hitung Temuan Aktif
  for (var j = 1; j < data.length; j++) {
    var status = (data[j][6] || '').toString().toLowerCase();
    if (status !== 'selesai' && status !== 'closed') {
      activeTemuan++;
    }
  }

  // Render ke Card Tampilan
  var elAvg = document.getElementById("statAvgScore");
  var elActive = document.getElementById("statActiveTemuan");
  var elTotal = document.getElementById("statTotalAudit");

  if (elAvg) elAvg.innerText = lastScore;
  if (elActive) elActive.innerText = activeTemuan;
  if (elTotal) elTotal.innerText = total;
}

// ==================== FILTER DATA STORE ====================
function applyFilter() {
  var selectedStore = document.getElementById("filterStore").value;
  var lbl = document.getElementById("lblFilterTarget");
  if (lbl) lbl.innerText = selectedStore === "ALL" ? "Semua Store" : selectedStore;

  if (selectedStore === "ALL") {
    renderTable(rawAuditData);
    calculateMetrics(rawAuditData);
  } else {
    var filtered = rawAuditData.filter(function(row, index) {
      return index === 0 || (row[1] && row[1].toString().trim() === selectedStore.trim());
    });
    renderTable(filtered);
    calculateMetrics(filtered);
  }
}

// ==================== HELPER FORMAT TANGGAL ====================
function formatDate(val) {
  try {
    var d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID');
    }
  } catch(e) {}
  return val;
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", function() {
  loadData();
});