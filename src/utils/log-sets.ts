import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '@/utils/session'
import { appendSetLogRows, getSetLogHistory } from '@/utils/sheets'
import type { WorkoutDayKey } from '@/data/templates'

export type SetEntry = {
  exercise_key: string
  weight: number
  reps: number
  notes?: string
}

export type LogSetsPayload = {
  sessionId: string
  dayKey: WorkoutDayKey
  unit: string
  sets: SetEntry[]
}

const validDayKeys: WorkoutDayKey[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b']

export const logSetsFn = createServerFn({ method: 'POST' })
  .inputValidator((d: LogSetsPayload) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.authenticated) {
      return { success: false as const, error: 'Not authenticated' }
    }
    if (!data.sessionId || typeof data.sessionId !== 'string') {
      return { success: false as const, error: 'Missing sessionId' }
    }
    if (!validDayKeys.includes(data.dayKey)) {
      return { success: false as const, error: 'Invalid dayKey' }
    }
    if (!Array.isArray(data.sets)) {
      return { success: false as const, error: 'Invalid sets' }
    }
    for (const s of data.sets) {
      if (typeof s.exercise_key !== 'string' || typeof s.weight !== 'number' || typeof s.reps !== 'number') {
        return { success: false as const, error: 'Invalid set entry' }
      }
    }
    const timestamp = new Date().toISOString()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (spreadsheetId) {
      try {
        await appendSetLogRows(
          spreadsheetId,
          data.sets.map((s) => ({
            timestamp,
            session_id: data.sessionId,
            day_key: data.dayKey,
            exercise_key: s.exercise_key,
            weight: s.weight,
            reps: s.reps,
            notes: s.notes ?? '',
            unit: data.unit,
          }))
        )
      } catch (err) {
        return {
          success: false as const,
          error: err instanceof Error ? err.message : 'Failed to save to sheet',
        }
      }
    }
    return { success: true as const }
  })

export type HistoryEntry = { timestamp: string; session_id: string; weight: number; reps: number; notes: string }

export const getHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { exerciseKey: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.authenticated) return []
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (!spreadsheetId || !data?.exerciseKey) return []
    const rows = await getSetLogHistory(spreadsheetId, data.exerciseKey, 50)
    return rows.map((r): HistoryEntry => ({ timestamp: r.timestamp, session_id: r.session_id, weight: r.weight, reps: r.reps, notes: r.notes }))
  })
