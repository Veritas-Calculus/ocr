const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // 提供商和模型
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getModels: (providerId, baseURL, apiKey) => ipcRenderer.invoke('get-models', providerId, baseURL, apiKey),
  getTranslationStyles: () => ipcRenderer.invoke('get-translation-styles'),
  getOCRStyles: () => ipcRenderer.invoke('get-ocr-styles'),
  testConnection: (config) => ipcRenderer.invoke('test-connection', config),
  
  // OCR
  performOCR: (imageData) => ipcRenderer.invoke('perform-ocr', imageData),
  
  // 翻译
  translate: (text, targetLang) => ipcRenderer.invoke('translate', text, targetLang),
  
  // 历史记录
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (item) => ipcRenderer.invoke('add-history', item),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // 截图相关
  onScreenshotReady: (callback) => ipcRenderer.on('screenshot-ready', (event, data) => callback(data)),
  captureComplete: (regionData) => ipcRenderer.send('capture-complete', regionData),
  captureCancel: () => ipcRenderer.send('capture-cancel'),
  
  // 事件监听
  onOCRProcessing: (callback) => ipcRenderer.on('ocr-processing', (event, data) => callback(data)),
  onOCRResult: (callback) => ipcRenderer.on('ocr-result', (event, data) => callback(data)),
  onOCRError: (callback) => ipcRenderer.on('ocr-error', (event, data) => callback(data)),
  onTranslationResult: (callback) => ipcRenderer.on('translation-result', (event, data) => callback(data)),
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, page) => callback(page)),
  
  // 弹窗相关
  closePopup: () => ipcRenderer.send('close-popup'),
  onPopupData: (callback) => ipcRenderer.on('popup-data', (event, data) => callback(data))
});
