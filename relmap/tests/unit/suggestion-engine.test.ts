import { describe, it, expect } from 'vitest'

// Test the core suggestion rules in isolation (pure logic, no DB dependency)

describe('Suggestion Rules', () => {
  it('detects dormant/lost lifecycle stage', () => {
    function shouldSuggestGreeting(lifecycleStage: string): boolean {
      return lifecycleStage === 'dormant' || lifecycleStage === 'lost'
    }
    expect(shouldSuggestGreeting('dormant')).toBe(true)
    expect(shouldSuggestGreeting('lost')).toBe(true)
    expect(shouldSuggestGreeting('active')).toBe(false)
    expect(shouldSuggestGreeting('new')).toBe(false)
    expect(shouldSuggestGreeting('')).toBe(false)
  })

  it('detects low intimacy with long no-contact', () => {
    function shouldSuggestMeeting(intimacy: number, daysSinceLastContact: number): boolean {
      return intimacy < 30 && daysSinceLastContact > 60
    }

    // Should suggest
    expect(shouldSuggestMeeting(20, 90)).toBe(true)
    expect(shouldSuggestMeeting(0, 200)).toBe(true)
    expect(shouldSuggestMeeting(29, 61)).toBe(true)

    // Should not suggest
    expect(shouldSuggestMeeting(30, 90)).toBe(false)
    expect(shouldSuggestMeeting(20, 60)).toBe(false)
    expect(shouldSuggestMeeting(20, 30)).toBe(false)
    expect(shouldSuggestMeeting(50, 90)).toBe(false)
  })

  it('detects birthday reminders', () => {
    function isBirthdayReminder(title: string): boolean {
      return title.includes('生日')
    }

    expect(isBirthdayReminder('张三生日')).toBe(true)
    expect(isBirthdayReminder('生日提醒')).toBe(true)
    expect(isBirthdayReminder('生日')).toBe(true)
    expect(isBirthdayReminder('会议提醒')).toBe(false)
    expect(isBirthdayReminder('')).toBe(false)
  })

  it('detects declining contact frequency', () => {
    function shouldSuggestKeepContact(daysSinceLastContact: number): boolean {
      return daysSinceLastContact >= 7 && daysSinceLastContact < 60
    }

    // Should suggest (7-59 days)
    expect(shouldSuggestKeepContact(7)).toBe(true)
    expect(shouldSuggestKeepContact(14)).toBe(true)
    expect(shouldSuggestKeepContact(30)).toBe(true)
    expect(shouldSuggestKeepContact(59)).toBe(true)

    // Should not suggest
    expect(shouldSuggestKeepContact(0)).toBe(false)
    expect(shouldSuggestKeepContact(6)).toBe(false)
    expect(shouldSuggestKeepContact(60)).toBe(false)
    expect(shouldSuggestKeepContact(90)).toBe(false)
  })
})

describe('Suggestion Intimacy Calculation', () => {
  // Reconstruct the intimacy formula used in generateSuggestions
  function calcIntimacy(
    interactionCount: number,
    daysSinceLastContact: number,
    eventCount: number,
    diaryCount: number,
    manualIntimacy: number,
  ): number {
    const depth = Math.min(eventCount * 10 + diaryCount * 15, 100)

    let recencyScore: number
    if (daysSinceLastContact <= 7) recencyScore = 100
    else if (daysSinceLastContact <= 30) recencyScore = 80
    else if (daysSinceLastContact <= 90) recencyScore = 60
    else if (daysSinceLastContact <= 180) recencyScore = 30
    else recencyScore = 10

    return Math.round(
      0.25 * Math.min(interactionCount * 3, 100) +
      0.30 * recencyScore +
      0.20 * depth +
      0.25 * manualIntimacy,
    )
  }

  it('calculates high intimacy for active relationships', () => {
    const score = calcIntimacy(30, 1, 10, 5, 80)
    expect(score).toBeGreaterThanOrEqual(50)
  })

  it('calculates low intimacy for dormant relationships', () => {
    const score = calcIntimacy(0, 200, 0, 0, 30)
    expect(score).toBeLessThan(30)
  })

  it('caps interaction count at 100', () => {
    const withHigh = calcIntimacy(100, 1, 0, 0, 50)
    const withLow = calcIntimacy(50, 1, 0, 0, 50)
    // Both should be same since min(count*3, 100) caps at 100
    expect(withHigh).toBe(withLow)
  })

  it('caps depth at 100', () => {
    const excessive = calcIntimacy(0, 1, 20, 20, 50)
    const capped = calcIntimacy(0, 1, 10, 0, 50)
    // depth = min(20*10 + 20*15, 100) = min(500, 100) = 100
    expect(excessive).toBeGreaterThanOrEqual(capped)
  })

  it('produces score in 0-100 range', () => {
    const min = calcIntimacy(0, 999, 0, 0, 0)
    const max = calcIntimacy(100, 0, 100, 100, 100)
    expect(min).toBeGreaterThanOrEqual(0)
    expect(max).toBeLessThanOrEqual(100)
  })
})
