// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  Home,
  Activity,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  Users,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'
import './Navbar.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const menuRef = useRef(null)
  const btnRef = useRef(null)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function handleLogout() {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          {/* Logo — extreme left aligned with Chitkara University brand tag */}
          <Link to="/" className="navbar-logo" aria-label="UFind Chitkara University">
            <span className="navbar-logo-icon" aria-hidden="true">
              <Search size={18} strokeWidth={2.5} />
            </span>
            <div className="navbar-logo-text-group">
              <span className="navbar-logo-name">U<span>Find</span></span>
              <span className="navbar-logo-campus">Chitkara University</span>
            </div>
          </Link>

          {/* Right side actions */}
          <div className="navbar-right">
            {isAuthenticated ? (
              isAdmin ? (
                /* Admin Desktop actions: Admin Dashboard link (no student reporting buttons) */
                <div className="navbar-actions">
                  <button
                    className="btn btn-primary btn-sm admin-nav-btn"
                    onClick={() => navigate('/admin')}
                    aria-label="Admin Dashboard"
                  >
                    <Shield size={14} /> Admin Dashboard
                  </button>
                </div>
              ) : (
                /* Student Desktop actions */
                <div className="navbar-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/report/lost')}
                    aria-label="Report a lost item"
                  >
                    I Lost Something
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/report/found')}
                    aria-label="Report a found item"
                  >
                    I Found Something
                  </button>
                  <NotificationDropdown />
                </div>
              )
            ) : (
              /* Unauthenticated desktop actions */
              <div className="navbar-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/login')}
                  aria-label="Log in to your account"
                >
                  Login
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/signup')}
                  aria-label="Create a new account"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Hamburger — always visible */}
            <div className="navbar-hamburger-wrap" style={{ position: 'relative' }}>
              <button
                ref={btnRef}
                className={`navbar-hamburger-btn${menuOpen ? ' active' : ''}`}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                onClick={() => setMenuOpen(v => !v)}
              >
                <span className="hamburger-line" />
                <span className="hamburger-line" />
                <span className="hamburger-line" />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="navbar-dropdown"
                  role="dialog"
                  aria-label="Navigation menu"
                >
                  {isAuthenticated && (
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar" aria-hidden="true">{initials}</div>
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">{user.name}</span>
                        <span className="dropdown-user-role-badge">
                          {isAdmin ? 'Administrator' : 'Student'}
                        </span>
                      </div>
                    </div>
                  )}

                  <nav className="dropdown-nav" aria-label="Dropdown navigation">
                    {isAdmin ? (
                      /* Admin Hamburger Options */
                      <>
                        <NavLink
                          to="/admin"
                          end
                          className={({ isActive }) =>
                            `dropdown-link${isActive && !location.search ? ' active' : ''}`
                          }
                          onClick={() => setMenuOpen(false)}
                        >
                          <Shield size={16} aria-hidden="true" /> Dashboard
                        </NavLink>
                        <NavLink
                          to="/admin?tab=users"
                          className={`dropdown-link${location.search.includes('tab=users') ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Users size={16} aria-hidden="true" /> Users
                        </NavLink>
                        <NavLink
                          to="/admin?tab=reports"
                          className={`dropdown-link${location.search.includes('tab=reports') ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <FileText size={16} aria-hidden="true" /> Reports
                        </NavLink>
                        <div className="dropdown-divider" role="separator" />
                        <button
                          className="dropdown-link dropdown-logout"
                          onClick={handleLogout}
                        >
                          <LogOut size={16} aria-hidden="true" /> Logout
                        </button>
                      </>
                    ) : isAuthenticated ? (
                      /* Student Hamburger Options */
                      <>
                        <NavLink
                          to="/"
                          end
                          className={({ isActive }) => `dropdown-link${isActive ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Home size={16} aria-hidden="true" /> Home
                        </NavLink>
                        <NavLink
                          to="/activity"
                          className={({ isActive }) => `dropdown-link${isActive && !location.search.includes('tab=') ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Activity size={16} aria-hidden="true" /> My Activity
                        </NavLink>
                        <NavLink
                          to="/activity?tab=chats"
                          className={`dropdown-link${location.search.includes('tab=chats') || location.search.includes('tab=conversations') ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <MessageSquare size={16} aria-hidden="true" /> Conversations
                        </NavLink>
                        <NavLink
                          to="/profile"
                          className={({ isActive }) => `dropdown-link${isActive ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <User size={16} aria-hidden="true" /> My Profile
                        </NavLink>
                        <div className="dropdown-divider" role="separator" />
                        <button
                          className="dropdown-link dropdown-logout"
                          onClick={handleLogout}
                        >
                          <LogOut size={16} aria-hidden="true" /> Logout
                        </button>
                      </>
                    ) : (
                      /* Guest Hamburger Options */
                      <>
                        <NavLink
                          to="/"
                          end
                          className={({ isActive }) => `dropdown-link${isActive ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Home size={16} aria-hidden="true" /> Home
                        </NavLink>
                        <div className="dropdown-divider" role="separator" />
                        <NavLink
                          to="/login"
                          className={({ isActive }) => `dropdown-link${isActive ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <LogIn size={16} aria-hidden="true" /> Login
                        </NavLink>
                        <NavLink
                          to="/signup"
                          className={({ isActive }) => `dropdown-link${isActive ? ' active' : ''}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          <UserPlus size={16} aria-hidden="true" /> Sign Up
                        </NavLink>
                      </>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
