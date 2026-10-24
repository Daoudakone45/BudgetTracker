import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Dans n'importe quel composant : const { user, login, logout } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>')
  return context
}
