import { safeStorage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { logger } from '../logger'

interface StoredCredential {
  pluginId: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiryDate?: string
  scope: string
  clientId?: string
  clientSecret?: string
  createdAt: string
}

const CREDENTIALS_FILE = 'oauth-credentials.enc'

function getStoragePath(): string {
  return path.join(app.getPath('userData'), CREDENTIALS_FILE)
}

function encrypt(text: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(text).toString('base64')
  }
  return Buffer.from(text).toString('base64')
}

function decrypt(encoded: string): string {
  try {
    const buf = Buffer.from(encoded, 'base64')
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buf)
    }
    return buf.toString('utf-8')
  } catch {
    throw new Error('Failed to decrypt credentials')
  }
}

function loadAll(): Record<string, StoredCredential> {
  try {
    const storagePath = getStoragePath()
    if (!fs.existsSync(storagePath)) return {}
    const encrypted = fs.readFileSync(storagePath, 'utf-8')
    const decrypted = decrypt(encrypted)
    return JSON.parse(decrypted)
  } catch {
    return {}
  }
}

function saveAll(data: Record<string, StoredCredential>): void {
  const json = JSON.stringify(data)
  const encrypted = encrypt(json)
  fs.writeFileSync(getStoragePath(), encrypted, 'utf-8')
}

export function getCredentials(pluginId: string, provider: string): StoredCredential | null {
  const all = loadAll()
  const key = `${pluginId}:${provider}`
  return all[key] || null
}

export function saveCredentials(pluginId: string, provider: string, cred: Omit<StoredCredential, 'pluginId' | 'provider' | 'createdAt'>): void {
  const all = loadAll()
  const key = `${pluginId}:${provider}`
  all[key] = {
    pluginId,
    provider,
    ...cred,
    createdAt: new Date().toISOString(),
  }
  saveAll(all)
  logger.info(`[Credentials] Saved credentials for ${pluginId}:${provider}`)
}

export function deleteCredentials(pluginId: string, provider: string): void {
  const all = loadAll()
  const key = `${pluginId}:${provider}`
  delete all[key]
  saveAll(all)
  logger.info(`[Credentials] Deleted credentials for ${pluginId}:${provider}`)
}

export function hasCredentials(pluginId: string, provider: string): boolean {
  return getCredentials(pluginId, provider) !== null
}
