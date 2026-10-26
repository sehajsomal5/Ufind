// src/components/Toast.jsx
import { useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import './Toast.css'

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
}

let _addToast = null

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, ...toast }])
    const duration = toast.duration ?? 4000
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type ?? 'info'}`}
          role="alert"
        >
          <span className="toast-icon" aria-hidden="true">
            {ICONS[t.type] ?? ICONS.info}
          </span>
          <div className="toast-body">
            {t.title && <div className="toast-title">{t.title}</div>}
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => removeToast(t.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
