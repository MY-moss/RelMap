import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type {
  Result,
  Person,
  SocialAccount,
} from '../../../shared/types'

// vCard 解析后的联系人结构
export interface ParsedContact {
  name: string;
  nickname?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// vCard 解析过程中的中间结构
interface VCardBuilder {
  name?: string;
  nickname?: string;
  company?: string;
  title?: string;
  nParts?: string[];
  phones: string[];
  emails: string[];
  addresses: string[];
  noteParts: string[];
}

// 反转义 vCard 值中的特殊字符
function unescapeVCard(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

// 处理 quoted-printable 编码（vCard 2.1 兼容）
function decodeQuotedPrintable(value: string): string {
  let result = ''
  let i = 0
  while (i < value.length) {
    if (value[i] === '=' && i + 2 < value.length) {
      const hex = value.substring(i + 1, i + 3)
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        result += String.fromCharCode(parseInt(hex, 16))
        i += 3
        continue
      }
    }
    result += value[i]
    i++
  }
  // 尝试以 UTF-8 解码字节序列
  try {
    const bytes = Uint8Array.from(result, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return result
  }
}

// 拆分 vCard 属性行：返回属性名、参数和值
function splitProperty(line: string): {
  name: string;
  params: Record<string, string>;
  value: string;
} {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) {
    return { name: '', params: {}, value: '' }
  }
  const left = line.substring(0, colonIdx)
  const value = line.substring(colonIdx + 1)

  // 拆分属性名和参数（以 ; 分隔，需考虑 \; 转义）
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (let i = 0; i < left.length; i++) {
    const c = left[i]
    if (escaped) {
      current += c
      escaped = false
    } else if (c === '\\') {
      current += c
      escaped = true
    } else if (c === ';') {
      parts.push(current)
      current = ''
    } else {
      current += c
    }
  }
  parts.push(current)

  const name = parts[0].toUpperCase()
  const params: Record<string, string> = {}
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=')
    if (eq !== -1) {
      const k = parts[i].substring(0, eq).toUpperCase()
      const v = parts[i].substring(eq + 1)
      params[k] = v
    } else {
      // 无等号的参数（如 TYPE 简写）映射为 TYPE
      params['TYPE'] = parts[i]
    }
  }
  return { name, params, value }
}

// 按分号拆分值（用于 N、ADR、ORG），考虑转义
function splitSemicolon(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (escaped) {
      current += c
      escaped = false
    } else if (c === '\\') {
      escaped = true
    } else if (c === ';') {
      parts.push(current)
      current = ''
    } else {
      current += c
    }
  }
  parts.push(current)
  return parts.map((s) => unescapeVCard(s))
}

// 按逗号拆分值（用于 NICKNAME 等多值字段），考虑转义
function splitComma(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let escaped = false
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (escaped) {
      current += c
      escaped = false
    } else if (c === '\\') {
      escaped = true
    } else if (c === ',') {
      parts.push(current)
      current = ''
    } else {
      current += c
    }
  }
  parts.push(current)
  return parts.map((s) => unescapeVCard(s))
}

// 展开折行：vCard 中以空格或制表符开头的行是上一行的延续
function unfoldLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/)
  const lines: string[] = []
  for (const line of rawLines) {
    if (line.length > 0 && (line[0] === ' ' || line[0] === '\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.substring(1)
      }
    } else {
      lines.push(line)
    }
  }
  return lines
}

// 从 N 字段构建姓名：N: family;given;additional;prefix;suffix
function buildNameFromN(nParts: string[]): string {
  const [family, given, additional, prefix, suffix] = nParts
  const nameParts = [prefix, given, additional, family, suffix].filter(
    (p) => p && p.trim() !== '',
  )
  return nameParts.join(' ')
}

// 解析 vCard 3.0 文本，返回 ParsedContact 数组
export function parseVCard(vcardText: string): ParsedContact[] {
  const lines = unfoldLines(vcardText)
  const contacts: ParsedContact[] = []
  let inVCard = false
  let current: VCardBuilder | null = null

  for (const line of lines) {
    if (line.trim() === '') continue
    const { name: propName, params, value } = splitProperty(line)

    if (propName === 'BEGIN' && value.toUpperCase() === 'VCARD') {
      inVCard = true
      current = { phones: [], emails: [], addresses: [], noteParts: [] }
      continue
    }

    if (propName === 'END' && value.toUpperCase() === 'VCARD') {
      if (current) {
        const contact: ParsedContact = {
          name: current.name ?? '',
        }
        if (current.nickname) contact.nickname = current.nickname
        if (current.company) contact.company = current.company
        if (current.title) contact.title = current.title
        if (current.phones.length > 0) contact.phone = current.phones.join('; ')
        if (current.emails.length > 0) contact.email = current.emails.join('; ')
        if (current.addresses.length > 0) contact.address = current.addresses.join('; ')
        if (current.noteParts.length > 0) contact.notes = current.noteParts.join('\n')
        contacts.push(contact)
      }
      inVCard = false
      current = null
      continue
    }

    if (!inVCard || !current) continue

    // 判断编码方式
    const encoding = params.ENCODING?.toUpperCase()
    const isQuotedPrintable = encoding === 'QUOTED-PRINTABLE'
    const decodedValue = isQuotedPrintable
      ? decodeQuotedPrintable(value)
      : unescapeVCard(value)

    switch (propName) {
      case 'FN': {
        current.name = decodedValue
        break
      }
      case 'N': {
        current.nParts = splitSemicolon(value)
        if (!current.name) {
          current.name = buildNameFromN(current.nParts)
        }
        break
      }
      case 'NICKNAME': {
        current.nickname = splitComma(value).join(', ')
        break
      }
      case 'ORG': {
        // ORG: organization;unit1;unit2
        const orgParts = splitSemicolon(value).filter((p) => p.trim() !== '')
        current.company = orgParts.join(' / ')
        break
      }
      case 'TITLE': {
        current.title = decodedValue
        break
      }
      case 'TEL': {
        current.phones.push(decodedValue)
        break
      }
      case 'EMAIL': {
        current.emails.push(decodedValue)
        break
      }
      case 'ADR': {
        // ADR: po-box;extended;street;locality;region;postal-code;country
        const adrParts = splitSemicolon(value).filter((p) => p.trim() !== '')
        current.addresses.push(adrParts.join(', '))
        break
      }
      case 'NOTE': {
        current.noteParts.push(decodedValue)
        break
      }
    }
  }

  return contacts
}

// 导入 vCard 文本到 persons 表
// 重复检测：姓名+公司都相同视为重复
// 电话/邮箱/地址合并到 notes 字段
export function importVCard(
  vcardText: string,
): Result<{ imported: number; skipped: number; errors: string[] }> {
  try {
    const contacts = parseVCard(vcardText)
    const db = getDb()

    const insertStmt = db.prepare(`
      INSERT INTO persons (id, name, nickname, company, title, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    // SQLite 中 IS 操作符可正确处理 NULL 比较
    const checkStmt = db.prepare(
      `SELECT 1 FROM persons WHERE name = ? AND company IS ? LIMIT 1`,
    )

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    const tx = db.transaction(() => {
      for (const contact of contacts) {
        const name = contact.name?.trim() ?? ''
        if (name === '') {
          errors.push('跳过：缺少姓名字段')
          skipped++
          continue
        }
        const companyRaw = contact.company?.trim() ?? ''
        const company = companyRaw === '' ? null : companyRaw

        // 重复检测
        const exists = checkStmt.get(name, company)
        if (exists) {
          errors.push(`跳过：联系人 "${name}" 已存在`)
          skipped++
          continue
        }

        // 合并电话/邮箱/地址到 notes 字段
        const noteLines: string[] = []
        if (contact.notes) noteLines.push(contact.notes)
        if (contact.phone) noteLines.push(`电话: ${contact.phone}`)
        if (contact.email) noteLines.push(`邮箱: ${contact.email}`)
        if (contact.address) noteLines.push(`地址: ${contact.address}`)
        const mergedNotes = noteLines.join('\n')

        try {
          const id = randomUUID()
          insertStmt.run(
            id,
            name,
            contact.nickname?.trim() || null,
            company,
            contact.title?.trim() || null,
            mergedNotes || null,
          )
          imported++
        } catch (e) {
          errors.push(`导入 "${name}" 失败: ${(e as Error).message}`)
          skipped++
        }
      }
    })
    tx()

    return { success: true, data: { imported, skipped, errors } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// CSV 字段转义：包含逗号、引号、换行的字段用双引号包裹，内部引号转义为两个引号
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 导出所有联系人为 CSV 字符串（UTF-8 BOM + 表头 + 数据行）
export function exportContactsCSV(): Result<string> {
  try {
    const db = getDb()
    const persons = db
      .prepare(
        `SELECT name, nickname, gender, birthday, company, title, department,
                notes, is_favorite, created_at
         FROM persons ORDER BY created_at DESC`,
      )
      .all() as Array<{
      name: string;
      nickname: string | null;
      gender: number;
      birthday: string | null;
      company: string | null;
      title: string | null;
      department: string | null;
      notes: string | null;
      is_favorite: number;
      created_at: string;
    }>

    const headers = [
      'name',
      'nickname',
      'gender',
      'birthday',
      'company',
      'title',
      'department',
      'notes',
      'is_favorite',
      'created_at',
    ]
    const rows: string[] = [headers.map(escapeCsvField).join(',')]

    for (const p of persons) {
      rows.push(
        [
          escapeCsvField(p.name),
          escapeCsvField(p.nickname),
          escapeCsvField(p.gender),
          escapeCsvField(p.birthday),
          escapeCsvField(p.company),
          escapeCsvField(p.title),
          escapeCsvField(p.department),
          escapeCsvField(p.notes),
          escapeCsvField(p.is_favorite),
          escapeCsvField(p.created_at),
        ].join(','),
      )
    }

    // UTF-8 BOM 头，确保 Excel 正确识别中文
    const bom = '\uFEFF'
    return { success: true, data: bom + rows.join('\r\n') }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 导出联系人（含关联社交账号）为 JSON 字符串
// 使用分块构建逐行序列化，避免一次性 JSON.stringify 全量数据导致内存峰值
export function exportContactsJSON(): Result<string> {
  try {
    const db = getDb()

    // 一次性查询所有社交账号，按 person_id 分组，避免 N+1 查询
    const allSocials = db
      .prepare(
        'SELECT * FROM social_accounts ORDER BY is_primary DESC, sort_order ASC, created_at ASC',
      )
      .all() as SocialAccount[]
    const socialMap = new Map<string, SocialAccount[]>()
    for (const s of allSocials) {
      if (!socialMap.has(s.person_id)) {
        socialMap.set(s.person_id, [])
      }
      socialMap.get(s.person_id)!.push(s)
    }

    // 使用分块构建：逐行序列化，避免将所有联系人对象 + 完整 JSON 字符串同时驻留内存
    const parts: string[] = []
    appendJsonArrayChunked(
      db,
      parts,
      'SELECT * FROM persons ORDER BY created_at DESC',
      (row: Person) => ({
        ...row,
        social_accounts: socialMap.get(row.id) ?? [],
      }),
    )
    return { success: true, data: parts.join('') }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// 导出全部数据为嵌套 JSON 字符串（分块构建，避免一次性加载所有数据到内存）
// 包含：persons(含 social_accounts), relationships, events, diaries, photos, interaction_logs, reminders
export function exportAllDataJSON(): Result<string> {
  try {
    const db = getDb()

    const parts: string[] = []
    parts.push('{')

    // meta
    const metaCounts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM persons) AS persons,
        (SELECT COUNT(*) FROM social_accounts) AS social_accounts,
        (SELECT COUNT(*) FROM relationships) AS relationships,
        (SELECT COUNT(*) FROM events) AS events,
        (SELECT COUNT(*) FROM diaries) AS diaries,
        (SELECT COUNT(*) FROM photos) AS photos,
        (SELECT COUNT(*) FROM interaction_logs) AS interaction_logs,
        (SELECT COUNT(*) FROM reminders) AS reminders
    `).get() as Record<string, number>
    parts.push(`"meta":{"version":"1.0","exported_at":"${new Date().toISOString()}","counts":${JSON.stringify(metaCounts)}},`)

    // preload all social_accounts (avoid N+1)
    const allSocials = db.prepare('SELECT * FROM social_accounts ORDER BY is_primary DESC, sort_order ASC, created_at ASC').all() as SocialAccount[]
    const socialMap = new Map<string, SocialAccount[]>()
    for (const s of allSocials) {
      if (!socialMap.has(s.person_id)) socialMap.set(s.person_id, [])
      socialMap.get(s.person_id)!.push(s)
    }

    // persons (chunked)
    parts.push(`"persons":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM persons ORDER BY created_at DESC', (row: Person) => {
      return { ...row, social_accounts: socialMap.get(row.id) ?? [] }
    })
    parts.push(',')

    // relationships (chunked)
    parts.push(`"relationships":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM relationships ORDER BY created_at ASC')
    parts.push(',')

    // events (chunked)
    parts.push(`"events":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM events ORDER BY event_date DESC')
    parts.push(',')

    // diaries (chunked)
    parts.push(`"diaries":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM diaries ORDER BY diary_date DESC')
    parts.push(',')

    // photos (chunked)
    parts.push(`"photos":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM photos ORDER BY created_at DESC')
    parts.push(',')

    // interaction_logs (chunked)
    parts.push(`"interaction_logs":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM interaction_logs ORDER BY interact_at DESC')
    parts.push(',')

    // reminders (chunked)
    parts.push(`"reminders":`)
    appendJsonArrayChunked(db, parts, 'SELECT * FROM reminders ORDER BY remind_date ASC')

    parts.push('}')

    return { success: true, data: parts.join('') }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

interface Database {
  prepare(sql: string): { all(): unknown[]; iterate(): Iterable<unknown> }
}

// 分块构建 JSON 数组：使用 iterate() 流式读取行，避免一次性将所有行加载到内存
function appendJsonArrayChunked<T>(
  db: Database,
  parts: string[],
  sql: string,
  transform?: (row: T) => unknown
): void {
  // 使用 iterate() 逐行流式读取，避免 .all() 一次性将所有行加载到内存
  const iterator = db.prepare(sql).iterate() as Iterable<T>
  parts.push('[')
  let isFirst = true
  for (const row of iterator) {
    if (!isFirst) parts.push(',')
    parts.push(JSON.stringify(transform ? transform(row) : row))
    isFirst = false
  }
  parts.push(']')
}
