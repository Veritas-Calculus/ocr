const OpenAI = require('openai');
const { OCR_STYLES } = require('./providers');

/**
 * 清理模型输出，移除思考标记和特殊标记
 */
function cleanModelOutput(text) {
  if (!text) return '';
  
  // 移除 <think>...</think> 标记及其内容
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  // 移除单独的 <think> 或 </think> 标记
  text = text.replace(/<\/?think>/gi, '');
  
  // 移除 <|begin_of_box|> 和 <|end_of_box|> 标记
  text = text.replace(/<\|begin_of_box\|>/gi, '');
  text = text.replace(/<\|end_of_box\|>/gi, '');
  
  // 移除其他可能的特殊标记
  text = text.replace(/<\|[^|]+\|>/g, '');
  
  return text.trim();
}

/**
 * 创建 AI 客户端
 */
function createClient(config) {
  const options = {
    apiKey: config.apiKey || 'not-needed',
    baseURL: config.apiBase || 'https://api.openai.com/v1'
  };
  
  // Ollama 不需要 API Key
  if (config.provider === 'ollama') {
    options.apiKey = 'ollama';
  }
  
  return new OpenAI(options);
}

/**
 * 使用大模型进行 OCR 识别
 * 支持多个服务提供商和视觉模型
 * @param {string} imageData Base64 编码的图片
 * @param {Object} config 配置
 * @returns {Promise<Object>} OCR 结果
 */
async function performOCR(imageData, config) {
  // 调试：打印使用的配置
  console.log('OCR 配置:', {
    provider: config.provider,
    model: config.model,
    apiBase: config.apiBase,
    ocrStyle: config.ocrStyle
  });
  
  // 本地模型不需要 API Key
  const needsApiKey = !['ollama', 'lmstudio'].includes(config.provider);
  if (needsApiKey && !config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const client = createClient(config);
  const ocrStyle = OCR_STYLES[config.ocrStyle] || OCR_STYLES.standard;

  try {
    // 构建消息
    const messages = [
      {
        role: 'system',
        content: ocrStyle.prompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请识别这张图片中的所有文字内容：'
          },
          {
            type: 'image_url',
            image_url: {
              url: imageData,
              detail: config.imageDetail || 'high'
            }
          }
        ]
      }
    ];

    const response = await client.chat.completions.create({
      model: config.model || 'gpt-4o',
      messages: messages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.1
    });

    const rawText = response.choices[0]?.message?.content || '';
    const text = cleanModelOutput(rawText);
    
    return {
      success: true,
      text: text,
      model: config.model,
      provider: config.provider,
      usage: response.usage
    };
  } catch (error) {
    console.error('OCR error:', error);
    
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
    
    // 处理常见错误
    if (error.code === 'invalid_api_key' || error.status === 401) {
      throw new Error('API Key 无效，请检查设置');
    }
    if (error.code === 'insufficient_quota') {
      throw new Error('API 额度不足');
    }
    
    // Vision 不支持错误
    if (error.message?.includes('does not support images') || 
        error.message?.includes('Vision add-on is not loaded') ||
        error.message?.includes('vision') ||
        error.message?.includes('image')) {
      throw new Error('当前模型不支持图片识别。请选择支持视觉的模型，如：\n- OpenAI: gpt-4o, gpt-4o-mini\n- Ollama: llava, minicpm-v, bakllava\n- LM Studio: 加载支持 vision 的模型');
    }
    
    // 模型崩溃错误
    if (error.message?.includes('crashed') || error.message?.includes('Exit code')) {
      throw new Error('模型处理图像时崩溃。可能原因：\n1. 模型不支持图像输入\n2. 图像太大，内存不足\n3. 请尝试其他视觉模型（如 qwen-vl 或 llava）');
    }
    
    throw new Error(`OCR 识别失败: ${error.message}`);
  }
}

/**
 * 使用本地 OCR（备选方案）
 * 可以集成 Tesseract.js 作为离线备选
 */
async function performLocalOCR(imageData) {
  // TODO: 集成 Tesseract.js 作为备选方案
  throw new Error('本地 OCR 功能暂未实现');
}

module.exports = { performOCR, performLocalOCR, createClient };
