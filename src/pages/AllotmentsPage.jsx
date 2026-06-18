import React, { useState, useMemo, useEffect } from 'react'
import { Plus, Search, ClipboardList, ChevronRight, UserCheck, UserX } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { createAllotment, vacateAllotment, addEmployee } from '../lib/googleSheets'
import { ALLOTMENT_TYPES, CATEGORIES, DEPARTMENTS } from '../lib/constants'
import Modal from '../components/Modal'

export default function AllotmentsPage() {
  const { allotments, quarters, employees, refreshAllotments, refreshQuarters, refreshEmployees, loadingData, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()

  const [search,    setSearch]    = useState('')
  const [tab,       setTab]       = useState('active') // active | history
  const [showNew,   setShowNew]   = useState(false)
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [vacateDate, setVacateDate] = useState(today())

  const emptyForm = { quarter_id:'', emp_id:'', allotment_date: today(), allotment_type:'Allotment', rent:'', remarks:'' }
  const [form, setForm] = useState(emptyForm)
  const empForm0 = { name:'', designation:'', department:'NJHPS', category:'General' }
  const [empForm, setEmpForm] = useState(empForm0)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const displayList = useMemo(() => {
    const list = tab === 'active'
      ? allotments.filter(a => a.Status === 'Active')
      : allotments.filter(a => a.Status === 'Vacated')
    return list.filter(a => {
      const emp = employees.find(e => e.Emp_ID === a.Emp_ID)
      const qtr = quarters.find(q => q.Quarter_ID === a.Quarter_ID)
      return !search ||
        a.Quarter_ID?.toLowerCase().includes(search.toLowerCase()) ||
        a.Emp_ID?.toLowerCase().includes(search.toLowerCase()) ||
        emp?.Name?.toLowerCase().includes(search.toLowerCase()) ||
        qtr?.Quarter_No?.toLowerCase().includes(search.toLowerCase())
    })
  }, [allotments, employees, quarters, tab, search])

  const vacantQuarters = quarters.filter(q => q.Status === 'Vacant')
  const activeEmp      = employees.filter(e => e.Active === 'TRUE')

  async function handleCreate() {
    if (!form.quarter_id || !form.emp_id || !form.allotment_date) return
    setSaving(true)
    try {
      await createAllotment(form, auditUser)
      await Promise.all([refreshAllotments(), refreshQuarters()])
      setShowNew(false); setForm(emptyForm)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleVacate() {
    if (!selected || !vacateDate) return
    setSaving(true)
    try {
      await vacateAllotment(selected, vacateDate, auditUser)
      await Promise.all([refreshAllotments(), refreshQuarters()])
      setSelected(null)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleAddEmployee() {
    if (!empForm.name || !empForm.designation) return
    setSaving(true)
    try {
      await addEmployee(empForm, auditUser)
      await refreshEmployees()
      setShowAddEmp(false); setEmpForm(empForm0)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const ef = k => e => setEmpForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-4 space-y-3">
      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('active')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab==='active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
          Active ({allotments.filter(a=>a.Status==='Active').length})
        </button>
        <button onClick={() => setTab('history')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab==='history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
          History ({allotments.filter(a=>a.Status==='Vacated').length})
        </button>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, quarter..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayList.map(a => {
          const emp = employees.find(e => e.Emp_ID === a.Emp_ID)
          const qtr = quarters.find(q => q.Quarter_ID === a.Quarter_ID)
          return (
            <button key={a.Allotment_ID} onClick={() => { setSelected(a); setVacateDate(today()) }}
              className="w-full card flex items-center gap-3 text-left active:scale-98 transition-transform">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.Status==='Active' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                {a.Status === 'Active'
                  ? <UserCheck className="w-5 h-5 text-emerald-600" />
                  : <UserX className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{emp?.Name || a.Emp_ID}</p>
                <p className="text-xs text-slate-500">{qtr?.Quarter_No || a.Quarter_ID} · {emp?.Designation || ''}</p>
                <p className="text-xs text-slate-400">{a.Allotment_Date} {a.Vacated_Date ? `→ ${a.Vacated_Date}` : ''} · {a.Allotment_Type}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={a.Status==='Active' ? 'badge-occupied' : 'badge-vacant'}>{a.Status}</span>
                {emp?.Category && <span className="text-xs text-slate-400">{emp.Category}</span>}
              </div>
            </button>
          )
        })}
        {displayList.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No allotments found</p>
          </div>
        )}
      </div>

      {/* New Allotment Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setForm(emptyForm) }} title="New Allotment">
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
              <button onClick={() => setShowAddEmp(true)} className="text-xs text-brand-600 font-medium">+ New Employee</button>
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
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowNew(false); setForm(emptyForm) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Create Allotment'}</button>
        </div>
      </Modal>

      {/* Detail / Vacate Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Allotment Details">
        {selected && (() => {
          const emp = employees.find(e => e.Emp_ID === selected.Emp_ID)
          const qtr = quarters.find(q => q.Quarter_ID === selected.Quarter_ID)
          return (
            <div className="space-y-3">
              <DetailRow label="Quarter"    value={qtr?.Quarter_No || selected.Quarter_ID} />
              <DetailRow label="Employee"   value={emp?.Name || selected.Emp_ID} />
              <DetailRow label="Designation" value={emp?.Designation || '—'} />
              <DetailRow label="Department" value={emp?.Department || '—'} />
              <DetailRow label="Category"   value={emp?.Category || '—'} />
              <DetailRow label="Allotted On" value={selected.Allotment_Date} />
              <DetailRow label="Type"       value={selected.Allotment_Type} />
              <DetailRow label="Rent"       value={selected.Rent ? `₹${selected.Rent}` : '—'} />
              <DetailRow label="Status"     value={selected.Status} />
              {selected.Vacated_Date && <DetailRow label="Vacated On" value={selected.Vacated_Date} />}
              {selected.Remarks && <DetailRow label="Remarks" value={selected.Remarks} />}

              {selected.Status === 'Active' && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="label">Vacate Date</label>
                  <input className="input" type="date" value={vacateDate} onChange={e => setVacateDate(e.target.value)} />
                  <button className="btn-danger w-full mt-3" onClick={handleVacate} disabled={saving}>
                    {saving ? 'Processing...' : 'Mark as Vacated'}
                  </button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Add Employee Modal */}
      <Modal open={showAddEmp} onClose={() => { setShowAddEmp(false); setEmpForm(empForm0) }} title="Add Employee">
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
          <button className="btn-primary flex-1" onClick={handleAddEmployee} disabled={saving}>{saving ? 'Saving...' : 'Add Employee'}</button>
        </div>
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-700 text-right">{value || '—'}</span>
    </div>
  )
}

function today() {
  return new Date().toISOString().split('T')[0]
}
