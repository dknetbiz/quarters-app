import React, { useState, useEffect, useMemo } from 'react'
import { Key, Plus, Search, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { issueKey, returnKey } from '../lib/googleSheets'
import Modal from '../components/Modal'

export default function KeysPage() {
  const { keys, quarters, refreshKeys, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('issued')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [returnDate, setReturnDate] = useState(today())

  const emptyForm = { quarter_id:'', held_by:'', issued_date: today(), remarks:'' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const vacantQuarters = quarters.filter(q => q.Status === 'Vacant' || q.Status === 'Under Repair')

  const displayList = useMemo(() => {
    const list = tab === 'issued'
      ? keys.filter(k => k.Status === 'Issued')
      : keys.filter(k => k.Status === 'Returned')
    return list.filter(k =>
      !search ||
      k.Quarter_ID?.toLowerCase().includes(search.toLowerCase()) ||
      k.Held_By?.toLowerCase().includes(search.toLowerCase())
    )
  }, [keys, tab, search])

  async function handleIssue() {
    if (!form.quarter_id || !form.held_by) return
    setSaving(true)
    try {
      await issueKey(form, auditUser)
      await refreshKeys()
      setShowNew(false); setForm(emptyForm)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleReturn() {
    if (!selected) return
    setSaving(true)
    try {
      await returnKey(selected, returnDate, auditUser)
      await refreshKeys()
      setSelected(null)
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-4 space-y-3">
      <div className="flex bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab('issued')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab==='issued' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
          Issued ({keys.filter(k=>k.Status==='Issued').length})
        </button>
        <button onClick={() => setTab('returned')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab==='returned' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
          Returned ({keys.filter(k=>k.Status==='Returned').length})
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search keys..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> Issue
        </button>
      </div>

      <div className="space-y-2">
        {displayList.map(k => {
          const qtr = quarters.find(q => q.Quarter_ID === k.Quarter_ID)
          const days = k.Issued_Date ? daysSince(k.Issued_Date) : 0
          const overdue = k.Status === 'Issued' && days > 30
          return (
            <button key={k.Key_ID} onClick={() => { setSelected(k); setReturnDate(today()) }}
              className="w-full card flex items-center gap-3 text-left active:scale-98 transition-transform">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue ? 'bg-amber-50' : k.Status==='Issued' ? 'bg-brand-50' : 'bg-slate-100'}`}>
                <Key className={`w-5 h-5 ${overdue ? 'text-amber-600' : k.Status==='Issued' ? 'text-brand-600' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{qtr?.Quarter_No || k.Quarter_ID}</p>
                  {overdue && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <p className="text-xs text-slate-500">Held by: {k.Held_By}</p>
                <p className="text-xs text-slate-400">Issued: {k.Issued_Date}{k.Returned_Date ? ` · Returned: ${k.Returned_Date}` : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={k.Status==='Issued' ? (overdue ? 'badge-repair' : 'badge-occupied') : 'badge-vacant'}>{k.Status}</span>
                {k.Status === 'Issued' && <p className="text-xs text-slate-400 mt-0.5">{days}d</p>}
              </div>
            </button>
          )
        })}
        {displayList.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No key records found</p>
          </div>
        )}
      </div>

      {/* Issue Key Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setForm(emptyForm) }} title="Issue Key">
        <div className="space-y-3">
          <div>
            <label className="label">Quarter *</label>
            <select className="input" value={form.quarter_id} onChange={f('quarter_id')}>
              <option value="">Select quarter</option>
              {vacantQuarters.map(q => <option key={q.Quarter_ID} value={q.Quarter_ID}>{q.Quarter_No} · {q.Status}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Held By (Name / Section) *</label>
            <input className="input" placeholder="e.g. Store Keeper / Sh. Ramesh" value={form.held_by} onChange={f('held_by')} />
          </div>
          <div>
            <label className="label">Issue Date</label>
            <input className="input" type="date" value={form.issued_date} onChange={f('issued_date')} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setShowNew(false); setForm(emptyForm) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleIssue} disabled={saving}>{saving ? 'Saving...' : 'Issue Key'}</button>
        </div>
      </Modal>

      {/* Detail / Return Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Key Details">
        {selected && (() => {
          const qtr = quarters.find(q => q.Quarter_ID === selected.Quarter_ID)
          return (
            <div className="space-y-3">
              <DetailRow label="Quarter"   value={qtr?.Quarter_No || selected.Quarter_ID} />
              <DetailRow label="Held By"   value={selected.Held_By} />
              <DetailRow label="Issued"    value={selected.Issued_Date} />
              <DetailRow label="Returned"  value={selected.Returned_Date || '—'} />
              <DetailRow label="Status"    value={selected.Status} />
              {selected.Remarks && <DetailRow label="Remarks" value={selected.Remarks} />}
              {selected.Status === 'Issued' && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="label">Return Date</label>
                  <input className="input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                  <button className="btn-primary w-full mt-3" onClick={handleReturn} disabled={saving}>
                    {saving ? 'Processing...' : 'Mark as Returned'}
                  </button>
                </div>
              )}
            </div>
          )
        })()}
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

function today() { return new Date().toISOString().split('T')[0] }
function daysSince(dateStr) {
  try { return Math.floor((Date.now() - new Date(dateStr)) / 86400000) } catch { return 0 }
}
