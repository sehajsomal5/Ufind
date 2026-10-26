// src/pages/MyActivityPage.jsx
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Search,
  Plus,
  ArrowRight,
  Trash2,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  ExternalLink,
  Inbox,
  Send as SendIcon,
  User as UserIcon,
  Shield,
  MessageCircle,
} from 'lucide-react'
import { getMyItems, updateItem, deleteItem } from '../utils/storage.js'
import { getCategoryMeta } from '../utils/categoryIcons.js'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import EmptyState from '../components/EmptyState.jsx'
import './MyActivityPage.css'

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Active Chat',
  rejected: 'Declined',
  handed_over: 'Handover in Progress',
  completed: 'Completed / Recovered',
}

const STATUS_COLORS = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  handed_over: 'teal',
  completed: 'blue',
}

function formatEnquiryDate(iso) {
  if (!iso) return 'Recent'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return 'Recent'
  }
}

export default function MyActivityPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  // Read initial tab from URL query param, default to 'all'
  const tabFromUrl = searchParams.get('tab')
  const initialTab =
    tabFromUrl === 'enquiries'
      ? 'enquiries'
      : tabFromUrl === 'chats' || tabFromUrl === 'conversations'
      ? 'chats'
      : tabFromUrl === 'lost'
      ? 'lost'
      : tabFromUrl === 'found'
      ? 'found'
      : tabFromUrl === 'recovered'
      ? 'recovered'
      : 'all'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [toastMessage, setToastMessage] = useState(null)

  const [items, setItems] = useState(() => getMyItems(user?.id))
  const [incomingEnquiries, setIncomingEnquiries] = useState([])
  const [outgoingEnquiries, setOutgoingEnquiries] = useState([])
  const [enquiriesLoading, setEnquiriesLoading] = useState(false)

  // Sync tab to URL
  function handleSetTab(tab) {
    setActiveTab(tab)
    if (tab === 'all') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab }, { replace: true })
    }
  }

  useEffect(() => {
    let mounted = true
    api.getMyItems().catch(() => getMyItems(user?.id)).then(fetchedItems => {
      if (!mounted) return
      const normalizedItems = (fetchedItems || []).map(i => ({ ...i, id: i._id || i.id }))
      setItems(normalizedItems)
    })
    return () => { mounted = false }
  }, [refreshKey, user?.id])

  // Fetch enquiries
  useEffect(() => {
    let mounted = true
    setEnquiriesLoading(true)
    Promise.all([
      api.getIncomingEnquiries().catch(() => []),
      api.getOutgoingEnquiries().catch(() => []),
    ]).then(([incoming, outgoing]) => {
      if (!mounted) return
      setIncomingEnquiries(incoming || [])
      setOutgoingEnquiries(outgoing || [])
    }).finally(() => {
      if (mounted) setEnquiriesLoading(false)
    })
    return () => { mounted = false }
  }, [refreshKey])

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleMarkRecovered(id, e) {
    e.stopPropagation()
    try {
      await api.updateItem(id, { status: 'recovered' })
    } catch {}
    updateItem(id, { status: 'recovered' })
    setRefreshKey(k => k + 1)
    showToast('Item marked as successfully recovered! 🎉')
  }

  async function handleDelete(id, title, e) {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to remove the report for "${title}"?`)) {
      try {
        await api.deleteItem(id)
      } catch {}
      deleteItem(id)
      setRefreshKey(k => k + 1)
      showToast('Report removed.')
    }
  }

  const myItems = items

  // Deduplicated conversations list (accepted, handed_over, completed)
  const conversations = useMemo(() => {
    const all = [...incomingEnquiries, ...outgoingEnquiries]
    const filtered = all.filter(e =>
      ['accepted', 'handed_over', 'completed'].includes(e.status)
    )
    const seen = new Set()
    const unique = []
    for (const c of filtered) {
      const cid = String(c._id || c.id)
      if (!seen.has(cid)) {
        seen.add(cid)
        unique.push(c)
      }
    }
    return unique.sort((a, b) => {
      const timeA = a.replies?.length
        ? new Date(a.replies[a.replies.length - 1].createdAt || a.updatedAt || a.createdAt).getTime()
        : new Date(a.updatedAt || a.createdAt).getTime()
      const timeB = b.replies?.length
        ? new Date(b.replies[b.replies.length - 1].createdAt || b.updatedAt || b.createdAt).getTime()
        : new Date(b.updatedAt || b.createdAt).getTime()
      return timeB - timeA
    })
  }, [incomingEnquiries, outgoingEnquiries])

  // Filtered conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c => {
      const titleMatch = (c.itemTitle || '').toLowerCase().includes(q)
      const senderName = typeof c.senderId === 'object' ? c.senderId?.name : c.senderName
      const ownerName = typeof c.itemOwnerId === 'object' ? c.itemOwnerId?.name : ''
      return titleMatch || (senderName || '').toLowerCase().includes(q) || (ownerName || '').toLowerCase().includes(q)
    })
  }, [conversations, searchQuery])

  // Metrics
  const stats = useMemo(() => {
    const lostCount = myItems.filter(i => i.type === 'lost' && i.status === 'lost').length
    const foundCount = myItems.filter(i => i.type === 'found' && i.status === 'found').length
    const recoveredCount = myItems.filter(i => i.status === 'recovered').length
    const enquiriesCount = incomingEnquiries.length + outgoingEnquiries.length
    const conversationsCount = conversations.length
    return { lostCount, foundCount, recoveredCount, enquiriesCount, conversationsCount, total: myItems.length }
  }, [myItems, incomingEnquiries, outgoingEnquiries, conversations])

  // Filtered Items
  const filteredItems = useMemo(() => {
    let list = myItems
    if (activeTab === 'lost') {
      list = list.filter(i => i.type === 'lost' && i.status !== 'recovered')
    } else if (activeTab === 'found') {
      list = list.filter(i => i.type === 'found' && i.status !== 'recovered')
    } else if (activeTab === 'recovered') {
      list = list.filter(i => i.status === 'recovered')
    }

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    )
  }, [myItems, activeTab, searchQuery])

  return (
    <main className="page activity-page">
      <div className="container">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="activity-toast" role="status" aria-live="polite">
            <CheckCheck size={18} /> {toastMessage}
          </div>
        )}

        {/* Page Header */}
        <div className="activity-header">
          <div>
            <div className="activity-eyebrow">
              <Activity size={14} /> Campus Activity Dashboard
            </div>
            <h1 className="activity-title">My Activity</h1>
            <p className="activity-sub">
              Manage items you have lost, found, recovered, or claimed across campus.
            </p>
          </div>

          <div className="activity-quick-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/report/lost')}
            >
              <Plus size={15} /> Report Lost
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/report/found')}
            >
              <Plus size={15} /> Report Found
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="activity-metrics-grid" role="region" aria-label="Activity summary statistics">
          <div
            className={`metric-card lost-metric${activeTab === 'lost' ? ' active' : ''}`}
            onClick={() => handleSetTab('lost')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-icon lost-icon" aria-hidden="true">
              <AlertCircle size={22} />
            </div>
            <div className="metric-info">
              <span className="metric-num">{stats.lostCount}</span>
              <span className="metric-label">Items Lost by Me</span>
            </div>
            <span className="metric-indicator">Click to view</span>
          </div>

          <div
            className={`metric-card found-metric${activeTab === 'found' ? ' active' : ''}`}
            onClick={() => handleSetTab('found')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-icon found-icon" aria-hidden="true">
              <CheckCircle2 size={22} />
            </div>
            <div className="metric-info">
              <span className="metric-num">{stats.foundCount}</span>
              <span className="metric-label">Items Found by Me</span>
            </div>
            <span className="metric-indicator">Click to view</span>
          </div>

          <div
            className={`metric-card recovered-metric${activeTab === 'recovered' ? ' active' : ''}`}
            onClick={() => handleSetTab('recovered')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-icon recovered-icon" aria-hidden="true">
              <CheckCheck size={22} />
            </div>
            <div className="metric-info">
              <span className="metric-num">{stats.recoveredCount}</span>
              <span className="metric-label">Recovered / Returned</span>
            </div>
            <span className="metric-indicator">Click to view</span>
          </div>

          <div
            className={`metric-card claims-metric${activeTab === 'chats' || activeTab === 'enquiries' ? ' active' : ''}`}
            onClick={() => handleSetTab(stats.conversationsCount > 0 ? 'chats' : 'enquiries')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-icon claims-icon" aria-hidden="true">
              <MessageSquare size={22} />
            </div>
            <div className="metric-info">
              <span className="metric-num">{stats.conversationsCount}</span>
              <span className="metric-label">Conversations & Chats</span>
            </div>
            <span className="metric-indicator">
              {stats.conversationsCount > 0 ? `${stats.conversationsCount} active chats` : `${stats.enquiriesCount} enquiries`}
            </span>
          </div>
        </div>

        {/* Filter Navigation & Search */}
        <div className="activity-controls">
          <div className="activity-tabs" role="tablist" aria-label="Activity filter tabs">
            <button
              className={`activity-tab${activeTab === 'all' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => handleSetTab('all')}
            >
              All Reports ({stats.total})
            </button>
            <button
              className={`activity-tab${activeTab === 'lost' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'lost'}
              onClick={() => handleSetTab('lost')}
            >
              Lost ({stats.lostCount})
            </button>
            <button
              className={`activity-tab${activeTab === 'found' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'found'}
              onClick={() => handleSetTab('found')}
            >
              Found ({stats.foundCount})
            </button>
            <button
              className={`activity-tab${activeTab === 'recovered' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'recovered'}
              onClick={() => handleSetTab('recovered')}
            >
              Recovered ({stats.recoveredCount})
            </button>
            <button
              className={`activity-tab${activeTab === 'chats' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'chats'}
              onClick={() => handleSetTab('chats')}
            >
              Conversations ({stats.conversationsCount})
            </button>
            <button
              className={`activity-tab${activeTab === 'enquiries' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'enquiries'}
              onClick={() => handleSetTab('enquiries')}
            >
              Enquiries ({stats.enquiriesCount})
            </button>
          </div>

          <div className="activity-search-box">
            <Search size={16} className="activity-search-icon" />
            <input
              type="text"
              placeholder={activeTab === 'chats' ? 'Search conversations…' : 'Search within my reports…'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="activity-search-input"
            />
          </div>
        </div>

        {/* Tab 1-4: Reports List */}
        {['all', 'lost', 'found', 'recovered'].includes(activeTab) && (
          <div className="activity-items-list" role="list" aria-label="My reported items list">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const meta = getCategoryMeta(item.category)
                const isRecovered = item.status === 'recovered'
                return (
                  <article key={item.id} className="activity-item-card" role="listitem">
                    {/* Item Thumbnail */}
                    <div className="activity-thumb-wrap">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="activity-thumb" />
                      ) : (
                        <div
                          className="activity-thumb-placeholder"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {item.category?.slice(0, 2).toUpperCase() || 'UF'}
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="activity-card-content">
                      <div className="activity-card-header">
                        <div className="activity-badges">
                          <span
                            className={`badge badge-${
                              isRecovered ? 'recovered' : item.type === 'lost' ? 'lost' : 'found'
                            }`}
                          >
                            {isRecovered
                              ? 'Recovered'
                              : item.type === 'lost'
                              ? 'Lost Item'
                              : 'Found Item'}
                          </span>
                          <span className="activity-category-tag">{item.category}</span>
                        </div>
                        <span className="activity-date">
                          <Calendar size={13} /> {item.date}
                        </span>
                      </div>

                      <h3 className="activity-item-title">{item.title}</h3>
                      <p className="activity-item-desc">{item.description}</p>

                      <div className="activity-meta-row">
                        <span className="activity-meta-chip">
                          <MapPin size={13} /> {item.location}
                        </span>
                        {item.holdingLocation && (
                          <span className="activity-meta-chip holding-chip">
                            Location: {item.holdingLocation}
                          </span>
                        )}
                        {item.reward && (
                          <span className="activity-meta-chip reward-chip">
                            🎁 Reward: {item.reward}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="activity-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/item/${item.id}`)}
                      >
                        View Post <ExternalLink size={13} />
                      </button>

                      {!isRecovered && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm btn-recover"
                          onClick={e => handleMarkRecovered(item.id, e)}
                        >
                          <CheckCheck size={14} /> Mark Recovered
                        </button>
                      )}

                      <button
                        type="button"
                        className="activity-delete-btn"
                        onClick={e => handleDelete(item.id, item.title, e)}
                        title="Delete report"
                        aria-label="Delete report"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <EmptyState
                title="No items found in this section"
                message="You can report a new lost or found item to keep track of it here."
                actions={
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/report/lost')}>
                      Report Lost Item
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/report/found')}>
                      Report Found Item
                    </button>
                  </div>
                }
              />
            )}
          </div>
        )}

        {/* Tab 5: Dedicated Conversations / Chat Section */}
        {activeTab === 'chats' && (
          <div className="activity-conversations-section">
            <div className="section-intro-bar">
              <div>
                <h2 className="section-title">
                  <MessageSquare size={18} /> Conversations & Active Chats
                </h2>
                <p className="section-desc">
                  Direct real-time conversations with other students to coordinate safe campus handovers.
                </p>
              </div>
            </div>

            {enquiriesLoading ? (
              <div className="enquiries-loading">
                <div className="enquiries-loading-spinner" />
                <span>Loading conversations…</span>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="conversations-grid" role="list" aria-label="Active conversations">
                {filteredConversations.map(conv => {
                  const myUserId = user?.id || user?._id
                  const isOwner = String(typeof conv.itemOwnerId === 'object' ? conv.itemOwnerId?._id : conv.itemOwnerId) === String(myUserId)
                  const partnerInfo = isOwner
                    ? (typeof conv.senderId === 'object' ? conv.senderId : { name: conv.senderName })
                    : (typeof conv.itemOwnerId === 'object' ? conv.itemOwnerId : { name: 'Item Owner' })

                  const partnerName = partnerInfo?.name || (isOwner ? conv.senderName : 'Item Owner')
                  const partnerCollege = partnerInfo?.college || null
                  const lastReply = conv.replies && conv.replies.length > 0
                    ? conv.replies[conv.replies.length - 1]
                    : null
                  const previewMsg = lastReply
                    ? `${lastReply.senderName || 'User'}: ${lastReply.message}`
                    : `Initial request: ${conv.message}`
                  const lastTime = formatEnquiryDate(lastReply?.createdAt || conv.updatedAt || conv.createdAt)

                  return (
                    <article
                      key={conv._id}
                      className="conversation-card"
                      onClick={() => navigate(`/chat/${conv._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/chat/${conv._id}`)
                        }
                      }}
                    >
                      <div className="conv-card-top">
                        <div className="conv-card-badges">
                          <span className={`badge badge-${conv.itemType}`}>
                            {conv.itemType === 'lost' ? 'Lost Report' : 'Found Report'}
                          </span>
                          <span className={`conv-status-pill status-${conv.status}`}>
                            {STATUS_LABELS[conv.status] || conv.status}
                          </span>
                        </div>
                        <span className="conv-date">
                          <Clock size={12} /> {lastTime}
                        </span>
                      </div>

                      <h3 className="conv-title">{conv.itemTitle}</h3>

                      <div className="conv-partner">
                        <div className="conv-avatar">
                          {partnerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="conv-partner-info">
                          <span className="conv-partner-name">{partnerName}</span>
                          <span className="conv-partner-role">
                            {isOwner
                              ? (conv.itemType === 'lost' ? 'Finder' : 'Claimant')
                              : 'Item Reporter'}
                            {partnerCollege ? ` · ${partnerCollege}` : ''}
                          </span>
                        </div>
                      </div>

                      <p className="conv-preview">
                        "{previewMsg.length > 110 ? `${previewMsg.slice(0, 110)}…` : previewMsg}"
                      </p>

                      <div className="conv-footer">
                        <span className="conv-reply-count">
                          <MessageSquare size={13} /> {conv.replies?.length || 0} message{conv.replies?.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm conv-open-btn"
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/chat/${conv._id}`)
                          }}
                        >
                          <MessageSquare size={14} /> Open Chat
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title={searchQuery.trim() ? "No conversations match your search" : "No active conversations yet"}
                message={
                  searchQuery.trim()
                    ? "Try searching for another item title or participant name."
                    : "When an enquiry is accepted, a private real-time chat channel will appear here."
                }
                actions={
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => handleSetTab('enquiries')}>
                      View Pending Enquiries ({stats.enquiriesCount})
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                      Browse Campus Items
                    </button>
                  </div>
                }
              />
            )}
          </div>
        )}

        {/* Tab 6: Enquiries Section (Incoming & Sent requests) */}
        {activeTab === 'enquiries' && (
          <div className="activity-enquiries-section">
            {/* Quick banner if conversations exist */}
            {conversations.length > 0 && (
              <div
                className="activity-conversations-banner"
                onClick={() => handleSetTab('chats')}
                role="button"
                tabIndex={0}
              >
                <div className="conv-banner-left">
                  <MessageCircle size={20} className="conv-banner-icon" />
                  <div>
                    <strong>You have {conversations.length} active conversation{conversations.length !== 1 ? 's' : ''}</strong>
                    <span>Click to open the Chat & Conversations section</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={e => {
                    e.stopPropagation()
                    handleSetTab('chats')
                  }}
                >
                  Go to Chats <ArrowRight size={14} />
                </button>
              </div>
            )}

            {enquiriesLoading ? (
              <div className="enquiries-loading">
                <div className="enquiries-loading-spinner" />
                <span>Loading enquiries…</span>
              </div>
            ) : (
              <>
                {/* Incoming Enquiries */}
                {incomingEnquiries.length > 0 && (
                  <div className="enquiry-group">
                    <h2 className="enquiry-group-title">
                      <Inbox size={16} /> Incoming Enquiries
                      <span className="enquiry-group-count">{incomingEnquiries.length}</span>
                    </h2>
                    <p className="enquiry-group-sub">
                      People who have contacted you about items you reported.
                    </p>
                    <div className="enquiry-cards-list">
                      {incomingEnquiries.map(enq => {
                        const senderInfo = typeof enq.senderId === 'object' ? enq.senderId : null
                        const senderName = senderInfo?.name || enq.senderName || 'Someone'
                        const statusColor = STATUS_COLORS[enq.status] || 'amber'
                        const isChatOpen = ['accepted', 'handed_over'].includes(enq.status)

                        return (
                          <article
                            key={enq._id}
                            className="enquiry-card"
                            onClick={() => {
                              if (isChatOpen || enq.status === 'completed') {
                                navigate(`/chat/${enq._id}`)
                              } else {
                                navigate(`/enquiry/${enq._id}`)
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                if (isChatOpen || enq.status === 'completed') {
                                  navigate(`/chat/${enq._id}`)
                                } else {
                                  navigate(`/enquiry/${enq._id}`)
                                }
                              }
                            }}
                          >
                            <div className="enquiry-card-top">
                              <div className="enquiry-card-badges">
                                <span className={`enquiry-type-badge ${enq.itemType}`}>
                                  {enq.itemType === 'lost' ? '🔍 Match Request' : '📋 Claim'}
                                </span>
                                <span className={`enquiry-status-badge status-${statusColor}`}>
                                  {STATUS_LABELS[enq.status] || enq.status}
                                </span>
                              </div>
                              <span className="enquiry-card-date">
                                <Clock size={12} /> {formatEnquiryDate(enq.createdAt)}
                              </span>
                            </div>

                            <h3 className="enquiry-card-title">{enq.itemTitle}</h3>

                            <div className="enquiry-card-sender">
                              <div className="enquiry-sender-avatar">
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="enquiry-sender-info">
                                <span className="enquiry-sender-name">{senderName}</span>
                                {senderInfo?.college && (
                                  <span className="enquiry-sender-college">{senderInfo.college}</span>
                                )}
                              </div>
                            </div>

                            <p className="enquiry-card-message">
                              "{enq.message?.length > 120 ? `${enq.message.slice(0, 120)}…` : enq.message}"
                            </p>

                            <div className="enquiry-card-actions">
                              {enq.status === 'pending' && (
                                <span className="enquiry-action-hint">
                                  <ExternalLink size={13} /> View Details & Respond
                                </span>
                              )}
                              {isChatOpen && (
                                <span className="enquiry-action-hint chat-hint">
                                  <MessageSquare size={13} /> Open Chat
                                </span>
                              )}
                              {enq.status === 'rejected' && (
                                <span className="enquiry-action-hint rejected-hint">
                                  Declined
                                </span>
                              )}
                              {enq.status === 'completed' && (
                                <span className="enquiry-action-hint completed-hint">
                                  <CheckCheck size={13} /> Recovered · View Chat
                                </span>
                              )}
                              {enq.replies?.length > 0 && (
                                <span className="enquiry-reply-count">
                                  <MessageSquare size={12} /> {enq.replies.length} message{enq.replies.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Outgoing Enquiries */}
                {outgoingEnquiries.length > 0 && (
                  <div className="enquiry-group">
                    <h2 className="enquiry-group-title">
                      <SendIcon size={16} /> Sent Enquiries
                      <span className="enquiry-group-count">{outgoingEnquiries.length}</span>
                    </h2>
                    <p className="enquiry-group-sub">
                      Enquiries you have sent to other item reporters.
                    </p>
                    <div className="enquiry-cards-list">
                      {outgoingEnquiries.map(enq => {
                        const ownerInfo = typeof enq.itemOwnerId === 'object' ? enq.itemOwnerId : null
                        const ownerName = ownerInfo?.name || 'Item Owner'
                        const statusColor = STATUS_COLORS[enq.status] || 'amber'
                        const isChatOpen = ['accepted', 'handed_over'].includes(enq.status)

                        return (
                          <article
                            key={enq._id}
                            className="enquiry-card outgoing"
                            onClick={() => {
                              if (isChatOpen || enq.status === 'completed') {
                                navigate(`/chat/${enq._id}`)
                              } else {
                                navigate(`/enquiry/${enq._id}`)
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                if (isChatOpen || enq.status === 'completed') {
                                  navigate(`/chat/${enq._id}`)
                                } else {
                                  navigate(`/enquiry/${enq._id}`)
                                }
                              }
                            }}
                          >
                            <div className="enquiry-card-top">
                              <div className="enquiry-card-badges">
                                <span className={`enquiry-type-badge ${enq.itemType}`}>
                                  {enq.itemType === 'lost' ? '🔍 Match Request' : '📋 Claim'}
                                </span>
                                <span className={`enquiry-status-badge status-${statusColor}`}>
                                  {STATUS_LABELS[enq.status] || enq.status}
                                </span>
                              </div>
                              <span className="enquiry-card-date">
                                <Clock size={12} /> {formatEnquiryDate(enq.createdAt)}
                              </span>
                            </div>

                            <h3 className="enquiry-card-title">{enq.itemTitle}</h3>

                            <div className="enquiry-card-sender">
                              <div className="enquiry-sender-avatar">
                                <UserIcon size={14} />
                              </div>
                              <div className="enquiry-sender-info">
                                <span className="enquiry-sender-name">To: {ownerName}</span>
                                {ownerInfo?.college && (
                                  <span className="enquiry-sender-college">{ownerInfo.college}</span>
                                )}
                              </div>
                            </div>

                            <p className="enquiry-card-message">
                              "{enq.message?.length > 120 ? `${enq.message.slice(0, 120)}…` : enq.message}"
                            </p>

                            <div className="enquiry-card-actions">
                              {enq.status === 'pending' && (
                                <span className="enquiry-action-hint pending-hint">
                                  <Clock size={13} /> Awaiting Response
                                </span>
                              )}
                              {isChatOpen && (
                                <span className="enquiry-action-hint chat-hint">
                                  <MessageSquare size={13} /> Open Chat
                                </span>
                              )}
                              {enq.status === 'rejected' && (
                                <span className="enquiry-action-hint rejected-hint">
                                  Declined by Owner
                                </span>
                              )}
                              {enq.status === 'completed' && (
                                <span className="enquiry-action-hint completed-hint">
                                  <CheckCheck size={13} /> Recovered · View Chat
                                </span>
                              )}
                              {enq.replies?.length > 0 && (
                                <span className="enquiry-reply-count">
                                  <MessageSquare size={12} /> {enq.replies.length} message{enq.replies.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state if no enquiries at all */}
                {incomingEnquiries.length === 0 && outgoingEnquiries.length === 0 && (
                  <EmptyState
                    title="No enquiries yet"
                    message="When someone sends you an enquiry about your reported items, or when you contact another reporter, it will appear here."
                    actions={
                      <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Browse Campus Items
                      </button>
                    }
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
