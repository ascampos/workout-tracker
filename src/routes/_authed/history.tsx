import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getSessionHistoryFn, type SessionSummary } from '@/utils/log-sets'

export const Route = createFileRoute('/_authed/history')({
  component: HistoryPage,
})

function formatSessionDate(iso: string): string {
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

function SessionCard({ session }: { session: SessionSummary }) {
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
                        key={i}
                        className="inline-flex items-center rounded bg-gray-700/80 px-2 py-1 text-sm text-gray-200"
                      >
                        {s.weight} {s.unit} × {s.reps}
                        {s.notes ? (
                          <span className="ml-1.5 text-gray-400 text-xs">({s.notes})</span>
                        ) : null}
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

function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSessionHistoryFn()
      .then(({ sessions: list }) => setSessions(list))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="text-gray-400 hover:text-white shrink-0"
          aria-label="Back to home"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold">Workout History</h1>
      </div>

      {loading && (
        <p className="text-gray-400 py-8 text-center">Loading sessions…</p>
      )}
      {error && (
        <p className="text-red-400 py-4 text-center" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-gray-400 py-8 text-center">
          No sessions yet. Log some sets from a workout to see them here.
        </p>
      )}
      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard key={session.session_id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
