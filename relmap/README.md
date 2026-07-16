<div align="center">

# RelMap

### AI 驱动的人际关系管理工具

让每一段关系都被看见、被记住、被用心经营。

[功能特性](#-核心功能) · [快速开始](#-快速开始) · [项目结构](#-项目结构) · [参与贡献](#-参与贡献) · [开源许可](#-开源许可)

[![CI](https://github.com/relmap/relmap/actions/workflows/ci.yml/badge.svg)](https://github.com/relmap/relmap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./CHANGELOG.md)

<!-- 截图占位符：在此处放入应用截图 -->
<!-- ![RelMap 主界面](docs/public/screenshot-main.png) -->
<!-- ![关系图谱](docs/public/screenshot-graph.png) -->

</div>

---

## 📖 项目简介

**RelMap** 是一款本地优先、隐私安全的智能关系管理桌面应用。它将联系人管理、关系图谱、AI 智能分析与日记系统融为一体，帮助你洞察人际关系网络、记住每一次互动、在合适的时机维系重要的联系。

所有数据均存储在本地加密数据库中，AI 能力支持接入本地模型（如 Ollama），你的关系数据永远不会离开你的设备。

> **核心价值**：AI 驱动的人际关系管理 —— 不只是记录，更是理解与提醒。

## ✨ 核心功能

### 🤖 AI 智能助手
- **桥梁检测** —— 发现社交网络中连接不同圈子的关键人物
- **重复检测** —— 自动识别并合并重复联系人
- **人脸识别** —— 基于照片自动识别联系人（face-api.js）
- **亲密度分析** —— 量化关系亲密度，并预测亲密度变化趋势
- **失联预警** —— 智能提醒你即将疏远的重要联系人
- **人格画像** —— 基于互动记录生成联系人人格侧写
- **智能分组** —— AI 自动建议合理的联系人分组
- **建议引擎** —— 主动给出维系关系的行动建议
- **文本分析** —— 分析互动内容中的情感与关键词
- **OCR 文字识别** —— 从图片中提取名片、文字信息（tesseract.js）

### 👥 联系人管理
- 完整的联系人档案（基本信息、社交账号、照片、标签）
- 多维度关系管理（亲密度、关系类型）
- 照片管理与批量导入
- 标签与群组系统

### 🕸️ 关系图谱
- 基于 Cytoscape 的交互式关系网络可视化
- 支持图谱导出与增强分析
- 直观展示人际网络结构

### 📝 日记与互动
- 富文本日记编辑器（TipTap）
- 互动记录与跟进队列
- 事件管理与时间线回顾
- 记忆胶囊 —— 封存珍贵时刻

### 📊 数据分析
- 多维度关系数据看板（Recharts）
- 年度回顾（Wrapped）—— 一键生成关系年度报告
- 全局搜索快速定位联系人、事件、日记

### 🔒 隐私与安全
- 本地加密数据库（better-sqlite3-multiple-ciphers）
- 数据库密码保护与 PIN 锁屏
- 完整的备份与恢复机制
- 遥测需用户明确授权

### 🌐 其他特性
- 多语言支持（中文 / English）
- 插件系统，可扩展功能
- 支持 Bring Your Own Key —— 接入你自己的 AI 服务（含 Ollama 本地模型）
- VitePress 构建的项目文档站

## 🛠️ 技术栈

| 类别 | 技术 |
| --- | --- |
| 桌面框架 | Electron 30 |
| 前端框架 | React 18 |
| 开发语言 | TypeScript 5（严格模式） |
| 构建工具 | Vite 5 + electron-builder |
| 数据库 | better-sqlite3-multiple-ciphers（加密 SQLite） |
| ORM | Drizzle ORM |
| 状态管理 | Zustand + TanStack React Query |
| 图谱可视化 | Cytoscape.js |
| 图表 | Recharts |
| 富文本编辑 | TipTap |
| AI 视觉 | face-api.js |
| OCR | tesseract.js |
| 国际化 | i18next |
| 样式 | Tailwind CSS |
| 单元测试 | Vitest |
| E2E 测试 | Playwright |
| 文档 | VitePress |

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9
- 操作系统：Windows / macOS / Linux

### 安装与开发

```bash
# 克隆仓库
git clone https://github.com/relmap/relmap.git
cd relmap

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 常用命令

```bash
# 代码检查
npm run lint

# 类型检查
npx tsc --noEmit

# 单元测试
npm test

# 测试覆盖率
npm run test:coverage

# 端到端测试
npm run test:e2e

# 性能基准测试
npm run benchmark

# 构建生产版本（编译 + 打包）
npm run build

# 文档站点开发
npm run docs:dev
```

### 数据库迁移

项目使用 Drizzle ORM 管理数据库 Schema：

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 可视化数据库结构
npm run db:studio
```

## 📁 项目结构

```
relmap/
├── electron/                # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本（安全暴露 IPC）
│   └── ipc/                 # IPC 通信处理器（按功能拆分）
│
├── src/                     # 渲染进程（React 应用）
│   ├── main/                # 核心业务逻辑
│   │   ├── ai/              # AI 模块（桥梁检测、亲密度、OCR 等）
│   │   ├── db/              # 数据库层
│   │   │   ├── drizzle/     # Drizzle Schema 与连接
│   │   │   └── repositories/# 数据访问层（按实体拆分）
│   │   └── plugin/          # 插件系统
│   ├── components/          # React 组件（按领域分类）
│   │   ├── ai/              # AI 相关组件
│   │   ├── persons/         # 联系人组件
│   │   ├── relations/       # 关系组件
│   │   └── ...
│   ├── pages/               # 页面组件
│   ├── hooks/               # React Hooks（数据获取与状态）
│   ├── i18n/                # 国际化配置
│   ├── locales/             # 语言包（zh-CN / en-US）
│   └── shared/              # 共享类型与工具
│
├── tests/                   # 测试
│   ├── unit/                # 单元测试（Vitest）
│   ├── e2e/                 # 端到端测试（Playwright）
│   ├── smoke/               # 冒烟测试
│   └── benchmarks/          # 性能基准测试
│
├── docs/                    # VitePress 文档站
├── scripts/                 # 构建、发布、数据填充脚本
├── .github/                 # CI/CD 与社区模板
│   ├── ISSUE_TEMPLATE/      # Issue 模板
│   ├── workflows/           # GitHub Actions 工作流
│   └── PULL_REQUEST_TEMPLATE.md
│
├── drizzle.config.ts        # Drizzle ORM 配置
├── electron-builder.yml     # Electron 打包配置
├── vite.config.ts           # Vite 构建配置
└── package.json
```

## 📸 截图

<!-- 在此处添加应用截图，展示核心功能 -->

> 主界面、关系图谱、AI 分析、年度回顾等截图待补充。

## 🤝 参与贡献

欢迎参与 RelMap 的开发！请先阅读以下文档：

- [贡献指南](./CONTRIBUTING.md) —— 开发环境搭建、代码规范、提交信息规范与 PR 流程
- [社区行为准则](./CODE_OF_CONDUCT.md) —— 我们对社区成员的期望
- [安全策略](./SECURITY.md) —— 如何报告安全漏洞

快速参与方式：
1. 🐛 [报告 Bug](https://github.com/relmap/relmap/issues/new?template=bug_report.yml)
2. 💡 [提出功能建议](https://github.com/relmap/relmap/issues/new?template=feature_request.yml)
3. 🔧 Fork 仓库并提交 Pull Request

## 📃 开源许可

本项目基于 [MIT License](./LICENSE) 开源，欢迎自由使用、修改和分发。

© 2026 RelMap Team

## 📌 相关链接

- [更新日志](./CHANGELOG.md)
- [项目文档](https://relmap.github.io/relmap/)
- [AI 模块说明](./docs/development/ai-modules.md)
- [测试指南](./docs/development/testing.md)
