/** One session per calendar day per day_key so different days don't share a session_id. */
export function getSessionIdForDay(dayKey: string): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `${today}-${dayKey}`
}
