/* ─────────────────────────────────────────────────────────────────────────────
   FolderScope — App Logic
   ───────────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  rootPath: null,
  currentPath: null,
  history: [],
  entries: [],
  allEntries: [],
  viewMode: 'grid',   // 'grid' | 'list'
  filterType: 'all',
  sortBy: 'name-asc',
  isSearchMode: false,
  searchQuery: '',
};

// ─── File Type Definitions ────────────────────────────────────────────────────
const FILE_TYPES = {
  folder:  { exts: null,    emoji: '📁', color: '#fbbf24', label: 'Folder',   bg: 'rgba(251,191,36,0.15)'   },
  image:   { exts: ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp','.ico','.tiff','.avif'],
             emoji: '🖼️', color: '#34d399', label: 'Gambar',  bg: 'rgba(52,211,153,0.15)'  },
  video:   { exts: ['.mp4','.mkv','.avi','.mov','.wmv','.flv','.webm','.m4v'],
             emoji: '🎬', color: '#f87171', label: 'Video',   bg: 'rgba(248,113,113,0.15)' },
  audio:   { exts: ['.mp3','.wav','.ogg','.flac','.aac','.m4a','.wma'],
             emoji: '🎵', color: '#a78bfa', label: 'Audio',   bg: 'rgba(167,139,250,0.15)' },
  doc:     { exts: ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.odt','.ods','.odp','.txt','.rtf'],
             emoji: '📄', color: '#60a5fa', label: 'Dokumen', bg: 'rgba(96,165,250,0.15)'  },
  code:    { exts: ['.js','.ts','.jsx','.tsx','.html','.css','.php','.py','.java','.c','.cpp','.cs','.go','.rs','.rb','.vue','.json','.xml','.yaml','.yml','.sh','.bat','.sql','.md'],
             emoji: '💻', color: '#34d399', label: 'Kode',   bg: 'rgba(52,211,153,0.15)'  },
  archive: { exts: ['.zip','.rar','.7z','.tar','.gz','.bz2','.xz','.cab'],
             emoji: '📦', color: '#fb923c', label: 'Arsip',  bg: 'rgba(251,146,60,0.15)'  },
  exe:     { exts: ['.exe','.msi','.apk','.dmg','.deb','.rpm'],
             emoji: '⚙️', color: '#94a3b8', label: 'Program', bg: 'rgba(148,163,184,0.15)' },
  font:    { exts: ['.ttf','.otf','.woff','.woff2','.eot'],
             emoji: '🔤', color: '#e879f9', label: 'Font',   bg: 'rgba(232,121,249,0.15)' },
};

function getFileType(entry) {
  if (entry.isDirectory) return FILE_TYPES.folder;
  const ext = (entry.ext || '').toLowerCase();
  for (const [, type] of Object.entries(FILE_TYPES)) {
    if (type.exts && type.exts.includes(ext)) return type;
  }
  return { emoji: '📋', color: '#8b91b0', label: entry.ext ? entry.ext.toUpperCase().slice(1) : 'File', bg: 'rgba(139,145,176,0.12)' };
}

function getFilterKey(entry) {
  if (entry.isDirectory) return 'folder';
  const ext = (entry.ext || '').toLowerCase();
  for (const [key, type] of Object.entries(FILE_TYPES)) {
    if (type.exts && type.exts.includes(ext)) return key;
  }
  return 'other';
}

// ─── Format Helpers ───────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return bytes.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) +
         ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

function basename(p) {
  return p.replace(/\\/g, '/').split('/').pop() || p;
}

function truncatePath(p, maxLen = 35) {
  if (!p) return '';
  if (p.length <= maxLen) return p;
  const parts = p.replace(/\\/g, '/').split('/');
  if (parts.length <= 2) return '...' + p.slice(-maxLen);
  return parts[0] + '/.../' + parts[parts.length - 1];
}

// ─── Sort Entries ─────────────────────────────────────────────────────────────
function sortEntries(entries) {
  const [field, dir] = state.sortBy.split('-');
  return [...entries].sort((a, b) => {
    // Folders first
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let va, vb;
    if (field === 'name')  { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    if (field === 'size')  { va = a.size || 0;           vb = b.size || 0;         }
    if (field === 'date')  { va = a.modified || '';      vb = b.modified || '';    }
    if (dir === 'asc')  return va < vb ? -1 : va > vb ? 1 : 0;
    else                return va > vb ? -1 : va < vb ? 1 : 0;
  });
}

// ─── Filter Entries ───────────────────────────────────────────────────────────
function filterEntries(entries) {
  if (state.filterType === 'all') return entries;
  return entries.filter(e => getFilterKey(e) === state.filterType);
}

// ─── DOM References ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const elEmptyState    = $('empty-state');
const elLoadingState  = $('loading-state');
const elFileGrid      = $('file-grid');
const elFileListWrap  = $('file-list-wrap');
const elFileListBody  = $('file-list-body');
const elSearchHeader  = $('search-header');
const elContextMenu   = $('context-menu');
const elBreadcrumb    = $('breadcrumb');

// ─── Show/Hide States ─────────────────────────────────────────────────────────
function showEmpty()   { elEmptyState.style.display=''; elLoadingState.style.display='none'; elFileGrid.style.display='none'; elFileListWrap.style.display='none'; }
function showLoading() { elEmptyState.style.display='none'; elLoadingState.style.display=''; elFileGrid.style.display='none'; elFileListWrap.style.display='none'; }
function showContent() {
  elEmptyState.style.display='none';
  elLoadingState.style.display='none';
  if (state.viewMode === 'grid') {
    elFileGrid.style.display='grid';
    elFileListWrap.style.display='none';
  } else {
    elFileGrid.style.display='none';
    elFileListWrap.style.display='';
  }
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function renderBreadcrumb() {
  if (!state.rootPath || !state.currentPath) {
    elBreadcrumb.innerHTML = `
      <span class="breadcrumb-home"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></span>
      <span class="breadcrumb-item current" id="bc-root">FolderScope</span>`;
    return;
  }
  const rootNorm = state.rootPath.replace(/\\/g, '/');
  const currNorm = state.currentPath.replace(/\\/g, '/');
  const rel = currNorm.startsWith(rootNorm) ? currNorm.slice(rootNorm.length) : '';
  const parts = rel.split('/').filter(Boolean);
  const rootName = basename(state.rootPath);

  let html = `<span class="breadcrumb-home"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></span>`;
  html += `<span class="breadcrumb-sep">›</span>`;
  html += `<span class="breadcrumb-item ${parts.length===0?'current':''}" data-path="${state.rootPath}">${rootName}</span>`;

  let accumulated = state.rootPath;
  for (let i = 0; i < parts.length; i++) {
    accumulated = accumulated.replace(/\\/g,'/') + '/' + parts[i];
    const isCurrent = i === parts.length - 1;
    html += `<span class="breadcrumb-sep">›</span>`;
    html += `<span class="breadcrumb-item ${isCurrent?'current':''}" data-path="${accumulated}">${parts[i]}</span>`;
  }

  elBreadcrumb.innerHTML = html;

  // Breadcrumb click navigation
  elBreadcrumb.querySelectorAll('.breadcrumb-item:not(.current)').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.path));
  });
}

// ─── Render Grid ──────────────────────────────────────────────────────────────
function renderGrid(entries) {
  if (entries.length === 0) {
    elFileGrid.innerHTML = `<div class="no-results" style="grid-column:1/-1">
      <div class="no-results-icon">🔍</div>
      <h3>Tidak ada item</h3>
      <p>Folder ini kosong atau tidak ada yang cocok dengan filter yang dipilih.</p>
    </div>`;
    return;
  }

  elFileGrid.innerHTML = entries.map(entry => {
    const type = getFileType(entry);
    const sizeStr = entry.isDirectory ? '' : formatSize(entry.size);
    return `<div class="file-card ${entry.isDirectory ? 'is-dir' : ''}"
              data-path="${entry.path}"
              data-is-dir="${entry.isDirectory}"
              title="${entry.name}">
      <div class="file-card-icon" style="filter: drop-shadow(0 2px 8px ${type.color}40)">${type.emoji}</div>
      <div class="file-card-name">${escHtml(entry.name)}</div>
      ${sizeStr ? `<div class="file-card-meta">${sizeStr}</div>` : ''}
    </div>`;
  }).join('');

  elFileGrid.querySelectorAll('.file-card').forEach(card => {
    card.addEventListener('click', e => handleFileClick(card, e));
    card.addEventListener('contextmenu', e => showContextMenu(e, card.dataset.path, card.dataset.isDir === 'true'));
  });
}

// ─── Render List ──────────────────────────────────────────────────────────────
function renderList(entries) {
  if (entries.length === 0) {
    elFileListBody.innerHTML = `<tr><td colspan="5">
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>Tidak ada item</h3>
        <p>Folder kosong atau tidak ada yang cocok.</p>
      </div>
    </td></tr>`;
    return;
  }

  elFileListBody.innerHTML = entries.map(entry => {
    const type = getFileType(entry);
    const typeLabel = type.label;
    const sizeStr = entry.isDirectory ? '—' : formatSize(entry.size);
    const dateStr = formatDate(entry.modified);
    const relPath = entry.relativePath ? `<span class="search-path-badge">📂 ${escHtml(entry.relativePath)}</span>` : '';

    return `<tr data-path="${entry.path}" data-is-dir="${entry.isDirectory}">
      <td>
        <div class="file-list-name">
          <span class="file-list-icon">${type.emoji}</span>
          <div>
            ${escHtml(entry.name)}
            ${relPath}
          </div>
        </div>
      </td>
      <td>
        <span class="file-type-badge" style="color:${type.color}; background:${type.bg}">${escHtml(typeLabel)}</span>
      </td>
      <td style="font-family:'JetBrains Mono',monospace; font-size:11px">${sizeStr}</td>
      <td style="font-size:11px; color:var(--text-muted)">${dateStr}</td>
      <td>
        <button class="list-action-btn" data-action="open" title="Buka">Buka</button>
        <button class="list-action-btn" data-action="explorer" title="Di Explorer">Explorer</button>
      </td>
    </tr>`;
  }).join('');

  elFileListBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('list-action-btn')) return;
      handleFileClick(row, e);
    });
    row.addEventListener('contextmenu', e => showContextMenu(e, row.dataset.path, row.dataset.isDir === 'true'));

    row.querySelectorAll('.list-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.action === 'open') window.electronAPI.openPath(row.dataset.path);
        if (btn.dataset.action === 'explorer') window.electronAPI.showInExplorer(row.dataset.path);
      });
    });
  });
}

// ─── Handle File Click ────────────────────────────────────────────────────────
function handleFileClick(el, e) {
  const filePath = el.dataset.path;
  const isDir = el.dataset.isDir === 'true';
  if (isDir) {
    navigateTo(filePath);
  } else {
    window.electronAPI.openPath(filePath);
  }
}

// ─── Navigate To ──────────────────────────────────────────────────────────────
async function navigateTo(dirPath) {
  if (!dirPath) return;
  state.isSearchMode = false;
  elSearchHeader.style.display = 'none';

  state.history.push(state.currentPath);
  state.currentPath = dirPath;

  $('btn-up').disabled = (dirPath === state.rootPath);
  $('btn-refresh').disabled = false;

  showLoading();
  const entries = await window.electronAPI.readDir(dirPath);

  if (entries.error) {
    showToast('Error: ' + entries.error, 'error');
    showEmpty();
    return;
  }

  state.allEntries = entries;
  renderAll(entries);
  renderBreadcrumb();
  updateStats(entries);
}

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll(entries) {
  if (!entries) entries = state.allEntries;
  const filtered = filterEntries(sortEntries(entries));
  showContent();
  if (state.viewMode === 'grid') renderGrid(filtered);
  else renderList(filtered);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats(entries) {
  const dirs = entries.filter(e => e.isDirectory).length;
  const files = entries.filter(e => !e.isDirectory).length;
  const totalSize = entries.reduce((acc, e) => acc + (e.size || 0), 0);

  $('stat-folders').textContent = dirs;
  $('stat-files').textContent = files;
  $('stat-size').textContent = formatSize(totalSize);
  $('sidebar-stats').style.display = 'flex';
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
let ctxPath = null;
let ctxIsDir = false;

function showContextMenu(e, filePath, isDir) {
  e.preventDefault();
  ctxPath = filePath;
  ctxIsDir = isDir;

  const menu = elContextMenu;
  menu.style.display = 'block';

  const x = Math.min(e.clientX, window.innerWidth - 180);
  const y = Math.min(e.clientY, window.innerHeight - 120);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function hideContextMenu() {
  elContextMenu.style.display = 'none';
}

$('ctx-open').addEventListener('click', () => {
  if (ctxPath) window.electronAPI.openPath(ctxPath);
  hideContextMenu();
});
$('ctx-explorer').addEventListener('click', () => {
  if (ctxPath) window.electronAPI.showInExplorer(ctxPath);
  hideContextMenu();
});
$('ctx-copy-path').addEventListener('click', () => {
  if (ctxPath) {
    navigator.clipboard.writeText(ctxPath);
    showToast('Path disalin! 📋', 'success');
  }
  hideContextMenu();
});

document.addEventListener('click', () => hideContextMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideContextMenu(); });

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2500);
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Pick Folder ──────────────────────────────────────────────────────────────
async function pickFolder() {
  const folderPath = await window.electronAPI.openFolder();
  if (!folderPath) return;

  state.rootPath = folderPath;
  state.history = [];

  const name = basename(folderPath);
  $('target-name').textContent = name;
  $('target-path').textContent = truncatePath(folderPath);
  $('target-card').classList.add('has-target');

  $('btn-search').disabled = false;

  await navigateTo(folderPath);
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function doSearch() {
  const query = $('search-input').value.trim();
  if (!query || !state.rootPath) return;

  state.searchQuery = query;
  state.isSearchMode = true;

  showLoading();

  const options = {
    recursive: $('opt-recursive').checked,
    caseSensitive: $('opt-case-sensitive').checked,
    exactMatch: $('opt-exact-match').checked,
  };

  const results = await window.electronAPI.search(state.rootPath, query, options);

  elSearchHeader.style.display = 'flex';
  $('sr-query').textContent = `"${query}"`;
  $('sr-count').textContent = `${results.length} hasil${results.length >= 500 ? ' (maks)' : ''}`;

  state.allEntries = results;
  renderAll(results);
  updateStats(results);
  renderBreadcrumb();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Window Controls
$('btn-min').addEventListener('click', () => window.electronAPI.minimize());
$('btn-max').addEventListener('click', () => window.electronAPI.maximize());
$('btn-close').addEventListener('click', () => window.electronAPI.close());

// Pick Folder
$('btn-pick-folder').addEventListener('click', pickFolder);
$('btn-pick-folder-big').addEventListener('click', pickFolder);

// Search
$('btn-search').addEventListener('click', doSearch);
$('search-input').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
$('search-input').addEventListener('input', () => {
  $('search-clear').style.display = $('search-input').value ? 'block' : 'none';
});
$('search-clear').addEventListener('click', () => {
  $('search-input').value = '';
  $('search-clear').style.display = 'none';
  $('search-input').focus();
});

// Back from search
$('sr-back').addEventListener('click', () => {
  state.isSearchMode = false;
  elSearchHeader.style.display = 'none';
  if (state.currentPath) {
    navigateTo(state.currentPath);
  }
});

// Navigate Up
$('btn-up').addEventListener('click', () => {
  if (!state.currentPath || state.currentPath === state.rootPath) return;
  const parentPath = state.currentPath.replace(/\\/g,'/').split('/').slice(0,-1).join('/');
  if (parentPath && parentPath.length >= state.rootPath.replace(/\\/g,'/').length) {
    navigateTo(parentPath);
  }
});

// Refresh
$('btn-refresh').addEventListener('click', () => {
  if (state.currentPath) navigateTo(state.currentPath);
});

// View Toggle Grid
$('btn-view-grid').addEventListener('click', () => {
  state.viewMode = 'grid';
  $('btn-view-grid').classList.add('active');
  $('btn-view-list').classList.remove('active');
  renderAll();
});

// View Toggle List
$('btn-view-list').addEventListener('click', () => {
  state.viewMode = 'list';
  $('btn-view-list').classList.add('active');
  $('btn-view-grid').classList.remove('active');
  renderAll();
});

// Sort
$('sort-select').addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  renderAll();
});

// Filter Chips
$('filter-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  $('filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.filterType = chip.dataset.filter;
  renderAll();
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') { if (state.currentPath) navigateTo(state.currentPath); }
  if (e.key === 'Backspace' && !e.target.matches('input')) {
    if (state.currentPath && state.currentPath !== state.rootPath) {
      const parentPath = state.currentPath.replace(/\\/g,'/').split('/').slice(0,-1).join('/');
      if (parentPath.length >= (state.rootPath || '').replace(/\\/g,'/').length) navigateTo(parentPath);
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    $('search-input').focus();
    $('search-input').select();
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
showEmpty();
