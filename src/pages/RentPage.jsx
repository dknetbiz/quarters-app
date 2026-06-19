import React, { useState, useMemo, useEffect } from 'react'
import { IndianRupee, Plus, Search, AlertCircle, Eye, ChevronsUpDown, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { addRentEntry } from '../lib/googleSheets'
import Modal, { ModalSection, FieldRow } from '../components/Modal'
import { DEPARTMENTS, QUARTER_TYPES } from '../lib/constants'

export default function RentPage() {
  const { rent, allotments, quarters, employees, refreshRent, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()

  const [search,        setSearch]        = useState('')
  const [showNew,       setShowNew]       = useState(false)
  const [showFilter,    setShowFilter]    = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [sortKey,       setSortKey]       = useState('Month')
  const [sortDir,       setSortDir]       = useState('desc')
  const [filterMonth,   setFilterMonth]   = useState('')
  const [filterDept,    setFilterDept]    = useState('')
  const [filterQType,   setFilterQType]   = useState('')
  const [filterShortfall, setFilterShortfall] = useState(false)

  const emptyForm = { allotment_id:'', quarter_id:'', emp_id:'', month: currentMonth(), standard_rent:'', actual_recovery:'', remarks:'' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const activeAllotments = allotments.filter(a => a.Status === 'Active')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const baseList = useMemo(() => rent.map(r => ({
    ...r,
    emp: employees.find(e => e.Emp_ID === r.Emp_ID),
    qtr: quarters.find(q => q.Quarter_ID === r.Quarter_ID),
    diff: parseFloat(r.Difference) || 0,
    recovery: parseFloat(r.Actual_Recovery) || 0,
    standard: parseFloat(r.Standard_Rent) || 0,
  })), [rent, employees, quarters])

  const months = useMemo(() => [...new Set(baseList.map(r => r.Month?.slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a)), [baseList])
  const activeFilterCount = [filterMonth, filterDept, filterQType, filterShortfall ? 'y' : ''].filter(Boolean).length

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return baseList.filter(r => {
      if (s && !(r.emp?.Name?.toLowerCase().includes(s) || r.qtr?.Quarter_No?.toLowerCase().includes(s) || r.Month?.toLowerCase().includes(s) || r.Emp_ID?.toLowerCase().includes(s))) return false
      if (filterMonth  && !r.Month?.startsWith(filterMonth)) return false
      if (filterDept   && r.emp?.Department !== filterDept)   return false
      if (filterQType  && r.qtr?.Type       !== filterQType)  return false
      if (filterShortfall && r.diff <= 0) return false
      return true
    })
  }, [baseList, search, filterMonth, filterDept, filterQType, filterShortfall])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = sortKey === 'emp_name' ? (a.emp?.Name || '') : sortKey === 'qtr_no' ? (a.qtr?.Quarter_No || '') : (a[sortKey] || '')
    const vb = sortKey === 'emp_name' ? (b.emp?.Name || '') : sortKey === 'qtr_no' ? (b.qtr?.Quarter_No || '') : (b[sortKey] || '')
    const cmp = va.localeCompare(vb, undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortKey, sortDir])

  function handleAllotmentSelect(e) {
    const alt = activeAllotments.find(a => a.Allotment_ID === e.target.value)
    if (alt) setForm(p => ({ ...p, allotment_id: alt.Allotment_ID, quarter_id: alt.Quarter_ID, emp_id: alt.Emp_ID, standard_rent: alt.Rent || '' }))
  }

  async function handleSave() {
    if (!form.allotment_id || !form.month || !form.actual_recovery) return
    setSaving(true)
    try { await addRentEntry(form, auditUser); await refreshRent(); setShowNew(false); setForm(emptyForm) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const totalRecovery  = baseList.reduce((s, r) => s + r.recovery, 0)
  const totalStandard  = baseList.reduce((s, r) => s + r.standard, 0)
  const shortfallCount = baseList.filter(r => r.diff > 0).length
  const shortfallTotal = baseList.filter(r => r.diff > 0).reduce((s, r) => s + r.diff, 0)

  return (
    <div className="p-4 space-y-3">

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard label="Entries" value={rent.length} color="slate" />
        <SummaryCard label="Recovered" value={`₹${fmtAmt(totalRecovery)}`} color="emerald" />
        <SummaryCard label="Standard" value={`₹${fmtAmt(totalStandard)}`} color="blue" />
      </div>

      {/* ── Shortfall alert ── */}
      {shortfallCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-800 font-semibold">
            {shortfallCount} shortfall{shortfallCount > 1 ? 's' : ''} — total ₹{fmtAmt(shortfallTotal)} under-recovered
          </p>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by employee, quarter or month…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilter(true)} className={`relative w-10 h-10 flex items-center justify-center rounded-xl border ${activeFilterCount ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}>
          <Filter className={`w-4 h-4 ${activeFilterCount ? 'text-brand-600' : 'text-slate-500'}`} />
          {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      <p className="text-xs text-slate-400 font-medium">{sorted.length} record{sorted.length !== 1 ? 's' : ''}</p>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide w-10">#</th>
                <SortTh label="Month"    field="Month"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Quarter"  field="qtr_no"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Employee" field="emp_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide">Standard (₹)</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide">Recovered (₹)</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide">Diff (₹)</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r, i) => {
                const shortfall = r.diff > 0
                const excess    = r.diff < 0
                return (
                  <tr key={r.Rent_ID} className={`hover:bg-brand-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/60' : ''} ${shortfall ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">{r.Month}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{r.qtr?.Quarter_No || r.Quarter_ID}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-slate-700 truncate max-w-[130px]">{r.emp?.Name || r.Emp_ID}</p>
                      {r.emp?.Department && <p className="text-[11px] text-slate-400">{r.emp.Department}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{r.standard > 0 ? fmtAmt(r.standard) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{fmtAmt(r.recovery)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {shortfall && <span className="text-xs font-semibold text-red-500">-{fmtAmt(r.diff)}</span>}
                      {excess    && <span className="text-xs font-semibold text-blue-500">+{fmtAmt(Math.abs(r.diff))}</span>}
                      {!shortfall && !excess && <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center">
                        <ActionBtn icon={Eye} color="blue" title="View Details" onClick={() => setSelected(r)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                  <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No rent entries found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Filter Modal ── */}
      <Modal open={showFilter} onClose={() => setShowFilter(false)} title="Filter Rent Records" icon={Filter} variant="info" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Month</label>
            <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quarter Type</label>
            <select className="input" value={filterQType} onChange={e => setFilterQType(e.target.value)}>
              <option value="">All Types</option>
              {QUARTER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => setFilterShortfall(v => !v)}
            className={`w-full py-2.5 rounded-xl border text-sm font-semibold transition-colors ${filterShortfall ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {filterShortfall ? '✓ Shortfall Records Only' : 'Shortfall Records Only'}
          </button>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => { setFilterMonth(''); setFilterDept(''); setFilterQType(''); setFilterShortfall(false); setShowFilter(false) }}>Clear All</button>
            <button className="btn-primary flex-1" onClick={() => setShowFilter(false)}>Apply</button>
          </div>
        </div>
      </Modal>

      {/* ── Add Rent Modal ── */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setForm(emptyForm) }} title="Add Rent Entry" icon={IndianRupee} variant="success" size="md"
        footer={<div className="flex gap-2"><button className="btn-secondary flex-1" onClick={() => { setShowNew(false); setForm(emptyForm) }}>Cancel</button><button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button></div>}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Active Allotment *</label>
            <select className="input" value={form.allotment_id} onChange={handleAllotmentSelect}>
              <option value="">Select allotment</option>
              {activeAllotments.map(a => {
                const emp = employees.find(e => e.Emp_ID === a.Emp_ID)
                const qtr = quarters.find(q => q.Quarter_ID === a.Quarter_ID)
                return <option key={a.Allotment_ID} value={a.Allotment_ID}>{emp?.Name || a.Emp_ID} · {qtr?.Quarter_No || a.Quarter_ID}</option>
              })}
            </select>
          </div>
          <div>
            <label className="label">Month *</label>
            <input className="input" type="month" value={form.month} onChange={f('month')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Standard Rent (₹)</label>
              <input className="input" type="number" placeholder="0" value={form.standard_rent} onChange={f('standard_rent')} />
            </div>
            <div>
              <label className="label">Actual Recovery (₹) *</label>
              <input className="input" type="number" placeholder="0" value={form.actual_recovery} onChange={f('actual_recovery')} />
            </div>
          </div>
          {form.standard_rent && form.actual_recovery && (() => {
            const diff = parseFloat(form.standard_rent || 0) - parseFloat(form.actual_recovery || 0)
            return (
              <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${diff > 0 ? 'bg-red-50 text-red-700' : diff < 0 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {diff > 0 ? `Shortfall: ₹${fmtAmt(diff)}` : diff < 0 ? `Excess: ₹${fmtAmt(Math.abs(diff))}` : 'Exact match'}
              </div>
            )
          })()}
          <div>
            <label className="label">Remarks</label>
            <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
          </div>
        </div>
      </Modal>

      {/* ── Detail Modal ── */}
      {selected && (
        <Modal
          open={!!selected} onClose={() => setSelected(null)}
          title={`Rent — ${selected.Month}`}
          icon={IndianRupee}
          subtitle={`${selected.qtr?.Quarter_No || selected.Quarter_ID} · ${selected.emp?.Name || selected.Emp_ID}`}
          badge={selected.diff > 0
            ? { label: 'Shortfall', cls: 'bg-rose-300/30 text-rose-100' }
            : selected.diff < 0
              ? { label: 'Excess', cls: 'bg-blue-300/30 text-blue-100' }
              : { label: 'Exact', cls: 'bg-emerald-300/30 text-emerald-100' }}
          variant={selected.diff > 0 ? 'danger' : 'default'}
          size="sm"
        >
          <ModalSection title="Quarter &amp; Allottee">
            <FieldRow label="Quarter"     value={selected.qtr?.Quarter_No || selected.Quarter_ID} />
            <FieldRow label="Type"        value={selected.qtr?.Type} />
            <FieldRow label="Employee"    value={selected.emp?.Name || selected.Emp_ID} />
            <FieldRow label="Department"  value={selected.emp?.Department} last />
          </ModalSection>
          <ModalSection title="Rent Details">
            <FieldRow label="Month"       value={selected.Month} />
            <FieldRow label="Standard"    value={selected.standard > 0 ? `₹${fmtAmt(selected.standard)}` : '—'} valueClass="text-blue-700" />
            <FieldRow label="Recovered"   value={`₹${fmtAmt(selected.recovery)}`} valueClass="text-emerald-700 font-bold" />
            <FieldRow label="Difference"
              value={selected.diff > 0 ? `-₹${fmtAmt(selected.diff)} (shortfall)` : selected.diff < 0 ? `+₹${fmtAmt(Math.abs(selected.diff))} (excess)` : 'Exact match'}
              valueClass={selected.diff > 0 ? 'text-rose-600 font-bold' : selected.diff < 0 ? 'text-blue-600' : 'text-emerald-600'}
              last
            />
          </ModalSection>
          {selected.Remarks && (
            <ModalSection title="Remarks">
              <FieldRow label="Note" value={selected.Remarks} last />
            </ModalSection>
          )}
        </Modal>
      )}

    </div>
  )
}

/* ── Sub-components ── */

function SummaryCard({ label, value, color }) {
  const colors = { slate: 'text-slate-800', emerald: 'text-emerald-600', blue: 'text-blue-600' }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2.5">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${colors[color]}`}>{value}</p>
    </div>
  )
}

function SortTh({ label, field, sortKey, sortDir, onSort }) {
  const active = sortKey === field
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th onClick={() => onSort(field)}
      className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap">
      <span className="flex items-center gap-1">
        {label}<Icon className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-30'}`} />
      </span>
    </th>
  )
}

function ActionBtn({ icon: Icon, color, title, onClick }) {
  const colors = { blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100' }
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function fmtAmt(n) { return Number(n).toLocaleString('en-IN') }
