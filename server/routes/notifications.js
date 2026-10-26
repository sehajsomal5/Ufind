import express from 'express'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// All notification routes require authentication
router.use(requireAuth)

// GET /api/notifications - List user's notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications.', error: error.message })
  }
})

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user._id,
      read: false,
    })
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: 'Failed to count unread notifications.', error: error.message })
  }
})

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { read: true },
      { new: true }
    )
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }
    res.json({ success: true, notification })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification.', error: error.message })
  }
})

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { read: true }
    )
    res.json({ success: true, message: 'All notifications marked as read.' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications read.', error: error.message })
  }
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id,
    })
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }
    res.json({ success: true, message: 'Notification removed.' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification.', error: error.message })
  }
})

export default router
