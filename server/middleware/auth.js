import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' })
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET || 'ufind_super_secret_jwt_key_2026_secure'

    const decoded = jwt.verify(token, secret)
    const user = await User.findById(decoded.id).select('-passwordHash')

    if (!user) {
      return res.status(401).json({ message: 'User belonging to this token no longer exists.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.', error: error.message })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin privileges required.' })
  }
  next()
}
