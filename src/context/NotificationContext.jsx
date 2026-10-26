// src/context/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { api, getToken } from '../utils/api.js'
import { useAuth } from './AuthContext.jsx'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [liveToast, setLiveToast] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      setLoading(true)
      const [list, countRes] = await Promise.all([
        api.getNotifications().catch(() => []),
        api.getUnreadNotificationCount().catch(() => ({ count: 0 })),
      ])
      setNotifications(list)
      setUnreadCount(countRes?.count ?? list.filter(n => !n.read).length)
    } catch (err) {
      console.warn('Error fetching notifications:', err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time Socket.IO Connection
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const token = getToken()
    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected as user:', user.id || user._id)
      socket.emit('join_user_room', user.id || user._id)
    })

    socket.on('notification', newNotif => {
      console.log('[Socket.IO] Received live notification:', newNotif)
      setNotifications(prev => [newNotif, ...prev])
      setUnreadCount(prev => prev + 1)
      setLiveToast(newNotif)
      setTimeout(() => setLiveToast(null), 5000)
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user])

  const markAsRead = useCallback(async id => {
    try {
      await api.markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.warn('Failed to mark notification read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err)
    }
  }, [])

  const value = {
    notifications,
    unreadCount,
    loading,
    liveToast,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {liveToast && (
        <aside
          className="live-notification-toast"
          role="status"
          aria-live="polite"
          onClick={() => setLiveToast(null)}
        >
          <div className="live-toast-header">
            <span className="live-toast-badge">New Alert</span>
            <span className="live-toast-title">{liveToast.title}</span>
          </div>
          <p className="live-toast-body">{liveToast.message}</p>
        </aside>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
