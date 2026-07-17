import { ipcMain, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import type { Result, ChatSearchResult, ExtractedContactInfo } from '../../src/shared/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  systemPrompt?: string
  createdAt: string
  updatedAt: string
}

interface ChatHistory {
  sessions: ChatSession[]
}

const HISTORY_FILE = 'chat-history.json'

function getHistoryPath(): string {
  return path.join(app.getPath('userData'), HISTORY_FILE)
}

function loadHistory(): ChatHistory {
  const p = getHistoryPath()
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { sessions: [] }
}

function saveHistory(history: ChatHistory): void {
  fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), 'utf-8')
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function registerChatHistoryIPC(): void {
  ipcMain.handle('chat:history:list', async (): Promise<Result<Omit<ChatSession, 'messages'>[]>> => {
    try {
      const history = loadHistory()
      const summaries = history.sessions.map(({ messages, ...rest }) => ({
        ...rest,
        messageCount: messages.length,
        lastMessage: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 80) : '',
      }))
      return { success: true, data: summaries as unknown as Omit<ChatSession, 'messages'>[] }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:get', async (_event, id: string): Promise<Result<ChatSession | null>> => {
    try {
      const history = loadHistory()
      const session = history.sessions.find(s => s.id === id)
      return { success: true, data: session || null }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:save', async (_event, session: ChatSession): Promise<Result<void>> => {
    try {
      const history = loadHistory()
      const idx = history.sessions.findIndex(s => s.id === session.id)
      if (idx >= 0) {
        history.sessions[idx] = { ...session, updatedAt: new Date().toISOString() }
      } else {
        history.sessions.unshift({
          ...session,
          id: session.id || generateId(),
          createdAt: session.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      saveHistory(history)
      return { success: true, data: undefined }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:delete', async (_event, id: string): Promise<Result<void>> => {
    try {
      const history = loadHistory()
      history.sessions = history.sessions.filter(s => s.id !== id)
      saveHistory(history)
      return { success: true, data: undefined }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:clear', async (): Promise<Result<void>> => {
    try {
      saveHistory({ sessions: [] })
      return { success: true, data: undefined }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:search', async (_event, query: string): Promise<Result<ChatSearchResult[]>> => {
    try {
      if (!query || query.length < 1) return { success: true, data: [] }
      const history = loadHistory()
      const lowerQuery = query.toLowerCase()
      const results: ChatSearchResult[] = []
      for (const session of history.sessions) {
        const matches: { role: string; content: string; index: number }[] = []
        session.messages.forEach((msg, idx) => {
          if (msg.content.toLowerCase().includes(lowerQuery)) {
            matches.push({ role: msg.role, content: msg.content.slice(0, 200), index: idx })
          }
        })
        if (matches.length > 0) {
          results.push({
            sessionId: session.id,
            sessionTitle: session.title,
            matchCount: matches.length,
            matches,
            updatedAt: session.updatedAt,
          })
        }
      }
      return { success: true, data: results }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:history:extractInfo', async (_event, sessionId: string): Promise<Result<ExtractedContactInfo>> => {
    try {
      const history = loadHistory()
      const session = history.sessions.find(s => s.id === sessionId)
      if (!session) return { success: true, data: {} }

      const allText = session.messages.map(m => `${m.role}: ${m.content}`).join('\n')

      const info: ExtractedContactInfo = {
        sourceSessionId: session.id,
        sourceSessionTitle: session.title,
      }

      // Extract name — patterns like "名字叫XXX" or "姓名：XXX"
      const nameMatch = allText.match(/(?:名字|姓名|叫|称为?)[：:]\s*([\u4e00-\u9fff]{2,6})/)
        || allText.match(/(?:我叫|他叫|她叫|名字叫|姓名是|名为)\s*([\u4e00-\u9fff]{2,6})/)
      if (nameMatch) info.name = nameMatch[1]

      // Extract company — patterns like "在XXX工作" or "公司：XXX"
      const companyMatch = allText.match(/(?:公司|单位|任职于|工作在?)[：:]\s*([\u4e00-\u9fff\u00a0-\u9fff\w]{2,30})/)
        || allText.match(/(?:在)\s*([\u4e00-\u9fff\u00a0-\u9fff\w]{2,30})\s*(?:工作|上班|任职|就职)/)
      if (companyMatch) info.company = companyMatch[1]

      // Extract title
      const titleMatch = allText.match(/(?:职位|职务|岗位|头衔|担任)[：:]\s*([\u4e00-\u9fff\w]{2,20})/)
        || allText.match(/(?:是一名|是一位|担任)\s*([\u4e00-\u9fff\w]{2,20})/)
      if (titleMatch) info.title = titleMatch[1]

      // Extract email
      const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) info.email = emailMatch[0]

      // Extract phone
      const phoneMatch = allText.match(/1[3-9]\d{9}/)
      if (phoneMatch) info.phone = phoneMatch[0]

      return { success: true, data: info }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })
}
