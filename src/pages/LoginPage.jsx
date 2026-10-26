// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthPages.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const from = location.state?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setGlobalError('')
  }

  function validate() {
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = 'Please enter a valid email address.'
    if (!form.password) errs.password = 'Password is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setGlobalError('')

    try {
      const result = await login({ email: form.email, password: form.password })
      if (result.success) {
        // Redirect: Admins go to /admin, students go to / (or their intended page)
        if (result.user?.role === 'admin') {
          navigate('/admin', { replace: true })
        } else {
          navigate(from, { replace: true })
        }
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
        <Link to="/" className="auth-brand" aria-label="UFind home">
          <span className="auth-brand-icon"><Search size={16} strokeWidth={2.5} /></span>
          <span className="auth-brand-name">U<span>Find</span></span>
        </Link>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Log in with your university account credentials.</p>

        {globalError && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {globalError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="name@college.edu"
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'login-email-err' : undefined}
            />
            {errors.email && (
              <span className="form-error" id="login-email-err" role="alert">
                <AlertCircle size={13} /> {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input${errors.password ? ' error' : ''}`}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-required="true"
                aria-describedby={errors.password ? 'login-pw-err' : undefined}
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
              <span className="form-error" id="login-pw-err" role="alert">
                <AlertCircle size={13} /> {errors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Sign up for free</Link>
        </p>
      </div>
    </main>
  )
}
