import type { LoggedSet, ProgressPoint } from '@/types'

/** Epley formula — estimates theoretical 1-rep max from a working set. */
export const estimatedOneRM = (weight: number, reps: number): number =>
  weight * (1 + reps / 30)

/**
 * Groups history by session and returns the top set (highest estimated 1RM)
 * per session, sorted chronologically.
 */
export function topSetPerSession(history: LoggedSet[]): ProgressPoint[] {
  const bySession = new Map<string, LoggedSet[]>()
  for (const row of history) {
    const list = bySession.get(row.session_id) ?? []
    list.push(row)
    bySession.set(row.session_id, list)
  }
  const result: ProgressPoint[] = []
  for (const rows of bySession.values()) {
    const top = rows.reduce((best, r) =>
      estimatedOneRM(r.weight, r.reps) > estimatedOneRM(best.weight, best.reps) ? r : best
    )
    result.push({ timestamp: top.timestamp, est1rm: estimatedOneRM(top.weight, top.reps) })
  }
  result.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return result
}
