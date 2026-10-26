// src/utils/api.js
// Client API for communicating with the UFind Express + MongoDB backend

const API_BASE = '/api'
const TOKEN_KEY = 'ufind_token'
const USER_KEY = 'ufind_user'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {}
}

export function clearAuth() {
  setToken(null)
  setCachedUser(null)
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  // Auth
  login: credentials =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  signup: userData =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => request('/auth/me'),

  updateProfile: profileData =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // Items
  getItems: (params = {}) => {
    const query = new URLSearchParams()
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.category) query.set('category', params.category)
    if (params.q) query.set('q', params.q)
    if (params.includeSample) query.set('includeSample', 'true')
    const qs = query.toString()
    return request(`/items${qs ? `?${qs}` : ''}`)
  },

  getItemById: id => request(`/items/${id}`),

  createItem: itemData =>
    request('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),

  updateItem: (id, updates) =>
    request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteItem: id =>
    request(`/items/${id}`, {
      method: 'DELETE',
    }),

  getMyItems: () => request('/items/user/me'),

  // AI Assistant Chat & Real-Time Item Search
  assistantChat: ({ message }) =>
    request('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Enquiries & Inquiries (Two-way communications with the real item owner)
  createEnquiry: enquiryData =>
    request('/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiryData),
    }),

  getIncomingEnquiries: () => request('/enquiries/incoming'),

  getOutgoingEnquiries: () => request('/enquiries/outgoing'),

  replyEnquiry: (id, message) =>
    request(`/enquiries/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  updateEnquiryStatus: (id, status) =>
    request(`/enquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getEnquiryById: id => request(`/enquiries/${id}`),

  acceptEnquiry: id =>
    request(`/enquiries/${id}/accept`, {
      method: 'PUT',
    }),

  rejectEnquiry: id =>
    request(`/enquiries/${id}/reject`, {
      method: 'PUT',
    }),

  markHandover: id =>
    request(`/enquiries/${id}/handover`, {
      method: 'PUT',
    }),

  confirmReceipt: id =>
    request(`/enquiries/${id}/confirm-receipt`, {
      method: 'PUT',
    }),

  // Notifications
  getNotifications: () => request('/notifications'),

  getUnreadNotificationCount: () => request('/notifications/unread-count'),

  markNotificationRead: id =>
    request(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    request('/notifications/mark-all-read', {
      method: 'PUT',
    }),

  deleteNotification: id =>
    request(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Legacy Claims compatibility
  getMyClaims: () => request('/claims/user/me'),

  createClaim: claimData =>
    request('/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    }),

  // Admin APIs (Enforced on backend with requireAdmin)
  admin: {
    getStats: () => request('/admin/stats'),
    getUsers: () => request('/admin/users'),
    deleteUser: id => request(`/admin/users/${id}`, { method: 'DELETE' }),
    getItems: (params = {}) => {
      const query = new URLSearchParams(params).toString()
      return request(`/admin/items${query ? `?${query}` : ''}`)
    },
    updateItemStatus: (id, status) =>
      request(`/admin/items/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    deleteItem: id => request(`/admin/items/${id}`, { method: 'DELETE' }),
    getClaims: () => request('/admin/claims'),
    updateClaimStatus: (id, status) =>
      request(`/admin/claims/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
}
