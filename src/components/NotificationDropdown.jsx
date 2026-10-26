// src/components/NotificationDropdown.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Clock, MessageSquare, ExternalLink, X } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext.jsx'
import './NotificationDropdown.css'

function formatTime(iso) {
  if (!iso) return 'Just now'
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recent'
  }
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const dropdownRef = useRef(null)
  const bellRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelectNotification(notif) {
    if (!notif.read) {
      markAsRead(notif._id)
    }
    setOpen(false)
    navigate(notif.link || '/activity?tab=enquiries')
  }

  return (
    <div className="notif-dropdown-wrapper">
      <button
        ref={bellRef}
        type="button"
        className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}${open ? ' active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge-pill" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="notif-panel"
          role="dialog"
          aria-label="Notifications Panel"
        >
          <div className="notif-panel-header">
            <div className="notif-panel-title-row">
              <span className="notif-panel-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="notif-unread-tag">{unreadCount} unread</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={markAllAsRead}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-list" role="list">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <article
                  key={notif._id}
                  className={`notif-item${!notif.read ? ' unread' : ''}`}
                  onClick={() => handleSelectNotification(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectNotification(notif)
                    }
                  }}
                >
                  <div className="notif-item-indicator" aria-hidden="true">
                    {!notif.read && <span className="notif-unread-dot" />}
                    <div className="notif-icon-circle">
                      <MessageSquare size={14} />
                    </div>
                  </div>

                  <div className="notif-item-body">
                    <div className="notif-item-top">
                      <span className="notif-item-title">{notif.title}</span>
                      <span className="notif-item-time">{formatTime(notif.createdAt)}</span>
                    </div>
                    <p className="notif-item-text">{notif.message}</p>
                    {notif.itemTitle && (
                      <span className="notif-item-subject">Item: {notif.itemTitle}</span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="notif-empty-state">
                <Bell size={28} className="notif-empty-icon" />
                <p className="notif-empty-title">No notifications yet</p>
                <p className="notif-empty-sub">
                  When someone sends an inquiry about an item you reported, you will see it here.
                </p>
              </div>
            )}
          </div>

          <div className="notif-panel-footer">
            <button
              type="button"
              className="notif-conversations-btn"
              onClick={() => {
                setOpen(false)
                navigate('/activity?tab=chats')
              }}
            >
              <MessageSquare size={14} /> Open Conversations
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
