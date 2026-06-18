import React, { useState, useMemo, useEffect } from 'react'
import { IndianRupee, Plus, Search, AlertCircle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { addRentEntry } from '../lib/googleSheets'
import Modal from '../components/Modal'

export default function RentPage() {
  const { rent, allotments, quarters, employees, refreshRent, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const emptyForm = { allotment_id:'', quarter_id:'', emp_id:'', month: currentMonth(), standard_rent:'', actual_recovery:'', remarks:'' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const activeAllotments = allotments.filter(a => a.Status === 'Active')

  const displayList = useMemo(() => {
    return rent.filter(r =>
      !search ||
      r.Quarter_ID?.toLowerCase().includes(search.toLowerCase()) ||
      r.Emp_ID?.toLowerCase().includes(search.toLowerCase()) ||
      r.Month?.toLowerCase().includes(search.toLowerCase())
    ).sort((a,b) => b.Month?.localeCompare(a.Month))
  }, [rent, search])

  const discrepancies = rent.filter(r => parseFloat(r.Difference) > 0)
  const totalRecovery = rent.reduce((s, r) => s + (parseFloat(r.Actual_Recovery) || 0), 0)

  function handleAllotmentSelect(e) {
    const alt = activeAllotments.find(a => a.Allotment_ID === e.target.value)
    if (alt) {
      setForm(p => ({ ...p, allotment_id: alt.Allotment_ID, quarter_id: alt.Quarter_ID, emp_id: alt.Emp_ID, standard_rent: alt.Rent || '' }))
    }
  }

  async function handleSave() {
    if (!form.allotment_id || !form.month || !form.actual_recovery) return
    setSaving(true)
    try {
      await addRentEntry(form, auditUser)
      await refreshRent()
      setShowNew(false); setForm(emptyForm)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-4 space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-slate-400">Total Entries</p>
          <p className="text-2xl font-bold text-slate-800">{rent.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Total Recovered</p>
          <p className="text-xl font-bold text-emerald-600">₹{totalRecovery.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Discrepancy alert */}
      {discrepancies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{discrepancies.length} recovery shortfall(s)</p>
            <p className="text-xs text-red-600 mt-0.5">Standard rent vs actual recovery mismatch</p>
          </div>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search rent entries..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayList.map(r => {
          const emp = employees.find(e => e.Emp_ID === r.Emp_ID)
          const qtr = quarters.find(q => q.Quarter_ID === r.Quarter_ID)
          const diff = parseFloat(r.Difference) || 0
          return (
            <div key={r.Rent_ID} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{emp?.Name || r.Emp_ID}</p>
                  <p className="text-xs text-slate-500">{qtr?.Quarter_No || r.Quarter_ID} · {r.Month}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">₹{parseFloat(r.Actual_Recovery||0).toLocaleString('en-IN')}</p>
                  {diff > 0 && <p className="text-xs text-red-500">Short ₹{diff.toLocaleString('en-IN')}</p>}
                  {diff < 0 && <p className="text-xs text-blue-500">Excess ₹{Math.abs(diff).toLocaleString('en-IN')}</p>}
                </div>
              </div>
              {r.Remarks && <p className="text-xs text-slate-400 mt-1">{r.Remarks}</p>}
            </div>
          )
        })}
        {displayList.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No rent entries found</p>
          </div>
        )}
      </div>

      {/* Add Rent Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setForm(emptyForm) }} title="Add Rent Entry">
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
          {form.standard_rent && form.actual_recovery && (
            <div className={`rounded-xl px-3 py-2 text-sm ${parseFloat(form.standard_rent) > parseFloat(form.actual_recovery) ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              Difference: ₹{(parseFloat(form.standard_rent||0) - parseFloat(form.actual_recovery||0)).toLocaleString('en-IN')}
            </div>
          )}
          <div>
            <label className="label">Remarks</label>
            <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowNew(false); setForm(emptyForm) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
        </div>
      </Modal>
    </div>
  )
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
