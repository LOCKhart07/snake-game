import { api } from '../boot/axios'

const TOKEN_KEY = 'snake-admin-token'

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setStoredToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

function authHeaders(token) {
  return { 'X-Admin-Token': token ?? getStoredToken() }
}

export async function verifyToken(token) {
  try {
    await api.get('/api/analytics/verify', { headers: authHeaders(token) })
    return true
  } catch (e) {
    if (e?.response?.status === 401) return false
    throw e
  }
}

export async function fetchSummary(period) {
  const response = await api.get('/api/analytics/summary', {
    params: { period },
    headers: authHeaders(),
  })
  return response.data
}
