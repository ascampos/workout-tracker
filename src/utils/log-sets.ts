import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '@/utils/session'
import { appendSetLogRows, getSetLogHistory, getAllSetLogRows, updateSetLogById, deleteSetLogById } from '@/utils/sheets'
import { workoutTemplates } from '@/data/templates'
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

export type HistoryEntry = { id: string; timestamp: string; session_id: string; weight: number; reps: number; notes: string; updated_at?: string }

export const getHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { exerciseKey: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.authenticated) return []
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (!spreadsheetId || !data?.exerciseKey) return []
    const rows = await getSetLogHistory(spreadsheetId, data.exerciseKey, 50)
    return rows.map((r): HistoryEntry => ({ id: r.id, timestamp: r.timestamp, session_id: r.session_id, weight: r.weight, reps: r.reps, notes: r.notes, updated_at: r.updated_at }))
  })

const exerciseKeyToName = (() => {
  const m = new Map<string, string>()
  for (const t of Object.values(workoutTemplates)) {
    for (const ex of t.exercises) {
      if (!m.has(ex.exercise_key)) m.set(ex.exercise_key, ex.exercise_name)
    }
  }
  return m
})()

export type SessionSet = { id: string; weight: number; reps: number; notes: string; unit: string; timestamp: string; updated_at?: string }
export type SessionExercise = { exercise_key: string; exercise_name: string; sets: SessionSet[] }
export type SessionSummary = {
  session_id: string
  started_at: string
  day_key: string
  day_name: string
  exercises: SessionExercise[]
}

export const getSessionHistoryFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await useAppSession()
    if (!session.data.authenticated) return { sessions: [] as SessionSummary[] }
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (!spreadsheetId) return { sessions: [] }
    const rows = await getAllSetLogRows(spreadsheetId, 500)
    const bySession = new Map<string, typeof rows>()
    for (const r of rows) {
      const id = r.session_id || r.timestamp
      const list = bySession.get(id) ?? []
      list.push(r)
      bySession.set(id, list)
    }
    const dayNames: Record<string, string> = {}
    for (const [k, t] of Object.entries(workoutTemplates)) {
      dayNames[k] = t.dayName
    }
    const sessions: SessionSummary[] = []
    for (const [sessionId, sessionRows] of bySession.entries()) {
      const byExercise = new Map<string, SessionSet[]>()
      const started_at = sessionRows[0]?.timestamp ?? ''
      for (const r of sessionRows) {
        const sets = byExercise.get(r.exercise_key) ?? []
        const newSet: SessionSet = {
          id: r.id,
          weight: r.weight,
          reps: r.reps,
          notes: r.notes,
          unit: r.unit || 'lb',
          timestamp: r.timestamp,
          updated_at: r.updated_at,
        }
        sets.push(newSet)
        byExercise.set(r.exercise_key, sets)
      }
      const day_key = sessionRows[0]?.day_key ?? ''

      const exercises: SessionExercise[] = []
      for (const [exKey, sets] of byExercise.entries()) {
        // Sort sets by timestamp (oldest first - chronological order)
        sets.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        exercises.push({
          exercise_key: exKey,
          exercise_name: exerciseKeyToName.get(exKey) ?? exKey.replace(/_/g, ' '),
          sets: sets,
        })
      }

      // Sort exercises by when they were first performed (using first set's timestamp)
      exercises.sort((a, b) =>
        (a.sets[0]?.timestamp ?? '').localeCompare(b.sets[0]?.timestamp ?? '')
      )
      sessions.push({
        session_id: sessionId,
        started_at,
        day_key,
        day_name: dayNames[day_key] ?? day_key,
        exercises,
      })
    }
    sessions.sort((a, b) => b.started_at.localeCompare(a.started_at))
    return { sessions }
  })

export type UpdateSetPayload = {
  id: string
  weight?: number
  reps?: number
  notes?: string
}

export const updateSetFn = createServerFn({ method: 'POST' })
  .inputValidator((d: UpdateSetPayload) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.authenticated) {
      return { success: false as const, error: 'Not authenticated' }
    }

    if (!data.id || typeof data.id !== 'string') {
      return { success: false as const, error: 'Missing id' }
    }

    // Validate that at least one field is being updated
    if (data.weight === undefined && data.reps === undefined && data.notes === undefined) {
      return { success: false as const, error: 'No fields to update' }
    }

    // Validate numbers if provided
    if (data.weight !== undefined && (!Number.isFinite(data.weight) || data.weight < 0)) {
      return { success: false as const, error: 'Invalid weight' }
    }
    if (data.reps !== undefined && (!Number.isFinite(data.reps) || data.reps < 0)) {
      return { success: false as const, error: 'Invalid reps' }
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (!spreadsheetId) {
      return { success: false as const, error: 'Spreadsheet not configured' }
    }

    try {
      const updates: Partial<Pick<import('@/utils/sheets').HistoryRow, 'weight' | 'reps' | 'notes'>> = {}
      if (data.weight !== undefined) updates.weight = data.weight
      if (data.reps !== undefined) updates.reps = data.reps
      if (data.notes !== undefined) updates.notes = data.notes

      await updateSetLogById(spreadsheetId, data.id, updates)
      return { success: true as const }
    } catch (err) {
      return {
        success: false as const,
        error: err instanceof Error ? err.message : 'Failed to update set',
      }
    }
  })

export type DeleteSetPayload = {
  id: string
}

export const deleteSetFn = createServerFn({ method: 'POST' })
  .inputValidator((d: DeleteSetPayload) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    if (!session.data.authenticated) {
      return { success: false as const, error: 'Not authenticated' }
    }

    if (!data.id || typeof data.id !== 'string') {
      return { success: false as const, error: 'Missing id' }
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    if (!spreadsheetId) {
      return { success: false as const, error: 'Spreadsheet not configured' }
    }

    try {
      await deleteSetLogById(spreadsheetId, data.id)
      return { success: true as const }
    } catch (err) {
      return {
        success: false as const,
        error: err instanceof Error ? err.message : 'Failed to delete set',
      }
    }
  })
