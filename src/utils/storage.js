// src/utils/storage.js
// Safe localStorage helpers for UFind.
// Items are now associated with a userId for user-scoped ownership.
// Sample data is preserved but excluded from real user listings.

import { SAMPLE_ITEMS } from '../data/sampleItems.js'

const ITEMS_KEY = 'ufind_items'
const CLAIMS_KEY = 'ufind_claims'

// ---- Items ----

export function getItems() {
  try {
    const raw = localStorage.getItem(ITEMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

// Returns only real (non-sample) items for public listing
export function getPublicItems() {
  return getItems().filter(i => !i.isSample)
}

export function saveItems(items) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
  } catch {
    // Storage quota exceeded
  }
}

export function addItem(item) {
  const items = getItems()
  const updated = [item, ...items]
  saveItems(updated)
  return updated
}

export function updateItem(id, changes) {
  const items = getItems()
  const updated = items.map(i => (i.id === id ? { ...i, ...changes } : i))
  saveItems(updated)
  return updated
}

export function deleteItem(id) {
  const items = getItems()
  const updated = items.filter(i => i.id !== id)
  saveItems(updated)
  return updated
}

export function getItemById(id) {
  // Check real items first, then sample items for backward compat
  const realItem = getItems().find(i => i.id === id)
  if (realItem) return realItem
  return SAMPLE_ITEMS.find(i => i.id === id) ?? null
}

// Returns items belonging to the given userId
export function getMyItems(userId) {
  if (!userId) return []
  return getItems().filter(i => i.userId === userId)
}

// Legacy: detect ownership by matching userId
export function isUserItem(item, userId) {
  if (!item || !userId) return false
  return item.userId === userId
}

// ---- Claims ----

export function getClaims() {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

// Returns claims made by the given userId
export function getMyClaims(userId) {
  if (!userId) return []
  return getClaims().filter(c => c.claimedByUserId === userId)
}

export function saveClaims(claims) {
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims))
  } catch {}
}

export function addClaim(claim) {
  const claims = getClaims()
  const updated = [{ ...claim, id: generateId(), timestamp: new Date().toISOString() }, ...claims]
  saveClaims(updated)
  return updated
}

// ---- Reset ----

export function resetDemo() {
  localStorage.removeItem(ITEMS_KEY)
  localStorage.removeItem(CLAIMS_KEY)
}

// ---- ID generator ----

export function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
