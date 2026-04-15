import { useState, useEffect } from 'react'
import { grnsAPI, purchaseOrdersAPI } from '../services/api'

const STATUS_BADGE = {
  pending:'badge-warning', approved:'badge-success', rejected:'badge-danger', partial:'badge-info'
}

const EMPTY_FORM = { purchase_order:'', received_date:'', delivery_note_number:'', notes:'', items:[] }

export default function GRNs() {
  const [grns, setGRNs]       = useState([])
  const [openPOs, setOpenPOs] = useState([])
  const [selPO, setSelPO]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusF, setStatusF] = useState('')
  const [modal, setModal]     = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusF) p.set('status',statusF)
    grnsAPI.list(`?${p}`).then(d=>setGRNs(d.results||d)).catch(()=>{}).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() },[statusF])
  useEffect(()=>{
    purchaseOrdersAPI.list('?status=sent&status=acknowledged&status=partial')
      .then(d=>setOpenPOs(d.results||d)).catch(()=>{})
  },[])

  const selectPO = async (poId) => {
    if (!poId) { setSelPO(null); setForm(p=>({...p,items:[]})); return }
    const po = await purchaseOrdersAPI.get(poId)
    setSelPO(po)
    setForm(p=>({
      ...p,
      items: po.items.map(i=>({
        po_item: i.id,
        item_name: i.item_name,
        ordered_qty: i.quantity,
        received_qty: i.quantity,
        quantity_received: i.quantity,
        quantity_accepted: i.quantity,
        quantity_rejected: 0,
        rejection_reason:''
      }))
    }))
  }

  const openCreate = () => { setForm({...EMPTY_FORM}); setSelPO(null); setModal('create') }
  const openView   = async (id) => { const d = await grnsAPI.get(id); setViewData(d); setModal('view') }
  const closeModal = () => { setModal(null); setViewData(null) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))
  const setLine = (i,k,v) => setForm(p=>({...p, items:p.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}))

  const save = async () => {
    setSaving(true)
    const payload = {
      purchase_order: form.purchase_order,
      received_date: form.received_date,
      delivery_note_number: form.delivery_note_number,
      notes: form.notes,
      items: form.items.map(it=>({
        po_item: it.po_item,
        quantity_received: it.quantity_received,
        quantity_accepted: it.quantity_accepted,
        quantity_rejected: it.quantity_rejected,
        rejection_reason: it.rejection_reason
      }))
    }
    try { await grnsAPI.create(payload); closeModal(); load() }
    catch {} finally { setSaving(false) }
  }

  const doAction = async (action, id) => {
    await grnsAPI[action](id); load()
    if (viewData) { const d = await grnsAPI.get(id); setViewData(d) }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Goods Received Notes</h1><p>Delivery receipt & quality control</p></div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"/> Record GRN</button>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'12px 18px'}}>
          <div className="filters-row">
            <select style={{width:'auto'}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending QC</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="partial">Partial</option>
            </select>
            <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:'auto'}}>{grns.length} records</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : grns.length===0 ? <div className="empty-state"><i className="bi bi-box-seam"/><p>No GRNs found</p></div>
          : (
            <table>
              <thead>
                <tr><th>GRN #</th><th>PO #</th><th>Received By</th><th>Received Date</th><th>Delivery Note</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {grns.map(g=>(
                  <tr key={g.id}>
                    <td><span style={{color:'var(--red)',fontWeight:700,cursor:'pointer'}} onClick={()=>openView(g.id)}>{g.grn_number}</span></td>
                    <td style={{fontWeight:600}}>{g.po_number}</td>
                    <td>{g.received_by_name}</td>
                    <td>{g.received_date}</td>
                    <td>{g.delivery_note_number||'—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[g.status]}`}>{g.status_display}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" onClick={()=>openView(g.id)}><i className="bi bi-eye"/></button>
                        {g.status==='pending'&&<>
                          <button className="btn btn-sm btn-success" onClick={()=>doAction('approve',g.id)}>Approve</button>
                          <button className="btn btn-sm btn-danger"  onClick={()=>doAction('reject', g.id)}>Reject</button>
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
              <h3>Record Goods Received Note</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Purchase Order *</label>
                  <select value={form.purchase_order} onChange={e=>{ f('purchase_order',e.target.value); selectPO(e.target.value) }}>
                    <option value="">Select PO</option>
                    {openPOs.map(po=><option key={po.id} value={po.id}>{po.po_number} — {po.supplier_name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Received Date *</label>
                  <input type="date" value={form.received_date} onChange={e=>f('received_date',e.target.value)}/>
                </div>
                <div className="form-group"><label>Delivery Note #</label>
                  <input value={form.delivery_note_number} onChange={e=>f('delivery_note_number',e.target.value)} placeholder="Supplier's delivery note number"/>
                </div>
              </div>
              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e=>f('notes',e.target.value)}/></div>

              {form.items.length>0 && (
                <div>
                  <label style={{marginBottom:10}}>Items Received</label>
                  <div style={{border:'1px solid var(--gray-200)',borderRadius:8,overflow:'hidden'}}>
                    <table style={{fontSize:13}}>
                      <thead>
                        <tr style={{background:'var(--gray-50)'}}>
                          <th style={{padding:'8px 12px'}}>Item</th>
                          <th style={{padding:'8px 12px'}}>Ordered</th>
                          <th style={{padding:'8px 12px'}}>Received</th>
                          <th style={{padding:'8px 12px'}}>Accepted</th>
                          <th style={{padding:'8px 12px'}}>Rejected</th>
                          <th style={{padding:'8px 12px'}}>Rejection Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it,i)=>(
                          <tr key={i} style={{borderTop:'1px solid var(--gray-100)'}}>
                            <td style={{padding:'6px 12px',fontWeight:600}}>{it.item_name}</td>
                            <td style={{padding:'6px 8px',color:'var(--gray-600)'}}>{it.ordered_qty}</td>
                            <td style={{padding:'6px 8px'}}><input type="number" style={{width:80,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.quantity_received} onChange={e=>setLine(i,'quantity_received',e.target.value)}/></td>
                            <td style={{padding:'6px 8px'}}><input type="number" style={{width:80,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.quantity_accepted} onChange={e=>setLine(i,'quantity_accepted',e.target.value)}/></td>
                            <td style={{padding:'6px 8px'}}><input type="number" style={{width:80,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.quantity_rejected} onChange={e=>setLine(i,'quantity_rejected',e.target.value)}/></td>
                            <td style={{padding:'6px 8px'}}><input style={{width:160,fontSize:13,padding:'5px 8px'}} value={it.rejection_reason} onChange={e=>setLine(i,'rejection_reason',e.target.value)} placeholder="If any…"/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Record GRN'}</button>
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
                <h3>{viewData.grn_number}</h3>
                <span style={{fontSize:13,color:'var(--gray-400)'}}>PO: {viewData.po_number}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={`badge ${STATUS_BADGE[viewData.status]}`}>{viewData.status_display}</span>
                <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:16}}>
                {[['Received By',viewData.received_by_name],['Date',viewData.received_date],['Delivery Note',viewData.delivery_note_number||'—']].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
              <h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Items</h4>
              <table style={{fontSize:13}}>
                <thead><tr><th>Item</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Reason</th></tr></thead>
                <tbody>
                  {viewData.items?.map((it,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{it.item_name}</td>
                      <td>{it.quantity_received}</td>
                      <td style={{color:'#059669',fontWeight:600}}>{it.quantity_accepted}</td>
                      <td style={{color:'#DC2626',fontWeight:600}}>{it.quantity_rejected}</td>
                      <td style={{color:'var(--gray-600)'}}>{it.rejection_reason||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              {viewData.status==='pending'&&<>
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