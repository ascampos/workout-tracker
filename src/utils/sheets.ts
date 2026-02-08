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

function loadServiceAccountCredentials(): object | null {
  const pathFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!pathFromEnv?.trim()) return null
  try {
    const path = join(process.cwd(), pathFromEnv.trim())
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as object
  } catch {
    /* ignore */
  }
  return null
}

function getSheetsClient() {
  const credentials = loadServiceAccountCredentials()
  if (!credentials) return null
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as Record<string, unknown>,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function appendSetLogRows(
  spreadsheetId: string,
  rows: SetLogRow[]
): Promise<void> {
  const sheets = getSheetsClient()
  if (!sheets) return
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
