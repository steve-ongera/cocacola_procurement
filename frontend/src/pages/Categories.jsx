import { useState, useEffect } from 'react'
import { categoriesAPI } from '../services/api'

const EMPTY = { name:'', code:'', description:'', parent:'' }

export default function Categories() {
  const [cats, setCats]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    categoriesAPI.list().then(d=>setCats(d.results||d)).catch(()=>{}).finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit   = (c)  => { setForm({...c, parent: c.parent||''}); setModal(c) }
  const closeModal = ()   => setModal(null)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, parent: form.parent || null }
      if (modal==='create') await categoriesAPI.create(payload)
      else await categoriesAPI.update(modal.id, payload)
      closeModal(); load()
    } catch {} finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this category?')) return
    await categoriesAPI.delete(id); load()
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Categories</h1><p>Organise items into categories</p></div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"/> Add Category</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : cats.length===0 ? <div className="empty-state"><i className="bi bi-tags"/><p>No categories found</p></div>
          : (
            <table>
              <thead>
                <tr><th>Code</th><th>Name</th><th>Description</th><th>Parent</th><th>Sub-Categories</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {cats.map(c=>(
                  <tr key={c.id}>
                    <td><code style={{background:'var(--gray-100)',padding:'2px 7px',borderRadius:4,fontSize:12}}>{c.code}</code></td>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td style={{color:'var(--gray-600)',maxWidth:260}}>{c.description||'—'}</td>
                    <td>{c.parent_name||<span style={{color:'var(--gray-400)'}}>Root</span>}</td>
                    <td>
                      {c.children?.length>0
                        ? <span className="badge badge-info">{c.children.length} sub-categories</span>
                        : <span style={{color:'var(--gray-400)',fontSize:13}}>None</span>}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn-icon" onClick={()=>openEdit(c)}><i className="bi bi-pencil"/></button>
                        <button className="btn-icon" onClick={()=>remove(c.id)}><i className="bi bi-trash" style={{color:'#DC2626'}}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal==='create'?'Add Category':'Edit Category'}</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Category Name *</label><input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Raw Materials"/></div>
                <div className="form-group"><label>Code *</label><input value={form.code} onChange={e=>f('code',e.target.value)} placeholder="e.g. RAW"/></div>
                <div className="form-group"><label>Parent Category</label>
                  <select value={form.parent} onChange={e=>f('parent',e.target.value)}>
                    <option value="">None (Root Category)</option>
                    {cats.filter(c=>c.id!==modal?.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>f('description',e.target.value)}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}