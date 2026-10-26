// src/components/SearchAndFilters.jsx
import {
  Search,
  X,
  LayoutGrid,
  Laptop,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Key,
  Watch,
  Package,
} from 'lucide-react'
import { CATEGORIES } from '../data/sampleItems.js'
import { getCategoryMeta } from '../utils/categoryIcons.js'
import './SearchAndFilters.css'

const CATEGORY_ICONS = {
  LayoutGrid,
  Laptop,
  CreditCard,
  ShoppingBag,
  BookOpen,
  Key,
  Watch,
  Package,
}

const ALL_CATEGORIES = ['All', ...CATEGORIES]

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'lost', label: 'Lost' },
  { value: 'found', label: 'Found' },
  { value: 'recovered', label: 'Recovered' },
]

export default function SearchAndFilters({
  query,
  onQueryChange,
  activeCategory,
  onCategoryChange,
  activeStatus,
  onStatusChange,
  counts = {},
  categoryCounts = {},
}) {
  return (
    <div className="search-filters" role="search" aria-label="Search and filter items">
      {/* Search box */}
      <div className="search-box-wrapper">
        <span className="search-box-icon" aria-hidden="true">
          <Search size={18} />
        </span>
        <input
          type="search"
          className="search-box"
          placeholder="Search for an item, e.g. blue bottle or ID card"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          aria-label="Search items"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="status-tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            className={`status-tab${activeStatus === tab.value ? ' active' : ''}`}
            role="tab"
            aria-selected={activeStatus === tab.value}
            onClick={() => onStatusChange(tab.value)}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Category Section (Image 1 Style Cards with Uniform Box Sizes) */}
      <div className="category-section">
        <div className="category-section-header">
          <span className="filter-label">Categories</span>
          {activeCategory && (
            <button
              type="button"
              className="category-reset-btn"
              onClick={() => onCategoryChange('')}
            >
              Show All
            </button>
          )}
        </div>

        <div className="category-cards-grid" role="group" aria-label="Filter by category">
          {ALL_CATEGORIES.map(cat => {
            const isAll = cat === 'All'
            const isActive = isAll ? activeCategory === '' : activeCategory === cat
            const meta = getCategoryMeta(cat)
            const IconComp = CATEGORY_ICONS[meta.icon] || Package
            const count = isAll ? (categoryCounts[''] ?? 0) : (categoryCounts[cat] ?? 0)

            return (
              <button
                key={cat}
                type="button"
                className={`category-card${isActive ? ' active' : ''}`}
                onClick={() => onCategoryChange(isAll ? '' : (activeCategory === cat ? '' : cat))}
                aria-pressed={isActive}
                aria-label={`${cat} category, ${count} item${count !== 1 ? 's' : ''}`}
              >
                <div
                  className="category-icon-wrapper"
                  style={{ backgroundColor: meta.bg }}
                  aria-hidden="true"
                >
                  <IconComp size={24} color={meta.color} strokeWidth={2.2} />
                </div>
                <span className="category-card-name">{cat}</span>
                <span className="category-card-count">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
