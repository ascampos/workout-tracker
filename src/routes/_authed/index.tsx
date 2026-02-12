import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { getSessionHistoryFn, type SessionSummary } from '@/utils/log-sets'

export const Route = createFileRoute('/_authed/')({
  component: HomePage,
})

const dayKeys: WorkoutDayKey[] = [
  'upper_a',
  'lower_a',
  'upper_b',
  'lower_b',
]

const RECENT_SESSIONS_LIMIT = 10

function formatRecentSessionDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return 'Yesterday'
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (daysAgo >= 1 && daysAgo <= 6) return `${daysAgo} days ago`
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function HomePage() {
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    getSessionHistoryFn()
      .then(({ sessions }) => {
        // Group by session_id so each session appears once (newest first already)
        const seen = new Set<string>()
        const unique = sessions.filter((s) => {
          if (seen.has(s.session_id)) return false
          seen.add(s.session_id)
          return true
        })
        setRecentSessions(unique.slice(0, RECENT_SESSIONS_LIMIT))
      })
      .catch(() => setRecentSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [])

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">Pick a Workout</h1>
      <div className="flex flex-col gap-3">
        {dayKeys.map((key) => {
          const template = workoutTemplates[key]
          return (
            <Link
              key={key}
              to="/workout/$dayKey"
              params={{ dayKey: key }}
              className="flex w-full min-h-[48px] p-5 text-lg font-medium text-center rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 active:bg-gray-600 items-center justify-center"
            >
              {template.dayName}
            </Link>
          )
        })}
      </div>

      {/* Recent sessions */}
      <section className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Recent sessions
        </h2>
        {sessionsLoading && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}
        {!sessionsLoading && recentSessions.length === 0 && (
          <p className="text-gray-500 text-sm">No sessions yet. Log a workout to see it here.</p>
        )}
        {!sessionsLoading && recentSessions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <li key={session.session_id}>
                <Link
                  to="/session/$sessionId"
                  params={{ sessionId: session.session_id }}
                  className="block w-full p-3 text-left rounded-lg bg-gray-800/60 border border-gray-700 hover:bg-gray-700/80"
                >
                  <span className="text-gray-400 text-sm">
                    {formatRecentSessionDate(session.started_at)}:
                  </span>{' '}
                  <span className="font-medium text-gray-200">{session.day_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
