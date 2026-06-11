# 单词记忆 (Word Memory)

> 英语单词记忆软件 — Electron 桌面应用

![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-42.4.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)

## 功能

- 📚 **多词表管理** — 创建多个词表，自由切换
- 📋 **粘贴批量导入** — 快速导入单词（支持 `word - 释义` / `word,释义` 格式）
- 🗑 **批量删除** — 勾选 + 全选，一键删除多个单词
- 🧠 **单词测验** — 选择题模式，答错自动重练
- 💾 **本地存储** — 所有数据保存在浏览器本地，无需注册登录

## 使用

1. 从 [Releases](https://github.com/YOUR_USERNAME/word-memory/releases) 下载安装包
2. 双击安装
3. 打开软件 → 粘贴单词 → 开始背词

### 单词格式

每行一个单词，支持以下格式：

```
apple - 苹果
hello,你好
world   世界
study 学习
```

## 开发

```bash
# 安装依赖
cd src && npm install

# 运行
npm start

# 打包安装程序
npx electron-builder --win
```

也可用 Inno Setup 编译 `build/installer.iss` 生成安装包。

## 构建

| 方式 | 工具 | 输出 |
|---|---|---|
| electron-builder | `npx electron-builder --win` | `dist/*.exe` |
| Inno Setup | 编译 `installer.iss` | `installer/*.exe` |

## 技术栈

- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand (持久化到 localStorage)
- **桌面**: Electron 42
- **打包**: electron-builder / Inno Setup

## 许可

[MIT](LICENSE)
