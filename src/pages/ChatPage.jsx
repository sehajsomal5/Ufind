// src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, CheckCircle, CheckCheck, Package,
  Clock, ShieldCheck, AlertCircle, HandMetal, Shield
} from 'lucide-react'
import { io } from 'socket.io-client'
import { api, getToken } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getCategoryMeta } from '../utils/categoryIcons.js'
import './ChatPage.css'

function formatMsgTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatDateLabel(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function ChatPage() {
  const { enquiryId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [enquiry, setEnquiry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [is403, setIs403] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimerRef = useRef(null)

  // Determine user role in this enquiry
  const myId = user?.id || user?._id
  const ownerId =
    typeof enquiry?.itemOwnerId === 'object' && enquiry?.itemOwnerId !== null
      ? enquiry.itemOwnerId._id || enquiry.itemOwnerId.id
      : enquiry?.itemOwnerId
  const senderId =
    typeof enquiry?.senderId === 'object' && enquiry?.senderId !== null
      ? enquiry.senderId._id || enquiry.senderId.id
      : enquiry?.senderId

  const isOwner = Boolean(myId && ownerId && String(myId) === String(ownerId))
  const isSender = Boolean(myId && senderId && String(myId) === String(senderId))

  // In 'lost' reports: itemOwner is the owner who lost it, sender is the finder who found it
  // In 'found' reports: itemOwner is the finder who found it, sender is the owner claiming it
  const amIFinder = enquiry?.itemType === 'lost' ? isSender : isOwner
  const amIOwner = enquiry?.itemType === 'lost' ? isOwner : isSender

  const otherUser = useMemo(() => {
    if (!enquiry) return null
    if (isOwner) {
      return typeof enquiry.senderId === 'object'
        ? enquiry.senderId
        : { _id: enquiry.senderId, name: enquiry.senderName }
    }
    return typeof enquiry.itemOwnerId === 'object'
      ? enquiry.itemOwnerId
      : { _id: enquiry.itemOwnerId, name: 'Item Owner' }
  }, [enquiry, isOwner])

  // Build messages array from enquiry data
  const messages = useMemo(() => {
    if (!enquiry) return []
    const msgs = []

    // The initial enquiry message
    msgs.push({
      _id: 'initial',
      senderId: typeof enquiry.senderId === 'object' ? enquiry.senderId._id : enquiry.senderId,
      senderName: enquiry.senderName,
      message: enquiry.message,
      createdAt: enquiry.createdAt,
      isInitial: true,
    })

    // All replies
    if (enquiry.replies && Array.isArray(enquiry.replies)) {
      enquiry.replies.forEach(r => {
        msgs.push({
          _id: r._id || `reply-${r.createdAt}`,
          senderId: typeof r.senderId === 'object' ? r.senderId._id : r.senderId,
          senderName: r.senderName,
          message: r.message,
          createdAt: r.createdAt,
        })
      })
    }

    return msgs
  }, [enquiry])

  // Fetch enquiry data
  const fetchEnquiry = useCallback(async () => {
    try {
      setLoading(true)
      setIs403(false)
      const data = await api.getEnquiryById(enquiryId)
      setEnquiry(data)
      setError(null)
    } catch (err) {
      if (err.status === 403 || err.message?.includes('403') || err.message?.toLowerCase().includes('unauthorized')) {
        setIs403(true)
        setError('Access Restricted: You are not an authorized participant in this conversation.')
      } else {
        setError(err.message || 'Failed to load conversation.')
      }
    } finally {
      setLoading(false)
    }
  }, [enquiryId])

  useEffect(() => {
    fetchEnquiry()
  }, [fetchEnquiry])

  // Socket.IO for real-time chat
  useEffect(() => {
    if (!user || !enquiryId) return

    const token = getToken()
    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_user_room', myId)
      socket.emit('join_chat_room', enquiryId)
    })

    // Real-time chat messages
    socket.on('chat_message', (msgData) => {
      if (String(msgData.enquiryId) !== String(enquiryId)) return
      // Only add if it's from the other user (we already added our own optimistically)
      if (String(msgData.senderId) !== String(myId)) {
        setEnquiry(prev => {
          if (!prev) return prev
          // Avoid duplicate live messages
          const existingReplies = prev.replies || []
          const isDuplicate = existingReplies.some(
            r => r.message === msgData.message &&
              String(typeof r.senderId === 'object' ? r.senderId._id : r.senderId) === String(msgData.senderId) &&
              Math.abs(new Date(r.createdAt || 0).getTime() - new Date(msgData.createdAt || 0).getTime()) < 3000
          )
          if (isDuplicate) return prev

          const newReply = {
            _id: msgData._id || `live-${Date.now()}-${Math.random()}`,
            senderId: msgData.senderId,
            senderName: msgData.senderName || otherUser?.name || 'User',
            message: msgData.message,
            createdAt: msgData.createdAt || new Date().toISOString(),
          }
          return { ...prev, replies: [...existingReplies, newReply] }
        })
      }
    })

    // Also handle direct enquiry reply event as reliable fallback
    socket.on('enquiry_reply', (data) => {
      if (String(data.enquiryId) !== String(enquiryId)) return
      const reply = data.reply
      if (!reply) return
      if (String(typeof reply.senderId === 'object' ? reply.senderId._id : reply.senderId) !== String(myId)) {
        setEnquiry(prev => {
          if (!prev) return prev
          const existing = prev.replies || []
          if (existing.some(r => r._id === reply._id || (r.message === reply.message && String(r.senderId) === String(reply.senderId)))) {
            return prev
          }
          return { ...prev, replies: [...existing, reply] }
        })
      }
    })

    // Enquiry status updates (e.g. accepted, handover, completed)
    socket.on('enquiry_updated', (updated) => {
      if (String(updated._id || updated.id) === String(enquiryId)) {
        fetchEnquiry()
      }
    })

    // Typing indicators
    socket.on('typing', (data) => {
      if (String(data.enquiryId) === String(enquiryId) && String(data.userId) !== String(myId)) {
        setIsTyping(true)
      }
    })

    socket.on('stop_typing', (data) => {
      if (String(data.enquiryId) === String(enquiryId) && String(data.userId) !== String(myId)) {
        setIsTyping(false)
      }
    })

    return () => {
      socket.emit('leave_chat_room', enquiryId)
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, enquiryId, myId, otherUser?.name, fetchEnquiry])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Send a message
  async function handleSendMessage(e) {
    e?.preventDefault()
    if (!msgText.trim() || sending) return

    const text = msgText.trim()
    setMsgText('')
    setSending(true)
    setActionError(null)

    // Optimistically add the message
    const tempId = `opt-${Date.now()}`
    const optimisticReply = {
      _id: tempId,
      senderId: myId,
      senderName: user?.name || 'Me',
      message: text,
      createdAt: new Date().toISOString(),
    }
    setEnquiry(prev => {
      if (!prev) return prev
      return { ...prev, replies: [...(prev.replies || []), optimisticReply] }
    })

    // Emit via Socket.IO for instant real-time delivery
    socketRef.current?.emit('chat_message', {
      enquiryId,
      message: text,
      senderName: user?.name,
    })

    // Persist via API
    try {
      const res = await api.replyEnquiry(enquiryId, text)
      if (res?.reply) {
        setEnquiry(prev => {
          if (!prev) return prev
          const updatedReplies = (prev.replies || []).map(r =>
            r._id === tempId ? res.reply : r
          )
          return { ...prev, replies: updatedReplies }
        })
      }
    } catch (err) {
      console.warn('Failed to persist message:', err)
      setActionError('Message failed to send. Please try again.')
    } finally {
      // Stop typing indicator
      socketRef.current?.emit('stop_typing', enquiryId)
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  // Handle typing events
  function handleInputChange(e) {
    setMsgText(e.target.value)

    if (socketRef.current) {
      socketRef.current.emit('typing', enquiryId)
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('stop_typing', enquiryId)
      }, 2000)
    }
  }

  // Handle Enter key
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handover actions
  async function handleMarkHandover() {
    setHandoverLoading(true)
    setActionError(null)
    try {
      const res = await api.markHandover(enquiryId)
      if (res?.enquiry) setEnquiry(res.enquiry)
    } catch (err) {
      console.error('Handover error:', err)
      setActionError(err.message || 'Failed to mark handover.')
    } finally {
      setHandoverLoading(false)
    }
  }

  async function handleConfirmReceipt() {
    setHandoverLoading(true)
    setActionError(null)
    try {
      const res = await api.confirmReceipt(enquiryId)
      if (res?.enquiry) setEnquiry(res.enquiry)
    } catch (err) {
      console.error('Confirm receipt error:', err)
      setActionError(err.message || 'Failed to confirm receipt.')
    } finally {
      setHandoverLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="page chat-page">
        <div className="container">
          <div className="chat-loading">
            <div className="chat-loading-spinner" />
            <span>Loading conversation…</span>
          </div>
        </div>
      </main>
    )
  }

  // Error state / 403 state
  if (error || !enquiry) {
    return (
      <main className="page chat-page">
        <div className="container">
          <button className="chat-back-btn" onClick={() => navigate('/activity?tab=chats')}>
            <ArrowLeft size={16} /> Back to My Activity
          </button>
          <div className="chat-error">
            {is403 ? <Shield size={36} color="var(--color-danger)" /> : <AlertCircle size={36} />}
            <h2>{is403 ? 'Access Restricted' : 'Cannot Load Conversation'}</h2>
            <p>{error || 'Conversation not found.'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/activity?tab=chats')}>
              Go to My Activity
            </button>
          </div>
        </div>
      </main>
    )
  }

  const meta = getCategoryMeta(enquiry.itemTitle || '')
  const canChat = ['accepted', 'handed_over'].includes(enquiry.status)
  const isCompleted = enquiry.status === 'completed'
  const isRejected = enquiry.status === 'rejected'
  const isPending = enquiry.status === 'pending'

  const otherInitials = otherUser?.name
    ? otherUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  // Group messages by date for dividers
  let lastDateLabel = ''

  return (
    <main className="page chat-page">
      <div className="container chat-container">
        {/* Back nav */}
        <button className="chat-back-btn" onClick={() => navigate('/activity?tab=chats')}>
          <ArrowLeft size={16} /> Back to My Activity
        </button>

        {/* WhatsApp-style conversation header */}
        <div className="chat-wa-header">
          <div className="chat-wa-header-left">
            <div className="chat-wa-avatar" aria-hidden="true">
              {otherInitials}
              <span className="chat-wa-online-dot" />
            </div>
            <div className="chat-wa-user-info">
              <h2 className="chat-wa-user-name">{otherUser?.name || 'User'}</h2>
              <span className="chat-wa-subtitle">
                {otherUser?.college || 'Chitkara University'}
                <span className="chat-wa-separator">•</span>
                <span className="chat-wa-item-pill">
                  <Package size={11} /> {enquiry.itemTitle}
                </span>
              </span>
            </div>
          </div>
          <div className="chat-wa-header-right">
            <span className={`chat-status-badge ${enquiry.status}`}>
              {enquiry.status === 'handed_over' ? 'Handover In Progress' : enquiry.status}
            </span>
          </div>
        </div>

        {/* Action Error Banner if any */}
        {actionError && (
          <div className="chat-error-toast" role="alert" style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid #f5c2c7', color: 'var(--color-danger)', borderRadius: 8, fontSize: '0.875rem' }}>
            <AlertCircle size={15} style={{ display: 'inline', marginRight: 6 }} />
            {actionError}
          </div>
        )}

        {/* Recovery complete banner */}
        {isCompleted && (
          <div className="chat-recovery-banner">
            <h3>🎉 Item Successfully Recovered!</h3>
            <p>Both parties have confirmed the handover. This report is marked as recovered.</p>
          </div>
        )}

        {/* Handover actions bar */}
        {canChat && !isCompleted && (
          <div className="chat-handover-bar">
            <div className="handover-status">
              <span className={`handover-check ${enquiry.finderConfirmed ? 'confirmed' : 'pending'}`}>
                {enquiry.finderConfirmed ? <CheckCircle size={13} /> : <Clock size={13} />}
                Finder Handover: {enquiry.finderConfirmed ? 'Done ✓' : 'Pending'}
              </span>
              <span className={`handover-check ${enquiry.ownerConfirmed ? 'confirmed' : 'pending'}`}>
                {enquiry.ownerConfirmed ? <CheckCircle size={13} /> : <Clock size={13} />}
                Owner Receipt: {enquiry.ownerConfirmed ? 'Confirmed ✓' : 'Pending'}
              </span>
            </div>
            <div className="handover-actions">
              {/* Finder confirms handover */}
              {amIFinder && !enquiry.finderConfirmed && (
                <button
                  className="btn-handover primary"
                  onClick={handleMarkHandover}
                  disabled={handoverLoading}
                >
                  <HandMetal size={14} />
                  {handoverLoading ? 'Updating…' : 'Mark Handed Over'}
                </button>
              )}
              {amIFinder && enquiry.finderConfirmed && (
                <button className="btn-handover confirmed" disabled>
                  <CheckCheck size={14} /> Handed Over ✓
                </button>
              )}

              {/* Owner confirms receipt */}
              {amIOwner && !enquiry.ownerConfirmed && (
                <button
                  className="btn-handover primary"
                  onClick={handleConfirmReceipt}
                  disabled={handoverLoading}
                >
                  <ShieldCheck size={14} />
                  {handoverLoading ? 'Updating…' : 'Confirm Receipt'}
                </button>
              )}
              {amIOwner && enquiry.ownerConfirmed && (
                <button className="btn-handover confirmed" disabled>
                  <CheckCheck size={14} /> Receipt Confirmed ✓
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="chat-messages">
          {/* Initial enquiry message */}
          <div className="chat-initial-msg">
            <div className="chat-initial-msg-label">
              {enquiry.itemType === 'lost' ? '🔍 Match Request' : '📋 Ownership Claim'}
            </div>
            <p className="chat-initial-msg-text">{enquiry.message}</p>
            {enquiry.senderContact && (
              <div className="chat-initial-msg-contact">
                📧 Contact: {enquiry.senderContact}
              </div>
            )}
          </div>

          {/* Chat messages (replies) */}
          {enquiry.replies?.map((reply) => {
            const replyId = reply._id || `r-${reply.createdAt}`
            const replySenderId = typeof reply.senderId === 'object' && reply.senderId !== null
              ? reply.senderId._id || reply.senderId.id
              : reply.senderId
            const isMine = Boolean(myId && replySenderId && String(myId) === String(replySenderId))

            const dateLabel = formatDateLabel(reply.createdAt)
            let showDivider = false
            if (dateLabel && dateLabel !== lastDateLabel) {
              showDivider = true
              lastDateLabel = dateLabel
            }

            return (
              <div key={replyId} className="chat-msg-wrapper">
                {showDivider && (
                  <div className="chat-date-divider">
                    <span>{dateLabel}</span>
                  </div>
                )}
                <div className={`chat-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                  <div className={`chat-msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    {!isMine && (
                      <span className="chat-msg-sender-name">
                        {reply.senderName || otherUser?.name || 'User'}
                      </span>
                    )}
                    <div className="chat-msg-content-row">
                      <span className="chat-msg-text">{reply.message}</span>
                      <span className="chat-msg-meta-time">
                        {formatMsgTime(reply.createdAt)}
                        {isMine && <CheckCheck size={14} className="chat-msg-ticks" />}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="chat-typing-indicator">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              {otherUser?.name || 'User'} is typing…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {canChat && !isCompleted ? (
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <textarea
              ref={textareaRef}
              value={msgText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!msgText.trim() || sending}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        ) : isCompleted ? (
          <div className="chat-disabled-notice">
            <CheckCheck size={16} /> This conversation is complete. The item has been recovered.
          </div>
        ) : isPending ? (
          <div className="chat-disabled-notice">
            <Clock size={16} /> Chat will be available once the item owner accepts your request.
          </div>
        ) : isRejected ? (
          <div className="chat-disabled-notice">
            <AlertCircle size={16} /> This request was declined. Chat is not available.
          </div>
        ) : null}
      </div>
    </main>
  )
}
