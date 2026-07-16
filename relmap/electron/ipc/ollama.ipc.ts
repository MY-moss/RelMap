import { ipcMain } from 'electron'
import http from 'node:http'

export function registerOllamaIPC(): void {
  ipcMain.handle('ollama:detect', async () => {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:11434/api/tags', { timeout: 2000 }, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try {
            const data = JSON.parse(body)
            const models = (data.models || []).map((m: { name?: string }) => m.name)
            resolve({ success: true, data: { available: true, models } })
          } catch {
            resolve({ success: true, data: { available: true, models: [] } })
          }
        })
      })
      req.on('error', () => {
        resolve({ success: true, data: { available: false, models: [] } })
      })
      req.on('timeout', () => {
        req.destroy()
        resolve({ success: true, data: { available: false, models: [] } })
      })
    })
  })

  ipcMain.handle('ollama:listModels', async () => {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:11434/api/tags', { timeout: 2000 }, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try {
            const data = JSON.parse(body)
            const models = (data.models || []).map((m: { name?: string }) => m.name)
            resolve({ success: true, data: models })
          } catch {
            resolve({ success: true, data: [] })
          }
        })
      })
      req.on('error', () => {
        resolve({ success: true, data: [] })
      })
      req.on('timeout', function (this: import('http').ClientRequest) {
        this.destroy()
        resolve({ success: true, data: [] })
      })
    })
  })
}
