import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, Building2, Pencil, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { addQuarter, updateQuarter } from '../lib/googleSheets'
import { QUARTER_TYPES, LOCATIONS, STATUSES } from '../lib/constants'
import Modal from '../components/Modal'

export default function QuartersPage() {
  const { quarters, allotments, employees, refreshQuarters } = useData()
  const { auditUser } = useAuth()
  const [searchParams] = useSearchParams()

  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterLoc,    setFilterLoc]    = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [showFilter,   setShowFilter]   = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [sortKey,      setSortKey]      = useState('Quarter_No')
  const [sortDir,      setSortDir]      = useState('asc')

  const emptyForm = { quarter_no:'', type:'', block:'', location:'', status:'Vacant', remarks:'' }
  const [form, setForm] = useState(emptyForm)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => quarters.filter(q => {
    const s = search.toLowerCase()
    return (!search || q.Quarter_No?.toLowerCase().includes(s) || q.Quarter_ID?.toLowerCase().includes(s))
      && (!filterType   || q.Type === filterType)
      && (!filterLoc    || q.Location === filterLoc)
      && (!filterStatus || q.Status === filterStatus)
  }), [quarters, search, filterType, filterLoc, filterStatus])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = a[sortKey] || '', vb = b[sortKey] || ''
    const cmp = va.localeCompare(vb, undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortKey, sortDir])

  async function handleSaveNew() {
    if (!form.quarter_no || !form.type || !form.location) return
    setSaving(true)
    try { await addQuarter(form, auditUser); await refreshQuarters(); setShowAdd(false); setForm(emptyForm) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!selected) return
    setSaving(true)
    try { await updateQuarter(selected._rowIndex, { ...selected, ...form }, selected, auditUser); await refreshQuarters(); setSelected(null) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  function openEdit(q) {
    setSelected(q)
    setForm({ quarter_no: q.Quarter_No, type: q.Type, block: q.Block, location: q.Location, status: q.Status, remarks: q.Remarks })
  }

  const activeFilters = [filterType, filterLoc, filterStatus].filter(Boolean).length

  return (
    <div className="p-4 space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search quarters…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-xl border ${activeFilters ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
        >
          <Filter className={`w-4 h-4 ${activeFilters ? 'text-brand-600' : 'text-slate-500'}`} />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilters}</span>
          )}
        </button>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Quarter
        </button>
      </div>

      <p className="text-xs text-slate-400 font-medium">{sorted.length} of {quarters.length} quarters</p>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide w-10">#</th>
                <SortTh label="Quarter No" field="Quarter_No" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Type"       field="Type"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Location"   field="Location"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Block</th>
                <SortTh label="Status"     field="Status"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Occupant</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((q, i) => {
                const active = allotments.find(a => a.Quarter_ID === q.Quarter_ID && a.Status === 'Active')
                const emp    = active ? employees.find(e => e.Emp_ID === active.Emp_ID) : null
                return (
                  <tr key={q.Quarter_ID} className={`hover:bg-brand-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{q.Quarter_No}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{q.Type}</td>
                    <td className="px-3 py-2.5 text-slate-600">{q.Location}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-center">{q.Block || '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={q.Status} /></td>
                    <td className="px-3 py-2.5 max-w-[150px]">
                      {emp ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 truncate">{emp.Name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{emp.Designation}</p>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center">
                        <ActionBtn icon={Pencil} color="blue" title="Edit Quarter" onClick={() => openEdit(q)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No quarters found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Filter Modal ── */}
      <Modal open={showFilter} onClose={() => setShowFilter(false)} title="Filter Quarters">
        <div className="space-y-4">
          <div>
            <label className="label">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {['', ...STATUSES].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`py-2 px-3 rounded-xl text-sm border transition-colors ${filterStatus === s ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {QUARTER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="">All Locations</option>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setFilterType(''); setFilterLoc(''); setFilterStatus(''); setShowFilter(false) }}>Clear All</button>
            <button className="btn-primary flex-1" onClick={() => setShowFilter(false)}>Apply</button>
          </div>
        </div>
      </Modal>

      {/* ── Add Quarter Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }} title="Add New Quarter">
        <QuarterForm form={form} setForm={setForm} />
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSaveNew} disabled={saving}>{saving ? 'Saving…' : 'Add Quarter'}</button>
        </div>
      </Modal>

      {/* ── Edit Quarter Modal ── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit Quarter">
        {selected && <>
          <p className="text-[11px] text-slate-400 mb-3 font-mono">ID: {selected.Quarter_ID}</p>
          <QuarterForm form={form} setForm={setForm} />
          <div className="flex gap-2 mt-4">
            <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Update Quarter'}</button>
          </div>
        </>}
      </Modal>
    </div>
  )
}

/* ── Sub-components ── */

function QuarterForm({ form, setForm }) {
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Quarter Number *</label>
        <input className="input" placeholder="e.g. D-7/A" value={form.quarter_no} onChange={f('quarter_no')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={f('type')}>
            <option value="">Select type</option>
            {QUARTER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Block</label>
          <input className="input" placeholder="e.g. A, 19" value={form.block} onChange={f('block')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Location *</label>
          <select className="input" value={form.location} onChange={f('location')}>
            <option value="">Select</option>
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Remarks</label>
        <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
      </div>
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
        {label}
        <Icon className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-30'}`} />
      </span>
    </th>
  )
}

function StatusBadge({ status }) {
  const map = {
    'Occupied':     'bg-emerald-100 text-emerald-700',
    'Vacant':       'bg-rose-100 text-rose-700',
    'Under Repair': 'bg-amber-100 text-amber-700',
    'Reserved':     'bg-blue-100 text-blue-700',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

function ActionBtn({ icon: Icon, color, title, onClick }) {
  const colors = { blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100', red: 'bg-red-50 text-red-600 hover:bg-red-100', green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
