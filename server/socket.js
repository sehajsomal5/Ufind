import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Enquiry } from './models/Enquiry.js'
import { User } from './models/User.js'

let io = null

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  })

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token
      if (!token) {
        return next()
      }

      const secret = process.env.JWT_SECRET || 'ufind_super_secret_jwt_key_2026_secure'
      const decoded = jwt.verify(token, secret)
      let userName = decoded.name
      if (!userName && decoded.id) {
        try {
          const u = await User.findById(decoded.id).select('name email')
          if (u) userName = u.name
        } catch {}
      }
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        name: userName || decoded.email,
        role: decoded.role,
      }
      next()
    } catch (err) {
      next()
    }
  })

  io.on('connection', socket => {
    if (socket.user?.id) {
      const room = `user_${socket.user.id}`
      socket.join(room)
      console.log(`[Socket.IO] User ${socket.user.id} (${socket.user.name || socket.user.email}) connected to room ${room}`)
    }

    // Support explicit join
    socket.on('join_user_room', userId => {
      if (userId) {
        const room = `user_${userId}`
        socket.join(room)
        console.log(`[Socket.IO] Socket ${socket.id} joined ${room}`)
      }
    })

    // Chat room join with authorization check
    socket.on('join_chat_room', async (enquiryId) => {
      if (!socket.user?.id || !enquiryId) return
      try {
        const enquiry = await Enquiry.findById(enquiryId)
        if (!enquiry) {
          socket.emit('error', { message: 'Conversation not found.' })
          return
        }

        const isOwner = String(enquiry.itemOwnerId?._id || enquiry.itemOwnerId) === String(socket.user.id)
        const isSender = String(enquiry.senderId?._id || enquiry.senderId) === String(socket.user.id)

        if (!isOwner && !isSender) {
          console.warn(`[Socket.IO] Unauthorized join_chat_room attempt by ${socket.user.id} on ${enquiryId}`)
          socket.emit('error', { message: 'Unauthorized. You are not a participant in this conversation.' })
          return
        }

        const room = `chat_${enquiryId}`
        socket.join(room)
        console.log(`[Socket.IO] Authorized user ${socket.user.id} joined chat room ${room}`)
      } catch (err) {
        console.error('[Socket.IO] Error in join_chat_room:', err)
      }
    })

    socket.on('leave_chat_room', (enquiryId) => {
      if (!enquiryId) return
      const room = `chat_${enquiryId}`
      socket.leave(room)
      console.log(`[Socket.IO] Socket ${socket.id} left room ${room}`)
    })

    // Real-time chat messages with participant authorization check
    socket.on('chat_message', async (data) => {
      const enquiryId = data?.enquiryId
      const message = data?.message
      if (!socket.user?.id || !enquiryId || !message?.trim()) return

      try {
        const enquiry = await Enquiry.findById(enquiryId)
        if (!enquiry) {
          socket.emit('error', { message: 'Conversation not found.' })
          return
        }

        const isOwner = String(enquiry.itemOwnerId?._id || enquiry.itemOwnerId) === String(socket.user.id)
        const isSender = String(enquiry.senderId?._id || enquiry.senderId) === String(socket.user.id)

        if (!isOwner && !isSender) {
          socket.emit('error', { message: 'Unauthorized. You are not a participant in this conversation.' })
          return
        }

        if (!['accepted', 'handed_over'].includes(enquiry.status)) {
          socket.emit('error', { message: 'Conversation is not active.' })
          return
        }

        const room = `chat_${enquiryId}`
        const msgData = {
          enquiryId,
          senderId: socket.user.id,
          senderName: data.senderName || socket.user.name || socket.user.email,
          message: message.trim(),
          createdAt: new Date().toISOString(),
        }

        io.to(room).emit('chat_message', msgData)
        console.log(`[Socket.IO] Chat message in room ${room} from user ${socket.user.id}`)
      } catch (err) {
        console.error('[Socket.IO] Error in chat_message handler:', err)
      }
    })

    socket.on('typing', (enquiryId) => {
      if (!socket.user?.id || !enquiryId) return
      socket.to(`chat_${enquiryId}`).emit('typing', {
        enquiryId,
        userId: socket.user.id,
      })
    })

    socket.on('stop_typing', (enquiryId) => {
      if (!socket.user?.id || !enquiryId) return
      socket.to(`chat_${enquiryId}`).emit('stop_typing', {
        enquiryId,
        userId: socket.user.id,
      })
    })

    socket.on('disconnect', () => {
      // Disconnected
    })
  })

  return io
}

export function getIO() {
  return io
}

export function emitToUser(userId, event, data) {
  if (!io || !userId) return
  const room = `user_${userId.toString()}`
  io.to(room).emit(event, data)
  console.log(`[Socket.IO] Emitted event "${event}" to room "${room}"`)
}

export function emitToChatRoom(enquiryId, event, data) {
  if (!io || !enquiryId) return
  const room = `chat_${enquiryId.toString()}`
  io.to(room).emit(event, data)
  console.log(`[Socket.IO] Emitted event "${event}" to room "${room}"`)
}
