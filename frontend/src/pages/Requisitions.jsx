import { useState, useEffect } from 'react'
import { requisitionsAPI, itemsAPI } from '../services/api'

const STATUS_BADGE = {
  draft:'badge-secondary', pending:'badge-warning',
  approved:'badge-success', rejected:'badge-danger', cancelled:'badge-secondary'
}
const PRIORITY_BADGE = {
  low:'badge-secondary', medium:'badge-info', high:'badge-warning', urgent:'badge-danger'
}

const EMPTY_FORM = {
  title:'', department:'', priority:'medium', required_date:'', notes:'', status:'draft', items:[]
}
const EMPTY_ITEM = { item:'', quantity:'', estimated_unit_price:'', notes:'' }

export default function Requisitions() {
  const [reqs, setReqs]       = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal]     = useState(null)  // null | 'create' | 'view' | obj
  const [viewData, setViewData] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)       p.set('search',search)
    if (statusFilter) p.set('status',statusFilter)
    requisitionsAPI.list(`?${p}`).then(d=>setReqs(d.results||d)).catch(()=>{}).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() },[search,statusFilter])
  useEffect(()=>{ itemsAPI.list().then(d=>setAllItems(d.results||d)).catch(()=>{}) },[])

  const openCreate = () => { setForm({...EMPTY_FORM, items:[{...EMPTY_ITEM}]}); setModal('create') }
  const openView   = async (id) => {
    const data = await requisitionsAPI.get(id)
    setViewData(data); setModal('view')
  }
  const closeModal = () => { setModal(null); setViewData(null) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  // Line items
  const addLine    = () => setForm(p=>({...p, items:[...p.items,{...EMPTY_ITEM}]}))
  const removeLine = (i) => setForm(p=>({...p, items:p.items.filter((_,idx)=>idx!==i)}))
  const setLine    = (i,k,v) => setForm(p=>({
    ...p, items: p.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)
  }))

  const lineTotal = (it) => Number(it.quantity||0) * Number(it.estimated_unit_price||0)
  const grandTotal = () => form.items.reduce((s,it)=>s+lineTotal(it),0)

  const save = async () => {
    setSaving(true)
    try {
      await requisitionsAPI.create(form)
      closeModal(); load()
    } catch {} finally { setSaving(false) }
  }

  const doAction = async (action, id) => {
    await requisitionsAPI[action](id); load()
    if (viewData) { const d = await requisitionsAPI.get(id); setViewData(d) }
  }

  const fmtKes = (n) => `KES ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`

  return (
    <div>
      <div className="page-header">
        <div><h1>Purchase Requisitions</h1><p>Request & approval workflow</p></div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"/> New Requisition</button>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'12px 18px'}}>
          <div className="filters-row">
            <div className="search-bar"><i className="bi bi-search"/>
              <input placeholder="Search PRs…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select style={{width:'auto'}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:'auto'}}>{reqs.length} requisitions</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : reqs.length===0 ? <div className="empty-state"><i className="bi bi-file-earmark-text"/><p>No requisitions found</p></div>
          : (
            <table>
              <thead>
                <tr><th>PR #</th><th>Title</th><th>Department</th><th>Requested By</th><th>Priority</th><th>Required Date</th><th>Amount (KES)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {reqs.map(r=>(
                  <tr key={r.id}>
                    <td><span style={{color:'var(--red)',fontWeight:700,cursor:'pointer'}} onClick={()=>openView(r.id)}>{r.pr_number}</span></td>
                    <td style={{fontWeight:600,maxWidth:180}}>{r.title}</td>
                    <td>{r.department}</td>
                    <td>{r.requested_by_name}</td>
                    <td><span className={`badge ${PRIORITY_BADGE[r.priority]}`}>{r.priority_display}</span></td>
                    <td>{r.required_date}</td>
                    <td style={{fontWeight:600}}>{fmtKes(r.total_amount)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status_display}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" title="View" onClick={()=>openView(r.id)}><i className="bi bi-eye"/></button>
                        {r.status==='draft' && <button className="btn btn-sm btn-primary" onClick={()=>doAction('submit',r.id)}>Submit</button>}
                        {r.status==='pending' && <>
                          <button className="btn btn-sm btn-success" onClick={()=>doAction('approve',r.id)}>Approve</button>
                          <button className="btn btn-sm btn-danger" onClick={()=>doAction('reject',r.id)}>Reject</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {modal==='create' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>New Purchase Requisition</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:0}}>
                <div className="form-group"><label>Title *</label><input value={form.title} onChange={e=>f('title',e.target.value)} placeholder="e.g. Q2 Packaging Materials"/></div>
                <div className="form-group"><label>Department *</label><input value={form.department} onChange={e=>f('department',e.target.value)} placeholder="e.g. Production"/></div>
                <div className="form-group"><label>Priority</label>
                  <select value={form.priority} onChange={e=>f('priority',e.target.value)}>
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group"><label>Required Date *</label>
                  <input type="date" value={form.required_date} onChange={e=>f('required_date',e.target.value)}/>
                </div>
              </div>
              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e=>f('notes',e.target.value)}/></div>

              {/* Line items */}
              <div style={{marginTop:8}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <label style={{margin:0}}>Line Items</label>
                  <button className="btn btn-sm btn-secondary" onClick={addLine}><i className="bi bi-plus"/> Add Line</button>
                </div>
                <div style={{border:'1px solid var(--gray-200)',borderRadius:8,overflow:'hidden'}}>
                  <table style={{fontSize:13}}>
                    <thead>
                      <tr style={{background:'var(--gray-50)'}}>
                        <th style={{padding:'8px 12px'}}>Item</th>
                        <th style={{padding:'8px 12px'}}>Qty</th>
                        <th style={{padding:'8px 12px'}}>Est. Unit Price</th>
                        <th style={{padding:'8px 12px'}}>Total</th>
                        <th style={{padding:'8px 12px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it,i)=>(
                        <tr key={i} style={{borderTop:'1px solid var(--gray-100)'}}>
                          <td style={{padding:'6px 8px'}}>
                            <select style={{fontSize:13,padding:'5px 8px'}} value={it.item} onChange={e=>setLine(i,'item',e.target.value)}>
                              <option value="">Select item</option>
                              {allItems.map(ai=><option key={ai.id} value={ai.id}>{ai.name}</option>)}
                            </select>
                          </td>
                          <td style={{padding:'6px 8px'}}><input type="number" style={{width:80,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.quantity} onChange={e=>setLine(i,'quantity',e.target.value)}/></td>
                          <td style={{padding:'6px 8px'}}><input type="number" style={{width:110,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.estimated_unit_price} onChange={e=>setLine(i,'estimated_unit_price',e.target.value)}/></td>
                          <td style={{padding:'6px 12px',fontWeight:600}}>{fmtKes(lineTotal(it))}</td>
                          <td style={{padding:'6px 8px'}}>
                            <button className="btn-icon" onClick={()=>removeLine(i)} style={{width:26,height:26}}><i className="bi bi-x" style={{color:'#DC2626',fontSize:14}}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{textAlign:'right',marginTop:10,fontWeight:700,color:'var(--gray-900)'}}>
                  Grand Total: <span style={{color:'var(--red)',fontSize:16}}>{fmtKes(grandTotal())}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Create Requisition'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal==='view' && viewData && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h3>{viewData.pr_number}</h3>
                <span style={{fontSize:13,color:'var(--gray-400)'}}>{viewData.title}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={`badge ${STATUS_BADGE[viewData.status]}`}>{viewData.status_display}</span>
                <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:16}}>
                {[
                  ['Requested By', viewData.requested_by_name],
                  ['Department',   viewData.department],
                  ['Priority',     viewData.priority_display],
                  ['Required Date',viewData.required_date],
                  ['Created',      viewData.created_at?.slice(0,10)],
                  ['Approved By',  viewData.approved_by_name||'—'],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
              {viewData.notes && <div style={{background:'var(--gray-50)',borderRadius:8,padding:12,marginBottom:16,fontSize:13,color:'var(--gray-600)'}}>{viewData.notes}</div>}
              <h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Line Items</h4>
              <table style={{fontSize:13}}>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  {viewData.items?.map((it,i)=>(
                    <tr key={i}>
                      <td>{it.item_name} <span style={{color:'var(--gray-400)',fontSize:11}}>({it.item_sku})</span></td>
                      <td>{it.quantity} {it.item_unit}</td>
                      <td>{fmtKes(it.estimated_unit_price)}</td>
                      <td style={{fontWeight:700}}>{fmtKes(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign:'right',marginTop:10,fontSize:15,fontWeight:700}}>
                Total: <span style={{color:'var(--red)'}}>{fmtKes(viewData.total_amount)}</span>
              </div>
            </div>
            <div className="modal-footer">
              {viewData.status==='draft' && <button className="btn btn-primary" onClick={()=>doAction('submit',viewData.id)}>Submit for Approval</button>}
              {viewData.status==='pending' && <>
                <button className="btn btn-success" onClick={()=>doAction('approve',viewData.id)}><i className="bi bi-check-lg"/> Approve</button>
                <button className="btn btn-danger"  onClick={()=>doAction('reject', viewData.id)}><i className="bi bi-x-lg"/>   Reject</button>
              </>}
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}