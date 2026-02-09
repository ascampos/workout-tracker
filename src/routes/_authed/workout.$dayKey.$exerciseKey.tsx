import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { logSetsFn, getHistoryFn } from '@/utils/log-sets'

// Standard gym weight increments (in lb)
const WEIGHT_PRESETS = [
  2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150,
  155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250,
  255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350,
  360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500
]

const REPS_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30]

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

type ModalState = { type: 'weight' | 'reps'; setIndex: number } | null

function SelectModal({
  isOpen,
  onClose,
  title,
  values,
  onSelect,
  currentValue,
  inputMode = 'decimal',
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  values: number[]
  onSelect: (value: number) => void
  currentValue?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  const [customValue, setCustomValue] = useState('')

  // Clear custom input when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomValue('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const current = currentValue ? parseFloat(currentValue) : null

  const handleCustomSubmit = () => {
    const val = parseFloat(customValue)
    if (Number.isFinite(val) && val > 0) {
      onSelect(val)
      setCustomValue('')
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Custom input */}
          <div className="pb-4 border-b border-gray-700">
            <label className="block text-sm text-gray-400 mb-2">Custom value:</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode={inputMode}
                placeholder="Enter value"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomSubmit()
                  }
                }}
                className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customValue}
                className="px-4 py-3 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Set
              </button>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onSelect(value)
                  onClose()
                }}
                className={`p-3 rounded border text-center font-medium transition-colors ${
                  current === value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
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
  const [heaviestSet, setHeaviestSet] = useState<{ weight: number; reps: number; daysAgo: number } | null>(null)
  const [frequency, setFrequency] = useState<number | null>(null)
  const [modalState, setModalState] = useState<ModalState>(null)

  useEffect(() => {
    if (!exercise) return
    writeExerciseDraft(dayKey, exerciseKey, sets)
  }, [dayKey, exerciseKey, exercise, sets])

  useEffect(() => {
    getHistoryFn({ data: { exerciseKey } }).then((history) => {
      const first = history[0]
      if (first) setLastSet({ weight: first.weight, reps: first.reps, notes: first.notes })
      else setLastSet(null)

      // Calculate heaviest set
      if (history.length > 0) {
        const heaviest = history.reduce((max, curr) => curr.weight > max.weight ? curr : max, history[0])
        const heaviestDate = new Date(heaviest.timestamp)
        const now = new Date()
        const diffMs = now.getTime() - heaviestDate.getTime()
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        setHeaviestSet({ weight: heaviest.weight, reps: heaviest.reps, daysAgo })
      } else {
        setHeaviestSet(null)
      }

      // Calculate frequency (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSessions = new Set<string>()
      for (const entry of history) {
        const entryDate = new Date(entry.timestamp)
        if (entryDate >= thirtyDaysAgo) {
          recentSessions.add(entry.session_id)
        }
      }
      setFrequency(recentSessions.size)
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

      {/* Stats section */}
      {(heaviestSet != null || frequency != null) && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* Heaviest set */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Heaviest Set</div>
            {heaviestSet ? (
              <>
                <div className="text-3xl font-bold text-white mb-1">
                  {heaviestSet.weight} <span className="text-lg text-gray-400">{unit}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {heaviestSet.reps} reps · {heaviestSet.daysAgo === 0 ? 'today' : `${heaviestSet.daysAgo} day${heaviestSet.daysAgo === 1 ? '' : 's'} ago`}
                </div>
              </>
            ) : (
              <div className="text-gray-500">No data</div>
            )}
          </div>

          {/* Frequency */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Frequency</div>
            {frequency != null ? (
              <>
                <div className="text-3xl font-bold text-white mb-1">{frequency}</div>
                <div className="text-sm text-gray-400">sessions in 30 days</div>
              </>
            ) : (
              <div className="text-gray-500">No data</div>
            )}
          </div>
        </div>
      )}

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
            <button
              type="button"
              onClick={() => setModalState({ type: 'weight', setIndex: i })}
              className={`p-3 rounded border text-left min-w-0 w-full ${
                set.weight
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
              }`}
            >
              {set.weight ? `${set.weight} ${unit}` : 'Weight'}
            </button>
            <button
              type="button"
              onClick={() => setModalState({ type: 'reps', setIndex: i })}
              className={`p-3 rounded border text-left min-w-0 w-full ${
                set.reps
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
              }`}
            >
              {set.reps ? `${set.reps} reps` : 'Reps'}
            </button>
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

      {/* Weight Selection Modal */}
      <SelectModal
        isOpen={modalState?.type === 'weight'}
        onClose={() => setModalState(null)}
        title={`Select Weight (${unit})`}
        values={WEIGHT_PRESETS}
        onSelect={(value) => {
          if (modalState?.setIndex != null) {
            updateSet(modalState.setIndex, 'weight', String(value))
          }
        }}
        currentValue={modalState?.setIndex != null ? sets[modalState.setIndex]?.weight : undefined}
      />

      {/* Reps Selection Modal */}
      <SelectModal
        isOpen={modalState?.type === 'reps'}
        onClose={() => setModalState(null)}
        title="Select Reps"
        values={REPS_PRESETS}
        onSelect={(value) => {
          if (modalState?.setIndex != null) {
            updateSet(modalState.setIndex, 'reps', String(value))
          }
        }}
        currentValue={modalState?.setIndex != null ? sets[modalState.setIndex]?.reps : undefined}
        inputMode="numeric"
      />
    </div>
  )
}
