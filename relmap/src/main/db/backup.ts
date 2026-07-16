// RelMap 加密备份模块
// 提供数据库的加密导出/导入功能
// 加密格式：IV(16字节) + AES-256-CBC加密内容，整体 base64 编码存储

import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import type { Result } from '../../shared/types'
import { getDb, closeDb, getDataDir } from './connection'
import { runMigrations } from './migrations'
import { logger } from '../../../electron/logger'

// SQLite 文件头魔数（前16字节："SQLite format 3\0"）
const SQLITE_MAGIC = 'SQLite format 3\x00'

// ==================== 路径辅助函数 ====================

// 获取备份目录路径
function getBackupsDir(): string {
  return path.join(getDataDir(), 'backups')
}

// 确保备份目录存在，返回备份目录路径
export function ensureBackupsDir(): string {
  const dir = getBackupsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// ==================== 时间戳格式化 ====================

// 格式化时间戳为文件名格式：YYYYMMDD_HHmmss
function formatTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

// 生成默认备份文件名
export function getDefaultBackupFilename(encrypted: boolean): string {
  const ts = formatTimestampForFilename(new Date())
  return encrypted
    ? `relmap_backup_${ts}.db.enc`
    : `relmap_backup_${ts}.db`
}

// 生成默认备份文件完整路径
export function getDefaultBackupPath(password?: string): string {
  const encrypted = !!password
  const filename = getDefaultBackupFilename(encrypted)
  return path.join(getBackupsDir(), filename)
}

// ==================== 加密/解密函数 ====================

// 密钥派生常量（N=65536 替代默认的 16384，增强暴力破解抵抗）
const SCRYPT_N = 65536

// 从密码派生 256 位密钥（使用 scrypt，随机 salt 随数据存储）
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, 32, { N: SCRYPT_N, r: 8, p: 1 })
}

// 加密数据：salt(16字节) + IV(16字节) + AES-256-CBC加密内容 → base64 编码
function encryptData(data: Buffer, password: string): string {
  const salt = crypto.randomBytes(16)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([salt, iv, encrypted]).toString('base64')
}

// 解密数据：base64 解码 → 提取 salt(前16字节) + IV(次16字节) + 解密剩余内容
function decryptData(base64Data: string, password: string): Buffer {
  const rawData = Buffer.from(base64Data.trim(), 'base64')

  if (rawData.length < 32) {
    throw new Error('加密数据格式无效：数据长度不足')
  }

  const salt = rawData.subarray(0, 16)
  const iv = rawData.subarray(16, 32)
  const encrypted = rawData.subarray(32)
  const key = deriveKey(password, salt)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

// ==================== SQLite 验证函数 ====================

// 验证数据是否为有效的 SQLite 数据库文件（检查文件头魔数）
function isValidSqlite(data: Buffer): boolean {
  if (data.length < 16) return false
  const header = data.subarray(0, 16).toString('latin1')
  return header === SQLITE_MAGIC
}

// ==================== 备份信息类型 ====================

export interface BackupInfo {
  name: string
  path: string
  size: number
  timestamp: string
  encrypted: boolean
}

// ==================== 导出备份 ====================

/**
 * 导出数据库备份
 * @param outputPath 输出文件路径
 * @param password 加密密码（可选，提供则使用 AES-256-CBC 加密）
 * @returns 备份文件路径、大小、时间戳
 */
export function exportBackup(
  outputPath: string,
  password?: string
): Result<{ path: string; size: number; timestamp: string }> {
  try {
    const dbPath = path.join(getDataDir(), 'relmap.db')
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: `数据库文件不存在: ${dbPath}` }
    }

    // 执行 WAL checkpoint，确保所有数据写入主数据库文件
    const db = getDb()
    db.pragma('wal_checkpoint(TRUNCATE)')

    // 读取数据库文件内容
    const dbContent = fs.readFileSync(dbPath)

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 生成时间戳
    const timestamp = new Date().toISOString()

    // 写入备份文件（加密或明文）
    if (password) {
      const encrypted = encryptData(dbContent, password)
      fs.writeFileSync(outputPath, encrypted, 'utf8')
    } else {
      fs.writeFileSync(outputPath, dbContent)
    }

    const size = fs.statSync(outputPath).size

    // 备份轮转：最多保留 20 个历史备份
    rotateBackups(20)

    // 验证备份文件完整性
    if (password) {
      try {
        const verifyContent = fs.readFileSync(outputPath, 'utf8')
        decryptData(verifyContent, password)
      } catch {
        return { success: false, error: '备份文件写入后验证失败：加密数据无法正确解密' }
      }
    } else {
      const raw = fs.readFileSync(outputPath)
      if (!isValidSqlite(raw)) {
        return { success: false, error: '备份文件写入后验证失败：不是有效的 SQLite 数据库' }
      }
    }

    return {
      success: true,
      data: { path: outputPath, size, timestamp }
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ==================== 导入备份 ====================

/**
 * 导入恢复数据库备份
 * @param inputPath 备份文件路径
 * @param password 解密密码（可选）
 * @returns 恢复状态和时间戳
 * 注意：导入失败时会自动回滚到原数据库
 */
export function importBackup(
  inputPath: string,
  password?: string
): Result<{ restored: boolean; timestamp: string }> {
  let backupPath: string | null = null

  try {
    if (!fs.existsSync(inputPath)) {
      return { success: false, error: `备份文件不存在: ${inputPath}` }
    }

    // 读取备份文件内容
    const rawContent = fs.readFileSync(inputPath)

    // 解密（如果提供密码）或直接使用原始内容
    let dbContent: Buffer
    if (password) {
      try {
        dbContent = decryptData(rawContent.toString('utf8'), password)
      } catch (e) {
        return {
          success: false,
          error: `解密失败，密码可能错误: ${(e as Error).message}`
        }
      }
    } else {
      dbContent = rawContent
    }

    // 验证是否为有效的 SQLite 数据库文件
    if (!isValidSqlite(dbContent)) {
      return {
        success: false,
        error: '备份文件无效：不是有效的 SQLite 数据库文件'
      }
    }

    const dbPath = path.join(getDataDir(), 'relmap.db')
    backupPath = `${dbPath}.bak`
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`

    // 关闭当前数据库连接
    closeDb()

    // 备份当前数据库文件（如果存在），用于失败时回滚
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath)
    }

    try {
      // 写入新的数据库内容
      fs.writeFileSync(dbPath, dbContent)

      // 删除可能残留的 WAL 和 SHM 文件
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

      // 重新打开数据库并运行迁移
      const db = getDb()
      runMigrations(db)

      // 成功，清理备份文件
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath)
      }

      return {
        success: true,
        data: { restored: true, timestamp: new Date().toISOString() }
      }
    } catch (e) {
      // 写入或打开失败，回滚到备份
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath)
        fs.unlinkSync(backupPath)
      }
      // 清理可能损坏的 WAL/SHM 文件
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

      closeDb()
      // 重新打开数据库以恢复正常服务
      try {
        getDb()
      } catch (reopenErr) {
        logger.error({ err: reopenErr }, '[Backup] 数据库重新打开失败')
      }

      return {
        success: false,
        error: `恢复失败，已回滚到原数据库: ${(e as Error).message}`
      }
    }
  } catch (e) {
    // 外层异常：尝试回滚
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        closeDb()
        const dbPath = path.join(getDataDir(), 'relmap.db')
        fs.copyFileSync(backupPath, dbPath)
        fs.unlinkSync(backupPath)
        getDb()
      } catch (rollbackErr) {
        logger.error({ err: rollbackErr }, '[Backup] 回滚失败')
      }
    }
    return { success: false, error: (e as Error).message }
  }
}

// ==================== 列出历史备份 ====================

/**
 * 列出 data/backups 目录下的历史备份文件
 * @returns 备份文件信息列表（按修改时间倒序）
 */
export function listBackups(): Result<BackupInfo[]> {
  try {
    const backupsDir = getBackupsDir()
    if (!fs.existsSync(backupsDir)) {
      return { success: true, data: [] }
    }

    const files = fs.readdirSync(backupsDir)
    const backups: BackupInfo[] = []

    for (const file of files) {
      const fullPath = path.join(backupsDir, file)
      const stat = fs.statSync(fullPath)
      if (!stat.isFile()) continue

      // 只识别备份文件格式
      const encrypted = file.endsWith('.db.enc')
      const isDb = file.endsWith('.db') && !encrypted
      if (!encrypted && !isDb) continue

      backups.push({
        name: file,
        path: fullPath,
        size: stat.size,
        timestamp: stat.mtime.toISOString(),
        encrypted
      })
    }

    // 按修改时间倒序排列（最新的在前）
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return { success: true, data: backups }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

const MAX_BACKUPS = 20

export function rotateBackups(maxCount: number = MAX_BACKUPS): void {
  try {
    const backupsDir = getBackupsDir()
    if (!fs.existsSync(backupsDir)) return

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.db.enc'))
      .map(f => ({ name: f, path: path.join(backupsDir, f), mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (files.length <= maxCount) return

    for (let i = maxCount; i < files.length; i++) {
      try { fs.unlinkSync(files[i].path) } catch { /* skip locked files */ }
    }
  } catch {
    // rotation failures are non-fatal
  }
}
