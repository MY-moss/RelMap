import { ipcMain, dialog, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../logger'

function escapeCsvValue(value: string): string {
  let s = String(value).replace(/"/g, '""')
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s
  }
  return `"${s}"`
}

export function registerGraphExportIPC(): void {
  ipcMain.handle('graph:exportPng', async (_event, dataUrl: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出图谱为PNG',
        defaultPath: path.join(app.getPath('pictures'), `relmap-graph-${Date.now()}.png`),
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      })
      if (canceled || !filePath) return { success: true, data: null }
      if (typeof dataUrl !== 'string' || dataUrl.length > 50 * 1024 * 1024) {
        return { success: false, error: '数据URL过大或格式无效' }
      }
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      return { success: true, data: filePath }
    } catch (e) {
      logger.error({ err: e, ipc: 'graph:exportPng' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('graph:exportJson', async (_event, graphData: unknown) => {
    if (!graphData || typeof graphData !== 'object') {
      return { success: false, error: '图谱数据格式无效' }
    }
    const jsonStr = JSON.stringify(graphData)
    if (jsonStr.length > 100 * 1024 * 1024) {
      return { success: false, error: '图谱数据过大' }
    }
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出图谱数据为JSON',
        defaultPath: path.join(app.getPath('documents'), `relmap-graph-${Date.now()}.json`),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (canceled || !filePath) return { success: true, data: null }
      fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2), 'utf-8')
      return { success: true, data: filePath }
    } catch (e) {
      logger.error({ err: e, ipc: 'graph:exportJson' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('graph:exportCsv', async (_event, edges: Array<{ source: string; target: string; intimacy: number; label?: string }>) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '导出图谱关系为CSV',
        defaultPath: path.join(app.getPath('documents'), `relmap-edges-${Date.now()}.csv`),
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      })
      if (canceled || !filePath) return { success: true, data: null }
      const header = 'source,target,intimacy,label\n'
      const rows = edges.map(e => `${escapeCsvValue(e.source)},${escapeCsvValue(e.target)},${escapeCsvValue(String(e.intimacy))},${escapeCsvValue(e.label || '')}`).join('\n')
      fs.writeFileSync(filePath, header + rows, 'utf-8')
      return { success: true, data: filePath }
    } catch (e) {
      logger.error({ err: e, ipc: 'graph:exportCsv' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('graph:shareSnapshot', async (_event, graphData: unknown) => {
    try {
      if (!graphData || typeof graphData !== 'object') {
        return { success: false, error: '快照数据格式无效' }
      }
      const xmlStr = JSON.stringify(graphData)
      if (xmlStr.length > 100 * 1024 * 1024) {
        return { success: false, error: '快照数据过大' }
      }
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: '分享图谱快照',
        defaultPath: path.join(app.getPath('documents'), `relmap-snapshot-${Date.now()}.relgraph`),
        filters: [{ name: 'RelMap Graph Snapshot', extensions: ['relgraph'] }],
      })
      if (canceled || !filePath) return { success: true, data: null }
      fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2), 'utf-8')
      return { success: true, data: filePath }
    } catch (e) {
      logger.error({ err: e, ipc: 'graph:shareSnapshot' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })
}
