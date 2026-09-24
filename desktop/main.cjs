const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SETTINGS_FILE = 'desktop-settings.json';
let mainWindow = null;

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

function settingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

async function readSettings() {
  try {
    return JSON.parse(await fs.readFile(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

async function writeSettings(value) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(value, null, 2), 'utf8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 760,
    minHeight: 600,
    title: 'Task Progress Board',
    backgroundColor: '#d7d9dd',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadURL('app://task-progress-board/タスク管理ツール.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.env.TPB_SMOKE_OUTPUT) {
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`(() => {
          const settingsButton = document.getElementById('settingsButton');
          settingsButton.click();
          const settingsVisible = document.getElementById('settingsModal').classList.contains('flex');
          document.querySelector('[data-language-choice="en"]').click();
          const englishVisible = document.getElementById('settingsTitle').textContent.trim() === 'Settings' &&
            document.querySelector('#sidebarSettingsButton span:last-child').textContent.trim() === 'Settings' &&
            document.getElementById('projectTitle').textContent.trim() === 'Task Board';
          document.querySelector('[data-font-size-choice="large"]').click();
          const largeText = getComputedStyle(document.documentElement).fontSize === '18px';
          const sidebarItems = document.querySelectorAll('.mac-sidebar nav > *').length;
          const decorativeDotsRemoved = !document.querySelector('.window-dots');
          const browserCopyRemoved = !document.body.innerText.includes('ブラウザ保存') &&
            !document.body.innerText.includes('Browser storage');
          document.getElementById('closeSettingsButton').click();
          const detail = document.querySelector('[data-action="open-detail"]');
          detail.click();
          const detailVisible = document.getElementById('modal').classList.contains('flex');
          document.getElementById('closeModalButton').click();
          return {
            title: document.title,
            cards: document.querySelectorAll('#taskList > article').length,
            settingsVisible,
            englishVisible,
            largeText,
            sidebarItems,
            decorativeDotsRemoved,
            browserCopyRemoved,
            detailVisible,
            desktopAPI: Boolean(window.desktopAPI),
            stylesheetRules: [...document.styleSheets].reduce((sum, sheet) => sum + (sheet.cssRules?.length || 0), 0),
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth
          };
        })()`);
        const image = await mainWindow.capturePage();
        await fs.writeFile(process.env.TPB_SMOKE_OUTPUT, image.toPNG());
        const passed = result.cards > 0 && result.settingsVisible && result.englishVisible && result.largeText &&
          result.sidebarItems === 2 && result.decorativeDotsRemoved && result.browserCopyRemoved && result.detailVisible &&
          result.desktopAPI && result.stylesheetRules > 0 && !result.horizontalOverflow;
        console.log(JSON.stringify({ passed, ...result }));
        app.exit(passed ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://task-progress-board/')) event.preventDefault();
  });
}

ipcMain.handle('desktop:get-sync-target', async () => {
  const settings = await readSettings();
  if (!settings.syncPath) return null;
  return { name: path.basename(settings.syncPath) };
});

ipcMain.handle('desktop:choose-sync-file', async (_event, language) => {
  const settings = await readSettings();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: language === 'en' ? 'Choose JSON sync destination' : 'JSON同期保存先を選択',
    defaultPath: settings.syncPath || path.join(app.getPath('documents'), 'task-progress-board.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return null;
  await writeSettings({ ...settings, syncPath: result.filePath });
  return { name: path.basename(result.filePath) };
});

ipcMain.handle('desktop:write-sync-file', async (_event, contents) => {
  const settings = await readSettings();
  if (!settings.syncPath) return { ok: false, reason: 'missing' };
  const temporaryPath = `${settings.syncPath}.tmp`;
  await fs.writeFile(temporaryPath, contents, 'utf8');
  await fs.rename(temporaryPath, settings.syncPath);
  return { ok: true, name: path.basename(settings.syncPath) };
});

ipcMain.handle('desktop:clear-sync-file', async () => {
  const settings = await readSettings();
  delete settings.syncPath;
  await writeSettings(settings);
  return true;
});

ipcMain.handle('desktop:export-json', async (_event, contents, suggestedName, language) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: language === 'en' ? 'Export JSON' : 'JSONを書き出す',
    defaultPath: path.join(app.getPath('documents'), suggestedName),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return false;
  await fs.writeFile(result.filePath, contents, 'utf8');
  return true;
});

ipcMain.handle('desktop:import-json', async (_event, language) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: language === 'en' ? 'Restore from JSON' : 'JSONから復元',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return fs.readFile(result.filePaths[0], 'utf8');
});

app.whenReady().then(() => {
  protocol.handle('app', request => {
    const requested = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '');
    const allowed = new Set(['タスク管理ツール.html', 'app.css']);
    if (!allowed.has(requested)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(path.join(__dirname, '..', requested)).toString());
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
