# 数据流

## 渲染进程 → 主进程（IPC 调用）

```
┌─────────────────────┐         ┌──────────────────────┐
│   React Component   │         │    IPC Handler        │
│                     │         │                       │
│  useCreatePerson()  │         │  person:create        │
│       ↓             │ invoke  │       ↓               │
│  mutationFn →       │ ──────→ │  createPerson()       │
│  electronAPI.       │         │       ↓               │
│  person.create()    │         │  repository → DB      │
│                     │         │       ↓               │
│       ↑             │ ←────── │  Result<Person>        │
│  onSuccess:         │  return │                       │
│  invalQueries()     │         │                       │
└─────────────────────┘         └──────────────────────┘
```

## 查询数据流

```
┌─────────────────────┐         ┌──────────────────────┐
│   React Component   │         │   TanStack Query      │
│                     │         │                       │
│  usePersonList()    │         │  queryKey: ['persons',│
│       ↓             │         │            'list', f] │
│  useQuery({         │         │       ↓               │
│    queryFn })       │         │  electronAPI.         │
│       ↓             │         │  person.list(filter)  │
│  staleTime: 30s     │         │       ↓               │
│                     │         │  IPC invoke →         │
│  return data        │ ←────── │  listPersons() → DB   │
└─────────────────────┘         └──────────────────────┘
```

## 变异数据流

```
┌─────────────────────┐   1. mutate()    ┌──────────────────┐
│   React Component   │ ───────────────→  │  useMutation     │
│                     │                   │                  │
│  onMutate:          │                   │  mutationFn      │
│  optimistic update  │                   │  → IPC invoke    │
│                     │                   │                  │
│  onSettled:         │ ←───────────────  │  onSuccess       │
│  invalidateQueries  │   3. data/error   │  invalidate      │
└─────────────────────┘                   └──────────────────┘
```

## 状态管理（Zustand）

一些 UI 状态通过 Zustand 管理，保持原子化、轻量：

```
stores/
├── ...  # UI 状态（导航、弹窗、主题等）
```

## 事件监听

主进程可以通过白名单通道向渲染进程推送事件：

```typescript
// 渲染进程监听
const unsubscribe = electronAPI.on('ai:progress', (data) => {
  console.log('Progress:', data)
})

// 组件卸载时清理
unsubscribe()
```

允许的事件通道：`ai:progress`, `backup:progress`, `import:progress`
