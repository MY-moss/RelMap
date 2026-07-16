# 贡献指南

欢迎对 RelMap 项目做出贡献！

## 开发流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: 添加某个功能'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

## 代码规范

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档更新
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/依赖

### TypeScript

- 所有代码使用 TypeScript
- 严格模式
- 避免 `any` 类型

### 代码风格

- 使用 ESLint 检查：`npm run lint`
- 遵循项目已有的代码风格
- 导入按模块分组排序

## 分支策略

- `main` — 稳定版本
- `dev` — 开发分支
- `feature/*` — 功能分支
- `fix/*` — 修复分支

## 构建

确保提交前项目可以正常构建：

```bash
npm run build
```

## 测试

确保提交前相关测试通过：

```bash
npm test
```

## 文档

- 新功能需要包含文档更新
- API 变更需要同步更新 IPC 文档
- 保持文档与实际代码一致

## 代码审查

所有 PR 需要经过代码审查：

- 检查代码是否正确
- 检查是否有完善的测试
- 检查是否有必要的文档更新
- 检查是否符合代码规范
