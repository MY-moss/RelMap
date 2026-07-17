import { ipcMain, app, safeStorage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import type { Result } from '../../src/shared/types'
import { logger, logIpcError } from '../logger'

const CONFIG_FILE = path.join(app.getPath('userData'), 'app-config.json')

// AUDIT-P2-001: PIN 验证频率限制，防止暴力破解
const PIN_FAIL_LIMIT = 5
const PIN_LOCKOUT_MS = 30000
let pinFailCount = 0
let pinLockoutUntil = 0

// IPC-P1-002: AES-256-GCM encryption with safeStorage-backed master key
const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 16
const AUTH_TAG_LEN = 16
const MASTER_KEY_FILE = path.join(app.getPath('userData'), '.master-key.enc')

export interface AppConfig {
  pinHash?: string
  pinSalt?: string
  aiProviders?: Record<string, { apiKey?: string; baseUrl?: string; model?: string; enabled?: boolean }>
  telemetryConsentGiven?: boolean
  sentryEnabled?: boolean
  darkMode?: boolean
  colorTheme?: string
  glassMode?: 'none' | 'frosted' | 'translucent'
  dashboard?: {
    widgets: Array<{ type: string; visible: boolean; order: number }>
  }
}

function deriveKey(): Buffer {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      if (fs.existsSync(MASTER_KEY_FILE)) {
        const encrypted = fs.readFileSync(MASTER_KEY_FILE)
        if (encrypted.length > 0) {
          const base64Key = safeStorage.decryptString(encrypted)
          return Buffer.from(base64Key, 'base64')
        }
      }
      const newKey = crypto.randomBytes(32)
      const encryptedBuffer = safeStorage.encryptString(newKey.toString('base64'))
      fs.writeFileSync(MASTER_KEY_FILE, encryptedBuffer)
      return newKey
    }
  } catch {
    // fall through to fallback
  }
  const machineId = app.getPath('exe') + app.getVersion()
  return crypto.createHash('sha256').update('RelMap-' + machineId).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a hex string: iv + authTag + ciphertext
 */
function encrypt(text: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('hex')
}

/**
 * Decrypt a hex string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(encryptedHex: string): string {
  const key = deriveKey()
  const data = Buffer.from(encryptedHex, 'hex')
  const iv = data.subarray(0, IV_LEN)
  const authTag = data.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN)
  const encrypted = data.subarray(IV_LEN + AUTH_TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8')
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {
    // ignore corrupt config
  }
  return {}
}

function saveConfig(config: AppConfig): void {
  const dir = path.dirname(CONFIG_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

/**
 * Mask API keys before sending to renderer process.
 * Shows only the last 4 characters, e.g. "sk-...1234"
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) return "***" + key.slice(-4)
  return key.slice(0, 3) + "..." + key.slice(-4)
}

export function registerAppConfigIPC(): void {
  ipcMain.handle('app:hasPin', async (): Promise<Result<boolean>> => {
    try {
      const config = await loadConfig()
      return { success: true, data: !!config.pinHash }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:hasPin' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:getStartupConfig', async (): Promise<Result<{ hasPin: boolean; config: Record<string, unknown> }>> => {
    try {
      const config = loadConfig()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pinHash: _ph, pinSalt: _ps, aiProviders: _providers, ...safeConfig } = config
      const maskedProviders = _providers
        ? Object.fromEntries(
            Object.entries(_providers).map(([key, val]) => [
              key,
              { ...val, apiKey: val.apiKey ? maskApiKey(val.apiKey) : undefined },
            ]),
          )
        : undefined
      return { success: true, data: { hasPin: !!config.pinHash, config: { ...safeConfig, aiProviders: maskedProviders } } }
    } catch (e) {
      logIpcError('app:getStartupConfig', e)
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:setPin', async (_event, pin: string): Promise<Result<void>> => {
    try {
      if (pin && pin.length < 4) {
        return { success: false, error: 'PIN码至少4位' }
      }
      if (pin && pin.length > 128) {
        return { success: false, error: 'PIN码不能超过128位' }
      }
      const config = await loadConfig()
      if (pin) {
        const salt = crypto.randomBytes(16).toString('hex')
        config.pinHash = hashPassword(pin, salt)
        config.pinSalt = salt
      } else {
        delete config.pinHash
        delete config.pinSalt
      }
      await saveConfig(config)
      return { success: true, data: undefined }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:setPin' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:verifyPin', async (_event, pin: string): Promise<Result<boolean>> => {
    try {
      const config = await loadConfig()

      // 频率限制：检查是否处于锁定期（必须在 PIN 校验前执行）
      const now = Date.now()
      if (now < pinLockoutUntil) {
        const remaining = Math.ceil((pinLockoutUntil - now) / 1000)
        return { success: false, error: `PIN 输入已锁定，请在 ${remaining} 秒后重试` }
      }

      if (!config.pinHash || !config.pinSalt) {
        return { success: true, data: false }
      }

      // Constant-time comparison to prevent timing attacks
      const hash = hashPassword(pin, config.pinSalt)
      const expected = config.pinHash
      if (hash.length !== expected.length) {
        pinFailCount++
        if (pinFailCount >= PIN_FAIL_LIMIT) {
          pinLockoutUntil = now + PIN_LOCKOUT_MS * Math.pow(2, Math.floor(pinFailCount / PIN_FAIL_LIMIT) - 1)
          pinFailCount = 0
        }
        return { success: true, data: false }
      }
      let result = 0
      for (let i = 0; i < hash.length; i++) {
        result |= hash.charCodeAt(i) ^ expected.charCodeAt(i)
      }
      const verified = result === 0
      if (verified) {
        pinFailCount = 0
        pinLockoutUntil = 0
      } else {
        pinFailCount++
        if (pinFailCount >= PIN_FAIL_LIMIT) {
          const backoffMultiplier = Math.pow(2, Math.floor(pinFailCount / PIN_FAIL_LIMIT) - 1)
          pinLockoutUntil = now + PIN_LOCKOUT_MS * backoffMultiplier
          pinFailCount = 0
        }
      }
      return { success: true, data: verified }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:verifyPin' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:getConfig', async (): Promise<Result<AppConfig>> => {
    try {
      const config = await loadConfig()
      // Strip sensitive fields before sending to renderer
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pinHash: _ph, pinSalt: _ps, aiProviders: _providers, ...safeConfig } = config
      const maskedProviders = _providers
        ? Object.fromEntries(
            Object.entries(_providers).map(([key, val]) => {
              let apiKey = val.apiKey
              if (apiKey) {
                try {
                  apiKey = decrypt(apiKey)
                } catch {
                  // leave as-is if not encrypted
                }
              }
              return [
                key,
                { ...val, apiKey: apiKey ? maskApiKey(apiKey) : undefined },
              ]
            }),
          )
        : undefined
      return { success: true, data: { ...safeConfig, aiProviders: maskedProviders } }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:getConfig' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:getApiKey', async (_event, providerId: string): Promise<Result<string | null>> => {
    try {
      const config = await loadConfig()
      const provider = config.aiProviders?.[providerId]
      if (!provider?.apiKey || !provider.enabled) {
        return { success: true, data: null }
      }
      let apiKey = provider.apiKey
      try {
        apiKey = decrypt(apiKey)
      } catch {
        // leave as-is if not encrypted
      }
      return { success: true, data: apiKey }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:getApiKey' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:saveApiKey', async (_event, providerId: string, apiKey: string): Promise<Result<void>> => {
    try {
      const config = await loadConfig()
      if (!config.aiProviders) {
        config.aiProviders = {}
      }
      if (!config.aiProviders[providerId]) {
        config.aiProviders[providerId] = { enabled: true }
      }
      config.aiProviders[providerId].apiKey = encrypt(apiKey)
      await saveConfig(config)
      return { success: true, data: undefined }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:saveApiKey' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('app:saveConfig', async (_event, partial: Partial<AppConfig>): Promise<Result<void>> => {
    try {
      const config = await loadConfig()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pinHash: _ph, pinSalt: _ps, ...safePartial } = partial
      Object.assign(config, safePartial)
      // IPC-P1-002: encrypt any apiKey values that were passed in plaintext
      const existingConfig = loadConfig()
      if (config.aiProviders) {
        for (const [key, val] of Object.entries(config.aiProviders)) {
          if (val.apiKey) {
            // Detect masked key (e.g. "sk...abcd") — user didn't change it, preserve existing
            if (val.apiKey.includes('...') || val.apiKey.startsWith('***')) {
              const existing = existingConfig.aiProviders?.[key]?.apiKey
              if (existing) config.aiProviders[key].apiKey = existing
              continue
            }
            try {
              decrypt(val.apiKey)
            } catch {
              config.aiProviders[key].apiKey = encrypt(val.apiKey)
            }
          }
        }
      }
      await saveConfig(config)
      return { success: true, data: undefined }
    } catch (e) {
      logger.error({ err: e, ipc: 'app:saveConfig' }, 'IPC handler error')
      return { success: false, error: (e as Error).message }
    }
  })
}



