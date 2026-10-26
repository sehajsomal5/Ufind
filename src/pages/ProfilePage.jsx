// src/pages/ProfilePage.jsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Building2, Calendar, Activity, AlertCircle,
  CheckCircle2, CheckCheck, Edit2, LogOut, ArrowRight, Save, X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getMyItems } from '../utils/storage.js'
import './ProfilePage.css'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: user?.name || '', college: user?.college || '' })
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const myItems = useMemo(() => getMyItems(user?.id), [user?.id])

  const stats = useMemo(() => ({
    lost: myItems.filter(i => i.type === 'lost' && i.status === 'lost').length,
    found: myItems.filter(i => i.type === 'found' && i.status === 'found').length,
    active: myItems.filter(i => i.status !== 'recovered').length,
    recovered: myItems.filter(i => i.status === 'recovered').length,
  }), [myItems])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  function startEdit() {
    setEditForm({ name: user?.name || '', college: user?.college || '' })
    setEditErrors({})
    setSaveSuccess(false)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditErrors({})
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = {}
    if (!editForm.name.trim()) errs.name = 'Name cannot be empty.'
    else if (editForm.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.'
    if (Object.keys(errs).length) { setEditErrors(errs); return }

    setSaving(true)
    try {
      await updateProfile({ name: editForm.name, college: editForm.college })
      setSaveSuccess(true)
      setEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setEditErrors({ general: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (!user) return null

  return (
    <main className="page profile-page">
      <div className="container">
        {saveSuccess && (
          <div className="profile-toast" role="status" aria-live="polite">
            <CheckCheck size={16} /> Profile updated successfully.
          </div>
        )}

        {/* Profile Header */}
        <section className="profile-header-section" aria-label="Profile header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" aria-hidden="true">{initials}</div>
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
            {user.college && (
              <p className="profile-college">
                <Building2 size={14} aria-hidden="true" /> {user.college}
              </p>
            )}
          </div>
          {!editing && (
            <button
              className="btn btn-secondary btn-sm profile-edit-btn"
              onClick={startEdit}
              aria-label="Edit profile"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          )}
        </section>

        <div className="profile-body">
          {/* Left column */}
          <div className="profile-left">
            {/* Edit form */}
            {editing ? (
              <section className="profile-card profile-edit-section" aria-label="Edit profile form">
                <h2 className="profile-section-title">Edit Profile</h2>
                <form onSubmit={handleSave} className="profile-edit-form" noValidate>
                  {editErrors.general && (
                    <div className="auth-error-banner" role="alert">
                      <AlertCircle size={15} /> {editErrors.general}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-name">Full name</label>
                    <input
                      id="profile-name"
                      type="text"
                      className={`form-input${editErrors.name ? ' error' : ''}`}
                      value={editForm.name}
                      onChange={e => { setEditForm(p => ({ ...p, name: e.target.value })); setEditErrors(p => ({ ...p, name: '' })) }}
                      maxLength={80}
                    />
                    {editErrors.name && (
                      <span className="form-error" role="alert"><AlertCircle size={13} /> {editErrors.name}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-college">College / University</label>
                    <input
                      id="profile-college"
                      type="text"
                      className="form-input"
                      value={editForm.college}
                      onChange={e => setEditForm(p => ({ ...p, college: e.target.value }))}
                      placeholder="e.g. BITS Pilani"
                      maxLength={100}
                    />
                  </div>
                  <div className="profile-edit-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                      <X size={14} /> Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              /* Profile details card */
              <section className="profile-card" aria-label="Profile details">
                <h2 className="profile-section-title">Account Details</h2>
                <dl className="profile-details-list">
                  <div className="profile-detail-row">
                    <dt><User size={15} aria-hidden="true" /> Full Name</dt>
                    <dd>{user.name}</dd>
                  </div>
                  <div className="profile-detail-row">
                    <dt><Mail size={15} aria-hidden="true" /> Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                  {user.college && (
                    <div className="profile-detail-row">
                      <dt><Building2 size={15} aria-hidden="true" /> College</dt>
                      <dd>{user.college}</dd>
                    </div>
                  )}
                  <div className="profile-detail-row">
                    <dt><Calendar size={15} aria-hidden="true" /> Member Since</dt>
                    <dd>{formatDate(user.createdAt)}</dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Quick actions */}
            <section className="profile-card profile-actions-card" aria-label="Profile actions">
              <h2 className="profile-section-title">Quick Actions</h2>
              <div className="profile-action-list">
                <button
                  className="profile-action-btn"
                  onClick={() => navigate('/activity')}
                >
                  <Activity size={16} aria-hidden="true" />
                  <span>View My Activity</span>
                  <ArrowRight size={14} className="profile-action-arrow" aria-hidden="true" />
                </button>
                <button
                  className="profile-action-btn profile-action-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              </div>
            </section>
          </div>

          {/* Right column — activity summary */}
          <div className="profile-right">
            <section className="profile-card" aria-label="Activity summary">
              <h2 className="profile-section-title">Activity Summary</h2>
              <div className="profile-stats-grid">
                <div className="profile-stat lost-stat">
                  <div className="profile-stat-icon"><AlertCircle size={20} /></div>
                  <div className="profile-stat-num">{stats.lost}</div>
                  <div className="profile-stat-label">Lost Reports</div>
                </div>
                <div className="profile-stat found-stat">
                  <div className="profile-stat-icon"><CheckCircle2 size={20} /></div>
                  <div className="profile-stat-num">{stats.found}</div>
                  <div className="profile-stat-label">Found Reports</div>
                </div>
                <div className="profile-stat active-stat">
                  <div className="profile-stat-icon"><Activity size={20} /></div>
                  <div className="profile-stat-num">{stats.active}</div>
                  <div className="profile-stat-label">Active Reports</div>
                </div>
                <div className="profile-stat recovered-stat">
                  <div className="profile-stat-icon"><CheckCheck size={20} /></div>
                  <div className="profile-stat-num">{stats.recovered}</div>
                  <div className="profile-stat-label">Recovered</div>
                </div>
              </div>

              {myItems.length === 0 && (
                <p className="profile-no-activity">
                  No reports yet. Start by reporting a lost or found item.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
