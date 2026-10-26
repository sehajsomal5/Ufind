// src/components/ClaimDialog.jsx
import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '../utils/api.js'
import './ClaimDialog.css'

export default function ClaimDialog({ item, onClose, onSuccess }) {
  const [message, setMessage] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const closeRef = useRef(null)
  const firstFieldRef = useRef(null)

  // Focus trap
  useEffect(() => {
    firstFieldRef.current?.focus()
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function validate() {
    const errs = {}
    if (!message.trim()) errs.message = 'Please enter a message.'
    else if (message.trim().length < 10) errs.message = 'Message is too short. Please add more detail.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await api.createEnquiry({
        itemId: item._id || item.id,
        message: message.trim(),
        contact: identifier.trim(),
      })
      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      if (err.status === 409) {
        setErrors({ message: 'You already have an active request for this item.' })
      } else {
        setErrors({ message: err.message || 'Failed to submit request. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const actionLabel = item.status === 'found' ? 'I Think This Is Mine' : 'Contact the Finder'

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={handleOverlayClick}
    >
      <div className="dialog-box">
        {!submitted ? (
          <>
            <div className="dialog-header">
              <div>
                <h2 className="dialog-title" id="dialog-title">{actionLabel}</h2>
                <p className="dialog-subtitle">For: <strong>{item.title}</strong></p>
              </div>
              <button
                className="dialog-close"
                onClick={onClose}
                aria-label="Close dialog"
                ref={closeRef}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="dialog-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="claim-message">
                    Your message <span className="required" aria-hidden="true">*</span>
                  </label>
                  <p className="form-hint">
                    {item.status === 'found'
                      ? "Describe identifying details that prove this is yours (e.g. what's inside the wallet)."
                      : 'Describe where and when you found this item, or how the owner can reach you.'}
                  </p>
                  <textarea
                    id="claim-message"
                    className={`form-textarea${errors.message ? ' error' : ''}`}
                    value={message}
                    onChange={e => { setMessage(e.target.value); setErrors(prev => ({ ...prev, message: '' })) }}
                    placeholder="e.g. The wallet has a red card in the second slot and a scratch on the front..."
                    rows={4}
                    aria-required="true"
                    aria-describedby={errors.message ? 'claim-message-err' : undefined}
                    ref={firstFieldRef}
                  />
                  {errors.message && (
                    <span className="form-error" id="claim-message-err" role="alert">
                      <AlertCircle size={12} /> {errors.message}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="claim-identifier">
                    Contact or identifier <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <p className="form-hint">Your campus email or roll number so the finder can reach you.</p>
                  <input
                    id="claim-identifier"
                    type="text"
                    className="form-input"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="e.g. student@university.edu or Roll No. 22CS101"
                  />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending…' : actionLabel}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="dialog-success">
            <div className="dialog-success-icon" aria-hidden="true">
              <CheckCircle size={28} />
            </div>
            <h2 className="dialog-success-title">Request sent!</h2>
            <p className="dialog-success-message">
              The item owner has been notified and will review your request.
              You can track the status under <strong>My Activity → Enquiries</strong>.
            </p>
            <button className="btn btn-primary" onClick={onClose} autoFocus>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
