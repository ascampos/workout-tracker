import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { workoutTemplates, findExerciseInTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { logSetsFn } from '@/utils/log-sets'
import type { LoggedSet } from '@/types'
import { detectPR } from '@/utils/fitness'
import { SelectModal } from '@/components/select-modal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { historyQuery, queryKeys } from '@/lib/queries'
import { getSessionIdForDay } from '@/utils/session-id'

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

type SetInput = { weight: string; reps: string; notes: string; is_warmup: boolean }

const unit = 'lb'
const DRAFT_KEY_PREFIX = 'workout-draft-'

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

function formatRestTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}


type ModalState = { type: 'weight' | 'reps'; setIndex: number } | null

function adjustWeight(current: string, delta: number): string {
  const n = parseFloat(current)
  const base = Number.isFinite(n) ? n : 0
  const result = Math.max(0, base + delta)
  // Keep one decimal place only if needed
  return result % 1 === 0 ? String(result) : result.toFixed(1)
}

function ExercisePage() {
  const { dayKey, exerciseKey } = Route.useParams()
  const sessionTemplate = workoutTemplates[dayKey as WorkoutDayKey]
  const found = findExerciseInTemplates(exerciseKey)
  const template = found?.template ?? sessionTemplate
  const exercise = found?.exercise ?? sessionTemplate?.exercises.find((ex) => ex.exercise_key === exerciseKey)

  const [sessionId] = useState(() => getSessionIdForDay(dayKey))
  const [sets, setSets] = useState<SetInput[]>(() => readExerciseDraft(dayKey, exerciseKey) ?? [])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [modalState, setModalState] = useState<ModalState>(null)
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [restRemaining, setRestRemaining] = useState(0)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queryClient = useQueryClient()

  const { data: history = [] } = useQuery(historyQuery(exerciseKey))

  const previousWorkouts = useMemo(() => {
    if (history.length === 0) return []
    const bySession = new Map<string, LoggedSet[]>()
    for (const entry of history) {
      const list = bySession.get(entry.session_id) ?? []
      list.push(entry)
      bySession.set(entry.session_id, list)
    }
    const sessionGroups = Array.from(bySession.values())
      .filter((group) => group[0] && group[0].session_id !== sessionId)
      .sort((a, b) => (b[0]?.timestamp ?? '').localeCompare(a[0]?.timestamp ?? ''))
    return sessionGroups.map((group) => {
      const sortedSets = [...group].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const dateLabel = new Date(sortedSets[0].timestamp).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
      return { date: dateLabel, sets: sortedSets }
    })
  }, [history, sessionId])

  const lastWorkout = previousWorkouts[0] ?? null

  const heaviestSet = useMemo(() => {
    const working = history.filter((s) => !s.is_warmup)
    if (working.length === 0) return null
    const heaviest = working.reduce((max, curr) => (curr.weight > max.weight ? curr : max), working[0])
    const daysAgo = Math.floor((Date.now() - new Date(heaviest.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    return { weight: heaviest.weight, reps: heaviest.reps, daysAgo }
  }, [history])

  const frequency = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentSessions = new Set(
      history.filter((e) => new Date(e.timestamp) >= thirtyDaysAgo).map((e) => e.session_id)
    )
    return recentSessions.size
  }, [history])

  // Resolve superset partner
  const supersetPartner = useMemo(() => {
    if (!exercise?.superset_partner_key || !template) return null
    const partner = template.exercises.find((ex) => ex.exercise_key === exercise.superset_partner_key)
    return partner ?? null
  }, [exercise, template])

  // Rest timer effect
  useEffect(() => {
    if (restEnd === null) {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000))
      setRestRemaining(remaining)
      if (remaining === 0) {
        setRestEnd(null)
        if (restIntervalRef.current) clearInterval(restIntervalRef.current)
      }
    }
    tick()
    restIntervalRef.current = setInterval(tick, 500)
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [restEnd])

  useEffect(() => {
    if (!exercise) return
    writeExerciseDraft(dayKey, exerciseKey, sets)
  }, [dayKey, exerciseKey, exercise, sets])

  if (!template || !exercise) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown exercise.</p>
      </div>
    )
  }

  const exerciseIndex = found?.exerciseIndex ?? template.exercises.findIndex((ex) => ex.exercise_key === exerciseKey) ?? -1
  const prevExercise = template && exerciseIndex > 0 ? template.exercises[exerciseIndex - 1] : null
  const nextExercise =
    template && exerciseIndex >= 0 && exerciseIndex < template.exercises.length - 1
      ? template.exercises[exerciseIndex + 1]
      : null

  function addSet() {
    setSets((prev) => {
      // Auto-fill: first set gets last session's first working set; subsequent sets get the previous set
      let defaultWeight = ''
      let defaultReps = ''
      const isFirst = prev.length === 0
      if (isFirst && lastWorkout) {
        const firstWorking = lastWorkout.sets.find((s) => !s.is_warmup)
        if (firstWorking) {
          defaultWeight = String(firstWorking.weight)
          defaultReps = String(firstWorking.reps)
        }
      } else if (prev.length > 0) {
        const last = prev[prev.length - 1]
        defaultWeight = last.weight
        defaultReps = last.reps
      }
      return [...prev, { weight: defaultWeight, reps: defaultReps, notes: '', is_warmup: false }]
    })
  }

  function loadLastSession() {
    if (!lastWorkout) return
    setSets(lastWorkout.sets.map((s) => ({
      weight: String(s.weight),
      reps: String(s.reps),
      notes: s.notes,
      is_warmup: s.is_warmup ?? false,
    })))
  }

  function updateSet(setIndex: number, field: keyof SetInput, value: string | boolean) {
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

  function startRestTimer() {
    const seconds = exercise?.rest_seconds ?? 150
    setRestEnd(Date.now() + seconds * 1000)
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
          is_warmup: s.is_warmup,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s != null)

    // Check for PR before saving (using current history snapshot)
    const isPR = detectPR(payload, history)

    setSaving(true)
    setSaveMessage(null)
    const result = await logSetsFn({
      data: { sessionId, dayKey: dayKey as WorkoutDayKey, unit, sets: payload },
    })
    setSaving(false)
    if (result.success) {
      clearExerciseDraft(dayKey, exerciseKey)
      setSets([])
      setSaveMessage({ type: 'ok', text: isPR ? 'Saved. New PR! 🏆' : 'Saved.' })
      startRestTimer()
      queryClient.invalidateQueries({ queryKey: queryKeys.history(exerciseKey) })
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
    } else {
      setSaveMessage({ type: 'err', text: result.error ?? 'Save failed' })
    }
  }

  return (
    <div className="w-full min-w-0 max-w-md mx-auto px-4 pb-24">
      <div className="flex items-center gap-3 mb-4 min-w-0">
        <Link
          to="/workout/$dayKey"
          params={{ dayKey }}
          search={{ template: found && found.template.dayKey !== dayKey ? found.template.dayKey : (dayKey as WorkoutDayKey) }}
          className="text-gray-400 hover:text-white shrink-0"
          aria-label={`Back to ${sessionTemplate?.dayName ?? template.dayName}`}
        >
          ←
        </Link>
        <h1 className="text-xl font-bold truncate min-w-0">{exercise.exercise_name}</h1>
      </div>

      {/* Superset quick-jump */}
      {supersetPartner && (
        <Link
          to="/workout/$dayKey/$exerciseKey"
          params={{ dayKey, exerciseKey: supersetPartner.exercise_key }}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded border border-gray-700 bg-gray-800 text-blue-400 text-sm hover:bg-gray-700 w-full"
        >
          <span className="text-gray-500">Superset</span>
          <span>⇄</span>
          <span>{supersetPartner.exercise_name}</span>
          <span className="ml-auto text-gray-500">→</span>
        </Link>
      )}

      {/* Stats section */}
      {(heaviestSet != null || frequency != null) && (
        <div className="mb-6 grid grid-cols-2 gap-4">
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

      {/* Set list */}
      <div className="space-y-3">
        {sets.map((set, i) => (
          <div
            key={i}
            className={`rounded border p-2 space-y-2 ${set.is_warmup ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-gray-700 bg-gray-800/30'}`}
          >
            {/* Row 1: warmup toggle + weight stepper + reps + remove */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Warmup toggle */}
              <button
                type="button"
                onClick={() => updateSet(i, 'is_warmup', !set.is_warmup)}
                className={`shrink-0 px-2 py-1.5 rounded text-xs font-medium border ${
                  set.is_warmup
                    ? 'bg-yellow-600/80 border-yellow-600 text-yellow-100'
                    : 'bg-gray-700 border-gray-600 text-gray-400'
                }`}
                title="Toggle warmup set"
              >
                W
              </button>

              {/* Weight: stepper + tap-for-modal */}
              <div className="flex items-center min-w-0 flex-1 rounded border border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => updateSet(i, 'weight', adjustWeight(set.weight, -5))}
                  className="px-2 py-2 text-gray-400 hover:text-white hover:bg-gray-700 text-sm shrink-0"
                >
                  −5
                </button>
                <button
                  type="button"
                  onClick={() => setModalState({ type: 'weight', setIndex: i })}
                  className={`flex-1 py-2 text-center text-sm min-w-0 ${
                    set.weight ? 'text-white' : 'text-gray-500'
                  } ${set.is_warmup ? 'text-yellow-200/70' : ''}`}
                >
                  {set.weight ? `${set.weight} ${unit}` : 'Weight'}
                </button>
                <button
                  type="button"
                  onClick={() => updateSet(i, 'weight', adjustWeight(set.weight, 5))}
                  className="px-2 py-2 text-gray-400 hover:text-white hover:bg-gray-700 text-sm shrink-0"
                >
                  +5
                </button>
              </div>

              {/* Reps */}
              <button
                type="button"
                onClick={() => setModalState({ type: 'reps', setIndex: i })}
                className={`shrink-0 w-16 py-2 rounded border text-center text-sm ${
                  set.reps
                    ? `border-gray-700 ${set.is_warmup ? 'text-yellow-200/70' : 'text-white'}`
                    : 'border-gray-700 text-gray-500'
                } bg-transparent`}
              >
                {set.reps ? `${set.reps}r` : 'Reps'}
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeSet(i)}
                className="shrink-0 px-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded border border-gray-700"
                aria-label="Remove set"
              >
                ✕
              </button>
            </div>

            {/* Row 2: fine steppers + notes */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateSet(i, 'weight', adjustWeight(set.weight, -2.5))}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded border border-gray-700"
                >
                  −2.5
                </button>
                <button
                  type="button"
                  onClick={() => updateSet(i, 'weight', adjustWeight(set.weight, 2.5))}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded border border-gray-700"
                >
                  +2.5
                </button>
              </div>
              <input
                type="text"
                placeholder="Notes"
                value={set.notes}
                onChange={(e) => updateSet(i, 'notes', e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 text-sm rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="w-full min-h-[48px] mt-3 p-3 text-sm rounded border border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
      >
        + Add set
      </button>

      {/* Load last session button */}
      {lastWorkout && sets.length === 0 && (
        <button
          type="button"
          onClick={loadLastSession}
          className="w-full mt-2 p-2 text-sm text-blue-400 hover:text-blue-300 border border-gray-700 rounded hover:bg-gray-800"
        >
          Load last time ({lastWorkout.sets.length} sets · {lastWorkout.date})
        </button>
      )}

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

      {previousWorkouts.length > 0 && (
        <section className="mt-8 border-t border-gray-800 pt-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Previous workouts (swipe)</h2>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {previousWorkouts.map((workout, i) => (
              <div
                key={i}
                className="shrink-0 snap-center w-[calc(100%-1rem)] min-w-[260px] max-w-[320px] rounded-lg border border-gray-700 bg-gray-800/30 p-4"
              >
                <p className="text-sm font-semibold text-gray-200 mb-3">{workout.date}</p>
                <div className="flex flex-col gap-1">
                  {workout.sets.map((set, index) => (
                    <div
                      key={set.id}
                      className={`inline-flex items-center justify-between rounded px-3 py-2 text-sm ${
                        set.is_warmup ? 'bg-yellow-900/20 text-yellow-200/60' : 'bg-gray-800/80 text-gray-200'
                      }`}
                    >
                      <span className={`text-xs mr-2 ${set.is_warmup ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {set.is_warmup ? 'W' : `Set ${index + 1}`}
                      </span>
                      <span className="flex-1 text-right">
                        {set.weight} {unit} × {set.reps}
                        {set.notes ? (
                          <span className="ml-1.5 text-gray-400 text-xs">({set.notes})</span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* Rest timer floating pill */}
      {restEnd !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={() => setRestEnd(null)}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-gray-800 border border-gray-600 text-white shadow-lg hover:bg-gray-700"
          >
            <span className="text-gray-400 text-sm">Rest</span>
            <span className="text-xl font-mono font-bold tabular-nums">
              {formatRestTime(restRemaining)}
            </span>
            <span className="text-gray-500 text-xs">tap to dismiss</span>
          </button>
        </div>
      )}
    </div>
  )
}
