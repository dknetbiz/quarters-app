import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import QuartersPage from './pages/QuartersPage'
import AllotmentsPage from './pages/AllotmentsPage'
import KeysPage from './pages/KeysPage'
import RentPage from './pages/RentPage'

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
      <Layout>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/quarters"   element={<QuartersPage />} />
          <Route path="/allotments" element={<AllotmentsPage />} />
          <Route path="/keys"       element={<KeysPage />} />
          <Route path="/rent"       element={<RentPage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
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
