import { ipcMain } from 'electron'
import type { Result } from '../../src/shared/types'
import { scanCard } from '../../src/main/ai/ocr'
import { detectFaces } from '../../src/main/ai/face'
import { detectLostContacts } from '../../src/main/ai/lost_contact'
import type { OcrResult, FaceDetection, LostContactItem } from '../../src/shared/types'
import { logIpcError } from '../logger'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Validate that an image path is safe to read (no path traversal, file exists, allowed extension).
 */
function validateImagePath(imagePath: string): string | null {
  if (typeof imagePath !== 'string' || !imagePath) {
    return '图片路径不能为空'
  }
  // Resolve to prevent path traversal
  const resolved = path.resolve(imagePath)
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const ext = path.extname(resolved).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    return '不支持的图片格式'
  }
  if (!fs.existsSync(resolved)) {
    return '图片文件不存在'
  }
  // Limit file size (50MB)
  const stat = fs.statSync(resolved)
  if (stat.size > 50 * 1024 * 1024) {
    return '图片文件过大（超过50MB）'
  }
  return null
}

export function registerAIIPC(): void {
  // OCR 名片扫描
  ipcMain.handle('ai:ocrScan', async (_event, imagePath: string): Promise<Result<OcrResult>> => {
    try {
      const validationError = validateImagePath(imagePath)
      if (validationError) {
        return { success: false, error: validationError }
      }
      return await scanCard(imagePath)
    } catch (e) {
      logIpcError('ai:ocrScan', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 人脸检测
  ipcMain.handle('ai:detectFaces', async (_event, imagePath: string): Promise<Result<FaceDetection[]>> => {
    try {
      const validationError = validateImagePath(imagePath)
      if (validationError) {
        return { success: false, error: validationError }
      }
      return await detectFaces(imagePath)
    } catch (e) {
      logIpcError('ai:detectFaces', e)
      return { success: false, error: (e as Error).message }
    }
  })

  // 断联检测
  ipcMain.handle(
    'ai:detectLostContacts',
    async (_event, months: number): Promise<Result<LostContactItem[]>> => {
      try {
        const validatedMonths = typeof months === 'number' && months > 0 && months <= 120 ? months : 6
        return detectLostContacts(validatedMonths)
      } catch (e) {
      logIpcError('ai:detectLostContacts', e)
      return { success: false, error: (e as Error).message }
    }
  },
  )
}
