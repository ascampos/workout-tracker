/**
 * One-time migration script:
 *
 * 1. Add `is_warmup` (col J) and `updated_at` (col K) to the sheet header row
 * 2. Rename `stable_shoulder_press` → `shoulder_press_machine` in column E
 * 3. Fix day_key mismatch for session 2026-02-08-upper_b (upper_a → upper_b)
 * 4. Fix day_key mismatch for hip_abduction in session 2026-02-15-lower_b (lower_a → lower_b)
 * 5. Backfill is_warmup (col J): TRUE where notes = "Warmup", FALSE otherwise
 * 6. Move any existing positional updated_at values to column K
 *
 * Usage: pnpm exec tsx scripts/migrate.ts
 */

import { config } from 'dotenv'
import { google } from 'googleapis'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config()

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw || typeof raw !== 'string') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  }
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
    let toParse = trimmed
    if (trimmed.startsWith('"')) toParse = JSON.parse(trimmed) as string
    const normalized = toParse.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n')
    return JSON.parse(normalized) as object
  }
  const path = join(process.cwd(), trimmed)
  return JSON.parse(readFileSync(path, 'utf-8')) as object
}

function getSheetsClient() {
  const credentials = loadServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as Record<string, unknown>,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function run() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')

  const sheets = getSheetsClient()

  console.log('Fetching sheet data...')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'set_log',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const rows = res.data.values as unknown[][] | undefined
  if (!Array.isArray(rows) || rows.length < 2) {
    console.log('No data rows found. Exiting.')
    return
  }

  console.log(`Found ${rows.length - 1} data rows.`)

  // Column index constants (0-based, matching new schema)
  const COL = { ID: 0, TS: 1, SESSION: 2, DAY: 3, EX: 4, UNIT: 5, WEIGHT: 6, REPS: 7, NOTES: 8, IS_WARMUP: 9, UPDATED_AT: 10 }

  // ── Step 1: Update header row (J1 = is_warmup, K1 = updated_at) ──────────
  console.log('Step 1: Updating header row (J1, K1)...')
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'set_log!J1:K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['is_warmup', 'updated_at']] },
  })
  console.log('  Done.')

  // ── Steps 2–6: Build full updated rows for each data row ─────────────────
  // We'll collect per-cell updates and send as one batchUpdate

  type CellUpdate = { range: string; values: unknown[][] }
  const updates: CellUpdate[] = []

  let renamedCount = 0
  let dayKeyFixCount = 0
  let warmupBackfillCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const rowNum = i + 1 // 1-based sheet row (row 1 = header)

    const sessionId = String(row[COL.SESSION] ?? '')
    const dayKey    = String(row[COL.DAY] ?? '')
    const exKey     = String(row[COL.EX] ?? '')
    const notes     = String(row[COL.NOTES] ?? '')
    // Index 9 was the old positional updated_at slot; in practice always empty
    const oldUpdatedAt = row.length > 9 ? String(row[9] ?? '') : ''

    // Step 2: Rename stable_shoulder_press
    if (exKey === 'stable_shoulder_press') {
      updates.push({ range: `set_log!E${rowNum}`, values: [['shoulder_press_machine']] })
      renamedCount++
    }

    // Step 3: Fix Feb 8 day_key mismatch
    if (sessionId === '2026-02-08-upper_b' && dayKey === 'upper_a') {
      updates.push({ range: `set_log!D${rowNum}`, values: [['upper_b']] })
      dayKeyFixCount++
    }

    // Step 4: Fix Feb 15 hip_abduction day_key mismatch
    if (sessionId === '2026-02-15-lower_b' && dayKey === 'lower_a') {
      updates.push({ range: `set_log!D${rowNum}`, values: [['lower_b']] })
      dayKeyFixCount++
    }

    // Step 5: Backfill is_warmup (col J)
    const isWarmup = notes.trim().toLowerCase() === 'warmup'
    updates.push({ range: `set_log!J${rowNum}`, values: [[isWarmup ? 'TRUE' : 'FALSE']] })
    if (isWarmup) warmupBackfillCount++

    // Step 6: Move old positional updated_at to col K (usually empty)
    if (oldUpdatedAt) {
      updates.push({ range: `set_log!K${rowNum}`, values: [[oldUpdatedAt]] })
    }
  }

  if (updates.length === 0) {
    console.log('No updates needed.')
    return
  }

  console.log(`Applying ${updates.length} cell updates...`)

  // Send in batches of 500 to stay within API limits
  const BATCH_SIZE = 500
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: batch,
      },
    })
    console.log(`  Wrote batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(updates.length / BATCH_SIZE)}`)
  }

  console.log(`
Migration complete:
  - Header: J1 = is_warmup, K1 = updated_at
  - Renamed stable_shoulder_press → shoulder_press_machine: ${renamedCount} rows
  - Fixed day_key mismatches: ${dayKeyFixCount} rows
  - Backfilled is_warmup TRUE: ${warmupBackfillCount} rows
  - Backfilled is_warmup FALSE: ${rows.length - 1 - warmupBackfillCount} rows
`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
