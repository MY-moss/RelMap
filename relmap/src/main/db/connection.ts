import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import type Database from 'better-sqlite3-multiple-ciphers'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { logger } from '../../../electron/logger'

const require = createRequire(import.meta.url)
const DatabaseModule = require('better-sqlite3-multiple-ciphers') as typeof Database

let db: Database.Database | null = null
let drizzleDb: BetterSQLite3Database | null = null
let encryptionKey: string | null = null

let lastIntegrityCheckTime = 0

function escapePragmaValue(value: string): string {
  return value.replace(/'/g, "''")
}

export function getDataDir(): string {
  const isDev = !!process.env['VITE_DEV_SERVER_URL']
  let dataDir: string

  if (isDev) {
    dataDir = path.join(process.env.APP_ROOT || process.cwd(), 'data')
  } else {
    dataDir = path.join(app.getPath('userData'), 'data')
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

export function getDb(): Database.Database {
  if (db) return db

  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')

  try {
    db = new DatabaseModule(dbPath)
    if (encryptionKey) {
      db.pragma(`key = '${escapePragmaValue(encryptionKey)}'`)
    }
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    return db
  } catch (err) {
    const e = err as Error & { code?: string }
    db = null
    throw new Error(`Failed to open database at ${dbPath}: ${e.message} (code: ${e.code})`)
  }
}

export function getDrizzleDb(): BetterSQLite3Database {
  if (drizzleDb) return drizzleDb
  drizzleDb = drizzle(getDb())
  return drizzleDb
}

export function closeDb(): void {
  if (!db) return
  try {
    db.close()
  } catch (err) {
    logger.error({ err }, 'Failed to close database')
  } finally {
    db = null
    drizzleDb = null
  }
}

export function isDbEncrypted(): boolean {
  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')

  if (!fs.existsSync(dbPath)) {
    return false
  }

  try {
    const tempDb = new DatabaseModule(dbPath)
    const result = tempDb.pragma('integrity_check') as string
    tempDb.close()
    return result !== 'ok'
  } catch {
    return true
  }
}

export function encryptDb(password: string): boolean {
  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')
  const backupPath = path.join(dataDir, 'relmap.db.backup')

  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath)
    }

    const tempDb = new DatabaseModule(dbPath)
    tempDb.pragma(`rekey = '${escapePragmaValue(password)}'`)
    tempDb.close()

    encryptionKey = password
    return true
  } catch {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, dbPath)
    }
    return false
  }
}

export function decryptDb(password: string, newPassword: string | null): boolean {
  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')
  const backupPath = path.join(dataDir, 'relmap.db.backup')

  try {
    fs.copyFileSync(dbPath, backupPath)

    const tempDb = new DatabaseModule(dbPath)
    tempDb.pragma(`key = '${escapePragmaValue(password)}'`)

    if (newPassword) {
      tempDb.pragma(`rekey = '${escapePragmaValue(newPassword)}'`)
      encryptionKey = newPassword
    } else {
      tempDb.pragma('rekey = ""')
      encryptionKey = null
    }

    tempDb.close()
    return true
  } catch {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, dbPath)
    }
    return false
  }
}

export function changeDbPassword(oldPassword: string, newPassword: string): boolean {
  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')
  const backupPath = path.join(dataDir, 'relmap.db.backup')

  try {
    fs.copyFileSync(dbPath, backupPath)

    const tempDb = new DatabaseModule(dbPath)
    tempDb.pragma(`key = '${escapePragmaValue(oldPassword)}'`)
    tempDb.pragma(`rekey = '${escapePragmaValue(newPassword)}'`)
    tempDb.close()

    encryptionKey = newPassword
    return true
  } catch {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, dbPath)
    }
    return false
  }
}

export function testEncryptionKey(password: string): boolean {
  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'relmap.db')

  try {
    const tempDb = new DatabaseModule(dbPath)
    tempDb.pragma(`key = '${escapePragmaValue(password)}'`)
    const result = tempDb.pragma('integrity_check') as string
    tempDb.close()
    return result === 'ok'
  } catch {
    return false
  }
}

export function getEncryptionKey(): string | null {
  return encryptionKey
}

export function setEncryptionKey(key: string | null): void {
  encryptionKey = key
}

export function checkDatabaseIntegrity(): { ok: boolean; message: string } {
  const now = Date.now()
  if (now - lastIntegrityCheckTime < 60000) {
    return { ok: true, message: 'Skipped (checked within 60s)' }
  }
  lastIntegrityCheckTime = now
  try {
    if (!db) return { ok: false, message: 'Database not initialized' }
    const result = db.pragma('integrity_check') as string
    if (result !== 'ok') {
      return { ok: false, message: `Integrity check failed: ${result}` }
    }
    return { ok: true, message: 'ok' }
  } catch (err) {
    return { ok: false, message: `Integrity check error: ${(err as Error).message}` }
  }
}
