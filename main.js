const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0f1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window Controls ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ─── Dialog: Pick Folder ──────────────────────────────────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Pilih Folder Target',
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── Read Directory ───────────────────────────────────────────────────────────
ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      let size = 0;
      let modified = null;
      let isHidden = entry.name.startsWith('.');

      try {
        const stat = fs.statSync(fullPath);
        size = stat.size;
        modified = stat.mtime.toISOString();
      } catch (_) {}

      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isHidden,
        size,
        modified,
        ext: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
      };
    });
  } catch (err) {
    return { error: err.message };
  }
});

// ─── Search Files Recursively ─────────────────────────────────────────────────
ipcMain.handle('fs:search', async (_, { rootPath, query, options }) => {
  const results = [];
  const maxResults = 500;

  function walk(dir, depth) {
    if (results.length >= maxResults) return;
    if (depth > 10) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(dir, entry.name);
      const nameToCheck = options.caseSensitive ? entry.name : entry.name.toLowerCase();
      const queryToCheck = options.caseSensitive ? query : query.toLowerCase();

      const match = options.exactMatch
        ? nameToCheck === queryToCheck
        : nameToCheck.includes(queryToCheck);

      if (match) {
        let size = 0;
        let modified = null;
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          modified = stat.mtime.toISOString();
        } catch (_) {}

        results.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(rootPath, fullPath),
          isDirectory: entry.isDirectory(),
          size,
          modified,
          ext: entry.isDirectory() ? null : path.extname(entry.name).toLowerCase(),
        });
      }

      if (entry.isDirectory() && options.recursive) {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(rootPath, 0);
  return results;
});

// ─── Open File/Folder in OS Explorer ─────────────────────────────────────────
ipcMain.handle('shell:openPath', async (_, filePath) => {
  return shell.openPath(filePath);
});

ipcMain.handle('shell:showInExplorer', async (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// ─── Get System Info ──────────────────────────────────────────────────────────
ipcMain.handle('os:homeDir', () => os.homedir());
ipcMain.handle('os:platform', () => process.platform);
