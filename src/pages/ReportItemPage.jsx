// src/pages/ReportItemPage.jsx
import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, CheckCircle2, ImagePlus, X, CheckCircle
} from 'lucide-react'
import { CATEGORIES, LOCATIONS } from '../data/sampleItems.js'
import { addItem, generateId } from '../utils/storage.js'
import './ReportItemPage.css'

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  location: '',
  date: '',
}

function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Please enter the item name.'
  else if (form.title.trim().length < 2) errors.title = 'Name must be at least 2 characters.'
  if (!form.category) errors.category = 'Please select a category.'
  if (!form.description.trim()) errors.description = 'Please add a short description.'
  else if (form.description.trim().length < 10) errors.description = 'Description is too short.'
  if (!form.location) errors.location = 'Please select or enter a location.'
  if (!form.date) errors.date = 'Please enter the date.'
  return errors
}

export default function ReportItemPage() {
  const { mode } = useParams()          // 'lost' or 'found'
  const navigate = useNavigate()
  const [currentMode, setCurrentMode] = useState(mode === 'found' ? 'found' : 'lost')
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [imagePreview, setImagePreview] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [newItemId, setNewItemId] = useState(null)
  const fileInputRef = useRef(null)

  function handleModeChange(m) {
    setCurrentMode(m)
    navigate(`/report/${m}`, { replace: true })
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImagePreview(ev.target.result)
      setImageDataUrl(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImagePreview(null)
    setImageDataUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      // Scroll to first error
      const firstErrKey = Object.keys(errs)[0]
      document.getElementById(`field-${firstErrKey}`)?.focus()
      return
    }

    const item = {
      id: generateId(),
      type: currentMode,
      status: currentMode,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      location: form.location,
      date: form.date,
      reportedBy: 'You (demo)',
      contactHint: 'This is your own report.',
      isSample: false,
      imageUrl: imageDataUrl,
    }
    addItem(item)
    setNewItemId(item.id)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="page report-page">
        <div className="container report-container">
          <div className="report-card report-confirmation">
            <div className="confirmation-icon" aria-hidden="true">
              <CheckCircle size={38} strokeWidth={1.75} />
            </div>
            <h1 className="confirmation-title">Report submitted!</h1>
            <p className="confirmation-message">
              Your report is live in this demo. Let's hope it finds its way home. 🏠
            </p>
            <div className="confirmation-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Back to Home
              </button>
              <button className="btn btn-primary" onClick={() => navigate(`/item/${newItemId}`)}>
                View Your Report
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="page report-page">
      <div className="container report-container">
        <div className="report-header">
          <button
            className="report-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={17} /> Back
          </button>

          {/* Mode toggle */}
          <div className="report-mode-tabs" role="tablist" aria-label="Report mode">
            <button
              className={`report-mode-tab lost${currentMode === 'lost' ? ' active' : ''}`}
              role="tab"
              aria-selected={currentMode === 'lost'}
              onClick={() => handleModeChange('lost')}
            >
              <AlertCircle size={16} /> I Lost Something
            </button>
            <button
              className={`report-mode-tab found${currentMode === 'found' ? ' active' : ''}`}
              role="tab"
              aria-selected={currentMode === 'found'}
              onClick={() => handleModeChange('found')}
            >
              <CheckCircle2 size={16} /> I Found Something
            </button>
          </div>

          <h1 className="report-title">
            {currentMode === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
          </h1>
          <p className="report-subtitle">
            {currentMode === 'lost'
              ? 'Fill in the details below. The more specific, the better.'
              : 'Help reunite this item with its owner. Describe what you found.'}
          </p>
        </div>

        <div className="report-card">
          <form className="report-form" onSubmit={handleSubmit} noValidate aria-label="Item report form">
            {/* Item name */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-title">
                Item name <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="field-title"
                type="text"
                className={`form-input${errors.title ? ' error' : ''}`}
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. Black water bottle"
                aria-required="true"
                aria-describedby={errors.title ? 'err-title' : undefined}
                maxLength={80}
              />
              {errors.title && (
                <span className="form-error" id="err-title" role="alert">
                  <AlertCircle size={12} /> {errors.title}
                </span>
              )}
            </div>

            {/* Category + Date */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="field-category">
                  Category <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-category"
                  className={`form-select${errors.category ? ' error' : ''}`}
                  value={form.category}
                  onChange={e => handleChange('category', e.target.value)}
                  aria-required="true"
                  aria-describedby={errors.category ? 'err-category' : undefined}
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && (
                  <span className="form-error" id="err-category" role="alert">
                    <AlertCircle size={12} /> {errors.category}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="field-date">
                  Date {currentMode === 'lost' ? 'lost' : 'found'} <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="field-date"
                  type="date"
                  className={`form-input${errors.date ? ' error' : ''}`}
                  value={form.date}
                  onChange={e => handleChange('date', e.target.value)}
                  max={today}
                  aria-required="true"
                  aria-describedby={errors.date ? 'err-date' : undefined}
                />
                {errors.date && (
                  <span className="form-error" id="err-date" role="alert">
                    <AlertCircle size={12} /> {errors.date}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-description">
                Description <span className="required" aria-hidden="true">*</span>
              </label>
              <p className="form-hint">Be specific — mention colour, brand, identifying marks, or what's inside.</p>
              <textarea
                id="field-description"
                className={`form-textarea${errors.description ? ' error' : ''}`}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="e.g. Black bottle with a small sticker of a mountain on the side"
                rows={3}
                aria-required="true"
                aria-describedby={errors.description ? 'err-description' : undefined}
                maxLength={400}
              />
              {errors.description && (
                <span className="form-error" id="err-description" role="alert">
                  <AlertCircle size={12} /> {errors.description}
                </span>
              )}
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-location">
                Campus location <span className="required" aria-hidden="true">*</span>
              </label>
              <p className="form-hint">e.g. Library, second floor</p>
              <select
                id="field-location"
                className={`form-select${errors.location ? ' error' : ''}`}
                value={form.location}
                onChange={e => handleChange('location', e.target.value)}
                aria-required="true"
                aria-describedby={errors.location ? 'err-location' : undefined}
              >
                <option value="">Select location…</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.location && (
                <span className="form-error" id="err-location" role="alert">
                  <AlertCircle size={12} /> {errors.location}
                </span>
              )}
            </div>

            {/* Image upload */}
            <div className="form-group">
              <span className="form-label">Photograph <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></span>
              <p className="form-hint">Upload a photo to help identify the item. JPG, PNG, WEBP accepted.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload-input"
                onChange={handleImageChange}
                aria-label="Upload item photograph"
              />

              {!imagePreview ? (
                <label htmlFor="image-upload-input" className="image-upload-area" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}>
                  <ImagePlus size={28} className="image-upload-icon" aria-hidden="true" />
                  <span className="image-upload-label">Click to upload a photo</span>
                  <span className="image-upload-sub">Max 5 MB — stored locally for demo</span>
                </label>
              ) : (
                <div className="image-preview-wrap">
                  <img src={imagePreview} alt="Preview of uploaded item" className="image-preview" />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={removeImage}
                    aria-label="Remove uploaded image"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg">
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
