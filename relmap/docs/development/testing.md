# 测试

RelMap 使用 Vitest 进行单元测试和基准测试。

## 测试配置

测试配置文件位于 `tests/vitest.config.ts`。

## 运行测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 带覆盖率报告
npm run test:coverage

# 使用 UI 模式
npx vitest --config tests/vitest.config.ts --ui
```

## 测试结构

```
tests/
├── unit/          # 单元测试
│   ├── ...        # 测试用例
├── benchmarks/    # 基准测试
├── vitest.config.ts
```

## 测试范围

### 单元测试

- AI 模块（OCR、文本分析、人脸检测等）
- 数据库操作（CRUD、迁移）
- IPC 处理器逻辑
- 工具函数

### 基准测试

- 大数据量下的性能测试
- 算法复杂度验证

## 编写测试

推荐使用 Vitest 的标准测试语法：

```typescript
import { describe, it, expect } from 'vitest'

describe('模块名称', () => {
  it('应该正确执行某个功能', () => {
    const result = someFunction(input)
    expect(result).toBe(expectedOutput)
  })
})
```

## 测试原则

- 测试应与实现分离，避免测试细节耦合
- 数据库测试应使用隔离的测试数据库
- AI 模块测试应 mock 外部依赖
- 保持测试独立性和可重复性
