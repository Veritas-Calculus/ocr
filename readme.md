# VC OCR

🔍 好用的跨平台 OCR 工具，接入大模型，支持划词翻译。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28+-blue.svg)

## ✨ 功能特性

- 📷 **智能 OCR 识别** - 截图识别、图片导入，支持多种识别模式（标准/代码/表格/手写/公式）
- 🖱️ **区域截图** - 自由选择屏幕区域进行识别，快捷键 `Cmd+Shift+O`
- 🌍 **划词翻译** - 选中文字后 `Cmd+Shift+T` 即时翻译，弹窗显示结果
- 🤖 **多模型支持** - 接入 OpenAI、Anthropic、Ollama、LM Studio 等多种 AI 服务
- 🎨 **翻译风格** - 标准/专业/口语/文学/技术/精炼多种翻译风格
- 💻 **跨平台** - 支持 macOS / Windows / Linux
- 🌙 **暗色模式** - 自动跟随系统主题

## 🖼️ 截图

> 待添加应用截图

## 🛠️ 技术栈

| 模块 | 技术选型 |
|------|---------|
| 框架 | Electron 28+ |
| OCR 引擎 | GPT-4o / Qwen-VL / LLaVA 等视觉模型 |
| AI 接口 | OpenAI 兼容 API（支持本地模型） |
| 图像处理 | Sharp |
| 配置存储 | electron-store |
| 前端 | 原生 HTML/CSS/JS |

## 🚀 快速开始

### 开发环境

```bash
# 克隆项目
git clone https://github.com/Veritas-Calculus/ocr.git
cd ocr

# 安装依赖
npm install

# 启动开发环境
npm start

# 构建应用
npm run build
```

### 使用本地模型

支持 Ollama 和 LM Studio 本地模型：

1. **Ollama**: 安装并运行 `ollama serve`，拉取视觉模型如 `llava`、`minicpm-v`
2. **LM Studio**: 启动 Local Server，加载支持 vision 的模型

在设置中选择对应提供商即可。

## ⌨️ 快捷键

| 功能 | 快捷键 |
|------|--------|
| 截图识别 | `Cmd/Ctrl + Shift + O` |
| 划词翻译 | `Cmd/Ctrl + Shift + T` |

## 📁 项目结构

```
src/
├── main/           # Electron 主进程
│   ├── main.js     # 应用入口
│   ├── ocr.js      # OCR 识别模块
│   ├── translate.js # 翻译模块
│   ├── providers.js # AI 服务提供商配置
│   ├── screenshot.js # 截图功能
│   └── preload.js  # 预加载脚本
└── renderer/       # 渲染进程
    ├── index.html  # 主界面
    ├── capture.html # 截图选区界面
    ├── popup.html  # 划词翻译弹窗
    ├── renderer.js # 前端逻辑
    └── styles.css  # 样式
```

## 📦 下载安装

| 平台 | 下载链接 |
|------|---------|
| macOS | [Releases](https://github.com/Veritas-Calculus/ocr/releases) |
| Windows | [Releases](https://github.com/Veritas-Calculus/ocr/releases) |
| Linux | [Releases](https://github.com/Veritas-Calculus/ocr/releases) |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT License](LICENSE)