import React, { useState, useRef, useMemo } from 'react'
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { bulkAppend } from '../lib/googleSheets'
import { SHEETS, QUARTER_TYPES, LOCATIONS, STATUSES, DEPARTMENTS, CATEGORIES, ALLOTMENT_TYPES, typeDisplay, TYPE_MASTER } from '../lib/constants'

// ── Template definitions ────────────────────────────────────────
const TEMPLATES = {
  quarters: {
    label: 'Quarters',
    headers: ['Quarter_No', 'Type', 'Block', 'Location', 'Status', 'Remarks'],
    example: ['D-7/A', 'Type-A', '7', 'Jhakri', 'Vacant', ''],
    sheet: SHEETS.QUARTERS,
  },
  employees: {
    label: 'Employees',
    headers: ['Name', 'Designation', 'Department', 'Category'],
    example: ['Sh. Ramesh Kumar', 'Junior Engineer', 'NJHPS', 'General'],
    sheet: SHEETS.EMPLOYEES,
  },
  allotments: {
    label: 'Allotments (Historical)',
    headers: ['Quarter_No', 'Emp_Name_or_ID', 'Allotment_Date', 'Allotment_Type', 'Rent', 'Vacated_Date', 'Status', 'Remarks'],
    example: ['D-7/A', 'Sh. Ramesh Kumar', '2020-04-01', 'New Allotment', '250', '2023-03-31', 'Vacated', ''],
    sheet: SHEETS.ALLOTMENTS,
    note: 'Quarter statuses are not auto-updated in bulk mode. Use the Allotments page for live allotments.',
  },
  keys: {
    label: 'Key Register',
    headers: ['Quarter_No', 'Held_By', 'Issued_Date', 'Returned_Date', 'Status', 'Remarks'],
    example: ['D-7/A', 'Store Section', '2024-01-15', '2024-01-22', 'Returned', ''],
    sheet: SHEETS.KEY_REGISTER,
  },
  rent: {
    label: 'Rent Recovery',
    headers: ['Quarter_No', 'Emp_Name_or_ID', 'Month', 'Standard_Rent', 'Actual_Recovery', 'Remarks'],
    example: ['D-7/A', 'Sh. Ramesh Kumar', '2024-04', '250', '250', ''],
    sheet: SHEETS.RENT,
  },
}

const TABS = Object.keys(TEMPLATES)

// ── Simple CSV parser ────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = splitCSVLine(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(l => splitCSVLine(l))
  return { headers, rows }
}

function splitCSVLine(line) {
  const result = []; let cur = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else { cur += c }
  }
  result.push(cur.trim())
  return result
}

function makeCSV(headers, rows) {
  const escape = v => (String(v).includes(',') || String(v).includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
}

function downloadCSV(filename, content) {
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content)
  a.download = filename
  a.click()
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`
}

// ── Validators per tab ───────────────────────────────────────────
function validateRow(tab, row, headers, quarters, employees) {
  const errors = []
  const get = key => row[headers.indexOf(key)] || ''

  if (tab === 'quarters') {
    if (!get('Quarter_No')) errors.push('Quarter_No required')
    if (!get('Type'))       errors.push('Type required')
    if (get('Type') && !QUARTER_TYPES.includes(get('Type'))) errors.push(`Type "${get('Type')}" not valid. Use: ${QUARTER_TYPES.join(', ')}`)
    if (!get('Location'))   errors.push('Location required')
    if (get('Location') && !LOCATIONS.includes(get('Location'))) errors.push(`Location "${get('Location')}" not valid`)
    if (get('Status') && !STATUSES.includes(get('Status'))) errors.push(`Status "${get('Status')}" not valid`)
  }

  if (tab === 'employees') {
    if (!get('Name'))        errors.push('Name required')
    if (!get('Designation')) errors.push('Designation required')
    if (get('Department') && !DEPARTMENTS.includes(get('Department'))) errors.push(`Department not valid`)
    if (get('Category') && !CATEGORIES.includes(get('Category')))     errors.push(`Category not valid`)
  }

  if (tab === 'allotments') {
    const qNo = get('Quarter_No')
    const emp = get('Emp_Name_or_ID')
    if (!qNo) errors.push('Quarter_No required')
    else if (!quarters.find(q => q.Quarter_No?.toLowerCase() === qNo.toLowerCase())) errors.push(`Quarter "${qNo}" not found`)
    if (!emp) errors.push('Emp_Name_or_ID required')
    if (!get('Allotment_Date')) errors.push('Allotment_Date required')
    if (get('Allotment_Type') && !ALLOTMENT_TYPES.includes(get('Allotment_Type'))) errors.push('Allotment_Type not valid')
    if (get('Status') && !['Active','Vacated'].includes(get('Status'))) errors.push('Status must be Active or Vacated')
  }

  if (tab === 'keys') {
    const qNo = get('Quarter_No')
    if (!qNo) errors.push('Quarter_No required')
    else if (!quarters.find(q => q.Quarter_No?.toLowerCase() === qNo.toLowerCase())) errors.push(`Quarter "${qNo}" not found`)
    if (!get('Held_By'))    errors.push('Held_By required')
    if (!get('Issued_Date')) errors.push('Issued_Date required')
    if (get('Status') && !['Issued','Returned'].includes(get('Status'))) errors.push('Status must be Issued or Returned')
  }

  if (tab === 'rent') {
    const qNo = get('Quarter_No')
    if (!qNo) errors.push('Quarter_No required')
    else if (!quarters.find(q => q.Quarter_No?.toLowerCase() === qNo.toLowerCase())) errors.push(`Quarter "${qNo}" not found`)
    if (!get('Emp_Name_or_ID'))    errors.push('Emp_Name_or_ID required')
    if (!get('Month'))             errors.push('Month required (YYYY-MM)')
    if (!get('Actual_Recovery'))   errors.push('Actual_Recovery required')
  }

  return errors
}

// ── Row → Sheet row mapper ────────────────────────────────────────
function mapRow(tab, row, headers, quarters, employees) {
  const get = key => row[headers.indexOf(key)] || ''
  const findQ = qNo => quarters.find(q => q.Quarter_No?.toLowerCase() === qNo.toLowerCase())
  const findE = nameOrId => employees.find(e =>
    e.Emp_ID === nameOrId || e.Name?.toLowerCase() === nameOrId.toLowerCase()
  )

  if (tab === 'quarters') {
    const id = generateId('QTR')
    return [id, get('Quarter_No'), get('Type'), get('Block'), get('Location'), get('Status') || 'Vacant', get('Remarks')]
  }

  if (tab === 'employees') {
    const id = generateId('EMP')
    return [id, get('Name'), get('Designation'), get('Department') || 'NJHPS', get('Category') || 'General', 'TRUE']
  }

  if (tab === 'allotments') {
    const id  = generateId('ALT')
    const q   = findQ(get('Quarter_No'))
    const e   = findE(get('Emp_Name_or_ID'))
    return [
      id, q?.Quarter_ID || '', e?.Emp_ID || '',
      get('Allotment_Date'), get('Allotment_Type') || 'New Allotment',
      get('Rent') || '', get('Vacated_Date') || '',
      get('Status') || 'Vacated', get('Remarks')
    ]
  }

  if (tab === 'keys') {
    const id = generateId('KEY')
    const q  = findQ(get('Quarter_No'))
    return [
      id, q?.Quarter_ID || '', get('Held_By'),
      get('Issued_Date'), get('Returned_Date') || '',
      get('Status') || 'Returned', get('Remarks')
    ]
  }

  if (tab === 'rent') {
    const id  = generateId('RNT')
    const q   = findQ(get('Quarter_No'))
    const e   = findE(get('Emp_Name_or_ID'))
    const altId = '' // no allotment_id available in bulk mode
    const std = parseFloat(get('Standard_Rent')) || 0
    const rec = parseFloat(get('Actual_Recovery')) || 0
    return [
      id, altId, q?.Quarter_ID || '', e?.Emp_ID || '',
      get('Month'), std, rec, (std - rec).toFixed(2), get('Remarks')
    ]
  }

  return []
}

// ── Component ────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const { quarters, employees, fetchAll } = useData()
  const { auditUser } = useAuth()
  const [tab, setTab]         = useState('quarters')
  const [parsed, setParsed]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]       = useState(null)
  const fileRef               = useRef()

  const tmpl = TEMPLATES[tab]

  function downloadTemplate() {
    downloadCSV(`njhps_${tab}_template.csv`, makeCSV(tmpl.headers, [tmpl.example]))
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result)
      const validating = rows.map((row, i) => {
        const errors = validateRow(tab, row, headers, quarters, employees)
        return { i, row, errors, ok: errors.length === 0 }
      })
      setParsed({ headers, validating })
      setDone(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const validRows  = useMemo(() => parsed?.validating.filter(r => r.ok)  || [], [parsed])
  const errorRows  = useMemo(() => parsed?.validating.filter(r => !r.ok) || [], [parsed])

  async function handleUpload() {
    if (!validRows.length) return
    setUploading(true)
    try {
      const sheetRows = validRows.map(({ row }) => mapRow(tab, row, parsed.headers, quarters, employees))
      await bulkAppend(tmpl.sheet, sheetRows)
      setDone({ count: sheetRows.length })
      setParsed(null)
      await fetchAll()
    } catch(e) {
      alert('Upload failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  function reset() { setParsed(null); setDone(null) }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">

      {/* ── Tab selector ── */}
      <div className="flex overflow-x-auto gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); reset() }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            {TEMPLATES[t].label}
          </button>
        ))}
      </div>

      {/* ── Template download + upload ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{tmpl.label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Columns: {tmpl.headers.join(', ')}</p>
          </div>
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
        </div>

        {tmpl.note && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{tmpl.note}</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <button onClick={() => { reset(); fileRef.current?.click() }}
          className="btn-primary w-full flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" /> Choose CSV File
        </button>
      </div>

      {/* ── Success banner ── */}
      {done && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">{done.count} rows uploaded successfully</p>
            <p className="text-xs text-emerald-600 mt-0.5">Data has been refreshed from the sheet.</p>
          </div>
        </div>
      )}

      {/* ── Parse results ── */}
      {parsed && (
        <div className="space-y-3">

          {/* Summary bar */}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle className="w-4 h-4" /> {validRows.length} valid
            </div>
            {errorRows.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                <XCircle className="w-4 h-4" /> {errorRows.length} errors
              </div>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={reset} className="btn-secondary text-xs py-1.5 px-3">Clear</button>
              {validRows.length > 0 && (
                <button onClick={handleUpload} disabled={uploading}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  {uploading ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : `Upload ${validRows.length} rows`}
                </button>
              )}
            </div>
          </div>

          {/* Error rows */}
          {errorRows.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 space-y-2">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Rows with errors (skipped)</p>
              {errorRows.map(({ i, row, errors }) => (
                <div key={i} className="bg-white rounded-xl p-2.5 border border-rose-100">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1">Row {i + 2}: {row.slice(0,3).join(' · ')}</p>
                  {errors.map((e, j) => <p key={j} className="text-[11px] text-rose-600">• {e}</p>)}
                </div>
              ))}
            </div>
          )}

          {/* Preview table for valid rows */}
          {validRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-700">Preview — first {Math.min(10, validRows.length)} valid rows</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {parsed.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {validRows.slice(0, 10).map(({ i, row }) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-slate-600 whitespace-nowrap">{cell || <span className="text-slate-300">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validRows.length > 10 && (
                <p className="text-[11px] text-slate-400 text-center py-2 border-t border-slate-100">
                  … and {validRows.length - 10} more rows
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Field guide ── */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Field Reference — {tmpl.label}</p>
        <FieldGuide tab={tab} />
      </div>

    </div>
  )
}

function FieldGuide({ tab }) {
  const guides = {
    quarters: [
      ['Quarter_No', 'Required', 'e.g. D-7/A, B-12'],
      ['Type', 'Required', 'One of: ' + QUARTER_TYPES.map(t => `${t} (${typeDisplay(t)})`).join(', ')],
      ['Block', 'Optional', 'Block letter or number'],
      ['Location', 'Required', 'One of: ' + LOCATIONS.join(', ')],
      ['Status', 'Default: Vacant', 'One of: ' + STATUSES.join(', ')],
      ['Remarks', 'Optional', 'Any notes'],
    ],
    employees: [
      ['Name', 'Required', 'Full name'],
      ['Designation', 'Required', 'e.g. Junior Engineer'],
      ['Department', 'Default: NJHPS', 'One of: ' + DEPARTMENTS.join(', ')],
      ['Category', 'Default: General', 'One of: ' + CATEGORIES.join(', ')],
    ],
    allotments: [
      ['Quarter_No', 'Required', 'Must match an existing quarter'],
      ['Emp_Name_or_ID', 'Required', 'Employee name or Emp_ID (EMP-…)'],
      ['Allotment_Date', 'Required', 'YYYY-MM-DD'],
      ['Allotment_Type', 'Optional', 'One of: ' + ALLOTMENT_TYPES.join(', ')],
      ['Rent', 'Optional', 'Monthly rent amount'],
      ['Vacated_Date', 'Optional', 'YYYY-MM-DD — fill for historical records'],
      ['Status', 'Default: Vacated', 'Active or Vacated'],
      ['Remarks', 'Optional', ''],
    ],
    keys: [
      ['Quarter_No', 'Required', 'Must match an existing quarter'],
      ['Held_By', 'Required', 'Person / section holding the key'],
      ['Issued_Date', 'Required', 'YYYY-MM-DD'],
      ['Returned_Date', 'Optional', 'YYYY-MM-DD'],
      ['Status', 'Default: Returned', 'Issued or Returned'],
      ['Remarks', 'Optional', ''],
    ],
    rent: [
      ['Quarter_No', 'Required', 'Must match an existing quarter'],
      ['Emp_Name_or_ID', 'Required', 'Employee name or Emp_ID'],
      ['Month', 'Required', 'YYYY-MM format (e.g. 2024-04)'],
      ['Standard_Rent', 'Optional', 'Amount in ₹'],
      ['Actual_Recovery', 'Required', 'Amount actually recovered'],
      ['Remarks', 'Optional', ''],
    ],
  }

  return (
    <div className="space-y-1.5">
      {(guides[tab] || []).map(([field, req, note]) => (
        <div key={field} className="flex gap-2 text-xs">
          <span className="font-bold text-slate-700 w-32 flex-shrink-0">{field}</span>
          <span className={`w-28 flex-shrink-0 ${req.startsWith('Required') ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>{req}</span>
          <span className="text-slate-500">{note}</span>
        </div>
      ))}
    </div>
  )
}

