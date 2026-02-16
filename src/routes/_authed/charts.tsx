import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { workoutTemplates } from '@/data/templates'
import { getHistoryFn } from '@/utils/log-sets'
import type { LoggedSet } from '@/types'
import { topSetPerSession } from '@/utils/fitness'
import { ProgressChart } from '@/components/progress-chart'

export const Route = createFileRoute('/_authed/charts')({
  component: ChartsPage,
})

const exerciseList = (() => {
  const seen = new Set<string>()
  const out: { exercise_key: string; exercise_name: string }[] = []
  for (const template of Object.values(workoutTemplates)) {
    for (const ex of template.exercises) {
      if (seen.has(ex.exercise_key)) continue
      seen.add(ex.exercise_key)
      out.push({ exercise_key: ex.exercise_key, exercise_name: ex.exercise_name })
    }
  }
  out.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
  return out
})()


function ChartsPage() {
  const [exerciseKey, setExerciseKey] = useState(exerciseList[0]?.exercise_key ?? '')
  const [history, setHistory] = useState<LoggedSet[]>([])

  useEffect(() => {
    if (!exerciseKey) return
    getHistoryFn({ data: { exerciseKey } }).then(setHistory)
  }, [exerciseKey])

  const chartData = useMemo(() => topSetPerSession(history), [history])

  return (
    <div className="w-full min-w-0 max-w-md mx-auto px-4">
      <div className="flex items-center gap-3 mb-4 min-w-0">
        <Link to="/" className="text-gray-400 hover:text-white shrink-0" aria-label="Back home">
          ←
        </Link>
        <h1 className="text-2xl font-bold truncate min-w-0">Progress</h1>
      </div>

      <label className="block mb-2 text-sm text-gray-400">Exercise</label>
      <select
        value={exerciseKey}
        onChange={(e) => setExerciseKey(e.target.value)}
        className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white mb-6"
      >
        {exerciseList.map((ex) => (
          <option key={ex.exercise_key} value={ex.exercise_key}>
            {ex.exercise_name}
          </option>
        ))}
      </select>

      <ProgressChart data={chartData} />
    </div>
  )
}
