import express from 'express'
import { Item } from '../models/Item.js'

const router = express.Router()

// ── Noise & Intent words that should NOT be treated as item search keywords ───
const NOISE_WORDS = new Set([
  // Lost intent words
  'lost', 'losing', 'misplaced', 'missing', 'left', 'dropped', 'forgot', 'forget', 'lose',
  // Found intent words
  'found', 'find', 'finding', 'finds', 'picked', 'discovered', 'located', 'spotted', 'seen', 'saw', 'turned',
  // Query questions / fillers / pronouns / prepositions
  'did', 'does', 'do', 'anyone', 'anybody', 'someone', 'somebody', 'everyone', 'everybody',
  'have', 'has', 'had', 'having',
  'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'there', 'here', 'where', 'when', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
  'tell', 'know', 'check', 'look', 'looking', 'search', 'searching', 'show', 'see', 'get',
  'please', 'pls', 'help', 'hi', 'hello', 'hey', 'yo', 'thanks', 'thank', 'you',
  'item', 'items', 'thing', 'things', 'stuff', 'object', 'objects',
  'around', 'near', 'nearby', 'somewhere', 'today', 'yesterday',
  'my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'their', 'theirs', 'our', 'ours',
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'i', 'me', 'we', 'us', 'he', 'him', 'she', 'they', 'them', 'it', 'its',
  'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'about', 'into', 'over', 'after', 'under',
  'and', 'or', 'but', 'so', 'if', 'not', 'no', 'any', 'some', 'all', 'both', 'of', 'up', 'out',
  'think', 'know', 'want', 'need', 'trying', 'give', 'back',
  'work', 'works', 'working', 'claim', 'claims', 'claiming', 'process', 'steps', 'step', 'guide', 'guidance', 'explain', 'explanation', 'rule', 'rules',
])

const CAMPUS_LOCATIONS = [
  'Library', 'Cafeteria', 'Canteen', 'Computer Lab', 'Auditorium', 'Hostel',
  'Sports Complex', 'Admin Block', 'Main Gate', 'Classroom Block A',
  'Classroom Block B', 'Parking Lot',
]

const CATEGORY_NAMES = [
  'Electronics', 'ID Cards', 'Bags & Luggage', 'Bags', 'Books', 'Keys', 'Accessories', 'Other',
]

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Context & Keyword extraction ──────────────────────────────────────────────
export function extractContext(query) {
  const raw = (query || '').toLowerCase().trim()

  // Detect query intents
  const isLostQuery = /\b(lost|misplaced|missing|left behind|dropped|forgot|did anyone find|anyone found|have you seen)\b/i.test(raw)
  const isFoundQuery = /\b(found|picked up|discovered|turned in|someone left|did anyone lose|anyone lost)\b/i.test(raw) && !isLostQuery
  const isHelpIntent  = /\b(how to|guide|steps|process|how do i|how does|what is|explain|reporting)\b/i.test(raw)
  const isClaimIntent = /\b(handover|claim|claims|claiming|verify|verification|receipt|recover|recovery|proof of ownership)\b/i.test(raw)

  // Detect location
  let detectedLocation = null
  for (const loc of CAMPUS_LOCATIONS) {
    if (raw.includes(loc.toLowerCase())) {
      detectedLocation = loc
      break
    }
  }

  // Detect category
  let detectedCategory = null
  for (const cat of CATEGORY_NAMES) {
    if (raw.includes(cat.toLowerCase())) {
      detectedCategory = cat
      break
    }
  }

  // Extract clean keywords: remove noise words and numbers < 2 chars
  const rawTokens = raw
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)

  // Filter out noise / intent words
  const keywords = []
  for (const t of rawTokens) {
    if (!NOISE_WORDS.has(t) && !keywords.includes(t)) {
      keywords.push(t)
    }
  }

  return {
    raw,
    keywords,
    detectedLocation,
    detectedCategory,
    isLostQuery,
    isFoundQuery,
    isHelpIntent,
    isClaimIntent,
  }
}

// ── MongoDB Item Search & Smart Scoring ────────────────────────────────────────
export async function searchItems(context) {
  const { keywords, detectedLocation, detectedCategory, isLostQuery, isFoundQuery } = context

  // If no keywords and no location/category detected, nothing to search in DB
  if (keywords.length === 0 && !detectedLocation && !detectedCategory) {
    return []
  }

  // Build MongoDB $or query across all candidate fields
  const orClauses = []

  for (const kw of keywords) {
    const rx = new RegExp(escapeRegex(kw), 'i')
    orClauses.push(
      { title: rx },
      { description: rx },
      { category: rx },
      { location: rx },
      { contactHint: rx },
      { holdingLocation: rx },
    )
  }

  if (detectedLocation) {
    orClauses.push({ location: new RegExp(escapeRegex(detectedLocation), 'i') })
  }

  if (detectedCategory) {
    orClauses.push({ category: new RegExp(escapeRegex(detectedCategory), 'i') })
  }

  if (orClauses.length === 0) return []

  try {
    // Retrieve potential candidate items from MongoDB (including sample demo items)
    const candidates = await Item.find({ $or: orClauses }).lean()

    // Score and rank candidates based on keyword presence, field importance, and lost/found intent
    const scored = []

    for (const item of candidates) {
      let score = 0
      let matchedKeywordCount = 0

      const titleLower = (item.title || '').toLowerCase()
      const descLower = (item.description || '').toLowerCase()
      const catLower = (item.category || '').toLowerCase()
      const locLower = (item.location || '').toLowerCase()

      for (const kw of keywords) {
        const kwLower = kw.toLowerCase()
        const wordRx = new RegExp(`\\b${escapeRegex(kwLower)}\\b`, 'i')
        let matchedThisKw = false

        // Title matches have the highest weight
        if (wordRx.test(titleLower)) {
          score += 20
          matchedThisKw = true
        } else if (titleLower.includes(kwLower)) {
          score += 12
          matchedThisKw = true
        }

        // Description matches
        if (wordRx.test(descLower)) {
          score += 8
          matchedThisKw = true
        } else if (descLower.includes(kwLower)) {
          score += 5
          matchedThisKw = true
        }

        // Category matches
        if (catLower.includes(kwLower)) {
          score += 6
          matchedThisKw = true
        }

        // Location matches
        if (locLower.includes(kwLower)) {
          score += 5
          matchedThisKw = true
        }

        if (matchedThisKw) matchedKeywordCount++
      }

      // Bonus for matching multiple keywords
      if (matchedKeywordCount > 1) {
        score += matchedKeywordCount * 6
      }

      // Location match bonus
      if (detectedLocation && locLower.includes(detectedLocation.toLowerCase())) {
        score += 10
      }

      // Category match bonus
      if (detectedCategory && catLower.includes(detectedCategory.toLowerCase())) {
        score += 8
      }

      // Lost / Found intent bonus:
      // If user lost an item, they are searching for FOUND items!
      if (isLostQuery) {
        if (item.status === 'found' || item.type === 'found') {
          score += 15
        } else if (item.status === 'lost') {
          score += 2
        }
      } else if (isFoundQuery) {
        // If user found an item, they are searching for LOST reports by the owner!
        if (item.status === 'lost' || item.type === 'lost') {
          score += 15
        } else if (item.status === 'found') {
          score += 2
        }
      }

      // Status priority: active items get a small boost over already recovered ones
      if (item.status === 'recovered') {
        score -= 2
      } else {
        score += 4
      }

      // Only include items that genuinely matched at least one keyword, location, or category
      if (matchedKeywordCount > 0 || (detectedLocation && locLower.includes(detectedLocation.toLowerCase())) || (detectedCategory && catLower.includes(detectedCategory.toLowerCase()))) {
        scored.push({ item, score })
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score)

    // Return top 5 formatted items
    return scored.slice(0, 5).map(({ item }) => ({
      _id:         String(item._id),
      id:          String(item._id),
      title:       item.title,
      type:        item.type,
      status:      item.status,
      category:    item.category,
      location:    item.location,
      date:        item.date,
      description: item.description,
      imageUrl:    item.imageUrl || null,
      isSample:    item.isSample || false,
      reportedBy:  item.reportedBy,
    }))
  } catch (err) {
    console.error('[Assistant] DB search error:', err.message)
    return []
  }
}

// ── Optional Gemini LLM call ────────────────────────────────────────────────────
async function callGemini(apiKey, userQuery, items, context) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const sys = `You are "UFind Assistant" for a campus Lost & Found app.
Rules:
- Be concise, helpful, and friendly (≤100 words).
- Never invent items. Genuine MongoDB records are provided below.
- If items were found, reference them briefly and mention how many records matched.
- If no items match, say so honestly and recommend posting a lost or found report.
- Do NOT mention any specific university name.`

    const body = {
      contents: [{
        role: 'user',
        parts: [{ text: `${sys}\n\nUser: "${userQuery}"\nDatabase items: ${JSON.stringify(items)}\nContext: ${JSON.stringify(context)}` }]
      }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 200 }
    }

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) return null
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch {
    return null
  }
}

// ── Rule-based response builder ─────────────────────────────────────────────────
export function buildReply(query, items, ctx) {
  const { raw, keywords, detectedLocation, detectedCategory, isLostQuery, isFoundQuery, isHelpIntent, isClaimIntent } = ctx

  // --- Greetings & Capabilities explanation ---
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|who are you|what can you do|help)\b/i.test(raw) && keywords.length === 0) {
    return {
      reply: `👋 **Hi! I'm UFind Assistant.**\n\nI can help you:\n• 🔍 **Search real campus items**: Search lost or found reports by name, brand, or location\n• 📝 **Guide reporting**: Walk you through submitting a lost or found item\n• 🤝 **Explain recovery**: Learn how verification questions and handovers work\n\nTry asking:\n• *"I lost my MacBook charger"*\n• *"Did anyone find a wallet?"*\n• *"Casio calculator"*`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Report Found Item', path: '/report/found', type: 'ghost'   },
      ],
      suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'How does claiming work?'],
    }
  }

  // --- Handover / claim process guide ---
  if (isClaimIntent) {
    return {
      reply: `🤝 **How Item Recovery Works on UFind:**\n\n1. **Find the listing**: Search or browse for your item\n2. **Tap "I Think This Is Mine"**: Submit an enquiry to the reporter\n3. **Answer Verification**: Answer the verification question (details only the real owner knows)\n4. **Private Chat**: Once accepted, coordinate a safe handover spot on campus\n5. **Confirm Recovery**: Both parties confirm receipt in chat to mark the item **Recovered** ✅`,
      actions: [
        { label: 'Browse All Items', path: '/', type: 'primary' },
        { label: 'My Chats & Enquiries', path: '/activity?tab=chats', type: 'ghost' },
      ],
      suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'How to report a lost item?'],
    }
  }

  // --- Help: reporting instructions ---
  if (isHelpIntent && (isLostQuery || raw.includes('report') || raw.includes('lost'))) {
    return {
      reply: `📋 **How to Report a Lost Item:**\n\n1. Click **"I Lost Something"** in the navigation bar\n2. Provide the item title, category, and where you last saw it\n3. Add a photo or distinguishing details if available\n4. Submit — when someone finds it or reports it, they can message you directly!`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Browse Found Items', path: '/?status=found', type: 'ghost' },
      ],
      suggestions: ['Did anyone find a wallet?', 'How does claiming work?'],
    }
  }

  if (isHelpIntent && isFoundQuery) {
    return {
      reply: `🌟 **How to Report a Found Item:**\n\n1. Click **"I Found Something"** in the navigation bar\n2. Enter where you found it on campus and the date\n3. 💡 **Set a Verification Question** (e.g. *"What is the lock screen wallpaper?"* or *"Describe the keychain charm"*) so only the genuine owner can claim it\n4. Keep the item safe until the owner verifies ownership via chat!`,
      actions: [
        { label: 'Report Found Item', path: '/report/found', type: 'primary' },
      ],
      suggestions: ['Browse lost reports', 'How does claiming work?'],
    }
  }

  // --- Search results summary ---
  const queryLabel = keywords.length > 0
    ? `"${keywords.join(' ')}"`
    : detectedCategory || detectedLocation || 'your search'

  if (items.length > 0) {
    let tail = ''
    if (isLostQuery) {
      tail = `\n\nTap **View Details** on any card to view the listing or contact the finder.\nIf none match your item, you can post a **Lost Report** so finders can reach you.`
    } else if (isFoundQuery) {
      tail = `\n\nTap **View Details** to check if an owner's lost report matches what you found.`
    } else {
      tail = `\n\nTap **View Details** on any card to view full details or reach out.`
    }

    return {
      reply: `🔍 Found **${items.length}** matching record${items.length > 1 ? 's' : ''} for ${queryLabel}:${tail}`,
      actions: [
        { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
        { label: 'Browse All Items',  path: '/',             type: 'ghost'   },
      ],
      suggestions: ['How does claiming work?', 'Did anyone find a wallet?', 'Browse all items'],
    }
  }

  // --- No items matched ---
  let noMatch = `🔍 No records found for ${queryLabel} in the campus database right now.`

  if (isLostQuery) {
    noMatch += `\n\nNew items are reported throughout the day. Here is what you can do:\n• **Post a Lost Report** so anyone who finds it can notify you immediately\n• Check back later or try broader search terms (e.g. *"charger"*, *"electronics"*)\n• Browse all active campus listings below`
  } else if (isFoundQuery) {
    noMatch += `\n\nNo one has reported losing this item yet. Please submit a **Found Report** so the owner can find you when they look for it!`
  } else {
    noMatch += `\n\nTry searching with different keywords, or browse all active campus listings below.`
  }

  return {
    reply: noMatch,
    actions: [
      { label: 'Report Lost Item',  path: '/report/lost',  type: 'primary' },
      { label: 'Report Found Item', path: '/report/found', type: 'ghost'   },
      { label: 'Browse All Items',  path: '/',              type: 'ghost'   },
    ],
    suggestions: ['I lost my MacBook charger', 'Did anyone find a wallet?', 'How to report a lost item?'],
  }
}

// ── POST /api/assistant/chat ────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message field is required' })
    }

    const query = message.trim()
    const ctx   = extractContext(query)
    // Only search items if the user is not just asking a pure informational/process question
    const items = ((ctx.isClaimIntent || ctx.isHelpIntent) && ctx.keywords.length === 0)
      ? []
      : await searchItems(ctx)

    // Optional Gemini LLM call if API key configured
    const geminiKey = process.env.GEMINI_API_KEY
    let aiReply = null
    if (geminiKey) {
      aiReply = await callGemini(geminiKey, query, items, ctx)
    }

    const ruleReply = buildReply(query, items, ctx)

    return res.json({
      reply:       aiReply || ruleReply.reply,
      items,
      actions:     ruleReply.actions,
      suggestions: ruleReply.suggestions,
      mode:        aiReply ? 'gemini' : 'rule_based',
      debug: {
        keywords:          ctx.keywords,
        detectedLocation:  ctx.detectedLocation,
        detectedCategory:  ctx.detectedCategory,
        isLostQuery:       ctx.isLostQuery,
        isFoundQuery:      ctx.isFoundQuery,
        itemCount:         items.length,
        usedGemini:        Boolean(aiReply),
      },
    })
  } catch (err) {
    console.error('[Assistant] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error', details: err.message })
  }
})

export default router
