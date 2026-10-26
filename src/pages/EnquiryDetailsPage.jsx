// src/pages/EnquiryDetailsPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  ExternalLink,
  Shield,
  Laptop,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Key,
  Watch
} from 'lucide-react'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getCategoryMeta } from '../utils/categoryIcons.js'
import './EnquiryDetailsPage.css'

const ICON_MAP = { Laptop, CreditCard, ShoppingBag, BookOpen, Key, Watch, Package }

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return d
  }
}

function formatDateTime(d) {
  if (!d) return '—'
  try {
    const date = new Date(d)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return d
  }
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function EnquiryDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [enquiry, setEnquiry] = useState(null)
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [is403, setIs403] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        setIs403(false)

        const enquiryData = await api.getEnquiryById(id)
        if (!isMounted) return
        setEnquiry(enquiryData)

        // Fetch related item if itemId exists
        const targetItemId =
          typeof enquiryData.itemId === 'object' && enquiryData.itemId !== null
            ? enquiryData.itemId._id || enquiryData.itemId.id
            : enquiryData.itemId

        if (targetItemId) {
          try {
            const itemData = await api.getItemById(targetItemId)
            if (isMounted && itemData) {
              setItem(itemData)
            }
          } catch (err) {
            console.warn('Could not fetch full item details:', err)
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching enquiry details:', err)
        if (
          err.status === 403 ||
          err.message?.includes('403') ||
          err.message?.toLowerCase().includes('unauthorized')
        ) {
          setIs403(true)
          setError(
            'Access Denied: You do not have permission to view this enquiry. Only the sender and the item owner can view its details.'
          )
        } else if (err.status === 404 || err.message?.includes('404')) {
          setError('Enquiry not found. It may have been removed or the link is invalid.')
        } else {
          setError(err.message || 'Failed to load enquiry details.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (id) {
      loadData()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  // Handle ESC key to dismiss modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && showRejectModal && !actionLoading) {
        setShowRejectModal(false)
      }
    }
    if (showRejectModal) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showRejectModal, actionLoading])

  // Role detection
  const currentUserId = user?.id || user?._id

  const ownerId =
    typeof enquiry?.itemOwnerId === 'object' && enquiry?.itemOwnerId !== null
      ? enquiry.itemOwnerId._id || enquiry.itemOwnerId.id
      : enquiry?.itemOwnerId

  const senderId =
    typeof enquiry?.senderId === 'object' && enquiry?.senderId !== null
      ? enquiry.senderId._id || enquiry.senderId.id
      : enquiry?.senderId

  const isOwner = Boolean(currentUserId && ownerId && String(currentUserId) === String(ownerId))
  const isSender = Boolean(currentUserId && senderId && String(currentUserId) === String(senderId))

  // Accept action
  async function handleAccept() {
    if (actionLoading) return
    setActionLoading(true)
    setActionError(null)
    try {
      await api.acceptEnquiry(id)
      navigate(`/chat/${id}`)
    } catch (err) {
      console.error('Failed to accept enquiry:', err)
      setActionError(err.message || 'Failed to accept enquiry. Please try again.')
      setActionLoading(false)
    }
  }

  // Reject action
  async function handleConfirmReject() {
    if (actionLoading) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await api.rejectEnquiry(id)
      setEnquiry(prev => ({
        ...prev,
        status: 'rejected',
        ...(res?.enquiry || {})
      }))
      setShowRejectModal(false)
    } catch (err) {
      console.error('Failed to reject enquiry:', err)
      setActionError(err.message || 'Failed to decline request. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="page enquiry-page">
        <div className="container">
          <div className="enquiry-loading-card">
            <div className="enquiry-spinner" />
            <h2 className="enquiry-loading-title">Loading Enquiry Details</h2>
            <p className="enquiry-loading-sub">Fetching enquiry and item information…</p>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error || !enquiry) {
    return (
      <main className="page enquiry-page">
        <div className="container">
          <button className="enquiry-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="enquiry-error-card">
            {is403 ? (
              <Shield size={44} className="enquiry-error-icon danger" />
            ) : (
              <AlertCircle size={44} className="enquiry-error-icon" />
            )}
            <h2 className="enquiry-error-title">
              {is403 ? 'Access Restricted' : 'Unable to Load Enquiry'}
            </h2>
            <p className="enquiry-error-sub">
              {error || 'The requested enquiry could not be found.'}
            </p>
            <div className="enquiry-error-actions">
              <button className="btn btn-secondary" onClick={() => navigate('/activity')}>
                Go to My Activity
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Campus Home
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Fallback item resolution
  const resolvedItemId =
    typeof enquiry.itemId === 'object' && enquiry.itemId !== null
      ? enquiry.itemId._id || enquiry.itemId.id
      : enquiry.itemId

  const displayTitle = item?.title || enquiry.itemTitle || 'Reported Item'
  const displayType = item?.type || enquiry.itemType || 'lost'
  const displayCategory = item?.category || 'Other'
  const displayLocation = item?.location || 'Campus'
  const displayDate = item?.date || item?.createdAt || enquiry.createdAt
  const displayDescription =
    item?.description || 'No additional description provided in the original report.'
  const displayImageUrl = item?.imageUrl || null

  const meta = getCategoryMeta(displayCategory)
  const IconComp = meta ? ICON_MAP[meta.icon] ?? Package : Package

  // Sender metadata
  const senderObj =
    typeof enquiry.senderId === 'object' && enquiry.senderId !== null ? enquiry.senderId : {}
  const senderName = enquiry.senderName || senderObj.name || 'Anonymous Student'
  const senderEmail =
    senderObj.email || (enquiry.senderContact?.includes('@') ? enquiry.senderContact : null)
  const senderCollege = senderObj.college || null
  const senderContact = enquiry.senderContact || null

  const status = enquiry.status || 'pending'

  // Human-readable status label
  const statusLabels = {
    pending: 'Pending Review',
    accepted: 'Accepted',
    rejected: 'Declined',
    completed: 'Recovered',
    handed_over: 'Handover in Progress'
  }

  return (
    <main className="page enquiry-page">
      <div className="container">
        {/* Navigation Breadcrumb / Back */}
        <button
          className="enquiry-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={17} /> Back
        </button>

        {/* Page Heading */}
        <div className="enquiry-header">
          <div>
            <div className="enquiry-eyebrow">
              <Shield size={14} /> Campus Item Match & Verification
            </div>
            <h1 className="enquiry-title">Enquiry Details</h1>
            <p className="enquiry-sub">
              {isOwner
                ? `Review the inquiry sent by ${senderName} regarding your reported item.`
                : 'Your inquiry submitted to the item reporter.'}
            </p>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="enquiry-layout">
          {/* Left Column: Item Information Card */}
          <div className="enquiry-left-column">
            <div className="enquiry-item-card">
              {/* Image or Category Placeholder */}
              <div className="enquiry-image-wrap">
                {displayImageUrl ? (
                  <img
                    src={displayImageUrl}
                    alt={displayTitle}
                    className="enquiry-image"
                  />
                ) : (
                  <div className="enquiry-placeholder" aria-hidden="true">
                    <IconComp size={56} color={meta.color} strokeWidth={1.3} />
                    <span className="enquiry-placeholder-label">{displayCategory}</span>
                  </div>
                )}
              </div>

              {/* Badges & Chips */}
              <div className="enquiry-badges-row">
                <span className={`badge badge-${displayType}`}>
                  {displayType === 'lost' ? 'Lost Item' : 'Found Item'}
                </span>
                <span className="enquiry-category-chip">
                  <Tag size={12} aria-hidden="true" /> {displayCategory}
                </span>
                {item?.status === 'recovered' && (
                  <span className="badge badge-recovered">Recovered</span>
                )}
              </div>

              {/* Title & Description */}
              <h2 className="enquiry-item-title">{displayTitle}</h2>
              <p className="enquiry-item-description">{displayDescription}</p>

              <div className="enquiry-divider" />

              {/* Metadata List */}
              <ul className="enquiry-meta-list" aria-label="Item metadata">
                <li className="enquiry-meta-item">
                  <span className="enquiry-meta-icon" aria-hidden="true">
                    <MapPin size={16} />
                  </span>
                  <div>
                    <div className="enquiry-meta-label">Location</div>
                    <div className="enquiry-meta-value">{displayLocation}</div>
                  </div>
                </li>
                <li className="enquiry-meta-item">
                  <span className="enquiry-meta-icon" aria-hidden="true">
                    <Calendar size={16} />
                  </span>
                  <div>
                    <div className="enquiry-meta-label">
                      Date {displayType === 'lost' ? 'Lost' : 'Found'}
                    </div>
                    <div className="enquiry-meta-value">{formatDate(displayDate)}</div>
                  </div>
                </li>
              </ul>

              {/* Link to full post */}
              {resolvedItemId && (
                <div className="enquiry-original-link-wrap">
                  <Link
                    to={`/item/${resolvedItemId}`}
                    className="enquiry-view-post-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>View Original Item Report</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Enquiry Details & Actions Card */}
          <div className="enquiry-right-column">
            <div className="enquiry-details-card">
              {/* Status Header Bar */}
              <div className="enquiry-status-bar">
                <div className="enquiry-status-group">
                  <span className="enquiry-status-caption">Status</span>
                  <span className={`enquiry-status-pill status-${status}`}>
                    {status === 'pending' && <Clock size={13} />}
                    {status === 'accepted' && <CheckCircle size={13} />}
                    {status === 'rejected' && <XCircle size={13} />}
                    {status === 'completed' && <CheckCircle size={13} />}
                    {status === 'handed_over' && <Clock size={13} />}
                    {statusLabels[status] || status}
                  </span>
                </div>

                <div className="enquiry-timestamp">
                  <Clock size={13} />
                  <span>Submitted on {formatDateTime(enquiry.createdAt)}</span>
                </div>
              </div>

              {/* Sender Details Section */}
              <div className="enquiry-sender-section">
                <div className="enquiry-avatar" aria-hidden="true">
                  {getInitials(senderName)}
                </div>
                <div className="enquiry-sender-info">
                  <div className="enquiry-sender-header-row">
                    <h3 className="enquiry-sender-name">
                      {isSender ? 'You' : `Enquiry from ${senderName}`}
                    </h3>
                    <span className="enquiry-role-badge">
                      {isSender
                        ? 'Enquiry Sender'
                        : enquiry.itemType === 'lost'
                        ? 'Potential Finder'
                        : 'Claimant'}
                    </span>
                  </div>

                  <div className="enquiry-sender-contacts">
                    {senderEmail && (
                      <div className="enquiry-contact-chip">
                        <Mail size={13} />
                        <span>{senderEmail}</span>
                      </div>
                    )}
                    {senderCollege && (
                      <div className="enquiry-contact-chip">
                        <Shield size={13} />
                        <span>{senderCollege}</span>
                      </div>
                    )}
                    {senderContact && senderContact !== senderEmail && (
                      <div className="enquiry-contact-chip">
                        <Phone size={13} />
                        <span>{senderContact}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enquiry Message Block */}
              <div className="enquiry-message-wrap">
                <div className="enquiry-message-header">
                  <MessageSquare size={16} />
                  <span>Enquiry Message & Verification Details</span>
                </div>
                <blockquote className="enquiry-blockquote">
                  <p>{enquiry.message || 'No detailed message provided.'}</p>
                </blockquote>
              </div>

              {/* Action Banner / Notification for current state */}
              {actionError && (
                <div className="enquiry-banner banner-error" role="alert">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Action Failed:</strong> {actionError}
                  </div>
                </div>
              )}

              {/* Completed Status Notice */}
              {status === 'completed' && (
                <div className="enquiry-banner banner-completed">
                  <CheckCircle size={22} className="banner-icon" />
                  <div>
                    <h4 className="banner-title">🎉 Item Successfully Recovered!</h4>
                    <p className="banner-desc">
                      Both parties have confirmed the handover. This inquiry is complete and the
                      item is safely returned.
                    </p>
                  </div>
                </div>
              )}

              {/* Handed Over Status Notice */}
              {status === 'handed_over' && (
                <div className="enquiry-banner banner-handed-over">
                  <Clock size={22} className="banner-icon" />
                  <div>
                    <h4 className="banner-title">Handover in Progress</h4>
                    <p className="banner-desc">
                      One party has confirmed the handover. Open the chat to verify receipt and
                      conclude the recovery.
                    </p>
                  </div>
                </div>
              )}

              {/* Accepted Status Notice */}
              {status === 'accepted' && (
                <div className="enquiry-banner banner-accepted">
                  <CheckCircle size={22} className="banner-icon" />
                  <div>
                    <h4 className="banner-title">Request Accepted</h4>
                    <p className="banner-desc">
                      {isOwner
                        ? `You accepted ${senderName}’s match request. You can now chat in real-time to arrange a safe campus meetup.`
                        : 'The item owner accepted your request! Open chat to coordinate handover.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Rejected Status Notice */}
              {status === 'rejected' && (
                <div className="enquiry-banner banner-rejected">
                  <XCircle size={22} className="banner-icon" />
                  <div>
                    <h4 className="banner-title">This Request Was Declined</h4>
                    <p className="banner-desc">
                      {isOwner
                        ? 'You declined this match request. No chat channel will be opened.'
                        : 'The item owner indicated that the details provided did not match this item.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Sender Pending Notice */}
              {isSender && status === 'pending' && (
                <div className="enquiry-banner banner-pending">
                  <Clock size={22} className="banner-icon" />
                  <div>
                    <h4 className="banner-title">Awaiting response from the item owner</h4>
                    <p className="banner-desc">
                      The item owner has been notified of your enquiry and will review the details
                      you shared. You will receive a notification once they respond.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="enquiry-actions-section">
                {/* 1. Item Owner + Pending: Accept & Reject Buttons */}
                {isOwner && status === 'pending' && (
                  <div className="enquiry-owner-actions">
                    <p className="enquiry-actions-intro">
                      Do the details above match your item?
                    </p>
                    <div className="enquiry-buttons-row">
                      <button
                        type="button"
                        className="btn btn-primary enquiry-accept-btn"
                        onClick={handleAccept}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={18} />
                        <span>
                          {actionLoading ? 'Accepting & Starting Chat…' : 'Accept & Start Chat'}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger enquiry-reject-btn"
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                      >
                        <XCircle size={18} />
                        <span>Reject Match</span>
                      </button>
                    </div>

                    <div className="enquiry-safety-hint">
                      <Shield size={14} />
                      <span>
                        Accepting will start a direct, protected chat channel to coordinate safe
                        collection on campus.
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Accepted or Handed Over: Open Chat Button */}
                {['accepted', 'handed_over'].includes(status) && (
                  <button
                    type="button"
                    className="btn btn-primary enquiry-full-btn"
                    onClick={() => navigate(`/chat/${id}`)}
                  >
                    <MessageSquare size={17} />
                    <span>Open Chat</span>
                  </button>
                )}

                {/* 3. Completed: View Chat History Button */}
                {status === 'completed' && (
                  <button
                    type="button"
                    className="btn btn-secondary enquiry-full-btn"
                    onClick={() => navigate(`/chat/${id}`)}
                  >
                    <MessageSquare size={17} />
                    <span>View Conversation History</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Confirmation Modal Dialog */}
      {showRejectModal && (
        <div
          className="enquiry-modal-overlay"
          onClick={() => !actionLoading && setShowRejectModal(false)}
        >
          <div
            className="enquiry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="enquiry-modal-header">
              <div className="enquiry-modal-danger-icon" aria-hidden="true">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 id="reject-dialog-title" className="enquiry-modal-title">
                  Decline this request?
                </h3>
                <p className="enquiry-modal-subtitle">
                  Are you sure you want to decline this request?
                </p>
              </div>
            </div>

            <div className="enquiry-modal-body">
              <p>
                <strong>This action cannot be undone.</strong> The sender ({senderName}) will be
                notified that this enquiry was declined and the conversation channel will not open.
              </p>
            </div>

            {actionError && (
              <div className="enquiry-modal-error">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <div className="enquiry-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
