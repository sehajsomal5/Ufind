// src/components/AIAssistant.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  X,
  Send,
  MapPin,
  Calendar,
  ArrowRight,
  Package,
  RotateCcw,
  Search,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { getCategoryMeta } from '../utils/categoryIcons.js'
import './AIAssistant.css'

// ── API constants (same base as api.js) ───────────────────────────────
const API_BASE = '/api'

// Direct fetch helper — does NOT throw on non-200, returns { ok, status, data }
async function rawFetch(path, options = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    // Include auth token if present (same key as api.js)
    try {
      const token = localStorage.getItem('ufind_token')
      if (token) headers['Authorization'] = `Bearer ${token}`
    } catch {}

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    let data = {}
    try { data = await res.json() } catch {}
    return { ok: res.ok, status: res.status, data }
  } catch (netErr) {
    return { ok: false, status: 0, data: {}, networkError: netErr.message }
  }
}

// ── Rule-based local NLP (works as resilient fallback) ──
const NOISE_WORDS = new Set([
  'lost', 'losing', 'misplaced', 'missing', 'left', 'dropped', 'forgot', 'forget', 'lose',
  'found', 'find', 'finding', 'finds', 'picked', 'discovered', 'located', 'spotted', 'seen', 'saw', 'turned',
  'did', 'does', 'do', 'anyone', 'anybody', 'someone', 'somebody', 'everyone',
  'have', 'has', 'had', 'having', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'there', 'here', 'where', 'when', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
  'tell', 'know', 'check', 'look', 'looking', 'search', 'searching', 'show', 'see', 'get',
  'please', 'pls', 'help', 'hi', 'hello', 'hey', 'yo', 'thanks', 'thank', 'you',
  'item', 'items', 'thing', 'things', 'stuff', 'object', 'objects',
  'my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'their', 'theirs', 'our', 'ours',
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'i', 'me', 'we', 'us', 'he', 'him', 'she', 'they', 'them', 'it', 'its',
  'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'about', 'into', 'over', 'after',
  'and', 'or', 'but', 'so', 'if', 'not', 'no', 'any', 'some', 'all', 'both', 'of', 'up', 'out',
  'work', 'works', 'working', 'claim', 'claims', 'claiming', 'process', 'steps', 'step', 'guide', 'guidance', 'explain', 'explanation', 'rule', 'rules',
])

function extractKeywords(query) {
  return [...new Set(
    (query || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 2 && !NOISE_WORDS.has(t))
  )]
}

function isIntent(query, patterns) {
  return patterns.some(p => new RegExp(`\\b${p}\\b`, 'i').test(query))
}

// Build a rule-based reply purely from keywords + matched items
function buildLocalReply(query, items) {
  const lost  = isIntent(query, ['lost','misplaced','missing','dropped','forgot','left behind'])
  const found = isIntent(query, ['found','picked up','turned in','discovered'])
  const help  = isIntent(query, ['how to','how do','guide','steps','explain','process'])
  const claim = isIntent(query, ['claim','claims','claiming','handover','verify','verification','receipt','recover','recovery'])
  const greet = /^(hi|hello|hey|what can|who are|help)\b/i.test(query.trim())

  if (greet && extractKeywords(query).length === 0) {
    return {
      reply: `👋 **Hi! I'm UFind Assistant.**\n\nI can help you search real lost & found records on campus, guide you through reporting items, and explain the recovery and claim process.\n\nTry asking:\n• *"I lost my MacBook charger"*\n• *"Did anyone find a wallet?"*\n• *"Casio calculator"*`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Report Found Item', path: '/report/found', type: 'ghost'   },
      ],
      suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'How does claiming work?'],
    }
  }

  if (claim) {
    return {
      reply: `🤝 **Recovery Process:**\n\n• Find the item listing → tap "I Think This Is Mine"\n• Answer the verification question (details only the owner knows)\n• Once accepted, a private chat opens to arrange handover\n• Both sides confirm in-chat → item marked **Recovered** ✅`,
      actions: [
        { label: 'Browse Items', path: '/', type: 'primary' },
        { label: 'My Chats', path: '/activity?tab=chats', type: 'ghost' },
      ],
      suggestions: ['Browse all items', 'How to report a lost item?'],
    }
  }

  if (help) {
    return {
      reply: `📋 **Reporting a lost item:**\n\n1. Click **"I Lost Something"** in the nav\n2. Fill in title, category, location, and date\n3. Optionally upload a photo\n4. Submit — finders can message you directly`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Report Found Item', path: '/report/found', type: 'ghost'   },
      ],
      suggestions: ['How does claiming work?'],
    }
  }

  const kw = extractKeywords(query).join(' ') || 'your search'

  if (items.length > 0) {
    const tail = lost
      ? `\n\nNone match? Tap **Report Lost Item** to post a report.`
      : found
      ? `\n\nIf you found this, tap **View Details** to message the reporter.`
      : `\n\nTap **View Details** on any card to view full details.`
    return {
      reply: `🔍 Found **${items.length}** matching record${items.length > 1 ? 's' : ''} for "${kw}":${tail}`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Browse All Items',  path: '/',             type: 'ghost'   },
      ],
      suggestions: ['How does claiming work?', 'Browse all items'],
    }
  }

  // No results
  let msg = `🔍 No records found for "${kw}" in the campus database right now.`
  if (lost) {
    msg += `\n\nNew items are added throughout the day. You can:\n• **Post a Lost Report** so finders can reach you\n• Try different keywords (colour, brand, model)`
  } else if (found) {
    msg += `\n\nNo one has reported losing this yet — post a Found report so the owner can find you!`
  } else {
    msg += `\n\nTry rephrasing, or browse all active listings below.`
  }

  return {
    reply: msg,
    actions: [
      { label: 'Report Lost Item', path: '/report/lost', type: 'primary' },
      { label: 'Browse All Items', path: '/',            type: 'ghost'   },
    ],
    suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'How to report?'],
  }
}

// ── helpers ────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function AssistantText({ text }) {
  const paras = (text || '').split(/\n\n+/)
  return (
    <div className="ai-text">
      {paras.map((para, pi) => {
        const lines = para.split('\n')
        const isBullets = lines.every(l => l.startsWith('• ') || l.startsWith('- '))
        if (isBullets) {
          return (
            <ul key={pi} className="ai-bullets">
              {lines.map((l, li) => <li key={li}><RichText text={l.replace(/^[•-]\s/, '')} /></li>)}
            </ul>
          )
        }
        return (
          <p key={pi}>
            {lines.map((l, li) => (
              <span key={li}>
                <RichText text={l} />
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

// ── Compact Item Card inside chat ──────────────────────────────────────
function ItemCard({ item, onView }) {
  const meta = getCategoryMeta(item.category || '')
  const [imgErr, setImgErr] = useState(false)
  const statusCls   = item.status === 'lost' ? 'lost' : item.status === 'found' ? 'found' : 'recovered'
  const statusLabel = item.status === 'lost' ? 'Lost' : item.status === 'found' ? 'Found' : 'Recovered'

  return (
    <div className="ai-item-card">
      <div className="ai-item-thumb" style={{ background: meta.bg }}>
        {item.imageUrl && !imgErr
          ? <img src={item.imageUrl} alt={item.title} onError={() => setImgErr(true)} />
          : <Package size={18} style={{ color: meta.color }} />
        }
      </div>
      <div className="ai-item-info">
        <div className="ai-item-top">
          <span className="ai-item-name">{item.title}</span>
          <span className={`ai-item-badge ${statusCls}`}>{statusLabel}</span>
        </div>
        {item.description && <p className="ai-item-desc">{item.description}</p>}
        <div className="ai-item-meta">
          {item.location && <span><MapPin size={11} /> {item.location}</span>}
          {item.date    && <span><Calendar size={11} /> {formatDate(item.date)}</span>}
        </div>
      </div>
      <button
        type="button"
        className="ai-item-view"
        onClick={() => onView(String(item._id || item.id))}
        title="View Details"
      >
        <ArrowRight size={14} />
      </button>
    </div>
  )
}

// ── Initial message ────────────────────────────────────────────────────
const INIT_MSG = {
  id: 'init',
  role: 'assistant',
  text: `👋 **Hi! I'm UFind Assistant.**\n\nI can help you:\n• 🔍 Search real lost & found records on campus\n• 📝 Guide you through reporting items\n• 🤝 Explain the safe recovery process\n\nWhat can I help you find?`,
  items: [],
  actions: [
    { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
    { label: 'Report Found Item', path: '/report/found', type: 'ghost'   },
  ],
  suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'Casio calculator'],
}

// ── Main Component ─────────────────────────────────────────────────────
export default function AIAssistant() {
  const navigate = useNavigate()
  const [open, setOpen]         = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [msgs, setMsgs]         = useState([INIT_MSG])

  const bodyRef  = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom
  useEffect(() => {
    if (!open || minimized) return
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, loading, open, minimized])

  // Focus input on open
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open, minimized])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')

    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    setMsgs(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text: q, ts }])
    setLoading(true)

    // ── TIER 1: try /api/assistant/chat (full NLP + DB) ──────────────────
    const assistantRes = await rawFetch('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: q }),
    })

    if (assistantRes.ok) {
      // Full assistant endpoint is working
      const d = assistantRes.data
      setMsgs(prev => [
        ...prev,
        {
          id:          `a-${Date.now()}`,
          role:        'assistant',
          text:        d.reply || 'Got it.',
          items:       Array.isArray(d.items) ? d.items : [],
          actions:     Array.isArray(d.actions) ? d.actions : [],
          suggestions: Array.isArray(d.suggestions) ? d.suggestions : [],
          ts:          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setLoading(false)
      return
    }

    // ── TIER 2: /api/assistant/chat unavailable (404 = old server not restarted,
    //            500 = crash) → fall back to direct /api/items?q= search ─────────
    console.warn(`[UFind Assistant] /api/assistant/chat returned ${assistantRes.status}. Falling back to items search.`)

    let items = []
    const keywords = extractKeywords(q)

    if (keywords.length > 0) {
      // Use the working /api/items endpoint with a combined search query
      const searchQuery = keywords.join(' ')
      const itemsRes = await rawFetch(`/items?q=${encodeURIComponent(searchQuery)}&includeSample=true`)
      if (itemsRes.ok && Array.isArray(itemsRes.data)) {
        // Normalise IDs
        items = itemsRes.data.slice(0, 5).map(item => ({
          ...item,
          _id: String(item._id || item.id),
          id:  String(item._id || item.id),
        }))
      }
    }

    const fallback = buildLocalReply(q, items)

    setMsgs(prev => [
      ...prev,
      {
        id:          `a-${Date.now()}`,
        role:        'assistant',
        text:        fallback.reply,
        items,
        actions:     fallback.actions,
        suggestions: fallback.suggestions,
        ts:          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setLoading(false)
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <aside className="ai-root" aria-label="UFind Assistant">

      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          className="ai-fab"
          onClick={() => { setOpen(true); setMinimized(false) }}
          aria-label="Open UFind Assistant"
        >
          <Bot size={22} />
          <span className="ai-fab-tip">Ask UFind Assistant</span>
          <span className="ai-fab-dot" aria-hidden="true" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={`ai-window${minimized ? ' minimized' : ''}`} role="dialog" aria-label="UFind Assistant">

          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-header-avatar" aria-hidden="true"><Bot size={18} /></div>
              <div>
                <div className="ai-header-name">UFind Assistant</div>
                <div className="ai-header-status"><span className="ai-status-dot" />Real-time search</div>
              </div>
            </div>
            <div className="ai-header-btns">
              <button type="button" className="ai-hbtn" onClick={() => setMsgs([INIT_MSG])} title="Clear chat" aria-label="Clear chat">
                <RotateCcw size={14} />
              </button>
              <button type="button" className="ai-hbtn" onClick={() => setMinimized(v => !v)} title={minimized ? 'Expand' : 'Minimize'} aria-label={minimized ? 'Expand' : 'Minimize'}>
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button type="button" className="ai-hbtn close" onClick={() => setOpen(false)} title="Close" aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <>
              <div className="ai-body" ref={bodyRef}>
                {msgs.map(msg => (
                  <div key={msg.id} className={`ai-row ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="ai-bot-dot" aria-hidden="true"><Bot size={13} /></div>
                    )}
                    <div className="ai-msg-col">
                      <div className={`ai-bubble ${msg.role}`}>
                        <AssistantText text={msg.text} />
                        {msg.ts && <span className="ai-time">{msg.ts}</span>}
                      </div>

                      {msg.items && msg.items.length > 0 && (
                        <div className="ai-results">
                          <div className="ai-results-label">
                            <Search size={11} />{msg.items.length} record{msg.items.length > 1 ? 's' : ''} found
                          </div>
                          {msg.items.map(item => (
                            <ItemCard
                              key={String(item._id || item.id)}
                              item={item}
                              onView={id => navigate(`/item/${id}`)}
                            />
                          ))}
                        </div>
                      )}

                      {msg.actions && msg.actions.length > 0 && (
                        <div className="ai-actions">
                          {msg.actions.map((a, i) => (
                            <button key={i} type="button" className={`ai-action-btn ${a.type || 'primary'}`} onClick={() => navigate(a.path)}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="ai-chips">
                          {msg.suggestions.map((s, i) => (
                            <button key={i} type="button" className="ai-chip" onClick={() => send(s)} disabled={loading}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-row assistant">
                    <div className="ai-bot-dot" aria-hidden="true"><Bot size={13} /></div>
                    <div className="ai-bubble assistant ai-thinking"><span /><span /><span /></div>
                  </div>
                )}
              </div>

              <form className="ai-input-row" onSubmit={e => { e.preventDefault(); send() }}>
                <input
                  ref={inputRef}
                  type="text"
                  className="ai-input"
                  placeholder="Search items or ask anything…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={loading}
                  aria-label="Type your message"
                />
                <button type="submit" className="ai-send" disabled={!input.trim() || loading} aria-label="Send">
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
