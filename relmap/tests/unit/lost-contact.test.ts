import { describe, it, expect } from 'vitest'

// Test the core logic of lost contact detection
// The actual function uses DB queries, so we test the date math

function calculateDaysSince(lastDateStr: string | null, now: Date): number {
  if (!lastDateStr) return 0
  const lastDate = new Date(lastDateStr)
  if (Number.isNaN(lastDate.getTime())) return 0
  lastDate.setHours(0, 0, 0, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((now.getTime() - lastDate.getTime()) / msPerDay)
}

function isLostContact(daysSince: number, months: number): boolean {
  const thresholdDays = months * 30
  return daysSince > thresholdDays
}

function computeLatestDate(dates: (string | null)[]): string | null {
  const valid = dates.filter((d): d is string => d !== null)
  if (valid.length === 0) return null
  return valid.reduce((max, cur) => (cur > max ? cur : max))
}

describe('Lost Contact Detection', () => {
  const now = new Date('2026-07-15')

  it('should calculate days since correctly', () => {
    expect(calculateDaysSince('2026-07-14', now)).toBe(1)
    expect(calculateDaysSince('2026-07-01', now)).toBe(14)
    expect(calculateDaysSince('2026-01-01', now)).toBe(195)
    expect(calculateDaysSince(null, now)).toBe(0)
    expect(calculateDaysSince('invalid', now)).toBe(0)
  })

  it('should detect lost contacts based on threshold', () => {
    expect(isLostContact(91, 3)).toBe(true)  // > 90 days = lost
    expect(isLostContact(90, 3)).toBe(false) // exactly 90 days = not lost
    expect(isLostContact(89, 3)).toBe(false)
    expect(isLostContact(0, 3)).toBe(false)
  })

  it('should compute latest date from candidates', () => {
    expect(computeLatestDate(['2026-01-01', '2026-06-15', '2026-03-01'])).toBe('2026-06-15')
    expect(computeLatestDate(['2026-06-15', '2026-01-01'])).toBe('2026-06-15')
    expect(computeLatestDate([])).toBeNull()
    expect(computeLatestDate([null, '2026-01-01'])).toBe('2026-01-01')
    expect(computeLatestDate([null, null])).toBeNull()
  })

  it('should handle empty array in computeLatestDate', () => {
    expect(computeLatestDate([])).toBeNull()
    expect(computeLatestDate([null])).toBeNull()
    expect(computeLatestDate([null, null, null])).toBeNull()
  })

  it('should return false for negative daysSince', () => {
    expect(isLostContact(-1, 3)).toBe(false)
    expect(isLostContact(-100, 3)).toBe(false)
  })

  it('should use correct threshold for different months', () => {
    expect(isLostContact(30, 1)).toBe(false)
    expect(isLostContact(31, 1)).toBe(true)
    expect(isLostContact(60, 2)).toBe(false)
    expect(isLostContact(61, 2)).toBe(true)
    expect(isLostContact(359, 12)).toBe(false)
    expect(isLostContact(361, 12)).toBe(true)
  })
})
