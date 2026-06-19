import React, { useState, useMemo } from 'react'
import {
  FileText, Printer, Building2, IndianRupee, Key,
  CheckSquare, Square, TrendingUp, AlertCircle, Users
} from 'lucide-react'
import { useData } from '../context/DataContext'

const TABS = [
  { key: 'orders',    label: 'Orders',    icon: FileText   },
  { key: 'occupancy', label: 'Occupancy', icon: Building2  },
  { key: 'rent',      label: 'Rent',      icon: IndianRupee},
  { key: 'keys',      label: 'Keys',      icon: Key        },
]

const TYPE_ORDER = ['D1','D','C','V','IV','B','III','II','A','I','C&D','0']
function sortedTypes(map) {
  return Object.keys(map).sort((a, b) => {
    const sa = a.replace(/^Type-/i,''), sb = b.replace(/^Type-/i,'')
    const ia = TYPE_ORDER.indexOf(sa), ib = TYPE_ORDER.indexOf(sb)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1; if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

export default function ReportsPage() {
  const [tab, setTab] = useState('orders')
  const data = useData()

  return (
    <div className="p-4 space-y-3">
      {/* Tab bar */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'orders'    && <OrdersSection    {...data} />}
      {tab === 'occupancy' && <OccupancySection {...data} />}
      {tab === 'rent'      && <RentSection      {...data} />}
      {tab === 'keys'      && <KeysSection      {...data} />}
    </div>
  )
}

/* ──────────────── ORDERS ──────────────────────────────────── */

function OrdersSection({ allotments, quarters, employees }) {
  const [mode,      setMode]      = useState('single')
  const [selAlt,    setSelAlt]    = useState(null)
  const [orderNo,   setOrderNo]   = useState('')
  const [orderDate, setOrderDate] = useState(todayStr())
  const [bulkSel,   setBulkSel]   = useState(new Set())
  const [bulkDate,  setBulkDate]  = useState(todayStr())
  const [searchQ,   setSearchQ]   = useState('')

  const active = useMemo(() => allotments
    .filter(a => a.Status === 'Active')
    .map(a => ({
      ...a,
      emp: employees.find(e => e.Emp_ID === a.Emp_ID),
      qtr: quarters.find(q => q.Quarter_ID === a.Quarter_ID),
    })), [allotments, employees, quarters])

  const filteredActive = useMemo(() => {
    const s = searchQ.toLowerCase()
    if (!s) return active
    return active.filter(a =>
      a.emp?.Name?.toLowerCase().includes(s) ||
      a.qtr?.Quarter_No?.toLowerCase().includes(s) ||
      a.emp?.Department?.toLowerCase().includes(s)
    )
  }, [active, searchQ])

  function pickAllotment(id) {
    const a = active.find(x => x.Allotment_ID === id)
    setSelAlt(a || null)
    if (a) {
      const idx = active.indexOf(a) + 1
      setOrderNo(String(idx).padStart(3, '0'))
    }
  }

  function printSingle() {
    if (!selAlt) return
    printContent(generateOrderPage(selAlt, orderNo, orderDate), `Allotment Order — ${selAlt.qtr?.Quarter_No || ''}`)
  }

  function printBulk() {
    if (!bulkSel.size) return
    const list = filteredActive.filter(a => bulkSel.has(a.Allotment_ID))
    const pages = list.map((a, i) =>
      generateOrderPage(a, String(i + 1).padStart(3, '0'), bulkDate) +
      (i < list.length - 1 ? '<div style="page-break-after:always"></div>' : '')
    ).join('')
    printContent(pages, `Bulk Allotment Orders (${list.length})`)
  }

  const allChecked = filteredActive.length > 0 && filteredActive.every(a => bulkSel.has(a.Allotment_ID))
  function toggleAll() {
    setBulkSel(allChecked
      ? new Set()
      : new Set(filteredActive.map(a => a.Allotment_ID))
    )
  }
  function toggleOne(id) {
    setBulkSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <ModeBtn active={mode==='single'} onClick={() => setMode('single')} label="Single Order" />
        <ModeBtn active={mode==='bulk'}   onClick={() => setMode('bulk')}   label="Bulk Orders" />
      </div>

      {mode === 'single' && (
        <div className="space-y-3">
          <div>
            <label className="label">Select Active Allotment</label>
            <select className="input" value={selAlt?.Allotment_ID || ''} onChange={e => pickAllotment(e.target.value)}>
              <option value="">— Select Allotment —</option>
              {active.map(a => (
                <option key={a.Allotment_ID} value={a.Allotment_ID}>
                  {a.qtr?.Quarter_No || a.Quarter_ID} · {a.emp?.Name || a.Emp_ID} · {a.emp?.Department || ''}
                </option>
              ))}
            </select>
          </div>

          {selAlt && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Order No.</label>
                  <input className="input font-mono" placeholder="e.g. 001" value={orderNo} onChange={e => setOrderNo(e.target.value)} />
                </div>
                <div>
                  <label className="label">Order Date</label>
                  <input className="input" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                </div>
              </div>

              {/* Preview card */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-800 px-3 py-2">
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Order Preview</p>
                </div>
                <div className="p-3 space-y-1.5 text-xs">
                  <PreviewRow label="Order No" value={`NJHPS/QTR/ALLOT/${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(2)}/${orderNo || '___'}`} />
                  <PreviewRow label="Quarter"      value={`${selAlt.qtr?.Quarter_No || '—'} (${selAlt.qtr?.Type || '—'})`} />
                  <PreviewRow label="Location"     value={`${selAlt.qtr?.Location || '—'}${selAlt.qtr?.Block ? ' / Block '+selAlt.qtr.Block : ''}`} />
                  <PreviewRow label="Allottee"     value={selAlt.emp?.Name || selAlt.Emp_ID} />
                  <PreviewRow label="Designation"  value={selAlt.emp?.Designation || '—'} />
                  <PreviewRow label="Department"   value={selAlt.emp?.Department || '—'} />
                  <PreviewRow label="Category"     value={selAlt.emp?.Category || '—'} />
                  <PreviewRow label="Allot. Date"  value={fmtDate(selAlt.Allotment_Date)} />
                  <PreviewRow label="Type"         value={selAlt.Allotment_Type || '—'} />
                  <PreviewRow label="Monthly Rent" value={selAlt.Rent ? `₹ ${selAlt.Rent}` : 'As per rules'} />
                </div>
              </div>

              <button onClick={printSingle} className="btn-primary w-full flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Print Allotment Order
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'bulk' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Order Date</label>
              <input className="input" type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Search</label>
              <input className="input" placeholder="Filter list…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-3 py-2 flex items-center justify-between">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-semibold">
                {allChecked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 opacity-40" />}
                Select All ({bulkSel.size} / {filteredActive.length})
              </button>
              {bulkSel.size > 0 && (
                <button onClick={printBulk}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print {bulkSel.size}
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredActive.map(a => {
                const checked = bulkSel.has(a.Allotment_ID)
                return (
                  <div key={a.Allotment_ID} onClick={() => toggleOne(a.Allotment_ID)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                    {checked ? <CheckSquare className="w-4 h-4 text-brand-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.emp?.Name || a.Emp_ID}</p>
                      <p className="text-[11px] text-slate-400 truncate">{a.qtr?.Quarter_No} · {a.emp?.Department} · {a.Allotment_Date}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.qtr?.Type}</span>
                  </div>
                )
              })}
              {filteredActive.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No active allotments</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── OCCUPANCY ───────────────────────────────── */

function OccupancySection({ quarters, allotments, employees, stats }) {
  const typeStats = useMemo(() => {
    const map = {}
    quarters.forEach(q => { map[q.Type] = map[q.Type] || { total:0, occ:0, vac:0, repair:0 }; map[q.Type].total++ })
    quarters.forEach(q => {
      if (q.Status === 'Occupied') map[q.Type].occ++
      else if (q.Status === 'Vacant') map[q.Type].vac++
      else if (q.Status === 'Under Repair') map[q.Type].repair++
    })
    return sortedTypes(map).map(t => ({ type: t, ...map[t], pct: map[t].total ? Math.round(map[t].occ / map[t].total * 100) : 0 }))
  }, [quarters])

  const deptStats = useMemo(() => {
    const map = {}
    allotments.filter(a => a.Status === 'Active').forEach(a => {
      const dept = employees.find(e => e.Emp_ID === a.Emp_ID)?.Department || 'Other'
      map[dept] = (map[dept] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [allotments, employees])

  const locStats = useMemo(() => {
    const map = {}
    quarters.forEach(q => { map[q.Location] = map[q.Location] || { total:0, occ:0 }; map[q.Location].total++ })
    quarters.filter(q => q.Status === 'Occupied').forEach(q => { if (map[q.Location]) map[q.Location].occ++ })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [quarters])

  const occupancyPct = stats.total ? Math.round(stats.occupied / stats.total * 100) : 0

  function printReport() {
    const html = generateOccupancyHTML(typeStats, deptStats, locStats, stats)
    printContent(html, 'Occupancy Report — NJHPS')
  }

  return (
    <div className="space-y-3">
      <button onClick={printReport} className="btn-primary w-full flex items-center justify-center gap-2">
        <Printer className="w-4 h-4" /> Print Occupancy Report
      </button>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total"    value={stats.total}    color="text-slate-800" />
        <MiniStat label="Occupied" value={stats.occupied} color="text-emerald-600" />
        <MiniStat label="Vacant"   value={stats.vacant}   color="text-rose-600" />
      </div>

      {/* Occupancy bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-brand-600" /><span className="text-sm font-semibold text-slate-800">Overall</span></div>
          <span className="text-xl font-extrabold text-brand-700">{occupancyPct}%</span>
        </div>
        <div className="w-full bg-rose-100 rounded-full h-2.5">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${occupancyPct}%` }} />
        </div>
      </div>

      {/* Type-wise */}
      <ReportTable title="By Quarter Type" cols={['Type','Total','Occ','Vac','%']}>
        {typeStats.map((t, i) => (
          <tr key={t.type} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{t.type}</td>
            <td className="px-3 py-2 text-slate-600 text-center">{t.total}</td>
            <td className="px-3 py-2 text-center"><span className="text-emerald-600 font-semibold">{t.occ}</span></td>
            <td className="px-3 py-2 text-center"><span className="text-rose-600 font-semibold">{t.vac}</span></td>
            <td className="px-3 py-2 text-center">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-rose-100 rounded-full h-1.5">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width:`${t.pct}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 w-7 text-right">{t.pct}%</span>
              </div>
            </td>
          </tr>
        ))}
      </ReportTable>

      {/* Dept-wise */}
      <ReportTable title="By Department" cols={['Department','Occupied Quarters','Share %']}>
        {deptStats.map(([dept, count], i) => (
          <tr key={dept} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{dept}</td>
            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{count}</td>
            <td className="px-3 py-2 text-center text-slate-500">{stats.occupied ? Math.round(count/stats.occupied*100) : 0}%</td>
          </tr>
        ))}
      </ReportTable>

      {/* Location-wise */}
      <ReportTable title="By Location" cols={['Location','Total','Occupied','%']}>
        {locStats.map(([loc, s], i) => (
          <tr key={loc} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{loc || 'Unknown'}</td>
            <td className="px-3 py-2 text-center text-slate-600">{s.total}</td>
            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{s.occ}</td>
            <td className="px-3 py-2 text-center text-slate-500">{s.total ? Math.round(s.occ/s.total*100) : 0}%</td>
          </tr>
        ))}
      </ReportTable>
    </div>
  )
}

/* ──────────────── RENT ────────────────────────────────────── */

function RentSection({ rent, employees, quarters }) {
  const [filterMonth, setFilterMonth] = useState('')

  const enriched = useMemo(() => rent.map(r => ({
    ...r,
    emp: employees.find(e => e.Emp_ID === r.Emp_ID),
    qtr: quarters.find(q => q.Quarter_ID === r.Quarter_ID),
    recovery: parseFloat(r.Actual_Recovery) || 0,
    standard: parseFloat(r.Standard_Rent) || 0,
    diff: parseFloat(r.Difference) || 0,
  })), [rent, employees, quarters])

  const filtered = useMemo(() => {
    if (!filterMonth) return enriched
    return enriched.filter(r => r.Month?.startsWith(filterMonth))
  }, [enriched, filterMonth])

  // Group by month for summary
  const monthSummary = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      if (!map[r.Month]) map[r.Month] = { month: r.Month, count:0, standard:0, recovered:0, shortfall:0 }
      map[r.Month].count++
      map[r.Month].standard  += r.standard
      map[r.Month].recovered += r.recovery
      map[r.Month].shortfall += r.diff > 0 ? r.diff : 0
    })
    return Object.values(map).sort((a, b) => b.month?.localeCompare(a.month))
  }, [filtered])

  const totals = useMemo(() => ({
    standard:  filtered.reduce((s,r) => s+r.standard,0),
    recovered: filtered.reduce((s,r) => s+r.recovery,0),
    shortfall: filtered.filter(r => r.diff>0).reduce((s,r) => s+r.diff,0),
  }), [filtered])

  const months = useMemo(() => {
    const s = new Set(rent.map(r => r.Month?.slice(0,7)).filter(Boolean))
    return [...s].sort((a,b) => b.localeCompare(a))
  }, [rent])

  function printRentReport() {
    const html = generateRentHTML(monthSummary, filtered, filterMonth)
    printContent(html, `Rent Recovery Report${filterMonth ? ' — '+filterMonth : ''}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">Filter by Month</label>
          <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={printRentReport} className="btn-primary flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Standard (₹)" value={`₹${fmtAmt(totals.standard)}`}  color="text-blue-600" />
        <MiniStat label="Recovered (₹)" value={`₹${fmtAmt(totals.recovered)}`} color="text-emerald-600" />
        <MiniStat label="Shortfall (₹)" value={`₹${fmtAmt(totals.shortfall)}`} color="text-red-600" />
      </div>

      {totals.shortfall > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-800 font-semibold">Shortfall of ₹{fmtAmt(totals.shortfall)} — {filtered.filter(r=>r.diff>0).length} entries under-recovered</p>
        </div>
      )}

      {/* Monthly summary */}
      <ReportTable title="Monthly Summary" cols={['Month','Entries','Standard (₹)','Recovered (₹)','Shortfall (₹)']}>
        {monthSummary.map((m, i) => (
          <tr key={m.month} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{m.month}</td>
            <td className="px-3 py-2 text-center text-slate-600">{m.count}</td>
            <td className="px-3 py-2 text-right text-blue-600">{fmtAmt(m.standard)}</td>
            <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{fmtAmt(m.recovered)}</td>
            <td className="px-3 py-2 text-right">
              {m.shortfall > 0 ? <span className="text-red-500 font-semibold">{fmtAmt(m.shortfall)}</span> : <span className="text-slate-300">—</span>}
            </td>
          </tr>
        ))}
        {monthSummary.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No rent data found</td></tr>
        )}
      </ReportTable>

      {/* Detailed table */}
      {filterMonth && (
        <ReportTable title={`Detail — ${filterMonth}`} cols={['Quarter','Employee','Dept','Standard','Recovered','Diff']}>
          {filtered.map((r, i) => (
            <tr key={r.Rent_ID} className={`${i%2===1?'bg-slate-50':''} ${r.diff>0?'bg-red-50/40':''}`}>
              <td className="px-3 py-2 font-semibold text-slate-800">{r.qtr?.Quarter_No || r.Quarter_ID}</td>
              <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{r.emp?.Name || r.Emp_ID}</td>
              <td className="px-3 py-2 text-slate-500">{r.emp?.Department || '—'}</td>
              <td className="px-3 py-2 text-right text-blue-600">{fmtAmt(r.standard)}</td>
              <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{fmtAmt(r.recovery)}</td>
              <td className="px-3 py-2 text-right text-xs">
                {r.diff > 0 && <span className="text-red-500 font-semibold">-{fmtAmt(r.diff)}</span>}
                {r.diff < 0 && <span className="text-blue-500">+{fmtAmt(Math.abs(r.diff))}</span>}
                {r.diff === 0 && <span className="text-slate-300">—</span>}
              </td>
            </tr>
          ))}
        </ReportTable>
      )}
    </div>
  )
}

/* ──────────────── KEYS ────────────────────────────────────── */

function KeysSection({ keys, quarters }) {
  const issued = useMemo(() => keys
    .filter(k => k.Status === 'Issued')
    .map(k => ({
      ...k,
      qtr: quarters.find(q => q.Quarter_ID === k.Quarter_ID),
      days: k.Issued_Date ? daysSince(k.Issued_Date) : 0,
    }))
    .sort((a, b) => b.days - a.days), [keys, quarters])

  const overdue   = issued.filter(k => k.days > 30)
  const onTime    = issued.filter(k => k.days <= 30)
  const returned  = keys.filter(k => k.Status === 'Returned').length

  function printKeysReport() {
    const html = generateKeysHTML(issued)
    printContent(html, 'Outstanding Keys Report — NJHPS')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Issued"   value={issued.length}   color="text-blue-600" />
        <MiniStat label="Overdue"  value={overdue.length}  color="text-amber-600" />
        <MiniStat label="Returned" value={returned}        color="text-emerald-600" />
      </div>

      {overdue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-semibold">{overdue.length} key{overdue.length!==1?'s':''} held for more than 30 days</p>
        </div>
      )}

      <button onClick={printKeysReport} className="btn-primary w-full flex items-center justify-center gap-2">
        <Printer className="w-4 h-4" /> Print Keys Status Report
      </button>

      <ReportTable title="Outstanding Keys" cols={['Quarter','Held By','Issued','Days','Status']}>
        {issued.map((k, i) => {
          const od = k.days > 30
          return (
            <tr key={k.Key_ID} className={`${i%2===1?'bg-slate-50':''} ${od?'bg-amber-50/60':''}`}>
              <td className="px-3 py-2 font-semibold text-slate-800">{k.qtr?.Quarter_No || k.Quarter_ID}</td>
              <td className="px-3 py-2 text-slate-600">{k.Held_By}</td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{k.Issued_Date}</td>
              <td className="px-3 py-2">
                <span className={`text-xs font-semibold ${od ? 'text-amber-600' : 'text-slate-500'}`}>{k.days}d</span>
              </td>
              <td className="px-3 py-2">
                {od
                  ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">Overdue</span>
                  : <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">Issued</span>
                }
              </td>
            </tr>
          )
        })}
        {issued.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No outstanding keys</td></tr>
        )}
      </ReportTable>
    </div>
  )
}

/* ──────────────── SHARED UI SUB-COMPONENTS ────────────────── */

function ModeBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
      {label}
    </button>
  )
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-700 font-semibold text-right">{value || '—'}</span>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2.5">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

function ReportTable({ title, cols, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2">
        <p className="text-[10px] font-bold text-white uppercase tracking-wider">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {cols.map(c => <th key={c} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

/* ──────────────── PRINT HELPERS ───────────────────────────── */

function printContent(bodyHTML, title = 'NJHPS Report') {
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow pop-ups to print reports.'); return }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',Times,serif;color:#000;background:#fff}
.page{padding:2cm;max-width:21cm;margin:0 auto;min-height:27cm}
table{width:100%;border-collapse:collapse}
th,td{padding:5px 8px;border:1px solid #ccc;font-size:11px}
th{background:#eee;font-weight:bold;text-align:left}
.hd{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
.hd h1{font-size:14px;letter-spacing:.5px}
.hd h2{font-size:12px;font-weight:normal;margin-top:3px}
.hd p{font-size:10px;margin-top:2px}
.meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:11px}
.title-line{text-align:center;font-size:14px;font-weight:bold;text-decoration:underline;margin-bottom:16px}
.section-hd{background:#ddd;font-weight:bold;font-size:12px;padding:4px 8px;border:1px solid #aaa}
.sig{display:flex;justify-content:space-between;margin-top:48px;font-size:11px}
.sig-block{text-align:center;min-width:140px}
.sig-block .line{border-top:1px solid #000;padding-top:4px;margin-top:36px}
ol{padding-left:18px;font-size:11px;line-height:1.9}
@media print{@page{size:A4;margin:1.5cm}.page{padding:0;min-height:auto}}
</style>
</head>
<body onload="setTimeout(function(){window.print();},400)">
${bodyHTML}
</body>
</html>`)
  win.document.close()
}

function generateOrderPage(allotment, orderNo, date) {
  const emp = allotment.emp || {}
  const qtr = allotment.qtr || {}
  const yr  = new Date().getFullYear()
  const fy  = `${yr}-${String(yr+1).slice(2)}`
  return `<div class="page">
  <div class="hd">
    <h1>HIMACHAL PRADESH STATE ELECTRICITY BOARD LTD.</h1>
    <h2>NATIONAL JALVIDYUT POWER STATION (NJHPS), JHAKRI</h2>
    <p>District Rampur Bushahr, Himachal Pradesh — 172 201</p>
  </div>
  <div class="meta">
    <div><b>No:</b> NJHPS/QTR/ALLOT/${fy}/${orderNo || '___'}</div>
    <div><b>Date:</b> ${fmtDate(date)}</div>
  </div>
  <div class="title-line">ALLOTMENT ORDER</div>
  <p style="margin-bottom:14px;line-height:1.8;font-size:11px;text-align:justify">
    Subject to the terms and conditions of H.P.S.E.B. Ltd. Quarters Allotment Rules, the residential
    accommodation detailed below is allotted to the employee mentioned hereunder:
  </p>
  <table style="margin-bottom:16px">
    <tr><td class="section-hd" colspan="2">QUARTER DETAILS</td></tr>
    <tr><td style="width:35%">Quarter No.</td><td>${qtr.Quarter_No || allotment.Quarter_ID || '—'}</td></tr>
    <tr><td>Type</td><td>${qtr.Type || '—'}</td></tr>
    <tr><td>Location / Block</td><td>${qtr.Location || '—'}${qtr.Block ? ' / Block '+qtr.Block : ''}</td></tr>
    <tr><td class="section-hd" colspan="2">ALLOTTEE DETAILS</td></tr>
    <tr><td>Name</td><td><b>${emp.Name || allotment.Emp_ID || '—'}</b></td></tr>
    <tr><td>Designation</td><td>${emp.Designation || '—'}</td></tr>
    <tr><td>Department / Unit</td><td>${emp.Department || '—'}</td></tr>
    <tr><td>Category</td><td>${emp.Category || '—'}</td></tr>
    <tr><td class="section-hd" colspan="2">ALLOTMENT DETAILS</td></tr>
    <tr><td>Allotment Date</td><td>${fmtDate(allotment.Allotment_Date)}</td></tr>
    <tr><td>Allotment Type</td><td>${allotment.Allotment_Type || 'Allotment'}</td></tr>
    <tr><td>Monthly Rent</td><td>₹ ${allotment.Rent || 'As per prevailing rules'}</td></tr>
  </table>
  <p style="font-weight:bold;margin-bottom:6px;font-size:11px">TERMS AND CONDITIONS:</p>
  <ol>
    <li>This allotment is purely temporary and is liable to be cancelled without prior notice.</li>
    <li>The allottee shall vacate the quarter immediately upon transfer, retirement, resignation or dismissal from service.</li>
    <li>Monthly house rent as prescribed by HPSEB Ltd. shall be recovered from the salary of the allottee.</li>
    <li>The allottee shall maintain the quarter in good condition and shall not carry out structural alterations without prior written permission.</li>
    <li>Sub-letting, sharing or parting with possession of the quarter to any other person is strictly prohibited.</li>
    <li>Damage to fixtures/fittings shall be charged to the allottee.</li>
    <li>The allottee shall abide by all Rules and Regulations of HPSEB Ltd. governing allotment of residential quarters as amended from time to time.</li>
  </ol>
  <div class="sig">
    <div class="sig-block"><div class="line">Allottee's Signature &amp; Date</div></div>
    <div class="sig-block"><div class="line"><b>Housing Officer / AO (Admin)</b><br/>NJHPS, Jhakri</div></div>
  </div>
</div>`
}

function generateOccupancyHTML(typeStats, deptStats, locStats, stats) {
  const pct = stats.total ? Math.round(stats.occupied/stats.total*100) : 0
  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  return `<div class="page">
  <div class="hd">
    <h1>NATIONAL JALVIDYUT POWER STATION (NJHPS), JHAKRI</h1>
    <h2>Quarters Occupancy Status Report</h2>
    <p>As on ${today}</p>
  </div>
  <table style="margin-bottom:8px">
    <tr><th>Total Quarters</th><th>Occupied</th><th>Vacant</th><th>Under Repair</th><th>Occupancy %</th></tr>
    <tr><td>${stats.total}</td><td>${stats.occupied}</td><td>${stats.vacant}</td><td>${stats.repair||0}</td><td>${pct}%</td></tr>
  </table>
  <br/>
  <p style="font-weight:bold;margin-bottom:4px;font-size:12px">TYPE-WISE STATUS</p>
  <table style="margin-bottom:8px">
    <tr><th>Type</th><th>Total</th><th>Occupied</th><th>Vacant</th><th>Repair</th><th>%</th></tr>
    ${typeStats.map(t => `<tr><td>${t.type}</td><td>${t.total}</td><td>${t.occ}</td><td>${t.vac}</td><td>${t.repair}</td><td>${t.pct}%</td></tr>`).join('')}
  </table>
  <br/>
  <p style="font-weight:bold;margin-bottom:4px;font-size:12px">DEPARTMENT-WISE OCCUPIED QUARTERS</p>
  <table style="margin-bottom:8px">
    <tr><th>Department</th><th>Occupied Quarters</th><th>% of Occupied</th></tr>
    ${deptStats.map(([d,c]) => `<tr><td>${d}</td><td>${c}</td><td>${stats.occupied?Math.round(c/stats.occupied*100):0}%</td></tr>`).join('')}
  </table>
  <br/>
  <p style="font-weight:bold;margin-bottom:4px;font-size:12px">LOCATION-WISE STATUS</p>
  <table>
    <tr><th>Location</th><th>Total</th><th>Occupied</th><th>%</th></tr>
    ${locStats.map(([l,s]) => `<tr><td>${l||'Unknown'}</td><td>${s.total}</td><td>${s.occ}</td><td>${s.total?Math.round(s.occ/s.total*100):0}%</td></tr>`).join('')}
  </table>
  <div class="sig">
    <div class="sig-block"><div class="line">Prepared By</div></div>
    <div class="sig-block"><div class="line"><b>Housing Officer / AO (Admin)</b><br/>NJHPS, Jhakri</div></div>
  </div>
</div>`
}

function generateRentHTML(monthSummary, detail, filterMonth) {
  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  const totStd = detail.reduce((s,r) => s+(parseFloat(r.Standard_Rent)||0),0)
  const totRec = detail.reduce((s,r) => s+(parseFloat(r.Actual_Recovery)||0),0)
  const totDif = detail.filter(r=>parseFloat(r.Difference)>0).reduce((s,r)=>s+(parseFloat(r.Difference)||0),0)
  return `<div class="page">
  <div class="hd">
    <h1>NATIONAL JALVIDYUT POWER STATION (NJHPS), JHAKRI</h1>
    <h2>Rent Recovery Report${filterMonth?' — '+filterMonth:''}</h2>
    <p>As on ${today}</p>
  </div>
  <table style="margin-bottom:8px">
    <tr><th>Standard Rent (₹)</th><th>Recovered (₹)</th><th>Shortfall (₹)</th><th>Entries</th></tr>
    <tr><td>${fmtAmt(totStd)}</td><td>${fmtAmt(totRec)}</td><td style="color:red">${fmtAmt(totDif)}</td><td>${detail.length}</td></tr>
  </table>
  <br/>
  <p style="font-weight:bold;margin-bottom:4px;font-size:12px">MONTHLY SUMMARY</p>
  <table style="margin-bottom:8px">
    <tr><th>Month</th><th>Entries</th><th>Standard (₹)</th><th>Recovered (₹)</th><th>Shortfall (₹)</th></tr>
    ${monthSummary.map(m=>`<tr><td>${m.month}</td><td>${m.count}</td><td>${fmtAmt(m.standard)}</td><td>${fmtAmt(m.recovered)}</td><td${m.shortfall>0?' style="color:red"':''}>${m.shortfall>0?fmtAmt(m.shortfall):'—'}</td></tr>`).join('')}
  </table>
  ${filterMonth ? `<br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">DETAIL — ${filterMonth}</p>
  <table>
    <tr><th>Quarter</th><th>Employee</th><th>Dept</th><th>Standard (₹)</th><th>Recovered (₹)</th><th>Diff (₹)</th></tr>
    ${detail.map(r=>`<tr><td>${r.qtr?.Quarter_No||r.Quarter_ID}</td><td>${r.emp?.Name||r.Emp_ID}</td><td>${r.emp?.Department||'—'}</td><td>${fmtAmt(parseFloat(r.Standard_Rent)||0)}</td><td>${fmtAmt(parseFloat(r.Actual_Recovery)||0)}</td><td${parseFloat(r.Difference)>0?' style="color:red"':''}>${parseFloat(r.Difference)>0?'-'+fmtAmt(parseFloat(r.Difference)):(parseFloat(r.Difference)<0?'+'+fmtAmt(Math.abs(parseFloat(r.Difference))):'—')}</td></tr>`).join('')}
  </table>` : ''}
  <div class="sig">
    <div class="sig-block"><div class="line">Prepared By</div></div>
    <div class="sig-block"><div class="line"><b>AO (Finance) / Housing Officer</b><br/>NJHPS, Jhakri</div></div>
  </div>
</div>`
}

function generateKeysHTML(issued) {
  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  return `<div class="page">
  <div class="hd">
    <h1>NATIONAL JALVIDYUT POWER STATION (NJHPS), JHAKRI</h1>
    <h2>Outstanding Key Register — Status Report</h2>
    <p>As on ${today} &nbsp;|&nbsp; Total Issued: ${issued.length}</p>
  </div>
  <table>
    <tr><th>#</th><th>Quarter No.</th><th>Held By</th><th>Issued Date</th><th>Days Held</th><th>Status</th></tr>
    ${issued.map((k,i)=>`<tr${k.days>30?' style="background:#fff3cd"':''}><td>${i+1}</td><td>${k.qtr?.Quarter_No||k.Quarter_ID}</td><td>${k.Held_By}</td><td>${fmtDate(k.Issued_Date)}</td><td${k.days>30?' style="color:red;font-weight:bold"':''}>${k.days}d</td><td>${k.days>30?'OVERDUE':'Issued'}</td></tr>`).join('')}
    ${issued.length===0?'<tr><td colspan="6" style="text-align:center;padding:20px;color:#666">No outstanding keys</td></tr>':''}
  </table>
  <div class="sig">
    <div class="sig-block"><div class="line">Prepared By</div></div>
    <div class="sig-block"><div class="line"><b>Housing Officer / AO (Admin)</b><br/>NJHPS, Jhakri</div></div>
  </div>
</div>`
}

/* ──────────────── UTILITY ─────────────────────────────────── */

function todayStr() { return new Date().toISOString().split('T')[0] }
function daysSince(d) { try { return Math.floor((Date.now()-new Date(d))/86400000) } catch { return 0 } }
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  try { const [y,m,d] = dateStr.split('-'); return `${d}/${m}/${y}` } catch { return dateStr }
}
function fmtAmt(n) { return Number(n||0).toLocaleString('en-IN') }
