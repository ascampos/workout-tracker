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

function topSetPerSession(history: HistoryEntry[]): { timestamp: string; est1rm: number }[] {
  const bySession = new Map<string, HistoryEntry[]>()
  for (const row of history) {
    const list = bySession.get(row.session_id) ?? []
    list.push(row)
    bySession.set(row.session_id, list)
  }
  const result: { timestamp: string; est1rm: number }[] = []
  for (const rows of bySession.values()) {
    // Use highest estimated 1RM (Epley) in each session
    const top = rows.reduce(
      (best, r) => {
        const best1rm = best.weight * (1 + best.reps / 30)
        const current1rm = r.weight * (1 + r.reps / 30)
        return current1rm > best1rm ? r : best
      },
      rows[0]
    )
    const est1rm = top.weight * (1 + top.reps / 30)
    result.push({ timestamp: top.timestamp, est1rm })
  }
  result.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return result
}

function SimpleLineChart({ data }: { data: { timestamp: string; est1rm: number }[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">No data yet. Log some sets to see progress.</p>
    )
  }
  const values = data.map((d) => d.est1rm)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const padding = { top: 8, right: 8, bottom: 28, left: 40 }
  const width = 280
  const height = 168
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const x0 = padding.left
  const y0 = padding.top + innerH
  const points = data.map((d, i) => {
    const x = x0 + (i / Math.max(1, data.length - 1)) * innerW
    const y = padding.top + innerH - ((d.est1rm - minV) / range) * innerH
    return `${x},${y}`
  })
  const path = points.length >= 2 ? `M ${points.join(' L ')}` : ''
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const firstDate = data.length > 0 ? formatDate(data[0].timestamp) : ''
  const lastDate = data.length > 1 ? formatDate(data[data.length - 1].timestamp) : ''
  return (
    <div className="overflow-x-auto min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md h-40 text-gray-300" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis */}
        <line x1={x0} y1={padding.top} x2={x0} y2={y0} stroke="currentColor" strokeWidth="1" opacity={0.6} />
        {/* X-axis */}
        <line x1={x0} y1={y0} x2={x0 + innerW} y2={y0} stroke="currentColor" strokeWidth="1" opacity={0.6} />
        <text x={x0 - 6} y={padding.top + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.9}>
          {maxV.toFixed(0)}
        </text>
        <text x={x0 - 6} y={y0 + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.9}>
          {minV.toFixed(0)}
        </text>
        <text x={x0 - 6} y={padding.top + innerH / 2} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.7}>
          1RM
        </text>
        {firstDate && (
          <text x={x0} y={height - 6} textAnchor="start" fontSize={9} fill="currentColor" opacity={0.7}>
            {firstDate}
          </text>
        )}
        {lastDate && data.length > 1 && (
          <text x={x0 + innerW} y={height - 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.7}>
            {lastDate}
          </text>
        )}
        {path ? (
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {data.map((d, i) => (
          <circle
            key={d.timestamp + i}
            cx={x0 + (i / Math.max(1, data.length - 1)) * innerW}
            cy={padding.top + innerH - ((d.est1rm - minV) / range) * innerH}
            r={4}
            fill="currentColor"
          />
        ))}
      </svg>
      <p className="text-gray-500 text-xs mt-1">Estimated 1RM over sessions (top set per session)</p>
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
