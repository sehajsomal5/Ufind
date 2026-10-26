// src/pages/ReportLostPage.jsx
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  ImagePlus,
  X,
  CheckCircle,
  HelpCircle,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { CATEGORIES, LOCATIONS } from '../data/sampleItems.js'
import { addItem, generateId } from '../utils/storage.js'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import LostItemIllustration from '../components/illustrations/LostItemIllustration.jsx'
import './ReportItemPage.css'

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  location: '',
  specificSpot: '',
  date: new Date().toISOString().split('T')[0],
  contactInfo: '',
  reward: '',
}

function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Please enter the item name.'
  else if (form.title.trim().length < 2) errors.title = 'Name must be at least 2 characters.'
  if (!form.category) errors.category = 'Please select a category.'
  if (!form.location) errors.location = 'Please select the last known location.'
  if (!form.date) errors.date = 'Please enter when you lost the item.'
  if (!form.description.trim()) errors.description = 'Please provide identifying details.'
  else if (form.description.trim().length < 10) errors.description = 'Description is too short (min 10 characters).'
  return errors
}

export default function ReportLostPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [imagePreview, setImagePreview] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [newItemId, setNewItemId] = useState(null)
  const fileInputRef = useRef(null)

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

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstErrKey = Object.keys(errs)[0]
      document.getElementById(`field-${firstErrKey}`)?.focus()
      return
    }

    const fullLocation = form.specificSpot
      ? `${form.location} (${form.specificSpot})`
      : form.location

    const itemPayload = {
      title: form.title.trim(),
      type: 'lost',
      category: form.category,
      description: form.description.trim(),
      location: fullLocation,
      date: form.date,
      reward: form.reward.trim(),
      contactHint: form.contactInfo.trim() || 'Contact via campus portal / My Activity.',
      imageUrl: imageDataUrl,
    }

    try {
      const created = await api.createItem(itemPayload)
      const normalized = { ...created, id: created._id || created.id }
      addItem(normalized)
      setNewItemId(normalized.id)
    } catch (err) {
      console.warn('API error creating item, using local fallback:', err)
      const fallbackItem = {
        ...itemPayload,
        id: generateId(),
        status: 'lost',
        userId: user?.id,
        reportedBy: user?.name || 'Anonymous Student',
        isSample: false,
      }
      addItem(fallbackItem)
      setNewItemId(fallbackItem.id)
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="page report-page">
        <div className="container report-container">
          <div className="report-card report-confirmation">
            <div className="confirmation-icon lost-confirm-icon" aria-hidden="true">
              <CheckCircle size={42} strokeWidth={2} />
            </div>
            <h1 className="confirmation-title">Lost Item Report Published!</h1>
            <p className="confirmation-message">
              Your lost item report for <strong>"{form.title}"</strong> is now live on the campus dashboard.
              We hope it is safely found and returned to you soon!
            </p>
            <div className="confirmation-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Back to Dashboard
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/activity')}>
                View My Activity
              </button>
              <button className="btn btn-primary" onClick={() => navigate(`/item/${newItemId}`)}>
                View Item Post
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page report-page">
      <div className="container report-container">
        {/* Navigation & Header */}
        <div className="report-header">
          <button
            type="button"
            className="report-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} /> Back
          </button>

          {/* Banner Card for Lost Item */}
          <div className="report-banner-card lost-banner">
            <div className="report-banner-illustration" aria-hidden="true">
              <LostItemIllustration style={{ width: 85, height: 85 }} />
            </div>
            <div className="report-banner-text">
              <span className="report-banner-badge lost-badge">Lost Item Report</span>
              <h1 className="report-title">Report a Lost Item</h1>
              <p className="report-subtitle">
                Misplaced something on campus? Fill out the details below so students and staff can help find and return it.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="report-card">
          <form className="report-form" onSubmit={handleSubmit} noValidate aria-label="Report lost item form">
            {/* Item Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-title">
                What did you lose? <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="field-title"
                type="text"
                className={`form-input${errors.title ? ' error' : ''}`}
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. Blue Hydro Flask Bottle, Student ID Card, Casio Calculator"
                aria-required="true"
                maxLength={80}
              />
              {errors.title && (
                <span className="form-error" role="alert">
                  <AlertCircle size={13} /> {errors.title}
                </span>
              )}
            </div>

            {/* Category & Date */}
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
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && (
                  <span className="form-error" role="alert">
                    <AlertCircle size={13} /> {errors.category}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="field-date">
                  When did you lose it? <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="field-date"
                  type="date"
                  className={`form-input${errors.date ? ' error' : ''}`}
                  value={form.date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => handleChange('date', e.target.value)}
                  aria-required="true"
                />
                {errors.date && (
                  <span className="form-error" role="alert">
                    <AlertCircle size={13} /> {errors.date}
                  </span>
                )}
              </div>
            </div>

            {/* Location & Specific Spot */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="field-location">
                  Where was it last seen? <span className="required" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-location"
                  className={`form-select${errors.location ? ' error' : ''}`}
                  value={form.location}
                  onChange={e => handleChange('location', e.target.value)}
                  aria-required="true"
                >
                  <option value="">Select campus area…</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {errors.location && (
                  <span className="form-error" role="alert">
                    <AlertCircle size={13} /> {errors.location}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="field-specificSpot">
                  Specific Spot <span className="form-hint">(Optional)</span>
                </label>
                <input
                  id="field-specificSpot"
                  type="text"
                  className="form-input"
                  value={form.specificSpot}
                  onChange={e => handleChange('specificSpot', e.target.value)}
                  placeholder="e.g. Table near window, 2nd floor"
                  maxLength={60}
                />
              </div>
            </div>

            {/* Description & Identifying features */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-description">
                Identifying details <span className="required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="field-description"
                className={`form-textarea${errors.description ? ' error' : ''}`}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe color, brand, stickers, scratches, case, or any specific details that distinguish it from similar items."
                rows={4}
                aria-required="true"
              />
              <span className="form-hint">
                Provide as many specific details as possible so finders can verify it is yours.
              </span>
              {errors.description && (
                <span className="form-error" role="alert">
                  <AlertCircle size={13} /> {errors.description}
                </span>
              )}
            </div>

            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">
                Upload Photo <span className="form-hint">(Optional — helps identification)</span>
              </label>
              {imagePreview ? (
                <div className="image-preview-wrap">
                  <img src={imagePreview} alt="Preview" className="image-preview-thumb" />
                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={removeImage}
                    aria-label="Remove photo"
                  >
                    <X size={16} /> Remove
                  </button>
                </div>
              ) : (
                <label className="image-upload-zone" htmlFor="photo-file-input">
                  <ImagePlus size={26} className="image-upload-icon" />
                  <span className="image-upload-text">Click to browse or drag photo here</span>
                  <span className="image-upload-sub">PNG, JPG, or WEBP up to 5MB</span>
                  <input
                    id="photo-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Contact Info & Reward */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="field-contact">
                  Contact Hint / Preferred Reach <span className="form-hint">(Optional)</span>
                </label>
                <input
                  id="field-contact"
                  type="text"
                  className="form-input"
                  value={form.contactInfo}
                  onChange={e => handleChange('contactInfo', e.target.value)}
                  placeholder="e.g. Phone: 98765-XXXXX / Hostel Room 302"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="field-reward">
                  Reward / Token of Thanks <span className="form-hint">(Optional)</span>
                </label>
                <input
                  id="field-reward"
                  type="text"
                  className="form-input"
                  value={form.reward}
                  onChange={e => handleChange('reward', e.target.value)}
                  placeholder="e.g. Coffee treat or small cash reward"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-danger btn-lg">
                Post Lost Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
