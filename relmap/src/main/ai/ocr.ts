// OCR 名片扫描模块
// 基于 Tesseract.js v7，支持中文简体+英文识别

import { createWorker, PSM } from 'tesseract.js'
import { logger } from '../../../electron/logger'
import type { Worker as TesseractWorker } from 'tesseract.js'
import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import type { Result, OcrResult } from '../../shared/types'

// 模块级 worker Promise 缓存（懒加载，第一次调用 scanCard 时才初始化）
// 使用 Promise 缓存而非 Worker 实例缓存，确保并发调用共享同一个创建过程
let workerPromise: Promise<TesseractWorker> | null = null

/**
 * 获取 OCR worker 单例（懒加载）
 * 第一次调用时创建 worker 并加载中文简体+英文语言包
 * 并发调用会等待同一个 Promise，避免创建多个 worker 实例
 */
async function getOcrWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    // v7 简化 API：createWorker 传入语言参数即可自动加载语言包并初始化
    // 无需单独调用 loadLanguage 和 initialize
    workerPromise = (async () => {
      const worker = await createWorker('chi_sim+eng')
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      })
      return worker
    })().catch((err) => {
      // 创建失败时重置 promise，允许后续重试
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

/**
 * 终止并清理 OCR worker
 * 应用退出或不再需要 OCR 功能时调用
 */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  try {
    const worker = await workerPromise
    await worker.terminate()
  } catch (err) {
    logger.error({ err }, '[OCR] 终止 worker 失败')
  } finally {
    workerPromise = null
  }
}

/**
 * 从 OCR 原始文本中解析结构化字段
 * 按行分割文本，逐行匹配姓名、电话、邮箱、公司、职位、地址
 */
function parseOcrFields(text: string): OcrResult {
  const result: OcrResult = { raw_text: text }

  if (!text) return result

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return result

  // 姓名：通常在文本开头，2-6个中文字符或英文名
  const nameRegex = /^\s*([\u4e00-\u9fff]{2,6}|[A-Za-z]+\s*[A-Za-z]+)/
  for (const line of lines.slice(0, 3)) {
    const m = line.match(nameRegex)
    if (m && m[1]) {
      result.name = m[1].trim()
      break
    }
  }

  // 电话：手机号 1[3-9]\d{9} 或座机 0\d{2,3}-?\d{7,8}（带词边界）
  const phoneRegex = /\b(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})\b/
  for (const line of lines) {
    const m = line.match(phoneRegex)
    if (m && m[0]) {
      result.phone = m[0]
      break
    }
  }

  // 邮箱：标准 email 正则
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/
  for (const line of lines) {
    const m = line.match(emailRegex)
    if (m && m[0]) {
      result.email = m[0]
      break
    }
  }

  // 公司：包含"公司"、"集团"、"有限"、"科技"、"Co."、"Ltd"等关键词的行
  const companyRegex = /(公司|集团|有限|科技|Co\.|Ltd)/i
  for (const line of lines) {
    if (companyRegex.test(line)) {
      result.company = line
      break
    }
  }

  // 职位：包含"经理"、"总监"、"主管"、"工程师"、"CEO"、"CTO"等关键词的行
  const titleRegex = /(经理|总监|主管|工程师|CEO|CTO|总裁|总经理|副总|主任|部长|设计师|分析师|顾问|架构师|助理|专员)/i
  for (const line of lines) {
    if (titleRegex.test(line)) {
      result.title = line
      break
    }
  }

  // 地址：包含数字+（路/街/号/室/大厦/区/Road/Street）的行
  const addressRegex = /\d+\s*(路|街|号|室|大厦|区|Road|Street)/i
  for (const line of lines) {
    if (addressRegex.test(line)) {
      result.address = line
      break
    }
  }

  return result
}

/**
 * OCR 名片扫描
 * 识别图片中的文字并解析为结构化名片信息
 * @param imagePath 图片路径（绝对路径或相对路径）
 */
const ALLOWED_IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tiff', '.tif']

export async function scanCard(imagePath: string): Promise<Result<OcrResult>> {
  try {
    // 处理路径：相对路径转为绝对路径
    const absPath = isAbsolute(imagePath) ? imagePath : resolve(imagePath)

    // 检查文件是否存在
    if (!existsSync(absPath)) {
      return { success: false, error: '文件不存在' }
    }

    // 校验文件扩展名
    const ext = absPath.toLowerCase().slice(absPath.lastIndexOf('.'))
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      return { success: false, error: `不支持的文件格式: ${ext}，支持: ${ALLOWED_IMAGE_EXT.join(', ')}` }
    }

    // 初始化 worker（懒加载，第一次调用时创建）
    let worker: TesseractWorker
    try {
      worker = await getOcrWorker()
    } catch (err) {
      // 错误详情（可能含语言数据路径）仅记录到日志
      logger.error({ err }, '[OCR] Tesseract.js 初始化失败')
      return {
        success: false,
        error: 'OCR 引擎初始化失败，请稍后重试',
      }
    }

    // 识别图片中的文字
    let rawText: string
    try {
      const {
        data: { text },
      } = await worker.recognize(absPath)
      rawText = text || ''
    } catch (err) {
      // 错误详情（可能含图片路径）仅记录到日志
      logger.error({ err, path: absPath }, '[OCR] 识别失败')
      return {
        success: false,
        error: 'OCR 识别失败，请检查图片是否有效',
      }
    }

    // 解析结构化字段
    const parsed = parseOcrFields(rawText)
    return { success: true, data: parsed }
  } catch (err) {
    // 错误详情（可能含路径）仅记录到日志
    logger.error({ err }, '[OCR] 扫描出错')
    return {
      success: false,
      error: 'OCR 扫描出错，请稍后重试',
    }
  }
}


