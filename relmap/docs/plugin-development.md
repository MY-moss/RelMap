# RelMap 插件开发指南 v2

## 概述

RelMap v2 插件架构允许开发者通过沙箱化的 worker_threads + vm.createContext 环境编写安全、隔离的插件。插件可以注册 IPC 通道、响应生命周期事件、注入 UI 组件。

## 快速开始

```bash
# 使用脚手架创建插件
node scripts/create-plugin.js my-plugin

# 目录结构
plugins/my-plugin/
├── plugin.json          # 插件清单
└── index.js             # 入口文件（运行在沙箱中）
```

## 插件清单 (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名",
  "main": "index.js",
  "hooks": ["app:ready", "person:created"],
  "permissions": ["network", "db:read"],
  "actions": ["myAction"],
  "ui": { "slots": ["sidebar"] }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `name` | string | 是 | 插件名称（字母数字._-，1-100字符） |
| `version` | string | 是 | 语义化版本号 |
| `description` | string | 否 | 插件描述 |
| `author` | string | 否 | 作者 |
| `main` | string | 是 | 入口文件路径（相对于插件目录） |
| `hooks` | string[] | 否 | 监听的系统事件列表 |
| `permissions` | string[] | 否 | 声明的权限（默认拒绝，白名单放行） |
| `actions` | string[] | 否 | 插件暴露的操作列表 |
| `ui.slots` | string[] | 否 | UI 插槽名称列表 |

### 可用权限

| 权限 | 说明 |
|------|------|
| `db:read` | 读取数据库（查询联系人、日记等） |
| `db:write` | 写入数据库 |
| `network` | 发起 HTTP 请求（fetch） |
| `filesystem` | 读取/写入文件系统 |
| `notification` | 显示系统通知 |
| `clipboard` | 访问剪贴板 |
| `shell:open` | 在默认程序中打开文件/URL |
| `ai:inference` | 调用 AI 推理 |

### 可用事件 (hooks)

| 事件 | 触发时机 | 参数 |
|------|---------|------|
| `app:ready` | 应用启动完成 | 无 |
| `app:before-quit` | 应用退出前 | 无 |
| `person:created` | 新建联系人 | `{ id, name }` |
| `person:updated` | 更新联系人 | `{ id, name }` |
| `person:deleted` | 删除联系人 | `{ id }` |
| `diary:saved` | 保存日记 | `{ id, content }` |
| `diary:deleted` | 删除日记 | `{ id }` |
| `graph:rendered` | 关系图谱渲染完成 | `{ nodeCount, edgeCount }` |

## 插件 API

入口文件导出 `function(api)`，`api` 对象提供以下能力：

### api.registerIPC(channel, handler)

注册可由渲染进程调用的 IPC 处理器。

```js
api.registerIPC('myAction', async (param) => {
  // handler 运行在沙箱中
  return { result: 'ok' }
})
// 渲染进程调用: window.electronAPI['plugin:my-plugin:myAction'](param)
```

### api.on(event, handler) / api.off(event, handler)

监听/取消监听系统事件（需要在 plugin.json 的 hooks 中声明对应事件）。

```js
api.on('app:ready', () => {
  api.logger.info('My plugin is ready')
})

api.on('person:created', (person) => {
  api.logger.info(`New person: ${person.name}`)
})
```

### api.db.query(sql, params)

执行只读数据库查询（需要 `db:read` 权限）。

```js
const people = await api.db.query('SELECT * FROM persons WHERE name LIKE ?', ['%张%'])
```

### api.logger

日志记录器。

```js
api.logger.info('message')
api.logger.warn('warning')
api.logger.error('error')
```

### api.fetch(url, options)

发起 HTTP 请求（需要 `network` 权限）。

```js
const res = await api.fetch('https://api.example.com/data')
const data = await res.json()
```

### api.notify(title, body)

显示系统通知（需要 `notification` 权限）。

```js
api.notify('提醒', '该给朋友打电话了')
```

### api.getConfig(key) / api.setConfig(key, value)

读取/写入插件配置。

```js
const model = await api.getConfig('ollama.model')
await api.setConfig('ollama.model', 'llama3.2')
```

## 沙箱限制

插件运行在 worker_threads + vm.createContext 创建的受限环境中：

- ❌ 不能使用 `require()` / `import()` 加载 Node.js 模块
- ❌ 不能访问 `process`、`fs`、`child_process` 等 Node.js 全局
- ❌ 不能直接操作 DOM 或 Electron API
- ❌ 不能发起网络请求（除非声明 `network` 权限）
- ✅ 可以使用 `api.*` 方法安全地与主进程通信
- ✅ 可以使用标准 JavaScript 内置对象（Array, Map, Promise, setTimeout 等）
- ✅ 可以调用 `api.fetch()` 发起 HTTP 请求（受权限控制）

IPC 速率限制：每秒钟最多 100 条 IPC 消息。

## UI 插槽

插件可以声明 UI 插槽来在 RelMap 界面中渲染组件。当前支持的插槽：

| 插槽名称 | 位置 | 说明 |
|---------|------|------|
| `sidebar` | 侧边栏底部 | 扩展功能入口 |
| `person-detail-toolbar` | 联系人详情页工具栏 | 快捷操作 |
| `person-detail-panel` | 联系人详情页附加面板 | 额外信息展示 |

UI 插槽使用 `<PluginSlot>` 组件包裹，含 CSS 隔离 (`contain: content`) 和 ErrorBoundary 保护。

## 完整示例

见 `plugins/ollama-bridge/` — 一个完整的 Ollama 本地 LLM 桥接插件，展示了 IPC 注册、事件监听、网络请求和通知发送。

## 调试

启用插件后，日志会在 Settings → 插件管理 → 日志面板中显示。插件异常不会导致主进程崩溃——ErrorBoundary 会捕获 UI 错误，沙箱会隔离代码执行错误。
