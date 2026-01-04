const { desktopCapturer, screen } = require('electron');
const sharp = require('sharp');

/**
 * 截取全屏 - 使用 Electron 内置 API
 * @returns {Promise<string>} Base64 编码的图片
 */
async function captureScreen() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor;
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor)
      }
    });
    
    if (sources.length === 0) {
      throw new Error('无法获取屏幕截图，请检查屏幕录制权限');
    }
    
    // 获取主屏幕
    const source = sources[0];
    const thumbnail = source.thumbnail;
    
    if (thumbnail.isEmpty()) {
      throw new Error('截图为空，请在系统偏好设置中授予屏幕录制权限');
    }
    
    const pngBuffer = thumbnail.toPNG();
    const base64 = pngBuffer.toString('base64');
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Screenshot error:', error);
    throw new Error(`截图失败: ${error.message}`);
  }
}

/**
 * 从全屏截图中裁剪指定区域
 * @param {string} fullScreenBase64 全屏截图 Base64
 * @param {Object} region 区域 {x, y, width, height}
 * @param {Object} options 可选配置
 * @returns {Promise<string>} 裁剪后的 Base64 图片
 */
async function captureRegion(fullScreenBase64, region, options = {}) {
  try {
    // 移除 data:image/png;base64, 前缀
    const base64Data = fullScreenBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    // 获取屏幕缩放比例
    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;
    
    // 裁剪区域
    let pipeline = sharp(imgBuffer)
      .extract({
        left: Math.round(region.x * scaleFactor),
        top: Math.round(region.y * scaleFactor),
        width: Math.round(region.width * scaleFactor),
        height: Math.round(region.height * scaleFactor)
      });
    
    // 如果图片太大，进行缩放（本地模型可能内存有限）
    const maxSize = options.maxSize || 2048;
    const actualWidth = Math.round(region.width * scaleFactor);
    const actualHeight = Math.round(region.height * scaleFactor);
    
    if (actualWidth > maxSize || actualHeight > maxSize) {
      pipeline = pipeline.resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // 转换为 JPEG 以减小体积（可选）
    let croppedBuffer;
    if (options.format === 'jpeg') {
      croppedBuffer = await pipeline.jpeg({ quality: options.quality || 85 }).toBuffer();
      return `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;
    } else {
      croppedBuffer = await pipeline.png().toBuffer();
      return `data:image/png;base64,${croppedBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.error('Region capture error:', error);
    throw new Error(`区域截图失败: ${error.message}`);
  }
}

module.exports = { captureScreen, captureRegion };
