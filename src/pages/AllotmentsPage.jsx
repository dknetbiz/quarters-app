import React, { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Filter, ClipboardList, UserCheck, UserX, UserMinus, Eye, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { createAllotment, vacateAllotment, addEmployee } from '../lib/googleSheets'
import { ALLOTMENT_TYPES, CATEGORIES, DEPARTMENTS, QUARTER_TYPES } from '../lib/constants'
import Modal, { ModalSection, FieldRow } from '../components/Modal'
import { Building2, User, ClipboardCheck, Calendar } from 'lucide-react'

export default function AllotmentsPage() {
  const { allotments, quarters, employees, refreshAllotments, refreshQuarters, refreshEmployees, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()

  const [search,       setSearch]       = useState('')
  const [tab,          setTab]          = useState('active')
  const [showNew,      setShowNew]      = useState(false)
  const [showAddEmp,   setShowAddEmp]   = useState(false)
  const [showFilter,   setShowFilter]   = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [vacateDate,   setVacateDate]   = useState(today())
  const [sortKey,      setSortKey]      = useState(null)
  const [sortDir,      setSortDir]      = useState('asc')
  const [filterDept,   setFilterDept]   = useState('')
  const [filterQType,  setFilterQType]  = useState('')
  const [filterAltType,setFilterAltType]= useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  const emptyForm = { quarter_id:'', emp_id:'', allotment_date: today(), allotment_type:'Allotment', rent:'', remarks:'' }
  const [form, setForm] = useState(emptyForm)
  const empForm0 = { name:'', designation:'', department:'NJHPS', category:'General' }
  const [empForm, setEmpForm] = useState(empForm0)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const baseList = useMemo(() => {
    const list = tab === 'active'
      ? allotments.filter(a => a.Status === 'Active')
      : allotments.filter(a => a.Status === 'Vacated')
    return list.map(a => ({
      ...a,
      emp: employees.find(e => e.Emp_ID === a.Emp_ID),
      qtr: quarters.find(q => q.Quarter_ID === a.Quarter_ID),
    }))
  }, [allotments, employees, quarters, tab])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return baseList.filter(a => {
      if (s && !(
        a.Quarter_ID?.toLowerCase().includes(s) ||
        a.Emp_ID?.toLowerCase().includes(s) ||
        a.emp?.Name?.toLowerCase().includes(s) ||
        a.qtr?.Quarter_No?.toLowerCase().includes(s) ||
        a.emp?.Department?.toLowerCase().includes(s)
      )) return false
      if (filterDept    && a.emp?.Department !== filterDept) return false
      if (filterQType   && a.qtr?.Type !== filterQType) return false
      if (filterAltType && a.Allotment_Type !== filterAltType) return false
      if (filterFrom    && a.Allotment_Date && a.Allotment_Date < filterFrom) return false
      if (filterTo      && a.Allotment_Date && a.Allotment_Date > filterTo) return false
      return true
    })
  }, [baseList, search, filterDept, filterQType, filterAltType, filterFrom, filterTo])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const va = (sortKey === 'emp_name' ? a.emp?.Name : sortKey === 'qtr_no' ? a.qtr?.Quarter_No : a[sortKey]) || ''
      const vb = (sortKey === 'emp_name' ? b.emp?.Name : sortKey === 'qtr_no' ? b.qtr?.Quarter_No : b[sortKey]) || ''
      const cmp = va.localeCompare(vb, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const vacantQuarters = quarters.filter(q => q.Status === 'Vacant')
  const activeEmp      = employees.filter(e => e.Active === 'TRUE')

  async function handleCreate() {
    if (!form.quarter_id || !form.emp_id || !form.allotment_date) return
    setSaving(true)
    try { await createAllotment(form, auditUser); await Promise.all([refreshAllotments(), refreshQuarters()]); setShowNew(false); setForm(emptyForm) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleVacate() {
    if (!selected || !vacateDate) return
    setSaving(true)
    try { await vacateAllotment(selected, vacateDate, auditUser); await Promise.all([refreshAllotments(), refreshQuarters()]); setSelected(null) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleAddEmployee() {
    if (!empForm.name || !empForm.designation) return
    setSaving(true)
    try { await addEmployee(empForm, auditUser); await refreshEmployees(); setShowAddEmp(false); setEmpForm(empForm0) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const ef = k => e => setEmpForm(p => ({ ...p, [k]: e.target.value }))

  const activeFilterCount = [filterDept, filterQType, filterAltType, filterFrom, filterTo].filter(Boolean).length
  const activeCount  = allotments.filter(a => a.Status === 'Active').length
  const vacatedCount = allotments.filter(a => a.Status === 'Vacated').length

  return (
    <div className="p-4 space-y-3">

      {/* ── Tabs ── */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <TabBtn active={tab === 'active'}  onClick={() => setTab('active')}  label={`Active (${activeCount})`} />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} label={`History (${vacatedCount})`} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, quarter, dept…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className={`relative w-10 h-10 flex items-center justify-center rounded-xl border ${activeFilterCount ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
        >
          <Filter className={`w-4 h-4 ${activeFilterCount ? 'text-brand-600' : 'text-slate-500'}`} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Allotment
        </button>
      </div>

      <p className="text-xs text-slate-400 font-medium">{sorted.length} record{sorted.length !== 1 ? 's' : ''}</p>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide w-10">#</th>
                <SortTh label="Quarter"    field="qtr_no"         sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Employee"   field="emp_name"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Department" field="Department"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Category</th>
                <SortTh label="Date"       field="Allotment_Date"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Type</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide">Rent</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((a, i) => (
                <tr key={a.Allotment_ID} className={`hover:bg-brand-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{a.qtr?.Quarter_No || a.Quarter_ID}</td>
                  <td className="px-3 py-2.5 max-w-[160px]">
                    <p className="text-xs font-semibold text-slate-700 truncate">{a.emp?.Name || a.Emp_ID}</p>
                    <p className="text-[11px] text-slate-400 truncate">{a.emp?.Designation || ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{a.emp?.Department || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{a.emp?.Category || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{a.Allotment_Date}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{a.Allotment_Type}</td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium text-right whitespace-nowrap">
                    {a.Rent ? `₹${a.Rent}` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <AllotStatusBadge status={a.Status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <ActionBtn
                        icon={Eye}
                        color={a.Status === 'Active' ? 'blue' : 'slate'}
                        title="View / Vacate"
                        onClick={() => { setSelected(a); setVacateDate(today()) }}
                      />
                      {a.Status === 'Active' && (
                        <ActionBtn icon={UserMinus} color="red" title="Vacate" onClick={() => { setSelected(a); setVacateDate(today()) }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-14 text-center text-slate-400">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No allotments found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New Allotment Modal ── */}
      <Modal
        open={showNew} onClose={() => { setShowNew(false); setForm(emptyForm) }}
        title="New Allotment" icon={ClipboardCheck} variant="success" size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setShowNew(false); setForm(emptyForm) }}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create Allotment'}</button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Quarter (Vacant) *</label>
            <select className="input" value={form.quarter_id} onChange={f('quarter_id')}>
              <option value="">Select vacant quarter</option>
              {vacantQuarters.map(q => <option key={q.Quarter_ID} value={q.Quarter_ID}>{q.Quarter_No} · {q.Type} · {q.Location}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Employee *</label>
              <button onClick={() => setShowAddEmp(true)} className="text-xs text-brand-600 font-semibold">+ New Employee</button>
            </div>
            <select className="input" value={form.emp_id} onChange={f('emp_id')}>
              <option value="">Select employee</option>
              {activeEmp.map(e => <option key={e.Emp_ID} value={e.Emp_ID}>{e.Name} · {e.Designation} · {e.Department}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Allotment Date *</label>
              <input className="input" type="date" value={form.allotment_date} onChange={f('allotment_date')} />
            </div>
            <div>
              <label className="label">Rent (₹)</label>
              <input className="input" type="number" placeholder="0" value={form.rent} onChange={f('rent')} />
            </div>
          </div>
          <div>
            <label className="label">Allotment Type</label>
            <select className="input" value={form.allotment_type} onChange={f('allotment_type')}>
              {ALLOTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
          </div>
        </div>
      </Modal>

      {/* ── Detail / Vacate Modal ── */}
      {selected && (
        <Modal
          open={!!selected} onClose={() => setSelected(null)}
          title={selected.qtr?.Quarter_No || selected.Quarter_ID}
          icon={Building2}
          subtitle={`${selected.qtr?.Type || ''} · ${selected.qtr?.Location || ''}`}
          badge={selected.Status === 'Active'
            ? { label: 'Active',  cls: 'bg-emerald-400/30 text-emerald-100' }
            : { label: 'Vacated', cls: 'bg-slate-300/30 text-slate-100' }}
          variant={selected.Status === 'Active' ? 'default' : 'default'}
          size="md"
          footer={selected.Status === 'Active' ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="label">Vacate Date</label>
                  <input className="input" type="date" value={vacateDate} onChange={e => setVacateDate(e.target.value)} />
                </div>
              </div>
              <button className="btn-danger w-full flex items-center justify-center gap-2" onClick={handleVacate} disabled={saving}>
                {saving ? 'Processing…' : 'Mark as Vacated'}
              </button>
            </div>
          ) : null}
        >
          <div className="space-y-1">
            <ModalSection title="Quarter">
              <FieldRow label="Quarter No." value={selected.qtr?.Quarter_No || selected.Quarter_ID} />
              <FieldRow label="Type"        value={selected.qtr?.Type} />
              <FieldRow label="Location"    value={selected.qtr?.Location} />
              <FieldRow label="Block"       value={selected.qtr?.Block} last />
            </ModalSection>
            <ModalSection title="Allottee">
              <FieldRow label="Name"        value={selected.emp?.Name || selected.Emp_ID} />
              <FieldRow label="Designation" value={selected.emp?.Designation} />
              <FieldRow label="Department"  value={selected.emp?.Department} />
              <FieldRow label="Category"    value={selected.emp?.Category} last />
            </ModalSection>
            <ModalSection title="Allotment Details">
              <FieldRow label="Date"        value={selected.Allotment_Date} />
              <FieldRow label="Type"        value={selected.Allotment_Type} />
              <FieldRow label="Rent"        value={selected.Rent ? `₹${Number(selected.Rent).toLocaleString('en-IN')}` : '—'} valueClass="text-emerald-700" />
              <FieldRow label="Status"      value={selected.Status} valueClass={selected.Status==='Active'?'text-emerald-700':'text-slate-500'} />
              {selected.Vacated_Date && <FieldRow label="Vacated On" value={selected.Vacated_Date} />}
              {selected.Remarks && <FieldRow label="Remarks" value={selected.Remarks} last />}
            </ModalSection>
          </div>
        </Modal>
      )}

      {/* ── Filter Modal ── */}
      <Modal open={showFilter} onClose={() => setShowFilter(false)} title="Filter Allotments" icon={Filter} variant="info" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Department</label>
            <div className="grid grid-cols-2 gap-2">
              {['', ...DEPARTMENTS].map(d => (
                <button key={d} onClick={() => setFilterDept(d)}
                  className={`py-2 px-3 rounded-xl text-sm border transition-colors ${filterDept === d ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {d || 'All Depts'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Quarter Type</label>
            <select className="input" value={filterQType} onChange={e => setFilterQType(e.target.value)}>
              <option value="">All Types</option>
              {QUARTER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Allotment Type</label>
            <select className="input" value={filterAltType} onChange={e => setFilterAltType(e.target.value)}>
              <option value="">All</option>
              {ALLOTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date From</label>
              <input className="input" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Date To</label>
              <input className="input" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setFilterDept(''); setFilterQType(''); setFilterAltType(''); setFilterFrom(''); setFilterTo(''); setShowFilter(false) }}>Clear All</button>
            <button className="btn-primary flex-1" onClick={() => setShowFilter(false)}>Apply</button>
          </div>
        </div>
      </Modal>

      {/* ── Add Employee Modal ── */}
      <Modal open={showAddEmp} onClose={() => { setShowAddEmp(false); setEmpForm(empForm0) }} title="Add Employee" icon={User} variant="info" size="sm">
        <div className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={empForm.name} onChange={ef('name')} /></div>
          <div><label className="label">Designation *</label><input className="input" value={empForm.designation} onChange={ef('designation')} /></div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={empForm.department} onChange={ef('department')}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={empForm.category} onChange={ef('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowAddEmp(false); setEmpForm(empForm0) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleAddEmployee} disabled={saving}>{saving ? 'Saving…' : 'Add Employee'}</button>
        </div>
      </Modal>

    </div>
  )
}

/* ── Sub-components ── */

function TabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
      {label}
    </button>
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

function AllotStatusBadge({ status }) {
  const map = { 'Active': 'bg-emerald-100 text-emerald-700', 'Vacated': 'bg-slate-100 text-slate-500' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

function ActionBtn({ icon: Icon, color, title, onClick }) {
  const colors = { blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100', red: 'bg-red-50 text-red-600 hover:bg-red-100', slate: 'bg-slate-100 text-slate-500 hover:bg-slate-200' }
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${colors[color] || colors.slate}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}


function today() { return new Date().toISOString().split('T')[0] }
