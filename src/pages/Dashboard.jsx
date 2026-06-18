import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle, XCircle, Wrench, AlertTriangle, ArrowRight, MapPin, TrendingUp } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function Dashboard() {
  const { stats, quarters, allotments, employees, keys, loadingData, fetchAll, lastFetched } = useData()
  const navigate = useNavigate()

  useEffect(() => { if (!lastFetched) fetchAll() }, [])

  const overdueKeys = keys.filter(k => k.Status === 'Issued' && k.Issued_Date && daysDiff(k.Issued_Date) > 30)
  const recentAllotments = [...allotments].filter(a => a.Status === 'Active').slice(-5).reverse()
  const occupancyPct = stats.total ? Math.round(stats.occupied / stats.total * 100) : 0

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (loadingData && !lastFetched) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading data...</p>
      </div>
    )
  }

  return (
    <div className="pb-6">

      {/* Page hero */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-5 pt-6 pb-10">
        <p className="text-brand-300 text-[11px] font-semibold tracking-widest uppercase mb-1">NJHPS Jhakri</p>
        <h2 className="text-white text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-brand-300 text-xs mt-1">{today}</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Building2} label="Total Quarters" value={stats.total}
            accent="bg-blue-500" iconBg="bg-blue-100" iconColor="text-blue-600"
            onClick={() => navigate('/quarters')}
          />
          <StatCard
            icon={CheckCircle} label="Occupied" value={stats.occupied}
            accent="bg-emerald-500" iconBg="bg-emerald-100" iconColor="text-emerald-600"
            onClick={() => navigate('/quarters?status=Occupied')}
          />
          <StatCard
            icon={XCircle} label="Vacant" value={stats.vacant}
            accent="bg-rose-500" iconBg="bg-rose-100" iconColor="text-rose-600"
            onClick={() => navigate('/quarters?status=Vacant')}
          />
          <StatCard
            icon={Wrench} label="Under Repair" value={stats.repair}
            accent="bg-amber-500" iconBg="bg-amber-100" iconColor="text-amber-600"
            onClick={() => navigate('/quarters?status=Under Repair')}
          />
        </div>

        {/* Occupancy rate */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-800">Occupancy Rate</h3>
              </div>
              <p className="text-xs text-slate-400">{stats.occupied} of {stats.total} quarters in use</p>
            </div>
            <span className="text-3xl font-extrabold text-brand-700">{occupancyPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2.5">
            <span className="text-[11px] font-medium text-emerald-600">● Occupied: {stats.occupied}</span>
            <span className="text-[11px] font-medium text-rose-500">● Vacant: {stats.vacant}</span>
            {stats.repair > 0 && (
              <span className="text-[11px] font-medium text-amber-500">● Repair: {stats.repair}</span>
            )}
          </div>
        </div>

        {/* By Quarter Type */}
        {Object.keys(stats.byType).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">By Quarter Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const occupied = quarters.filter(q => q.Type === type && q.Status === 'Occupied').length
                const pct = count ? Math.round(occupied / count * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">{type}</span>
                      <span className="text-xs text-slate-400">{occupied}/{count} &nbsp;
                        <span className="font-semibold text-slate-600">{pct}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* By Location */}
        {Object.keys(stats.byLocation).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-slate-800">By Location</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.byLocation).map(([loc, count]) => (
                <div key={loc} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{loc || 'Unknown'}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-0.5">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue key alert */}
        {overdueKeys.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  {overdueKeys.length} Key{overdueKeys.length > 1 ? 's' : ''} Overdue
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Keys held for more than 30 days</p>
                <button
                  onClick={() => navigate('/keys')}
                  className="mt-2 text-xs font-semibold text-amber-700 flex items-center gap-1"
                >
                  View Keys <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent allotments */}
        {recentAllotments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Recent Allotments</h3>
              <button
                onClick={() => navigate('/allotments')}
                className="text-xs text-brand-600 font-semibold flex items-center gap-0.5"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentAllotments.map((a, i) => {
                const emp = employees.find(e => e.Emp_ID === a.Emp_ID)
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {emp?.Name || a.Emp_ID || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {a.Quarter_ID} &nbsp;·&nbsp; {a.Allotment_Date}
                      </p>
                    </div>
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100 flex-shrink-0">
                      Active
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent, iconBg, iconColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left active:scale-95 transition-transform overflow-hidden relative"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-2xl font-extrabold text-slate-800 leading-none">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
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
