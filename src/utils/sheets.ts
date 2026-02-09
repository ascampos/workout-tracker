/**
 * Append and read from the set_log sheet via the official Google Sheets API.
 * This could be extracted into a shared helper later.
 */

import { google } from 'googleapis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type SetLogRow = {
  timestamp: string
  session_id: string
  day_key: string
  exercise_key: string
  weight: number
  reps: number
  notes: string
  unit: string
}

function loadServiceAccountCredentials(): { credentials: object } | { error: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw || typeof raw !== 'string') {
    return { error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set in Vercel (Settings → Environment Variables).' }
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return { error: 'GOOGLE_SERVICE_ACCOUNT_JSON is empty.' }
  }

  // Inline JSON (e.g. on Vercel)
  if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
    let toParse = trimmed
    // If the whole value is double-quoted (double-encoded), parse once to get the inner string
    if (trimmed.startsWith('"')) {
      try {
        toParse = JSON.parse(trimmed) as string
      } catch {
        return { error: 'GOOGLE_SERVICE_ACCOUNT_JSON looks quoted but is not valid. Paste the raw JSON only (no outer quotes).' }
      }
    }
    // Fix control characters: JSON strings must not contain raw newlines. If the user
    // pasted multi-line JSON, escape real newlines as \n so JSON.parse can read it.
    const normalized = toParse
      .replace(/\r\n/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\n')
    try {
      const parsed = JSON.parse(normalized) as object
      if (!parsed || typeof parsed !== 'object') {
        return { error: 'GOOGLE_SERVICE_ACCOUNT_JSON did not parse to a JSON object.' }
      }
      return { credentials: parsed }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Parse error'
      return { error: `GOOGLE_SERVICE_ACCOUNT_JSON invalid JSON: ${msg}. Paste the full service-account.json content, minified to one line.` }
    }
  }

  // File path (e.g. locally)
  try {
    const path = join(process.cwd(), trimmed)
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content) as object
    return { credentials: parsed }
  } catch {
    return { error: `Could not read or parse file at GOOGLE_SERVICE_ACCOUNT_JSON path: ${trimmed}` }
  }
}

function getSheetsClient(): ReturnType<typeof google.sheets> | null {
  const result = loadServiceAccountCredentials()
  if ('error' in result) return null
  const auth = new google.auth.GoogleAuth({
    credentials: result.credentials as Record<string, unknown>,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function appendSetLogRows(
  spreadsheetId: string,
  rows: SetLogRow[]
): Promise<void> {
  const sheets = getSheetsClient()
  if (!sheets) {
    const result = loadServiceAccountCredentials()
    throw new Error('error' in result ? result.error : 'Google credentials not loaded.')
  }
  const values = rows.map((r) => [
    r.timestamp,
    r.session_id,
    r.day_key,
    r.exercise_key,
    r.unit,
    r.weight,
    r.reps,
    r.notes ?? '',
  ])
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'set_log',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
}

export type HistoryRow = {
  timestamp: string
  session_id: string
  day_key: string
  exercise_key: string
  weight: number
  reps: number
  notes: string
  unit: string
}

export async function getSetLogHistory(
  spreadsheetId: string,
  exerciseKey: string,
  limit: number = 100
): Promise<HistoryRow[]> {
  const sheets = getSheetsClient()
  if (!sheets) return []
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'set_log',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })
  const rows = res.data.values as unknown[][] | undefined
  if (!Array.isArray(rows) || rows.length === 0) return []
  const first = rows[0].map((c) => String(c).toLowerCase().replace(/\s+/g, '_'))
  const hasHeader =
    first.includes('timestamp') && first.includes('exercise_key')
  const header = hasHeader ? first : ['timestamp', 'session_id', 'day_key', 'exercise_key', 'unit', 'weight', 'reps', 'notes']
  const startRow = hasHeader ? 1 : 0
  const tsIdx = header.indexOf('timestamp')
  const sessionIdx = header.indexOf('session_id')
  const dayIdx = header.indexOf('day_key')
  const exIdx = header.indexOf('exercise_key')
  const weightIdx = header.indexOf('weight')
  const repsIdx = header.indexOf('reps')
  const notesIdx = header.indexOf('notes')
  const unitIdx = header.indexOf('unit')
  if ([tsIdx, exIdx, weightIdx, repsIdx].some((i) => i === -1)) return []
  const out: HistoryRow[] = []
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (r[exIdx] !== exerciseKey) continue
    const weight = Number(r[weightIdx])
    const reps = Number(r[repsIdx])
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue
    out.push({
      timestamp: String(r[tsIdx] ?? ''),
      session_id: sessionIdx >= 0 ? String(r[sessionIdx] ?? '') : '',
      day_key: dayIdx >= 0 ? String(r[dayIdx] ?? '') : '',
      exercise_key: String(r[exIdx] ?? ''),
      weight,
      reps,
      notes: notesIdx >= 0 ? String(r[notesIdx] ?? '') : '',
      unit: unitIdx >= 0 ? String(r[unitIdx] ?? '') : 'lb',
    })
  }
  out.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return out.slice(0, limit)
}

function rowKey(r: HistoryRow): string {
  return `${r.timestamp}|${r.session_id}|${r.day_key}|${r.exercise_key}|${r.weight}|${r.reps}`
}

/**
 * Fetch all set_log rows (all exercises), sorted by timestamp descending.
 * Deduplicates by (timestamp, session_id, day_key, exercise_key, weight, reps), keeping the first.
 */
export async function getAllSetLogRows(
  spreadsheetId: string,
  limit: number = 500
): Promise<HistoryRow[]> {
  const sheets = getSheetsClient()
  if (!sheets) return []
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'set_log',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })
  const rows = res.data.values as unknown[][] | undefined
  if (!Array.isArray(rows) || rows.length === 0) return []
  const first = rows[0].map((c) => String(c).toLowerCase().replace(/\s+/g, '_'))
  const hasHeader =
    first.includes('timestamp') && first.includes('exercise_key')
  const header = hasHeader ? first : ['timestamp', 'session_id', 'day_key', 'exercise_key', 'unit', 'weight', 'reps', 'notes']
  const startRow = hasHeader ? 1 : 0
  const tsIdx = header.indexOf('timestamp')
  const sessionIdx = header.indexOf('session_id')
  const dayIdx = header.indexOf('day_key')
  const exIdx = header.indexOf('exercise_key')
  const weightIdx = header.indexOf('weight')
  const repsIdx = header.indexOf('reps')
  const notesIdx = header.indexOf('notes')
  const unitIdx = header.indexOf('unit')
  if ([tsIdx, exIdx, weightIdx, repsIdx].some((i) => i === -1)) return []
  const out: HistoryRow[] = []
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const weight = Number(r[weightIdx])
    const reps = Number(r[repsIdx])
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue
    out.push({
      timestamp: String(r[tsIdx] ?? ''),
      session_id: sessionIdx >= 0 ? String(r[sessionIdx] ?? '') : '',
      day_key: dayIdx >= 0 ? String(r[dayIdx] ?? '') : '',
      exercise_key: String(r[exIdx] ?? ''),
      weight,
      reps,
      notes: notesIdx >= 0 ? String(r[notesIdx] ?? '') : '',
      unit: unitIdx >= 0 ? String(r[unitIdx] ?? '') : 'lb',
    })
  }
  out.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const seen = new Set<string>()
  const deduped: HistoryRow[] = []
  for (const row of out) {
    const key = rowKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped.slice(0, limit)
}
