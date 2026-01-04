const { app, BrowserWindow, ipcMain, globalShortcut, screen, clipboard, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { captureScreen, captureRegion } = require('./screenshot');
const { performOCR } = require('./ocr');
const { translate } = require('./translate');
const { PROVIDERS, TRANSLATION_STYLES, OCR_STYLES, getProviderModels } = require('./providers');

const store = new Store();
let mainWindow = null;
let captureWindow = null;
let popupWindow = null;
let tray = null;

// 默认配置
const defaultConfig = {
  // 服务提供商
  provider: 'openai',
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  
  // OCR 设置
  model: 'gpt-4o',
  ocrStyle: 'standard',
  imageDetail: 'high',
  
  // 翻译设置
  translationModel: 'gpt-4o-mini',
  translationStyle: 'standard',
  translationTemperature: 0.3,
  customPrompt: '',
  
  // 通用设置
  maxTokens: 4096,
  temperature: 0.1,
  language: 'auto',
  
  // 快捷键
  shortcut: {
    capture: 'CommandOrControl+Shift+O',
    translate: 'CommandOrControl+Shift+T'
  }
};

function getConfig() {
  return { ...defaultConfig, ...store.get('config', {}) };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    title: 'VC OCR',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createCaptureWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  captureWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  captureWindow.loadFile(path.join(__dirname, '../renderer/capture.html'));
  
  captureWindow.on('closed', () => {
    captureWindow = null;
  });
}

function createTray() {
  // 创建系统托盘
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(nativeImage.createEmpty());
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '截图识别', click: startCapture },
    { label: '打开主窗口', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '设置', click: () => {
      mainWindow.show();
      mainWindow.webContents.send('navigate', 'settings');
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('VC OCR');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

async function startCapture() {
  try {
    // 先截取全屏
    const screenshot = await captureScreen();
    
    // 创建选区窗口
    if (captureWindow) {
      captureWindow.close();
    }
    createCaptureWindow();
    
    // 发送截图到选区窗口
    captureWindow.webContents.once('did-finish-load', () => {
      captureWindow.webContents.send('screenshot-ready', screenshot);
    });
  } catch (error) {
    console.error('Screenshot failed:', error);
  }
}

/**
 * 创建划词翻译弹窗
 */
function createPopupWindow(mousePosition) {
  // 如果已有弹窗，先关闭
  if (popupWindow) {
    popupWindow.close();
    popupWindow = null;
  }
  
  const display = screen.getDisplayNearestPoint(mousePosition);
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { x: screenX, y: screenY } = display.workArea;
  
  const popupWidth = 450;
  const popupHeight = 500;
  
  // 计算弹窗位置，确保不超出屏幕
  let x = mousePosition.x + 10;
  let y = mousePosition.y + 10;
  
  if (x + popupWidth > screenX + screenWidth) {
    x = mousePosition.x - popupWidth - 10;
  }
  if (y + popupHeight > screenY + screenHeight) {
    y = mousePosition.y - popupHeight - 10;
  }
  
  popupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: x,
    y: y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  popupWindow.loadFile(path.join(__dirname, '../renderer/popup.html'));
  
  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
  });
  
  // 失去焦点时关闭
  popupWindow.on('blur', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
      popupWindow = null;
    }
  });
  
  popupWindow.on('closed', () => {
    popupWindow = null;
  });
  
  return popupWindow;
}

/**
 * 执行划词翻译
 */
async function performSelectionTranslate() {
  // 模拟 Cmd+C 复制选中内容
  const { exec } = require('child_process');
  
  // 先清空剪贴板
  clipboard.writeText('');
  
  // 使用 AppleScript 模拟 Cmd+C
  await new Promise((resolve) => {
    exec(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`, (error) => {
      setTimeout(resolve, 100); // 等待复制完成
    });
  });
  
  // 读取剪贴板内容
  const text = clipboard.readText().trim();
  
  if (!text) {
    console.log('No text selected');
    return;
  }
  
  // 获取鼠标位置
  const mousePosition = screen.getCursorScreenPoint();
  
  // 创建弹窗
  const popup = createPopupWindow(mousePosition);
  
  // 等待窗口准备好后发送数据
  popup.webContents.once('did-finish-load', async () => {
    // 先发送原文和加载状态
    popup.webContents.send('popup-data', {
      original: text,
      loading: true
    });
    
    // 执行翻译
    try {
      const config = getConfig();
      const result = await translate(text, 'auto', config);
      
      if (popup && !popup.isDestroyed()) {
        popup.webContents.send('popup-data', {
          original: text,
          translated: result.translated
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      if (popup && !popup.isDestroyed()) {
        popup.webContents.send('popup-data', {
          original: text,
          error: error.message
        });
      }
    }
  });
}

function registerShortcuts() {
  const config = getConfig();
  
  globalShortcut.unregisterAll();
  
  // 截图快捷键
  globalShortcut.register(config.shortcut.capture, startCapture);
  
  // 划词翻译快捷键
  globalShortcut.register(config.shortcut.translate, performSelectionTranslate);
}

// 关闭弹窗
ipcMain.on('close-popup', () => {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
    popupWindow = null;
  }
});

// IPC 处理
ipcMain.handle('get-config', () => getConfig());

ipcMain.handle('save-config', (event, config) => {
  store.set('config', config);
  registerShortcuts();
  return true;
});

// 获取提供商列表
ipcMain.handle('get-providers', () => PROVIDERS);

// 获取翻译风格列表
ipcMain.handle('get-translation-styles', () => TRANSLATION_STYLES);

// 获取 OCR 风格列表
ipcMain.handle('get-ocr-styles', () => OCR_STYLES);

// 获取模型列表（动态）
ipcMain.handle('get-models', async (event, providerId, baseURL, apiKey) => {
  try {
    return await getProviderModels(providerId, baseURL, apiKey);
  } catch (error) {
    console.error('Failed to get models:', error);
    return [];
  }
});

// 测试连接
ipcMain.handle('test-connection', async (event, config) => {
  try {
    const models = await getProviderModels(config.provider, config.apiBase, config.apiKey);
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-ocr', async (event, imageData) => {
  const config = getConfig();
  try {
    return await performOCR(imageData, config);
  } catch (error) {
    console.error('OCR error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('translate', async (event, text, targetLang) => {
  const config = getConfig();
  try {
    return await translate(text, targetLang, config);
  } catch (error) {
    console.error('Translate error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-history', () => {
  return store.get('history', []);
});

ipcMain.handle('add-history', (event, item) => {
  const history = store.get('history', []);
  history.unshift({ ...item, timestamp: Date.now() });
  // 最多保留100条记录
  if (history.length > 100) history.pop();
  store.set('history', history);
  return history;
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return [];
});

ipcMain.on('capture-complete', async (event, regionData) => {
  if (captureWindow) {
    captureWindow.close();
    captureWindow = null;
  }
  
  if (regionData) {
    mainWindow.show();
    mainWindow.webContents.send('ocr-processing', true);
    
    try {
      const config = getConfig();
      const result = await performOCR(regionData, config);
      mainWindow.webContents.send('ocr-result', result);
      
      // 添加到历史记录
      const history = store.get('history', []);
      history.unshift({
        text: result.text,
        timestamp: Date.now(),
        image: regionData.substring(0, 100) + '...' // 只存储图片的缩略引用
      });
      if (history.length > 100) history.pop();
      store.set('history', history);
    } catch (error) {
      mainWindow.webContents.send('ocr-error', error.message);
    }
  }
});

ipcMain.on('capture-cancel', () => {
  if (captureWindow) {
    captureWindow.close();
    captureWindow = null;
  }
});

// App 生命周期
app.whenReady().then(() => {
  // 设置应用名称（macOS Dock 显示）
  app.setName('VC OCR');
  
  createMainWindow();
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
