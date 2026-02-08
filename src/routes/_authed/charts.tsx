import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { workoutTemplates } from '@/data/templates'
import { getHistoryFn } from '@/utils/log-sets'
import type { HistoryEntry } from '@/utils/log-sets'

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

function topSetPerSession(history: HistoryEntry[]): { timestamp: string; weight: number }[] {
  const bySession = new Map<string, HistoryEntry[]>()
  for (const row of history) {
    const list = bySession.get(row.session_id) ?? []
    list.push(row)
    bySession.set(row.session_id, list)
  }
  const result: { timestamp: string; weight: number }[] = []
  for (const rows of bySession.values()) {
    const top = rows.reduce((best, r) => (r.weight > best.weight ? r : best), rows[0])
    result.push({ timestamp: top.timestamp, weight: top.weight })
  }
  result.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return result
}

function SimpleLineChart({ data }: { data: { timestamp: string; weight: number }[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">No data yet. Log some sets to see progress.</p>
    )
  }
  const weights = data.map((d) => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1
  const padding = { top: 8, right: 8, bottom: 24, left: 36 }
  const width = 280
  const height = 160
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * innerW
    const y = padding.top + innerH - ((d.weight - minW) / range) * innerH
    return `${x},${y}`
  })
  const path = points.length >= 2 ? `M ${points.join(' L ')}` : ''
  return (
    <div className="overflow-x-auto min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md h-40 text-gray-300" preserveAspectRatio="xMidYMid meet">
        <text x={padding.left - 4} y={padding.top + innerH / 2} textAnchor="end" fontSize={10} fill="currentColor">
          {maxW}
        </text>
        <text x={padding.left - 4} y={height - padding.bottom + 4} textAnchor="end" fontSize={10} fill="currentColor">
          {minW}
        </text>
        {path ? (
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {data.map((d, i) => (
          <circle
            key={d.timestamp + i}
            cx={padding.left + (i / Math.max(1, data.length - 1)) * innerW}
            cy={padding.top + innerH - ((d.weight - minW) / range) * innerH}
            r={4}
            fill="currentColor"
          />
        ))}
      </svg>
      <p className="text-gray-500 text-xs mt-1">Weight over sessions (top set per session)</p>
    </div>
  )
}

function ChartsPage() {
  const [exerciseKey, setExerciseKey] = useState(exerciseList[0]?.exercise_key ?? '')
  const [history, setHistory] = useState<HistoryEntry[]>([])

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

      <SimpleLineChart data={chartData} />
    </div>
  )
}
