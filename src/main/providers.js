/**
 * AI 服务提供商配置
 */

const { net } = require('electron');

/**
 * 使用 Electron net 模块发起 HTTP 请求
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: options.method || 'GET',
      headers: options.headers || {}
    });

    let responseData = '';

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${responseData}`));
        }
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    request.end();
  });
}

// 预设的服务提供商
const PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o（推荐）', vision: true, contextLength: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', vision: true, contextLength: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', vision: true, contextLength: 128000 },
      { id: 'gpt-4', name: 'GPT-4', vision: false, contextLength: 8192 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', vision: false, contextLength: 16385 }
    ],
    requiresApiKey: true
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseURL: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', vision: true, contextLength: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', vision: true, contextLength: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', vision: true, contextLength: 200000 }
    ],
    requiresApiKey: true
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama（本地）',
    baseURL: 'http://127.0.0.1:11434/v1',
    models: [], // 动态获取
    requiresApiKey: false,
    supportsModelList: true
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio（本地）',
    baseURL: 'http://127.0.0.1:1234/v1',
    models: [], // 动态获取
    requiresApiKey: false,
    supportsModelList: true
  },
  custom: {
    id: 'custom',
    name: '自定义服务',
    baseURL: '',
    models: [],
    requiresApiKey: true,
    supportsModelList: true
  }
};

// 翻译风格预设
const TRANSLATION_STYLES = {
  standard: {
    id: 'standard',
    name: '标准翻译',
    prompt: '请将以下文本翻译成{targetLang}，保持原文格式，只输出翻译结果：'
  },
  professional: {
    id: 'professional',
    name: '专业/学术',
    prompt: '请将以下文本翻译成{targetLang}。使用专业、学术的语言风格，确保术语准确，表达严谨。只输出翻译结果：'
  },
  casual: {
    id: 'casual',
    name: '口语化',
    prompt: '请将以下文本翻译成{targetLang}。使用轻松、口语化的表达方式，让翻译更加自然流畅。只输出翻译结果：'
  },
  literary: {
    id: 'literary',
    name: '文学风格',
    prompt: '请将以下文本翻译成{targetLang}。使用优美的文学语言，注重修辞和表达的艺术性。只输出翻译结果：'
  },
  technical: {
    id: 'technical',
    name: '技术文档',
    prompt: '请将以下文本翻译成{targetLang}。这是技术文档，请保持术语的准确性和一致性，代码和命令保持原样。只输出翻译结果：'
  },
  brief: {
    id: 'brief',
    name: '简洁精炼',
    prompt: '请将以下文本翻译成{targetLang}。尽量简洁精炼，去除冗余表达。只输出翻译结果：'
  }
};

// OCR 识别风格
const OCR_STYLES = {
  standard: {
    id: 'standard',
    name: '标准识别',
    prompt: `你是一个OCR识别工具。请直接输出图片中的文字，不要输出任何思考过程、解释或额外内容。
要求：
1. 保持原文的格式和换行
2. 对于表格内容，使用空格对齐
3. 多列文字按从左到右、从上到下的顺序识别
4. 只输出识别到的文字，禁止输出<think>、</think>、<|begin_of_box|>等标记`
  },
  code: {
    id: 'code',
    name: '代码识别',
    prompt: `你是一个代码OCR工具。请直接输出图片中的代码，不要输出任何思考过程。
要求：
1. 严格保持代码格式、缩进和空格
2. 识别所有注释内容
3. 保持代码的完整性
4. 只输出代码，禁止输出<think>、</think>等标记`
  },
  table: {
    id: 'table',
    name: '表格识别',
    prompt: `你是一个表格OCR工具。请直接输出图片中的表格，不要输出任何思考过程。
要求：
1. 使用 Markdown 表格格式输出
2. 保持表格的行列结构
3. 如有合并单元格，尽量还原
4. 只输出表格内容，禁止输出<think>等标记`
  },
  handwriting: {
    id: 'handwriting',
    name: '手写识别',
    prompt: `你是一个手写文字OCR工具。请直接输出图片中的手写内容，不要输出任何思考过程。
要求：
1. 尽力识别手写内容，即使字迹潦草
2. 对于不确定的字用 [?] 标注
3. 保持原文的分段和换行
4. 只输出识别结果，禁止输出<think>等标记`
  },
  formula: {
    id: 'formula',
    name: '公式识别',
    prompt: `你是一个公式OCR工具。请直接输出图片中的公式，不要输出任何思考过程。
要求：
1. 使用 LaTeX 格式输出公式
2. 行内公式用 $ 包裹
3. 独立公式用 $$ 包裹
4. 只输出公式内容，禁止输出<think>等标记`
  }
};

/**
 * 从 Ollama 获取模型列表
 */
async function fetchOllamaModels(baseURL = 'http://127.0.0.1:11434') {
  try {
    // Ollama 使用 /api/tags 端点
    const ollamaBase = baseURL.replace('/v1', '');
    const data = await httpRequest(`${ollamaBase}/api/tags`);
    
    if (!data.models || !Array.isArray(data.models)) {
      console.log('Ollama response:', data);
      return [];
    }
    
    return data.models.map(model => ({
      id: model.name,
      name: model.name,
      vision: isVisionModel(model.name),
      contextLength: 4096 // 默认值
    }));
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
}

/**
 * 从 LM Studio 或 OpenAI 兼容接口获取模型列表
 */
async function fetchOpenAICompatibleModels(baseURL, apiKey = '') {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const data = await httpRequest(`${baseURL}/models`, { headers });
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log('API response:', data);
      return [];
    }
    
    return data.data.map(model => ({
      id: model.id,
      name: model.id,
      vision: isVisionModel(model.id),
      contextLength: model.context_length || 4096
    }));
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return [];
  }
}

/**
 * 判断模型是否支持视觉
 */
function isVisionModel(modelId) {
  const id = modelId.toLowerCase();
  
  // 常见的视觉模型关键词
  const visionKeywords = [
    'vision',    // 通用 vision
    'llava',     // LLaVA 系列
    'minicpm-v', // MiniCPM-V
    'minicpm_v',
    '-vl',       // Vision-Language (qwen-vl, etc.)
    '_vl',
    '.vl',
    'vl-',       // qwen3-vl-30b
    '-v-',       // glm-4v-flash
    '4o',        // GPT-4o
    'bakllava',
    'cogvlm',
    'internvl',
    'yi-vl',
    'phi-3-vision',
    'phi3-vision',
    'moondream',
    'fuyu',
    'idefics',
    'paligemma',
    'glm-4v',
    'glm-4.', // glm-4.6v, glm-4.9v 等
  ];
  
  // 先检查关键词
  if (visionKeywords.some(keyword => id.includes(keyword))) {
    return true;
  }
  
  // 再检查模式：数字后跟v（如 4v, 4.6v, 3v 等）
  if (/\d\.?\d*v/.test(id)) {
    return true;
  }
  
  return false;
}

/**
 * 获取提供商的模型列表
 */
async function getProviderModels(providerId, baseURL, apiKey) {
  const provider = PROVIDERS[providerId];
  if (!provider) return [];
  
  // 如果有预设模型且不支持动态获取，直接返回
  if (provider.models.length > 0 && !provider.supportsModelList) {
    return provider.models;
  }
  
  // 动态获取模型列表
  if (providerId === 'ollama') {
    return await fetchOllamaModels(baseURL || provider.baseURL);
  }
  
  // LM Studio 和自定义服务使用 OpenAI 兼容接口
  if (provider.supportsModelList) {
    const url = baseURL || provider.baseURL;
    if (url) {
      return await fetchOpenAICompatibleModels(url, apiKey);
    }
  }
  
  return provider.models;
}

module.exports = {
  PROVIDERS,
  TRANSLATION_STYLES,
  OCR_STYLES,
  fetchOllamaModels,
  fetchOpenAICompatibleModels,
  getProviderModels
};
