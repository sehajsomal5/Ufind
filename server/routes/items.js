import express from 'express'
import { Item } from '../models/Item.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// GET /api/items - Public list of genuine reported items
router.get('/', async (req, res) => {
  try {
    const { status, category, q, includeSample } = req.query
    const filter = {}

    // By default hide sample items from genuine public listings
    if (includeSample !== 'true') {
      filter.isSample = { $ne: true }
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    if (category) {
      filter.category = category
    }

    if (q) {
      const terms = q
        .trim()
        .split(/\s+/)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .filter(t => t.length > 0)

      if (terms.length === 1) {
        const regex = new RegExp(terms[0], 'i')
        filter.$or = [
          { title: regex },
          { description: regex },
          { location: regex },
          { category: regex },
        ]
      } else if (terms.length > 1) {
        const wordClauses = terms.map(term => {
          const rx = new RegExp(term, 'i')
          return {
            $or: [
              { title: rx },
              { description: rx },
              { location: rx },
              { category: rx },
            ],
          }
        })
        filter.$and = wordClauses
      }
    }

    const items = await Item.find(filter).sort({ createdAt: -1 })
    res.json(items)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items.', error: error.message })
  }
})

// GET /api/items/user/me - Get items reported by current authenticated user
router.get('/user/me', requireAuth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(items)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user items.', error: error.message })
  }
})

// GET /api/items/:id - Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' })
    }
    res.json(item)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch item.', error: error.message })
  }
})

// POST /api/items - Create item report
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      type,
      category,
      description,
      location,
      date,
      holdingLocation,
      verificationQuestion,
      reward,
      contactHint,
      imageUrl,
    } = req.body

    if (!title || !type || !category || !description || !location || !date) {
      return res.status(400).json({ message: 'Missing required item fields.' })
    }

    const item = await Item.create({
      title: title.trim(),
      type,
      status: type === 'lost' ? 'lost' : 'found',
      category,
      description: description.trim(),
      location: location.trim(),
      date,
      holdingLocation: (holdingLocation || '').trim(),
      verificationQuestion: (verificationQuestion || '').trim(),
      reward: (reward || '').trim(),
      contactHint: (contactHint || '').trim(),
      imageUrl: imageUrl || null,
      isSample: false,
      userId: req.user._id,
      reportedBy: req.user.name,
    })

    res.status(201).json(item)
  } catch (error) {
    console.error('Create item error:', error)
    res.status(500).json({ message: 'Failed to create item report.', error: error.message })
  }
})

// PUT /api/items/:id - Update item report (status, etc.)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' })
    }

    // Role-based authorization: only owner or admin can update
    const isOwner = item.userId && item.userId.equals(req.user._id)
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized. You cannot modify this item.' })
    }

    const allowedUpdates = ['status', 'title', 'description', 'location', 'holdingLocation', 'reward', 'contactHint']
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        item[key] = req.body[key]
      }
    }

    await item.save()
    res.json(item)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item.', error: error.message })
  }
})

// DELETE /api/items/:id - Delete item report
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' })
    }

    const isOwner = item.userId && item.userId.equals(req.user._id)
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized. You cannot delete this item.' })
    }

    await Item.findByIdAndDelete(req.params.id)
    res.json({ message: 'Item deleted successfully.', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item.', error: error.message })
  }
})

export default router
