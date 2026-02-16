/**
 * Shared types for the workout tracker application.
 * Single source of truth — import from here, not from utils files.
 */

/** A set that has been logged — persisted with an id and timestamp. */
export type LoggedSet = {
  id: string
  timestamp: string
  session_id: string
  day_key: string
  exercise_key: string
  weight: number
  reps: number
  notes: string
  unit: string
  updated_at?: string
}

/** A single set entry as submitted from the client. */
export type SetEntry = {
  exercise_key: string
  weight: number
  reps: number
  notes?: string
}

/** A set belonging to a session, enriched with unit and timestamps. */
export type SessionSet = {
  id: string
  weight: number
  reps: number
  notes: string
  unit: string
  timestamp: string
  updated_at?: string
}

export type SessionExercise = {
  exercise_key: string
  exercise_name: string
  sets: SessionSet[]
}

export type SessionSummary = {
  session_id: string
  started_at: string
  day_key: string
  day_name: string
  exercises: SessionExercise[]
}
