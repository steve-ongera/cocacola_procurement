import { useState, useEffect } from 'react'
import { itemsAPI, categoriesAPI } from '../services/api'

const UNITS = ['kg','ltr','pcs','box','crate','ton']
const UNIT_LABEL = { kg:'Kilogram', ltr:'Litre', pcs:'Pieces', box:'Box', crate:'Crate', ton:'Ton' }

const EMPTY = {
  name:'', sku:'', category:'', description:'', unit:'pcs',
  unit_price:'', reorder_level:0, current_stock:0, is_active:true
}

export default function Items() {
  const [items, setItems]         = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [tab, setTab]             = useState('all') // 'all' | 'low'

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)    params.set('search', search)
    if (catFilter) params.set('category', catFilter)
    const fetchFn = tab === 'low' ? itemsAPI.lowStock : () => itemsAPI.list(`?${params}`)
    fetchFn().then(d => setItems(d.results || d)).catch(()=>{}).finally(()=>setLoading(false))
  }

  useEffect(() => { load() }, [search, catFilter, tab])
  useEffect(() => {
    categoriesAPI.list().then(d => setCats(d.results || d)).catch(()=>{})
  }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit   = (i)  => { setForm({...i, category: i.category}); setModal(i) }
  const closeModal = ()   => setModal(null)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') await itemsAPI.create(form)
      else await itemsAPI.update(modal.id, form)
      closeModal(); load()
    } catch {} finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this item?')) return
    await itemsAPI.delete(id); load()
  }

  const stockColor = (item) => {
    if (item.current_stock === 0)                    return '#DC2626'
    if (item.current_stock <= item.reorder_level)    return '#D97706'
    return '#059669'
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Items & Inventory</h1><p>Product catalogue and stock management</p></div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Add Item
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','All Items'],['low','Low Stock']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{
            padding:'7px 16px', borderRadius:8, border:'1px solid',
            borderColor: tab===k ? 'var(--red)' : 'var(--gray-200)',
            background: tab===k ? 'var(--red-pale)' : 'white',
            color: tab===k ? 'var(--red)' : 'var(--gray-600)',
            fontWeight: tab===k ? 700 : 500, fontSize:13, cursor:'pointer',
            fontFamily:'var(--font-body)'
          }}>{l}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ padding:'12px 18px' }}>
          <div className="filters-row">
            <div className="search-bar">
              <i className="bi bi-search"/>
              <input placeholder="Search by name or SKU…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select style={{width:'auto'}} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:'auto'}}>{items.length} items</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : items.length===0 ? <div className="empty-state"><i className="bi bi-archive"/><p>No items found</p></div>
          : (
            <table>
              <thead>
                <tr><th>SKU</th><th>Name</th><th>Category</th><th>Unit</th><th>Unit Price (KES)</th><th>Stock</th><th>Reorder Lvl</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map(item=>(
                  <tr key={item.id}>
                    <td><code style={{background:'var(--gray-100)',padding:'2px 7px',borderRadius:4,fontSize:12}}>{item.sku}</code></td>
                    <td style={{fontWeight:600}}>{item.name}</td>
                    <td>{item.category_name}</td>
                    <td>{UNIT_LABEL[item.unit] || item.unit}</td>
                    <td style={{fontWeight:600}}>{Number(item.unit_price).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
                    <td>
                      <span style={{
                        fontWeight:700, color:stockColor(item),
                        background:stockColor(item)+'18', padding:'3px 10px',
                        borderRadius:99, fontSize:13
                      }}>
                        {item.current_stock} {item.unit}
                      </span>
                    </td>
                    <td style={{color:'var(--gray-600)'}}>{item.reorder_level}</td>
                    <td>
                      <span className={`badge ${item.is_active?'badge-success':'badge-secondary'}`}>
                        {item.is_active?'Active':'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn-icon" title="Edit" onClick={()=>openEdit(item)}><i className="bi bi-pencil"/></button>
                        <button className="btn-icon" title="Delete" onClick={()=>remove(item.id)}><i className="bi bi-trash" style={{color:'#DC2626'}}/></button>
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
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>{modal==='create'?'Add Item':'Edit Item'}</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Item Name *</label><input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Sugar Cane Raw"/></div>
                <div className="form-group"><label>SKU *</label><input value={form.sku} onChange={e=>f('sku',e.target.value)} placeholder="e.g. ITM-001"/></div>
                <div className="form-group"><label>Category *</label>
                  <select value={form.category} onChange={e=>f('category',e.target.value)}>
                    <option value="">Select category</option>
                    {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Unit *</label>
                  <select value={form.unit} onChange={e=>f('unit',e.target.value)}>
                    {UNITS.map(u=><option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Unit Price (KES) *</label><input type="number" step="0.01" min="0" value={form.unit_price} onChange={e=>f('unit_price',e.target.value)}/></div>
                <div className="form-group"><label>Current Stock</label><input type="number" min="0" value={form.current_stock} onChange={e=>f('current_stock',Number(e.target.value))}/></div>
                <div className="form-group"><label>Reorder Level</label><input type="number" min="0" value={form.reorder_level} onChange={e=>f('reorder_level',Number(e.target.value))}/></div>
                <div className="form-group" style={{display:'flex',alignItems:'center',gap:10,paddingTop:22}}>
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e=>f('is_active',e.target.checked)} style={{width:'auto'}}/>
                  <label htmlFor="is_active" style={{margin:0}}>Active Item</label>
                </div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>f('description',e.target.value)}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}