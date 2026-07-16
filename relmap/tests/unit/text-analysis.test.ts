import { describe, it, expect } from 'vitest'
import { extractKeywords, analyzeEmotion } from '../../src/main/ai/text_analysis'

describe('text_analysis helpers', () => {
  function isChineseChar(ch: string): boolean {
    if (!ch) return false
    const code = ch.charCodeAt(0)
    return code >= 0x4e00 && code <= 0x9fff
  }

  function isAlnum(ch: string): boolean {
    if (!ch) return false
    const code = ch.charCodeAt(0)
    return (
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    )
  }

  function isSeparator(ch: string): boolean {
    if (!ch) return true
    return /\s/.test(ch) || /[，。！？、；：""''（）《》【】,.!?;:'"()[\]{}\s\n\r\t]/.test(ch)
  }

  function tokenizeContinuous(text: string): string[] {
    const segments: string[] = []
    if (!text) return segments
    let i = 0
    const len = text.length
    while (i < len) {
      const ch = text[i]
      if (isSeparator(ch)) {
        i++
        continue
      }
      if (isChineseChar(ch)) {
        let j = i
        while (j < len && isChineseChar(text[j])) j++
        segments.push(text.slice(i, j))
        i = j
      } else if (isAlnum(ch)) {
        let j = i
        while (j < len && isAlnum(text[j])) j++
        segments.push(text.slice(i, j))
        i = j
      } else {
        i++
      }
    }
    return segments
  }

  function generateNGrams(segment: string): string[] {
    const result: string[] = []
    const len = segment.length
    if (len < 2) return result
    for (let n = 2; n <= 4; n++) {
      if (len < n) break
      for (let i = 0; i <= len - n; i++) {
        result.push(segment.slice(i, i + n))
      }
    }
    return result
  }

  it('isChineseChar detects CJK characters', () => {
    expect(isChineseChar('中')).toBe(true)
    expect(isChineseChar('a')).toBe(false)
    expect(isChineseChar('1')).toBe(false)
    expect(isChineseChar('')).toBe(false)
  })

  it('isAlnum detects alphanumeric characters', () => {
    expect(isAlnum('a')).toBe(true)
    expect(isAlnum('Z')).toBe(true)
    expect(isAlnum('5')).toBe(true)
    expect(isAlnum('中')).toBe(false)
    expect(isAlnum('')).toBe(false)
  })

  it('isSeparator detects separators', () => {
    expect(isSeparator(' ')).toBe(true)
    expect(isSeparator(',')).toBe(true)
    expect(isSeparator('。')).toBe(true)
    expect(isSeparator('a')).toBe(false)
    expect(isSeparator('')).toBe(true)
  })

  it('tokenizeContinuous splits Chinese and English segments', () => {
    expect(tokenizeContinuous('')).toEqual([])
    expect(tokenizeContinuous('你好世界')).toEqual(['你好世界'])
    expect(tokenizeContinuous('hello world')).toEqual(['hello', 'world'])
    expect(tokenizeContinuous('你好hello世界')).toEqual(['你好', 'hello', '世界'])
  })

  it('generateNGrams generates 2-4 grams', () => {
    expect(generateNGrams('ab')).toEqual(['ab'])
    expect(generateNGrams('abc')).toEqual(['ab', 'bc', 'abc'])
    expect(generateNGrams('abcd')).toEqual(['ab', 'bc', 'cd', 'abc', 'bcd', 'abcd'])
    expect(generateNGrams('a')).toEqual([])
  })
})

describe('extractKeywords', () => {
  it('extracts keywords from Chinese text', () => {
    const result = extractKeywords('今天很开心，遇到了一个好朋友')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.keywords.length).toBeGreaterThan(0)
      expect(result.data.topWords.length).toBeGreaterThan(0)
    }
  })

  it('extracts keywords from English text', () => {
    const result = extractKeywords('I am very happy today because I met my best friend')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.keywords.length).toBeGreaterThan(0)
    }
  })

  it('returns empty keywords for empty text', () => {
    const result = extractKeywords('')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.keywords).toEqual([])
      expect(result.data.topWords).toEqual([])
    }
  })

  it('handles null/undefined gracefully', () => {
    const result1 = extractKeywords(null as unknown as string)
    expect(result1.success).toBe(true)
    if (result1.success) {
      expect(result1.data.keywords).toEqual([])
    }

    const result2 = extractKeywords(undefined as unknown as string)
    expect(result2.success).toBe(true)
  })

  it('returns top N keywords', () => {
    const text = '开心 快乐 高兴 兴奋 满意 喜欢 美好 幸运'
    const result = extractKeywords(text, 3)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.keywords.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('analyzeEmotion', () => {
  it('detects positive emotion', () => {
    const result = analyzeEmotion('今天真是开心的一天，感觉很幸福很满足')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('positive')
      expect(result.data.score).toBeGreaterThan(0)
      expect(result.data.positiveWords.length).toBeGreaterThan(0)
    }
  })

  it('detects negative emotion', () => {
    const result = analyzeEmotion('很难过，很伤心，感觉非常沮丧和失落')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('negative')
      expect(result.data.score).toBeLessThan(0)
      expect(result.data.negativeWords.length).toBeGreaterThan(0)
    }
  })

  it('detects neutral emotion', () => {
    const result = analyzeEmotion('今天去了超市，买了些东西')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('neutral')
    }
  })

  it('returns neutral for empty text', () => {
    const result = analyzeEmotion('')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('neutral')
      expect(result.data.score).toBe(0)
      expect(result.data.positiveWords).toEqual([])
      expect(result.data.negativeWords).toEqual([])
    }
  })

  it('handles null/undefined gracefully', () => {
    const result = analyzeEmotion(null as unknown as string)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.label).toBe('neutral')
    }
  })
})
