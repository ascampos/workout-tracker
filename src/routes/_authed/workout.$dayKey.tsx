import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { getSessionIdForDay } from '@/utils/session-id'

export const Route = createFileRoute('/_authed/workout/$dayKey')({
  validateSearch: () => ({}),
  component: WorkoutDayLayout,
})

function WorkoutDayLayout() {
  const { dayKey } = Route.useParams()
  const template = workoutTemplates[dayKey as WorkoutDayKey]
  const sessionId = getSessionIdForDay(dayKey)

  if (!template) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown workout day.</p>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 max-w-md mx-auto px-4">
      <div className="flex items-center gap-3 mb-4 min-w-0">
        <Link
          to="/"
          className="text-gray-400 hover:text-white shrink-0"
          aria-label="Back to day picker"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold truncate min-w-0 flex-1">{template.dayName}</h1>
        <Link
          to="/session/$sessionId"
          params={{ sessionId }}
          className="shrink-0 text-sm text-green-400 hover:text-green-300"
        >
          Finish
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
