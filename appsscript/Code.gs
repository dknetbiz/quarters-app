/**
 * NJHPS Quarters Management — Google Apps Script Backend
 *
 * ─── ONE-TIME SETUP ────────────────────────────────────────────────────────
 *
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Delete any existing code and paste this entire file
 * 3. Update SPREADSHEET_ID below to your actual Sheet ID
 *    (from the URL: docs.google.com/spreadsheets/d/<THIS_PART>/edit)
 *
 * 4. Deploy as a Web App:
 *    Click "Deploy" → "New deployment" → gear icon → "Web app"
 *      Execute as : Me  (your dknetbiz@gmail.com account)
 *      Who has access: Anyone
 *    Click "Deploy" — copy the Web App URL
 *
 * 5. Set a secret key so only YOUR app can call this:
 *    Left sidebar → "Project Settings" (gear icon) → "Script properties"
 *    + Add property:  Name = SECRET_KEY   Value = <any strong random string>
 *    (Generate one at: randomkeygen.com → "Strong Passwords")
 *
 * 6. Add two secrets to your GitHub repository
 *    (Settings → Secrets & variables → Actions → New repository secret):
 *      VITE_APPS_SCRIPT_URL = <Web App URL from step 4>
 *      VITE_APPS_SCRIPT_KEY = <same SECRET_KEY from step 5>
 *
 * 7. Push any change to trigger a new build — the app now routes all
 *    Sheet operations through this script using YOUR Google account.
 *    Users only need Google Sign-In for identity; they no longer need
 *    access to the spreadsheet.
 * ───────────────────────────────────────────────────────────────────────────
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'

// ── Auth ──────────────────────────────────────────────────────
function secret_() {
  return PropertiesService.getScriptProperties().getProperty('SECRET_KEY') || ''
}
function isAuth_(key) {
  const s = secret_()
  return s.length > 0 && key === s
}

// ── Response helpers ──────────────────────────────────────────
function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
function ok_(extra)  { return json_({ ok: true,  ...(extra || {}) }) }
function err_(msg)   { return json_({ ok: false, error: msg }) }

// ── Sheet helpers ─────────────────────────────────────────────
function openOrCreate_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name)
}

// ── GET: read operations ──────────────────────────────────────
function doGet(e) {
  var p = e.parameter || {}
  if (!isAuth_(p.secret)) return err_('UNAUTHORIZED')

  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID)
  var act = p.action || 'getData'

  // Return all rows (including header row) as a 2-D array
  if (act === 'getData') {
    var sh = ss.getSheetByName(p.sheet)
    if (!sh || sh.getLastRow() === 0) return ok_({ values: [] })
    return ok_({ values: sh.getDataRange().getValues() })
  }

  // Return raw values for an A1-notation range within a sheet
  if (act === 'getRaw') {
    var sh = ss.getSheetByName(p.sheet)
    if (!sh || sh.getLastRow() === 0) return ok_({ values: [] })
    try {
      var range = p.range
        ? sh.getRange(p.range)
        : sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
      return ok_({ values: range.getValues() })
    } catch(ex) {
      return ok_({ values: [] })
    }
  }

  return err_('UNKNOWN_ACTION')
}

// ── POST: write operations ────────────────────────────────────
function doPost(e) {
  var body
  try { body = JSON.parse(e.postData.contents) }
  catch(ex) { return err_('INVALID_BODY') }

  if (!isAuth_(body.secret)) return err_('UNAUTHORIZED')

  var ss     = SpreadsheetApp.openById(SPREADSHEET_ID)
  var action = body.action
  var sheet  = body.sheet
  var values = body.values    // array  (single row)
  var rows   = body.rows      // array  (multiple rows — batchAppend)

  // Append a single row
  if (action === 'append') {
    openOrCreate_(ss, sheet).appendRow(values)
    return ok_()
  }

  // Append many rows efficiently (bulk upload)
  if (action === 'batchAppend') {
    if (!rows || !rows.length) return ok_()
    var sh   = openOrCreate_(ss, sheet)
    var last = sh.getLastRow()
    sh.getRange(last + 1, 1, rows.length, rows[0].length).setValues(rows)
    return ok_()
  }

  // Update a specific row (1-based rowIndex)
  if (action === 'update') {
    var sh = ss.getSheetByName(sheet)
    if (!sh) return err_('SHEET_NOT_FOUND')
    sh.getRange(body.rowIndex, 1, 1, values.length).setValues([values])
    return ok_()
  }

  // Update a single cell (e.g. cell = "I1")
  if (action === 'updateCell') {
    var sh = ss.getSheetByName(sheet)
    if (!sh) return err_('SHEET_NOT_FOUND')
    sh.getRange(body.cell).setValue(body.value)
    return ok_()
  }

  // Write column headers to row 1 (creates sheet if absent)
  if (action === 'writeHeaders') {
    var sh = openOrCreate_(ss, sheet)
    sh.getRange(1, 1, 1, values.length).setValues([values])
    return ok_()
  }

  // Create a new sheet tab (silently ignore if it already exists)
  if (action === 'createSheet') {
    try { ss.insertSheet(sheet) } catch(ex) { /* already exists */ }
    return ok_()
  }

  return err_('UNKNOWN_ACTION')
}
