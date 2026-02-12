import { useState } from 'react'
import type { SessionSummary, SessionSet } from '@/utils/log-sets'

export function formatSessionDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) {
    return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function EditSetModal({
  set,
  onClose,
  onSave,
}: {
  set: SessionSet
  onClose: () => void
  onSave: (id: string, weight: number, reps: number, notes: string) => Promise<void>
}) {
  const [weight, setWeight] = useState(set.weight.toString())
  const [reps, setReps] = useState(set.reps.toString())
  const [notes, setNotes] = useState(set.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightNum = parseFloat(weight)
    const repsNum = parseInt(reps, 10)

    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setError('Weight must be a positive number')
      return
    }
    if (!Number.isFinite(repsNum) || repsNum <= 0) {
      setError('Reps must be a positive number')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(set.id, weightNum, repsNum, notes)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Set</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-weight" className="block text-sm font-medium text-gray-300 mb-1">
              Weight
            </label>
            <input
              id="edit-weight"
              type="number"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-reps" className="block text-sm font-medium text-gray-300 mb-1">
              Reps
            </label>
            <input
              id="edit-reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <input
              id="edit-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
              placeholder="e.g., felt easy, RPE 7"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function SessionCard({
  session,
  onEditSet,
  onDeleteSet,
  operatingSetId,
}: {
  session: SessionSummary
  onEditSet: (set: SessionSet) => void
  onDeleteSet: (set: SessionSet) => void
  operatingSetId: string | null
}) {
  return (
    <article className="rounded-xl border border-gray-700 bg-gray-800/80 overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-700 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time className="text-gray-300 font-medium" dateTime={session.started_at}>
          {formatSessionDate(session.started_at)}
        </time>
        <span className="text-gray-500 text-sm">{session.day_name}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
              <th className="py-2 px-4 font-medium">Exercise</th>
              <th className="py-2 px-4 font-medium">Sets</th>
            </tr>
          </thead>
          <tbody>
            {session.exercises.map((ex) => (
              <tr key={ex.exercise_key} className="border-b border-gray-700/80 last:border-0">
                <td className="py-3 px-4 font-medium text-white">
                  {ex.exercise_name}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {ex.sets.map((s, i) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center rounded bg-gray-700/80 px-2 py-1 text-sm text-gray-200 gap-2"
                      >
                        <span>
                          {s.weight} {s.unit} × {s.reps}
                          {s.notes ? (
                            <span className="ml-1.5 text-gray-400 text-xs">({s.notes})</span>
                          ) : null}
                        </span>
                        <span className="flex gap-1">
                          <button
                            onClick={() => onEditSet(s)}
                            disabled={operatingSetId !== null}
                            className="text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            aria-label={`Edit set ${i + 1}`}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onDeleteSet(s)}
                            disabled={operatingSetId !== null}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            aria-label={`Delete set ${i + 1}`}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
