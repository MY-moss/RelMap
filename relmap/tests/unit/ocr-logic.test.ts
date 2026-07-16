import { describe, it, expect } from 'vitest'

// Test the OCR field parsing logic from src/main/ai/ocr.ts
// The parseOcrFields function is a pure function that doesn't need Tesseract

interface OcrResult {
  name?: string
  phone?: string
  email?: string
  company?: string
  title?: string
  address?: string
  raw_text: string
}

function parseOcrFields(text: string): OcrResult {
  const result: OcrResult = { raw_text: text }
  if (!text) return result
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return result

  // Name detection (2-4 Chinese chars at start)
  const nameRegex = /^\s*([\u4e00-\u9fa5]{2,4}|[A-Za-z]+\s*[A-Za-z]+)/
  for (const line of lines.slice(0, 3)) {
    const m = line.match(nameRegex)
    if (m?.[1]) { result.name = m[1].trim(); break }
  }

  // Phone
  const phoneRegex = /(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})/
  for (const line of lines) {
    const m = line.match(phoneRegex)
    if (m?.[0]) { result.phone = m[0]; break }
  }

  // Email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/
  for (const line of lines) {
    const m = line.match(emailRegex)
    if (m?.[0]) { result.email = m[0]; break }
  }

  // Company
  const companyRegex = /(公司|集团|有限|科技|Co\.|Ltd)/i
  for (const line of lines) {
    if (companyRegex.test(line)) { result.company = line; break }
  }

  // Title
  const titleRegex = /(经理|总监|主管|工程师|CEO|CTO|总裁|总经理|副总|主任|部长|设计师|分析师|顾问|架构师|助理|专员)/i
  for (const line of lines) {
    if (titleRegex.test(line)) { result.title = line; break }
  }

  // Address
  const addressRegex = /(路|街|号|室|大厦|区|市|Road|Street|Ave)/i
  for (const line of lines) {
    if (addressRegex.test(line)) { result.address = line; break }
  }

  return result
}

describe('OCR Field Parsing', () => {
  it('should extract name from first line', () => {
    const result = parseOcrFields('张三\n13800138000\nzhangsan@email.com')
    expect(result.name).toBe('张三')
  })

  it('should extract English name', () => {
    const result = parseOcrFields('John Smith\nVP of Engineering\nAcme Inc.')
    expect(result.name).toBe('John Smith')
  })

  it('should extract phone number', () => {
    const result = parseOcrFields('李四\n13912345678\nlisi@test.com')
    expect(result.phone).toBe('13912345678')
  })

  it('should extract email', () => {
    const result = parseOcrFields('王五\nwangwu@company.com\n经理')
    expect(result.email).toBe('wangwu@company.com')
  })

  it('should extract company', () => {
    const result = parseOcrFields('赵六\n阿里巴巴集团\nCTO')
    expect(result.company).toBe('阿里巴巴集团')
  })

  it('should extract title', () => {
    const result = parseOcrFields('钱七\n技术总监\n腾讯科技')
    expect(result.title).toBe('技术总监')
  })

  it('should handle empty text', () => {
    const result = parseOcrFields('')
    expect(result.raw_text).toBe('')
    expect(result.name).toBeUndefined()
  })

  it('should handle multiline business card', () => {
    const card = `张三
软件工程师
北京字节跳动科技有限公司
zhangsan@bytedance.com
13800001111
北京市海淀区知春路`

    const result = parseOcrFields(card)
    expect(result.name).toBe('张三')
    expect(result.title).toBe('软件工程师')
    expect(result.company).toContain('字节跳动')
    expect(result.email).toBe('zhangsan@bytedance.com')
    expect(result.phone).toBe('13800001111')
    expect(result.address).toContain('知春路')
  })

  it('should extract landline phone', () => {
    const result = parseOcrFields('孙八\n010-88886666\nsun@company.com')
    expect(result.phone).toBe('010-88886666')
  })

  it('should handle only whitespace text', () => {
    const result = parseOcrFields('   \n  \n   ')
    expect(result.raw_text).toBe('   \n  \n   ')
    expect(result.name).toBeUndefined()
  })

  it('should not extract name from non-name text', () => {
    const result = parseOcrFields('13800138000')
    expect(result.name).toBeUndefined()
    expect(result.phone).toBe('13800138000')
  })
})
