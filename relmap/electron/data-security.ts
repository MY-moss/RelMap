import path from 'node:path'

const SENSITIVE_PATTERNS = [
  /[Cc]:\\[^\s,;)]+/g,
  /\/[a-z_][\w/.-]*\//g,
  /userData[\\/][^\s,;)]+/g,
]

const NAME_PATTERNS = [
  /"name"\s*:\s*"[^"]+"/g,
  /"person_id"\s*:\s*"[^"]+"/g,
  /"id"\s*:\s*"[^"]+"/g,
  /"account_id"\s*:\s*"[^"]+"/g,
  /"phone"\s*:\s*"[^"]+"/g,
  /"email"\s*:\s*"[^"]+"/g,
]

export function sanitizeError(error: Error, context?: string): string {
  let message = `${error.name}: ${error.message}`
  if (context) message = `[${context}] ${message}`
  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, '[REDACTED]')
  }
  return message
}

export function isPathSafe(targetPath: string, allowedBase: string): boolean {
  try {
    const resolved = path.resolve(targetPath)
    const base = path.resolve(allowedBase)
    return resolved.startsWith(base)
  } catch {
    return false
  }
}

export function anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
  // Apply all NAME_PATTERNS on a single stringify/parse cycle
  let json = JSON.stringify(data)
  for (const pattern of NAME_PATTERNS) {
    json = json.replace(pattern, (match) => {
      const key = match.split(':')[0]
      return `${key}: "[REDACTED]"`
    })
  }
  return JSON.parse(json)
}
