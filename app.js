var SCRIPT_URL = " https://script.google.com/macros/s/AKfycby4wB4mdqzA-5EYoq4qZ2lqbCTxHspG7OkSj9eURT3Pt0T9_N4DqMMErsY94bKq-fjgpQ/exec
"; 

var allData = [];
var storeChartInstance = null;
var pillarChartInstance = null;

// Daftar Store Resmi
var LIST_STORE = [
  "Pandanwangi", "Cileunyi", "Jatos", "Cipasir", 
  "Legok Jabar", "Simpang Lima", "Cimanuk", 
  "Singaparna", "Siliwangi", "Indihiang", "Bulak Laut"
];

// Konfigurasi Worker PDF.js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

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

// 1. PROSES BACA PDF
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
    var rawText = "";

    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var textContent = await page.getTextContent();
      
      var lastY;
      var pageText = "";
      for (var item of textContent.items) {
        if (lastY !== item.transform[5] && lastY !== undefined) {
          pageText += "\n";
        }
        pageText += item.str + " ";
        lastY = item.transform[5];
      }
      rawText += pageText + "\n---PAGE---\n";
    }

    parsePdfDataAndFillForm(rawText);
    if (statusLbl) statusLbl.innerText = "PDF Berhasil Diekstrak!";
  } catch (err) {
    console.error("Gagal membaca PDF:", err);
    alert("Gagal membaca file PDF. Pastikan format PDF sesuai!");
    if (statusLbl) statusLbl.innerText = "Gagal memproses PDF.";
  }
}

// 2. PARSER TEPAT SESUAI KRITERIA
function parsePdfDataAndFillForm(text) {
  
  // A. EKSTRAKSI NAMA STORE (SESUAI DAFTAR RESMI)
  var matchedStore = LIST_STORE.find(s => new RegExp("\\b" + s + "\\b", "i").test(text));
  if (matchedStore) {
    document.getElementById("inputStore").value = "LC " + matchedStore;
  } else {
    var storeMatch = text.match(/Nama Store\s*[:|-]?\s*([^\n\r]+)/i);
    if (storeMatch) document.getElementById("inputStore").value = storeMatch[1].replace(/\|/g, "").trim();
  }

  // B. EKSTRAKSI TANGGAL
  var tglMatch = text.match(/(\d{4}-\d{2}-\d{2})/) || text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  if (tglMatch) {
    var dateVal = tglMatch[1];
    if (dateVal.includes("/")) {
      var parts = dateVal.split("/");
      dateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    document.getElementById("inputTanggalWaktu").value = dateVal;
  }

  // C. EKSTRAKSI AUDITOR (MENGHINDARI NAMA JABATAN)
  var auditorMatch = text.match(/Auditor\s*[:|-]?\s*([A-Za-z\s]+?)(?=\s+Jabatan|\s+Store Leader|\s+Shift|\n|$)/i) ||
                     text.match(/AUDITOR\s+([A-Za-z\s]+?)(?=\s+JABATAN|\s+STORE LEADER|\n|$)/i);
  if (auditorMatch) {
    var cleanAuditor = auditorMatch[1].replace(/\|/g, "").replace(/Jabatan.*/i, "").trim();
    document.getElementById("inputAuditor").value = cleanAuditor;
  }

  // D. STORE LEADER
  var leaderMatch = text.match(/Store Leader\s*[:|-]?\s*([A-Za-z\s]+?)(?=\s+Jabatan|\s+Jenis Audit|\n|$)/i) || 
                      text.match(/STORE LEADER\s+([A-Za-z\s]+?)(?=\s+JENIS AUDIT|\s+SHIFT|\n|$)/i);
  if (leaderMatch) {
    document.getElementById("inputStoreLeader").value = leaderMatch[1].replace(/\|/g, "").trim();
  }

  // E. AUDIT KE
  var auditKeMatch = text.match(/Audit Ke[-]?\s*[:|-]?\s*(\d+)/i) || text.match(/AUDIT KE-\s*\|\s*(\d+)/i);
  if (auditKeMatch) {
    document.getElementById("inputAuditKe").value = auditKeMatch[1];
  }

  // F. PREDIKAT
  var predikatMatch = text.match(/Predikat\s*[:|-]?\s*([^\n\r]+)/i) || 
                        text.match(/PREDIKAT\s+([A-Za-z\s]+?)(?=\n|Unsur|Hygiene|$)/i);
  if (predikatMatch) {
    document.getElementById("inputPredikat").value = predikatMatch[1].replace(/\|/g, "").trim();
  }

  // G. SKOR 5 PILAR (%)
  var extractPillarScore = function(pillarName) {
    var reg = new RegExp(pillarName + "[\\s\\S]{0,50}?(\\d{1,3}(?:\\.\\d+)?)\\s*%", "i");
    var m = text.match(reg);
    return m ? parseFloat(m[1]) : null;
  };

  var hScore = extractPillarScore("Hygiene");
  var heScore = extractPillarScore("Healthy");
  var fScore = extractPillarScore("Fresh");
  var haScore = extractPillarScore("Halal");
  var cScore = extractPillarScore("Clean");

  if (hScore !== null) document.getElementById("scoreH").value = hScore;
  if (heScore !== null) document.getElementById("scoreHe").value = heScore;
  if (fScore !== null) document.getElementById("scoreF").value = fScore;
  if (haScore !== null) document.getElementById("scoreHa").value = haScore;
  if (cScore !== null) document.getElementById("scoreC").value = cScore;

  // H. RINCIAN TEMUAN (MEMISAHKAN RINGKASAN TEMUAN DENGAN TEMUAN MENGGAGALKAN AUDIT)
  var container = document.getElementById("findingsContainer");
  container.innerHTML = "";

  var summaryText = text;
  var idxRingkasan = text.search(/Ringkasan Temuan/i);
  var idxKritis = text.search(/Temuan Kritis|Menggagalkan Audit|Temuan Fatal/i);

  if (idxRingkasan !== -1) {
    if (idxKritis !== -1 && idxKritis > idxRingkasan) {
      summaryText = text.substring(idxRingkasan, idxKritis);
    } else {
      summaryText = text.substring(idxRingkasan);
    }
  }

  var lines = summaryText.split("\n");
  var findingsList = [];
  var currentFinding = null;

  var pilarList = ["Hygiene", "Healthy", "Fresh", "Halal", "Clean"];
  var levelList = ["Minor", "Mayor"];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var foundPillar = pilarList.find(p => new RegExp("\\b" + p + "\\b", "i").test(line));
    var foundLevel = levelList.find(l => new RegExp("\\b" + l + "\\b", "i").test(line));

    if (foundPillar && (foundLevel || line.includes("NC") || /\b[A-Z]\d+\b/.test(line))) {
      if (currentFinding) {
        findingsList.push(currentFinding);
      }

      var codeMatch = line.match(/\b([A-Z0-9]{2,6})\b/);
      var detectedCode = codeMatch ? codeMatch[1] : "-";

      currentFinding = {
        pillar: foundPillar,
        code: detectedCode,
        detail: line,
        action: "-"
      };
    } else if (currentFinding) {
      if (line.toLowerCase().includes("tindakan") || line.toLowerCase().includes("action") || line.toLowerCase().includes("koreksi")) {
        currentFinding.action = line.replace(/tindakan awal|tindakan koreksi|action/gi, "").replace(/[:|-]/g, "").trim();
      } else if (!line.includes("---PAGE---") && !line.toLowerCase().includes("halaman")) {
        currentFinding.detail += " " + line;
      }
    }
  }

  if (currentFinding) {
    findingsList.push(currentFinding);
  }

  if (findingsList.length > 0) {
    findingsList.forEach(function(item) {
      var cleanDetail = item.detail.replace(/Hygiene|Healthy|Fresh|Halal|Clean|Minor|Mayor/gi, "").replace(/[:|]/g, "").trim();
      addFindingRowWithData(item.pillar, item.code, cleanDetail || item.detail, item.action);
    });
  } else {
    addFindingRow();
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
          <option value="Hygiene" ${pillar.toLowerCase() === "hygiene" ? "selected" : ""}>Hygiene</option>
          <option value="Healthy" ${pillar.toLowerCase() === "healthy" ? "selected" : ""}>Healthy</option>
          <option value="Fresh" ${pillar.toLowerCase() === "fresh" ? "selected" : ""}>Fresh</option>
          <option value="Halal" ${pillar.toLowerCase() === "halal" ? "selected" : ""}>Halal</option>
          <option value="Clean" ${pillar.toLowerCase() === "clean" ? "selected" : ""}>Clean</option>
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
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500 font-semibold">Memuat data dari Google Sheets...</td></tr>';

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

// RENDER TABEL DASHBOARD (KODE DISEMBUNYIKAN)
function renderTable(data) {
  var tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">Tidak ada data audit untuk ditampilkan.</td></tr>';
    return;
  }

  data.forEach(function(row) {
    var tr = document.createElement("tr");
    
    var storeVal = row.Store || row.store || "-";
    var tglVal = row.Tanggal || row.tanggal || "-";
    var pillarVal = row.Pillar_Temuan || row.pillar || "Hygiene";
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

// RENDER CHARTS: SKOR HHFHC UPDATE TERBARU PER STORE (KIRI) & DISTRIBUSI PILAR (KANAN)
function renderCharts(data) {
  var storeLatestScores = {};
  var pillarCounts = { "Hygiene": 0, "Healthy": 0, "Fresh": 0, "Halal": 0, "Clean": 0 };

  data.forEach(function(item) {
    var storeName = item.Store || item.store || "Unknown";
    var score = parseFloat(item.Average_Score || item.average_score) || 0;
    var rawDate = item.Tanggal || item.tanggal || "";
    var itemDate = rawDate ? new Date(rawDate).getTime() : 0;

    // Ambil nilai audit terbaru (paling akhir secara tanggal) per store
    if (!storeLatestScores[storeName]) {
      storeLatestScores[storeName] = { score: score, latestDate: itemDate };
    } else {
      if (itemDate >= storeLatestScores[storeName].latestDate) {
        storeLatestScores[storeName].score = score;
        storeLatestScores[storeName].latestDate = itemDate;
      }
    }

    var p = item.Pillar_Temuan || item.pillar;
    var detail = item.Detail_Temuan || item.detail || "";
    if (pillarCounts.hasOwnProperty(p) && detail !== "Tidak Ada Temuan") pillarCounts[p] += 1;
  });

  var storeLabels = Object.keys(storeLatestScores);
  var storeLatestData = storeLabels.map(s => storeLatestScores[s].score.toFixed(1));

  // Render Bar Chart (Skor Terakhir Update HHFHC per Store) - Posisi Kiri
  var ctxStore = document.getElementById("chartStoreScore").getContext("2d");
  if (storeChartInstance) storeChartInstance.destroy();
  storeChartInstance = new Chart(ctxStore, {
    type: "bar",
    data: { 
      labels: storeLabels, 
      datasets: [{ 
        label: "Skor Audit Terakhir (%)", 
        data: storeLatestData, 
        backgroundColor: "#059669" 
      }] 
    },
    options: { 
      responsive: true, 
      scales: { y: { min: 0, max: 100 } } 
    }
  });

  // Render Doughnut Chart (Distribusi Temuan Pilar) - Posisi Kanan
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