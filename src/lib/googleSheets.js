import { CONFIG, SHEETS, COLS } from './constants'
import { getToken } from './auth'

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// ─── Core fetch wrapper ───────────────────────────────────────
async function sheetsRequest(path, options = {}) {
  const token = getToken()
  if (!token) throw new Error('NOT_AUTHENTICATED')

  const url = `${BASE}/${CONFIG.SPREADSHEET_ID}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Sheets API error')
  }
  return res.json()
}

// ─── READ: Get all rows from a sheet ─────────────────────────
export async function getSheetData(sheetName) {
  const data = await sheetsRequest(`/values/${sheetName}!A:Z`)
  const rows = data.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 } // 1-indexed, +1 for header
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    return obj
  })
}

// ─── READ: Get raw values (no header mapping) ─────────────────
export async function getRawValues(range) {
  const data = await sheetsRequest(`/values/${range}`)
  return data.values || []
}

// ─── APPEND: Add a new row ────────────────────────────────────
export async function appendRow(sheetName, values) {
  return sheetsRequest(
    `/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [values] }) }
  )
}

// ─── UPDATE: Edit a specific row ─────────────────────────────
export async function updateRow(sheetName, rowIndex, values) {
  const colLetter = String.fromCharCode(64 + values.length)
  return sheetsRequest(
    `/values/${sheetName}!A${rowIndex}:${colLetter}${rowIndex}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values: [values] }) }
  )
}

// ─── UPDATE: Single cell ──────────────────────────────────────
export async function updateCell(sheetName, cell, value) {
  return sheetsRequest(
    `/values/${sheetName}!${cell}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values: [[value]] }) }
  )
}

// ─── DELETE: Clear a row (marks as deleted, keeps audit trail) ─
export async function clearRow(sheetName, rowIndex, colCount = 10) {
  const colLetter = String.fromCharCode(64 + colCount)
  return sheetsRequest(
    `/values/${sheetName}!A${rowIndex}:${colLetter}${rowIndex}/clear`,
    { method: 'POST' }
  )
}

// ─── AUDIT: Write audit log entry ────────────────────────────
export async function writeAuditLog({ userEmail, userName, action, module, recordId, oldValue, newValue }) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return appendRow(SHEETS.AUDIT, [
    timestamp, userEmail, userName, action, module,
    recordId || '',
    oldValue ? JSON.stringify(oldValue) : '',
    newValue ? JSON.stringify(newValue) : ''
  ])
}

// ─── GENERATE ID ──────────────────────────────────────────────
export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
}

// ─── INITIALIZE SHEET HEADERS ────────────────────────────────
export async function initializeSheetHeaders() {
  const headers = {
    [SHEETS.QUARTERS]:     ['Quarter_ID','Quarter_No','Type','Block','Location','Status','Remarks'],
    [SHEETS.EMPLOYEES]:    ['Emp_ID','Name','Designation','Department','Category','Active'],
    [SHEETS.ALLOTMENTS]:   ['Allotment_ID','Quarter_ID','Emp_ID','Allotment_Date','Allotment_Type','Rent','Vacated_Date','Status','Remarks'],
    [SHEETS.KEY_REGISTER]: ['Key_ID','Quarter_ID','Held_By','Issued_Date','Returned_Date','Status','Remarks'],
    [SHEETS.RENT]:         ['Rent_ID','Allotment_ID','Quarter_ID','Emp_ID','Month','Standard_Rent','Actual_Recovery','Difference','Remarks'],
    [SHEETS.AUDIT]:        ['Timestamp','User_Email','User_Name','Action','Module','Record_ID','Old_Value','New_Value'],
  }

  for (const [sheet, cols] of Object.entries(headers)) {
    try {
      const existing = await getRawValues(`${sheet}!A1:H1`)
      if (!existing.length) {
        await sheetsRequest(
          `/values/${sheet}!A1:${String.fromCharCode(64 + cols.length)}1?valueInputOption=RAW`,
          { method: 'PUT', body: JSON.stringify({ values: [cols] }) }
        )
      }
    } catch (e) {
      console.warn(`Could not init headers for ${sheet}:`, e.message)
    }
  }
}

// ─── QUARTERS HELPERS ─────────────────────────────────────────
export async function getAllQuarters() {
  return getSheetData(SHEETS.QUARTERS)
}

export async function addQuarter(data, user) {
  const id = generateId('QTR')
  const row = [id, data.quarter_no, data.type, data.block, data.location, data.status, data.remarks || '']
  await appendRow(SHEETS.QUARTERS, row)
  await writeAuditLog({ ...user, action: 'ADD_QUARTER', module: 'Quarters', recordId: id, newValue: data })
  return id
}

export async function updateQuarter(rowIndex, data, oldData, user) {
  const row = [data.Quarter_ID, data.Quarter_No, data.Type, data.Block, data.Location, data.Status, data.Remarks || '']
  await updateRow(SHEETS.QUARTERS, rowIndex, row)
  await writeAuditLog({ ...user, action: 'UPDATE_QUARTER', module: 'Quarters', recordId: data.Quarter_ID, oldValue: oldData, newValue: data })
}

// ─── EMPLOYEE HELPERS ─────────────────────────────────────────
export async function getAllEmployees() {
  return getSheetData(SHEETS.EMPLOYEES)
}

export async function addEmployee(data, user) {
  const id = generateId('EMP')
  const row = [id, data.name, data.designation, data.department, data.category, 'TRUE']
  await appendRow(SHEETS.EMPLOYEES, row)
  await writeAuditLog({ ...user, action: 'ADD_EMPLOYEE', module: 'Employees', recordId: id, newValue: data })
  return id
}

// ─── ALLOTMENT HELPERS ────────────────────────────────────────
export async function getAllAllotments() {
  return getSheetData(SHEETS.ALLOTMENTS)
}

export async function createAllotment(data, user) {
  const id = generateId('ALT')
  const row = [
    id, data.quarter_id, data.emp_id,
    data.allotment_date, data.allotment_type,
    data.rent, '', 'Active', data.remarks || ''
  ]
  await appendRow(SHEETS.ALLOTMENTS, row)
  // Update quarter status to Occupied
  const quarters = await getAllQuarters()
  const q = quarters.find(q => q.Quarter_ID === data.quarter_id)
  if (q) await updateQuarter(q._rowIndex, { ...q, Status: 'Occupied' }, q, user)
  await writeAuditLog({ ...user, action: 'CREATE_ALLOTMENT', module: 'Allotments', recordId: id, newValue: data })
  return id
}

export async function vacateAllotment(allotment, vacatedDate, user) {
  const row = [
    allotment.Allotment_ID, allotment.Quarter_ID, allotment.Emp_ID,
    allotment.Allotment_Date, allotment.Allotment_Type,
    allotment.Rent, vacatedDate, 'Vacated', allotment.Remarks || ''
  ]
  await updateRow(SHEETS.ALLOTMENTS, allotment._rowIndex, row)
  // Update quarter status to Vacant
  const quarters = await getAllQuarters()
  const q = quarters.find(q => q.Quarter_ID === allotment.Quarter_ID)
  if (q) await updateQuarter(q._rowIndex, { ...q, Status: 'Vacant' }, q, user)
  await writeAuditLog({ ...user, action: 'VACATE_ALLOTMENT', module: 'Allotments', recordId: allotment.Allotment_ID, oldValue: allotment, newValue: { vacatedDate } })
}

// ─── KEY REGISTER HELPERS ─────────────────────────────────────
export async function getAllKeys() {
  return getSheetData(SHEETS.KEY_REGISTER)
}

export async function issueKey(data, user) {
  const id = generateId('KEY')
  const row = [id, data.quarter_id, data.held_by, data.issued_date, '', 'Issued', data.remarks || '']
  await appendRow(SHEETS.KEY_REGISTER, row)
  await writeAuditLog({ ...user, action: 'ISSUE_KEY', module: 'Key_Register', recordId: id, newValue: data })
  return id
}

export async function returnKey(keyRecord, returnedDate, user) {
  const row = [
    keyRecord.Key_ID, keyRecord.Quarter_ID, keyRecord.Held_By,
    keyRecord.Issued_Date, returnedDate, 'Returned', keyRecord.Remarks || ''
  ]
  await updateRow(SHEETS.KEY_REGISTER, keyRecord._rowIndex, row)
  await writeAuditLog({ ...user, action: 'RETURN_KEY', module: 'Key_Register', recordId: keyRecord.Key_ID, newValue: { returnedDate } })
}

// ─── RENT HELPERS ─────────────────────────────────────────────
export async function getAllRent() {
  return getSheetData(SHEETS.RENT)
}

export async function addRentEntry(data, user) {
  const id = generateId('RNT')
  const diff = (parseFloat(data.standard_rent) - parseFloat(data.actual_recovery)).toFixed(2)
  const row = [id, data.allotment_id, data.quarter_id, data.emp_id, data.month, data.standard_rent, data.actual_recovery, diff, data.remarks || '']
  await appendRow(SHEETS.RENT, row)
  await writeAuditLog({ ...user, action: 'ADD_RENT', module: 'Rent', recordId: id, newValue: data })
  return id
}

// ─── AUDIT LOG ────────────────────────────────────────────────
export async function getAuditLog() {
  return getSheetData(SHEETS.AUDIT)
}
