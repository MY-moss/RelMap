import { describe, it, expect } from 'vitest'

// Shared data utility tests

describe('Data Utilities', () => {
  describe('Date handling', () => {
    it('should parse dates correctly', () => {
      const d = new Date('2026-07-15T00:00:00')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(6) // 0-indexed
      expect(d.getDate()).toBe(15)
    })

    it('should compare dates correctly', () => {
      const a = new Date('2026-07-15')
      const b = new Date('2026-07-16')
      const c = new Date('2026-07-15')
      expect(b.getTime()).toBeGreaterThan(a.getTime())
      expect(a.getTime()).toBe(c.getTime())
    })

    it('should handle date formatting', () => {
      const date = new Date('2026-07-15T10:30:00')
      const iso = date.toISOString()
      expect(iso).toContain('2026-07-15')
    })
  })

  describe('String utilities', () => {
    it('should trim strings', () => {
      expect('  hello  '.trim()).toBe('hello')
      expect('noop'.trim()).toBe('noop')
      expect('  '.trim()).toBe('')
    })

    it('should check string containment', () => {
      expect('hello world'.includes('world')).toBe(true)
      expect('hello world'.includes('xyz')).toBe(false)
      expect(''.includes('')).toBe(true)
    })

    it('should handle Chinese characters', () => {
      const chinese = '你好世界'
      expect(chinese.length).toBe(4)
      expect(chinese.includes('世界')).toBe(true)
      expect(chinese.charAt(0)).toBe('你')
    })
  })

  describe('Array utilities', () => {
    it('should filter correctly', () => {
      const arr = [1, 2, 3, 4, 5]
      expect(arr.filter(n => n > 3)).toEqual([4, 5])
      expect(arr.filter(() => false)).toEqual([])
      expect([].filter(() => true)).toEqual([])
    })

    it('should map correctly', () => {
      const arr = [1, 2, 3]
      expect(arr.map(n => n * 2)).toEqual([2, 4, 6])
      expect([].map(n => n)).toEqual([])
    })

    it('should find correctly', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }]
      expect(arr.find(item => item.id === 2)).toEqual({ id: 2 })
      expect(arr.find(item => item.id === 99)).toBeUndefined()
    })

    it('should handle unique arrays', () => {
      const arr = [1, 2, 2, 3, 3, 3]
      expect([...new Set(arr)]).toEqual([1, 2, 3])
    })
  })

  describe('Number utilities', () => {
    it('should clamp numbers', () => {
      const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should round to decimal places', () => {
      expect(Math.round(3.14159 * 100) / 100).toBe(3.14)
      expect(Math.round(3.14159)).toBe(3)
    })
  })
})
