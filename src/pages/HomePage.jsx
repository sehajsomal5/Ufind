
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import ItemCard from '../components/ItemCard.jsx'
import SearchAndFilters from '../components/SearchAndFilters.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LostItemIllustration from '../components/illustrations/LostItemIllustration.jsx'
import FoundItemIllustration from '../components/illustrations/FoundItemIllustration.jsx'
import { getPublicItems } from '../utils/storage.js'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, authLoading } = useAuth()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [activeStatus, setActiveStatus] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [items, setItems] = useState(() => getPublicItems())

  useEffect(() => {
    let mounted = true

    // Fetch real database items, including seeded sample records.
    api.getItems({ includeSample: true })
      .then(fetched => {
        if (!mounted) return

        const normalized = fetched.map(item => ({
          ...item,
          id: item._id || item.id,
          title: item.title || '',
          description: item.description || '',
          location: item.location || '',
          category: item.category || '',
        }))

        setItems(normalized)
      })
      .catch(error => {
        console.error('Failed to fetch items from the backend:', error)

        if (mounted) {
          setItems(getPublicItems())
        }
      })

    return () => {
      mounted = false
    }
  }, [refreshKey])

  // const allItems = items
  const allItems = items.filter(item => {
  const image = item.image || item.imageUrl || item.photo
  return typeof image === 'string' && image.trim() !== ''
})

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      const matchStatus =
        activeStatus === 'all' || item.status === activeStatus

      const matchCat =
        !activeCategory || item.category === activeCategory

      const q = query.trim().toLowerCase()

      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)

      return matchStatus && matchCat && matchQuery
    })
  }, [allItems, query, activeCategory, activeStatus])

  const counts = useMemo(() => ({
    all: allItems.length,
    lost: allItems.filter(item => item.status === 'lost').length,
    found: allItems.filter(item => item.status === 'found').length,
    recovered: allItems.filter(item => item.status === 'recovered').length,
  }), [allItems])

  const categoryCounts = useMemo(() => {
    const map = { '': allItems.length }

    allItems.forEach(item => {
      map[item.category] = (map[item.category] || 0) + 1
    })

    return map
  }, [allItems])

  function clearFilters() {
    setQuery('')
    setActiveCategory('')
    setActiveStatus('all')
  }

  function handleReportLost() {
    if (isAuthenticated) {
      navigate('/report/lost')
    } else {
      navigate('/login', {
        state: { from: { pathname: '/report/lost' } },
      })
    }
  }

  function handleReportFound() {
    if (isAuthenticated) {
      navigate('/report/found')
    } else {
      navigate('/login', {
        state: { from: { pathname: '/report/found' } },
      })
    }
  }

  if (authLoading) return null

  return (
    <main className="page">
      <div className="container">
        <section className="hero" aria-labelledby="hero-headline">
          <div className="hero-eyebrow" aria-hidden="true">
            <Sparkles size={12} /> Campus Lost &amp; Found
          </div>

          <h1 className="hero-headline" id="hero-headline">
            Lost something?<br />
            <em>Let's help you find it.</em>
          </h1>

          <p className="hero-sub">
            Report it in a few simple steps. Your campus community can help.
          </p>

          <div
            className="lost-found-section"
            role="region"
            aria-label="Lost and Found actions"
          >
            <article
              className="lf-card lf-card-lost"
              onClick={handleReportLost}
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleReportLost()
                }
              }}
              aria-label="Lost an Item? You can post a lost item here for easy recovery"
            >
              <div className="lf-card-illustration" aria-hidden="true">
                <LostItemIllustration className="lf-illustration-svg" />
              </div>

              <div className="lf-card-body">
                <div className="lf-card-text">
                  <h2 className="lf-card-title">Lost an Item?</h2>
                  <p className="lf-card-desc">
                    You can post a lost item here for easy recovery
                  </p>
                </div>

                <div className="lf-card-action">
                  <button
                    type="button"
                    className="lf-action-btn lf-btn-lost"
                    onClick={event => {
                      event.stopPropagation()
                      handleReportLost()
                    }}
                  >
                    Post It
                  </button>
                </div>
              </div>
            </article>

            <article
              className="lf-card lf-card-found"
              onClick={handleReportFound}
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleReportFound()
                }
              }}
              aria-label="Found an Item? Post a found item for the owner"
            >
              <div className="lf-card-illustration" aria-hidden="true">
                <FoundItemIllustration className="lf-illustration-svg" />
              </div>

              <div className="lf-card-body">
                <div className="lf-card-text">
                  <h2 className="lf-card-title">Found an Item?</h2>
                  <p className="lf-card-desc">
                    Post a found item so its owner can find it
                  </p>
                </div>

                <div className="lf-card-action">
                  <button
                    type="button"
                    className="lf-action-btn lf-btn-found"
                    onClick={event => {
                      event.stopPropagation()
                      handleReportFound()
                    }}
                  >
                    Post It
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="search-section" aria-label="Search and filter">
          <SearchAndFilters
            query={query}
            onQueryChange={setQuery}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            counts={counts}
            categoryCounts={categoryCounts}
          />
        </section>

        <section
          className="items-section"
          aria-labelledby="items-section-title"
        >
          <div className="section-header">
            <h2 className="section-title" id="items-section-title">
              Recently Reported Items
            </h2>

            <span className="section-count" aria-live="polite">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {allItems.length === 0 ? (
            <EmptyState
              title="No items reported yet"
              message="Be the first to report a lost or found item on campus."
              actions={
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    onClick={handleReportLost}
                  >
                    Report Lost Item
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleReportFound}
                  >
                    Report Found Item
                  </button>
                </div>
              }
            />
          ) : filtered.length > 0 ? (
            <div className="items-grid" role="list" aria-label="Item listings">
              {filtered.map(item => (
                <div key={item.id} role="listitem" className="items-grid-item">
                  <ItemCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No items match your search"
              message="Try different keywords or clear the filters to see all items."
              actions={
                <button className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              }
            />
          )}
        </section>
      </div>
    </main>
  )
}
