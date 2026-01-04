const OpenAI = require('openai');
const { TRANSLATION_STYLES } = require('./providers');

/**
 * 创建 AI 客户端
 */
function createClient(config) {
  const options = {
    apiKey: config.apiKey || 'not-needed',
    baseURL: config.apiBase || 'https://api.openai.com/v1'
  };
  
  if (config.provider === 'ollama') {
    options.apiKey = 'ollama';
  }
  
  return new OpenAI(options);
}

// 语言映射
const LANG_MAP = {
  'zh': '中文',
  'en': '英文',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'ru': '俄语',
  'pt': '葡萄牙语',
  'it': '意大利语',
  'ar': '阿拉伯语',
  'th': '泰语',
  'vi': '越南语'
};

/**
 * 使用大模型进行翻译
 * @param {string} text 要翻译的文本
 * @param {string} targetLang 目标语言（auto 为自动检测）
 * @param {Object} config 配置
 * @returns {Promise<Object>} 翻译结果
 */
async function translate(text, targetLang = 'auto', config) {
  const needsApiKey = !['ollama', 'lmstudio'].includes(config.provider);
  if (needsApiKey && !config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const client = createClient(config);
  const style = TRANSLATION_STYLES[config.translationStyle] || TRANSLATION_STYLES.standard;

  // 构建翻译提示
  let systemPrompt;
  if (targetLang === 'auto') {
    systemPrompt = `你是一个专业的翻译助手。请检测输入文本的语言：
- 如果是中文，翻译成英文
- 如果是英文或其他语言，翻译成中文

${style.prompt.replace('{targetLang}', '目标语言')}`;
  } else {
    const targetLangName = LANG_MAP[targetLang] || targetLang;
    systemPrompt = style.prompt.replace('{targetLang}', targetLangName);
  }

  // 添加额外的风格指导
  if (config.customPrompt) {
    systemPrompt += `\n\n额外要求：${config.customPrompt}`;
  }

  try {
    // 使用翻译专用模型（如果配置了）
    const translationModel = config.translationModel || config.model || 'gpt-4o-mini';
    
    const response = await client.chat.completions.create({
      model: translationModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: config.maxTokens || 4096,
      temperature: config.translationTemperature || 0.3
    });

    const translatedText = response.choices[0]?.message?.content || '';
    
    return {
      success: true,
      original: text,
      translated: translatedText.trim(),
      style: style.name,
      usage: response.usage
    };
  } catch (error) {
    console.error('Translation error:', error);
    
    // 连接错误
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Connection error') || error.code === 'ECONNREFUSED') {
      if (config.provider === 'lmstudio') {
        throw new Error('无法连接到 LM Studio，请确保已启动 Local Server');
      } else if (config.provider === 'ollama') {
        throw new Error('无法连接到 Ollama，请确保 Ollama 服务正在运行');
      } else {
        throw new Error('无法连接到服务，请检查网络或服务是否已启动');
      }
    }
    
    // API Key 错误
    if (error.code === 'invalid_api_key' || error.status === 401) {
      throw new Error('API Key 无效，请检查设置');
    }
    
    throw new Error(`翻译失败: ${error.message}`);
  }
}

module.exports = { translate };
