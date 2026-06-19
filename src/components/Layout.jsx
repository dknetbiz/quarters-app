import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Key, IndianRupee, ClipboardList, LogOut, RefreshCw, FileText, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Home'       },
  { to: '/quarters',    icon: Building2,       label: 'Quarters'   },
  { to: '/allotments',  icon: ClipboardList,   label: 'Allotments' },
  { to: '/keys',        icon: Key,             label: 'Keys'       },
  { to: '/rent',        icon: IndianRupee,     label: 'Rent'       },
  { to: '/reports',     icon: FileText,        label: 'Reports'    },
  { to: '/bulk-upload', icon: Upload,          label: 'Upload'     },
]

export default function Layout({ children }) {
  const { user, logout }                       = useAuth()
  const { fetchAll, loadingData, lastFetched } = useData()
  const location = useLocation()

  const currentLabel = NAV.find(n => n.to === location.pathname)?.label || 'NJHPS Accommodation'

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-brand-800 text-white px-4 pt-safe-top sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between h-14">

          {/* Title */}
          <div>
            <p className="text-brand-400 text-[9px] font-bold tracking-widest uppercase leading-none">NJHPS Jhakri</p>
            <h1 className="font-semibold text-base leading-tight">{currentLabel}</h1>
            {lastFetched && (
              <p className="text-brand-300 text-[10px]">
                Synced {lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* User avatar + action buttons */}
          <div className="flex items-center gap-2">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                title={user.name}
                className="w-7 h-7 rounded-full ring-2 ring-white/30"
              />
            )}
            <button
              onClick={fetchAll}
              disabled={loadingData}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe-bottom z-40 shadow-[0_-2px_16px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors ${
                  isActive ? 'text-brand-700' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-9 h-6 flex items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? 'bg-brand-100' : ''
                  }`}>
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  </div>
                  <span className={isActive ? 'font-semibold' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  )
}
