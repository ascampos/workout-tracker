import type { ProgressPoint } from '@/types'

export function ProgressChart({
  data,
  emptyMessage = 'No data yet. Log some sets to see progress.',
}: {
  data: ProgressPoint[]
  emptyMessage?: string
}) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm py-6 text-center">{emptyMessage}</p>
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
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md h-40 text-gray-300"
        preserveAspectRatio="xMidYMid meet"
      >
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
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
