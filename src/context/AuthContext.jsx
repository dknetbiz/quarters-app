import React, { createContext, useContext, useState, useEffect } from 'react'
import { loadGoogleAuth, initTokenClient, requestToken, getUserInfo, getToken, getStoredUser, revokeToken } from '../lib/auth'
import { initializeSheetHeaders } from '../lib/googleSheets'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        await loadGoogleAuth()
        const token = getToken()
        const stored = getStoredUser()
        if (token && stored) {
          setUser(stored)
        }
        initTokenClient(
          async (response) => {
            const info = await getUserInfo(response.access_token)
            setUser(info)
            try { await initializeSheetHeaders() } catch(e) { console.warn('Sheet init:', e.message) }
          },
          (err) => console.error('Auth error:', err)
        )
        setAuthReady(true)
      } catch (e) {
        console.error('Failed to load Google Auth:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function login() {
    setLoading(true)
    try {
      const response = await requestToken()
      const info = await getUserInfo(response.access_token)
      setUser(info)
      try { await initializeSheetHeaders() } catch(e) {}
    } catch (e) {
      console.error('Login failed:', e)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    revokeToken()
    setUser(null)
  }

  // Helper to get user object for audit logs
  const auditUser = user ? {
    userEmail: user.email,
    userName: user.name
  } : { userEmail: 'unknown', userName: 'unknown' }

  return (
    <AuthContext.Provider value={{ user, loading, authReady, login, logout, auditUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
