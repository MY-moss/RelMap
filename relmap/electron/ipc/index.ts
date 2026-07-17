// IPC 处理器注册中心
// 各模块的IPC handler在此统一注册

import { registerPersonIPC } from './person.ipc'
import { registerSocialIPC } from './social.ipc'
import { registerRelationIPC } from './relation.ipc'
import { registerEventIPC } from './event.ipc'
import { registerDiaryIPC } from './diary.ipc'
import { registerPhotoIPC } from './photo.ipc'
import { registerSearchIPC } from './search.ipc'
import { registerGroupIPC } from './groups.ipc'
import { registerTagIPC } from './tags.ipc'
import { registerAIIPC } from './ai.ipc'
import { registerReminderIPC } from './reminders.ipc'
import { registerFollowUpIPC } from './follow_up.ipc'
import { registerInteractionLogIPC } from './interaction_logs.ipc'
import { registerIntimacyIPC } from './intimacy.ipc'
import { registerBackupIPC } from './backup.ipc'
import { registerImportExportIPC } from './import_export.ipc'
import { registerTextAnalysisIPC } from './text_analysis.ipc'
import { registerDuplicateDetectIPC } from './duplicate_detect.ipc'
import { registerSmartGroupingIPC } from './smart_grouping.ipc'
import { registerAppConfigIPC } from './app-config.ipc'
import { registerTemplateIPC } from './templates.ipc'
import { registerOllamaIPC } from './ollama.ipc'
import { registerAnalyticsIPC } from './analytics.ipc'
import { registerDiaryAnalysisIPC } from './diary_analysis.ipc'
import { registerSuggestionIPC } from './suggestion.ipc'
import { registerPersonalityIPC } from './personality.ipc'
import { registerIntimacyPredictionIPC } from './intimacy_prediction.ipc'
import { registerBridgeIPC } from './bridge.ipc'
import { registerPathfinderIPC } from './pathfinder.ipc'
import { registerWrappedIPC } from './wrapped.ipc'
import { registerMemoryCapsuleIPC } from './memory_capsule.ipc'
import { registerGraphEnhancedIPC } from './graph_enhanced.ipc'
import { registerGraphExportIPC } from './graph_export.ipc'
import { registerDbCheckIPC } from './db-check.ipc'
import { registerDbEncryptionIPC } from './db-encryption.ipc'
import { registerPluginIPC } from './plugin.ipc'
import { registerHealthCheckIPC } from './health-check.ipc'
import { registerClipboardIPC } from './clipboard.ipc'
import { registerUpdateIPC } from './update.ipc'
import { registerAIChatIPC } from './ai_chat.ipc'
import { registerChatHistoryIPC } from './chat_history.ipc'
import { registerOAuthIPC } from './oauth.ipc'
import { registerExternalIdsIPC } from './external_ids.ipc'
import { logger } from '../logger'
export { setUpdateMainWindow } from './update.ipc'

export function registerAllIPC(): void {
  // ========== Phase 1 已实现模块 ==========
  registerPersonIPC()
  registerSocialIPC()
  registerRelationIPC()
  registerEventIPC()
  registerDiaryIPC()
  registerPhotoIPC()

  // ========== Phase 2 搜索/群组/标签 ==========
  registerSearchIPC()
  registerGroupIPC()
  registerTagIPC()

  // ========== Phase 3 AI/提醒/交互日志 ==========
  registerAIIPC()
  registerReminderIPC()
  registerFollowUpIPC()
  registerInteractionLogIPC()
  registerIntimacyIPC()

  // ========== Phase 4 备份/导入导出 ==========
  registerBackupIPC()
  registerImportExportIPC()

  // ========== Phase 5 AI文本分析/重复检测 ==========
  registerTextAnalysisIPC()
  registerDuplicateDetectIPC()

  // ========== Phase 6 智能分组 ==========
  registerSmartGroupingIPC()

  // ========== Phase 11 应用配置/PIN锁/BYOK ==========
  registerAppConfigIPC()

  // ========== Phase 12 消息模板 ==========
  registerTemplateIPC()

  // ========== Phase 12 Ollama 自动检测 ==========
  registerOllamaIPC()

  // ========== Phase 13 分析仪表盘 ==========
  registerAnalyticsIPC()

  // ========== Phase 13 日记AI分析 ==========
  registerDiaryAnalysisIPC()

  // ========== Phase 13 沟通建议引擎 ==========
  registerSuggestionIPC()

  // ========== Phase 13 性格分析画像 ==========
  registerPersonalityIPC()

  // ========== Phase 13 亲密度预测 ==========
  registerIntimacyPredictionIPC()

  // ========== Phase 13 桥接人识别 ==========
  registerBridgeIPC()

  // ========== Phase 13 关系路径查找 ==========
  registerPathfinderIPC()

  // ========== Phase 13 RelMap Wrapped & 记忆胶囊 ==========
  registerWrappedIPC()
  registerMemoryCapsuleIPC()

  // ========== Phase 14 图谱增强 & 图谱导出 ==========
  registerGraphEnhancedIPC()
  registerGraphExportIPC()

  // ========== Phase 14 数据安全 & 健康检查 ==========
  registerDbCheckIPC()
  registerDbEncryptionIPC()
  registerHealthCheckIPC()

  // ========== Phase 15 插件系统 ==========
  registerPluginIPC()

  // ========== AI Chat ==========
  registerAIChatIPC()
  registerChatHistoryIPC()

  // ========== Clipboard ==========
  registerClipboardIPC()

  // ========== OAuth / 第三方集成 ==========
  registerOAuthIPC()
  registerExternalIdsIPC()

  // ========== Auto Update ==========
  registerUpdateIPC()

  logger.info('All IPC handlers registered')
}
