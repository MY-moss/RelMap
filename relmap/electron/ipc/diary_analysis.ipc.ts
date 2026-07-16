import { ipcMain } from 'electron'
import type { Result, DiaryAnalysis } from '../../src/shared/types'
import {
  extractKeywords,
  analyzeEmotion,
} from '../../src/main/ai/text_analysis'

export function registerDiaryAnalysisIPC(): void {
  ipcMain.handle('diary:analyze', async (_event, content: string): Promise<Result<DiaryAnalysis>> => {
    try {
      if (typeof content !== 'string' || content.length === 0) {
        return { success: false, error: '日记内容不能为空' }
      }
      if (content.length > 100000) {
        return { success: false, error: '日记内容过长（超过100000字符）' }
      }
      const keywordResult = extractKeywords(content, 5)
      const emotionResult = analyzeEmotion(content)
      if (!keywordResult.success) return keywordResult
      if (!emotionResult.success) return emotionResult
      return {
        success: true,
        data: {
          keywords: keywordResult.data.keywords,
          emotion: emotionResult.data,
        },
      }
    } catch (e) {
      logIpcError('diary:analyze', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
