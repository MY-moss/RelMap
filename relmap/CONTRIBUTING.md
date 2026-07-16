# Contributing to RelMap

感谢您有兴趣为 RelMap 做出贡献！本文档提供了参与项目的指南。

Thank you for your interest in contributing to RelMap! This document provides guidelines for contributing.

## 报告 Bug / Reporting Bugs

请通过 [GitHub Issues](https://github.com/relmap/relmap/issues) 报告 bug，并使用 Bug Report 模板。请包含：

- 清晰的问题描述
- 复现步骤
- 预期行为与实际行为
- 环境信息（操作系统、应用版本等）
- 日志或截图

Please report bugs via GitHub Issues using the Bug Report template. Include a clear description, reproduction steps, expected vs actual behavior, environment info, and logs/screenshots.

## 建议功能 / Suggesting Features

使用 Feature Request 模板提交功能建议。请描述：

- 相关痛点或使用场景
- 期望的解决方案
- 替代方案（如有）
- 补充说明

Use the Feature Request template. Describe the problem/use case, desired solution, alternatives, and additional context.

## 开发环境搭建 / Development Setup

```bash
# 克隆仓库
git clone https://github.com/relmap/relmap.git
cd relmap

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

### 环境要求 / Prerequisites

- Node.js >= 18
- npm >= 9

## 代码风格 / Code Style

- **TypeScript**: 启用严格模式（`strict: true`），遵循项目现有类型约定
- **ESLint**: 项目使用 ESLint 进行代码检查，提交前确保 `npm run lint` 无错误
- **命名规范**:
  - 组件：PascalCase（如 `PersonDetailPage`）
  - 函数/变量：camelCase（如 `fetchPersons`）
  - 类型/接口：PascalCase 前缀 `I`（如 `IPerson`）或遵循现有模式
  - 文件：camelCase（如 `useUIStore.ts`）
- **导入顺序**: 外部库 → 内部模块 → 样式文件
- **注释**: 使用 JSDoc 注释公共 API；避免不必要的注释

## Pull Request 流程 / PR Process

1. Fork 仓库并创建功能分支（`feature/your-feature` 或 `fix/your-bug`）
2. 确保测试通过：`npm test`
3. 确保 lint 通过：`npm run lint`
4. TypeScript 编译无错误：`npx tsc --noEmit`
5. 提交 PR 并使用 PR 模板
6. 等待 Code Review

## 提交信息规范 / Commit Conventions

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>: <description>

[optional body]
[optional footer]
```

类型（types）:
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `docs`: 文档
- `chore`: 构建/工具
- `test`: 测试
- `style`: 样式变更（非功能）
- `perf`: 性能优化

示例：
```
feat: 添加联系人搜索功能
fix: 修复标签删除时的崩溃问题
refactor: 重构数据层使用 React Query
```

## 测试指南 / Testing Guidelines

- 使用 Vitest 编写测试
- 为新功能添加单元测试
- 保持测试覆盖率
- 测试文件放在 `tests/` 目录下
- 运行测试：`npm test` 或 `npm run test:coverage`

## 分支策略 / Branch Strategy

- `main`: 稳定发布分支
- `develop`: 开发主线
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `release/*`: 发布准备分支

## 疑问 / Questions

如有任何问题，请通过 GitHub Issues 或 Discussions 联系我们。
