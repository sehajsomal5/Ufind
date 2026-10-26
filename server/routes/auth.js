import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'ufind_super_secret_jwt_key_2026_secure'
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role },
    secret,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/signup - Public registration (ALWAYS creates student/user role)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, college } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: trimmedEmail })
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Security requirement: public registration MUST ALWAYS create a 'student' account
    const user = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      passwordHash,
      college: (college || '').trim(),
      role: 'student',
    })

    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ message: 'Registration failed.', error: error.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: trimmedEmail })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' })
    }

    const token = generateToken(user)

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed.', error: error.message })
  }
})

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      college: req.user.college,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  })
})

// PUT /api/auth/profile - Update profile details
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, college } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    if (name) user.name = name.trim()
    if (college !== undefined) user.college = college.trim()

    await user.save()

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile.', error: error.message })
  }
})

export default router
