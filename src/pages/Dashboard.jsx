import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle, XCircle, Wrench, Key, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function Dashboard() {
  const { stats, quarters, allotments, keys, loadingData, fetchAll, lastFetched } = useData()
  const navigate = useNavigate()

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const overdueKeys = keys.filter(k => k.Status === 'Issued' && k.Issued_Date && daysDiff(k.Issued_Date) > 30)
  const recentAllotments = [...allotments].filter(a => a.Status === 'Active').slice(-5).reverse()

  if (loadingData && !lastFetched) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading data...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Building2} label="Total Quarters" value={stats.total} color="blue" onClick={() => navigate('/quarters')} />
        <StatCard icon={CheckCircle} label="Occupied" value={stats.occupied} color="green" onClick={() => navigate('/quarters?status=Occupied')} />
        <StatCard icon={XCircle} label="Vacant" value={stats.vacant} color="red" onClick={() => navigate('/quarters?status=Vacant')} />
        <StatCard icon={Wrench} label="Under Repair" value={stats.repair} color="amber" onClick={() => navigate('/quarters?status=Under Repair')} />
      </div>

      {/* Occupancy bar */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Occupancy Rate</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: stats.total ? `${(stats.occupied / stats.total * 100).toFixed(0)}%` : '0%' }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-12 text-right">
            {stats.total ? `${(stats.occupied / stats.total * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{stats.occupied} of {stats.total} quarters occupied</p>
      </div>

      {/* By Type breakdown */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">By Quarter Type</h3>
          <div className="space-y-2">
            {Object.entries(stats.byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => {
              const occupied = quarters.filter(q => q.Type === type && q.Status === 'Occupied').length
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 truncate">{type}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: count ? `${(occupied/count*100).toFixed(0)}%` : '0%' }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{occupied}/{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* By Location */}
      {Object.keys(stats.byLocation).length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">By Location</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.byLocation).map(([loc, count]) => (
              <div key={loc} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{loc}</p>
                <p className="text-lg font-bold text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue key alert */}
      {overdueKeys.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{overdueKeys.length} key(s) overdue</p>
            <p className="text-xs text-amber-600 mt-0.5">Keys held for more than 30 days</p>
            <button onClick={() => navigate('/keys')} className="text-xs text-amber-700 font-medium underline mt-1">View Keys →</button>
          </div>
        </div>
      )}

      {/* Recent allotments */}
      {recentAllotments.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Allotments</h3>
          <div className="space-y-3">
            {recentAllotments.map((a, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.Quarter_ID}</p>
                  <p className="text-xs text-slate-500 truncate">{a.Emp_ID} · {a.Allotment_Date}</p>
                </div>
                <span className="badge-occupied ml-auto flex-shrink-0">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red:   'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <button onClick={onClick} className="card text-left active:scale-95 transition-transform">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </button>
  )
}

function daysDiff(dateStr) {
  try {
    const [d, m, y] = dateStr.split('/')
    const date = new Date(`${y}-${m}-${d}`)
    return Math.floor((Date.now() - date.getTime()) / 86400000)
  } catch { return 0 }
}
