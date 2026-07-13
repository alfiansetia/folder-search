/* ════════════════════════════════════════════════════════════════════════════
   FolderScope — App Logic (Bootstrap 5 compatible)
   ════════════════════════════════════════════════════════════════════════════ */

"use strict";

// ─── State ──────────────────────────────────────────────────────────────────
const state = {
  rootPath: null,
  currentPath: null,
  history: [],
  entries: [],
  allEntries: [],
  viewMode: "grid", // 'grid' | 'list'
  filterType: "all",
  sortBy: "name-asc",
  isSearchMode: false,
  searchQuery: "",
  ssData: [],
  ssFilterQuery: "",
  ssFilterStatus: "all",
};

// ─── File Type Definitions ──────────────────────────────────────────────────
const FILE_TYPES = {
  folder: {
    exts: null,
    emoji: "📁",
    color: "#fbbf24",
    label: "Folder",
    bg: "rgba(251,191,36,0.15)",
  },
  image: {
    exts: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".ico",
      ".tiff",
      ".avif",
    ],
    emoji: "🖼️",
    color: "#34d399",
    label: "Gambar",
    bg: "rgba(52,211,153,0.15)",
  },
  video: {
    exts: [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
    emoji: "🎬",
    color: "#f87171",
    label: "Video",
    bg: "rgba(248,113,113,0.15)",
  },
  audio: {
    exts: [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"],
    emoji: "🎵",
    color: "#a78bfa",
    label: "Audio",
    bg: "rgba(167,139,250,0.15)",
  },
  doc: {
    exts: [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".odt",
      ".ods",
      ".odp",
      ".txt",
      ".rtf",
    ],
    emoji: "📄",
    color: "#60a5fa",
    label: "Dokumen",
    bg: "rgba(96,165,250,0.15)",
  },
  code: {
    exts: [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".html",
      ".css",
      ".php",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".cs",
      ".go",
      ".rs",
      ".rb",
      ".vue",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".sh",
      ".bat",
      ".sql",
      ".md",
    ],
    emoji: "💻",
    color: "#34d399",
    label: "Kode",
    bg: "rgba(52,211,153,0.15)",
  },
  archive: {
    exts: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".cab"],
    emoji: "📦",
    color: "#fb923c",
    label: "Arsip",
    bg: "rgba(251,146,60,0.15)",
  },
  exe: {
    exts: [".exe", ".msi", ".apk", ".dmg", ".deb", ".rpm"],
    emoji: "⚙️",
    color: "#94a3b8",
    label: "Program",
    bg: "rgba(148,163,184,0.15)",
  },
  font: {
    exts: [".ttf", ".otf", ".woff", ".woff2", ".eot"],
    emoji: "🔤",
    color: "#e879f9",
    label: "Font",
    bg: "rgba(232,121,249,0.15)",
  },
};

function getFileType(entry) {
  if (entry.isDirectory) return FILE_TYPES.folder;
  const ext = (entry.ext || "").toLowerCase();
  for (const [, type] of Object.entries(FILE_TYPES)) {
    if (type.exts && type.exts.includes(ext)) return type;
  }
  return {
    emoji: "📋",
    color: "#8b91b0",
    label: entry.ext ? entry.ext.toUpperCase().slice(1) : "File",
    bg: "rgba(139,145,176,0.12)",
  };
}

function getFilterKey(entry) {
  if (entry.isDirectory) return "folder";
  const ext = (entry.ext || "").toLowerCase();
  for (const [key, type] of Object.entries(FILE_TYPES)) {
    if (type.exts && type.exts.includes(ext)) return key;
  }
  return "other";
}

// ─── Format Helpers ─────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return bytes.toFixed(i === 0 ? 0 : 1) + " " + units[i];
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return (
    d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

function basename(p) {
  return p.replace(/\\/g, "/").split("/").pop() || p;
}

function truncatePath(p, maxLen = 35) {
  if (!p) return "";
  if (p.length <= maxLen) return p;
  const parts = p.replace(/\\/g, "/").split("/");
  if (parts.length <= 2) return "..." + p.slice(-maxLen);
  return parts[0] + "/.../" + parts[parts.length - 1];
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Sort & Filter ──────────────────────────────────────────────────────────
function sortEntries(entries) {
  const [field, dir] = state.sortBy.split("-");
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let va, vb;
    if (field === "name") {
      va = a.name.toLowerCase();
      vb = b.name.toLowerCase();
    }
    if (field === "size") {
      va = a.size || 0;
      vb = b.size || 0;
    }
    if (field === "date") {
      va = a.modified || "";
      vb = b.modified || "";
    }
    if (dir === "asc") return va < vb ? -1 : va > vb ? 1 : 0;
    else return va > vb ? -1 : va < vb ? 1 : 0;
  });
}

function filterEntries(entries) {
  if (state.filterType === "all") return entries;
  return entries.filter((e) => getFilterKey(e) === state.filterType);
}

// ─── DOM References ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const elEmptyState = $("empty-state");
const elLoadingState = $("loading-state");
const elFileGrid = $("file-grid");
const elFileListWrap = $("file-list-wrap");
const elFileListBody = $("file-list-body");
const elSearchHeader = $("search-header");
const elContextMenu = $("context-menu");
const elBreadcrumb = $("breadcrumb");
const elExplorerTools = $("explorer-tools");
const elSSView = $("spreadsheet-view");

// ─── Show/Hide States ───────────────────────────────────────────────────────
function show(el) {
  el.classList.remove("d-none");
  el.style.display = "";
}
function hide(el) {
  el.classList.add("d-none");
  el.style.display = "none";
}
function showFlex(el) {
  el.style.display = "flex";
}

function showEmpty() {
  elEmptyState.style.display = "flex";
  hide(elLoadingState);
  elFileGrid.style.display = "none";
  elFileListWrap.style.display = "none";
}
function showLoading() {
  hide(elEmptyState);
  elLoadingState.style.display = "flex";
  elFileGrid.style.display = "none";
  elFileListWrap.style.display = "none";
}
function showContent() {
  hide(elEmptyState);
  hide(elLoadingState);
  if (state.viewMode === "grid") {
    elFileGrid.style.display = "";
    elFileListWrap.style.display = "none";
  } else {
    elFileGrid.style.display = "none";
    elFileListWrap.style.display = "";
  }
}

// ─── Breadcrumb ─────────────────────────────────────────────────────────────
function renderBreadcrumb() {
  if (!state.rootPath || !state.currentPath) {
    elBreadcrumb.innerHTML = `
      <span class="bc-home"><i class="bi bi-house-door"></i></span>
      <span class="bc-sep"><i class="bi bi-chevron-right"></i></span>
      <span class="bc-item current" id="bc-root">FolderScope</span>`;
    return;
  }
  const rootNorm = state.rootPath.replace(/\\/g, "/");
  const currNorm = state.currentPath.replace(/\\/g, "/");
  const rel = currNorm.startsWith(rootNorm)
    ? currNorm.slice(rootNorm.length)
    : "";
  const parts = rel.split("/").filter(Boolean);
  const rootName = basename(state.rootPath);

  let html = `<span class="bc-home"><i class="bi bi-house-door"></i></span>
    <span class="bc-sep"><i class="bi bi-chevron-right"></i></span>`;
  html += `<span class="bc-item ${parts.length === 0 ? "current" : ""}" data-path="${state.rootPath}">${escHtml(rootName)}</span>`;

  let accumulated = state.rootPath;
  for (let i = 0; i < parts.length; i++) {
    accumulated = accumulated.replace(/\\/g, "/") + "/" + parts[i];
    const isCurrent = i === parts.length - 1;
    html += `<span class="bc-sep"><i class="bi bi-chevron-right"></i></span>`;
    html += `<span class="bc-item ${isCurrent ? "current" : ""}" data-path="${accumulated}">${escHtml(parts[i])}</span>`;
  }

  elBreadcrumb.innerHTML = html;
  elBreadcrumb.querySelectorAll(".bc-item:not(.current)").forEach((el) => {
    el.addEventListener("click", () => navigateTo(el.dataset.path));
  });
}

// ─── Render Grid ────────────────────────────────────────────────────────────
function renderGrid(entries) {
  if (entries.length === 0) {
    elFileGrid.innerHTML = `<div class="col-12"><div class="no-results">
      <div class="no-results-icon">🔍</div>
      <h5>Tidak ada item</h5>
      <p>Folder ini kosong atau tidak ada yang cocok dengan filter.</p>
    </div></div>`;
    return;
  }

  elFileGrid.innerHTML = entries
    .map((entry) => {
      const type = getFileType(entry);
      const sizeStr = entry.isDirectory ? "" : formatSize(entry.size);
      return `<div class="col-6 col-sm-4 col-md-3 col-lg-2">
      <div class="file-card ${entry.isDirectory ? "is-dir" : ""} fade-in"
           data-path="${entry.path}"
           data-is-dir="${entry.isDirectory}"
           title="${escHtml(entry.name)}">
        <div class="file-card-icon" style="filter: drop-shadow(0 2px 8px ${type.color}40)">${type.emoji}</div>
        <div class="file-card-name">${escHtml(entry.name)}</div>
        ${sizeStr ? `<div class="file-card-meta">${sizeStr}</div>` : ""}
      </div>
    </div>`;
    })
    .join("");

  elFileGrid.querySelectorAll(".file-card").forEach((card) => {
    card.addEventListener("click", (e) => handleFileClick(card, e));
    card.addEventListener("contextmenu", (e) =>
      showContextMenu(e, card.dataset.path, card.dataset.isDir === "true"),
    );
  });
}

// ─── Render List ────────────────────────────────────────────────────────────
function renderList(entries) {
  if (entries.length === 0) {
    elFileListBody.innerHTML = `<tr><td colspan="5"><div class="no-results">
      <div class="no-results-icon">🔍</div>
      <h5>Tidak ada item</h5>
      <p>Folder kosong atau tidak ada yang cocok.</p>
    </div></td></tr>`;
    return;
  }

  elFileListBody.innerHTML = entries
    .map((entry) => {
      const type = getFileType(entry);
      const sizeStr = entry.isDirectory ? "—" : formatSize(entry.size);
      const dateStr = formatDate(entry.modified);
      const relPath = entry.relativePath
        ? `<span class="search-path-badge"><i class="bi bi-folder me-1"></i>${escHtml(entry.relativePath)}</span>`
        : "";

      return `<tr data-path="${entry.path}" data-is-dir="${entry.isDirectory}">
      <td>
        <div class="file-name-cell">
          <span class="file-icon">${type.emoji}</span>
          <div>
            <span class="file-name-text">${escHtml(entry.name)}</span>
            ${relPath}
          </div>
        </div>
      </td>
      <td><span class="file-type-badge" style="color:${type.color};background:${type.bg}">${escHtml(type.label)}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${sizeStr}</td>
      <td style="font-size:11px;color:var(--text-muted)">${dateStr}</td>
      <td>
        <button class="list-action-btn me-1" data-action="open" title="Buka"><i class="bi bi-box-arrow-up-right"></i></button>
        <button class="list-action-btn" data-action="explorer" title="Explorer"><i class="bi bi-display"></i></button>
      </td>
    </tr>`;
    })
    .join("");

  elFileListBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".list-action-btn")) return;
      handleFileClick(row, e);
    });
    row.addEventListener("contextmenu", (e) =>
      showContextMenu(e, row.dataset.path, row.dataset.isDir === "true"),
    );

    row.querySelectorAll(".list-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.dataset.action === "open")
          window.electronAPI.openPath(row.dataset.path);
        if (btn.dataset.action === "explorer")
          window.electronAPI.showInExplorer(row.dataset.path);
      });
    });
  });
}

// ─── Handle File Click ──────────────────────────────────────────────────────
function handleFileClick(el, e) {
  const filePath = el.dataset.path;
  const isDir = el.dataset.isDir === "true";
  if (isDir) navigateTo(filePath);
  else window.electronAPI.openPath(filePath);
}

// ─── Navigate To ────────────────────────────────────────────────────────────
async function navigateTo(dirPath) {
  if (!dirPath) return;
  state.isSearchMode = false;
  elSearchHeader.classList.add("d-none");

  state.history.push(state.currentPath);
  state.currentPath = dirPath;

  $("btn-up").disabled = dirPath === state.rootPath;
  $("btn-refresh").disabled = false;

  showLoading();
  const entries = await window.electronAPI.readDir(dirPath);

  if (entries.error) {
    showToast("Error: " + entries.error, "error");
    showEmpty();
    return;
  }

  state.allEntries = entries;
  renderAll(entries);
  renderBreadcrumb();
  updateStats(entries);
}

// ─── Render All ─────────────────────────────────────────────────────────────
function renderAll(entries) {
  if (!entries) entries = state.allEntries;
  const filtered = filterEntries(sortEntries(entries));
  showContent();
  if (state.viewMode === "grid") renderGrid(filtered);
  else renderList(filtered);
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function updateStats(entries) {
  const dirs = entries.filter((e) => e.isDirectory).length;
  const files = entries.filter((e) => !e.isDirectory).length;
  const totalSize = entries.reduce((acc, e) => acc + (e.size || 0), 0);

  $("stat-folders").textContent = dirs;
  $("stat-files").textContent = files;
  $("stat-size").textContent = formatSize(totalSize);
  $("sidebar-stats").style.display = "flex";
}

// ─── Context Menu ───────────────────────────────────────────────────────────
let ctxPath = null;
let ctxIsDir = false;

function showContextMenu(e, filePath, isDir) {
  e.preventDefault();
  ctxPath = filePath;
  ctxIsDir = isDir;

  const menu = elContextMenu;
  menu.style.display = "block";
  menu.classList.add("show");

  const x = Math.min(e.clientX, window.innerWidth - 200);
  const y = Math.min(e.clientY, window.innerHeight - 140);
  menu.style.left = x + "px";
  menu.style.top = y + "px";
}

function hideContextMenu() {
  elContextMenu.style.display = "none";
  elContextMenu.classList.remove("show");
}

$("ctx-open").addEventListener("click", () => {
  if (ctxPath) window.electronAPI.openPath(ctxPath);
  hideContextMenu();
});
$("ctx-explorer").addEventListener("click", () => {
  if (ctxPath) window.electronAPI.showInExplorer(ctxPath);
  hideContextMenu();
});
$("ctx-copy-path").addEventListener("click", () => {
  if (ctxPath) {
    navigator.clipboard.writeText(ctxPath);
    showToast("Path disalin! 📋", "success");
  }
  hideContextMenu();
});

document.addEventListener("click", () => hideContextMenu());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideContextMenu();
});

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = "") {
  const container = $("toast-container");
  const toastId = "toast-" + Date.now();
  const bsType =
    type === "error" ? "danger" : type === "success" ? "success" : "primary";
  const icon =
    type === "error"
      ? "exclamation-triangle"
      : type === "success"
        ? "check-circle"
        : "info-circle";

  const html = `
    <div id="${toastId}" class="toast ${type}" role="alert" data-bs-autohide="true" data-bs-delay="3000">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi bi-${icon} text-${bsType}"></i>
        <span>${escHtml(msg)}</span>
      </div>
    </div>`;
  container.insertAdjacentHTML("beforeend", html);

  const el = document.getElementById(toastId);
  // Manual show (Bootstrap needs to be loaded, but we use vanilla approach)
  el.style.display = "block";
  el.style.opacity = "1";
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ─── Pick Folder ────────────────────────────────────────────────────────────
async function pickFolder() {
  const folderPath = await window.electronAPI.openFolder();
  if (!folderPath) return;

  state.rootPath = folderPath;
  state.history = [];

  localStorage.setItem("cached_root_path", folderPath);

  const name = basename(folderPath);
  $("target-name").textContent = name;
  $("target-path").textContent = truncatePath(folderPath);
  $("target-card").classList.add("has-target");

  $("btn-search").disabled = false;

  await navigateTo(folderPath);
}

// ─── Search ─────────────────────────────────────────────────────────────────
async function doSearch() {
  const query = $("search-input").value.trim();
  if (!query || !state.rootPath) return;

  state.searchQuery = query;
  state.isSearchMode = true;

  showLoading();

  const options = {
    recursive: $("opt-recursive").checked,
    caseSensitive: $("opt-case-sensitive").checked,
    exactMatch: $("opt-exact-match").checked,
  };

  const results = await window.electronAPI.search(
    state.rootPath,
    query,
    options,
  );

  elSearchHeader.classList.remove("d-none");
  elSearchHeader.style.display = "flex";
  $("sr-query").textContent = `"${query}"`;
  $("sr-count").textContent =
    `${results.length} hasil${results.length >= 500 ? " (maks)" : ""}`;

  state.allEntries = results;
  renderAll(results);
  updateStats(results);
  renderBreadcrumb();
}

// ─── View Switching ─────────────────────────────────────────────────────────
function switchView(view) {
  const elToolbar = $("content-toolbar");
  const elNavExplorer = $("nav-explorer");
  const elNavSpreadsheet = $("nav-spreadsheet");

  if (view === "explorer") {
    elNavExplorer.classList.add("active");
    elNavSpreadsheet.classList.remove("active");
    elSSView.style.display = "none";
    elExplorerTools.style.display = "";
    $("spreadsheet-tools").style.display = "none";
    elToolbar.classList.remove("d-none");

    if (!state.rootPath) showEmpty();
    else showContent();
  } else {
    elNavExplorer.classList.remove("active");
    elNavSpreadsheet.classList.add("active");
    elSSView.style.display = "block";
    elExplorerTools.style.display = "none";
    $("spreadsheet-tools").style.display = "";
    elToolbar.classList.add("d-none");

    hide(elEmptyState);
    hide(elLoadingState);
    elFileGrid.style.display = "none";
    elFileListWrap.style.display = "none";
    elSearchHeader.classList.add("d-none");
  }
}

// ─── Spreadsheet ────────────────────────────────────────────────────────────
function renderSpreadsheet(data) {
  const container = $("ss-table-container");
  if (data.length === 0) {
    container.innerHTML =
      '<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-muted p-4"><h5>Data kosong</h5><p>API tidak mengembalikan record apapun.</p></div>';
    return;
  }

  const headers = ["NO", "KODE", "NAME", "Cat", "UOM", "P", "L", "T", "B"];
  const mapping = {
    NO: 1,
    KODE: 3,
    NAME: 4,
    Cat: 5,
    UOM: 6,
    P: 8,
    L: 9,
    T: 10,
    B: 11,
  };

  let html = '<table class="ss-table"><thead><tr>';
  headers.forEach((h) => {
    html += `<th>${escHtml(h)}</th>`;
  });
  html += "</tr></thead><tbody>";

  data.forEach((row) => {
    if (!Array.isArray(row)) return;
    const p = row[8],
      l = row[9],
      t = row[10],
      b = row[11];
    const isIncomplete = !p || !l || !t || !b || p == 0 || l == 0 || t == 0;

    html += `<tr class="${isIncomplete ? "row-incomplete" : ""}">`;
    headers.forEach((h) => {
      const idx = mapping[h];
      const val = row[idx];
      const displayVal = val === null || val === undefined ? "—" : val;
      let cellClass = "";
      if (["P", "L", "T", "B"].includes(h) && (!val || val == 0))
        cellClass = "cell-warning";
      html += `<td class="${cellClass}" title="${escHtml(String(displayVal))}">${escHtml(String(displayVal))}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderFilteredSS() {
  const query = state.ssFilterQuery.toLowerCase();
  const status = state.ssFilterStatus;

  if (!state.ssData || state.ssData.length === 0) return;

  const filtered = state.ssData.filter((row) => {
    if (!Array.isArray(row)) return false;

    const p = row[8],
      l = row[9],
      t = row[10],
      b = row[11];
    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      String(v).trim() === "" ||
      String(v).trim() === "0";
    const isIncomplete = isEmpty(p) || isEmpty(l) || isEmpty(t) || isEmpty(b);

    if (status === "complete" && isIncomplete) return false;
    if (status === "incomplete" && !isIncomplete) return false;

    const searchableIndices = [1, 3, 4, 5, 6];
    const matchesSearch = searchableIndices.some((idx) => {
      const val = String(row[idx] || "").toLowerCase();
      return val.includes(query);
    });

    return matchesSearch;
  });

  renderSpreadsheet(filtered);
}

// ─── Init SS Cache ──────────────────────────────────────────────────────────
function initSSCache() {
  const cachedData = localStorage.getItem("cached_ss_data");
  const cachedUrl = localStorage.getItem("cached_ss_url");

  if (cachedUrl) $("ss-api-url").value = cachedUrl;

  if (cachedData) {
    try {
      state.ssData = JSON.parse(cachedData);
      renderFilteredSS();
      showToast("Memuat data dari penyimpanan lokal...", "info");
    } catch (e) {
      console.error("Gagal memuat cache:", e);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

// ─── Window Controls ────────────────────────────────────────────────────────
$("btn-min").addEventListener("click", () => window.electronAPI.minimize());
$("btn-max").addEventListener("click", () => window.electronAPI.maximize());
$("btn-close").addEventListener("click", () => window.electronAPI.close());

// ─── Pick Folder ────────────────────────────────────────────────────────────
$("btn-pick-folder-2").addEventListener("click", pickFolder);
$("btn-pick-folder-big").addEventListener("click", pickFolder);

// ─── Search (live with debounce) ────────────────────────────────────────────
let searchDebounce = null;

$("btn-search").addEventListener("click", doSearch);
$("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("search-input").value = "";
    $("search-clear").style.display = "none";
    $("search-input").dispatchEvent(new Event("input"));
    $("search-input").blur();
  }
  if (e.key === "Enter") doSearch();
});
$("search-input").addEventListener("input", () => {
  const val = $("search-input").value;
  $("search-clear").style.display = val ? "" : "none";

  clearTimeout(searchDebounce);
  if (val.trim().length === 0) {
    // Input kosong → kembali ke folder biasa
    if (state.isSearchMode && state.currentPath) {
      state.isSearchMode = false;
      elSearchHeader.classList.add("d-none");
      navigateTo(state.currentPath);
    }
    return;
  }
  // Auto-search setelah 300ms berhenti ketik
  searchDebounce = setTimeout(() => doSearch(), 300);
});
$("search-clear").addEventListener("click", () => {
  $("search-input").value = "";
  $("search-clear").style.display = "none";
  $("search-input").dispatchEvent(new Event("input"));
  $("search-input").focus();
});

// ─── Search Header Back ─────────────────────────────────────────────────────
$("sr-back").addEventListener("click", () => {
  state.isSearchMode = false;
  elSearchHeader.classList.add("d-none");
  if (state.currentPath) navigateTo(state.currentPath);
});

// ─── Navigate Up ────────────────────────────────────────────────────────────
$("btn-up").addEventListener("click", () => {
  if (!state.currentPath || state.currentPath === state.rootPath) return;
  const parentPath = state.currentPath
    .replace(/\\/g, "/")
    .split("/")
    .slice(0, -1)
    .join("/");
  if (
    parentPath &&
    parentPath.length >= state.rootPath.replace(/\\/g, "/").length
  ) {
    navigateTo(parentPath);
  }
});

// ─── Refresh ────────────────────────────────────────────────────────────────
$("btn-refresh").addEventListener("click", () => {
  if (state.currentPath) navigateTo(state.currentPath);
});

// ─── View Toggle ────────────────────────────────────────────────────────────
$("btn-view-grid").addEventListener("click", () => {
  state.viewMode = "grid";
  $("btn-view-grid").classList.add("active");
  $("btn-view-list").classList.remove("active");
  renderAll();
});
$("btn-view-list").addEventListener("click", () => {
  state.viewMode = "list";
  $("btn-view-list").classList.add("active");
  $("btn-view-grid").classList.remove("active");
  renderAll();
});

// ─── Sort ───────────────────────────────────────────────────────────────────
$("sort-select").addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  renderAll();
});

// ─── Filter Chips ───────────────────────────────────────────────────────────
$("filter-chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".btn-chip");
  if (!chip) return;
  $("filter-chips")
    .querySelectorAll(".btn-chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  state.filterType = chip.dataset.filter;
  renderAll();
});

// ─── View Switching ─────────────────────────────────────────────────────────
$("nav-explorer").addEventListener("click", () => switchView("explorer"));
$("nav-spreadsheet").addEventListener("click", () => switchView("spreadsheet"));

// ─── Fetch API ──────────────────────────────────────────────────────────────
$("btn-fetch-api").addEventListener("click", async () => {
  const url = $("ss-api-url").value.trim();
  if (!url) {
    showToast("Masukkan URL API dulu!", "error");
    return;
  }

  const container = $("ss-table-container");
  container.innerHTML =
    '<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-muted p-4"><div class="spinner-border text-primary"></div><p>Sedang menarik data...</p></div>';

  try {
    const data = await window.electronAPI.fetchData(url);
    if (data.error) throw new Error(data.error);

    let processedData = data;
    if (!Array.isArray(processedData) && typeof processedData === "object") {
      const keys = Object.keys(processedData);
      for (const key of keys) {
        if (Array.isArray(processedData[key])) {
          processedData = processedData[key];
          break;
        }
      }
    }
    if (!Array.isArray(processedData))
      throw new Error(
        "Format data bukan Array. Pastikan API mengembalikan list objek.",
      );

    state.ssData = processedData;
    localStorage.setItem("cached_ss_data", JSON.stringify(processedData));
    localStorage.setItem("cached_ss_url", url);
    localStorage.setItem("cached_ss_time", new Date().toISOString());

    renderFilteredSS();
    showToast("Data berhasil dimuat! 🚀", "success");
  } catch (err) {
    showToast(err.message, "error");
    container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center h-100 gap-3 text-muted p-4">
      <i class="bi bi-exclamation-triangle text-danger" style="font-size:48px"></i>
      <h5>Gagal memuat data</h5>
      <p>${escHtml(err.message)}</p>
    </div>`;
  }
});

// ─── SS Search & Filter ─────────────────────────────────────────────────────
$("ss-search-input").addEventListener("input", (e) => {
  state.ssFilterQuery = e.target.value.trim();
  renderFilteredSS();
});
$("ss-search-input").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("ss-search-input").value = "";
    state.ssFilterQuery = "";
    renderFilteredSS();
    $("ss-search-input").blur();
  }
});
$("ss-status-filter").addEventListener("change", (e) => {
  state.ssFilterStatus = e.target.value;
  renderFilteredSS();
});

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    if (state.currentPath) navigateTo(state.currentPath);
  }
  if (e.key === "Backspace" && !e.target.matches("input,textarea")) {
    if (state.currentPath && state.currentPath !== state.rootPath) {
      const parentPath = state.currentPath
        .replace(/\\/g, "/")
        .split("/")
        .slice(0, -1)
        .join("/");
      if (
        parentPath.length >= (state.rootPath || "").replace(/\\/g, "/").length
      )
        navigateTo(parentPath);
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    $("search-input").focus();
    $("search-input").select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "o") {
    e.preventDefault();
    pickFolder();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "1") {
    e.preventDefault();
    switchView("explorer");
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "2") {
    e.preventDefault();
    switchView("spreadsheet");
  }
});

// ─── App Version ───────────────────────────────────────────────────────────
(async () => {
  const appVersionEl = document.querySelector(".app-version");
  if (appVersionEl) {
    try {
      const v = await window.electronAPI.version();
      appVersionEl.textContent = "v" + v;
    } catch (_) {}
  }
})();

// ─── Theme Toggle ──────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("theme-icon");
  if (icon) {
    icon.className =
      theme === "light" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  }
  localStorage.setItem("app-theme", theme);
}

const savedTheme = localStorage.getItem("app-theme") || "dark";
applyTheme(savedTheme);

document.getElementById("btn-theme").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
  showEmpty();
  initSSCache();

  // Cek folder terakhir dari localStorage
  const cachedPath = localStorage.getItem("cached_root_path");
  if (cachedPath) {
    const test = await window.electronAPI.readDir(cachedPath);
    if (!test.error) {
      // Folder masih ada, langsung buka
      state.rootPath = cachedPath;
      $("target-name").textContent = basename(cachedPath);
      $("target-path").textContent = truncatePath(cachedPath);
      $("target-card").classList.add("has-target");
      $("btn-search").disabled = false;
      await navigateTo(cachedPath);
    } else {
      // Folder sudah tidak ada, hapus cache
      localStorage.removeItem("cached_root_path");
    }
  }
}

init();
