# 快速开始

## 环境要求

- Node.js 18+
- npm 9+

## 安装

```bash
# 克隆项目
git clone <仓库地址>
cd relmap

# 安装依赖
npm install

# 安装 Canvas 可选依赖（用于 OCR 和 AI 功能）
npm install canvas
```

## 开发模式运行

```bash
npm run dev
```

这将同时启动 Vite 开发服务器和 Electron 窗口。

## 数据库

RelMap 使用 SQLite 作为本地数据库：

- **开发模式**：数据库文件位于 `data/relmap.db`
- **生产模式**：数据库文件位于 Electron 的 `userData` 目录

首次启动时，应用会自动运行数据库迁移，创建所有必要的表结构和全文搜索索引。

## 构建

```bash
npm run build
```

构建产物将输出到 `dist/` 和 `dist-electron/` 目录。

## 目录结构

```
relmap/
├── electron/          # Electron 主进程代码
│   └── ipc/           # IPC 处理器
├── src/               # 渲染进程代码
│   ├── components/    # React 组件
│   ├── hooks/         # React Query Hooks
│   ├── main/          # 主进程逻辑
│   │   ├── ai/        # AI 模块
│   │   └── db/        # 数据库 (SQLite)
│   ├── pages/         # 页面组件
│   ├── shared/        # 共享类型定义
│   └── stores/        # Zustand 状态管理
├── tests/             # 测试
└── docs/              # 文档
```
