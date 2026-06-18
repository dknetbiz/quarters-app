import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, Key, IndianRupee, ClipboardList, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quarters',   icon: Building2,       label: 'Quarters'  },
  { to: '/allotments', icon: ClipboardList,   label: 'Allotments'},
  { to: '/keys',       icon: Key,             label: 'Keys'      },
  { to: '/rent',       icon: IndianRupee,     label: 'Rent'      },
]

export default function Layout({ children }) {
  const { user, logout }          = useAuth()
  const { fetchAll, loadingData, lastFetched } = useData()
  const location = useLocation()

  const currentLabel = NAV.find(n => n.to === location.pathname)?.label || 'NJHPS Quarters'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-brand-800 text-white px-4 pt-safe-top sticky top-0 z-40">
        <div className="flex items-center justify-between h-14">
          <div>
            <h1 className="font-semibold text-base leading-tight">{currentLabel}</h1>
            {lastFetched && (
              <p className="text-brand-300 text-xs">
                Updated {lastFetched.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              disabled={loadingData}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* User banner */}
      {user && (
        <div className="bg-brand-700 px-4 py-2 flex items-center gap-2">
          <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
          <span className="text-white text-xs truncate">{user.name} · {user.email}</span>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe-bottom z-40">
        <div className="flex">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-brand-50' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
