const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const TOKEN_KEY = 'budgettracker_token'

// Le token est gardé dans le localStorage pour survivre au rechargement de la page.
// try/catch : le localStorage peut être bloqué (navigation privée, réglages du navigateur).
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Tant pis : l'utilisateur restera connecté jusqu'au rechargement
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Rien à faire
    }
  },
}

// Fonction appelée quand le serveur répond 401 (token expiré) : le AuthProvider y branche la déconnexion
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// Appelle l'API et renvoie le JSON de la réponse, ou lève une erreur avec le message du serveur.
// Exemple : const { user } = await api('/auth/login', { method: 'POST', body: { email, password } })
export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStorage.get()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Impossible de joindre le serveur. Est-il démarré ?')
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized()
    const error = new Error(data.error || `Erreur ${response.status}`)
    error.status = response.status
    throw error
  }
  return data
}
