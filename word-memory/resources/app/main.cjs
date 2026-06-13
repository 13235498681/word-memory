const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, 'favicon.svg'),
  });

  const htmlPath = path.join(__dirname, 'index.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  win.loadURL(fileUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      app.whenReady().then(() => {
        const win = new BrowserWindow({
          width: 900,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
          },
        });
        win.loadURL('file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/'));
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC: 打开文件选择对话框 ---
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters || [
      { name: '单词文件', extensions: ['txt', 'csv', 'tsv'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths;
});

// --- IPC: 读取文件内容 ---
ipcMain.handle('read-text-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- IPC: 读取 PDF 文本 (简易方案：用 pdfjs-dist 或直接文本提取) ---
// 这里先用原生方式读取 PDF 中的可提取文本
ipcMain.handle('read-pdf-text', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // 简单提取 PDF 中 BT...ET 文本块的内容
    const textMatches = content.match(/\(([^)]*)\)\s*Tj/g) || [];
    const texts = textMatches.map(m => {
      const inner = m.match(/\(([^)]*)\)/);
      return inner ? inner[1] : '';
    });
    return { success: true, texts };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
