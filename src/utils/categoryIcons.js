// src/utils/categoryIcons.js
// Returns icon metadata, color, and background tint for each category.

export const CATEGORY_META = {
  'All':         { icon: 'LayoutGrid', color: '#3d6b4f', bg: '#eef5f0' },
  'Electronics': { icon: 'Laptop',     color: '#2563eb', bg: '#eff6ff' },
  'ID Cards':    { icon: 'CreditCard', color: '#7c3aed', bg: '#f5f3ff' },
  'Bags':        { icon: 'ShoppingBag',color: '#059669', bg: '#ecfdf5' },
  'Books':       { icon: 'BookOpen',   color: '#d97706', bg: '#fffbeb' },
  'Keys':        { icon: 'Key',        color: '#0891b2', bg: '#ecfeff' },
  'Accessories': { icon: 'Watch',      color: '#e11d48', bg: '#fff1f2' },
  'Other':       { icon: 'Package',    color: '#64748b', bg: '#f1f5f9' },
}

export function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? CATEGORY_META['Other']
}
