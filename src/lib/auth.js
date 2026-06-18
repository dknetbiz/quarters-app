import { CONFIG } from './constants'

let tokenClient = null
let accessToken = null

// Load Google Identity Services script
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

// Initialize token client for OAuth
export function initTokenClient(onSuccess, onError) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: (response) => {
      if (response.error) { onError(response.error); return }
      accessToken = response.access_token
      // Store token expiry
      const expiry = Date.now() + (response.expires_in * 1000)
      sessionStorage.setItem('gauth_token', accessToken)
      sessionStorage.setItem('gauth_expiry', expiry)
      onSuccess(response)
    }
  })
}

// Request access token (shows Google popup)
export function requestToken() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Token client not initialized')); return }
    tokenClient.callback = (response) => {
      if (response.error) { reject(response.error); return }
      accessToken = response.access_token
      const expiry = Date.now() + (response.expires_in * 1000)
      sessionStorage.setItem('gauth_token', accessToken)
      sessionStorage.setItem('gauth_expiry', expiry)
      resolve(response)
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

// Get current valid token
export function getToken() {
  const stored = sessionStorage.getItem('gauth_token')
  const expiry = sessionStorage.getItem('gauth_expiry')
  if (stored && expiry && Date.now() < parseInt(expiry) - 60000) {
    accessToken = stored
    return stored
  }
  return null
}

// Revoke token (logout)
export function revokeToken() {
  const token = getToken()
  if (token) {
    window.google?.accounts.oauth2.revoke(token)
    sessionStorage.removeItem('gauth_token')
    sessionStorage.removeItem('gauth_expiry')
    sessionStorage.removeItem('user_info')
    accessToken = null
  }
}

// Get user info from Google
export async function getUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  sessionStorage.setItem('user_info', JSON.stringify(data))
  return data
}

// Get stored user info
export function getStoredUser() {
  const info = sessionStorage.getItem('user_info')
  return info ? JSON.parse(info) : null
}
