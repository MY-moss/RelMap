# RelMap BYOK (Bring Your Own Key) 架构方案

## 目录

1. [数据结构设计](#1-数据结构设计)
2. [AI 服务抽象层](#2-ai-服务抽象层)
3. [与现有功能的集成点](#3-与现有功能的集成点)
4. [IPC 接口设计](#4-ipc-接口设计)
5. [安全考量](#5-安全考量)
6. [文件结构](#6-文件结构)

---

## 1. 数据结构设计

### 1.1 数据库表结构

新建两张表，迁移版本 4：

```sql
-- version 4: API 密钥管理
CREATE TABLE IF NOT EXISTS api_keys (
    id            TEXT PRIMARY KEY,
    provider      TEXT NOT NULL,              -- 'openai' | 'deepseek' | 'claude' | 'gemini' | 'ollama' | 'custom'
    name          TEXT NOT NULL,              -- 用户自定义名称（如 "我的 OpenAI 工作号"）
    base_url      TEXT,                       -- 自定义端点（用于兼容 API 或 Ollama），默认 null 使用官方地址
    encrypted_key TEXT NOT NULL,              -- AES-256-GCM 加密后的密钥
    key_prefix    TEXT,                       -- 明文存储的前 8 位（让用户辨认是哪条 key，如 "sk-proj-..."）
    model         TEXT,                       -- 默认模型（如 gpt-4o, deepseek-chat, claude-3-opus）
    is_enabled    INTEGER DEFAULT 1,
    priority      INTEGER DEFAULT 0,          -- 优先级（数字越大越优先使用）
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS provider_settings (
    id            TEXT PRIMARY KEY,
    provider      TEXT NOT NULL UNIQUE,       -- provider 标识
    max_retries   INTEGER DEFAULT 3,
    retry_delay   INTEGER DEFAULT 1000,       -- ms
    timeout_ms    INTEGER DEFAULT 30000,
    rate_limit_rpm INTEGER DEFAULT 0,         -- 每分钟请求上限，0 不限制
    max_tokens    INTEGER DEFAULT 4096,
    temperature   REAL DEFAULT 0.7,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id            TEXT PRIMARY KEY,
    provider      TEXT NOT NULL,
    model         TEXT NOT NULL,
    operation     TEXT NOT NULL,              -- 'chat' | 'embedding' | 'structured'
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens  INTEGER DEFAULT 0,
    duration_ms   INTEGER DEFAULT 0,
    success       INTEGER DEFAULT 1,
    error_msg     TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
```

### 1.2 加密存储方案

使用 **AES-256-GCM + Electron safeStorage 两级加密**：

```
流程:
  应用启动 → safeStorage.isEncryptionAvailable()
    ├─ true  → 用 safeStorage.encrypt() 加密一个随机 AES key
    │          将 AES key 的加密密文存入磁盘文件
    │          用 AES key 加密用户 API key（GCM 模式，含 auth tag）
    │          最终: encrypted_key = iv + ciphertext + authTag (base64)
    │          存入数据库 api_keys.encrypted_key
    │
    └─ false → 回退方案: 用机器指纹派生 key
               (hostname + os 特定路径 + 应用名 → SHA-256)
               警告用户加密强度降低

解密时机:
  仅在主进程调用 provider.send() 时临时解密 → 使用完毕后立即清除内存
```

```typescript
// src/main/crypto/keychain.ts
import { safeStorage } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ALGORITHM = 'aes-256-gcm'
const KEY_TAG = 'relmap-aes-key'
const KEY_FILE = 'relmap.enc'

function getKeyPath(): string {
  const dataDir = process.env['VITE_DEV_SERVER_URL']
    ? path.join(process.env.APP_ROOT!, 'data')
    : path.join(app.getPath('userData'), 'data')
  return path.join(dataDir, KEY_FILE)
}

function getOrCreateMasterKey(): Buffer {
  const keyPath = getKeyPath()
  if (fs.existsSync(keyPath)) {
    const wrapped = fs.readFileSync(keyPath)
    return safeStorage.decryptString(wrapped)
  }
  const aesKey = crypto.randomBytes(32)
  const wrapped = safeStorage.encryptString(aesKey.toString('base64'))
  fs.writeFileSync(keyPath, wrapped)
  return aesKey
}

export function encryptApiKey(plaintext: string): string {
  const key = getOrCreateMasterKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // iv + ciphertext + authTag, base64 编码
  return Buffer.concat([iv, encrypted, authTag]).toString('base64')
}

export function decryptApiKey(encoded: string): string {
  const key = getOrCreateMasterKey()
  const buf = Buffer.from(encoded, 'base64')
  const iv = buf.subarray(0, 16)
  const authTag = buf.subarray(buf.length - 16)
  const ciphertext = buf.subarray(16, buf.length - 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}
```

### 1.3 默认 Provider 列表

| Provider ID | 显示名称 | Base URL | 默认模型 | 类型 |
|---|---|---|---|---|
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 云端 |
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 云端 |
| `moonshot` | Moonshot (Kimi) | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | 云端 |
| `qwen` | 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 云端 |
| `claude` | Claude (Anthropic) | `https://api.anthropic.com/v1` | `claude-3-haiku` | 云端 |
| `gemini` | Gemini | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.0-flash` | 云端 |
| `ollama` | Ollama (本地) | `http://127.0.0.1:11434` | `llama3` | 本地 |

> 所有 OpenAI 兼容 Provider 共享同一套请求逻辑。Claude 和 Gemini 各自有独立适配器。

---

## 2. AI 服务抽象层

### 2.1 Provider 接口定义

```typescript
// src/main/ai/provider/types.ts

/** 统一的 Chat 请求格式 */
export interface ChatRequest {
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface EmbeddingRequest {
  model: string
  input: string | string[]
}

export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  usage?: { prompt_tokens: number; total_tokens: number }
}

export interface StructuredOutputRequest {
  model: string
  messages: { role: string; content: string }[]
  schema: Record<string, unknown>    // JSON Schema 描述输出结构
  temperature?: number
}

export interface StructuredOutputResponse<T = Record<string, unknown>> {
  data: T
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/** Provider 配置（DB 中的一行解密后） */
export interface ProviderConfig {
  id: string
  provider: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  settings: {
    maxRetries: number
    retryDelay: number
    timeoutMs: number
    rateLimitRpm: number
    maxTokens: number
    temperature: number
  }
}

export interface AIProvider {
  readonly name: string
  readonly supportsStreaming: boolean
  readonly supportsEmbedding: boolean
  readonly supportsStructuredOutput: boolean

  /** 非流式对话 */
  chat(req: ChatRequest, config: ProviderConfig): Promise<ChatResponse>

  /** 流式对话（可选） */
  chatStream?(req: ChatRequest, config: ProviderConfig): AsyncIterable<string>

  /** 向量嵌入 */
  embed?(req: EmbeddingRequest, config: ProviderConfig): Promise<EmbeddingResponse>

  /** 结构化输出 */
  structuredOutput<T>(
    req: StructuredOutputRequest,
    config: ProviderConfig
  ): Promise<StructuredOutputResponse<T>>
}
```

### 2.2 OpenAI 兼容 Provider（覆盖 DeepSeek / Moonshot / 通义千问 / 自定义）

```typescript
// src/main/ai/provider/openai-compatible.ts

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'openai-compatible'
  readonly supportsStreaming = true
  readonly supportsEmbedding = true
  readonly supportsStructuredOutput = true

  async chat(req: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const url = `${config.baseUrl}/chat/completions`
    const body = {
      model: req.model || config.model,
      messages: req.messages,
      temperature: req.temperature ?? config.settings.temperature,
      max_tokens: req.max_tokens ?? config.settings.maxTokens,
      stream: false,
    }
    const res = await this.request(url, body, config)
    const json = await res.json()
    return {
      content: json.choices[0].message.content,
      model: json.model,
      usage: json.usage && {
        prompt_tokens: json.usage.prompt_tokens,
        completion_tokens: json.usage.completion_tokens,
        total_tokens: json.usage.total_tokens,
      },
    }
  }

  async embed(req: EmbeddingRequest, config: ProviderConfig): Promise<EmbeddingResponse> {
    const url = `${config.baseUrl}/embeddings`
    const body = { model: req.model || 'text-embedding-3-small', input: req.input }
    const res = await this.request(url, body, config)
    const json = await res.json()
    return {
      embeddings: json.data.map((d: any) => d.embedding),
      model: json.model,
      usage: json.usage && { prompt_tokens: json.usage.prompt_tokens, total_tokens: json.usage.total_tokens },
    }
  }

  async structuredOutput<T>(req: StructuredOutputRequest, config: ProviderConfig): Promise<StructuredOutputResponse<T>> {
    const url = `${config.baseUrl}/chat/completions`
    const body = {
      model: req.model || config.model,
      messages: [
        { role: 'system', content: `你必须以 JSON Schema 格式输出:\n${JSON.stringify(req.schema)}` },
        ...req.messages,
      ],
      temperature: req.temperature ?? config.settings.temperature,
      response_format: { type: 'json_object' },
    }
    const res = await this.request(url, body, config)
    const json = await res.json()
    const content = json.choices[0].message.content
    return {
      data: JSON.parse(content) as T,
      model: json.model,
      usage: json.usage && { prompt_tokens: json.usage.prompt_tokens, completion_tokens: json.usage.completion_tokens, total_tokens: json.usage.total_tokens },
    }
  }

  private async request(url: string, body: unknown, config: ProviderConfig): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.settings.timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
      return res
    } finally {
      clearTimeout(timer)
    }
  }
}
```

### 2.3 Ollama Provider（本地模型）

```typescript
// src/main/ai/provider/ollama.ts

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama'
  readonly supportsStreaming = true
  readonly supportsEmbedding = false   // Ollama embedding 不在标准 API 中
  readonly supportsStructuredOutput = true

  async chat(req: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const url = `${config.baseUrl}/api/chat`
    const body = {
      model: req.model || config.model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? config.settings.temperature,
        num_predict: req.max_tokens ?? config.settings.maxTokens,
      },
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return {
      content: json.message.content,
      model: json.model,
    }
  }

  async structuredOutput<T>(req: StructuredOutputRequest, config: ProviderConfig): Promise<StructuredOutputResponse<T>> {
    const prompt = `请严格按照以下 JSON Schema 输出结果，不要输出其他内容:\n${JSON.stringify(req.schema)}\n\n`
    const res = await this.chat({
      ...req,
      messages: [{ role: 'system', content: prompt }, ...req.messages],
    }, config)
    return {
      data: JSON.parse(res.content) as T,
      model: res.model,
    }
  }
}
```

### 2.4 Claude Provider（非兼容格式）

```typescript
// src/main/ai/provider/claude.ts

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude'
  readonly supportsStreaming = true
  readonly supportsEmbedding = false
  readonly supportsStructuredOutput = true

  async chat(req: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const url = `${config.baseUrl}/messages`
    const body = {
      model: req.model || config.model,
      max_tokens: req.max_tokens ?? config.settings.maxTokens,
      messages: req.messages.filter(m => m.role !== 'system'),
      system: req.messages.find(m => m.role === 'system')?.content,
      temperature: req.temperature ?? config.settings.temperature,
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return {
      content: json.content[0].text,
      model: json.model,
      usage: json.usage && {
        prompt_tokens: json.usage.input_tokens,
        completion_tokens: json.usage.output_tokens,
        total_tokens: json.usage.input_tokens + json.usage.output_tokens,
      },
    }
  }
}
```

### 2.5 Gemini Provider

```typescript
// src/main/ai/provider/gemini.ts

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  readonly supportsStreaming = true
  readonly supportsEmbedding = true
  readonly supportsStructuredOutput = true

  async chat(req: ChatRequest, config: ProviderConfig): Promise<ChatResponse> {
    const url = `${config.baseUrl}/models/${req.model || config.model}:generateContent?key=${config.apiKey}`
    const systemPrompt = req.messages.find(m => m.role === 'system')?.content
    const contents = req.messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const body: any = { contents }
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return {
      content: json.candidates[0].content.parts[0].text,
      model: json.modelVersion || req.model,
      usage: json.usageMetadata && {
        prompt_tokens: json.usageMetadata.promptTokenCount,
        completion_tokens: json.usageMetadata.candidatesTokenCount,
        total_tokens: json.usageMetadata.totalTokenCount,
      },
    }
  }
}
```

### 2.6 Provider 注册中心

```typescript
// src/main/ai/provider/registry.ts

import type { AIProvider } from './types'
import { OpenAICompatibleProvider } from './openai-compatible'
import { OllamaProvider } from './ollama'
import { ClaudeProvider } from './claude'
import { GeminiProvider } from './gemini'

type ProviderFactory = (config: ProviderConfig) => AIProvider

const registry = new Map<string, ProviderFactory>()

// === 内置 Provider 注册 ===
registry.set('openai',     (c) => new OpenAICompatibleProvider())
registry.set('deepseek',   (c) => new OpenAICompatibleProvider())
registry.set('moonshot',   (c) => new OpenAICompatibleProvider())
registry.set('qwen',       (c) => new OpenAICompatibleProvider())
registry.set('custom',     (c) => new OpenAICompatibleProvider())   // 用户自定义端点
registry.set('ollama',     (c) => new OllamaProvider())
registry.set('claude',     (c) => new ClaudeProvider())
registry.set('gemini',     (c) => new GeminiProvider())

/** 获取 Provider 实例 */
export function getProvider(providerId: string, config: ProviderConfig): AIProvider {
  const factory = registry.get(providerId)
  if (!factory) throw new Error(`未知 provider: ${providerId}`)
  return factory(config)
}

/** 注册自定义 Provider（供未来扩展） */
export function registerProvider(id: string, factory: ProviderFactory): void {
  registry.set(id, factory)
}
```

### 2.7 Request 队列与限流

```typescript
// src/main/ai/provider/queue.ts

interface QueueItem {
  execute: () => Promise<unknown>
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

class RateLimiter {
  private queue: QueueItem[] = []
  private running = 0
  private lastCallTimestamps: number[] = []

  constructor(
    private maxConcurrent: number = 3,
    private rpm: number = 0,          // 每分钟请求数，0=不限制
  ) {}

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.rpm > 0) {
      await this.waitForSlot()
    }
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>(resolve => {
        this.queue.push({ execute: fn, resolve: resolve as any, reject: () => {} })
      })
    }
    this.running++
    try {
      return await fn()
    } finally {
      this.running--
      if (this.queue.length > 0) {
        const next = this.queue.shift()!
        next.resolve(undefined)
      }
    }
  }

  private async waitForSlot(): Promise<void> {
    const windowMs = 60000
    const now = Date.now()
    this.lastCallTimestamps = this.lastCallTimestamps.filter(t => now - t < windowMs)
    if (this.lastCallTimestamps.length >= this.rpm) {
      const oldest = this.lastCallTimestamps[0]
      const waitMs = windowMs - (now - oldest) + 100
      await new Promise(r => setTimeout(r, waitMs))
    }
    this.lastCallTimestamps.push(Date.now())
  }
}

const limiters = new Map<string, RateLimiter>()

export function getLimiter(providerId: string, rpm: number): RateLimiter {
  if (!limiters.has(providerId)) {
    limiters.set(providerId, new RateLimiter(3, rpm))
  }
  return limiters.get(providerId)!
}
```

### 2.8 统一调用入口（带重试 & 降级）

```typescript
// src/main/ai/provider/executor.ts

import { getProvider } from './registry'
import { getLimiter } from './queue'
import { decryptApiKey } from '../../crypto/keychain'
import { getDb } from '../../db/connection'
import type { ProviderConfig, ChatRequest, ChatResponse } from './types'

interface AIContext {
  keyId: string
  providerId: string
}

/** 按优先级获取启用的 Provider 配置 */
function getEnabledProviders(): ProviderConfig[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT k.*, ps.max_retries, ps.retry_delay, ps.timeout_ms,
           ps.rate_limit_rpm, ps.max_tokens, ps.temperature
    FROM api_keys k
    LEFT JOIN provider_settings ps ON ps.provider = k.provider
    WHERE k.is_enabled = 1
    ORDER BY k.priority DESC, k.created_at ASC
  `).all() as any[]

  return rows.map(r => ({
    id: r.id,
    provider: r.provider,
    name: r.name,
    baseUrl: r.base_url || getDefaultBaseUrl(r.provider),
    apiKey: decryptApiKey(r.encrypted_key),
    model: r.model || getDefaultModel(r.provider),
    settings: {
      maxRetries: r.max_retries ?? 3,
      retryDelay: r.retry_delay ?? 1000,
      timeoutMs: r.timeout_ms ?? 30000,
      rateLimitRpm: r.rate_limit_rpm ?? 0,
      maxTokens: r.max_tokens ?? 4096,
      temperature: r.temperature ?? 0.7,
    },
  }))
}

/** 执行 Chat 请求（自动重试 + 降级） */
export async function executeChat(req: ChatRequest): Promise<ChatResponse> {
  const providers = getEnabledProviders()
  if (providers.length === 0) throw new Error('未配置任何可用的 API Key')

  // 逐级降级: 按优先级尝试所有 provider
  let lastError: Error | null = null
  for (const config of providers) {
    try {
      const provider = getProvider(config.provider, config)
      const limiter = getLimiter(config.provider, config.settings.rateLimitRpm)
      return await limiter.enqueue(async () => {
        let attempt = 0
        while (attempt <= config.settings.maxRetries) {
          try {
            const result = await provider.chat(req, config)
            logUsage(config, 'chat', result.usage)
            return result
          } catch (err) {
            attempt++
            if (attempt > config.settings.maxRetries) throw err
            await new Promise(r => setTimeout(r, config.settings.retryDelay * attempt))
          }
        }
        throw new Error('重试耗尽')
      })
    } catch (err) {
      lastError = err as Error
      console.warn(`[AI] Provider ${config.provider}(${config.name}) 失败:`, err)
      continue  // 降级到下一个
    }
  }
  throw lastError || new Error('所有 Provider 均不可用')
}

/** 执行 Embedding 请求 */
export async function executeEmbed(input: string | string[]): Promise<number[][]> {
  const providers = getEnabledProviders().filter(p => {
    const provider = getProvider(p.provider, p)
    return provider.supportsEmbedding
  })
  if (providers.length === 0) throw new Error('没有支持 Embedding 的 Provider')
  // ... 类似 executeChat 的重试降级逻辑
}
```

---

## 3. 与现有功能的集成点

### 3.1 日记智能分析

```typescript
// src/main/ai/diary-analyzer.ts

const DIARY_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    keywords: { type: 'array', items: { type: 'string' } },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    sentiment_score: { type: 'number', minimum: 0, maximum: 10 },
    suggested_tags: { type: 'array', items: { type: 'string' } },
    mentioned_persons: { type: 'array', items: {
      type: 'object',
      properties: { name: { type: 'string' }, relation: { type: 'string' } },
    }},
    summary: { type: 'string' },
  },
  required: ['keywords', 'sentiment', 'suggested_tags', 'summary'],
}

export async function analyzeDiary(content: string): Promise<{
  keywords: string[]
  sentiment: string
  sentimentScore: number
  suggestedTags: string[]
  mentionedPersons: { name: string; relation: string }[]
  summary: string
}> {
  const result = await executeStructuredOutput({
    model: '',  // 使用默认模型
    messages: [
      { role: 'system', content: '你是一个日记分析助手，分析以下日记内容，提取关键信息。' },
      { role: 'user', content },
    ],
    schema: DIARY_ANALYSIS_SCHEMA,
  })
  return {
    keywords: result.data.keywords,
    sentiment: result.data.sentiment,
    sentimentScore: result.data.sentiment_score,
    suggestedTags: result.data.suggested_tags,
    mentionedPersons: result.data.mentioned_persons || [],
    summary: result.data.summary,
  }
}
```

### 3.2 人物关系分析

```typescript
// src/main/ai/relation-analyzer.ts

export async function suggestRelations(personId: string): Promise<{
  suggestions: { targetId: string; label: string; confidence: number }[]
}> {
  const db = getDb()
  const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person
  // 获取该人的交互记录、事件、日记
  const interactions = db.prepare('SELECT * FROM interaction_logs WHERE person_id = ?').all(personId)
  const events = db.prepare(`SELECT e.* FROM events e JOIN event_persons ep ON e.id=ep.event_id WHERE ep.person_id=?`).all(personId)

  const result = await executeStructuredOutput({
    messages: [
      { role: 'system', content: '根据以下人际关系数据，推荐该联系人可能存在的关系网络。' },
      { role: 'user', content: JSON.stringify({ person, interactions, events }) },
    ],
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetId: { type: 'string' },
              label: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  })
  return result.data as any
}
```

### 3.3 OCR 增强（降级策略）

```typescript
// src/main/ai/ocr.ts (现有文件增强)

export async function scanCard(imagePath: string): Promise<Result<OcrResult>> {
  // 1. 先用本地 Tesseract
  const localResult = await localOcrScan(imagePath)
  if (localResult.success && isConfidenceHigh(localResult.data)) {
    return localResult
  }

  // 2. 低置信度 → 尝试云端 AI 增强
  try {
    const imageBase64 = await imageToBase64(imagePath)
    const aiResult = await executeStructuredOutput({
      messages: [
        { role: 'system', content: '你是一个名片识别助手，从图片 OCR 结果中提取结构化名片信息。' },
        { role: 'user', content: JSON.stringify({
          ocr_raw_text: localResult.success ? localResult.data.raw_text : '',
          instruction: '请从以上 OCR 文本中提取名片信息，修正可能的识别错误。如果 OCR 结果为空，请根据图片内容分析。',
        })},
      ],
      schema: OCR_RESULT_SCHEMA,
    })
    return { success: true, data: { ...aiResult.data, raw_text: localResult.success ? localResult.data.raw_text : '' } }
  } catch {
    // 云端失败时回退到本地结果
    return localResult
  }
}
```

### 3.4 搜索增强（语义搜索）

```typescript
// src/main/ai/search-enhancer.ts

export async function semanticSearch(query: string): Promise<SearchResults> {
  // 1. 先执行现有 FTS5 搜索
  const ftsResults = await ftsSearch(query)

  try {
    // 2. 获取所有条目的 Embedding（首次运行：生成并缓存）
    const queryEmbedding = await executeEmbed(query)
    const allEmbeddings = await getOrCacheEmbeddings()

    // 3. 余弦相似度重排序
    const scored = allEmbeddings
      .map(item => ({
        ...item,
        score: cosineSimilarity(queryEmbedding[0], item.embedding),
      }))
      .sort((a, b) => b.score - a.score)

    // 4. 混合排序：FTS5 结果与语义结果加权融合
    return mergeResults(ftsResults, scored)
  } catch {
    // AI 不可用则回退到 FTS5
    return ftsResults
  }
}
```

### 3.5 智能提醒最佳联系时机

```typescript
// src/main/ai/contact-timing.ts

export async function suggestBestContactTime(personId: string): Promise<string | null> {
  const db = getDb()
  const logs = db.prepare(
    'SELECT interact_at, interact_type, summary FROM interaction_logs WHERE person_id = ? ORDER BY interact_at DESC LIMIT 20'
  ).all(personId)
  const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(personId) as Person

  const result = await executeStructuredOutput({
    messages: [
      { role: 'system', content: '你是一个人际关系维护助手，根据交互历史分析最佳联系时机。' },
      { role: 'user', content: JSON.stringify({ person, recentInteractions: logs }) },
    ],
    schema: {
      type: 'object',
      properties: {
        suggestion: { type: 'string', description: '建议的联系时间和原因' },
        shouldContact: { type: 'boolean' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['suggestion', 'shouldContact', 'priority'],
    },
  })
  return result.data.suggestion
}
```

---

## 4. IPC 接口设计

### 4.1 ElectronAPI 新增类型

```typescript
// src/shared/types.ts 新增

export interface ApiKeyInfo {
  id: string
  provider: string
  name: string
  baseUrl?: string
  keyPrefix: string         // 仅存前 8 位
  model?: string
  isEnabled: boolean
  priority: number
  createdAt: string
}

export interface CreateApiKeyDto {
  provider: string
  name: string
  apiKey: string            // 明文 key，主进程加密后存储
  baseUrl?: string
  model?: string
  priority?: number
}

export interface UpdateApiKeyDto {
  name?: string
  apiKey?: string
  baseUrl?: string
  model?: string
  isEnabled?: boolean
  priority?: number
}

export interface ProviderOption {
  id: string
  label: string
  defaultBaseUrl: string
  defaultModel: string
  isLocal: boolean          // true=Ollama，不需要 apiKey
}

// 在 ElectronAPI 中新增
export interface ElectronAPI {
  // ... 现有接口 ...
  apiKeys: {
    list(): Promise<Result<ApiKeyInfo[]>>
    create(dto: CreateApiKeyDto): Promise<Result<ApiKeyInfo>>
    update(id: string, dto: UpdateApiKeyDto): Promise<Result<ApiKeyInfo>>
    delete(id: string): Promise<Result<void>>
    test(id: string): Promise<Result<{ success: boolean; latencyMs: number; model: string }>>
    listProviders(): Promise<Result<ProviderOption[]>>
  }
  ai: {
    // ... 现有 ai 接口（本地功能）...
    // 新增 AI 驱动功能
    analyzeDiary(content: string): Promise<Result<DiaryAnalysis>>
    suggestRelations(personId: string): Promise<Result<RelationSuggestion>>
    enhanceOcr(imagePath: string): Promise<Result<OcrResult>>
    semanticSearch(query: string): Promise<Result<SearchResults>>
    suggestContactTime(personId: string): Promise<Result<string>>
    checkHealth(): Promise<Result<{ configured: boolean; activeProvider: string | null }>>
  }
}
```

### 4.2 IPC Handler 实现

```typescript
// electron/ipc/api-key.ipc.ts

import { ipcMain } from 'electron'
import { getDb } from '../../src/main/db/connection'
import { encryptApiKey, decryptApiKey } from '../../src/main/crypto/keychain'
import type { ApiKeyInfo, CreateApiKeyDto, UpdateApiKeyDto } from '../../src/shared/types'
import { getProvider } from '../../src/main/ai/provider/registry'
import type { ProviderConfig } from '../../src/main/ai/provider/types'

function rowToInfo(row: any): ApiKeyInfo {
  const key = decryptApiKey(row.encrypted_key)
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    baseUrl: row.base_url || undefined,
    keyPrefix: key.length > 8 ? key.slice(0, 8) + '...' : '***',
    model: row.model || undefined,
    isEnabled: !!row.is_enabled,
    priority: row.priority,
    createdAt: row.created_at,
  }
}

export function registerApiKeyIPC(): void {
  ipcMain.handle('apiKeys:list', async (): Promise<Result<ApiKeyInfo[]>> => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM api_keys ORDER BY priority DESC').all()
      return { success: true, data: rows.map(rowToInfo) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('apiKeys:create', async (_e, dto: CreateApiKeyDto): Promise<Result<ApiKeyInfo>> => {
    try {
      const db = getDb()
      const id = crypto.randomUUID()
      const encrypted = encryptApiKey(dto.apiKey)
      db.prepare(`
        INSERT INTO api_keys (id, provider, name, base_url, encrypted_key, key_prefix, model, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, dto.provider, dto.name, dto.baseUrl || null, encrypted,
        dto.apiKey.slice(0, 8), dto.model || null, dto.priority ?? 0)
      const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id)
      return { success: true, data: rowToInfo(row) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('apiKeys:update', async (_e, id: string, dto: UpdateApiKeyDto): Promise<Result<ApiKeyInfo>> => {
    try {
      const db = getDb()
      const sets: string[] = []
      const params: any[] = []
      if (dto.name !== undefined) { sets.push('name = ?'); params.push(dto.name) }
      if (dto.apiKey !== undefined) {
        sets.push('encrypted_key = ?'); params.push(encryptApiKey(dto.apiKey))
        sets.push('key_prefix = ?'); params.push(dto.apiKey.slice(0, 8))
      }
      if (dto.baseUrl !== undefined) { sets.push('base_url = ?'); params.push(dto.baseUrl) }
      if (dto.model !== undefined) { sets.push('model = ?'); params.push(dto.model) }
      if (dto.isEnabled !== undefined) { sets.push('is_enabled = ?'); params.push(dto.isEnabled ? 1 : 0) }
      if (dto.priority !== undefined) { sets.push('priority = ?'); params.push(dto.priority) }
      sets.push("updated_at = datetime('now','localtime')")
      params.push(id)
      db.prepare(`UPDATE api_keys SET ${sets.join(', ')} WHERE id = ?`).run(...params)
      const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id)
      return { success: true, data: rowToInfo(row) }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('apiKeys:delete', async (_e, id: string): Promise<Result<void>> => {
    try {
      getDb().prepare('DELETE FROM api_keys WHERE id = ?').run(id)
      return { success: true, data: undefined }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('apiKeys:test', async (_e, id: string): Promise<Result<any>> => {
    try {
      const db = getDb()
      const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as any
      if (!row) return { success: false, error: 'Key not found' }
      const config: ProviderConfig = {
        id: row.id, provider: row.provider, name: row.name,
        baseUrl: row.base_url || getDefaultBaseUrl(row.provider),
        apiKey: decryptApiKey(row.encrypted_key),
        model: row.model || getDefaultModel(row.provider),
        settings: { maxRetries: 1, retryDelay: 0, timeoutMs: 10000, rateLimitRpm: 0, maxTokens: 100, temperature: 0.5 },
      }
      const provider = getProvider(row.provider, config)
      const start = Date.now()
      const res = await provider.chat(
        { model: config.model, messages: [{ role: 'user', content: 'Hi' }] },
        config,
      )
      return { success: true, data: { success: true, latencyMs: Date.now() - start, model: res.model } }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('apiKeys:listProviders', async (): Promise<Result<ProviderOption[]>> => {
    return {
      success: true,
      data: [
        { id: 'openai',   label: 'OpenAI',   defaultBaseUrl: 'https://api.openai.com/v1',              defaultModel: 'gpt-4o-mini',   isLocal: false },
        { id: 'deepseek', label: 'DeepSeek',  defaultBaseUrl: 'https://api.deepseek.com/v1',            defaultModel: 'deepseek-chat', isLocal: false },
        { id: 'moonshot', label: 'Moonshot',  defaultBaseUrl: 'https://api.moonshot.cn/v1',             defaultModel: 'moonshot-v1-8k',isLocal: false },
        { id: 'qwen',     label: '通义千问',   defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', isLocal: false },
        { id: 'claude',   label: 'Claude',    defaultBaseUrl: 'https://api.anthropic.com/v1',           defaultModel: 'claude-3-haiku',isLocal: false },
        { id: 'gemini',   label: 'Gemini',    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.0-flash', isLocal: false },
        { id: 'ollama',   label: 'Ollama (本地)', defaultBaseUrl: 'http://127.0.0.1:11434',             defaultModel: 'llama3',        isLocal: true  },
      ],
    }
  })
}
```

### 4.3 preload.ts 新增

```typescript
// 在 api 对象中新增:
apiKeys: {
  list: () => ipcRenderer.invoke('apiKeys:list'),
  create: (data) => ipcRenderer.invoke('apiKeys:create', data),
  update: (id, data) => ipcRenderer.invoke('apiKeys:update', id, data),
  delete: (id) => ipcRenderer.invoke('apiKeys:delete', id),
  test: (id) => ipcRenderer.invoke('apiKeys:test', id),
  listProviders: () => ipcRenderer.invoke('apiKeys:listProviders'),
},
```

### 4.4 IPC 索引注册

```typescript
// electron/ipc/index.ts
import { registerApiKeyIPC } from './api-key.ipc'

export function registerAllIPC(): void {
  // ... 现有模块 ...
  registerApiKeyIPC()  // 新加
}
```

---

## 5. 安全考量

### 5.1 安全架构原则

| 安全要求 | 实现方式 |
|---|---|
| **密钥加密存储** | AES-256-GCM + Electron safeStorage 包装 AES key |
| **渲染进程无法读取密钥** | API 调用全部在主进程执行，preload 仅暴露 invoke 接口 |
| **API 调用在主进程中执行** | 所有 fetch 请求在 `src/main/ai/provider/` 中发起 |
| **本地模型零泄露** | Ollama provider 不发送任何数据到外网，用户可只配 Ollama |
| **内存安全** | 解密后的密钥仅在单个请求生命周期中存在，函数结束后 GC |
| **日志安全** | ai_usage_log 仅记录 token 用量，不记输入输出原文 |
| **回退安全** | 所有 AI 功能都有降级路径（本地模型 / 无 AI 模式） |

### 5.2 密钥生命周期

```
用户输入明文 Key
      ↓
preload.ts → IPC → main process
      ↓
encryptApiKey() (AES-256-GCM + safeStorage)
      ↓
存入 better-sqlite3 (api_keys.encrypted_key)
      ↓
需要使用时:
  decryptApiKey() → ProviderConfig.apiKey (局部变量)
      ↓
发起 HTTP 请求 → 请求完成后函数返回，apiKey 变量 GC
```

### 5.3 渲染进程防护

```
    ┌─────────────────────────────────────┐
    │        Renderer Process             │
    │  - React 组件                       │
    │  - 仅能调用 window.electronAPI.*    │
    │  - 永远接触不到 apiKey 明文         │
    └──────────────┬──────────────────────┘
                   │ IPC invoke
                   ▼
    ┌─────────────────────────────────────┐
    │        Main Process                 │
    │  - ipcMain.handle('apiKeys:*')      │
    │  - encryptApiKey / decryptApiKey    │
    │  - AIProvider.chat() → fetch        │
    │  - 密钥仅在此进程内存中存在         │
    └─────────────────────────────────────┘
```

### 5.4 Provider 测试与验证

每次用户新增/修改 Key 时，通过 `apiKeys:test` IPC 发送一条最小请求验证：

```
Test 请求:
  → { role: 'user', content: 'Hi' }
  ← 预期收到正常响应
  ✓ 验证 API 端点可达
  ✓ 验证认证有效
  ✓ 测量延迟并展示
```

---

## 6. 文件结构

```
electron/
├── ipc/
│   ├── api-key.ipc.ts          ← 新增: API Key CRUD + test IPC
│   └── index.ts                ← 修改: 注册 apiKeyIPC
├── preload.ts                  ← 修改: 暴露 apiKeys.* 接口
└── main.ts                     ← 不变

src/
├── shared/
│   └── types.ts                ← 新增: ApiKeyInfo, CreateApiKeyDto 等类型

├── main/
│   ├── crypto/
│   │   └── keychain.ts         ← 新增: AES-256-GCM + safeStorage 加密
│   │
│   ├── ai/
│   │   ├── provider/
│   │   │   ├── types.ts                ← 新增: 统一接口定义
│   │   │   ├── registry.ts             ← 新增: provider 工厂注册
│   │   │   ├── openai-compatible.ts    ← 新增: OpenAI 兼容格式适配
│   │   │   ├── claude.ts               ← 新增: Claude 适配
│   │   │   ├── gemini.ts               ← 新增: Gemini 适配
│   │   │   ├── ollama.ts               ← 新增: Ollama 适配
│   │   │   ├── queue.ts                ← 新增: 限流与请求队列
│   │   │   └── executor.ts             ← 新增: 统一调用入口 + 重试降级
│   │   │
│   │   ├── diary-analyzer.ts           ← 新增: 日记智能分析
│   │   ├── relation-analyzer.ts        ← 新增: 关系分析
│   │   ├── search-enhancer.ts          ← 新增: 语义搜索
│   │   ├── contact-timing.ts           ← 新增: 联系时机建议
│   │   ├── ocr.ts                      ← 修改: 云端 OCR 增强
│   │   ├── intimacy.ts                 ← 不变
│   │   ├── face.ts                     ← 不变
│   │   └── lost_contact.ts             ← 不变
│   │
│   └── db/
│       ├── connection.ts               ← 不变
│       └── migrations.ts               ← 修改: version 4 追加表

└── pages/
│   └── SettingsPage.tsx                ← 修改: 新增 "AI 服务" Tab
│
└── components/
    └── ai/
        ├── AIImportWizard.tsx          ← 不变
        ├── ApiKeyManager.tsx           ← 新增: API Key 管理 UI
        └── AiSettingsPanel.tsx         ← 新增: AI 功能开关面板
```

---

## 附录: SettingsPage 的 AI Tab 示例

```tsx
// src/pages/SettingsPage.tsx 新增 tab

const tabs: { key: SettingsTab; label: string }[] = [
  { key: 'groups', label: '群组管理' },
  { key: 'tags', label: '标签管理' },
  { key: 'ai', label: 'AI 服务' },     // 新增
  { key: 'backup', label: '数据备份' },
]

// Tab 内容:
{activeTab === 'ai' && <ApiKeyManager />}
```

```tsx
// src/components/ai/ApiKeyManager.tsx (概念)

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    window.electronAPI.apiKeys.list().then(r => r.success && setKeys(r.data))
    window.electronAPI.apiKeys.listProviders().then(r => r.success && setProviders(r.data))
  }, [])

  return (
    <div>
      <h2>AI 服务配置</h2>
      <p>配置第三方 AI 服务的 API 密钥，扩展智能分析能力。
         你也可以仅配置 Ollama 本地模型，数据完全不离开本机。</p>

      {keys.map(k => (
        <div key={k.id}>
          <span>{providers.find(p => p.id === k.provider)?.label || k.provider}</span>
          <span>{k.name}</span>
          <span>{k.keyPrefix}</span>
          <span>{k.isEnabled ? '已启用' : '已禁用'}</span>
          <button onClick={() => testKey(k.id)}>测试连接</button>
          <button onClick={() => deleteKey(k.id)}>删除</button>
        </div>
      ))}

      <button onClick={() => setShowAdd(true)}>添加 API Key</button>

      {showAdd && (
        <AddKeyDialog
          providers={providers.filter(p => !p.isLocal)}
          onSave={async (dto) => {
            const r = await window.electronAPI.apiKeys.create(dto)
            if (r.success) { setKeys(prev => [...prev, r.data]); setShowAdd(false) }
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Ollama 独立配置区 */}
      <OllamaConfigSection />
    </div>
  )
}
```

---

## 总结

本方案设计了一个四层架构：

```
┌─────────────────────────────────────────┐
│              UI 组件层                   │
│  ApiKeyManager / SettingsPage            │
├─────────────────────────────────────────┤
│              IPC 桥接层                  │
│  preload.ts → ipcRenderer.invoke        │
├─────────────────────────────────────────┤
│           Provider 抽象层               │
│  Registry → Factory → Provider impl     │
│  Executor (重试+降级+限流)              │
├─────────────────────────────────────────┤
│           安全存储层                     │
│  AES-256-GCM + safeStorage             │
│  SQLite (api_keys / provider_settings)  │
└─────────────────────────────────────────┘
```

关键设计决策：
- **主进程执行所有 API 调用**，密钥明文永不进入渲染进程
- **自动降级**：多个 key 按优先级串联，失败自动切换到下一个
- **本地优先 + 云端增强**：OCR 等场景先用本地模型，低置信度再调云端
- **Ollama 零数据泄露**：用户可仅配置 Ollama，所有请求发往 `127.0.0.1`
- **可扩展**：新增 provider 只需实现 `AIProvider` 接口 + 注册到 registry
- **最小依赖**：仅使用 Node.js 内置 `crypto` 和 Electron `safeStorage`，无需额外加密库
