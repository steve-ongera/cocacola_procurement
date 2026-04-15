import { useState } from 'react'
import { useAuth } from '../App'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff 0%, #fff5f5 50%, #fff 100%)',
      padding: 24,
    }}>
      {/* Decorative background circles */}
      <div style={{
        position:'fixed', top:-120, right:-120, width:400, height:400,
        background:'rgba(227,6,19,.06)', borderRadius:'50%', pointerEvents:'none'
      }}/>
      <div style={{
        position:'fixed', bottom:-80, left:-80, width:300, height:300,
        background:'rgba(227,6,19,.04)', borderRadius:'50%', pointerEvents:'none'
      }}/>

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        {/* Card */}
        <div style={{
          background:'white', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.12)',
          overflow:'hidden', border:'1px solid var(--gray-200)'
        }}>
          {/* Red header strip */}
          <div style={{
            background:'var(--red)', padding:'32px 36px 28px',
            display:'flex', flexDirection:'column', alignItems:'center', gap:12
          }}>
            <div style={{
              width:56, height:56, background:'rgba(255,255,255,.2)', borderRadius:16,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.15)"/>
                <path d="M9 11.5c1.8-1.2 4-1.8 7-1.8 3.5 0 6.5 1.2 6.5 3.5 0 1.8-1.8 3-4 3.5 2.4.6 4.7 1.8 4.7 4.2 0 3-3 4.2-7 4.2-3 0-5.2-.6-7-1.8"
                  stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ textAlign:'center' }}>
              <h1 style={{ color:'white', fontSize:22, fontWeight:800, letterSpacing:'-.02em' }}>
                Coca-Cola Kenya
              </h1>
              <p style={{ color:'rgba(255,255,255,.75)', fontSize:13, marginTop:2 }}>
                Procurement Management System
              </p>
            </div>
          </div>

          {/* Form */}
          <div style={{ padding:'32px 36px 36px' }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6, color:'var(--gray-900)' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:24 }}>
              Enter your credentials to continue
            </p>

            {error && (
              <div style={{
                background:'#FEE2E2', border:'1px solid #FECACA', borderRadius:8,
                padding:'10px 14px', marginBottom:18, fontSize:13, color:'#991B1B',
                display:'flex', alignItems:'center', gap:8
              }}>
                <i className="bi bi-exclamation-circle" /> {error}
              </div>
            )}

            <form onSubmit={handle}>
              <div className="form-group">
                <label>Username</label>
                <div style={{ position:'relative' }}>
                  <i className="bi bi-person" style={{
                    position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                    color:'var(--gray-400)', fontSize:15
                  }}/>
                  <input
                    style={{ paddingLeft:38 }}
                    type="text"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position:'relative' }}>
                  <i className="bi bi-lock" style={{
                    position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                    color:'var(--gray-400)', fontSize:15
                  }}/>
                  <input
                    style={{ paddingLeft:38 }}
                    type="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width:'100%', justifyContent:'center', padding:'11px 16px', marginTop:8, fontSize:15 }}
                disabled={loading}
              >
                {loading
                  ? <><div className="spinner" style={{ width:16, height:16, borderWidth:2 }}/> Signing in...</>
                  : <><i className="bi bi-box-arrow-in-right" /> Sign In</>
                }
              </button>
            </form>

            <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-400)', marginTop:24 }}>
              © {new Date().getFullYear()} Coca-Cola Beverages Africa · Kenya
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}