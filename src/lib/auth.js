import { CONFIG } from './constants'

let tokenClient  = null
let accessToken  = null
let pendingRefresh = null   // dedup simultaneous refresh calls
let refreshTimer = null

// ─── Load Google Identity Services ────────────────────────────
export function loadGoogleAuth() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// ─── Schedule proactive silent refresh ────────────────────────
function scheduleRefresh(expiresIn) {
  if (refreshTimer) clearTimeout(refreshTimer)
  // Refresh 5 minutes before the token expires
  const delay = Math.max(0, (expiresIn - 300)) * 1000
  refreshTimer = setTimeout(() => {
    silentRefresh().catch(() => {})   // best-effort; user will be prompted if it fails
  }, delay)
}

// ─── Save token to session ─────────────────────────────────────
function storeToken(response) {
  accessToken = response.access_token
  const expiry = Date.now() + (response.expires_in * 1000)
  sessionStorage.setItem('gauth_token',  accessToken)
  sessionStorage.setItem('gauth_expiry', expiry.toString())
  scheduleRefresh(response.expires_in)
}

// ─── Initialize token client ───────────────────────────────────
export function initTokenClient(onSuccess, onError) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: (response) => {
      if (response.error) { onError(response.error); return }
      storeToken(response)
      onSuccess(response)
    }
  })
}

// ─── Interactive login (shows Google popup) ───────────────────
export function requestToken() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Token client not initialized')); return }
    tokenClient.callback = (response) => {
      if (response.error) { reject(new Error(response.error)); return }
      storeToken(response)
      resolve(response)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

// ─── Silent refresh (no UI, reuses existing consent) ──────────
export function silentRefresh() {
  if (pendingRefresh) return pendingRefresh     // don't stack concurrent refreshes
  pendingRefresh = new Promise((resolve, reject) => {
    if (!tokenClient) {
      pendingRefresh = null
      reject(new Error('NOT_INITIALIZED'))
      return
    }
    tokenClient.callback = (response) => {
      pendingRefresh = null
      if (response.error) { reject(new Error(response.error)); return }
      storeToken(response)
      resolve(response.access_token)
    }
    tokenClient.requestAccessToken({ prompt: '' })  // empty = silent if already consented
  })
  return pendingRefresh
}

// ─── Get current valid token ───────────────────────────────────
export function getToken() {
  const stored = sessionStorage.getItem('gauth_token')
  const expiry = sessionStorage.getItem('gauth_expiry')
  if (stored && expiry && Date.now() < parseInt(expiry) - 60000) {
    accessToken = stored
    return stored
  }
  return null
}

// ─── Revoke token (logout) ────────────────────────────────────
export function revokeToken() {
  const token = getToken()
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
  if (token) {
    window.google?.accounts.oauth2.revoke(token)
  }
  sessionStorage.removeItem('gauth_token')
  sessionStorage.removeItem('gauth_expiry')
  sessionStorage.removeItem('user_info')
  accessToken = null
}

// ─── User info ────────────────────────────────────────────────
export async function getUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  sessionStorage.setItem('user_info', JSON.stringify(data))
  return data
}

export function getStoredUser() {
  const info = sessionStorage.getItem('user_info')
  return info ? JSON.parse(info) : null
}
