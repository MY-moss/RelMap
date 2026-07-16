import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '../connection'
import type { Photo, Result } from '../../../shared/types'

// 允许的图片扩展名
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
// 最大文件大小：50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

const PHOTO_COLUMNS =
  'id, file_path, thumbnail_path, file_size, width, height, taken_at, description, face_data, created_at'

function getPhotoById(id: string): Photo | undefined {
  const db = getDb()
  return db.prepare(`SELECT ${PHOTO_COLUMNS} FROM photos WHERE id = ?`).get(id) as
    | Photo
    | undefined
}

// 校验单个照片路径：检查路径非空、文件存在、扩展名合法、文件大小不超限
function validatePhotoPath(filePath: string): string | null {
  if (!filePath) {
    return '文件路径不能为空'
  }

  if (!fs.existsSync(filePath)) {
    return `文件不存在: ${filePath}`
  }

  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    return `不支持的图片格式: ${ext}`
  }

  const stats = fs.statSync(filePath)
  if (stats.size > MAX_FILE_SIZE) {
    return '文件大小超过50MB限制'
  }

  return null
}

// 导入照片：批量插入照片记录，从文件路径提取文件大小信息
export function importPhotos(paths: string[]): Result<Photo[]> {
  if (paths.length === 0) {
    return { success: true, data: [] }
  }

  // 导入前校验所有路径，任意一个失败则整体中止
  for (const filePath of paths) {
    const err = validatePhotoPath(filePath)
    if (err) {
      return { success: false, error: err }
    }
  }

  try {
    const db = getDb()
    const insertedIds: string[] = []

    const tx = db.transaction(() => {
      const insertStmt = db.prepare(
        `INSERT INTO photos (id, file_path, file_size) VALUES (?, ?, ?)`
      )
      for (const filePath of paths) {
        let fileSize: number | null = null
        try {
          fileSize = fs.statSync(filePath).size
        } catch {
          fileSize = null
        }

        const id = randomUUID()
        insertStmt.run(id, filePath, fileSize)
        insertedIds.push(id)
      }
    })
    tx()

    const photos = insertedIds
      .map((id) => getPhotoById(id))
      .filter((p): p is Photo => p !== undefined)

    if (photos.length !== insertedIds.length) {
      return { success: false, error: '导入照片后查询失败' }
    }
    return { success: true, data: photos }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 批量删除照片记录（事务中依次删除，ON DELETE CASCADE 自动清理关联）
export function batchDeletePhotos(ids: string[]): Result<void> {
  if (ids.length === 0) {
    return { success: true, data: undefined }
  }
  try {
    const db = getDb()
    const tx = db.transaction(() => {
      const stmt = db.prepare('DELETE FROM photos WHERE id = ?')
      for (const id of ids) {
        stmt.run(id)
      }
    })
    tx()
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 删除照片记录（ON DELETE CASCADE 会自动清理 photo_persons 关联，不删除物理文件）
export function deletePhoto(id: string): Result<void> {
  try {
    const db = getDb()
    const result = db.prepare('DELETE FROM photos WHERE id = ?').run(id)
    if (result.changes === 0) {
      return { success: false, error: `照片 ${id} 不存在` }
    }
    // photo_persons 关联由 ON DELETE CASCADE 自动删除
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 关联联系人与照片：事务中先删除旧关联，再批量插入新关联
export function linkPersonToPhoto(photoId: string, personIds: string[]): Result<void> {
  try {
    const db = getDb()

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM photo_persons WHERE photo_id = ?').run(photoId)
      if (personIds.length > 0) {
        const insertStmt = db.prepare(
          `INSERT INTO photo_persons (photo_id, person_id) VALUES (?, ?)`
        )
        for (const personId of personIds) {
          insertStmt.run(photoId, personId)
        }
      }
    })
    tx()

    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 查询指定联系人的所有照片
export function getPersonPhotos(personId: string): Result<Photo[]> {
  try {
    const db = getDb()
    const photos = db
      .prepare(
        `SELECT p.id, p.file_path, p.thumbnail_path, p.file_size, p.width, p.height,
                p.taken_at, p.description, p.face_data, p.created_at
           FROM photos p
           INNER JOIN photo_persons pp ON pp.photo_id = p.id
           WHERE pp.person_id = ?
           ORDER BY p.taken_at DESC, p.created_at DESC`
      )
      .all(personId) as Photo[]
    return { success: true, data: photos }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 查询所有照片，按 created_at DESC 排序，支持分页（默认 limit=100）
export function listAllPhotos(limit = 100, offset = 0): Result<Photo[]> {
  try {
    const db = getDb()
    const photos = db
      .prepare(
        `SELECT ${PHOTO_COLUMNS} FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as Photo[]
    return { success: true, data: photos }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
