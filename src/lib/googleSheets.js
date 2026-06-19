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

// ─── CREATE MISSING SHEET TAB ─────────────────────────────────
async function createSheetTab(title) {
  await sheetsRequest(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  })
}

// ─── INITIALIZE SHEET HEADERS ────────────────────────────────
export async function initializeSheetHeaders() {
  const headers = {
    [SHEETS.QUARTERS]:     ['Quarter_ID','Quarter_No','Type','Block','Location','Status','Remarks'],
    [SHEETS.EMPLOYEES]:    ['Emp_ID','Name','Designation','Department','Category','Active','Grade_Level','Seniority_Date'],
    [SHEETS.ALLOTMENTS]:   ['Allotment_ID','Quarter_ID','Emp_ID','Allotment_Date','Allotment_Type','Rent','Vacated_Date','Status','Remarks'],
    [SHEETS.KEY_REGISTER]: ['Key_ID','Quarter_ID','Held_By','Issued_Date','Returned_Date','Status','Remarks'],
    [SHEETS.RENT]:         ['Rent_ID','Allotment_ID','Quarter_ID','Emp_ID','Month','Standard_Rent','Actual_Recovery','Difference','Remarks'],
    [SHEETS.ORDERS]:       ['Order_ID','Order_No','Draft_Date','Effective_Date','Allottee_Category','Allotment_Mode','Quarter_ID','Old_Quarter_ID','Emp_ID','Entity_Name','Entity_Type','SJVN_Unit','Rent','Remarks','Status','Issued_Date','Rejected_Date','Rejected_Reason','Created_By'],
    [SHEETS.AUDIT]:        ['Timestamp','User_Email','User_Name','Action','Module','Record_ID','Old_Value','New_Value'],
  }

  for (const [sheet, cols] of Object.entries(headers)) {
    try {
      const existing = await getRawValues(`${sheet}!A1:A1`)
      if (!existing.length) {
        await sheetsRequest(
          `/values/${sheet}!A1:${String.fromCharCode(64 + cols.length)}1?valueInputOption=RAW`,
          { method: 'PUT', body: JSON.stringify({ values: [cols] }) }
        )
      }
    } catch (e) {
      // Sheet tab doesn't exist — create it then write headers
      if (e.message?.includes('Unable to parse range') || e.message?.includes('not found')) {
        try {
          await createSheetTab(sheet)
          await sheetsRequest(
            `/values/${sheet}!A1:${String.fromCharCode(64 + cols.length)}1?valueInputOption=RAW`,
            { method: 'PUT', body: JSON.stringify({ values: [cols] }) }
          )
          console.log(`Created sheet tab: ${sheet}`)
        } catch (e2) {
          console.warn(`Could not create sheet ${sheet}:`, e2.message)
        }
      } else {
        console.warn(`Could not init headers for ${sheet}:`, e.message)
      }
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
  const row = [id, data.name, data.designation, data.department, data.category, 'TRUE', data.grade_level || '', data.seniority_date || '']
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

/** Create a historical (already-vacated) allotment record — does NOT touch quarter status */
export async function createHistoricalAllotment(data, user) {
  const id = generateId('ALT')
  const row = [
    id, data.quarter_id, data.emp_id,
    data.allotment_date, data.allotment_type,
    data.rent || '', data.vacated_date || '', 'Vacated', data.remarks || ''
  ]
  await appendRow(SHEETS.ALLOTMENTS, row)
  await writeAuditLog({ ...user, action: 'CREATE_HISTORICAL_ALLOTMENT', module: 'Allotments', recordId: id, newValue: data })
  return id
}

/** Append multiple rows in a single API call (for bulk upload) */
export async function bulkAppend(sheetName, rows) {
  if (!rows.length) return
  return sheetsRequest(
    `/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  )
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

// ─── DRAFT ORDERS HELPERS ─────────────────────────────────────

export async function getAllOrders() {
  try { return await getSheetData(SHEETS.ORDERS) } catch { return [] }
}

export async function createDraftOrder(data, user) {
  const id       = generateId('ORD')
  const today    = new Date().toISOString().split('T')[0]
  const row = [
    id, data.order_no, today, data.effective_date || today,
    data.category || '', data.mode || 'New Allotment',
    data.quarter_id || '', data.old_quarter_id || '',
    data.emp_id || '', data.entity_name || '', data.entity_type || '',
    data.sjvn_unit || '', data.rent || '', data.remarks || '',
    'Draft', '', '', '', user.userName || user.userEmail || '',
  ]
  await appendRow(SHEETS.ORDERS, row)
  await writeAuditLog({ ...user, action: 'CREATE_DRAFT_ORDER', module: 'Orders', recordId: id, newValue: data })
  return id
}

export async function issueOrder(order, currentAllotments, user) {
  let empId = order.Emp_ID

  // For agency / trainee: ensure an employee record exists so allotment links work
  if (!empId && order.Entity_Name) {
    const deptMap = { 'Apprentice / Trainee': 'Trainees', 'Outside Agency': 'External Agency' }
    empId = await addEmployee({
      name:        order.Entity_Name,
      designation: order.Entity_Type || order.Allottee_Category || 'External',
      department:  deptMap[order.Allottee_Category] || 'External Agency',
      category:    'External',
    }, user)
  }

  // For Change / Renewal: vacate old allotment first
  if (['Change','Renewal'].includes(order.Allotment_Mode) && order.Old_Quarter_ID) {
    const oldAlt = currentAllotments.find(a => a.Quarter_ID === order.Old_Quarter_ID && a.Status === 'Active')
    if (oldAlt) {
      await vacateAllotment(oldAlt, order.Effective_Date || new Date().toISOString().split('T')[0], user)
    }
  }

  // Create allotment (also marks quarter Occupied)
  const altId = await createAllotment({
    quarter_id:     order.Quarter_ID,
    emp_id:         empId || '',
    allotment_date: order.Effective_Date || new Date().toISOString().split('T')[0],
    allotment_type: order.Allotment_Mode || 'New Allotment',
    rent:           order.Rent || '',
    remarks:        `Order: ${order.Order_No}. ${order.Remarks || ''}`.trim(),
  }, user)

  // Update order row status → Issued
  const issuedDate = new Date().toISOString().split('T')[0]
  await updateRow(SHEETS.ORDERS, order._rowIndex, buildOrderRow({ ...order, Status: 'Issued', Issued_Date: issuedDate, Rejected_Date: '', Rejected_Reason: '' }))
  await writeAuditLog({ ...user, action: 'ISSUE_ORDER', module: 'Orders', recordId: order.Order_ID, newValue: { issuedDate, altId } })
  return altId
}

export async function rejectOrder(order, reason, user) {
  const rejectedDate = new Date().toISOString().split('T')[0]
  await updateRow(SHEETS.ORDERS, order._rowIndex, buildOrderRow({ ...order, Status: 'Rejected', Issued_Date: '', Rejected_Date: rejectedDate, Rejected_Reason: reason }))
  await writeAuditLog({ ...user, action: 'REJECT_ORDER', module: 'Orders', recordId: order.Order_ID, newValue: { reason } })
}

export async function withdrawOrder(order, user) {
  await updateRow(SHEETS.ORDERS, order._rowIndex, buildOrderRow({ ...order, Status: 'Withdrawn', Issued_Date: '', Rejected_Date: '', Rejected_Reason: '' }))
  await writeAuditLog({ ...user, action: 'WITHDRAW_ORDER', module: 'Orders', recordId: order.Order_ID })
}

function buildOrderRow(o) {
  return [
    o.Order_ID, o.Order_No, o.Draft_Date || '', o.Effective_Date || '',
    o.Allottee_Category || '', o.Allotment_Mode || '',
    o.Quarter_ID || '', o.Old_Quarter_ID || '',
    o.Emp_ID || '', o.Entity_Name || '', o.Entity_Type || '',
    o.SJVN_Unit || '', o.Rent || '', o.Remarks || '',
    o.Status || 'Draft',
    o.Issued_Date || '', o.Rejected_Date || '', o.Rejected_Reason || '',
    o.Created_By || '',
  ]
}

// ─── AUDIT LOG ────────────────────────────────────────────────
export async function getAuditLog() {
  try { return await getSheetData(SHEETS.AUDIT) } catch { return [] }
}
