import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-data',
    getAppPath: () => '/tmp',
    getVersion: () => '1.0.0',
    getName: () => 'relmap',
  },
}))

import { scoreFrequency, scoreRecency } from '../../src/main/ai/intimacy'

describe('scoreFrequency', () => {
  it('returns 0 for count === 0', () => {
    expect(scoreFrequency(0)).toBe(0)
  })

  it('returns 30 for 1-5 interactions', () => {
    expect(scoreFrequency(1)).toBe(30)
    expect(scoreFrequency(3)).toBe(30)
    expect(scoreFrequency(5)).toBe(30)
  })

  it('returns 60 for 6-15 interactions', () => {
    expect(scoreFrequency(6)).toBe(60)
    expect(scoreFrequency(10)).toBe(60)
    expect(scoreFrequency(15)).toBe(60)
  })

  it('returns 80 for 16-30 interactions', () => {
    expect(scoreFrequency(16)).toBe(80)
    expect(scoreFrequency(20)).toBe(80)
    expect(scoreFrequency(30)).toBe(80)
  })

  it('returns 100 for 30+ interactions', () => {
    expect(scoreFrequency(31)).toBe(100)
    expect(scoreFrequency(50)).toBe(100)
    expect(scoreFrequency(999)).toBe(100)
  })
})

describe('scoreRecency', () => {
  it('returns 0 for null/empty/invalid dates', () => {
    expect(scoreRecency(null)).toBe(0)
    expect(scoreRecency('')).toBe(0)
    expect(scoreRecency('not-a-date')).toBe(0)
  })

  it('returns 100 for within 7 days', () => {
    const today = new Date()
    expect(scoreRecency(today.toISOString().slice(0, 10))).toBe(100)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    expect(scoreRecency(yesterday.toISOString().slice(0, 10))).toBe(100)

    const sixDaysAgo = new Date(today)
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
    expect(scoreRecency(sixDaysAgo.toISOString().slice(0, 10))).toBe(100)
  })

  it('returns 80 for 8-30 days', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() - 10)
    expect(scoreRecency(d.toISOString().slice(0, 10))).toBe(80)
  })

  it('returns 60 for 31-90 days', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() - 60)
    expect(scoreRecency(d.toISOString().slice(0, 10))).toBe(60)
  })

  it('returns 30 for 91-180 days', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() - 150)
    expect(scoreRecency(d.toISOString().slice(0, 10))).toBe(30)
  })

  it('returns 10 for 180+ days', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() - 365)
    expect(scoreRecency(d.toISOString().slice(0, 10))).toBe(10)
  })
})
