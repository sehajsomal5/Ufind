import express from 'express'
import { User } from '../models/User.js'
import { Item } from '../models/Item.js'
import { Claim } from '../models/Claim.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// Apply authentication and admin role enforcement to all admin routes
router.use(requireAuth, requireAdmin)

// GET /api/admin/stats - System-wide metrics
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalReports, lostReports, foundReports, recoveredReports, totalClaims] =
      await Promise.all([
        User.countDocuments(),
        Item.countDocuments({ isSample: { $ne: true } }),
        Item.countDocuments({ status: 'lost', isSample: { $ne: true } }),
        Item.countDocuments({ status: 'found', isSample: { $ne: true } }),
        Item.countDocuments({ status: 'recovered', isSample: { $ne: true } }),
        Claim.countDocuments(),
      ])

    const recentItems = await Item.find({ isSample: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title type status reportedBy createdAt location')

    res.json({
      totalUsers,
      totalReports,
      lostReports,
      foundReports,
      recoveredReports,
      totalClaims,
      recentItems,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats.', error: error.message })
  }
})

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users.', error: error.message })
  }
})

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account.' })
    }

    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    // Clean up reports owned by this user
    await Item.deleteMany({ userId: req.params.id })
    await Claim.deleteMany({ claimantId: req.params.id })

    res.json({ message: 'User and associated data removed.', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user.', error: error.message })
  }
})

// GET /api/admin/items - List all reports for admin management
router.get('/items', async (req, res) => {
  try {
    const { status, type, q } = req.query
    const filter = {}

    if (status && status !== 'all') filter.status = status
    if (type && type !== 'all') filter.type = type
    if (q) {
      const regex = new RegExp(q.trim(), 'i')
      filter.$or = [
        { title: regex },
        { description: regex },
        { location: regex },
        { reportedBy: regex },
      ]
    }

    const items = await Item.find(filter).sort({ createdAt: -1 })
    res.json(items)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items.', error: error.message })
  }
})

// PUT /api/admin/items/:id/status - Update report status
router.put('/items/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!['lost', 'found', 'recovered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' })
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' })
    }

    res.json(item)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update item status.', error: error.message })
  }
})

// DELETE /api/admin/items/:id - Delete an item report
router.delete('/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' })
    }

    // Clean up claims associated with this item
    await Claim.deleteMany({ itemId: req.params.id })

    res.json({ message: 'Item deleted.', id: req.params.id })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item.', error: error.message })
  }
})

// GET /api/admin/claims - List all claims across the platform
router.get('/claims', async (req, res) => {
  try {
    const claims = await Claim.find().sort({ createdAt: -1 })
    res.json(claims)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch claims.', error: error.message })
  }
})

// PUT /api/admin/claims/:id/status - Approve or reject claim
router.put('/claims/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' })
    }

    const claim = await Claim.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' })
    }

    // If claim approved, optionally update item status to recovered
    if (status === 'approved') {
      await Item.findByIdAndUpdate(claim.itemId, { status: 'recovered' })
    }

    res.json(claim)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update claim status.', error: error.message })
  }
})

export default router
