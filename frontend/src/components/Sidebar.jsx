import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'dashboard',      icon: 'bi-grid-1x2-fill',      label: 'Dashboard' },
  { id: 'divider-1',      divider: true,                  label: 'Procurement' },
  { id: 'requisitions',   icon: 'bi-file-earmark-text',  label: 'Requisitions' },
  { id: 'purchase-orders',icon: 'bi-bag-check',          label: 'Purchase Orders' },
  { id: 'grns',           icon: 'bi-box-seam',           label: 'Goods Receipt' },
  { id: 'invoices',       icon: 'bi-receipt',            label: 'Invoices' },
  { id: 'divider-2',      divider: true,                  label: 'Master Data' },
  { id: 'suppliers',      icon: 'bi-building',            label: 'Suppliers' },
  { id: 'items',          icon: 'bi-archive',             label: 'Items' },
  { id: 'categories',     icon: 'bi-tags',                label: 'Categories' },
]

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#E30613"/>
            <path d="M8 10c1.5-1 3.5-1.5 6-1.5 3 0 5.5 1 5.5 3 0 1.5-1.5 2.5-3.5 3 2 .5 4 1.5 4 3.5 0 2.5-2.5 3.5-6 3.5-2.5 0-4.5-.5-6-1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-name">Coca-Cola</span>
            <span className="logo-sub">Procurement</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.divider) {
            return collapsed ? (
              <div key={item.id} className="nav-divider-line" />
            ) : (
              <div key={item.id} className="nav-divider">
                <span>{item.label}</span>
              </div>
            )
          }
          return (
            <button
              key={item.id}
              className={`nav-item${currentPage === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <i className={`bi ${item.icon}`} />
              {!collapsed && <span>{item.label}</span>}
              {currentPage === item.id && <div className="nav-active-bar" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-version">
            <i className="bi bi-shield-check" style={{ color: '#10B981' }} />
            <span>Procurement v1.0</span>
          </div>
        </div>
      )}
    </aside>
  )
}