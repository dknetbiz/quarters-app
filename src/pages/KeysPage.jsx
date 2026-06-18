import React, { useState, useMemo, useEffect } from 'react'
import { Key, Plus, Search, AlertTriangle, RotateCcw, Eye, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { issueKey, returnKey } from '../lib/googleSheets'
import Modal from '../components/Modal'

export default function KeysPage() {
  const { keys, quarters, refreshKeys, fetchAll, lastFetched } = useData()
  const { auditUser } = useAuth()

  const [search,      setSearch]      = useState('')
  const [tab,         setTab]         = useState('issued')
  const [showNew,     setShowNew]     = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [returnDate,  setReturnDate]  = useState(today())
  const [sortKey,     setSortKey]     = useState(null)
  const [sortDir,     setSortDir]     = useState('asc')

  const emptyForm = { quarter_id:'', held_by:'', issued_date: today(), remarks:'' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const vacantQuarters = quarters.filter(q => q.Status === 'Vacant' || q.Status === 'Under Repair')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const baseList = useMemo(() => {
    const list = tab === 'issued'
      ? keys.filter(k => k.Status === 'Issued')
      : keys.filter(k => k.Status === 'Returned')
    return list.map(k => ({
      ...k,
      qtr: quarters.find(q => q.Quarter_ID === k.Quarter_ID),
      days: k.Issued_Date ? daysSince(k.Issued_Date) : 0,
    }))
  }, [keys, quarters, tab])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    if (!s) return baseList
    return baseList.filter(k =>
      k.Quarter_ID?.toLowerCase().includes(s) ||
      k.Held_By?.toLowerCase().includes(s) ||
      k.qtr?.Quarter_No?.toLowerCase().includes(s)
    )
  }, [baseList, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const va = sortKey === 'qtr_no' ? (a.qtr?.Quarter_No || '') : (a[sortKey] || '')
      const vb = sortKey === 'qtr_no' ? (b.qtr?.Quarter_No || '') : (b[sortKey] || '')
      const cmp = va.localeCompare(vb, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  async function handleIssue() {
    if (!form.quarter_id || !form.held_by) return
    setSaving(true)
    try { await issueKey(form, auditUser); await refreshKeys(); setShowNew(false); setForm(emptyForm) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleReturn() {
    if (!selected) return
    setSaving(true)
    try { await returnKey(selected, returnDate, auditUser); await refreshKeys(); setSelected(null) }
    catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const issuedCount   = keys.filter(k => k.Status === 'Issued').length
  const returnedCount = keys.filter(k => k.Status === 'Returned').length
  const overdueCount  = keys.filter(k => k.Status === 'Issued' && k.Issued_Date && daysSince(k.Issued_Date) > 30).length

  return (
    <div className="p-4 space-y-3">

      {/* ── Overdue alert strip ── */}
      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-semibold">{overdueCount} key{overdueCount > 1 ? 's' : ''} overdue (held &gt; 30 days)</p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <TabBtn active={tab === 'issued'}   onClick={() => setTab('issued')}   label={`Issued (${issuedCount})`} />
        <TabBtn active={tab === 'returned'} onClick={() => setTab('returned')} label={`Returned (${returnedCount})`} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by quarter or holder…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Issue Key
        </button>
      </div>

      <p className="text-xs text-slate-400 font-medium">{sorted.length} record{sorted.length !== 1 ? 's' : ''}</p>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide w-10">#</th>
                <SortTh label="Quarter"    field="qtr_no"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Held By"    field="Held_By"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Issued"     field="Issued_Date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Days</th>
                {tab === 'returned' && <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Returned</th>}
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((k, i) => {
                const overdue = k.Status === 'Issued' && k.days > 30
                return (
                  <tr key={k.Key_ID} className={`hover:bg-brand-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/60' : ''} ${overdue ? 'bg-amber-50/60' : ''}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {k.qtr?.Quarter_No || k.Quarter_ID}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{k.Held_By}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{k.Issued_Date}</td>
                    <td className="px-3 py-2.5">
                      {k.days > 0 && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${overdue ? 'text-amber-600' : 'text-slate-500'}`}>
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          {k.days}d
                        </span>
                      )}
                    </td>
                    {tab === 'returned' && <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{k.Returned_Date || '—'}</td>}
                    <td className="px-3 py-2.5">
                      <KeyStatusBadge status={k.Status} overdue={overdue} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionBtn icon={Eye} color="blue" title="View Details" onClick={() => { setSelected(k); setReturnDate(today()) }} />
                        {k.Status === 'Issued' && (
                          <ActionBtn icon={RotateCcw} color="green" title="Return Key" onClick={() => { setSelected(k); setReturnDate(today()) }} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={tab === 'returned' ? 8 : 7} className="px-4 py-14 text-center text-slate-400">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No key records found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Issue Key Modal ── */}
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
          <button className="btn-primary flex-1" onClick={handleIssue} disabled={saving}>{saving ? 'Saving…' : 'Issue Key'}</button>
        </div>
      </Modal>

      {/* ── Detail / Return Modal ── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Key Details">
        {selected && (() => {
          const qtr = selected.qtr
          return (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                {[
                  ['Quarter',  qtr?.Quarter_No || selected.Quarter_ID],
                  ['Type',     qtr?.Type || '—'],
                  ['Held By',  selected.Held_By],
                  ['Issued',   selected.Issued_Date],
                  ['Days',     selected.days > 0 ? `${selected.days} days` : '—'],
                  ['Returned', selected.Returned_Date || '—'],
                  ['Status',   selected.Status],
                  selected.Remarks && ['Remarks', selected.Remarks],
                ].filter(Boolean).map(([l, v], i) => (
                  <div key={i} className={`flex justify-between gap-4 px-3 py-2 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <span className="text-xs text-slate-400 font-medium">{l}</span>
                    <span className="text-xs text-slate-700 font-semibold text-right">{v || '—'}</span>
                  </div>
                ))}
              </div>
              {selected.Status === 'Issued' && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="label">Return Date</label>
                  <input className="input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                  <button className="btn-primary w-full mt-3 flex items-center justify-center gap-2" onClick={handleReturn} disabled={saving}>
                    <RotateCcw className="w-4 h-4" />
                    {saving ? 'Processing…' : 'Mark as Returned'}
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

function KeyStatusBadge({ status, overdue }) {
  if (overdue) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Overdue</span>
  const map = { 'Issued': 'bg-blue-100 text-blue-700', 'Returned': 'bg-slate-100 text-slate-500' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

function ActionBtn({ icon: Icon, color, title, onClick }) {
  const colors = { blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100', green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', red: 'bg-red-50 text-red-600 hover:bg-red-100' }
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

function today()        { return new Date().toISOString().split('T')[0] }
function daysSince(d)   { try { return Math.floor((Date.now() - new Date(d)) / 86400000) } catch { return 0 } }
