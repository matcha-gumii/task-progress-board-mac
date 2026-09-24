const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  getSyncTarget: () => ipcRenderer.invoke('desktop:get-sync-target'),
  chooseSyncFile: language => ipcRenderer.invoke('desktop:choose-sync-file', language),
  writeSyncFile: contents => ipcRenderer.invoke('desktop:write-sync-file', contents),
  clearSyncFile: () => ipcRenderer.invoke('desktop:clear-sync-file'),
  exportJson: (contents, suggestedName, language) => ipcRenderer.invoke('desktop:export-json', contents, suggestedName, language),
  importJson: language => ipcRenderer.invoke('desktop:import-json', language)
});
