import express from 'express'
import { Claim } from '../models/Claim.js'
import { Item } from '../models/Item.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// GET /api/claims/user/me - Claims made by the authenticated student
router.get('/user/me', requireAuth, async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user._id }).sort({ createdAt: -1 })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user claims.', error: error.message })
  }
})

// POST /api/claims - Submit a claim for an item
router.post('/', requireAuth, async (req, res) => {
  try {
    const { itemId, message, contact } = req.body

    if (!itemId || !message) {
      return res.status(400).json({ message: 'Item ID and verification message are required.' })
    }

    const item = await Item.findById(itemId)
    if (!item) {
      return res.status(404).json({ message: 'Target item not found.' })
    }

    const claim = await Claim.create({
      itemId: item._id,
      itemTitle: item.title,
      claimantId: req.user._id,
      claimantName: req.user.name,
      claimantContact: contact || req.user.email,
      message: message.trim(),
      status: 'pending',
    })

    res.status(201).json(claim)
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit claim.', error: error.message })
  }
})

export default router
