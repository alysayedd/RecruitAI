import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as apiLogin, signup as apiSignup, verifyEmail as apiVerifyEmail, resendCode as apiResendCode, getMe } from '../api/client'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'hr'
  company_name?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  pendingVerificationEmail: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, role: 'student' | 'hr') => Promise<void>
  verifyEmail: (code: string) => Promise<void>
  resendCode: () => Promise<void>
  clearPendingVerification: () => void
  updateUser: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => { localStorage.removeItem('token'); setToken(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const onLogout = () => { setUser(null); setToken(null) }
    window.addEventListener('auth-logout', onLogout)
    return () => window.removeEventListener('auth-logout', onLogout)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
  }

  const signup = async (name: string, email: string, password: string, role: 'student' | 'hr') => {
    await apiSignup(name, email, password, role)
    setPendingVerificationEmail(email)
  }

  const verifyEmail = async (code: string) => {
    if (!pendingVerificationEmail) throw new Error('No pending verification')
    const data = await apiVerifyEmail(pendingVerificationEmail, code)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
    setPendingVerificationEmail(null)
  }

  const resendCode = async () => {
    if (!pendingVerificationEmail) throw new Error('No pending verification')
    await apiResendCode(pendingVerificationEmail)
  }

  const clearPendingVerification = () => {
    setPendingVerificationEmail(null)
  }

  const updateUser = (nextUser: User) => {
    localStorage.setItem('user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setPendingVerificationEmail(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, pendingVerificationEmail, login, signup, verifyEmail, resendCode, clearPendingVerification, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
