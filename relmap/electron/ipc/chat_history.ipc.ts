import { ipcMain, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import type { Result } from '../../src/shared/types'

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
}
