import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { workoutTemplates, getAllExercises } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { historyQuery } from '@/lib/queries'
import type { LoggedSet } from '@/types'

const DAY_KEYS: WorkoutDayKey[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b']

export const Route = createFileRoute('/_authed/workout/$dayKey/')({
  validateSearch: (search: Record<string, unknown>) => ({
    template: (search.template as WorkoutDayKey) || undefined,
  }),
  component: WorkoutDayIndexPage,
})

const unit = 'lb'

function getMaxSet(history: LoggedSet[]): string | null {
  const working = history.filter((s) => !s.is_warmup)
  if (working.length === 0) return null
  const max = working.reduce((best, s) => (s.weight > best.weight ? s : best), working[0])
  return `${max.weight} ${unit} × ${max.reps}`
}

function WorkoutDayIndexPage() {
  const { dayKey } = Route.useParams()
  const { template: templateKey } = useSearch({ from: '/_authed/workout/$dayKey/' })
  const sessionTemplate = workoutTemplates[dayKey as WorkoutDayKey]
  const [searchTerm, setSearchTerm] = useState('')

  if (!sessionTemplate) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown workout day.</p>
      </div>
    )
  }

  const effectiveTemplateKey = (templateKey && DAY_KEYS.includes(templateKey))
    ? templateKey
    : (dayKey as WorkoutDayKey)
  const exerciseTemplate = workoutTemplates[effectiveTemplateKey]
  const allExercises = getAllExercises()
  const filteredExercises = searchTerm.trim()
    ? allExercises.filter((ex) =>
        ex.exercise_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : exerciseTemplate.exercises

  const historyQueries = useQueries({
    queries: filteredExercises.map((ex) => historyQuery(ex.exercise_key)),
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Template selector - use any workout for this session */}
      <div className="flex flex-wrap gap-2">
        {DAY_KEYS.map((key) => {
          const t = workoutTemplates[key]
          const isActive = effectiveTemplateKey === key
          return (
            <Link
              key={key}
              to="/workout/$dayKey"
              params={{ dayKey }}
              search={{ template: key }}
              className={`px-3 py-1.5 rounded text-sm font-medium border ${
                isActive
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {t.dayName}
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Logging into {sessionTemplate.dayName}. Select a workout above to use its exercises.
      </p>

      {/* Search Combobox */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search all exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Exercise List */}
      <div className="flex flex-col gap-2">
        {filteredExercises.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No exercises found</p>
        ) : (
          filteredExercises.map((ex, i) => {
            const history = historyQueries[i]?.data ?? []
            const maxSet = getMaxSet(history)
            return (
              <Link
                key={ex.exercise_key}
                to="/workout/$dayKey/$exerciseKey"
                params={{ dayKey, exerciseKey: ex.exercise_key }}
                className="block w-full p-4 text-left rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700"
              >
                <span className="font-medium text-gray-200">{ex.exercise_name}</span>
                {maxSet && (
                  <p className="text-sm text-gray-500 mt-1">Max: {maxSet}</p>
                )}
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
