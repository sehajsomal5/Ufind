// src/pages/SignUpPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthPages.css'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
  })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setGlobalError('')
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required.'
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.'

    if (!form.email.trim()) errs.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = 'Please enter a valid email address.'

    if (!form.password) errs.password = 'Password is required.'
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.'

    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password.'
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.'

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      document.getElementById(`signup-${firstKey}`)?.focus()
      return
    }

    setLoading(true)
    setGlobalError('')

    try {
      const result = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        college: form.college,
      })
      if (result.success) {
        navigate('/', { replace: true })
      } else {
        setGlobalError(result.error)
      }
    } catch {
      setGlobalError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <Link to="/" className="auth-brand">
          <span className="auth-brand-icon"><Search size={16} strokeWidth={2.5} /></span>
          <span className="auth-brand-name">U<span>Find</span></span>
        </Link>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">Join UFind to report and recover lost items on campus.</p>

        {globalError && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {globalError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">
              Full name <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="signup-name"
              type="text"
              className={`form-input${errors.name ? ' error' : ''}`}
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              aria-required="true"
              aria-describedby={errors.name ? 'signup-name-err' : undefined}
              maxLength={80}
            />
            {errors.name && (
              <span className="form-error" id="signup-name-err" role="alert">
                <AlertCircle size={13} /> {errors.name}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Email address <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="signup-email"
              type="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="you@college.edu"
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'signup-email-err' : undefined}
            />
            {errors.email && (
              <span className="form-error" id="signup-email-err" role="alert">
                <AlertCircle size={13} /> {errors.email}
              </span>
            )}
          </div>

          {/* College */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-college">
              College / University <span className="form-hint">(Optional)</span>
            </label>
            <input
              id="signup-college"
              type="text"
              className="form-input"
              value={form.college}
              onChange={e => handleChange('college', e.target.value)}
              placeholder="e.g. BITS Pilani, IIT Delhi"
              autoComplete="organization"
              maxLength={100}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">
              Password <span className="required" aria-hidden="true">*</span>
            </label>
            <div className="password-wrap">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input${errors.password ? ' error' : ''}`}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={errors.password ? 'signup-pw-err' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <span className="form-error" id="signup-pw-err" role="alert">
                <AlertCircle size={13} /> {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirmPassword">
              Confirm password <span className="required" aria-hidden="true">*</span>
            </label>
            <div className="password-wrap">
              <input
                id="signup-confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={`form-input${errors.confirmPassword ? ' error' : ''}`}
                value={form.confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={errors.confirmPassword ? 'signup-confirm-err' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="form-error" id="signup-confirm-err" role="alert">
                <AlertCircle size={13} /> {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  )
}
