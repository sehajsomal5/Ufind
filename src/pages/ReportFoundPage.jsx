// src/pages/ReportFoundPage.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  ImagePlus,
  X,
  CheckCircle,
  MapPin,
  Calendar,
  ShieldCheck,
} from 'lucide-react'
import { CATEGORIES, LOCATIONS } from '../data/sampleItems.js'
import { addItem, generateId } from '../utils/storage.js'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import FoundItemIllustration from '../components/illustrations/FoundItemIllustration.jsx'
import './ReportItemPage.css'

const HOLDING_OPTIONS = [
  'Currently with me (will arrange handover)',
  'Handed to Security at Main Gate',
  'Handed to Library Front Reception',
  'Handed to Classroom / Department Office',
  'Handed to Cafeteria Staff',
  'Handed to Hostel Warden Desk',
  'Other campus office',
]

const INITIAL_FORM = {
  title: '',
  category: '',
  description: '',
  location: '',
  specificSpot: '',
  date: new Date().toISOString().split('T')[0],
  holdingLocation: HOLDING_OPTIONS[0],
  verificationQuestion: '',
  contactInfo: '',
}

function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Please enter what you found.'
  else if (form.title.trim().length < 2) errors.title = 'Name must be at least 2 characters.'
  if (!form.category) errors.category = 'Please select a category.'
  if (!form.location) errors.location = 'Please select where you found it.'
  if (!form.date) errors.date = 'Please enter when you found it.'
  if (!form.description.trim()) errors.description = 'Please provide a brief description.'
  else if (form.description.trim().length < 8) errors.description = 'Description is too short.'
  return errors
}

export default function ReportFoundPage() {
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
      type: 'found',
      category: form.category,
      description: form.description.trim(),
      location: fullLocation,
      date: form.date,
      holdingLocation: form.holdingLocation,
      verificationQuestion: form.verificationQuestion.trim(),
      contactHint: form.verificationQuestion.trim()
        ? `Claim verification: ${form.verificationQuestion.trim()}`
        : form.contactInfo.trim() || 'Handed over / safe on campus.',
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
        status: 'found',
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
            <div className="confirmation-icon found-confirm-icon" aria-hidden="true">
              <CheckCircle size={42} strokeWidth={2} />
            </div>
            <h1 className="confirmation-title">Found Item Reported!</h1>
            <p className="confirmation-message">
              Thank you for being a responsible member of our campus community! Your report for{' '}
              <strong>"{form.title}"</strong> is now visible to students looking for their lost property.
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

          {/* Banner Card for Found Item */}
          <div className="report-banner-card found-banner">
            <div className="report-banner-illustration" aria-hidden="true">
              <FoundItemIllustration style={{ width: 95, height: 85 }} />
            </div>
            <div className="report-banner-text">
              <span className="report-banner-badge found-badge">Found Item Report</span>
              <h1 className="report-title">Report a Found Item</h1>
              <p className="report-subtitle">
                Found someone's property on campus? Post the details here so the owner can verify and claim it.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="report-card">
          <form className="report-form" onSubmit={handleSubmit} noValidate aria-label="Report found item form">
            {/* Item Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-title">
                What did you find? <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="field-title"
                type="text"
                className={`form-input${errors.title ? ' error' : ''}`}
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. Spiral Notebook, Car Key, Laptop Charger"
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
                  When did you find it? <span className="required" aria-hidden="true">*</span>
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
                  Where on campus did you find it? <span className="required" aria-hidden="true">*</span>
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
                  Exact Spot <span className="form-hint">(Optional)</span>
                </label>
                <input
                  id="field-specificSpot"
                  type="text"
                  className="form-input"
                  value={form.specificSpot}
                  onChange={e => handleChange('specificSpot', e.target.value)}
                  placeholder="e.g. Under bench near entrance, Lab Desk 4"
                  maxLength={60}
                />
              </div>
            </div>

            {/* Current Item Location / Holding */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-holding">
                Where is the item right now? <span className="required" aria-hidden="true">*</span>
              </label>
              <select
                id="field-holding"
                className="form-select"
                value={form.holdingLocation}
                onChange={e => handleChange('holdingLocation', e.target.value)}
              >
                {HOLDING_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="form-hint">
                Letting the owner know if it was handed to security or reception speeds up recovery.
              </span>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-description">
                Description of the found item <span className="required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="field-description"
                className={`form-textarea${errors.description ? ' error' : ''}`}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe color, general condition, brand, and type. (Tip: Keep one private identifying feature secret for verification!)"
                rows={4}
                aria-required="true"
              />
              {errors.description && (
                <span className="form-error" role="alert">
                  <AlertCircle size={13} /> {errors.description}
                </span>
              )}
            </div>

            {/* Verification Question for Owner */}
            <div className="form-group">
              <label className="form-label" htmlFor="field-verification">
                Question to verify the owner <span className="form-hint">(Recommended for security)</span>
              </label>
              <input
                id="field-verification"
                type="text"
                className="form-input"
                value={form.verificationQuestion}
                onChange={e => handleChange('verificationQuestion', e.target.value)}
                placeholder="e.g. What color is the keychain strap? / Name on the ID card? / What is inside the pencil case?"
                maxLength={100}
              />
              <span className="form-hint">
                The claimant will be prompted to answer this before claiming the item.
              </span>
            </div>

            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">
                Upload Photo <span className="form-hint">(Optional — helps owner recognise it)</span>
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
                  <span className="image-upload-text">Click to browse or drag photo of the item</span>
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

            {/* Submit Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg">
                Post Found Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
