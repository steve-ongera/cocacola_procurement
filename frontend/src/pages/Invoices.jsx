import { useState, useEffect } from 'react'
import { invoicesAPI, suppliersAPI, purchaseOrdersAPI } from '../services/api'

const STATUS_BADGE = {
  pending:'badge-warning', approved:'badge-info', paid:'badge-success',
  overdue:'badge-danger', disputed:'badge-danger'
}

const EMPTY_FORM = {
  invoice_number:'', supplier_invoice_number:'', purchase_order:'', supplier:'',
  invoice_date:'', due_date:'', subtotal:'', tax_amount:'', total_amount:'', notes:''
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [pos, setPOs]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusF, setStatusF]   = useState('')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const [viewData, setViewData] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusF) p.set('status',statusF)
    if (search)  p.set('search',search)
    invoicesAPI.list(`?${p}`).then(d=>setInvoices(d.results||d)).catch(()=>{}).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() },[statusF,search])
  useEffect(()=>{
    suppliersAPI.list('?status=active').then(d=>setSuppliers(d.results||d)).catch(()=>{})
    purchaseOrdersAPI.list('?status=received&status=partial').then(d=>setPOs(d.results||d)).catch(()=>{})
  },[])

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create') }
  const openView   = async (id) => { const d = await invoicesAPI.get(id); setViewData(d); setModal('view') }
  const closeModal = () => { setModal(null); setViewData(null) }
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const calcTotal = (sub, tax) => {
    const total = Number(sub||0) + Number(tax||0)
    setForm(p=>({...p, total_amount: total.toFixed(2)}))
  }

  const save = async () => {
    setSaving(true)
    try {
      // auto-generate invoice number
      const payload = { ...form, invoice_number: form.invoice_number || `INV-${Date.now()}` }
      await invoicesAPI.create(payload); closeModal(); load()
    } catch {} finally { setSaving(false) }
  }

  const doAction = async (action, id) => {
    await invoicesAPI[action](id); load()
    if (viewData) { const d = await invoicesAPI.get(id); setViewData(d) }
  }

  const fmtKes = n => `KES ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`

  const totalPending  = invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+Number(i.total_amount),0)
  const totalOverdue  = invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+Number(i.total_amount),0)
  const totalPaid     = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.total_amount),0)

  return (
    <div>
      <div className="page-header">
        <div><h1>Invoices</h1><p>Supplier billing & payment tracking</p></div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"/> New Invoice</button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{marginBottom:20}}>
        {[
          { label:'Pending Invoices',  value:fmtKes(totalPending),  icon:'bi-hourglass-split', color:'orange' },
          { label:'Overdue Invoices',  value:fmtKes(totalOverdue),  icon:'bi-exclamation-circle', color:'red' },
          { label:'Total Paid',        value:fmtKes(totalPaid),     icon:'bi-check-circle', color:'green' },
          { label:'Total Invoices',    value:invoices.length,       icon:'bi-receipt', color:'blue' },
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><i className={`bi ${s.icon}`}/></div>
            <div>
              <div className="stat-value" style={{fontSize:s.label==='Total Invoices'?26:16}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-body" style={{padding:'12px 18px'}}>
          <div className="filters-row">
            <div className="search-bar"><i className="bi bi-search"/>
              <input placeholder="Search invoices…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select style={{width:'auto'}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
            </select>
            <span style={{fontSize:13,color:'var(--gray-400)',marginLeft:'auto'}}>{invoices.length} invoices</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading"><div className="spinner"/></div>
          : invoices.length===0 ? <div className="empty-state"><i className="bi bi-receipt"/><p>No invoices found</p></div>
          : (
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Supplier Invoice #</th><th>Supplier</th><th>PO #</th><th>Invoice Date</th><th>Due Date</th><th>Amount (KES)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv=>(
                  <tr key={inv.id}>
                    <td><span style={{color:'var(--red)',fontWeight:700,cursor:'pointer'}} onClick={()=>openView(inv.id)}>{inv.invoice_number}</span></td>
                    <td style={{color:'var(--gray-600)'}}>{inv.supplier_invoice_number}</td>
                    <td style={{fontWeight:600}}>{inv.supplier_name}</td>
                    <td>{inv.po_number}</td>
                    <td>{inv.invoice_date}</td>
                    <td style={{color:inv.status==='overdue'?'#DC2626':'inherit',fontWeight:inv.status==='overdue'?700:400}}>
                      {inv.due_date}
                    </td>
                    <td style={{fontWeight:700}}>{fmtKes(inv.total_amount)}</td>
                    <td><span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status_display}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn-icon" onClick={()=>openView(inv.id)}><i className="bi bi-eye"/></button>
                        {inv.status==='pending' && <button className="btn btn-sm btn-primary" onClick={()=>doAction('approve',inv.id)}>Approve</button>}
                        {inv.status==='approved'&& <button className="btn btn-sm btn-success" onClick={()=>doAction('markPaid',inv.id)}>Mark Paid</button>}
                        {['pending','approved'].includes(inv.status)&&<button className="btn btn-sm btn-danger" onClick={()=>doAction('dispute',inv.id)}>Dispute</button>}
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
              <h3>New Invoice</h3>
              <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label>Our Invoice # (auto if blank)</label><input value={form.invoice_number} onChange={e=>f('invoice_number',e.target.value)} placeholder="INV-2024-0001"/></div>
                <div className="form-group"><label>Supplier Invoice # *</label><input value={form.supplier_invoice_number} onChange={e=>f('supplier_invoice_number',e.target.value)}/></div>
                <div className="form-group"><label>Supplier *</label>
                  <select value={form.supplier} onChange={e=>f('supplier',e.target.value)}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Purchase Order *</label>
                  <select value={form.purchase_order} onChange={e=>f('purchase_order',e.target.value)}>
                    <option value="">Select PO</option>
                    {pos.map(po=><option key={po.id} value={po.id}>{po.po_number}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Invoice Date *</label><input type="date" value={form.invoice_date} onChange={e=>f('invoice_date',e.target.value)}/></div>
                <div className="form-group"><label>Due Date *</label><input type="date" value={form.due_date} onChange={e=>f('due_date',e.target.value)}/></div>
                <div className="form-group"><label>Subtotal (KES) *</label>
                  <input type="number" step="0.01" min="0" value={form.subtotal} onChange={e=>{ f('subtotal',e.target.value); calcTotal(e.target.value,form.tax_amount) }}/>
                </div>
                <div className="form-group"><label>VAT Amount (KES)</label>
                  <input type="number" step="0.01" min="0" value={form.tax_amount} onChange={e=>{ f('tax_amount',e.target.value); calcTotal(form.subtotal,e.target.value) }}/>
                </div>
                <div className="form-group"><label>Total Amount (KES)</label>
                  <input type="number" step="0.01" min="0" value={form.total_amount} readOnly style={{background:'var(--gray-50)'}}/>
                </div>
              </div>
              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e=>f('notes',e.target.value)}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal==='view' && viewData && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3>{viewData.invoice_number}</h3>
                <span style={{fontSize:13,color:'var(--gray-400)'}}>{viewData.supplier_name}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={`badge ${STATUS_BADGE[viewData.status]}`}>{viewData.status_display}</span>
                <button className="btn-icon" onClick={closeModal}><i className="bi bi-x-lg"/></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:20}}>
                {[
                  ['Supplier', viewData.supplier_name],
                  ['Supplier Inv #', viewData.supplier_invoice_number],
                  ['PO #', viewData.po_number],
                  ['Invoice Date', viewData.invoice_date],
                  ['Due Date', viewData.due_date],
                  ['Paid Date', viewData.paid_date||'—'],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'var(--gray-50)',borderRadius:10,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:14}}>
                  <span style={{color:'var(--gray-600)'}}>Subtotal</span>
                  <span style={{fontWeight:600}}>{fmtKes(viewData.subtotal)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:14}}>
                  <span style={{color:'var(--gray-600)'}}>VAT</span>
                  <span style={{fontWeight:600}}>{fmtKes(viewData.tax_amount)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--gray-200)',paddingTop:12,fontSize:17,fontWeight:800}}>
                  <span>Total</span>
                  <span style={{color:'var(--red)'}}>{fmtKes(viewData.total_amount)}</span>
                </div>
              </div>
              {viewData.notes && <div style={{marginTop:14,padding:12,background:'var(--gray-50)',borderRadius:8,fontSize:13,color:'var(--gray-600)'}}>{viewData.notes}</div>}
            </div>
            <div className="modal-footer">
              {viewData.status==='pending'  && <button className="btn btn-primary" onClick={()=>doAction('approve',viewData.id)}>Approve Invoice</button>}
              {viewData.status==='approved' && <button className="btn btn-success" onClick={()=>doAction('markPaid',viewData.id)}><i className="bi bi-cash"/> Mark as Paid</button>}
              {['pending','approved'].includes(viewData.status) && <button className="btn btn-danger" onClick={()=>doAction('dispute',viewData.id)}>Dispute</button>}
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}