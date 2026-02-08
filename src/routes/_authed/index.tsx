import { createFileRoute, Link } from '@tanstack/react-router'
import { workoutTemplates } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'

export const Route = createFileRoute('/_authed/')({
  component: HomePage,
})

const dayKeys: WorkoutDayKey[] = [
  'upper_a',
  'lower_a',
  'upper_b',
  'lower_b',
]

function HomePage() {
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
    </div>
  )
}
