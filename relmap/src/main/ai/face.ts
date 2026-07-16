// 人脸检测模块
// 基于 face-api.js + canvas 实现人脸检测与特征提取
// 新增超时保护：模型加载 15s，检测 30s，防止主进程 UI 长时间冻结
// 当 canvas 原生模块不可用时（如缺少 GTK+/cairo 编译环境），
// 返回空结果而非报错，确保应用可正常启动

import type { Result, FaceDetection } from '../../shared/types'
import { logger } from '../../../electron/logger'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * 为 Promise 添加超时保护，超时时自动 reject
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMsg)), ms),
  )
  return Promise.race([promise, timeout])
}

let isFaceApiReady = false

try {
  const faceapi = require('face-api.js')
  const canvasModule = require('canvas')
  const { Canvas, Image, ImageData } = canvasModule
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
  isFaceApiReady = true
} catch {
  logger.info('[Face] face-api.js/canvas 不可用，人脸检测返回空结果（不影响应用正常运行）')
}

let modelsLoaded = false
let modelsLoadPromise: Promise<void> | null = null

function getModelPath(): string {
  return join(process.env.APP_ROOT || process.cwd(), 'public', 'models')
}

async function loadModels(): Promise<void> {
  if (!isFaceApiReady) throw new Error('人脸检测不可用（缺少 face-api.js/canvas 依赖）')
  if (modelsLoaded) return
  if (modelsLoadPromise) return modelsLoadPromise

  modelsLoadPromise = (async () => {
    const faceapi = require('face-api.js')
    const modelPath = getModelPath()
    if (!existsSync(modelPath)) {
      throw new Error('模型文件目录不存在，请下载 face-api.js 模型文件至 public/models/')
    }
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
    modelsLoaded = true
  })()

  try {
    await withTimeout(modelsLoadPromise!, 15000, '人脸模型加载超时（15s）')
  } catch (e) {
    modelsLoadPromise = null
    throw e
  }
}

export async function detectFaces(imagePath: string): Promise<Result<FaceDetection[]>> {
  if (!isFaceApiReady) {
    return { success: true, data: [] }
  }

  if (!existsSync(imagePath)) {
    return { success: false, error: '图像文件不存在' }
  }

  try {
    await loadModels()
    const faceapi = require('face-api.js')
    const { loadImage } = require('canvas') as { loadImage: (path: string) => Promise<unknown> }

    const img = await loadImage(imagePath)
    const detections: Array<{ detection: { box: { x: number; y: number; width: number; height: number }; score: number }; descriptor: Float32Array }> = await withTimeout(
      faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors(),
      30000,
      '人脸检测超时（30s）',
    )

    if (!detections || detections.length === 0) {
      return { success: true, data: [] }
    }

    const result: FaceDetection[] = detections.map((d: { detection: { box: { x: number; y: number; width: number; height: number }; score: number }; descriptor: Float32Array }) => ({
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
      confidence: d.detection.score,
      descriptor: d.descriptor ? Array.from(d.descriptor as Float32Array) : undefined,
    }))

    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: `人脸检测失败: ${(e as Error).message}` }
  }
}

export function isFaceDetectionAvailable(): boolean {
  return isFaceApiReady
}

