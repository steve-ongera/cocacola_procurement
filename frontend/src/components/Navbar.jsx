import { useState } from 'react'
import './Navbar.css'

const PAGE_TITLES = {
  dashboard:        { title: 'Dashboard',        subtitle: 'Overview & Key Metrics' },
  suppliers:        { title: 'Suppliers',         subtitle: 'Manage supplier database' },
  items:            { title: 'Items & Inventory', subtitle: 'Product catalogue & stock levels' },
  categories:       { title: 'Categories',        subtitle: 'Item classification' },
  requisitions:     { title: 'Purchase Requisitions', subtitle: 'Request & approval workflow' },
  'purchase-orders':{ title: 'Purchase Orders',   subtitle: 'Order management' },
  grns:             { title: 'Goods Received',    subtitle: 'Delivery & quality control' },
  invoices:         { title: 'Invoices',          subtitle: 'Supplier billing & payments' },
}

export default function Navbar({ onToggleSidebar, currentPage, user, onLogout }) {
  const [dropOpen, setDropOpen] = useState(false)
  const info = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="btn-icon" onClick={onToggleSidebar}>
          <i className="bi bi-list" style={{ fontSize: 20 }} />
        </button>
        <div className="navbar-breadcrumb">
          <h2 className="navbar-title">{info.title}</h2>
          <span className="navbar-sub">{info.subtitle}</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Date */}
        <div className="navbar-date">
          <i className="bi bi-calendar3" />
          <span>{new Date().toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</span>
        </div>

        {/* Notifications */}
        <button className="btn-icon" style={{ position:'relative' }}>
          <i className="bi bi-bell" style={{ fontSize: 17 }} />
          <span className="notif-dot" />
        </button>

        {/* User dropdown */}
        <div className="user-menu" onBlur={() => setTimeout(() => setDropOpen(false), 150)}>
          <button className="user-btn" onClick={() => setDropOpen(!dropOpen)}>
            <div className="user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username || 'User'}</span>
              <span className="user-role">Admin</span>
            </div>
            <i className="bi bi-chevron-down" style={{ fontSize: 11, color: 'var(--gray-400)' }} />
          </button>

          {dropOpen && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="user-avatar lg">{user?.username?.[0]?.toUpperCase()}</div>
                <div>
                  <p style={{ fontWeight:700, fontSize:14 }}>{user?.username}</p>
                  <p style={{ fontSize:12, color:'var(--gray-400)' }}>Procurement Admin</p>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item">
                <i className="bi bi-person" /> Profile
              </button>
              <button className="dropdown-item">
                <i className="bi bi-gear" /> Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={onLogout}>
                <i className="bi bi-box-arrow-right" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}