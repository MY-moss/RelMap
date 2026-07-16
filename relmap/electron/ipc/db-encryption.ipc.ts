import { ipcMain } from 'electron'
import type { Result } from '../../src/shared/types'
import {
  isDbEncrypted,
  encryptDb,
  decryptDb,
  changeDbPassword,
  testEncryptionKey,
  getEncryptionKey,
  setEncryptionKey,
} from '../../src/main/db/connection'
function checkPasswordStrength(password: string): { score: number; label: string; feedback: string } {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) {
    return { score, label: '弱', feedback: '建议使用至少8位包含字母、数字和特殊字符的密码' }
  } else if (score <= 3) {
    return { score, label: '中等', feedback: '可以更好，建议增加长度或添加特殊字符' }
  } else if (score <= 4) {
    return { score, label: '良好', feedback: '密码强度良好' }
  } else {
    return { score, label: '非常强', feedback: '密码强度优秀' }
  }
}

export function registerDbEncryptionIPC(): void {
  ipcMain.handle('db:checkEncryptionStatus', async (): Promise<Result<{ encrypted: boolean; keyAvailable: boolean }>> => {
    try {
      const encrypted = isDbEncrypted()
      const keyAvailable = getEncryptionKey() !== null
      return { success: true, data: { encrypted, keyAvailable } }
    } catch (e) {
      logIpcError('db:checkEncryptionStatus', e)
      return { success: false, error: '检查加密状态失败' }
    }
  })

  ipcMain.handle('db:encrypt', async (_event, password: string): Promise<Result<{ success: boolean; message: string }>> => {
    try {
      if (!password || password.length < 4) {
        return { success: false, error: '密码至少需要4位' }
      }

      const strength = checkPasswordStrength(password)
      if (strength.score <= 2) {
        return { success: false, error: `密码强度不足（${strength.label}）：${strength.feedback}` }
      }

      const result = encryptDb(password)
      if (result) {
        return { success: true, data: { success: true, message: '数据库加密成功' } }
      } else {
        return { success: false, error: '数据库加密失败，请检查日志' }
      }
    } catch (e) {
      logIpcError('db:encrypt', e)
      return { success: false, error: '数据库加密失败，请检查日志' }
    }
  })

  ipcMain.handle('db:decrypt', async (_event, password: string): Promise<Result<{ success: boolean; message: string }>> => {
    try {
      if (!password) {
        return { success: false, error: '请输入密码' }
      }

      const valid = testEncryptionKey(password)
      if (!valid) {
        return { success: false, error: '密码不正确' }
      }

      const result = decryptDb(password, null)
      if (result) {
        return { success: true, data: { success: true, message: '数据库解密成功' } }
      } else {
        return { success: false, error: '数据库解密失败，请检查日志' }
      }
    } catch (e) {
      logIpcError('db:decrypt', e)
      return { success: false, error: '数据库解密失败，请检查日志' }
    }
  })

  ipcMain.handle('db:changePassword', async (_event, oldPassword: string, newPassword: string): Promise<Result<{ success: boolean; message: string }>> => {
    try {
      if (!oldPassword) {
        return { success: false, error: '请输入旧密码' }
      }
      if (!newPassword || newPassword.length < 4) {
        return { success: false, error: '新密码至少需要4位' }
      }

      const strength = checkPasswordStrength(newPassword)
      if (strength.score <= 2) {
        return { success: false, error: `新密码强度不足（${strength.label}）：${strength.feedback}` }
      }

      const result = changeDbPassword(oldPassword, newPassword)
      if (result) {
        return { success: true, data: { success: true, message: '密码修改成功' } }
      } else {
        return { success: false, error: '密码修改失败，可能是旧密码不正确' }
      }
    } catch (e) {
      logIpcError('db:changePassword', e)
      return { success: false, error: '密码修改失败，请检查日志' }
    }
  })

  ipcMain.handle('db:testKey', async (_event, password: string): Promise<Result<boolean>> => {
    try {
      if (!password) {
        return { success: true, data: false }
      }
      const result = testEncryptionKey(password)
      return { success: true, data: result }
    } catch (e) {
      logIpcError('db:testKey', e)
      return { success: true, data: false }
    }
  })

  ipcMain.handle('db:setKey', async (_event, password: string | null): Promise<Result<void>> => {
    try {
      setEncryptionKey(password)
      return { success: true, data: undefined }
    } catch (e) {
      logIpcError('db:setKey', e)
      return { success: false, error: '设置密钥失败' }
    }
  })
}
