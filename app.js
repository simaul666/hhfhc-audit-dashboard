var SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4wB4mdqzA-5EYoq4qZ2lqbCTxHspG7OkSj9eURT3Pt0T9_N4DqMMErsY94bKq-fjgpQ/exec"; 

var allData = [];
var storeChartInstance = null;
var pillarChartInstance = null;

// Konfigurasi Worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

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

// 1. BACA FILE PDF DENGAN PERBAIKAN PEMBERSIHAN TEKS
async function handlePdfUpload(event) {
  var file = event.target.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Silakan pilih file PDF Laporan Audit yang valid!");
    return;
  }

  var statusLbl = document.getElementById("pdfUploadStatus");
  if (statusLbl) statusLbl.innerText = "Membaca & Memproses PDF...";

  try {
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var fullText = "";

    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var textContent = await page.getTextContent();
      // Gabungkan token teks dengan spasi yang bersih
      var pageText = textContent.items.map(s => s.str).join(" ");
      fullText += pageText + "\n";
    }

    console.log("=== TEKS HASIL EKSTRAKSI PDF ===");
    console.log(fullText);

    parsePdfDataAndFillForm(fullText);
    if (statusLbl) statusLbl.innerText = "PDF Berhasil Diekstrak!";
  } catch (err) {
    console.error("Gagal membaca PDF:", err);
    alert("Gagal membaca file PDF. Pastikan format PDF sesuai!");
    if (statusLbl) statusLbl.innerText = "Gagal memproses PDF.";
  }
}

// 2. PARSER TEPAT SESUAI STRUKTUR HASIL AUDIT QA
function parsePdfDataAndFillForm(text) {
  // A. Ekstrak Nama Store (Misal: LC Siliwangi Tasik)
  var storeMatch = text.match(/(LC\s+[A-Za-z0-9\s]+?)(?=\s+Kode Store|$)/i);
  if (storeMatch) {
    document.getElementById("inputStore").value = storeMatch[1].trim();
  }

  // B. Ekstrak Tanggal
  var tglMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (tglMatch) {
    document.getElementById("inputTanggalWaktu").value = tglMatch[1];
  }

  // C. Ekstrak Auditor
  var auditorMatch = text.match(/AUDITOR\s+([A-Za-z\s]+?)(?=\s+STORE LEADER|\s+JABATAN|$)/i);
  if (auditorMatch) {
    document.getElementById("inputAuditor").value = auditorMatch[1].trim();
  }

  // D. Ekstrak Store Leader
  var leaderMatch = text.match(/STORE LEADER\s+([A-Za-z\s]+?)(?=\s+JENIS AUDIT|\s+SHIFT|$)/i);
  if (leaderMatch) {
    document.getElementById("inputStoreLeader").value = leaderMatch[1].trim();
  }

  // E. Ekstrak Audit Ke
  var auditKeMatch = text.match(/AUDIT KE-\s*\|\s*(\d+)/i) || text.match(/AUDIT KE-\s*(\d+)/i);
  if (auditKeMatch) {
    document.getElementById("inputAuditKe").value = auditKeMatch[1];
  }

  // F. Ekstrak Predikat
  var predikatMatch = text.match(/PREDIKAT\s+([A-Za-z\s]+?)(?=\s+Unsur|\s+Hygiene|$)/i);
  if (predikatMatch) {
    document.getElementById("inputPredikat").value = predikatMatch[1].trim();
  }

  // G. Ekstrak Skor 5 Pilar (%)
  var scoreH = text.match(/Hygiene\s*\|\s*[\d\.]+\s*\|\s*\d+\s*\|\s*(\d+)%/i);
  var scoreHe = text.match(/Healthy\s*\|\s*[\d\.]+\s*\|\s*\d+\s*\|\s*(\d+)%/i);
  var scoreF = text.match(/Fresh\s*\|\s*[\d\.]+\s*\|\s*\d+\s*\|\s*(\d+)%/i);
  var scoreHa = text.match(/Halal\s*\|\s*[\d\.]+\s*\|\s*\d+\s*\|\s*(\d+)%/i);
  var scoreC = text.match(/Clean\s*\|\s*[\d\.]+\s*\|\s*\d+\s*\|\s*(\d+)%/i);

  if (scoreH) document.getElementById("scoreH").value = scoreH[1];
  if (scoreHe) document.getElementById("scoreHe").value = scoreHe[1];
  if (scoreF) document.getElementById("scoreF").value = scoreF[1];
  if (scoreHa) document.getElementById("scoreHa").value = scoreHa[1];
  if (scoreC) document.getElementById("scoreC").value = scoreC[1];

  // H. Ekstrak Ringkasan Temuan
  var container = document.getElementById("findingsContainer");
  container.innerHTML = ""; // Reset form temuan

  // Ekstrak bagian teks Ringkasan Temuan
  var findingsSectionIndex = text.indexOf("Ringkasan Temuan");
  var criticalSectionIndex = text.indexOf("Temuan Kritis");

  var findingsText = text;
  if (findingsSectionIndex !== -1) {
    findingsText = text.substring(findingsSectionIndex, criticalSectionIndex !== -1 ? criticalSectionIndex : text.length);
  }

  // Regex fleksibel membaca per blok temuan
  var regexBlock = /(Minor|Mayor|Kritis)\s+(Hygiene|Healthy|Fresh|Halal|Clean)[\s\.\-]*([A-Za-z0-9]+)?([\s\S]*?)(?=(Minor|Mayor|Kritis)\s+(Hygiene|Healthy|Fresh|Halal|Clean)|Temuan Kritis|$)/gi;

  var match;
  var count = 0;

  while ((match = regexBlock.exec(findingsText)) !== null) {
    var pillar = match[2];
    var code = match[3] || "-";
    var content = match[4] || "";

    var detail = "-";
    var action = "-";

    var detailMatch = content.match(/Temuan:\s*(.*?)(?=\s*Tindakan awal:|$)/i);
    if (detailMatch) {
      detail = detailMatch[1].trim();
    }

    var actionMatch = content.match(/Tindakan awal:\s*(.*?)(?=$)/i);
    if (actionMatch) {
      action = actionMatch[1].trim();
    }

    // Jika ada isi detail/deskripsi temuan, masukkan ke form
    if (detail !== "-" || content.trim().length > 0) {
      count++;
      addFindingRowWithData(pillar, code, detail, action);
    }
  }

  if (count === 0) {
    addFindingRow(); // Tambah 1 baris kosong jika tidak ada temuan
  }
}

function addFindingRowWithData(pillar, code, detail, action) {
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
          <option value="Hygiene" ${pillar === "Hygiene" ? "selected" : ""}>Hygiene</option>
          <option value="Healthy" ${pillar === "Healthy" ? "selected" : ""}>Healthy</option>
          <option value="Fresh" ${pillar === "Fresh" ? "selected" : ""}>Fresh</option>
          <option value="Halal" ${pillar === "Halal" ? "selected" : ""}>Halal</option>
          <option value="Clean" ${pillar === "Clean" ? "selected" : ""}>Clean</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold text-gray-500">Kode Sub Checklist</label>
        <input type="text" class="finding-code w-full border rounded p-1.5 text-xs" value="${code}" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-[10px] font-bold text-gray-500">Target Selesai (CAPA)</label>
        <input type="date" class="finding-dueDate w-full border rounded p-1.5 text-xs bg-white" />
      </div>
    </div>
    <div>
      <label class="block text-[10px] font-bold text-gray-500">Detail Ketidaksesuaian / Temuan Auditor</label>
      <textarea class="finding-detail w-full border rounded p-1.5 text-xs bg-white" rows="2">${detail}</textarea>
    </div>
    <div>
      <label class="block text-[10px] font-bold text-gray-500">Tindakan Koreksi Awal</label>
      <input type="text" class="finding-action w-full border rounded p-1.5 text-xs bg-white" value="${action}" />
    </div>
  `;
  container.appendChild(div);
}

function formatDateClean(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  var str = String(dateStr);
  if (str.includes("T")) return str.split("T")[0];
  if (str.length >= 10 && str.charAt(4) === "-" && str.charAt(7) === "-") return str.substring(0, 10);
  return str;
}

function loadData() {
  var tbody = document.getElementById("tableBody");
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-500 font-semibold">Memuat data dari Google Sheets...</td></tr>';

  fetch(SCRIPT_URL)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (Array.isArray(data)) {
        allData = data;
        applyFilter();
      }
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
    var storeName = row.Store || row.store || "";
    return String(storeName).toLowerCase() === filterStore.toLowerCase();
  });

  renderTable(filteredData);
  renderMetrics(filteredData);
  renderCharts(filteredData);
}

function renderTable(data) {
  var tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-400">Tidak ada data audit untuk ditampilkan.</td></tr>';
    return;
  }

  data.forEach(function(row) {
    var tr = document.createElement("tr");
    
    var storeVal = row.Store || row.store || "-";
    var tglVal = row.Tanggal || row.tanggal || "-";
    var pillarVal = row.Pillar_Temuan || row.pillar || "Hygiene";
    var kodeVal = row.Kode_Sub || row.kode || "-";
    var detailVal = row.Detail_Temuan || row.detail || "-";
    var tindakanVal = row.Tindakan_Awal || row.tindakan || "-";
    var targetVal = row.Target_Selesai || row.target || "-";
    var statusVal = row.Status || row.status || "Pending";
    var idVal = row.ID || row.id || "";

    var statusBadgeClass = "bg-amber-100 text-amber-800";
    if (statusVal === "Done") statusBadgeClass = "bg-emerald-100 text-emerald-800 font-bold";
    if (statusVal === "In Progress") statusBadgeClass = "bg-blue-100 text-blue-800 font-bold";

    tr.innerHTML = `
      <td class="p-3 font-medium text-gray-600">${formatDateClean(tglVal)}</td>
      <td class="p-3 font-bold text-gray-800">${storeVal}</td>
      <td class="p-3">
        <span class="bg-gray-100 border text-gray-700 text-[10px] px-2 py-0.5 rounded font-semibold">${pillarVal}</span>
        <span class="text-[10px] text-gray-400 block mt-0.5">${kodeVal}</span>
      </td>
      <td class="p-3 text-gray-700">${detailVal}</td>
      <td class="p-3 text-gray-700 font-medium">${tindakanVal}</td>
      <td class="p-3 text-gray-600 font-medium">${formatDateClean(targetVal)}</td>
      <td class="p-3">
        <span class="px-2 py-1 rounded text-[10px] ${statusBadgeClass}">${statusVal}</span>
      </td>
      <td class="p-3">
        <button onclick="updateStatusPrompt('${idVal}', '${statusVal}')" class="border border-blue-500 text-blue-600 hover:bg-blue-50 text-[10px] px-2 py-1 rounded font-semibold transition">
          Change Status
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMetrics(data) {
  if (data.length === 0) return;
  var sumAvg = 0, sumH = 0, sumHe = 0, sumF = 0, sumHa = 0, sumC = 0;
  var activeTemuanCount = 0;

  data.forEach(function(item) {
    sumAvg += parseFloat(item.Average_Score || item.average_score) || 0;
    sumH += parseFloat(item.Score_Hygienic || item.score_hygienic) || 0;
    sumHe += parseFloat(item.Score_Healthy || item.score_healthy) || 0;
    sumF += parseFloat(item.Score_Fresh || item.score_fresh) || 0;
    sumHa += parseFloat(item.Score_Halal || item.score_halal) || 0;
    sumC += parseFloat(item.Score_Clean || item.score_clean) || 0;

    var status = item.Status || item.status || "Pending";
    var detail = item.Detail_Temuan || item.detail || "";
    if (status !== "Done" && detail !== "Tidak Ada Temuan") activeTemuanCount++;
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
    var storeName = item.Store || item.store || "Unknown";
    var score = parseFloat(item.Average_Score || item.average_score) || 0;

    if (!storeScores[storeName]) storeScores[storeName] = { totalScore: 0, count: 0 };
    storeScores[storeName].totalScore += score;
    storeScores[storeName].count += 1;

    var p = item.Pillar_Temuan || item.pillar;
    var detail = item.Detail_Temuan || item.detail || "";
    if (pillarCounts.hasOwnProperty(p) && detail !== "Tidak Ada Temuan") pillarCounts[p] += 1;
  });

  var storeLabels = Object.keys(storeScores);
  var storeAvgData = storeLabels.map(s => (storeScores[s].totalScore / storeScores[s].count).toFixed(1));

  var ctxStore = document.getElementById("chartStoreScore").getContext("2d");
  if (storeChartInstance) storeChartInstance.destroy();
  storeChartInstance = new Chart(ctxStore, {
    type: "bar",
    data: { labels: storeLabels, datasets: [{ label: "Nilai Rata-Rata (%)", data: storeAvgData, backgroundColor: "#059669" }] },
    options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
  });

  var ctxPillar = document.getElementById("chartPillar").getContext("2d");
  if (pillarChartInstance) pillarChartInstance.destroy();
  pillarChartInstance = new Chart(ctxPillar, {
    type: "doughnut",
    data: { labels: Object.keys(pillarCounts), datasets: [{ data: Object.values(pillarCounts), backgroundColor: ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"] }] },
    options: { responsive: true }
  });
}

function addFindingRow() {
  addFindingRowWithData("Hygiene", "", "", "");
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
  .then(res => res.json())
  .then(res => {
    alert(res.message);
    document.getElementById("auditForm").reset();
    document.getElementById("findingsContainer").innerHTML = "";
    addFindingRow();
    switchTab("dashboard");
    loadData();
  })
  .catch(err => alert("Gagal mengirim data: " + err))
  .finally(() => {
    btn.innerText = "Simpan Seluruh Data Audit & Temuan";
    btn.disabled = false;
  });
}

function updateStatusPrompt(id, currentStatus) {
  var newStatus = prompt("Pilih status baru (Pending / In Progress / Done):", currentStatus);
  if (!newStatus) return;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "UPDATE_STATUS", id: id, newStatus: newStatus })
  })
  .then(res => res.json())
  .then(res => {
    alert(res.message);
    loadData();
  })
  .catch(err => alert("Gagal memperbarui status: " + err));
}