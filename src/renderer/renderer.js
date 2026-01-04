// DOM Elements
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),
  
  // OCR
  btnCapture: document.getElementById('btn-capture'),
  uploadArea: document.getElementById('upload-area'),
  fileInput: document.getElementById('file-input'),
  resultArea: document.getElementById('result-area'),
  ocrResult: document.getElementById('ocr-result'),
  btnCopy: document.getElementById('btn-copy'),
  btnTranslateResult: document.getElementById('btn-translate-result'),
  loading: document.getElementById('loading'),
  
  // Translate
  sourceText: document.getElementById('source-text'),
  targetText: document.getElementById('target-text'),
  sourceLang: document.getElementById('source-lang'),
  targetLang: document.getElementById('target-lang'),
  btnTranslate: document.getElementById('btn-translate'),
  btnSwap: document.getElementById('btn-swap'),
  btnCopyTranslation: document.getElementById('btn-copy-translation'),
  translateStyleQuick: document.getElementById('translate-style-quick'),
  
  // History
  historyList: document.getElementById('history-list'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  
  // Settings - Provider
  provider: document.getElementById('provider'),
  apiKey: document.getElementById('api-key'),
  apiKeyGroup: document.getElementById('api-key-group'),
  apiBase: document.getElementById('api-base'),
  btnTestConnection: document.getElementById('btn-test-connection'),
  btnRefreshModels: document.getElementById('btn-refresh-models'),
  
  // Settings - OCR
  model: document.getElementById('model'),
  modelHint: document.getElementById('model-hint'),
  ocrStyle: document.getElementById('ocr-style'),
  imageDetail: document.getElementById('image-detail'),
  
  // Settings - Translation
  translationModel: document.getElementById('translation-model'),
  translationStyle: document.getElementById('translation-style'),
  translationTemperature: document.getElementById('translation-temperature'),
  temperatureValue: document.getElementById('temperature-value'),
  customPrompt: document.getElementById('custom-prompt'),
  
  // Settings - Advanced
  maxTokens: document.getElementById('max-tokens'),
  ocrTemperature: document.getElementById('ocr-temperature'),
  ocrTemperatureValue: document.getElementById('ocr-temperature-value'),
  
  // Settings - Actions
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnResetSettings: document.getElementById('btn-reset-settings'),
  
  // Toast
  toast: document.getElementById('toast')
};

// 提供商默认 URL
const PROVIDER_URLS = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://127.0.0.1:11434/v1',
  lmstudio: 'http://127.0.0.1:1234/v1',
  custom: ''
};

// ==================== Navigation ====================
function navigateTo(page) {
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  elements.pages.forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  
  // 加载页面数据
  if (page === 'history') loadHistory();
  // 设置页不再重复加载，只在 init 时加载一次
}

elements.navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// 监听来自主进程的导航事件
window.electronAPI.onNavigate(navigateTo);

// ==================== Toast ====================
function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;
  setTimeout(() => {
    elements.toast.className = 'toast';
  }, 3000);
}

// ==================== OCR ====================
// 截图按钮
elements.btnCapture.addEventListener('click', () => {
  // 通知主进程开始截图
  window.electronAPI.captureComplete(null); // 触发截图流程
});

// 文件上传
elements.uploadArea.addEventListener('click', () => {
  elements.fileInput.click();
});

elements.uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  elements.uploadArea.classList.add('dragover');
});

elements.uploadArea.addEventListener('dragleave', () => {
  elements.uploadArea.classList.remove('dragover');
});

elements.uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  elements.uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processImage(file);
  }
});

elements.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    processImage(file);
  }
});

async function processImage(file) {
  showLoading(true);
  
  try {
    const base64 = await fileToBase64(file);
    const result = await window.electronAPI.performOCR(base64);
    
    if (result.success) {
      showResult(result.text);
      showToast('识别成功', 'success');
    } else {
      throw new Error(result.error || '识别失败');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    showLoading(false);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showLoading(show) {
  elements.loading.style.display = show ? 'block' : 'none';
  elements.uploadArea.style.display = show ? 'none' : 'block';
  if (show) elements.resultArea.style.display = 'none';
}

function showResult(text) {
  elements.uploadArea.style.display = 'none';
  elements.resultArea.style.display = 'block';
  elements.ocrResult.value = text;
}

// 复制结果
elements.btnCopy.addEventListener('click', async () => {
  const text = elements.ocrResult.value;
  await navigator.clipboard.writeText(text);
  showToast('已复制到剪贴板', 'success');
});

// 翻译识别结果
elements.btnTranslateResult.addEventListener('click', async () => {
  const text = elements.ocrResult.value;
  if (!text) return;
  
  elements.sourceText.value = text;
  navigateTo('translate');
  
  // 自动翻译
  await translateText();
});

// 监听 OCR 事件
window.electronAPI.onOCRProcessing((processing) => {
  showLoading(processing);
});

window.electronAPI.onOCRResult((result) => {
  showLoading(false);
  if (result.success) {
    showResult(result.text);
    showToast('识别成功', 'success');
  } else {
    showToast(result.error || '识别失败', 'error');
  }
});

window.electronAPI.onOCRError((error) => {
  showLoading(false);
  showToast(error, 'error');
});

// ==================== Translate ====================
elements.btnTranslate.addEventListener('click', translateText);

async function translateText() {
  const text = elements.sourceText.value.trim();
  if (!text) {
    showToast('请输入要翻译的文本', 'error');
    return;
  }
  
  elements.targetText.value = '翻译中...';
  
  try {
    const result = await window.electronAPI.translate(text, elements.targetLang.value);
    if (result.success) {
      elements.targetText.value = result.translated;
      showToast('翻译成功', 'success');
    } else {
      throw new Error(result.error || '翻译失败');
    }
  } catch (error) {
    elements.targetText.value = '';
    showToast(error.message, 'error');
  }
}

elements.btnSwap.addEventListener('click', () => {
  const sourceVal = elements.sourceLang.value;
  const targetVal = elements.targetLang.value;
  const sourceText = elements.sourceText.value;
  const targetText = elements.targetText.value;
  
  elements.sourceLang.value = targetVal;
  elements.targetLang.value = sourceVal;
  elements.sourceText.value = targetText;
  elements.targetText.value = sourceText;
});

elements.btnCopyTranslation.addEventListener('click', async () => {
  const text = elements.targetText.value;
  if (text) {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  }
});

// 监听翻译结果（从快捷键触发）
window.electronAPI.onTranslationResult((data) => {
  elements.sourceText.value = data.original;
  elements.targetText.value = data.translated;
  navigateTo('translate');
});

// ==================== History ====================
async function loadHistory() {
  const history = await window.electronAPI.getHistory();
  
  if (history.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-state">
        <p>暂无历史记录</p>
      </div>
    `;
    return;
  }
  
  elements.historyList.innerHTML = history.map(item => `
    <div class="history-item" data-text="${escapeHtml(item.text)}">
      <div class="history-item-header">
        <span class="history-item-time">${formatTime(item.timestamp)}</span>
      </div>
      <div class="history-item-text">${escapeHtml(item.text)}</div>
    </div>
  `).join('');
  
  // 点击历史记录复制
  elements.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', async () => {
      const text = item.dataset.text;
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板', 'success');
    });
  });
}

elements.btnClearHistory.addEventListener('click', async () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    await window.electronAPI.clearHistory();
    loadHistory();
    showToast('历史记录已清空', 'success');
  }
});

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Settings ====================
let currentModels = [];

async function loadSettings() {
  const config = await window.electronAPI.getConfig();
  console.log('加载配置:', config);
  
  // Provider settings
  elements.provider.value = config.provider || 'openai';
  elements.apiKey.value = config.apiKey || '';
  elements.apiBase.value = config.apiBase || PROVIDER_URLS[config.provider] || 'https://api.openai.com/v1';
  
  // OCR settings
  elements.ocrStyle.value = config.ocrStyle || 'standard';
  elements.imageDetail.value = config.imageDetail || 'high';
  
  // Translation settings
  elements.translationStyle.value = config.translationStyle || 'standard';
  elements.translationTemperature.value = Math.round((config.translationTemperature || 0.3) * 10);
  elements.temperatureValue.textContent = (config.translationTemperature || 0.3).toFixed(1);
  if (elements.customPrompt) {
    elements.customPrompt.value = config.customPrompt || '';
  }
  
  // Advanced settings
  if (elements.maxTokens) {
    elements.maxTokens.value = config.maxTokens || 4096;
  }
  if (elements.ocrTemperature) {
    elements.ocrTemperature.value = Math.round((config.temperature || 0.1) * 10);
    elements.ocrTemperatureValue.textContent = (config.temperature || 0.1).toFixed(1);
  }
  
  // Update UI based on provider (preserve apiBase we just set)
  updateProviderUI(config.provider, true);
  
  // Save model values before refresh
  const savedModel = config.model;
  const savedTranslationModel = config.translationModel;
  
  // Load models
  await refreshModels();
  
  // Restore selected models after refresh
  if (savedModel) {
    elements.model.value = savedModel;
    // Check if the value was actually set
    if (elements.model.value !== savedModel) {
      console.warn('OCR 模型不在列表中:', savedModel);
    }
  }
  if (savedTranslationModel) {
    elements.translationModel.value = savedTranslationModel;
    if (elements.translationModel.value !== savedTranslationModel) {
      console.warn('翻译模型不在列表中:', savedTranslationModel);
    }
  }
  
  console.log('设置加载完成, OCR模型:', elements.model.value, '翻译模型:', elements.translationModel.value);
}

function updateProviderUI(provider, preserveApiBase = false) {
  // Show/hide API key based on provider
  const needsApiKey = !['ollama', 'lmstudio'].includes(provider);
  elements.apiKeyGroup.style.display = needsApiKey ? 'block' : 'none';
  
  // Update base URL placeholder
  elements.apiBase.placeholder = PROVIDER_URLS[provider] || 'https://api.openai.com/v1';
  
  // If changing provider, update base URL (unless preserving existing value)
  if (!preserveApiBase && PROVIDER_URLS[provider]) {
    elements.apiBase.value = PROVIDER_URLS[provider];
  }
}

async function refreshModels() {
  const provider = elements.provider.value;
  const baseURL = elements.apiBase.value;
  const apiKey = elements.apiKey.value;
  
  try {
    const models = await window.electronAPI.getModels(provider, baseURL, apiKey);
    currentModels = models;
    
    // OCR 模型：只显示支持 vision 的模型
    const visionModels = models.filter(m => m.vision);
    const ocrModelOptions = visionModels.length > 0 
      ? visionModels.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
      : '<option value="">无支持OCR的模型</option>';
    
    // 翻译模型：显示所有模型
    const translateModelOptions = models.length > 0 
      ? models.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
      : '<option value="">无可用模型</option>';
    
    elements.model.innerHTML = ocrModelOptions;
    elements.translationModel.innerHTML = translateModelOptions;
    
    // 显示提示
    if (models.length > 0) {
      if (visionModels.length === 0) {
        elements.modelHint.textContent = '当前无支持图像识别的模型，请加载 llava、minicpm-v 等视觉模型';
        elements.modelHint.style.color = '#FF3B30';
      } else {
        elements.modelHint.textContent = `共 ${visionModels.length} 个视觉模型可用，请保存设置后使用`;
        elements.modelHint.style.color = '#34C759';
      }
    } else {
      elements.modelHint.textContent = '';
    }
    
    return models;
  } catch (error) {
    console.error('Failed to load models:', error);
    return [];
  }
}

// Provider change
elements.provider.addEventListener('change', async (e) => {
  updateProviderUI(e.target.value);
  await refreshModels();
});

// Test connection
elements.btnTestConnection.addEventListener('click', async () => {
  const config = {
    provider: elements.provider.value,
    apiBase: elements.apiBase.value,
    apiKey: elements.apiKey.value
  };
  
  elements.btnTestConnection.disabled = true;
  elements.btnTestConnection.textContent = '⏳ 测试中...';
  
  try {
    const result = await window.electronAPI.testConnection(config);
    if (result.success) {
      showToast(`连接成功！发现 ${result.models.length} 个模型`, 'success');
      currentModels = result.models;
      await refreshModels();
    } else {
      showToast('连接失败: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('连接失败: ' + error.message, 'error');
  } finally {
    elements.btnTestConnection.disabled = false;
    elements.btnTestConnection.textContent = '测试连接';
  }
});

// Refresh models
elements.btnRefreshModels.addEventListener('click', async () => {
  elements.btnRefreshModels.disabled = true;
  elements.btnRefreshModels.textContent = '刷新中...';
  
  try {
    const models = await refreshModels();
    showToast(`已刷新，发现 ${models.length} 个模型`, 'success');
  } catch (error) {
    showToast('刷新失败', 'error');
  } finally {
    elements.btnRefreshModels.disabled = false;
    elements.btnRefreshModels.textContent = '刷新模型';
  }
});

// Temperature sliders
elements.translationTemperature.addEventListener('input', (e) => {
  elements.temperatureValue.textContent = (e.target.value / 10).toFixed(1);
});

if (elements.ocrTemperature) {
  elements.ocrTemperature.addEventListener('input', (e) => {
    elements.ocrTemperatureValue.textContent = (e.target.value / 10).toFixed(1);
  });
}

// Collapsible sections
document.querySelectorAll('.settings-group.collapsible .collapsible-header').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement.classList.toggle('collapsed');
  });
});

// Save settings
elements.btnSaveSettings.addEventListener('click', async () => {
  console.log('保存按钮被点击');
  
  const provider = elements.provider.value;
  const needsApiKey = !['ollama', 'lmstudio'].includes(provider);
  
  console.log('Provider:', provider, 'API Base:', elements.apiBase.value, 'Model:', elements.model.value);
  
  if (needsApiKey && !elements.apiKey.value.trim()) {
    showToast('请输入 API Key', 'error');
    return;
  }
  
  // Validate OCR model is a vision model
  const selectedOcrModel = elements.model.value;
  if (!selectedOcrModel) {
    showToast('请先刷新模型列表并选择一个视觉模型', 'error');
    return;
  }
  
  const config = {
    // Provider
    provider: provider,
    apiKey: elements.apiKey.value.trim(),
    apiBase: elements.apiBase.value.trim() || PROVIDER_URLS[provider],
    
    // OCR
    model: selectedOcrModel,
    ocrStyle: elements.ocrStyle.value,
    imageDetail: elements.imageDetail.value,
    temperature: elements.ocrTemperature ? elements.ocrTemperature.value / 10 : 0.1,
    
    // Translation
    translationModel: elements.translationModel.value,
    translationStyle: elements.translationStyle.value,
    translationTemperature: elements.translationTemperature.value / 10,
    customPrompt: elements.customPrompt ? elements.customPrompt.value.trim() : '',
    
    // Advanced
    maxTokens: elements.maxTokens ? parseInt(elements.maxTokens.value) : 4096
  };
  
  console.log('保存配置:', config);
  
  try {
    await window.electronAPI.saveConfig(config);
    showToast(`设置已保存 (OCR模型: ${selectedOcrModel})`, 'success');
  } catch (error) {
    showToast('保存失败: ' + error.message, 'error');
  }
});

// Reset settings
elements.btnResetSettings.addEventListener('click', async () => {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    // Reset to defaults
    elements.provider.value = 'openai';
    elements.apiKey.value = '';
    elements.apiBase.value = PROVIDER_URLS.openai;
    elements.ocrStyle.value = 'standard';
    elements.imageDetail.value = 'high';
    elements.translationStyle.value = 'standard';
    elements.translationTemperature.value = 3;
    elements.temperatureValue.textContent = '0.3';
    if (elements.customPrompt) elements.customPrompt.value = '';
    if (elements.maxTokens) elements.maxTokens.value = 4096;
    if (elements.ocrTemperature) {
      elements.ocrTemperature.value = 1;
      elements.ocrTemperatureValue.textContent = '0.1';
    }
    
    updateProviderUI('openai');
    await refreshModels();
    
    showToast('已重置为默认设置', 'success');
  }
});

// Quick style change in translate page
if (elements.translateStyleQuick) {
  elements.translateStyleQuick.addEventListener('change', async (e) => {
    const config = await window.electronAPI.getConfig();
    config.translationStyle = e.target.value;
    await window.electronAPI.saveConfig(config);
  });
}

// ==================== Initialize ====================
async function init() {
  // 加载设置
  await loadSettings();
  
  // Sync quick style with settings
  const config = await window.electronAPI.getConfig();
  if (elements.translateStyleQuick) {
    elements.translateStyleQuick.value = config.translationStyle || 'standard';
  }
}

init();
