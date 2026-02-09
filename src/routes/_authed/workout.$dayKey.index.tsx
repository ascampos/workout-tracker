import { createFileRoute, Link } from '@tanstack/react-router'
import { workoutTemplates, getAllExercises } from '@/data/templates'
import type { WorkoutDayKey } from '@/data/templates'
import { useState } from 'react'

export const Route = createFileRoute('/_authed/workout/$dayKey/')({
  component: WorkoutDayIndexPage,
})

function WorkoutDayIndexPage() {
  const { dayKey } = Route.useParams()
  const template = workoutTemplates[dayKey as WorkoutDayKey]
  const [searchTerm, setSearchTerm] = useState('')

  if (!template) {
    return (
      <div className="w-full min-w-0 max-w-md mx-auto px-4">
        <p className="text-gray-400">Unknown workout day.</p>
      </div>
    )
  }

  const allExercises = getAllExercises()
  const filteredExercises = searchTerm.trim()
    ? allExercises.filter((ex) =>
        ex.exercise_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : template.exercises

  return (
    <div className="flex flex-col gap-4">
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
          filteredExercises.map((ex) => (
            <Link
              key={ex.exercise_key}
              to="/workout/$dayKey/$exerciseKey"
              params={{ dayKey, exerciseKey: ex.exercise_key }}
              className="block w-full p-4 text-left rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700"
            >
              <span className="font-medium text-gray-200">{ex.exercise_name}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
