import React, { useState, useMemo } from 'react'
import {
  FileText, Printer, Building2, IndianRupee, Key,
  CheckSquare, Square, TrendingUp, AlertCircle,
  Plus, CheckCircle, XCircle, Clock, Eye, RotateCcw,
  ChevronRight, Filter, Search, User, Briefcase, GraduationCap
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import {
  createDraftOrder, issueOrder, rejectOrder, withdrawOrder
} from '../lib/googleSheets'
import {
  SJVN_UNITS, ENTITY_TYPES, ALLOTTEE_CATEGORIES, ORDER_MODES,
  QUARTER_TYPES, DEPARTMENTS, COMPANY, UNIT, UNIT_FULL, UNIT_ADDR
} from '../lib/constants'
import Modal from '../components/Modal'

const MAIN_TABS = [
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
  const { auditUser } = useAuth()

  return (
    <div className="p-4 space-y-3">
      <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
        {MAIN_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'orders'    && <OrdersSection    {...data} auditUser={auditUser} />}
      {tab === 'occupancy' && <OccupancySection {...data} />}
      {tab === 'rent'      && <RentSection      {...data} />}
      {tab === 'keys'      && <KeysSection      {...data} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDERS SECTION — Full draft order lifecycle
   ═══════════════════════════════════════════════════════════════ */

const ORDER_SUB_TABS = ['drafts','new','history']

function OrdersSection({ orders, allotments, quarters, employees, refreshOrders, refreshAllotments, refreshQuarters, refreshEmployees, auditUser }) {
  const [sub,       setSub]       = useState('drafts')
  const [saving,    setSaving]    = useState(false)
  const [issueModal,setIssueModal]= useState(null)
  const [rejectModal,setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [viewModal, setViewModal] = useState(null)

  const drafts   = orders.filter(o => o.Status === 'Draft')
  const issued   = orders.filter(o => o.Status === 'Issued')
  const rejected = orders.filter(o => o.Status === 'Rejected' || o.Status === 'Withdrawn')

  // Enrich orders with quarter / employee data
  function enrich(order) {
    const qtr = quarters.find(q => q.Quarter_ID === order.Quarter_ID)
    const emp = employees.find(e => e.Emp_ID === order.Emp_ID)
    const oldQtr = quarters.find(q => q.Quarter_ID === order.Old_Quarter_ID)
    return { ...order, qtr, emp, oldQtr }
  }

  async function handleIssue(order) {
    setSaving(true)
    try {
      await issueOrder(order, allotments, auditUser)
      await Promise.all([refreshOrders(), refreshAllotments(), refreshQuarters(), refreshEmployees()])
      setIssueModal(null)
    } catch(e) { alert('Error issuing order: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleReject(order) {
    if (!rejectReason.trim()) { alert('Please enter a reason for rejection.'); return }
    setSaving(true)
    try {
      await rejectOrder(order, rejectReason.trim(), auditUser)
      await refreshOrders()
      setRejectModal(null); setRejectReason('')
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleWithdraw(order) {
    setSaving(true)
    try {
      await withdrawOrder(order, auditUser)
      await refreshOrders()
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {/* Sub-tab row */}
      <div className="flex bg-slate-100 rounded-xl p-1">
        <SubTabBtn active={sub==='drafts'}  onClick={() => setSub('drafts')}  label={`Drafts${drafts.length ? ` (${drafts.length})` : ''}`} />
        <SubTabBtn active={sub==='new'}     onClick={() => setSub('new')}     label="New Order" />
        <SubTabBtn active={sub==='history'} onClick={() => setSub('history')} label={`Issued (${issued.length})`} />
      </div>

      {/* ── DRAFTS LIST ── */}
      {sub === 'drafts' && (
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No draft orders pending</p>
              <p className="text-xs mt-1">Create a new order to get started</p>
              <button onClick={() => setSub('new')} className="mt-3 btn-primary text-xs px-4 py-2">Create Order</button>
            </div>
          ) : drafts.map(order => {
            const o = enrich(order)
            return (
              <div key={o.Order_ID} className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
                <div className="bg-amber-50 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{o.Order_No || o.Order_ID}</p>
                    <p className="text-[10px] text-slate-400">{o.Draft_Date} · By {o.Created_By}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">Draft</span>
                </div>
                <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <DRow label="Quarter"   value={o.qtr?.Quarter_No || o.Quarter_ID} />
                  <DRow label="Type"      value={o.qtr?.Type || '—'} />
                  <DRow label="Allottee"  value={o.emp?.Name || o.Entity_Name || '—'} />
                  <DRow label="Category"  value={o.Allottee_Category || '—'} />
                  <DRow label="Mode"      value={o.Allotment_Mode || '—'} />
                  <DRow label="Eff. Date" value={o.Effective_Date || '—'} />
                  {o.Old_Quarter_ID && <DRow label="Old Qtr" value={o.oldQtr?.Quarter_No || o.Old_Quarter_ID} />}
                  {o.Rent && <DRow label="Rent" value={`₹${o.Rent}`} />}
                </div>
                <div className="px-3 py-2 border-t border-slate-100 flex gap-2">
                  <button onClick={() => setViewModal(o)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button onClick={() => { setIssueModal(o) }}
                    className="flex-1 text-xs py-1.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Issue
                  </button>
                  <button onClick={() => { setRejectModal(o); setRejectReason('') }}
                    className="flex-1 text-xs py-1.5 rounded-xl font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── NEW ORDER FORM ── */}
      {sub === 'new' && (
        <NewOrderForm
          quarters={quarters}
          employees={employees}
          orders={orders}
          allotments={allotments}
          auditUser={auditUser}
          onCreated={async () => { await refreshOrders(); setSub('drafts') }}
        />
      )}

      {/* ── HISTORY (Issued + Rejected) ── */}
      {sub === 'history' && (
        <div className="space-y-2">
          {[...issued, ...rejected].length === 0
            ? <p className="text-center py-10 text-slate-400 text-sm">No order history yet</p>
            : [...issued, ...rejected]
                .sort((a,b) => (b.Issued_Date || b.Rejected_Date || '').localeCompare(a.Issued_Date || a.Rejected_Date || ''))
                .map(order => {
                  const o = enrich(order)
                  const isIssued = o.Status === 'Issued'
                  return (
                    <div key={o.Order_ID} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isIssued ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${isIssued ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        <p className="text-xs font-bold text-slate-700">{o.Order_No || o.Order_ID}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isIssued ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {o.Status}
                        </span>
                      </div>
                      <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <DRow label="Quarter"  value={o.qtr?.Quarter_No || o.Quarter_ID} />
                        <DRow label="Allottee" value={o.emp?.Name || o.Entity_Name || '—'} />
                        <DRow label="Mode"     value={o.Allotment_Mode || '—'} />
                        <DRow label={isIssued ? 'Issued' : 'Rejected'} value={o.Issued_Date || o.Rejected_Date || '—'} />
                        {!isIssued && o.Rejected_Reason && <DRow label="Reason" value={o.Rejected_Reason} />}
                      </div>
                      {isIssued && (
                        <div className="px-3 pb-2">
                          <button onClick={() => printOrderFromData(o)}
                            className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5">
                            <Printer className="w-3.5 h-3.5" /> Print Order
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
          }
        </div>
      )}

      {/* ── Issue Confirmation Modal ── */}
      <Modal open={!!issueModal} onClose={() => setIssueModal(null)} title="Confirm Issue Order">
        {issueModal && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-800 font-semibold">This action will:</p>
              <ul className="text-xs text-emerald-700 mt-1 space-y-0.5 list-disc list-inside">
                <li>Mark the order as <strong>Issued</strong></li>
                <li>Mark <strong>{issueModal.qtr?.Quarter_No || issueModal.Quarter_ID}</strong> as Occupied</li>
                <li>Create an Allotment record in the database</li>
                {['Change','Renewal'].includes(issueModal.Allotment_Mode) && issueModal.Old_Quarter_ID && (
                  <li>Vacate old quarter <strong>{issueModal.oldQtr?.Quarter_No || issueModal.Old_Quarter_ID}</strong></li>
                )}
              </ul>
            </div>
            <div className="bg-slate-50 rounded-xl overflow-hidden">
              {[
                ['Order No',   issueModal.Order_No],
                ['Quarter',    issueModal.qtr?.Quarter_No || issueModal.Quarter_ID],
                ['Allottee',   issueModal.emp?.Name || issueModal.Entity_Name || '—'],
                ['Category',   issueModal.Allottee_Category],
                ['Mode',       issueModal.Allotment_Mode],
                ['Eff. Date',  issueModal.Effective_Date],
                issueModal.Rent && ['Rent', `₹${issueModal.Rent}`],
              ].filter(Boolean).map(([l,v],i) => (
                <div key={i} className={`flex justify-between px-3 py-1.5 text-xs ${i>0?'border-t border-slate-100':''}`}>
                  <span className="text-slate-400">{l}</span><span className="font-semibold text-slate-700">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary flex-1" onClick={() => setIssueModal(null)}>Cancel</button>
              <button className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
                onClick={() => handleIssue(issueModal)} disabled={saving}>
                <CheckCircle className="w-4 h-4" />{saving ? 'Processing…' : 'Confirm Issue'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Order">
        {rejectModal && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Rejecting order <strong>{rejectModal.Order_No}</strong> for quarter <strong>{rejectModal.qtr?.Quarter_No || rejectModal.Quarter_ID}</strong>.
            </p>
            <div>
              <label className="label">Reason for Rejection *</label>
              <textarea className="input resize-none" rows={3} placeholder="Enter reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700"
                onClick={() => handleReject(rejectModal)} disabled={saving}>
                {saving ? 'Rejecting…' : 'Reject Order'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Preview/Print Modal ── */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Order Preview">
        {viewModal && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl overflow-hidden text-xs">
              {[
                ['Order No',    viewModal.Order_No],
                ['Draft Date',  viewModal.Draft_Date],
                ['Eff. Date',   viewModal.Effective_Date],
                ['Quarter',     viewModal.qtr?.Quarter_No + (viewModal.qtr?.Type ? ` (${viewModal.qtr.Type})` : '')],
                ['Location',    viewModal.qtr?.Location + (viewModal.qtr?.Block ? ` / Block ${viewModal.qtr.Block}` : '')],
                ['Category',    viewModal.Allottee_Category],
                ['Allottee',    viewModal.emp?.Name || viewModal.Entity_Name || '—'],
                ['Designation', viewModal.emp?.Designation || viewModal.Entity_Type || '—'],
                ['Dept / Unit', viewModal.emp?.Department || viewModal.SJVN_Unit || '—'],
                ['Mode',        viewModal.Allotment_Mode],
                ['Rent',        viewModal.Rent ? `₹${viewModal.Rent}` : 'As per rules'],
                viewModal.Remarks && ['Remarks', viewModal.Remarks],
              ].filter(Boolean).map(([l,v],i) => (
                <div key={i} className={`flex justify-between gap-4 px-3 py-2 ${i>0?'border-t border-slate-100':''}`}>
                  <span className="text-slate-400 flex-shrink-0">{l}</span>
                  <span className="font-semibold text-slate-700 text-right">{v || '—'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => printOrderFromData(viewModal)}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Print Draft Order
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ─── New Order Form ──────────────────────────────────────── */

function NewOrderForm({ quarters, employees, orders, allotments, auditUser, onCreated }) {
  const [saving,   setSaving]   = useState(false)
  const [category, setCategory] = useState('SJVN Employee')
  const [mode,     setMode]     = useState('New Allotment')

  const yr = new Date().getFullYear()
  const fy = `${yr}-${String(yr+1).slice(2)}`
  const defOrderNo = `SJVN/NJHPS/QTR/${fy}/${String((orders?.length || 0) + 1).padStart(3,'0')}`

  const [form, setForm] = useState({
    order_no: defOrderNo,
    effective_date: todayStr(),
    category: 'SJVN Employee',
    mode: 'New Allotment',
    quarter_id: '',
    old_quarter_id: '',
    emp_id: '',
    entity_name: '',
    entity_type: '',
    sjvn_unit: 'NJHPS',
    rent: '',
    remarks: '',
  })

  const f = k => e => { const v = e.target.value; setForm(p => ({ ...p, [k]: v })) }

  const vacantQuarters    = quarters.filter(q => q.Status === 'Vacant')
  const occupiedQuarters  = quarters.filter(q => q.Status === 'Occupied')
  const activeEmployees   = employees.filter(e => e.Active === 'TRUE')

  function handleCategoryChange(cat) {
    setCategory(cat)
    setForm(p => ({ ...p, category: cat, emp_id: '', entity_name: '', entity_type: '' }))
  }
  function handleModeChange(m) {
    setMode(m)
    setForm(p => ({ ...p, mode: m, old_quarter_id: '' }))
  }

  async function handleSave() {
    if (!form.quarter_id) { alert('Please select a quarter.'); return }
    if (form.category === 'SJVN Employee' && !form.emp_id) { alert('Please select an employee.'); return }
    if (form.category !== 'SJVN Employee' && !form.entity_name.trim()) { alert('Please enter the entity / allottee name.'); return }
    setSaving(true)
    try {
      await createDraftOrder({ ...form }, auditUser)
      await onCreated()
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {/* Allottee category */}
      <div>
        <label className="label">Allottee Category</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { key:'SJVN Employee',      icon: User },
            { key:'Outside Agency',     icon: Briefcase },
            { key:'Apprentice / Trainee', icon: GraduationCap },
          ].map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => handleCategoryChange(key)}
              className={`py-2 px-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${category === key ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              <Icon className="w-4 h-4" />
              <span className="text-center leading-tight">{key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Allotment mode */}
      <div>
        <label className="label">Allotment Mode</label>
        <div className="grid grid-cols-2 gap-1.5">
          {['New Allotment','Change','Renewal','Surrender'].map(m => (
            <button key={m} onClick={() => handleModeChange(m)}
              className={`py-2 rounded-xl border text-xs font-semibold transition-colors ${mode === m ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Quarter */}
      <div>
        <label className="label">Quarter (New) *</label>
        <select className="input" value={form.quarter_id} onChange={f('quarter_id')}>
          <option value="">Select vacant quarter</option>
          {vacantQuarters.map(q => <option key={q.Quarter_ID} value={q.Quarter_ID}>{q.Quarter_No} · {q.Type} · {q.Location}</option>)}
        </select>
      </div>

      {/* Old quarter for change/renewal */}
      {['Change','Renewal'].includes(mode) && (
        <div>
          <label className="label">Old Quarter (being vacated)</label>
          <select className="input" value={form.old_quarter_id} onChange={f('old_quarter_id')}>
            <option value="">Select current quarter</option>
            {occupiedQuarters.map(q => <option key={q.Quarter_ID} value={q.Quarter_ID}>{q.Quarter_No} · {q.Type} · {q.Location}</option>)}
          </select>
        </div>
      )}

      {/* Employee / Agency / Trainee fields */}
      {category === 'SJVN Employee' && (
        <div>
          <label className="label">Employee *</label>
          <select className="input" value={form.emp_id} onChange={f('emp_id')}>
            <option value="">Select employee</option>
            {activeEmployees.map(e => <option key={e.Emp_ID} value={e.Emp_ID}>{e.Name} · {e.Designation} · {e.Department}</option>)}
          </select>
          <div className="mt-2">
            <label className="label">SJVN Unit</label>
            <select className="input" value={form.sjvn_unit} onChange={f('sjvn_unit')}>
              {SJVN_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      )}

      {category === 'Outside Agency' && (
        <div className="space-y-2">
          <div>
            <label className="label">Agency / Organisation Name *</label>
            <input className="input" placeholder="e.g. KV No.2 NJHPS, Jhakri" value={form.entity_name} onChange={f('entity_name')} />
          </div>
          <div>
            <label className="label">Agency Type</label>
            <select className="input" value={form.entity_type} onChange={f('entity_type')}>
              <option value="">Select type</option>
              {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {category === 'Apprentice / Trainee' && (
        <div className="space-y-2">
          <div>
            <label className="label">Trainee Name *</label>
            <input className="input" placeholder="Full name" value={form.entity_name} onChange={f('entity_name')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Trade / Branch</label>
              <input className="input" placeholder="e.g. Electrician" value={form.entity_type} onChange={f('entity_type')} />
            </div>
            <div>
              <label className="label">Batch / Year</label>
              <input className="input" placeholder="e.g. 2026-27" value={form.sjvn_unit} onChange={f('sjvn_unit')} />
            </div>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Order No.</label>
          <input className="input font-mono text-xs" value={form.order_no} onChange={f('order_no')} />
        </div>
        <div>
          <label className="label">Effective Date</label>
          <input className="input" type="date" value={form.effective_date} onChange={f('effective_date')} />
        </div>
      </div>
      <div>
        <label className="label">Monthly Rent (₹)</label>
        <input className="input" type="number" placeholder="Leave blank to fill on issuance" value={form.rent} onChange={f('rent')} />
      </div>
      <div>
        <label className="label">Remarks</label>
        <input className="input" placeholder="Optional" value={form.remarks} onChange={f('remarks')} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2">
        <FileText className="w-4 h-4" />{saving ? 'Saving…' : 'Save as Draft Order'}
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   OCCUPANCY SECTION
   ═══════════════════════════════════════════════════════════════ */

function OccupancySection({ quarters, allotments, employees, stats }) {
  const typeStats = useMemo(() => {
    const map = {}
    quarters.forEach(q => { map[q.Type] = map[q.Type] || { total:0, occ:0, vac:0, repair:0 }; map[q.Type].total++ })
    quarters.forEach(q => {
      if (q.Status === 'Occupied') map[q.Type].occ++
      else if (q.Status === 'Vacant') map[q.Type].vac++
      else if (q.Status === 'Under Repair') map[q.Type].repair++
    })
    return sortedTypes(map).map(t => ({ type:t, ...map[t], pct: map[t].total ? Math.round(map[t].occ/map[t].total*100) : 0 }))
  }, [quarters])

  const deptStats = useMemo(() => {
    const map = {}
    allotments.filter(a => a.Status === 'Active').forEach(a => {
      const dept = employees.find(e => e.Emp_ID === a.Emp_ID)?.Department || 'Other'
      map[dept] = (map[dept] || 0) + 1
    })
    return Object.entries(map).sort((a,b) => b[1]-a[1])
  }, [allotments, employees])

  const locStats = useMemo(() => {
    const map = {}
    quarters.forEach(q => { map[q.Location] = map[q.Location] || {total:0,occ:0}; map[q.Location].total++ })
    quarters.filter(q => q.Status==='Occupied').forEach(q => { if(map[q.Location]) map[q.Location].occ++ })
    return Object.entries(map).sort((a,b) => b[1].total-a[1].total)
  }, [quarters])

  const pct = stats.total ? Math.round(stats.occupied/stats.total*100) : 0

  return (
    <div className="space-y-3">
      <button onClick={() => printContent(generateOccupancyHTML(typeStats,deptStats,locStats,stats), 'Occupancy Report')}
        className="btn-primary w-full flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Print Report</button>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total"    value={stats.total}    color="text-slate-800" />
        <MiniStat label="Occupied" value={stats.occupied} color="text-emerald-600" />
        <MiniStat label="Vacant"   value={stats.vacant}   color="text-rose-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-brand-600" /><span className="text-sm font-semibold">Overall Occupancy</span></div>
          <span className="text-xl font-extrabold text-brand-700">{pct}%</span>
        </div>
        <div className="w-full bg-rose-100 rounded-full h-2.5">
          <div className="h-full rounded-full bg-emerald-500" style={{width:`${pct}%`}} />
        </div>
      </div>

      <ReportTable title="By Quarter Type" cols={['Type','Total','Occ','Vac','%']}>
        {typeStats.map((t,i) => (
          <tr key={t.type} className={i%2===1?'bg-slate-50':''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{t.type}</td>
            <td className="px-3 py-2 text-center text-slate-600">{t.total}</td>
            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{t.occ}</td>
            <td className="px-3 py-2 text-center text-rose-600 font-semibold">{t.vac}</td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-rose-100 rounded-full h-1.5"><div className="h-full rounded-full bg-emerald-500" style={{width:`${t.pct}%`}} /></div>
                <span className="text-[10px] font-semibold text-slate-500 w-7 text-right">{t.pct}%</span>
              </div>
            </td>
          </tr>
        ))}
      </ReportTable>

      <ReportTable title="By Department" cols={['Department','Occupied','Share']}>
        {deptStats.map(([dept,count],i) => (
          <tr key={dept} className={i%2===1?'bg-slate-50':''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{dept}</td>
            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{count}</td>
            <td className="px-3 py-2 text-center text-slate-500">{stats.occupied?Math.round(count/stats.occupied*100):0}%</td>
          </tr>
        ))}
      </ReportTable>

      <ReportTable title="By Location" cols={['Location','Total','Occupied','%']}>
        {locStats.map(([loc,s],i) => (
          <tr key={loc} className={i%2===1?'bg-slate-50':''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{loc||'Unknown'}</td>
            <td className="px-3 py-2 text-center text-slate-600">{s.total}</td>
            <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{s.occ}</td>
            <td className="px-3 py-2 text-center text-slate-500">{s.total?Math.round(s.occ/s.total*100):0}%</td>
          </tr>
        ))}
      </ReportTable>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   RENT SECTION
   ═══════════════════════════════════════════════════════════════ */

function RentSection({ rent, employees, quarters }) {
  const [filterMonth, setFilterMonth] = useState('')

  const enriched = useMemo(() => rent.map(r => ({
    ...r,
    emp: employees.find(e => e.Emp_ID === r.Emp_ID),
    qtr: quarters.find(q => q.Quarter_ID === r.Quarter_ID),
    recovery: parseFloat(r.Actual_Recovery)||0,
    standard: parseFloat(r.Standard_Rent)||0,
    diff:     parseFloat(r.Difference)||0,
  })), [rent,employees,quarters])

  const filtered = useMemo(() =>
    filterMonth ? enriched.filter(r => r.Month?.startsWith(filterMonth)) : enriched
  , [enriched, filterMonth])

  const monthSummary = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      if (!map[r.Month]) map[r.Month]={month:r.Month,count:0,standard:0,recovered:0,shortfall:0}
      map[r.Month].count++; map[r.Month].standard+=r.standard; map[r.Month].recovered+=r.recovery
      if (r.diff>0) map[r.Month].shortfall+=r.diff
    })
    return Object.values(map).sort((a,b) => b.month?.localeCompare(a.month))
  }, [filtered])

  const totals = { standard:filtered.reduce((s,r)=>s+r.standard,0), recovered:filtered.reduce((s,r)=>s+r.recovery,0), shortfall:filtered.filter(r=>r.diff>0).reduce((s,r)=>s+r.diff,0) }
  const months = [...new Set(rent.map(r=>r.Month?.slice(0,7)).filter(Boolean))].sort((a,b)=>b.localeCompare(a))

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">Filter Month</label>
          <select className="input" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
            <option value="">All Months</option>
            {months.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={()=>printContent(generateRentHTML(monthSummary,filtered,filterMonth),'Rent Recovery Report')} className="btn-primary flex items-center gap-2"><Printer className="w-4 h-4"/>Print</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Standard" value={`₹${fmtAmt(totals.standard)}`}  color="text-blue-600" />
        <MiniStat label="Recovered" value={`₹${fmtAmt(totals.recovered)}`} color="text-emerald-600" />
        <MiniStat label="Shortfall" value={`₹${fmtAmt(totals.shortfall)}`} color="text-red-600" />
      </div>
      <ReportTable title="Monthly Summary" cols={['Month','Entries','Standard','Recovered','Shortfall']}>
        {monthSummary.map((m,i)=>(
          <tr key={m.month} className={i%2===1?'bg-slate-50':''}>
            <td className="px-3 py-2 font-semibold text-slate-800">{m.month}</td>
            <td className="px-3 py-2 text-center text-slate-600">{m.count}</td>
            <td className="px-3 py-2 text-right text-blue-600">{fmtAmt(m.standard)}</td>
            <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{fmtAmt(m.recovered)}</td>
            <td className="px-3 py-2 text-right">{m.shortfall>0?<span className="text-red-500 font-semibold">{fmtAmt(m.shortfall)}</span>:<span className="text-slate-300">—</span>}</td>
          </tr>
        ))}
      </ReportTable>
      {filterMonth && (
        <ReportTable title={`Detail — ${filterMonth}`} cols={['Quarter','Employee','Dept','Standard','Recovered','Diff']}>
          {filtered.map((r,i)=>(
            <tr key={r.Rent_ID} className={`${i%2===1?'bg-slate-50':''} ${r.diff>0?'bg-red-50/40':''}`}>
              <td className="px-3 py-2 font-semibold text-slate-800">{r.qtr?.Quarter_No||r.Quarter_ID}</td>
              <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{r.emp?.Name||r.Emp_ID}</td>
              <td className="px-3 py-2 text-slate-500">{r.emp?.Department||'—'}</td>
              <td className="px-3 py-2 text-right text-blue-600">{fmtAmt(r.standard)}</td>
              <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{fmtAmt(r.recovery)}</td>
              <td className="px-3 py-2 text-right text-xs">
                {r.diff>0?<span className="text-red-500 font-semibold">-{fmtAmt(r.diff)}</span>:r.diff<0?<span className="text-blue-500">+{fmtAmt(Math.abs(r.diff))}</span>:<span className="text-slate-300">—</span>}
              </td>
            </tr>
          ))}
        </ReportTable>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   KEYS SECTION
   ═══════════════════════════════════════════════════════════════ */

function KeysSection({ keys, quarters }) {
  const issued = useMemo(() => keys.filter(k=>k.Status==='Issued').map(k=>({...k,qtr:quarters.find(q=>q.Quarter_ID===k.Quarter_ID),days:k.Issued_Date?daysSince(k.Issued_Date):0})).sort((a,b)=>b.days-a.days),[keys,quarters])
  const overdue=issued.filter(k=>k.days>30)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Issued"   value={issued.length}  color="text-blue-600" />
        <MiniStat label="Overdue"  value={overdue.length} color="text-amber-600" />
        <MiniStat label="Returned" value={keys.filter(k=>k.Status==='Returned').length} color="text-emerald-600" />
      </div>
      {overdue.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0"/><p className="text-xs text-amber-800 font-semibold">{overdue.length} key{overdue.length!==1?'s':''} held &gt;30 days</p></div>}
      <button onClick={()=>printContent(generateKeysHTML(issued),'Outstanding Keys Report')} className="btn-primary w-full flex items-center justify-center gap-2"><Printer className="w-4 h-4"/>Print Keys Report</button>
      <ReportTable title="Outstanding Keys" cols={['Quarter','Held By','Issued','Days','Status']}>
        {issued.map((k,i)=>{const od=k.days>30;return(
          <tr key={k.Key_ID} className={`${i%2===1?'bg-slate-50':''} ${od?'bg-amber-50/60':''}`}>
            <td className="px-3 py-2 font-semibold text-slate-800">{k.qtr?.Quarter_No||k.Quarter_ID}</td>
            <td className="px-3 py-2 text-slate-600">{k.Held_By}</td>
            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{k.Issued_Date}</td>
            <td className="px-3 py-2"><span className={`text-xs font-semibold ${od?'text-amber-600':'text-slate-500'}`}>{k.days}d</span></td>
            <td className="px-3 py-2">{od?<span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">Overdue</span>:<span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">Issued</span>}</td>
          </tr>
        )})}
        {issued.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No outstanding keys</td></tr>}
      </ReportTable>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UI SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SubTabBtn({ active, onClick, label }) {
  return <button onClick={onClick} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`}>{label}</button>
}
function DRow({ label, value }) {
  return <div><span className="text-slate-400">{label}: </span><span className="font-semibold text-slate-700">{value || '—'}</span></div>
}
function MiniStat({ label, value, color }) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2.5"><p className="text-[11px] text-slate-400 font-medium">{label}</p><p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p></div>
}
function ReportTable({ title, cols, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2"><p className="text-[10px] font-bold text-white uppercase tracking-wider">{title}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-200 bg-slate-50">{cols.map(c=><th key={c} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PRINT HELPERS
   ═══════════════════════════════════════════════════════════════ */

function printContent(bodyHTML, title='NJHPS Report') {
  const win = window.open('','_blank')
  if (!win) { alert('Allow pop-ups to print.'); return }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Times New Roman',serif;color:#000}
.page{padding:2cm;max-width:21cm;margin:0 auto;min-height:27cm}
table{width:100%;border-collapse:collapse}th,td{padding:5px 8px;border:1px solid #ccc;font-size:11px}
th{background:#eee;font-weight:bold;text-align:left}.hd{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
.hd h1{font-size:14px;letter-spacing:.5px}.hd h2{font-size:12px;font-weight:normal;margin-top:2px}.hd p{font-size:10px;margin-top:2px}
.meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:11px}
.title-line{text-align:center;font-size:14px;font-weight:bold;text-decoration:underline;margin-bottom:14px}
.section-hd{background:#ddd;font-weight:bold;font-size:12px;padding:4px 8px;border:1px solid #aaa}
.sig{display:flex;justify-content:space-between;margin-top:48px;font-size:11px}
.sig-block{text-align:center;min-width:150px}.sig-block .line{border-top:1px solid #000;padding-top:4px;margin-top:36px}
ol{padding-left:18px;font-size:11px;line-height:1.9}
@media print{@page{size:A4;margin:1.5cm}.page{padding:0;min-height:auto}}</style>
</head><body onload="setTimeout(function(){window.print();},400)">${bodyHTML}</body></html>`)
  win.document.close()
}

function printOrderFromData(o) {
  printContent(generateOrderPage(o, o.Order_No, o.Issued_Date || o.Draft_Date), `Order — ${o.Order_No}`)
}

function generateOrderPage(o, orderNo, date) {
  const yr  = new Date().getFullYear()
  const fy  = `${yr}-${String(yr+1).slice(2)}`
  const emp = o.emp || {}
  const qtr = o.qtr || {}
  const isAgency = o.Allottee_Category === 'Outside Agency' || o.Allottee_Category === 'Apprentice / Trainee'
  const allotteeName = isAgency ? (o.Entity_Name || '—') : (emp.Name || o.Emp_ID || '—')
  const designation  = isAgency ? (o.Entity_Type || o.Allottee_Category || '—') : (emp.Designation || '—')
  const department   = isAgency ? (o.SJVN_Unit || o.Allottee_Category || '—') : (emp.Department || '—')

  return `<div class="page">
  <div class="hd">
    <h1>SJVN LIMITED (A Govt. of India Enterprise)</h1>
    <h2>${UNIT_FULL} (${UNIT})</h2>
    <p>${UNIT_ADDR}</p>
  </div>
  <div class="meta">
    <div><b>No.:</b> ${orderNo || '___'}</div>
    <div><b>Date:</b> ${fmtDate(date)}</div>
  </div>
  <div class="title-line">ALLOTMENT ORDER</div>
  <p style="margin-bottom:14px;font-size:11px;text-align:justify;line-height:1.8">
    Subject to the terms and conditions of SJVN Ltd. Quarters Allotment Rules, the residential
    accommodation detailed below is allotted to the allottee mentioned hereunder:
  </p>
  <table style="margin-bottom:16px">
    <tr><td class="section-hd" colspan="2">QUARTER DETAILS</td></tr>
    <tr><td style="width:35%">Quarter No.</td><td>${qtr.Quarter_No || o.Quarter_ID || '—'}</td></tr>
    <tr><td>Type</td><td>${qtr.Type || '—'}</td></tr>
    <tr><td>Location / Block</td><td>${qtr.Location || '—'}${qtr.Block?' / Block '+qtr.Block:''}</td></tr>
    <tr><td class="section-hd" colspan="2">ALLOTTEE DETAILS</td></tr>
    <tr><td>Name</td><td><b>${allotteeName}</b></td></tr>
    <tr><td>Designation / Type</td><td>${designation}</td></tr>
    <tr><td>Department / Unit</td><td>${department}</td></tr>
    ${!isAgency && emp.Category ? `<tr><td>Category</td><td>${emp.Category}</td></tr>` : ''}
    <tr><td class="section-hd" colspan="2">ALLOTMENT DETAILS</td></tr>
    <tr><td>Allotment Mode</td><td>${o.Allotment_Mode || 'New Allotment'}</td></tr>
    <tr><td>Effective Date</td><td>${fmtDate(o.Effective_Date)}</td></tr>
    <tr><td>Monthly Rent</td><td>₹ ${o.Rent || 'As per prevailing SJVN rules'}</td></tr>
    ${o.Remarks ? `<tr><td>Remarks</td><td>${o.Remarks}</td></tr>` : ''}
  </table>
  <p style="font-weight:bold;margin-bottom:6px;font-size:11px">TERMS AND CONDITIONS:</p>
  <ol>
    <li>This allotment is purely temporary and is liable to be cancelled without prior notice at the discretion of the competent authority.</li>
    <li>The allottee shall vacate the quarter immediately upon transfer, retirement, resignation, dismissal from service or on completion of the purpose for which the quarter was allotted.</li>
    <li>Monthly house rent and other charges as prescribed shall be recovered from the salary / otherwise.</li>
    <li>The allottee shall maintain the quarter in good and habitable condition and shall not carry out any structural alterations or additions without prior written permission of the competent authority.</li>
    <li>Sub-letting, sharing or parting with possession of the quarter to any other person is strictly prohibited.</li>
    <li>Any damage to fixtures, fittings or structure shall be charged to the allottee.</li>
    <li>The allottee shall abide by all the rules and regulations of SJVN Ltd. and NJHPS governing allotment of residential quarters as amended from time to time.</li>
  </ol>
  <div class="sig">
    <div class="sig-block"><div class="line">Allottee's Signature &amp; Date</div></div>
    <div class="sig-block"><div class="line"><b>Housing Officer / AO (Admin)</b><br/>NJHPS, Jhakri</div></div>
  </div>
</div>`
}

function generateOccupancyHTML(typeStats,deptStats,locStats,stats) {
  const pct=stats.total?Math.round(stats.occupied/stats.total*100):0
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  return `<div class="page">
  <div class="hd"><h1>SJVN LIMITED — ${UNIT_FULL} (${UNIT})</h1><h2>Quarters Occupancy Status Report</h2><p>As on ${today}</p></div>
  <table style="margin-bottom:8px"><tr><th>Total</th><th>Occupied</th><th>Vacant</th><th>Under Repair</th><th>Occupancy %</th></tr>
  <tr><td>${stats.total}</td><td>${stats.occupied}</td><td>${stats.vacant}</td><td>${stats.repair||0}</td><td>${pct}%</td></tr></table>
  <br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">TYPE-WISE STATUS</p>
  <table style="margin-bottom:8px"><tr><th>Type</th><th>Total</th><th>Occupied</th><th>Vacant</th><th>Repair</th><th>%</th></tr>
  ${typeStats.map(t=>`<tr><td>${t.type}</td><td>${t.total}</td><td>${t.occ}</td><td>${t.vac}</td><td>${t.repair}</td><td>${t.pct}%</td></tr>`).join('')}</table>
  <br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">DEPARTMENT-WISE</p>
  <table style="margin-bottom:8px"><tr><th>Department</th><th>Occupied</th><th>Share %</th></tr>
  ${deptStats.map(([d,c])=>`<tr><td>${d}</td><td>${c}</td><td>${stats.occupied?Math.round(c/stats.occupied*100):0}%</td></tr>`).join('')}</table>
  <br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">LOCATION-WISE</p>
  <table><tr><th>Location</th><th>Total</th><th>Occupied</th><th>%</th></tr>
  ${locStats.map(([l,s])=>`<tr><td>${l||'Unknown'}</td><td>${s.total}</td><td>${s.occ}</td><td>${s.total?Math.round(s.occ/s.total*100):0}%</td></tr>`).join('')}</table>
  <div class="sig"><div class="sig-block"><div class="line">Prepared By</div></div><div class="sig-block"><div class="line"><b>Housing Officer / AO (Admin)</b><br/>NJHPS, Jhakri</div></div></div>
</div>`
}

function generateRentHTML(monthSummary,detail,filterMonth) {
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  const totStd=detail.reduce((s,r)=>s+(parseFloat(r.Standard_Rent)||0),0)
  const totRec=detail.reduce((s,r)=>s+(parseFloat(r.Actual_Recovery)||0),0)
  const totDif=detail.filter(r=>parseFloat(r.Difference)>0).reduce((s,r)=>s+(parseFloat(r.Difference)||0),0)
  return `<div class="page">
  <div class="hd"><h1>SJVN LIMITED — ${UNIT_FULL} (${UNIT})</h1><h2>Rent Recovery Report${filterMonth?' — '+filterMonth:''}</h2><p>As on ${today}</p></div>
  <table style="margin-bottom:8px"><tr><th>Standard (₹)</th><th>Recovered (₹)</th><th>Shortfall (₹)</th><th>Entries</th></tr>
  <tr><td>${fmtAmt(totStd)}</td><td>${fmtAmt(totRec)}</td><td style="color:red">${fmtAmt(totDif)}</td><td>${detail.length}</td></tr></table>
  <br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">MONTHLY SUMMARY</p>
  <table style="margin-bottom:8px"><tr><th>Month</th><th>Entries</th><th>Standard</th><th>Recovered</th><th>Shortfall</th></tr>
  ${monthSummary.map(m=>`<tr><td>${m.month}</td><td>${m.count}</td><td>${fmtAmt(m.standard)}</td><td>${fmtAmt(m.recovered)}</td><td${m.shortfall>0?' style="color:red"':''}>${m.shortfall>0?fmtAmt(m.shortfall):'—'}</td></tr>`).join('')}</table>
  ${filterMonth?`<br/><p style="font-weight:bold;margin-bottom:4px;font-size:12px">DETAIL</p><table><tr><th>Quarter</th><th>Employee</th><th>Dept</th><th>Standard</th><th>Recovered</th><th>Diff</th></tr>${detail.map(r=>`<tr><td>${r.qtr?.Quarter_No||r.Quarter_ID}</td><td>${r.emp?.Name||r.Emp_ID}</td><td>${r.emp?.Department||'—'}</td><td>${fmtAmt(parseFloat(r.Standard_Rent)||0)}</td><td>${fmtAmt(parseFloat(r.Actual_Recovery)||0)}</td><td${parseFloat(r.Difference)>0?' style="color:red"':''}>${parseFloat(r.Difference)>0?'-'+fmtAmt(parseFloat(r.Difference)):(parseFloat(r.Difference)<0?'+'+fmtAmt(Math.abs(parseFloat(r.Difference))):'—')}</td></tr>`).join('')}</table>`:''}
  <div class="sig"><div class="sig-block"><div class="line">Prepared By</div></div><div class="sig-block"><div class="line"><b>AO (Finance) / Housing Officer</b><br/>NJHPS, Jhakri</div></div></div>
</div>`
}

function generateKeysHTML(issued) {
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
  return `<div class="page">
  <div class="hd"><h1>SJVN LIMITED — ${UNIT_FULL} (${UNIT})</h1><h2>Outstanding Key Register</h2><p>As on ${today} | Issued: ${issued.length}</p></div>
  <table><tr><th>#</th><th>Quarter</th><th>Held By</th><th>Issued Date</th><th>Days</th><th>Status</th></tr>
  ${issued.map((k,i)=>`<tr${k.days>30?' style="background:#fff3cd"':''}><td>${i+1}</td><td>${k.qtr?.Quarter_No||k.Quarter_ID}</td><td>${k.Held_By}</td><td>${fmtDate(k.Issued_Date)}</td><td${k.days>30?' style="color:red;font-weight:bold"':''}>${k.days}d</td><td>${k.days>30?'OVERDUE':'Issued'}</td></tr>`).join('')}
  ${issued.length===0?'<tr><td colspan="6" style="text-align:center;padding:20px;color:#666">No outstanding keys</td></tr>':''}</table>
  <div class="sig"><div class="sig-block"><div class="line">Prepared By</div></div><div class="sig-block"><div class="line"><b>Housing Officer</b><br/>NJHPS, Jhakri</div></div></div>
</div>`
}

/* ─── Utility ─────────────────────────────────────────────── */
function todayStr()   { return new Date().toISOString().split('T')[0] }
function daysSince(d) { try { return Math.floor((Date.now()-new Date(d))/86400000) } catch { return 0 } }
function fmtDate(s)   { if (!s) return '—'; try { const [y,m,d]=s.split('-'); return `${d}/${m}/${y}` } catch { return s } }
function fmtAmt(n)    { return Number(n||0).toLocaleString('en-IN') }
