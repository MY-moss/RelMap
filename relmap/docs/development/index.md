# 架构概览

RelMap 采用 Electron + React 桌面应用架构，主进程和渲染进程通过 IPC 通信。

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Electron App                       │
│  ┌─────────────────────────────────────────────┐    │
│  │          主进程 (Main Process)               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │ IPC 处理器│  │  AI 模块 │  │  数据库  │  │    │
│  │  │(electron/│  │(main/ai) │  │(main/db) │  │    │
│  │  │ipc/*.ts) │  │          │  │          │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│                        ↕ IPC                         │
│  ┌─────────────────────────────────────────────┐    │
│  │         渲染进程 (Renderer Process)           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │  React   │  │  Hooks   │  │  Stores  │  │    │
│  │  │  Pages   │  │ (TanStack│  │(Zustand) │  │    │
│  │  │          │  │  Query)  │  │          │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **桌面框架** | Electron 30 |
| **前端框架** | React 18 |
| **语言** | TypeScript 5 |
| **构建工具** | Vite 5 + vite-plugin-electron |
| **样式** | TailwindCSS 3 + PostCSS |
| **数据库** | better-sqlite3 (SQLite) |
| **状态管理** | TanStack React Query + Zustand |
| **关系图谱** | Cytoscape.js |
| **AI** | Tesseract.js, face-api.js |
| **测试** | Vitest |
| **日志** | pino + pino-pretty |
| **国际化** | i18next + react-i18next |

## 目录结构

```
relmap/
├── electron/                  # Electron 主进程
│   ├── ipc/                   # IPC 处理器
│   │   ├── index.ts           # 注册中心
│   │   ├── person.ipc.ts      # 联系人 IPC
│   │   ├── relation.ipc.ts    # 关系 IPC
│   │   ├── ai.ipc.ts          # AI IPC
│   │   └── ...                # 其他模块
│   ├── main.ts                # 主进程入口
│   ├── preload.ts             # 预加载脚本
│   ├── data-security.ts       # 数据安全
│   └── logger.ts              # 日志
├── src/                       # 渲染进程
│   ├── components/            # 共享组件
│   ├── hooks/                 # React Query Hooks
│   ├── pages/                 # 页面组件
│   ├── main/                  # 主进程逻辑注入
│   │   ├── ai/                # AI 模块
│   │   └── db/                # 数据库
│   ├── shared/                # 共享类型
│   ├── stores/                # Zustand 状态
│   └── i18n/                  # 国际化
├── tests/                     # 测试
└── docs/                      # 文档
```
