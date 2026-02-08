import { createFileRoute, Link } from '@tanstack/react-router'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'

export const Route = createFileRoute('/_authed/workout/$dayKey/')({
  component: WorkoutDayIndexPage,
})

function WorkoutDayIndexPage() {
  const { dayKey } = Route.useParams()
  const template = workoutTemplates[dayKey as WorkoutDayKey]

  if (!template) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown workout day.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {template.exercises.map((ex) => (
        <Link
          key={ex.exercise_key}
          to="/workout/$dayKey/$exerciseKey"
          params={{ dayKey, exerciseKey: ex.exercise_key }}
          className="block w-full p-4 text-left rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700"
        >
          <span className="font-medium text-gray-200">{ex.exercise_name}</span>
        </Link>
      ))}
    </div>
  )
}
