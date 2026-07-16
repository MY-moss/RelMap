import { describe, it, expect } from 'vitest'
import { levenshteinDistance, stringSimilarity } from '../../src/main/ai/duplicate_detect'

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()+]/g, '')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
    expect(levenshteinDistance('', '')).toBe(0)
    expect(levenshteinDistance('abc', 'abc')).toBe(0)
  })

  it('returns length of non-empty string when other is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5)
    expect(levenshteinDistance('hello', '')).toBe(5)
  })

  it('calculates correct distance for single character difference', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1)
    expect(levenshteinDistance('cat', 'cut')).toBe(1)
    expect(levenshteinDistance('cat', 'at')).toBe(1)
  })

  it('calculates correct distance for different strings', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
  })

  it('handles Chinese characters', () => {
    expect(levenshteinDistance('张三', '张三')).toBe(0)
    expect(levenshteinDistance('张三', '李四')).toBe(2)
    expect(levenshteinDistance('张三丰', '张三')).toBe(1)
  })

  it('is symmetric', () => {
    const a = 'hello world'
    const b = 'hallo world'
    expect(levenshteinDistance(a, b)).toBe(levenshteinDistance(b, a))
  })
})

describe('stringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(stringSimilarity('hello', 'hello')).toBe(1)
  })

  it('returns 1 when both strings are empty', () => {
    expect(stringSimilarity('', '')).toBe(1)
  })

  it('returns 0 when one string is empty', () => {
    expect(stringSimilarity('hello', '')).toBe(0)
    expect(stringSimilarity('', 'world')).toBe(0)
  })

  it('returns similarity between 0 and 1', () => {
    const sim = stringSimilarity('kitten', 'sitting')
    expect(sim).toBeGreaterThan(0)
    expect(sim).toBeLessThan(1)
  })

  it('returns high similarity for similar strings', () => {
    const sim = stringSimilarity('张三', '张四')
    expect(sim).toBeGreaterThan(0.3)
    expect(sim).toBeLessThan(1)
  })
})

describe('normalizePhone', () => {
  it('removes spaces, dashes, parentheses, plus signs', () => {
    expect(normalizePhone('138-0000-1111')).toBe('13800001111')
    expect(normalizePhone('+86 138 0000 1111')).toBe('8613800001111')
    expect(normalizePhone('(010) 8888-6666')).toBe('01088886666')
  })

  it('keeps digits intact', () => {
    expect(normalizePhone('13800001111')).toBe('13800001111')
  })

  it('handles empty string', () => {
    expect(normalizePhone('')).toBe('')
  })
})

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
    expect(normalizeEmail('USER@DOMAIN.com')).toBe('user@domain.com')
  })

  it('handles empty string', () => {
    expect(normalizeEmail('')).toBe('')
  })
})
