// Fenêtre Electron pour les versions PC (Windows / Linux) de Worms AKA Battle.
// Le jeu est 100 % local : on charge dist/index.html, sans serveur.
const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

// Sous Linux (Ubuntu 24.04+ notamment), le sandbox SUID de Chromium échoue pour
// un AppImage / tar.gz. L'app ne charge que du contenu local embarqué
// (contextIsolation actif, nodeIntegration désactivé), on le désactive donc.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#020617',
    title: 'Worms AKA Battle',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Aucune navigation ni nouvelle fenêtre dans l'app ; les liens https s'ouvrent dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  // F11 : plein écran
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  // Le jeu n'a besoin d'aucune permission (caméra, micro, géolocalisation...).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
