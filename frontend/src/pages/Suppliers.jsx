import { useState, useEffect } from 'react'
import { suppliersAPI } from '../services/api'

const STATUS_BADGE = {
  active:      'badge-success',
  inactive:    'badge-secondary',
  blacklisted: 'badge-danger',
}

const EMPTY_FORM = {
  name:'', code:'', email:'', phone:'', address:'', contact_person:'',
  status:'active', tax_id:'', payment_terms: 30
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal]         = useState(null) // null | 'create' | supplier obj
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    suppliersAPI.list(`?${params}`)
      .then(d => setSuppliers(d.results || d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, statusFilter])

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setModal('create') }
  const openEdit   = (s)  => { setForm({...s});    setError(''); setModal(s) }
  const closeModal = ()   => setModal(null)

  const save = async () => {
    setSaving(true); setError('')
    try {
      if (modal === 'create') await suppliersAPI.create(form)
      else                    await suppliersAPI.update(modal.id, form)
      closeModal(); load()
    } catch (e) {
      setError('Failed to save. Check all fields.')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this supplier?')) return
    await suppliersAPI.delete(id)
    load()
  }

  const changeStatus = async (id, status) => {
    await suppliersAPI.changeStatus(id, status)
    load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p>Manage your supplier database</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-body" style={{ padding:'14px 20px' }}>
          <div className="filters-row">
            <div className="search-bar">
              <i className="bi bi-search" />
              <input placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={{ width:'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
            <span style={{ fontSize:13, color:'var(--gray-400)', marginLeft:'auto' }}>
              {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading"><div className="spinner"/></div>
          ) : suppliers.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-building" />
              <p>No suppliers found</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Contact Person</th>
                  <th>Email</th><th>Phone</th><th>Payment Terms</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td><code style={{ background:'var(--gray-100)', padding:'2px 7px', borderRadius:4, fontSize:12 }}>{s.code}</code></td>
                    <td style={{ fontWeight:600 }}>{s.name}</td>
                    <td>{s.contact_person}</td>
                    <td><a href={`mailto:${s.email}`} style={{ color:'var(--red)', textDecoration:'none' }}>{s.email}</a></td>
                    <td>{s.phone}</td>
                    <td>{s.payment_terms} days</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status]}`}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(s)}>
                          <i className="bi bi-pencil" />
                        </button>
                        {s.status !== 'blacklisted' && (
                          <button className="btn-icon" title="Blacklist" onClick={() => changeStatus(s.id, 'blacklisted')}>
                            <i className="bi bi-slash-circle" style={{ color:'#DC2626' }} />
                          </button>
                        )}
                        {s.status === 'blacklisted' && (
                          <button className="btn-icon" title="Activate" onClick={() => changeStatus(s.id, 'active')}>
                            <i className="bi bi-check-circle" style={{ color:'#059669' }} />
                          </button>
                        )}
                        <button className="btn-icon" title="Delete" onClick={() => remove(s.id)}>
                          <i className="bi bi-trash" style={{ color:'#DC2626' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              {error && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>{error}</div>}
              <div className="grid-2">
                <div className="form-group"><label>Supplier Name *</label><input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Kenpoly Ltd"/></div>
                <div className="form-group"><label>Supplier Code *</label><input value={form.code} onChange={e=>f('code',e.target.value)} placeholder="e.g. SUP-001"/></div>
                <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e=>f('email',e.target.value)}/></div>
                <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="+254 700 000 000"/></div>
                <div className="form-group"><label>Contact Person *</label><input value={form.contact_person} onChange={e=>f('contact_person',e.target.value)}/></div>
                <div className="form-group"><label>Tax ID (KRA PIN)</label><input value={form.tax_id} onChange={e=>f('tax_id',e.target.value)} placeholder="A000000000A"/></div>
                <div className="form-group"><label>Payment Terms (days)</label><input type="number" value={form.payment_terms} onChange={e=>f('payment_terms',Number(e.target.value))} min={0}/></div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>f('status',e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Address</label><textarea value={form.address} onChange={e=>f('address',e.target.value)} rows={3}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}