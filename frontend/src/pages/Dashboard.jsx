import { useState, useEffect } from 'react'
import { dashboardAPI } from '../services/api'

const fmt = (n) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtKes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Dashboard({ navigate }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get()
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const d = data || {}

  const statGroups = [
    {
      title: 'Suppliers & Items',
      stats: [
        { label: 'Total Suppliers',   value: fmt(d.total_suppliers),   icon: 'bi-building',      color: 'blue'   },
        { label: 'Active Suppliers',  value: fmt(d.active_suppliers),  icon: 'bi-check-circle',  color: 'green'  },
        { label: 'Active Items',      value: fmt(d.total_items),       icon: 'bi-archive',       color: 'blue'   },
        { label: 'Low Stock Items',   value: fmt(d.low_stock_items),   icon: 'bi-exclamation-triangle', color: 'orange' },
      ]
    },
    {
      title: 'Procurement',
      stats: [
        { label: 'Pending PRs',       value: fmt(d.pending_requisitions),  icon: 'bi-file-earmark-text', color: 'orange' },
        { label: 'Approved PRs',      value: fmt(d.approved_requisitions), icon: 'bi-file-check',        color: 'green'  },
        { label: 'Open POs',          value: fmt(d.open_purchase_orders),  icon: 'bi-bag-check',         color: 'blue'   },
        { label: 'Pending GRNs',      value: fmt(d.pending_grns),          icon: 'bi-box-seam',          color: 'purple' },
      ]
    },
    {
      title: 'Finance',
      stats: [
        { label: 'Pending Invoices',  value: fmt(d.pending_invoices),      icon: 'bi-receipt',           color: 'orange' },
        { label: 'Overdue Invoices',  value: fmt(d.overdue_invoices),      icon: 'bi-exclamation-circle',color: 'red'    },
        { label: 'PO Value (Month)',  value: fmtKes(d.total_po_value_month), icon: 'bi-graph-up-arrow',  color: 'blue', small: true },
        { label: 'Paid (Month)',      value: fmtKes(d.total_paid_month),     icon: 'bi-cash-stack',      color: 'green', small: true },
      ]
    }
  ]

  const quickLinks = [
    { label: 'New Requisition',    icon: 'bi-plus-circle',     page: 'requisitions',    color: 'var(--red)' },
    { label: 'Create Purchase Order', icon: 'bi-bag-plus',    page: 'purchase-orders', color: '#2563EB' },
    { label: 'Record GRN',         icon: 'bi-box-arrow-in-down', page: 'grns',         color: '#7C3AED' },
    { label: 'Process Invoice',    icon: 'bi-receipt',         page: 'invoices',        color: '#059669' },
  ]

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--red) 0%, #B8000E 100%)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: 'white', overflow: 'hidden', position: 'relative'
      }}>
        <div style={{
          position:'absolute', right:-40, top:-40, width:200, height:200,
          background:'rgba(255,255,255,.06)', borderRadius:'50%'
        }}/>
        <div style={{
          position:'absolute', right:60, bottom:-60, width:160, height:160,
          background:'rgba(255,255,255,.04)', borderRadius:'50%'
        }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>
            Good {getGreeting()}, Procurement Team 👋
          </h2>
          <p style={{ fontSize:14, opacity:.8 }}>
            Here's what's happening across Coca-Cola Kenya's procurement today.
          </p>
        </div>
        <div style={{
          background:'rgba(255,255,255,.15)', borderRadius:12, padding:'12px 20px',
          fontSize:13, fontWeight:600, position:'relative', zIndex:1, flexShrink:0
        }}>
          <div style={{ opacity:.75, fontSize:11, marginBottom:2 }}>Today</div>
          {new Date().toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:28 }}>
        <h3 style={{ fontSize:13, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
          Quick Actions
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {quickLinks.map(q => (
            <button key={q.page} onClick={() => navigate(q.page)} style={{
              background:'white', border:'1px solid var(--gray-200)', borderRadius:12,
              padding:'16px', display:'flex', alignItems:'center', gap:12,
              cursor:'pointer', transition:'all var(--transition)', textAlign:'left',
              fontFamily:'var(--font-body)'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform='' }}
            >
              <div style={{
                width:38, height:38, borderRadius:10, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:18, color:q.color,
                background: q.color + '18'
              }}>
                <i className={`bi ${q.icon}`}/>
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--gray-800)' }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {statGroups.map(group => (
        <div key={group.title} style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
            {group.title}
          </h3>
          <div className="stats-grid">
            {group.stats.map(s => (
              <div key={s.label} className="stat-card">
                <div className={`stat-icon ${s.color || 'blue'}`}>
                  <i className={`bi ${s.icon}`} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: s.small ? 16 : 26 }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}