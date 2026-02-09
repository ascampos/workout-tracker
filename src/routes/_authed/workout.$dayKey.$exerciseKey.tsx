import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { logSetsFn, getHistoryFn } from '@/utils/log-sets'

export const Route = createFileRoute('/_authed/workout/$dayKey/$exerciseKey')({
  validateSearch: () => ({}),
  component: ExercisePage,
})

type SetInput = { weight: string; reps: string; notes: string }

const unit = 'lb'
const SESSION_KEY_PREFIX = 'workout-session-'
const DRAFT_KEY_PREFIX = 'workout-draft-'

function getSessionIdForDay(dayKey: string): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const key = SESSION_KEY_PREFIX + dayKey
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

function readExerciseDraft(dayKey: string, exerciseKey: string): SetInput[] | null {
  try {
    const raw = typeof window !== 'undefined'
      ? sessionStorage.getItem(DRAFT_KEY_PREFIX + dayKey + '-' + exerciseKey)
      : null
    if (!raw) return null
    const parsed = JSON.parse(raw) as SetInput[]
    if (Array.isArray(parsed)) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function writeExerciseDraft(dayKey: string, exerciseKey: string, sets: SetInput[]) {
  try {
    sessionStorage.setItem(
      DRAFT_KEY_PREFIX + dayKey + '-' + exerciseKey,
      JSON.stringify(sets)
    )
  } catch {
    /* ignore */
  }
}

function clearExerciseDraft(dayKey: string, exerciseKey: string) {
  try {
    sessionStorage.removeItem(DRAFT_KEY_PREFIX + dayKey + '-' + exerciseKey)
  } catch {
    /* ignore */
  }
}

function ExercisePage() {
  const { dayKey, exerciseKey } = Route.useParams()
  const template = workoutTemplates[dayKey as WorkoutDayKey]
  const exercise = template?.exercises.find((ex) => ex.exercise_key === exerciseKey)

  const [sessionId] = useState(() => getSessionIdForDay(dayKey))
  const [sets, setSets] = useState<SetInput[]>(() => readExerciseDraft(dayKey, exerciseKey) ?? [])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [lastSet, setLastSet] = useState<{ weight: number; reps: number; notes: string } | null>(null)

  useEffect(() => {
    if (!exercise) return
    writeExerciseDraft(dayKey, exerciseKey, sets)
  }, [dayKey, exerciseKey, exercise, sets])

  useEffect(() => {
    getHistoryFn({ data: { exerciseKey } }).then((history) => {
      const first = history[0]
      if (first) setLastSet({ weight: first.weight, reps: first.reps, notes: first.notes })
      else setLastSet(null)
    })
  }, [exerciseKey])

  function copyLastSet() {
    if (!lastSet) return
    setSets((prev) => [...prev, { weight: String(lastSet.weight), reps: String(lastSet.reps), notes: lastSet.notes }])
  }

  if (!template || !exercise) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown exercise.</p>
      </div>
    )
  }

  const exerciseIndex = template.exercises.findIndex((ex) => ex.exercise_key === exerciseKey)
  const prevExercise = exerciseIndex > 0 ? template.exercises[exerciseIndex - 1] : null
  const nextExercise =
    exerciseIndex >= 0 && exerciseIndex < template.exercises.length - 1
      ? template.exercises[exerciseIndex + 1]
      : null

  function addSet() {
    setSets((prev) => [...prev, { weight: '', reps: '', notes: '' }])
  }

  function updateSet(setIndex: number, field: keyof SetInput, value: string) {
    setSets((prev) => {
      const next = [...prev]
      if (!next[setIndex]) return prev
      next[setIndex] = { ...next[setIndex], [field]: value }
      return next
    })
  }

  function removeSet(setIndex: number) {
    setSets((prev) => prev.filter((_, i) => i !== setIndex))
  }

  async function handleSave() {
    const payload = sets
      .map((s) => {
        const w = parseFloat(s.weight)
        const r = parseFloat(s.reps)
        if (!Number.isFinite(w) || !Number.isFinite(r)) return null
        return {
          exercise_key: exerciseKey,
          weight: w,
          reps: r,
          notes: s.notes.trim() || undefined,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s != null)

    setSaving(true)
    setSaveMessage(null)
    const result = await logSetsFn({
      data: { sessionId, dayKey: template.dayKey, unit, sets: payload },
    })
    setSaving(false)
    if (result.success) {
      clearExerciseDraft(dayKey, exerciseKey)
      setSets([])
      setSaveMessage({ type: 'ok', text: 'Saved.' })
    } else {
      setSaveMessage({ type: 'err', text: result.error ?? 'Save failed' })
    }
  }

  return (
    <div className="w-full min-w-0 max-w-md mx-auto px-4">
      <div className="flex items-center gap-3 mb-4 min-w-0">
        <Link
          to="/workout/$dayKey"
          params={{ dayKey }}
          className="text-gray-400 hover:text-white shrink-0"
          aria-label={`Back to ${template.dayName}`}
        >
          ←
        </Link>
        <h1 className="text-xl font-bold truncate min-w-0">{exercise.exercise_name}</h1>
      </div>

      {lastSet != null && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-gray-400 text-sm">
            Last: {lastSet.weight} {unit} × {lastSet.reps}
          </span>
          <button
            type="button"
            onClick={copyLastSet}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Copy last set
          </button>
        </div>
      )}

      <div className="space-y-2">
        {sets.map((set, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center min-w-0"
          >
            <input
              type="number"
              inputMode="decimal"
              placeholder="Wt"
              value={set.weight}
              onChange={(e) => updateSet(i, 'weight', e.target.value)}
              className="p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 min-w-0 w-full"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Reps"
              value={set.reps}
              onChange={(e) => updateSet(i, 'reps', e.target.value)}
              className="p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 min-w-0 w-full"
            />
            <button
              type="button"
              onClick={() => removeSet(i)}
              className="p-3 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded border border-gray-700 shrink-0 whitespace-nowrap"
              aria-label="Remove set"
            >
              Remove
            </button>
            <input
              type="text"
              placeholder="Notes"
              value={set.notes}
              onChange={(e) => updateSet(i, 'notes', e.target.value)}
              className="p-3 col-span-2 min-w-0 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 w-full"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="w-full min-h-[48px] mt-2 p-3 text-sm rounded border border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
      >
        Add set
      </button>

      <div className="mt-6 space-y-2">
        {saveMessage && (
          <p
            role="alert"
            className={
              saveMessage.type === 'ok'
                ? 'text-green-400 text-center'
                : 'text-red-400 text-center'
            }
          >
            {saveMessage.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full min-h-[48px] p-4 text-lg font-bold rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="mt-6 flex gap-2 justify-between">
        {prevExercise ? (
          <Link
            to="/workout/$dayKey/$exerciseKey"
            params={{ dayKey, exerciseKey: prevExercise.exercise_key }}
            className="p-3 text-sm text-gray-400 hover:text-white"
          >
            ← {prevExercise.exercise_name}
          </Link>
        ) : (
          <span />
        )}
        {nextExercise ? (
          <Link
            to="/workout/$dayKey/$exerciseKey"
            params={{ dayKey, exerciseKey: nextExercise.exercise_key }}
            className="p-3 text-sm text-gray-400 hover:text-white"
          >
            {nextExercise.exercise_name} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
