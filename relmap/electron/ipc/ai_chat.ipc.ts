import { ipcMain, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import type { Result } from '../../src/shared/types'
import type { AppConfig } from './app-config.ipc'
import { decrypt } from './app-config.ipc'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  provider?: string
  stream?: boolean
}

function readProviderConfig(): { providerKey: string; apiKey: string; baseUrl: string; model: string } | { error: string } {
  const configPath = path.join(app.getPath('userData'), 'app-config.json')
  let config: AppConfig = {}
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch { /* ignore */ }

  const providerKey = Object.keys(config.aiProviders || {}).find(k => config.aiProviders?.[k]?.enabled) || 'openai'
  const provider = config.aiProviders?.[providerKey]

  if (!provider?.apiKey) {
    return { error: `AI 提供商 "${providerKey}" 未配置 API Key，请先在设置中添加` }
  }

  // Decrypt the stored encrypted key
  let apiKey = provider.apiKey
  try {
    apiKey = decrypt(apiKey)
  } catch { /* already plaintext */ }

  return { providerKey, apiKey, baseUrl: provider.baseUrl || '', model: provider.model || 'gpt-4o' }
}

export function registerAIChatIPC(): void {
  ipcMain.handle('ai:chat', async (_event, req: ChatRequest): Promise<Result<string>> => {
    try {
      if (!req.messages || req.messages.length === 0) {
        return { success: false, error: '消息不能为空' }
      }

      const configResult = readProviderConfig()
      if ('error' in configResult) return { success: false, error: configResult.error }

      const { apiKey, baseUrl, model } = configResult

      // Use URL resolution to properly join paths (handles trailing slashes, missing paths)
      const apiUrl = new URL('chat/completions', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/').toString()

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: req.messages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: req.stream ?? false,
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        return { success: false, error: `API 请求失败 (${response.status}): ${errText.slice(0, 200)}` }
      }

      if (!req.stream) {
        const data = await response.json() as { choices?: { message?: { content?: string } }[] }
        return { success: true, data: data.choices?.[0]?.message?.content || '' }
      }

      // --- Streaming ---
      const reader = response.body?.getReader()
      if (!reader) {
        return { success: false, error: '响应流不可读' }
      }

      const decoder = new TextDecoder()
      let fullText = ''

      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) { reading = false; break }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue

          try {
            const parsed = JSON.parse(payload)
            const content = parsed?.choices?.[0]?.delta?.content || ''
            if (content) {
              fullText += content
              _event.sender.send('ai:chat:chunk', { text: content, done: false })
            }
          } catch { /* skip malformed lines */ }
        }
      }

      _event.sender.send('ai:chat:chunk', { text: '', done: true })
      return { success: true, data: fullText }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })
}
