// src/pages/AdminDashboardPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield,
  Users,
  FileText,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  XCircle,
  Tag,
  MapPin,
  Calendar,
  Building2,
  Mail,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../utils/api.js'
import EmptyState from '../components/EmptyState.jsx'
import './AdminDashboardPage.css'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const currentTab = searchParams.get('tab') || 'overview'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [usersList, setUsersList] = useState([])
  const [claims, setClaims] = useState([])

  // Filters for reports tab
  const [reportQuery, setReportQuery] = useState('')
  const [reportStatus, setReportStatus] = useState('all')
  const [reportType, setReportType] = useState('all')

  // Feedback toast
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function setTab(tab) {
    setSearchParams({ tab })
  }

  async function loadData() {
    try {
      setRefreshing(true)
      const [statsData, reportsData, usersData, claimsData] = await Promise.all([
        api.admin.getStats(),
        api.admin.getItems(),
        api.admin.getUsers(),
        api.admin.getClaims(),
      ])
      setStats(statsData)
      setReports(reportsData)
      setUsersList(usersData)
      setClaims(claimsData)
    } catch (err) {
      showToast(err.message || 'Failed to load admin data.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Report status update handler
  async function handleUpdateReportStatus(id, newStatus) {
    try {
      await api.admin.updateItemStatus(id, newStatus)
      setReports(prev => prev.map(r => (r._id === id ? { ...r, status: newStatus } : r)))
      showToast(`Item status updated to "${newStatus}".`)
      // refresh stats
      api.admin.getStats().then(setStats)
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error')
    }
  }

  // Report delete handler
  async function handleDeleteReport(id, title) {
    if (!window.confirm(`Are you sure you want to permanently delete the report "${title}"?`)) return
    try {
      await api.admin.deleteItem(id)
      setReports(prev => prev.filter(r => r._id !== id))
      showToast(`Report "${title}" removed.`)
      api.admin.getStats().then(setStats)
    } catch (err) {
      showToast(err.message || 'Failed to delete report.', 'error')
    }
  }

  // User delete handler
  async function handleDeleteUser(id, name) {
    if (id === user?.id) {
      showToast('You cannot delete your own admin account.', 'error')
      return
    }
    if (!window.confirm(`Are you sure you want to remove user "${name}" and all their reports?`)) return
    try {
      await api.admin.deleteUser(id)
      setUsersList(prev => prev.filter(u => u._id !== id))
      setReports(prev => prev.filter(r => r.userId !== id))
      showToast(`User "${name}" deleted.`)
      api.admin.getStats().then(setStats)
    } catch (err) {
      showToast(err.message || 'Failed to delete user.', 'error')
    }
  }

  // Claim status update handler
  async function handleUpdateClaimStatus(id, newStatus) {
    try {
      await api.admin.updateClaimStatus(id, newStatus)
      setClaims(prev => prev.map(c => (c._id === id ? { ...c, status: newStatus } : c)))
      showToast(`Claim marked as "${newStatus}".`)
      if (newStatus === 'approved') {
        loadData()
      }
    } catch (err) {
      showToast(err.message || 'Failed to update claim status.', 'error')
    }
  }

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      const matchStatus = reportStatus === 'all' || item.status === reportStatus
      const matchType = reportType === 'all' || item.type === reportType
      const q = reportQuery.toLowerCase().trim()
      const matchQ =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.reportedBy?.toLowerCase().includes(q)
      return matchStatus && matchType && matchQ
    })
  }, [reports, reportStatus, reportType, reportQuery])

  if (loading) {
    return (
      <main className="page admin-page">
        <div className="container">
          <div className="admin-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <span>Loading UFind Admin Console…</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page admin-page">
      <div className="container">
        {/* Toast */}
        {toast && (
          <div className={`admin-toast toast-${toast.type}`} role="status" aria-live="polite">
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCheck size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Dashboard Header */}
        <header className="admin-header">
          <div className="admin-header-title-wrap">
            <div className="admin-eyebrow">
              <Shield size={14} /> UFind Central Administration
            </div>
            <h1 className="admin-title">Platform Dashboard</h1>
            <p className="admin-subtitle">
              Manage student accounts, verify item reports, review claims, and monitor campus lost &amp; found activities.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={refreshing}
              title="Refresh data"
            >
              <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* System Metric Cards */}
        <section className="admin-metrics-grid" aria-label="System Metrics">
          <div className="admin-metric-card" onClick={() => setTab('users')} role="button" tabIndex={0}>
            <div className="admin-metric-icon users-icon"><Users size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.totalUsers ?? usersList.length}</span>
              <span className="admin-metric-label">Registered Users</span>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setTab('reports')} role="button" tabIndex={0}>
            <div className="admin-metric-icon reports-icon"><FileText size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.totalReports ?? reports.length}</span>
              <span className="admin-metric-label">Total Reports</span>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setTab('reports')} role="button" tabIndex={0}>
            <div className="admin-metric-icon lost-icon"><AlertCircle size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.lostReports ?? 0}</span>
              <span className="admin-metric-label">Lost Reports</span>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setTab('reports')} role="button" tabIndex={0}>
            <div className="admin-metric-icon found-icon"><CheckCircle2 size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.foundReports ?? 0}</span>
              <span className="admin-metric-label">Found Reports</span>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setTab('reports')} role="button" tabIndex={0}>
            <div className="admin-metric-icon recovered-icon"><CheckCheck size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.recoveredReports ?? 0}</span>
              <span className="admin-metric-label">Recovered</span>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setTab('claims')} role="button" tabIndex={0}>
            <div className="admin-metric-icon claims-icon"><MessageSquare size={22} /></div>
            <div className="admin-metric-content">
              <span className="admin-metric-num">{stats?.totalClaims ?? claims.length}</span>
              <span className="admin-metric-label">Inquiries &amp; Claims</span>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="admin-tabs" role="tablist" aria-label="Admin Sections">
          <button
            className={`admin-tab${currentTab === 'overview' ? ' active' : ''}`}
            role="tab"
            aria-selected={currentTab === 'overview'}
            onClick={() => setTab('overview')}
          >
            <Activity size={16} /> Overview
          </button>
          <button
            className={`admin-tab${currentTab === 'reports' ? ' active' : ''}`}
            role="tab"
            aria-selected={currentTab === 'reports'}
            onClick={() => setTab('reports')}
          >
            <FileText size={16} /> Item Reports ({reports.length})
          </button>
          <button
            className={`admin-tab${currentTab === 'users' ? ' active' : ''}`}
            role="tab"
            aria-selected={currentTab === 'users'}
            onClick={() => setTab('users')}
          >
            <Users size={16} /> Users ({usersList.length})
          </button>
          <button
            className={`admin-tab${currentTab === 'claims' ? ' active' : ''}`}
            role="tab"
            aria-selected={currentTab === 'claims'}
            onClick={() => setTab('claims')}
          >
            <MessageSquare size={16} /> Claims &amp; Inquiries ({claims.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {currentTab === 'overview' && (
          <div className="admin-tab-content">
            <div className="admin-overview-grid">
              {/* Recent reports card */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Recent Activity Feed</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('reports')}>
                    View All
                  </button>
                </div>

                {reports.length > 0 ? (
                  <div className="admin-recent-list">
                    {reports.slice(0, 5).map(item => (
                      <div key={item._id} className="admin-recent-item">
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                        <div className="admin-recent-info">
                          <span className="admin-recent-title">{item.title}</span>
                          <span className="admin-recent-sub">
                            By {item.reportedBy} • {item.location} • {item.date}
                          </span>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/item/${item._id}`)}
                          title="View public post"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-empty-text">No reports submitted yet.</p>
                )}
              </div>

              {/* Admin status card */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Admin Account &amp; System</h2>
                </div>
                <div className="admin-system-info">
                  <div className="admin-info-row">
                    <span className="admin-info-label">Current Admin</span>
                    <span className="admin-info-value">{user?.name} ({user?.email})</span>
                  </div>
                  <div className="admin-info-row">
                    <span className="admin-info-label">Role</span>
                    <span className="admin-badge-admin">Administrator</span>
                  </div>
                  <div className="admin-info-row">
                    <span className="admin-info-label">Database</span>
                    <span className="admin-info-value">MongoDB (Mongoose v8+)</span>
                  </div>
                  <div className="admin-info-row">
                    <span className="admin-info-label">Backend API</span>
                    <span className="admin-info-value">Node.js + Express (JWT Auth)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Reports Management */}
        {currentTab === 'reports' && (
          <div className="admin-tab-content">
            <div className="admin-card">
              {/* Controls */}
              <div className="admin-table-controls">
                <div className="admin-search-wrap">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search reports by title, reporter, location…"
                    value={reportQuery}
                    onChange={e => setReportQuery(e.target.value)}
                  />
                </div>

                <div className="admin-filter-group">
                  <select
                    className="form-select admin-select"
                    value={reportStatus}
                    onChange={e => setReportStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="lost">Lost</option>
                    <option value="found">Found</option>
                    <option value="recovered">Recovered</option>
                  </select>

                  <select
                    className="form-select admin-select"
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="lost">Type: Lost</option>
                    <option value="found">Type: Found</option>
                  </select>
                </div>
              </div>

              {/* Reports Table */}
              {filteredReports.length > 0 ? (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item Details</th>
                        <th>Type / Status</th>
                        <th>Category &amp; Location</th>
                        <th>Reported By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map(item => (
                        <tr key={item._id}>
                          <td>
                            <div className="admin-item-title-cell">
                              <span className="admin-table-title">{item.title}</span>
                              <span className="admin-table-desc">{item.description?.slice(0, 70)}…</span>
                              {item.isSample && <span className="sample-chip">Sample Demo</span>}
                            </div>
                          </td>
                          <td>
                            <div className="admin-status-cell">
                              <span className={`badge badge-${item.status}`}>{item.status}</span>
                              <span className="admin-type-label">({item.type})</span>
                            </div>
                          </td>
                          <td>
                            <div className="admin-meta-cell">
                              <span><Tag size={12} /> {item.category}</span>
                              <span><MapPin size={12} /> {item.location}</span>
                              <span><Calendar size={12} /> {item.date}</span>
                            </div>
                          </td>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-reporter-name">{item.reportedBy || 'Student'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="admin-action-btns">
                              {item.status !== 'recovered' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleUpdateReportStatus(item._id, 'recovered')}
                                  title="Mark as Recovered"
                                >
                                  <CheckCheck size={13} /> Mark Recovered
                                </button>
                              )}
                              {item.status === 'recovered' && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleUpdateReportStatus(item._id, item.type)}
                                  title="Reopen Report"
                                >
                                  Reopen
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate(`/item/${item._id}`)}
                                title="View public post"
                              >
                                View
                              </button>
                              <button
                                className="admin-delete-btn"
                                onClick={() => handleDeleteReport(item._id, item.title)}
                                title="Delete report"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No reports match your filters"
                  message="Try clearing your search query or changing the status filter."
                  actions={
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setReportQuery('')
                        setReportStatus('all')
                        setReportType('all')
                      }}
                    >
                      Clear Filters
                    </button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Users Management */}
        {currentTab === 'users' && (
          <div className="admin-tab-content">
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Registered Campus Accounts</h2>
                  <p className="admin-card-sub">
                    View registered students and administrators. User accounts are created via public Sign Up or admin provisioning.
                  </p>
                </div>
              </div>

              {usersList.length > 0 ? (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>Email</th>
                        <th>College / Dept</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div className="admin-user-name-cell">
                              <span className="admin-table-title">{u.name}</span>
                              {u._id === user?.id && <span className="sample-chip">You</span>}
                            </div>
                          </td>
                          <td>
                            <div className="admin-email-cell">
                              <Mail size={13} /> {u.email}
                            </div>
                          </td>
                          <td>
                            {u.college ? (
                              <span className="admin-college-badge">
                                <Building2 size={12} /> {u.college}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className={u.role === 'admin' ? 'admin-badge-admin' : 'admin-badge-student'}>
                              {u.role === 'admin' ? 'Administrator' : 'Student'}
                            </span>
                          </td>
                          <td>
                            <span className="admin-table-date">
                              {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </td>
                          <td>
                            {u._id !== user?.id && (
                              <button
                                className="admin-delete-btn"
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                title="Delete user"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty-text">No registered accounts found.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Claims Management */}
        {currentTab === 'claims' && (
          <div className="admin-tab-content">
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Ownership Claims &amp; Verification Inquiries</h2>
                  <p className="admin-card-sub">
                    Review and verify student inquiries submitted for found items.
                  </p>
                </div>
              </div>

              {claims.length > 0 ? (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item Reference</th>
                        <th>Claimant</th>
                        <th>Verification Details</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map(claim => (
                        <tr key={claim._id}>
                          <td>
                            <div className="admin-table-title">
                              {claim.itemTitle || `Item #${claim.itemId}`}
                            </div>
                            <button
                              className="admin-link-btn"
                              onClick={() => navigate(`/item/${claim.itemId}`)}
                            >
                              Inspect Item <ExternalLink size={12} />
                            </button>
                          </td>
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-table-title">{claim.claimantName}</span>
                              <span className="admin-table-desc">{claim.claimantContact}</span>
                            </div>
                          </td>
                          <td>
                            <p className="admin-claim-msg">{claim.message}</p>
                          </td>
                          <td>
                            <span className={`badge badge-${claim.status === 'approved' ? 'recovered' : claim.status === 'rejected' ? 'lost' : 'found'}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td>
                            <div className="admin-action-btns">
                              {claim.status !== 'approved' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleUpdateClaimStatus(claim._id, 'approved')}
                                >
                                  Approve
                                </button>
                              )}
                              {claim.status !== 'rejected' && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleUpdateClaimStatus(claim._id, 'rejected')}
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No claims submitted yet"
                  message="When students submit claims on found items, they will appear here for verification."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
