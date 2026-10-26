// src/components/EmptyState.jsx
import { SearchX } from 'lucide-react'
import './EmptyState.css'

export default function EmptyState({ title, message, actions, icon: Icon = SearchX }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{title ?? 'Nothing here yet'}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  )
}
