import { useState, useEffect, createContext, useContext } from 'react'
import { authAPI, setTokens, clearTokens, getToken } from './services/api'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Suppliers from './pages/Suppliers'
import Items from './pages/Items'
import Categories from './pages/Categories'
import Requisitions from './pages/Requisitions'
import PurchaseOrders from './pages/PurchaseOrders'
import GRNs from './pages/GRNs'
import Invoices from './pages/Invoices'
import Login from './pages/Login'

// ─── Auth Context ──────────────────────────────────────────────────────────
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ─── App Shell ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null)
  const [page, setPage]               = useState('dashboard')
  const [sidebarCollapsed, setCollapsed] = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const token = getToken()
    if (token) {
      // Decode basic info from token (or just mark as logged in)
      const stored = localStorage.getItem('user_info')
      if (stored) setUser(JSON.parse(stored))
      else setUser({ username: 'User' })
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const data = await authAPI.login(username, password)
    setTokens(data.access, data.refresh)
    const userInfo = { username }
    localStorage.setItem('user_info', JSON.stringify(userInfo))
    setUser(userInfo)
  }

  const logout = () => {
    clearTokens()
    localStorage.removeItem('user_info')
    setUser(null)
    setPage('dashboard')
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Login />
    </AuthContext.Provider>
  )

  const pages = {
    dashboard:      <Dashboard navigate={setPage} />,
    suppliers:      <Suppliers />,
    items:          <Items />,
    categories:     <Categories />,
    requisitions:   <Requisitions />,
    'purchase-orders': <PurchaseOrders />,
    grns:           <GRNs />,
    invoices:       <Invoices />,
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="app-layout">
        <Sidebar
          currentPage={page}
          onNavigate={setPage}
          collapsed={sidebarCollapsed}
          onToggle={() => setCollapsed(!sidebarCollapsed)}
        />
        <div className={`main-area${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <Navbar
            onToggleSidebar={() => setCollapsed(!sidebarCollapsed)}
            currentPage={page}
            user={user}
            onLogout={logout}
          />
          <div className="page-content">
            {pages[page] || <Dashboard navigate={setPage} />}
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  )
}