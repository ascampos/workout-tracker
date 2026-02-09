/**
 * One-time migration script to add an 'id' column to the set_log sheet
 * and backfill IDs for all existing rows.
 *
 * Usage: pnpm run migrate:add-ids
 */

import { config } from 'dotenv'
import { google } from 'googleapis'
import { nanoid } from 'nanoid'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Load environment variables from .env file
config()

function loadServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw || typeof raw !== 'string') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set')
  }
  const trimmed = raw.trim()

  // Inline JSON (e.g. on Vercel)
  if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
    let toParse = trimmed
    if (trimmed.startsWith('"')) {
      toParse = JSON.parse(trimmed) as string
    }
    const normalized = toParse
      .replace(/\r\n/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\n')
    return JSON.parse(normalized) as object
  }

  // File path (e.g. locally)
  const path = join(process.cwd(), trimmed)
  const content = readFileSync(path, 'utf-8')
  return JSON.parse(content) as object
}

function getSheetsClient() {
  const credentials = loadServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as Record<string, unknown>,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function addIdColumnAndBackfill() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = getSheetsClient()

  console.log('📊 Fetching current sheet data...')

  // Read all current data
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'set_log',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const rows = res.data.values as unknown[][] | undefined
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('❌ No data found in set_log sheet')
    return
  }

  console.log(`✅ Found ${rows.length} rows (including header)`)

  // Check if 'id' column already exists
  const firstRow = rows[0]
  const headerStr = firstRow.map((c) => String(c).toLowerCase())
  if (headerStr.includes('id')) {
    console.log('⚠️  ID column already exists. Skipping migration.')
    return
  }

  console.log('🔧 Inserting ID column at position A...')

  // Step 1: Insert a new column at position A (shifts everything right)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: 0, // Assumes set_log is the first sheet
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 1
          }
        }
      }]
    }
  })

  console.log('✅ Column inserted')
  console.log('🆔 Generating IDs for all rows...')

  // Step 2: Update header row to add 'id' label
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'set_log!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['id']]
    }
  })

  // Step 3: Generate IDs for all data rows
  const idUpdates: string[][] = []
  for (let i = 1; i < rows.length; i++) {
    idUpdates.push([nanoid()])
  }

  if (idUpdates.length > 0) {
    console.log(`📝 Writing ${idUpdates.length} IDs to rows 2-${idUpdates.length + 1}...`)

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `set_log!A2:A${idUpdates.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: idUpdates
      }
    })
  }

  console.log('✅ Migration complete!')
  console.log(`
📋 Summary:
   - Added 'id' column at position A
   - Generated unique IDs for ${idUpdates.length} existing rows
   - New schema: id | timestamp | session_id | day_key | exercise_key | unit | weight | reps | notes
  `)
}

// Run migration
addIdColumnAndBackfill()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
