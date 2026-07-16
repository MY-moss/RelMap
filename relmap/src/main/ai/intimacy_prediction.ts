import { getDb } from '../db/connection'
import type { Result, IntimacyPrediction } from '../../shared/types'
import { calculateIntimacy } from './intimacy'

function scoreRecency(lastDateStr: string | null): number {
  if (!lastDateStr) return 0
  const lastDate = new Date(lastDateStr)
  if (Number.isNaN(lastDate.getTime())) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  lastDate.setHours(0, 0, 0, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / msPerDay)
  if (daysSince <= 7) return 100
  if (daysSince <= 30) return 80
  if (daysSince <= 90) return 60
  if (daysSince <= 180) return 30
  return 10
}

export function predictIntimacyTrend(personId: string): Result<IntimacyPrediction> {
  try {
    const db = getDb()

    const current = calculateIntimacy(personId)
    if (!current.success) {
      return { success: false, error: current.error }
    }
    const currentScore = current.data.total

    const logs = db
      .prepare(`
        SELECT interact_at FROM interaction_logs
        WHERE person_id = ?
        ORDER BY interact_at ASC
      `)
      .all(personId) as { interact_at: string }[]

    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    if (logs.length < 2) {
      const lastDateStr = logs.length === 1 ? logs[0].interact_at : null
      const daysSince = lastDateStr
        ? Math.floor((now.getTime() - new Date(lastDateStr).getTime()) / msPerDay)
        : 999

      const predicted30d = scoreRecency(
        new Date(now.getTime() + 30 * msPerDay).toISOString().slice(0, 10)
      )
      const predicted90d = scoreRecency(
        new Date(now.getTime() + 90 * msPerDay).toISOString().slice(0, 10)
      )

      return {
        success: true,
        data: {
          currentScore,
          predictedScore30d: predicted30d,
          predictedScore90d: predicted90d,
          trend: daysSince > 90 ? 'down' : 'stable',
          confidence: 30,
        },
      }
    }

    const timestamps = logs.map((l) => new Date(l.interact_at).getTime())

    const xValues = timestamps.map((_t, i) => i)
    const yValues = timestamps.map((t) => t)

    const n = xValues.length
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0)
    const sumXX = xValues.reduce((s, x) => s + x * x, 0)

    const denominator = n * sumXX - sumX * sumX
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
    const intercept = (sumY - slope * sumX) / n

    const lastInteractionTime = timestamps[timestamps.length - 1]

    const predictedNext30d = slope * (n + 1) + intercept
    const daysToNext30 = (predictedNext30d - lastInteractionTime) / msPerDay

    const predictedNext90d = slope * (n + 3) + intercept
    const daysToNext90 = (predictedNext90d - lastInteractionTime) / msPerDay

    const intervals: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push((timestamps[i] - timestamps[i - 1]) / msPerDay)
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

    const daysSinceLast = Math.floor((now.getTime() - lastInteractionTime) / msPerDay)

    const trend = daysSinceLast > avgInterval * 1.5 ? 'down' : avgInterval > 30 ? 'stable' : 'up'

    const predictedScore30d = scoreRecency(
      new Date(now.getTime() + Math.max(0, daysToNext30) * msPerDay).toISOString().slice(0, 10)
    )
    const predictedScore90d = scoreRecency(
      new Date(now.getTime() + Math.max(0, daysToNext90) * msPerDay).toISOString().slice(0, 10)
    )

    const rSquared = (() => {
      const yMean = sumY / n
      const ssRes = yValues.reduce((s, y, i) => {
        const yPred = slope * xValues[i] + intercept
        return s + (y - yPred) ** 2
      }, 0)
      const ssTot = yValues.reduce((s, y) => s + (y - yMean) ** 2, 0)
      return ssTot === 0 ? 0 : 1 - ssRes / ssTot
    })()

    const rawConfidence = Math.min(Math.abs(rSquared) * 100 + 20 + Math.min(logs.length, 50), 95)
    const confidence = Math.round(rawConfidence)

    return {
      success: true,
      data: {
        currentScore,
        predictedScore30d,
        predictedScore90d,
        trend,
        confidence,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
