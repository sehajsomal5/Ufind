// src/context/AuthContext.jsx
// Production-grade Auth Context connected to Node + Express + MongoDB backend

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken, getCachedUser, setCachedUser, clearAuth } from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedUser())
  const [authLoading, setAuthLoading] = useState(true)

  // Verify and refresh session on mount
  useEffect(() => {
    async function initAuth() {
      const token = getToken()
      if (!token) {
        setUser(null)
        setAuthLoading(false)
        return
      }

      try {
        const { user: fetchedUser } = await api.getMe()
        setUser(fetchedUser)
        setCachedUser(fetchedUser)
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message)
        clearAuth()
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()
  }, [])

  // Sign Up (Always creates student account enforced on backend)
  const signUp = useCallback(async ({ name, email, password, college }) => {
    try {
      const res = await api.signup({ name, email, password, college })
      setToken(res.token)
      setUser(res.user)
      setCachedUser(res.user)
      return { success: true, user: res.user }
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed.' }
    }
  }, [])

  // Login (Redirects students to '/' and admins to '/admin')
  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await api.login({ email, password })
      setToken(res.token)
      setUser(res.user)
      setCachedUser(res.user)
      return { success: true, user: res.user }
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' }
    }
  }, [])

  // Logout
  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  // Update profile
  const updateProfile = useCallback(async profileData => {
    try {
      const res = await api.updateProfile(profileData)
      setUser(res.user)
      setCachedUser(res.user)
      return { success: true, user: res.user }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update profile.' }
    }
  }, [])

  const value = {
    user,
    authLoading,
    signUp,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
