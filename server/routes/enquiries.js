import express from 'express'
import mongoose from 'mongoose'
import { Enquiry } from '../models/Enquiry.js'
import { Item } from '../models/Item.js'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'
import { emitToUser, emitToChatRoom } from '../socket.js'

const router = express.Router()

// POST /api/enquiries - Submit an enquiry/claim on an item
router.post('/', requireAuth, async (req, res) => {
  try {
    const { itemId, message, contact } = req.body

    if (!itemId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Item ID and message are required.' })
    }

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ message: 'Invalid item ID.' })
    }

    const item = await Item.findById(itemId)
    if (!item) {
      return res.status(404).json({ message: 'Target item not found.' })
    }

    if (!item.userId) {
      return res.status(400).json({
        message: 'This item report does not have an active registered owner to receive enquiries.',
      })
    }

    // Prevent contacting oneself
    if (item.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'You cannot submit an enquiry on your own item report.',
      })
    }

    // Prevent duplicate active enquiries
    const existingEnquiry = await Enquiry.findOne({
      itemId: item._id,
      senderId: req.user._id,
      status: { $nin: ['rejected', 'completed'] },
    })
    if (existingEnquiry) {
      return res.status(409).json({
        message: 'You already have an active enquiry for this item.',
        enquiry: existingEnquiry,
      })
    }

    // 1. Persist the enquiry in MongoDB
    const enquiry = await Enquiry.create({
      itemId: item._id,
      itemTitle: item.title,
      itemType: item.type,
      itemOwnerId: item.userId,
      senderId: req.user._id,
      senderName: req.user.name,
      senderContact: (contact || req.user.email || '').trim(),
      message: message.trim(),
      status: 'pending',
    })

    // 2. Persist notification for the actual item owner
    const isLostItem = item.type === 'lost'
    const notifTitle = isLostItem
      ? `Potential Finder for "${item.title}"`
      : `Ownership Claim for "${item.title}"`
    const notifSnippet = message.trim().length > 90
      ? `${message.trim().slice(0, 90)}…`
      : message.trim()

    const notification = await Notification.create({
      recipientId: item.userId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: item._id,
      itemTitle: item.title,
      enquiryId: enquiry._id,
      type: isLostItem ? 'enquiry' : 'claim',
      title: notifTitle,
      message: `${req.user.name}: "${notifSnippet}"`,
      link: `/enquiry/${enquiry._id}`,
      read: false,
    })

    // 3. Real-time delivery via Socket.IO
    emitToUser(item.userId, 'notification', notification)
    emitToUser(item.userId, 'enquiry', enquiry)

    res.status(201).json({
      success: true,
      enquiry,
      notification,
    })
  } catch (error) {
    console.error('Enquiry creation error:', error)
    res.status(500).json({ message: 'Failed to submit enquiry.', error: error.message })
  }
})

// GET /api/enquiries/incoming - Enquiries received for the items reported by the user
router.get('/incoming', requireAuth, async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ itemOwnerId: req.user._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('senderId', 'name email college')
    res.json(enquiries)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch incoming enquiries.', error: error.message })
  }
})

// GET /api/enquiries/outgoing - Enquiries sent by the authenticated user to other item owners
router.get('/outgoing', requireAuth, async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ senderId: req.user._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('itemOwnerId', 'name email college')
    res.json(enquiries)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch outgoing enquiries.', error: error.message })
  }
})

// GET /api/enquiries/:id - Get single enquiry for details or chat
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
      .populate('senderId', 'name email college')
      .populate('itemOwnerId', 'name email college')

    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const ownerId = enquiry.itemOwnerId?._id?.toString() || enquiry.itemOwnerId?.toString()
    const senderId = enquiry.senderId?._id?.toString() || enquiry.senderId?.toString()
    const myId = req.user._id.toString()

    const isOwner = ownerId === myId
    const isSender = senderId === myId

    if (!isOwner && !isSender) {
      return res.status(403).json({ message: 'Unauthorized. You are not a participant in this enquiry.' })
    }

    res.json(enquiry)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch enquiry.', error: error.message })
  }
})

// POST /api/enquiries/:id/reply - Reply to an existing enquiry
router.post('/:id/reply', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const { message } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Reply message is required.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry thread not found.' })
    }

    // Authorization: only the item owner or the sender can reply
    const isOwner = String(enquiry.itemOwnerId) === String(req.user._id)
    const isSender = String(enquiry.senderId) === String(req.user._id)

    if (!isOwner && !isSender) {
      return res.status(403).json({ message: 'Unauthorized. You are not a participant in this conversation.' })
    }

    if (!['accepted', 'handed_over'].includes(enquiry.status)) {
      return res.status(400).json({
        message: `Cannot send messages while inquiry status is '${enquiry.status}'. Accept the inquiry to start chatting.`,
      })
    }

    const reply = {
      senderId: req.user._id,
      senderName: req.user.name,
      message: message.trim(),
    }

    enquiry.replies.push(reply)
    await enquiry.save()

    // Determine recipient
    const recipientId = isOwner ? enquiry.senderId : enquiry.itemOwnerId

    // Persist notification for the other participant
    const notifSnippet = message.trim().length > 90 ? `${message.trim().slice(0, 90)}…` : message.trim()
    const notification = await Notification.create({
      recipientId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: enquiry.itemId,
      itemTitle: enquiry.itemTitle,
      enquiryId: enquiry._id,
      type: 'reply',
      title: `Reply on "${enquiry.itemTitle}"`,
      message: `${req.user.name}: "${notifSnippet}"`,
      link: `/chat/${enquiry._id}`,
      read: false,
    })

    // Real-time socket emission
    emitToUser(recipientId, 'notification', notification)
    emitToUser(recipientId, 'enquiry_reply', { enquiryId: enquiry._id, reply })

    res.json({
      success: true,
      enquiry,
      reply,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit reply.', error: error.message })
  }
})

// PUT /api/enquiries/:id/accept - Item owner accepts match request
router.put('/:id/accept', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })

    if (String(enquiry.itemOwnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the item owner can accept.' })
    }

    if (enquiry.status !== 'pending') {
      return res.status(400).json({ message: `Cannot accept an enquiry with status '${enquiry.status}'.` })
    }

    enquiry.status = 'accepted'
    await enquiry.save()

    const notification = await Notification.create({
      recipientId: enquiry.senderId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: enquiry.itemId,
      itemTitle: enquiry.itemTitle,
      enquiryId: enquiry._id,
      type: 'match_accepted',
      title: `Match Accepted for "${enquiry.itemTitle}"`,
      message: `${req.user.name} accepted your request. You can now chat and coordinate the handover.`,
      link: `/chat/${enquiry._id}`,
      read: false,
    })

    emitToUser(enquiry.senderId, 'notification', notification)
    emitToUser(enquiry.senderId, 'enquiry_updated', enquiry)
    emitToChatRoom(enquiry._id, 'enquiry_updated', enquiry)

    res.json({ success: true, enquiry })
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept enquiry.', error: error.message })
  }
})

// PUT /api/enquiries/:id/reject - Item owner declines match request
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })

    if (String(enquiry.itemOwnerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the item owner can reject.' })
    }

    if (enquiry.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject an enquiry with status '${enquiry.status}'.` })
    }

    enquiry.status = 'rejected'
    await enquiry.save()

    const notification = await Notification.create({
      recipientId: enquiry.senderId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: enquiry.itemId,
      itemTitle: enquiry.itemTitle,
      enquiryId: enquiry._id,
      type: 'match_rejected',
      title: `Request Declined for "${enquiry.itemTitle}"`,
      message: `${req.user.name} declined your match request.`,
      link: `/enquiry/${enquiry._id}`,
      read: false,
    })

    emitToUser(enquiry.senderId, 'notification', notification)
    emitToUser(enquiry.senderId, 'enquiry_updated', enquiry)
    emitToChatRoom(enquiry._id, 'enquiry_updated', enquiry)

    res.json({ success: true, enquiry })
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject enquiry.', error: error.message })
  }
})

// PUT /api/enquiries/:id/handover - Finder confirms handover
router.put('/:id/handover', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })

    const isSender = String(enquiry.senderId) === String(req.user._id)
    const isItemOwner = String(enquiry.itemOwnerId) === String(req.user._id)

    if (!isSender && !isItemOwner) {
      return res.status(403).json({ message: 'Unauthorized.' })
    }

    // If itemType is 'lost': sender is the finder, itemOwner is the owner who lost it
    // If itemType is 'found': itemOwner is the finder, sender is the owner claiming it
    const isFinder = enquiry.itemType === 'lost' ? isSender : isItemOwner
    if (!isFinder) {
      return res.status(403).json({ message: 'Only the finder can mark the item as handed over.' })
    }

    if (!['accepted', 'handed_over'].includes(enquiry.status)) {
      return res.status(400).json({ message: 'Handover can only be marked on active accepted conversations.' })
    }

    enquiry.finderConfirmed = true

    let isNowCompleted = false
    if (enquiry.finderConfirmed && enquiry.ownerConfirmed) {
      enquiry.status = 'completed'
      isNowCompleted = true
      await Item.findByIdAndUpdate(enquiry.itemId, { status: 'recovered' })
    } else {
      enquiry.status = 'handed_over'
    }
    await enquiry.save()

    // Determine recipient to notify
    const recipientId = enquiry.itemType === 'lost'
      ? (isFinder ? enquiry.itemOwnerId : enquiry.senderId)
      : (isFinder ? enquiry.senderId : enquiry.itemOwnerId)

    const notification = await Notification.create({
      recipientId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: enquiry.itemId,
      itemTitle: enquiry.itemTitle,
      enquiryId: enquiry._id,
      type: isNowCompleted ? 'recovery_complete' : 'handover',
      title: isNowCompleted
        ? `Item "${enquiry.itemTitle}" Recovered! 🎉`
        : `Handover Marked for "${enquiry.itemTitle}"`,
      message: isNowCompleted
        ? 'Both parties have confirmed the handover. The item report is now marked as recovered!'
        : `${req.user.name} has marked the item as handed over. Please confirm receipt to complete the recovery.`,
      link: `/chat/${enquiry._id}`,
      read: false,
    })

    emitToUser(recipientId, 'notification', notification)
    emitToUser(recipientId, 'enquiry_updated', enquiry)
    emitToChatRoom(enquiry._id, 'enquiry_updated', enquiry)

    res.json({ success: true, enquiry })
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark handover.', error: error.message })
  }
})

// PUT /api/enquiries/:id/confirm-receipt - Owner confirms receipt
router.put('/:id/confirm-receipt', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found.' })

    const isSender = String(enquiry.senderId) === String(req.user._id)
    const isItemOwner = String(enquiry.itemOwnerId) === String(req.user._id)

    if (!isSender && !isItemOwner) {
      return res.status(403).json({ message: 'Unauthorized.' })
    }

    // If itemType is 'lost': itemOwner is the owner who lost it
    // If itemType is 'found': sender is the owner claiming it
    const isOwnerParty = enquiry.itemType === 'lost' ? isItemOwner : isSender
    if (!isOwnerParty) {
      return res.status(403).json({ message: 'Only the item owner can confirm receipt.' })
    }

    if (!['accepted', 'handed_over'].includes(enquiry.status)) {
      return res.status(400).json({ message: 'Can only confirm receipt on active accepted conversations.' })
    }

    enquiry.ownerConfirmed = true

    let isNowCompleted = false
    if (enquiry.finderConfirmed && enquiry.ownerConfirmed) {
      enquiry.status = 'completed'
      isNowCompleted = true
      await Item.findByIdAndUpdate(enquiry.itemId, { status: 'recovered' })
    } else {
      enquiry.status = 'handed_over'
    }
    await enquiry.save()

    // Determine recipient to notify
    const recipientId = enquiry.itemType === 'lost'
      ? (isOwnerParty ? enquiry.senderId : enquiry.itemOwnerId)
      : (isOwnerParty ? enquiry.itemOwnerId : enquiry.senderId)

    const notification = await Notification.create({
      recipientId,
      senderId: req.user._id,
      senderName: req.user.name,
      itemId: enquiry.itemId,
      itemTitle: enquiry.itemTitle,
      enquiryId: enquiry._id,
      type: isNowCompleted ? 'recovery_complete' : 'handover',
      title: isNowCompleted
        ? `Item "${enquiry.itemTitle}" Recovered! 🎉`
        : `Receipt Confirmed for "${enquiry.itemTitle}"`,
      message: isNowCompleted
        ? 'Both parties have confirmed the handover. The item report is now marked as recovered!'
        : `${req.user.name} confirmed receiving the item. Please confirm handover to complete recovery.`,
      link: `/chat/${enquiry._id}`,
      read: false,
    })

    emitToUser(recipientId, 'notification', notification)
    emitToUser(recipientId, 'enquiry_updated', enquiry)
    emitToChatRoom(enquiry._id, 'enquiry_updated', enquiry)

    res.json({ success: true, enquiry })
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm receipt.', error: error.message })
  }
})

// PUT /api/enquiries/:id/status - Update enquiry status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const { status } = req.body
    if (!['pending', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' })
    }

    const enquiry = await Enquiry.findById(req.params.id)
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' })
    }

    const isOwner = String(enquiry.itemOwnerId) === String(req.user._id)
    const isSender = String(enquiry.senderId) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isSender && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized.' })
    }

    enquiry.status = status
    await enquiry.save()

    res.json({ success: true, enquiry })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update enquiry status.', error: error.message })
  }
})

export default router
