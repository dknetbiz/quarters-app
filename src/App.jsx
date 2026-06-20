import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import QuartersPage from './pages/QuartersPage'
import AllotmentsPage from './pages/AllotmentsPage'
import KeysPage from './pages/KeysPage'
import RentPage from './pages/RentPage'
import ReportsPage from './pages/ReportsPage'
import BulkUploadPage from './pages/BulkUploadPage'
import EmployeesPage from './pages/EmployeesPage'
import { ShieldOff, RefreshCw, Unplug, KeyRound } from 'lucide-react'

function SessionExpiredScreen({ login }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Session Expired</h1>
        <p className="text-brand-200 text-sm mb-6">Your Google session has expired. Sign in again to continue.</p>
        <button onClick={login} className="bg-white text-brand-800 text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors hover:bg-brand-50">
          Sign in again
        </button>
      </div>
    </div>
  )
}

function ScriptNotConfiguredScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Unplug className="w-8 h-8 text-yellow-300" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Backend Not Connected</h1>
        <p className="text-brand-200 text-sm mb-3">The Google Apps Script backend is not configured.</p>
        <p className="text-brand-300 text-xs">Set <code className="text-yellow-300">VITE_APPS_SCRIPT_URL</code> and <code className="text-yellow-300">VITE_APPS_SCRIPT_KEY</code> in GitHub Secrets and redeploy.</p>
      </div>
    </div>
  )
}

function ScriptUnauthorizedScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-8 h-8 text-rose-300" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Backend Key Mismatch</h1>
        <p className="text-brand-200 text-sm mb-3">The secret key in GitHub Secrets does not match the key set in Apps Script Properties.</p>
        <p className="text-brand-300 text-xs">Check <code className="text-yellow-300">VITE_APPS_SCRIPT_KEY</code> in GitHub Secrets and <code className="text-yellow-300">SECRET_KEY</code> in Apps Script → Project Settings → Script Properties.</p>
      </div>
    </div>
  )
}

function AccessDeniedScreen({ user, logout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-rose-300" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Not Granted</h1>
        <p className="text-brand-200 text-sm mb-1">
          Your account <span className="font-semibold text-white">{user?.email}</span> has not been given access to the NJHPS Quarters data.
        </p>
        <p className="text-brand-300 text-xs mt-3 mb-6">
          Contact the Housing Officer / System Administrator to request access.
        </p>
        <button onClick={logout} className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}

function DataRoutes() {
  const { error, loadingData } = useData()
  const { user, logout, login } = useAuth()

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-800">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error === 'SCRIPT_NOT_CONFIGURED') return <ScriptNotConfiguredScreen />
  if (error === 'SCRIPT_UNAUTHORIZED')   return <ScriptUnauthorizedScreen />
  if (error === 'SESSION_EXPIRED')       return <SessionExpiredScreen login={login} />
  if (error === 'ACCESS_DENIED')         return <AccessDeniedScreen user={user} logout={logout} />

  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/quarters"   element={<QuartersPage />} />
        <Route path="/allotments" element={<AllotmentsPage />} />
        <Route path="/keys"       element={<KeysPage />} />
        <Route path="/rent"       element={<RentPage />} />
        <Route path="/reports"     element={<ReportsPage />} />
        <Route path="/employees"   element={<EmployeesPage />} />
        <Route path="/bulk-upload" element={<BulkUploadPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-800">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <DataProvider>
      <DataRoutes />
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
