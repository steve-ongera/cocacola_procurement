import { useState, useEffect } from 'react'
import { purchaseOrdersAPI, suppliersAPI, itemsAPI } from '../services/api'

const STATUS_BADGE = {
  draft:'badge-secondary', sent:'badge-info', acknowledged:'badge-warning',
  partial:'badge-warning', received:'badge-success', cancelled:'badge-danger'
}

const EMPTY_FORM = {
  supplier:'', requisition:'', expected_delivery:'', delivery_address:'Coca-Cola Kenya, Industrial Area, Nairobi',
  payment_terms:30, tax_rate:16, notes:'', items:[]
}
const EMPTY_LINE = { item:'', quantity:'', unit_price:'' }

export default function PurchaseOrders() {
  const [pos, setPOs]           = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [modal, setModal]       = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)  p.set('search',search)
    if (statusF) p.set('status',statusF)
    purchaseOrdersAPI.list(`?${p}`).then(d=>setPOs(d.results||d)).catch(()=>{}).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() },[search,statusF])
  useEffect(()=>{
    suppliersAPI.list('?status=active').then(d=>setSuppliers(d.results||d)).catch(()=>{})
    itemsAPI.list().then(d=>setAllItems(d.results||d)).catch(()=>{})
  },[])

  const openCreate = () => { setForm({...EMPTY_FORM, items:[{...EMPTY_LINE}]}); setModal('create') }
  const openView   = async (id) => { const d = await purchaseOrdersAPI.get(id); setViewData(d); setModal('view') }
  const closeModal = () => { setModal(null); setViewData(null) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))
  const addLine    = () => setForm(p=>({...p,items:[...p.items,{...EMPTY_LINE}]}))
  const removeLine = (i) => setForm(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}))
  const setLine    = (i,k,v) => setForm(p=>({...p,items:p.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}))

  const lineTotal  = it => Number(it.quantity||0)*Number(it.unit_price||0)
  const subtotal   = () => form.items.reduce((s,it)=>s+lineTotal(it),0)
  const taxAmt     = () => subtotal()*(Number(form.tax_rate||0)/100)
  const grandTotal = () => subtotal()+taxAmt()
  const fmtKes     = n  => `KES ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`

  const save = async () => {
    setSaving(true)
    try { await purchaseOrdersAPI.create(form); closeModal(); load() }
    catch {} finally { setSaving(false) }
  }

  const doAction = async (action, id) => {
    await purchaseOrdersAPI[action](id); load()
    if (viewData) { const d = await purchaseOrdersAPI.get(id); setViewData(d) }
  }

  const STATUS_ACTIONS = {
    draft:       [{ label:'Send to Supplier', action:'sendToSupplier', cls:'btn-primary' }],
    sent:        [{ label:'Acknowledge',      action:'acknowledge',    cls:'btn-success' }],
    acknowledged:[],
    partial:     [],
    received:    [],
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Purchase Orders</h1><p>Order management & tracking</p></div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"/> Create PO</button>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'12px 18px'}}>
          <div className="filters-row">
            <div className="search-bar"><i className="bi bi-search"/>
              <input placeholder="Search POs…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select style={{width:'auto'}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
              <option value="">All Statuses</option>
              {['draft','sent','acknowledged','partial','received','cancelled'].map(s=>(
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:'auto'}}>{pos.length} orders</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : pos.length===0 ? <div className="empty-state"><i className="bi bi-bag-check"/><p>No purchase orders found</p></div>
          : (
            <table>
              <thead>
                <tr><th>PO #</th><th>Supplier</th><th>Order Date</th><th>Expected Delivery</th><th>Total (KES)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pos.map(po=>(
                  <tr key={po.id}>
                    <td><span style={{color:'var(--red)',fontWeight:700,cursor:'pointer'}} onClick={()=>openView(po.id)}>{po.po_number}</span></td>
                    <td style={{fontWeight:600}}>{po.supplier_name}</td>
                    <td>{po.order_date}</td>
                    <td>{po.expected_delivery}</td>
                    <td style={{fontWeight:700}}>{fmtKes(po.total_amount)}</td>
                    <td><span className={`badge ${STATUS_BADGE[po.status]}`}>{po.status_display}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" onClick={()=>openView(po.id)}><i className="bi bi-eye"/></button>
                        {STATUS_ACTIONS[po.status]?.map(a=>(
                          <button key={a.action} className={`btn btn-sm ${a.cls}`} onClick={()=>doAction(a.action,po.id)}>{a.label}</button>
                        ))}
                        {po.status==='draft'&&<button className="btn btn-sm btn-danger" onClick={()=>doAction('cancel',po.id)}>Cancel</button>}
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
              <h3>Create Purchase Order</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Supplier *</label>
                  <select value={form.supplier} onChange={e=>f('supplier',e.target.value)}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Expected Delivery *</label>
                  <input type="date" value={form.expected_delivery} onChange={e=>f('expected_delivery',e.target.value)}/>
                </div>
                <div className="form-group"><label>Payment Terms (days)</label>
                  <input type="number" value={form.payment_terms} onChange={e=>f('payment_terms',Number(e.target.value))} min={0}/>
                </div>
                <div className="form-group"><label>Tax Rate (%)</label>
                  <input type="number" value={form.tax_rate} onChange={e=>f('tax_rate',Number(e.target.value))} min={0} step={0.5}/>
                </div>
              </div>
              <div className="form-group"><label>Delivery Address</label>
                <textarea value={form.delivery_address} onChange={e=>f('delivery_address',e.target.value)} rows={2}/>
              </div>
              <div className="form-group"><label>Notes</label>
                <textarea value={form.notes} onChange={e=>f('notes',e.target.value)}/>
              </div>

              {/* Line items */}
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <label style={{margin:0}}>Order Items</label>
                  <button className="btn btn-sm btn-secondary" onClick={addLine}><i className="bi bi-plus"/> Add Item</button>
                </div>
                <div style={{border:'1px solid var(--gray-200)',borderRadius:8,overflow:'hidden'}}>
                  <table style={{fontSize:13}}>
                    <thead>
                      <tr style={{background:'var(--gray-50)'}}>
                        <th style={{padding:'8px 12px'}}>Item</th><th style={{padding:'8px 12px'}}>Qty</th>
                        <th style={{padding:'8px 12px'}}>Unit Price (KES)</th><th style={{padding:'8px 12px'}}>Total</th>
                        <th style={{padding:'8px 12px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it,i)=>(
                        <tr key={i} style={{borderTop:'1px solid var(--gray-100)'}}>
                          <td style={{padding:'6px 8px'}}>
                            <select style={{fontSize:13,padding:'5px 8px'}} value={it.item} onChange={e=>{
                              const sel = allItems.find(a=>String(a.id)===e.target.value)
                              setLine(i,'item',e.target.value)
                              if (sel) setLine(i,'unit_price',sel.unit_price)
                            }}>
                              <option value="">Select item</option>
                              {allItems.map(ai=><option key={ai.id} value={ai.id}>{ai.name}</option>)}
                            </select>
                          </td>
                          <td style={{padding:'6px 8px'}}><input type="number" style={{width:80,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.quantity} onChange={e=>setLine(i,'quantity',e.target.value)}/></td>
                          <td style={{padding:'6px 8px'}}><input type="number" style={{width:120,fontSize:13,padding:'5px 8px'}} min="0" step="0.01" value={it.unit_price} onChange={e=>setLine(i,'unit_price',e.target.value)}/></td>
                          <td style={{padding:'6px 12px',fontWeight:600}}>{fmtKes(lineTotal(it))}</td>
                          <td style={{padding:'6px 8px'}}><button className="btn-icon" onClick={()=>removeLine(i)} style={{width:26,height:26}}><i className="bi bi-x" style={{color:'#DC2626',fontSize:14}}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{textAlign:'right',marginTop:10,fontSize:13}}>
                  <div>Subtotal: <strong>{fmtKes(subtotal())}</strong></div>
                  <div>VAT ({form.tax_rate}%): <strong>{fmtKes(taxAmt())}</strong></div>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--red)',marginTop:4}}>Total: {fmtKes(grandTotal())}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Create PO'}</button>
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
                <h3>{viewData.po_number}</h3>
                <span style={{fontSize:13,color:'var(--gray-400)'}}>{viewData.supplier_name}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={`badge ${STATUS_BADGE[viewData.status]}`}>{viewData.status_display}</span>
                <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:16}}>
                {[
                  ['Supplier', viewData.supplier_name],
                  ['Order Date', viewData.order_date],
                  ['Expected Delivery', viewData.expected_delivery],
                  ['Payment Terms', `${viewData.payment_terms} days`],
                  ['Created By', viewData.created_by_name],
                  ['Tax Rate', `${viewData.tax_rate}%`],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
              {viewData.delivery_address&&<div style={{background:'var(--gray-50)',borderRadius:8,padding:12,marginBottom:16,fontSize:13}}><strong>Delivery:</strong> {viewData.delivery_address}</div>}
              <h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Order Items</h4>
              <table style={{fontSize:13}}>
                <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  {viewData.items?.map((it,i)=>(
                    <tr key={i}>
                      <td>{it.item_name}</td>
                      <td>{it.quantity} {it.item_unit}</td>
                      <td style={{color: Number(it.quantity_received)>=Number(it.quantity)?'#059669':'#D97706', fontWeight:600}}>{it.quantity_received}</td>
                      <td>{fmtKes(it.unit_price)}</td>
                      <td style={{fontWeight:700}}>{fmtKes(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign:'right',marginTop:12,fontSize:13}}>
                <div>Subtotal: <strong>{fmtKes(viewData.subtotal)}</strong></div>
                <div>VAT: <strong>{fmtKes(viewData.tax_amount)}</strong></div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--red)',marginTop:4}}>Total: {fmtKes(viewData.total_amount)}</div>
              </div>
            </div>
            <div className="modal-footer">
              {STATUS_ACTIONS[viewData.status]?.map(a=>(
                <button key={a.action} className={`btn ${a.cls}`} onClick={()=>doAction(a.action,viewData.id)}>{a.label}</button>
              ))}
              {viewData.status==='draft'&&<button className="btn btn-danger" onClick={()=>doAction('cancel',viewData.id)}>Cancel PO</button>}
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}