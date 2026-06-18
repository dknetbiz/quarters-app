import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, CheckCircle, XCircle, Wrench, AlertTriangle, ArrowRight,
  MapPin, TrendingUp, Plus, Key, IndianRupee, ClipboardList, Users, UserCheck
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { createAllotment } from '../lib/googleSheets'
import { ALLOTMENT_TYPES } from '../lib/constants'
import Modal from '../components/Modal'

export default function Dashboard() {
  const {
    stats, quarters, allotments, employees, keys,
    loadingData, fetchAll, lastFetched,
    refreshAllotments, refreshQuarters
  } = useData()
  const { auditUser } = useAuth()
  const navigate = useNavigate()

  const [typeModal,  setTypeModal]  = useState(null)   // { type, mode:'vacant'|'occupied' }
  const [allotModal, setAllotModal] = useState(false)
  const [allotForm,  setAllotForm]  = useState(emptyForm())
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const overdueKeys      = keys.filter(k => k.Status === 'Issued' && k.Issued_Date && daysDiff(k.Issued_Date) > 30)
  const recentAllotments = [...allotments].filter(a => a.Status === 'Active').slice(-5).reverse()
  const occupancyPct     = stats.total ? Math.round(stats.occupied / stats.total * 100) : 0
  const today            = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  // Organisation stats: dept → occupied count
  const orgStats = useMemo(() => {
    const map = {}
    allotments.filter(a => a.Status === 'Active').forEach(a => {
      const dept = employees.find(e => e.Emp_ID === a.Emp_ID)?.Department || 'Other'
      map[dept] = (map[dept] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [allotments, employees])

  const typeEntries = useMemo(() =>
    Object.entries(stats.byType).sort((a, b) => b[1] - a[1])
  , [stats.byType])

  // Data shown inside the type detail modal
  const typeData = useMemo(() => {
    if (!typeModal) return { list: [] }
    const tq = quarters.filter(q => q.Type === typeModal.type)
    if (typeModal.mode === 'vacant') return { list: tq.filter(q => q.Status === 'Vacant') }
    const ids = new Set(tq.map(q => q.Quarter_ID))
    return {
      list: allotments
        .filter(a => a.Status === 'Active' && ids.has(a.Quarter_ID))
        .map(a => ({
          ...a,
          emp: employees.find(e => e.Emp_ID === a.Emp_ID),
          qtr: tq.find(q => q.Quarter_ID === a.Quarter_ID)
        }))
    }
  }, [typeModal, quarters, allotments, employees])

  const typeVacantQuarters = typeModal
    ? quarters.filter(q => q.Type === typeModal.type && q.Status === 'Vacant')
    : []

  const activeEmployees = employees.filter(e => e.Active === 'TRUE')

  async function handleCreateAllotment() {
    if (!allotForm.quarter_id || !allotForm.emp_id || !allotForm.allotment_date) return
    setSaving(true)
    try {
      await createAllotment(allotForm, auditUser)
      await Promise.all([refreshAllotments(), refreshQuarters()])
      setAllotModal(false)
      setAllotForm(emptyForm())
      setTypeModal(null)
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const f = k => e => setAllotForm(p => ({ ...p, [k]: e.target.value }))

  if (loadingData && !lastFetched) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading data…</p>
      </div>
    )
  }

  return (
    <div className="pb-8">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-5 pt-5 pb-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-brand-300 text-[10px] font-bold tracking-widest uppercase">NJHPS Jhakri</p>
            <h2 className="text-white text-xl font-bold mt-0.5">Dashboard</h2>
            <p className="text-brand-300 text-[11px] mt-0.5">{today}</p>
          </div>
          <div className="text-right">
            <p className="text-brand-300 text-[10px] uppercase tracking-wide font-semibold">Occupancy</p>
            <p className="text-white text-3xl font-extrabold leading-none">{occupancyPct}%</p>
            <p className="text-brand-300 text-[10px] mt-0.5">{stats.occupied} / {stats.total}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* ── Stat cards + Type breakdown ───────────────────── */}
        <div className="grid grid-cols-2 gap-3 items-start">

          {/* 2×2 compact stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Building2}   label="Total"    value={stats.total}    accent="bg-blue-500"    iconBg="bg-blue-50"    iconColor="text-blue-600"    onClick={() => navigate('/quarters')} />
            <StatCard icon={CheckCircle} label="Occupied" value={stats.occupied} accent="bg-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600" onClick={() => navigate('/quarters?status=Occupied')} />
            <StatCard icon={XCircle}     label="Vacant"   value={stats.vacant}   accent="bg-rose-500"   iconBg="bg-rose-50"   iconColor="text-rose-600"   onClick={() => navigate('/quarters?status=Vacant')} />
            <StatCard icon={Wrench}      label="Repair"   value={stats.repair}   accent="bg-amber-500"  iconBg="bg-amber-50"  iconColor="text-amber-600"  onClick={() => navigate('/quarters?status=Under Repair')} />
          </div>

          {/* Type-wise panel */}
          {typeEntries.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Type</p>
              {typeEntries.map(([type, total]) => {
                const occ = quarters.filter(q => q.Type === type && q.Status === 'Occupied').length
                const vac = total - occ
                const pct = total ? Math.round(occ / total * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[42%]">{type}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTypeModal({ type, mode: 'occupied' })}
                          className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
                          title="View occupants"
                        >
                          {occ} occ
                        </button>
                        <button
                          onClick={() => setTypeModal({ type, mode: 'vacant' })}
                          className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-rose-100 active:bg-rose-200 transition-colors"
                          title="View / allot vacant"
                        >
                          {vac} vac
                        </button>
                      </div>
                    </div>
                    {/* Two-tone bar: green = occupied, rose bg = vacant */}
                    <div className="w-full bg-rose-100 rounded-full h-1 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Organisation-wise cards ───────────────────────── */}
        {orgStats.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">By Organisation</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {orgStats.map(([dept, count]) => (
                <OrgCard key={dept} dept={dept} count={count} total={stats.occupied} />
              ))}
            </div>
          </div>
        )}

        {/* ── Quick actions ────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction icon={ClipboardList} label="Allotment" bg="bg-brand-50"   text="text-brand-700"   onClick={() => navigate('/allotments')} />
            <QuickAction icon={Key}           label="Key Entry" bg="bg-amber-50"   text="text-amber-700"   onClick={() => navigate('/keys')} />
            <QuickAction icon={IndianRupee}   label="Rent"      bg="bg-emerald-50" text="text-emerald-700" onClick={() => navigate('/rent')} />
            <QuickAction icon={Users}         label="Employee"  bg="bg-purple-50"  text="text-purple-700"  onClick={() => navigate('/allotments')} />
          </div>
        </div>

        {/* ── Occupancy bar ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">Occupancy Rate</span>
            </div>
            <span className="text-2xl font-extrabold text-brand-700">{occupancyPct}%</span>
          </div>
          <div className="w-full bg-rose-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] font-semibold text-emerald-600">● Occupied: {stats.occupied}</span>
            <span className="text-[11px] font-semibold text-rose-500">● Vacant: {stats.vacant}</span>
            {stats.repair > 0 && <span className="text-[11px] font-semibold text-amber-500">● Repair: {stats.repair}</span>}
          </div>
        </div>

        {/* ── By Location ──────────────────────────────────── */}
        {Object.keys(stats.byLocation).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">By Location</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(stats.byLocation).map(([loc, count]) => (
                <div key={loc} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">{loc || 'Unknown'}</p>
                  <p className="text-xl font-extrabold text-slate-800 mt-0.5">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Overdue key alert ────────────────────────────── */}
        {overdueKeys.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{overdueKeys.length} Key{overdueKeys.length > 1 ? 's' : ''} Overdue</p>
              <p className="text-xs text-amber-700 mt-0.5">Keys held for more than 30 days</p>
              <button onClick={() => navigate('/keys')} className="mt-1.5 text-xs font-semibold text-amber-700 flex items-center gap-1">
                View Keys <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Recent allotments ────────────────────────────── */}
        {recentAllotments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Recent Allotments</span>
              <button onClick={() => navigate('/allotments')} className="text-xs text-brand-600 font-semibold flex items-center gap-0.5">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentAllotments.map((a, i) => {
                const emp = employees.find(e => e.Emp_ID === a.Emp_ID)
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{emp?.Name || a.Emp_ID || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 truncate">{a.Quarter_ID} · {a.Allotment_Date}</p>
                    </div>
                    <span className="badge-occupied flex-shrink-0">Active</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Type detail modal ────────────────────────────────── */}
      <Modal
        open={!!typeModal && !allotModal}
        onClose={() => setTypeModal(null)}
        title={typeModal
          ? `${typeModal.type} — ${typeModal.mode === 'vacant' ? 'Vacant Quarters' : 'Current Occupants'}`
          : ''}
      >
        {typeModal && (
          <div className="space-y-2">
            {typeModal.mode === 'vacant' ? (
              <>
                {typeData.list.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No vacant quarters for {typeModal.type}</p>
                ) : (
                  typeData.list.map(q => (
                    <div key={q.Quarter_ID} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{q.Quarter_No}</p>
                        <p className="text-xs text-slate-500">{q.Location}{q.Block ? ` · Block ${q.Block}` : ''}</p>
                      </div>
                      <span className="badge-vacant">Vacant</span>
                    </div>
                  ))
                )}
                {typeData.list.length > 0 && (
                  <button
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                    onClick={() => { setAllotForm(emptyForm()); setAllotModal(true) }}
                  >
                    <Plus className="w-4 h-4" /> New Allotment for {typeModal.type}
                  </button>
                )}
              </>
            ) : (
              typeData.list.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No active occupants for {typeModal.type}</p>
              ) : (
                typeData.list.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.emp?.Name || a.Emp_ID}</p>
                      <p className="text-xs text-slate-500 truncate">{a.qtr?.Quarter_No || a.Quarter_ID} · {a.emp?.Designation || ''}</p>
                      <p className="text-xs text-slate-400">{a.Allotment_Date} · {a.emp?.Department || ''}</p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </Modal>

      {/* ── New Allotment modal (from type vacant) ───────────── */}
      <Modal
        open={allotModal}
        onClose={() => { setAllotModal(false); setAllotForm(emptyForm()) }}
        title={`New Allotment — ${typeModal?.type || ''}`}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Quarter (Vacant) *</label>
            <select className="input" value={allotForm.quarter_id} onChange={f('quarter_id')}>
              <option value="">Select vacant quarter</option>
              {typeVacantQuarters.map(q => (
                <option key={q.Quarter_ID} value={q.Quarter_ID}>{q.Quarter_No} · {q.Location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Employee *</label>
            <select className="input" value={allotForm.emp_id} onChange={f('emp_id')}>
              <option value="">Select employee</option>
              {activeEmployees.map(e => (
                <option key={e.Emp_ID} value={e.Emp_ID}>{e.Name} · {e.Designation} · {e.Department}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={allotForm.allotment_date} onChange={f('allotment_date')} />
            </div>
            <div>
              <label className="label">Rent (₹)</label>
              <input className="input" type="number" placeholder="0" value={allotForm.rent} onChange={f('rent')} />
            </div>
          </div>
          <div>
            <label className="label">Allotment Type</label>
            <select className="input" value={allotForm.allotment_type} onChange={f('allotment_type')}>
              {ALLOTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" placeholder="Optional" value={allotForm.remarks} onChange={f('remarks')} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => { setAllotModal(false); setAllotForm(emptyForm()) }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleCreateAllotment} disabled={saving}>
            {saving ? 'Saving…' : 'Create Allotment'}
          </button>
        </div>
      </Modal>

    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, accent, iconBg, iconColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 text-left active:scale-95 transition-transform overflow-hidden relative"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${iconBg}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <p className="text-xl font-bold text-slate-800 leading-none">{value ?? '—'}</p>
      <p className="text-[11px] text-slate-600 font-medium mt-1">{label}</p>
    </button>
  )
}

const ORG_PALETTE = {
  NJHPS:  'from-blue-500 to-blue-700',
  RHPS:   'from-violet-500 to-violet-700',
  LHEP:   'from-cyan-500 to-cyan-700',
  CISF:   'from-rose-500 to-rose-700',
  BSNL:   'from-orange-500 to-orange-700',
  FA:     'from-teal-500 to-teal-700',
  Other:  'from-slate-400 to-slate-600',
}

function OrgCard({ dept, count, total }) {
  const pct  = total ? Math.round(count / total * 100) : 0
  const grad = ORG_PALETTE[dept] || 'from-slate-400 to-slate-600'
  return (
    <div className={`flex-shrink-0 bg-gradient-to-br ${grad} rounded-xl px-4 py-3 min-w-[96px] text-white`}>
      <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">{dept}</p>
      <p className="text-2xl font-extrabold leading-none mt-1">{count}</p>
      <p className="text-[9px] opacity-60 mt-0.5">{pct}% of occupied</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, bg, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${bg} ${text} rounded-xl p-3 flex flex-col items-center gap-1.5 active:opacity-75 transition-opacity`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
    </button>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */

function emptyForm() {
  return {
    quarter_id: '', emp_id: '',
    allotment_date: new Date().toISOString().split('T')[0],
    allotment_type: 'Allotment', rent: '', remarks: ''
  }
}

function daysDiff(dateStr) {
  try {
    const [d, m, y] = dateStr.split('/')
    return Math.floor((Date.now() - new Date(`${y}-${m}-${d}`).getTime()) / 86400000)
  } catch { return 0 }
}
