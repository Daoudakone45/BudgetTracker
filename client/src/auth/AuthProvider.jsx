import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStorage } from '../api.js'
import { AuthContext } from './AuthContext.js'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true pendant qu'on vérifie un token déjà présent au chargement de la page
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()))

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  // Au chargement : si un token existe, on demande au serveur à qui il appartient
  useEffect(() => {
    if (!tokenStorage.get()) return
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  // Si une requête répond 401 plus tard (token expiré), on déconnecte
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } })
    tokenStorage.set(data.token)
    setUser(data.user)
  }, [])

  const register = useCallback(async ({ name, email, password }) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } })
    tokenStorage.set(data.token)
    setUser(data.user)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
