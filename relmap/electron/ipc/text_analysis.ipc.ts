import { ipcMain } from 'electron'
import type { Result } from '../../src/shared/types'
import {
  extractKeywords,
  analyzeEmotion,
} from '../../src/main/ai/text_analysis'
import type { KeywordResult, EmotionResult } from '../../src/main/ai/text_analysis'

/**
 * 注册文本分析相关 IPC
 * - ai:extractKeywords 提取关键词
 * - ai:analyzeEmotion 情感分析
 */
export function registerTextAnalysisIPC(): void {
  // 提取关键词
  ipcMain.handle(
    'ai:extractKeywords',
    async (
      _event,
      text: string,
      topN?: number,
    ): Promise<Result<KeywordResult>> => {
      try {
        return extractKeywords(text, topN)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    },
  )

  // 情感分析
  ipcMain.handle(
    'ai:analyzeEmotion',
    async (_event, text: string): Promise<Result<EmotionResult>> => {
      try {
        return analyzeEmotion(text)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    },
  )
}
