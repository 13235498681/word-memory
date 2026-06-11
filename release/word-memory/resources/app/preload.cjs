const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wordMemoryAPI', {
  // 打开文件选择对话框，返回选中文件路径数组
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),

  // 读取文本文件内容
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),

  // 读取 PDF 文本内容
  readPdfText: (filePath) => ipcRenderer.invoke('read-pdf-text', filePath),
});
