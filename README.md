# 单词记忆 (Word Memory)

英语单词记忆软件，基于 Electron 构建的跨平台桌面应用。

## 功能特性

### 📚 多词表管理
- 支持创建、切换多个独立词表，每个词表拥有独立的单词库
- 词表之间互不干扰，适合按课程/教材/场景分类记忆

### 📦 词表分组（v1.1.0 新增）
- **分组管理**：可将多个词表归入同一分组，便于按主题/阶段组织学习
- **批量导入**：支持按格式（TXT / CSV / TSV / PDF）批量导入单词，自动解析并填充
- **分组导入**：导入时可指定目标分组，一次导入即可完成分组归类
- **灵活切换**：在学习界面可快速切换不同词表和分组

### ✏️ 批量操作
- **批量添加**：支持粘贴多行文本批量录入单词
- **批量删除**：支持勾选 + 全选后一键删除，清理不再需要的词条
- **实时预览**：删除前确认，避免误操作

### 🎯 智能学习
- 英文单词卡片展示，支持翻转查看释义
- 记忆进度追踪，自动记录已学/未学状态
- 可导入 PDF 文件自动提取文本内容

### 🖥️ 跨平台
- Windows 安装包（NSIS）
- 支持自定义安装路径
- 自动创建桌面快捷方式和开始菜单

## 快速开始

### 下载安装

从 [Releases](https://github.com/13235498681/word-memory/releases) 页面下载最新安装包：

- **单词记忆 Setup 1.1.0.exe** — Windows 安装程序，双击运行，按向导完成安装

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/13235498681/word-memory.git
cd word-memory

# 下载 Electron 运行时（放到 word-memory/ 目录）
# 从 https://github.com/electron/electron/releases 下载对应版本

# 安装构建依赖
npm install

# 构建安装包
npm run build
```

## 项目结构

```
word-memory/
├── resources/
│   └── app/                # 应用源码
│       ├── main.cjs        # Electron 主进程
│       ├── preload.cjs     # 预加载脚本（IPC 桥接）
│       ├── index.html      # 渲染进程入口
│       ├── package.json    # 应用配置 & 构建配置
│       ├── favicon.svg     # 应用图标
│       └── assets/         # 前端资源（React 构建产物）
├── package.json            # 构建入口 & NSIS 配置
└── installer.nsi           # NSIS 安装脚本（可选）
```

## 构建安装包

```bash
# 在 word-memory/ 目录下
npm install
npx electron-builder --prepackaged .
```

或使用 NSIS 直接编译：

```bash
makensis installer.nsi
```

输出：`dist/单词记忆 Setup 1.1.0.exe`

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Electron |
| 前端 | React + Vite |
| 状态管理 | Zustand |
| 打包 | electron-builder / NSIS |
| 存储 | localStorage (IndexedDB) |

## 许可

MIT License
