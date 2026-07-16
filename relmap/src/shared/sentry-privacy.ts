// Sentry 隐私保护模块
// 在主进程和渲染进程的 beforeSend 回调中共享使用
// 过滤敏感数据：文件路径、用户名、邮箱、IP、请求体等

import type { ErrorEvent as SentryErrorEvent, EventHint, Breadcrumb } from '@sentry/core'

// 敏感字段名关键词（不区分大小写匹配）
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'session',
  'credential',
  'private_key',
]

// 匹配 Windows 用户路径: C:\Users\john\... 或 D:\Users\john\...
const WINDOWS_USER_PATH = /([A-Za-z]:\\Users\\)[^\\]+/g
// 匹配 Unix home 路径: /home/john/...
const UNIX_HOME_PATH = /(\/home\/)[^/]+/g
// 匹配 macOS 用户路径: /Users/john/...
const MACOS_USER_PATH = /(\/Users\/)[^/]+/g
// 匹配邮箱地址
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
// 匹配 IPv4 地址
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g

/** 判断字段名是否敏感 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern))
}

/** 清理字符串中的敏感信息（文件路径、用户名、邮箱、IP） */
function sanitizeString(text: string): string {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(WINDOWS_USER_PATH, '$1[REDACTED]')
    .replace(UNIX_HOME_PATH, '$1[REDACTED]')
    .replace(MACOS_USER_PATH, '$1[REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(IPV4_PATTERN, '[REDACTED_IP]')
}

/** 递归清理对象中的敏感数据 */
function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = sanitizeObject(value)
      }
    }
    return result as unknown as T
  }
  return obj
}

/** 清理 breadcrumbs：移除 HTTP 请求体、脱敏消息 */
function sanitizeBreadcrumbs(breadcrumbs: Breadcrumb[]): Breadcrumb[] {
  return breadcrumbs.map((crumb) => {
    const sanitized: Breadcrumb = { ...crumb }
    // 脱敏消息文本
    if (sanitized.message) {
      sanitized.message = sanitizeString(sanitized.message)
    }
    // 清理 data 中的敏感信息
    if (sanitized.data) {
      const { body, request_body, requestBody, response_body, ...rest } = sanitized.data
      // 移除请求/响应体，保留元数据（url, method, status_code 等）
      void body
      void request_body
      void requestBody
      void response_body
      sanitized.data = sanitizeObject(rest) as Record<string, unknown>
    }
    return sanitized
  })
}

/**
 * Sentry beforeSend 回调：在事件发送前进行隐私过滤
 * - 过滤文件路径中的用户名
 * - 移除邮箱、IP 地址
 * - 移除 breadcrumbs 中的请求体
 * - 移除用户 PII（邮箱、IP、用户名）
 * - 过滤敏感字段（密码、token 等）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function beforeSend(event: SentryErrorEvent, _hint: EventHint): SentryErrorEvent | null {
  // 1. 脱敏异常信息和堆栈
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = sanitizeString(exception.value)
      }
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.filename) {
            frame.filename = sanitizeString(frame.filename)
          }
          if (frame.abs_path) {
            frame.abs_path = sanitizeString(frame.abs_path)
          }
          if (frame.vars) {
            frame.vars = sanitizeObject(frame.vars)
          }
        }
      }
    }
  }

  // 2. 清理 breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = sanitizeBreadcrumbs(event.breadcrumbs)
  }

  // 3. 脱敏事件消息
  if (event.message) {
    event.message = sanitizeString(event.message)
  }

  // 4. 移除用户 PII
  if (event.user) {
    delete event.user.email
    delete event.user.ip_address
    delete event.user.username
  }

  // 5. 清理请求数据中的敏感信息
  if (event.request) {
    if (event.request.headers) {
      const headers = event.request.headers
      // 移除敏感 headers
      for (const key of Object.keys(headers)) {
        if (isSensitiveKey(key)) {
          delete headers[key]
        }
      }
    }
    if (event.request.cookies) {
      delete event.request.cookies
    }
    if (event.request.data) {
      event.request.data = sanitizeObject(event.request.data)
    }
  }

  // 6. 清理 extra 和 contexts 中的敏感数据
  if (event.extra) {
    event.extra = sanitizeObject(event.extra)
  }

  if (event.contexts) {
    event.contexts = sanitizeObject(event.contexts)
  }

  // 7. 清理 tags 中可能包含路径的值（原地修改，保持类型兼容）
  if (event.tags) {
    for (const [key, value] of Object.entries(event.tags)) {
      if (isSensitiveKey(key)) {
        event.tags[key] = '[REDACTED]'
      } else if (typeof value === 'string') {
        event.tags[key] = sanitizeString(value)
      }
    }
  }

  return event
}
