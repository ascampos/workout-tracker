/**
 * Append and read from the set_log sheet via the official Google Sheets API.
 * This could be extracted into a shared helper later.
 */

import { google } from 'googleapis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { nanoid } from 'nanoid'

type SetLogRow = {
  id?: string  // optional for backward compatibility during migration
  timestamp: string
  session_id: string
  day_key: string
  exercise_key: string
  weight: number
  reps: number
  notes: string
  unit: string
  updated_at?: string  // when the set was last edited; never overwrite timestamp
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
): Promise<string[]> {
  const sheets = getSheetsClient()
  if (!sheets) {
    const result = loadServiceAccountCredentials()
    throw new Error('error' in result ? result.error : 'Google credentials not loaded.')
  }
  const ids: string[] = []
  const values = rows.map((r) => {
    const id = r.id ?? nanoid()
    ids.push(id)
    return [
      id,           // id is now the first column
      r.timestamp,
      r.session_id,
      r.day_key,
      r.exercise_key,
      r.unit,
      r.weight,
      r.reps,
      r.notes ?? '',
      r.updated_at ?? '',  // empty = never updated; only set when editing
    ]
  })
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'set_log',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return ids
}

export type HistoryRow = {
  id: string
  timestamp: string
  session_id: string
  day_key: string
  exercise_key: string
  weight: number
  reps: number
  notes: string
  unit: string
  updated_at?: string  // when the set was last edited; original log time stays in timestamp
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
  const header = hasHeader ? first : ['id', 'timestamp', 'session_id', 'day_key', 'exercise_key', 'unit', 'weight', 'reps', 'notes', 'updated_at']
  const startRow = hasHeader ? 1 : 0
  const idIdx = header.indexOf('id')
  const tsIdx = header.indexOf('timestamp')
  const sessionIdx = header.indexOf('session_id')
  const dayIdx = header.indexOf('day_key')
  const exIdx = header.indexOf('exercise_key')
  const weightIdx = header.indexOf('weight')
  const repsIdx = header.indexOf('reps')
  const notesIdx = header.indexOf('notes')
  const unitIdx = header.indexOf('unit')
  const updatedAtIdx = header.indexOf('updated_at')
  if ([idIdx, tsIdx, exIdx, weightIdx, repsIdx].some((i) => i === -1)) return []
  const out: HistoryRow[] = []
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (r[exIdx] !== exerciseKey) continue
    const weight = Number(r[weightIdx])
    const reps = Number(r[repsIdx])
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue
    out.push({
      id: String(r[idIdx] ?? ''),
      timestamp: String(r[tsIdx] ?? ''),
      session_id: sessionIdx >= 0 ? String(r[sessionIdx] ?? '') : '',
      day_key: dayIdx >= 0 ? String(r[dayIdx] ?? '') : '',
      exercise_key: String(r[exIdx] ?? ''),
      weight,
      reps,
      notes: notesIdx >= 0 ? String(r[notesIdx] ?? '') : '',
      unit: unitIdx >= 0 ? String(r[unitIdx] ?? '') : 'lb',
      updated_at: (updatedAtIdx >= 0 && r[updatedAtIdx] != null ? String(r[updatedAtIdx]) : (r.length >= 10 && r[9] != null ? String(r[9]) : undefined)) || undefined,
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
  const header = hasHeader ? first : ['id', 'timestamp', 'session_id', 'day_key', 'exercise_key', 'unit', 'weight', 'reps', 'notes', 'updated_at']
  const startRow = hasHeader ? 1 : 0
  const idIdx = header.indexOf('id')
  const tsIdx = header.indexOf('timestamp')
  const sessionIdx = header.indexOf('session_id')
  const dayIdx = header.indexOf('day_key')
  const exIdx = header.indexOf('exercise_key')
  const weightIdx = header.indexOf('weight')
  const repsIdx = header.indexOf('reps')
  const notesIdx = header.indexOf('notes')
  const unitIdx = header.indexOf('unit')
  const updatedAtIdx = header.indexOf('updated_at')
  if ([idIdx, tsIdx, exIdx, weightIdx, repsIdx].some((i) => i === -1)) return []
  const out: HistoryRow[] = []
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const weight = Number(r[weightIdx])
    const reps = Number(r[repsIdx])
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue
    out.push({
      id: String(r[idIdx] ?? ''),
      timestamp: String(r[tsIdx] ?? ''),
      session_id: sessionIdx >= 0 ? String(r[sessionIdx] ?? '') : '',
      day_key: dayIdx >= 0 ? String(r[dayIdx] ?? '') : '',
      exercise_key: String(r[exIdx] ?? ''),
      weight,
      reps,
      notes: notesIdx >= 0 ? String(r[notesIdx] ?? '') : '',
      unit: unitIdx >= 0 ? String(r[unitIdx] ?? '') : 'lb',
      updated_at: (updatedAtIdx >= 0 && r[updatedAtIdx] != null ? String(r[updatedAtIdx]) : (r.length >= 10 && r[9] != null ? String(r[9]) : undefined)) || undefined,
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

/**
 * Find the row index (1-based) of a set by its ID.
 * Returns null if not found.
 */
async function findRowIndexById(
  spreadsheetId: string,
  id: string
): Promise<number | null> {
  const sheets = getSheetsClient()
  if (!sheets) return null

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'set_log!A:A',  // Only read the ID column
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const rows = res.data.values as unknown[][] | undefined
  if (!Array.isArray(rows) || rows.length === 0) return null

  // Find the row with matching ID (skip header row)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      return i + 1  // Convert to 1-based row number
    }
  }

  return null
}

/**
 * Update a single set by ID. Only weight, reps, and notes can be updated.
 */
export async function updateSetLogById(
  spreadsheetId: string,
  id: string,
  updates: Partial<Pick<HistoryRow, 'weight' | 'reps' | 'notes'>>
): Promise<void> {
  const sheets = getSheetsClient()
  if (!sheets) {
    const result = loadServiceAccountCredentials()
    throw new Error('error' in result ? result.error : 'Google credentials not loaded.')
  }

  const rowIndex = await findRowIndexById(spreadsheetId, id)
  if (!rowIndex) {
    throw new Error(`Set with id ${id} not found`)
  }

  if (rowIndex < 2) {
    throw new Error('Cannot update header row')
  }

  // Read current row to merge updates (A:J to support optional updated_at)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `set_log!A${rowIndex}:J${rowIndex}`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const currentRow = response.data.values?.[0] as unknown[] | undefined
  if (!currentRow || currentRow.length < 9) {
    throw new Error('Row not found or invalid')
  }

  // Structure: [id, timestamp, session_id, day_key, exercise_key, unit, weight, reps, notes, updated_at?]
  const rowId = currentRow[0]
  const timestamp = currentRow[1]  // never overwrite – original log time
  const session_id = currentRow[2]
  const day_key = currentRow[3]
  const exercise_key = currentRow[4]
  const unit = currentRow[5]
  const weight = currentRow[6]
  const reps = currentRow[7]
  const notes = currentRow[8]

  const updatedAt = new Date().toISOString()

  // Build updated row: only weight, reps, notes change; set updated_at on every edit
  const updatedRow = [
    rowId,
    timestamp,
    session_id,
    day_key,
    exercise_key,
    unit,
    updates.weight !== undefined ? updates.weight : weight,
    updates.reps !== undefined ? updates.reps : reps,
    updates.notes !== undefined ? updates.notes : notes,
    updatedAt,
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `set_log!A${rowIndex}:J${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] }
  })
}

/**
 * Delete a single set by ID.
 */
export async function deleteSetLogById(
  spreadsheetId: string,
  id: string
): Promise<void> {
  const sheets = getSheetsClient()
  if (!sheets) {
    const result = loadServiceAccountCredentials()
    throw new Error('error' in result ? result.error : 'Google credentials not loaded.')
  }

  const rowIndex = await findRowIndexById(spreadsheetId, id)
  if (!rowIndex) {
    throw new Error(`Set with id ${id} not found`)
  }

  if (rowIndex < 2) {
    throw new Error('Cannot delete header row')
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0,  // Assumes set_log is the first sheet
            dimension: 'ROWS',
            startIndex: rowIndex - 1,  // 0-based for API
            endIndex: rowIndex
          }
        }
      }]
    }
  })
}
