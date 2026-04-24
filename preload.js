const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Dialog
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // Filesystem
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  search: (rootPath, query, options) =>
    ipcRenderer.invoke('fs:search', { rootPath, query, options }),

  // Shell
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  showInExplorer: (filePath) => ipcRenderer.invoke('shell:showInExplorer', filePath),

  // OS
  homeDir: () => ipcRenderer.invoke('os:homeDir'),
  platform: () => ipcRenderer.invoke('os:platform'),

  // API Proxy
  fetchData: (url) => ipcRenderer.invoke('api:fetch', url),
});
