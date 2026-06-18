import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, X, Building2, ChevronRight } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { addQuarter, updateQuarter } from '../lib/googleSheets'
import { QUARTER_TYPES, LOCATIONS, STATUSES, CATEGORIES } from '../lib/constants'
import Modal from '../components/Modal'

export default function QuartersPage() {
  const { quarters, allotments, employees, refreshQuarters, loadingData } = useData()
  const { auditUser } = useAuth()
  const [searchParams] = useSearchParams()

  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLoc,  setFilterLoc]  = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [showFilter, setShowFilter] = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [saving,     setSaving]     = useState(false)

  // Form state
  const emptyForm = { quarter_no:'', type:'', block:'', location:'', status:'Vacant', remarks:'' }
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    return quarters.filter(q => {
      const matchSearch = !search ||
        q.Quarter_No?.toLowerCase().includes(search.toLowerCase()) ||
        q.Quarter_ID?.toLowerCase().includes(search.toLowerCase())
      const matchType   = !filterType   || q.Type === filterType
      const matchLoc    = !filterLoc    || q.Location === filterLoc
      const matchStatus = !filterStatus || q.Status === filterStatus
      return matchSearch && matchType && matchLoc && matchStatus
    })
  }, [quarters, search, filterType, filterLoc, filterStatus])

  async function handleSaveNew() {
    if (!form.quarter_no || !form.type || !form.location) return
    setSaving(true)
    try {
      await addQuarter(form, auditUser)
      await refreshQuarters()
      setShowAdd(false)
      setForm(emptyForm)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!selected) return
    setSaving(true)
    try {
      await updateQuarter(selected._rowIndex, { ...selected, ...form }, selected, auditUser)
      await refreshQuarters()
      setSelected(null)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  function openEdit(q) {
    setSelected(q)
    setForm({ quarter_no: q.Quarter_No, type: q.Type, block: q.Block, location: q.Location, status: q.Status, remarks: q.Remarks })
  }

  const activeFilters = [filterType, filterLoc, filterStatus].filter(Boolean).length

  return (
    <div className="p-4 space-y-3">

      {/* Search + Filter bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search quarters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-xl border ${activeFilters ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
        >
          <Filter className={`w-4 h-4 ${activeFilters ? 'text-brand-600' : 'text-slate-500'}`} />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters}</span>
          )}
        </button>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400">{filtered.length} of {quarters.length} quarters</p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(q => {
          const active = allotments.find(a => a.Quarter_ID === q.Quarter_ID && a.Status === 'Active')
          const emp    = active ? employees.find(e => e.Emp_ID === active.Emp_ID) : null
          return (
            <button
              key={q.Quarter_ID}
              onClick={() => openEdit(q)}
              className="w-full card flex items-center gap-3 text-left active:scale-98 transition-transform"
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{q.Quarter_No}</p>
                  <span className={
                    q.Status === 'Occupied'     ? 'badge-occupied' :
                    q.Status === 'Under Repair' ? 'badge-repair'   : 'badge-vacant'
                  }>{q.Status}</span>
                </div>
                <p className="text-xs text-slate-500">{q.Type} · {q.Location}{q.Block ? ` · Block ${q.Block}` : ''}</p>
                {emp && <p className="text-xs text-brand-600 truncate">{emp.Name} · {emp.Designation}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No quarters found</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
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

      {/* Add Quarter Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }} title="Add Quarter">
        <QuarterForm form={form} setForm={setForm} />
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSaveNew} disabled={saving}>
            {saving ? 'Saving...' : 'Add Quarter'}
          </button>
        </div>
      </Modal>

      {/* Edit Quarter Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit Quarter">
        {selected && (
          <>
            <p className="text-xs text-slate-400 mb-3">ID: {selected.Quarter_ID}</p>
            <QuarterForm form={form} setForm={setForm} />
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </>
        )}
      </Modal>

    </div>
  )
}

function QuarterForm({ form, setForm }) {
  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Quarter Number *</label>
        <input className="input" placeholder="e.g. Type-D-7" value={form.quarter_no} onChange={f('quarter_no')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={f('type')}>
            <option value="">Select</option>
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
