import type { LoggedSet, ProgressPoint, SetEntry } from '@/types'

/** Epley formula — estimates theoretical 1-rep max from a working set. */
export const estimatedOneRM = (weight: number, reps: number): number =>
  weight * (1 + reps / 30)

/**
 * Returns true if any of the new (non-warmup) sets beats the existing
 * all-time best estimated 1RM for this exercise.
 */
export function detectPR(newSets: SetEntry[], history: LoggedSet[]): boolean {
  const workingSets = newSets.filter((s) => !s.is_warmup)
  if (workingSets.length === 0) return false
  const historySets = history.filter((s) => !s.is_warmup)
  const currentBest = historySets.length > 0
    ? Math.max(...historySets.map((s) => estimatedOneRM(s.weight, s.reps)))
    : 0
  return workingSets.some((s) => estimatedOneRM(s.weight, s.reps) > currentBest)
}

/**
 * Groups history by session and returns the top set (highest estimated 1RM)
 * per session, sorted chronologically. Warmup sets are excluded.
 */
export function topSetPerSession(history: LoggedSet[]): ProgressPoint[] {
  const workingHistory = history.filter((s) => !s.is_warmup)
  const bySession = new Map<string, LoggedSet[]>()
  for (const row of workingHistory) {
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
