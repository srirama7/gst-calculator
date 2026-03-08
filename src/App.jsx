import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import CreateInvoice from './pages/CreateInvoice'
import ViewInvoice from './pages/ViewInvoice'
import Settings from './pages/Settings'
import Customers from './pages/Customers'

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1a1f3a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }} />
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0a0e27 0%, #0f1329 100%)' }}>
        <nav className="sticky top-0 z-50" style={{
          background: 'rgba(10, 14, 39, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-dark-900 font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', boxShadow: '0 0 20px rgba(0,255,204,0.3)' }}>
                  G
                </div>
                <span className="text-lg font-bold text-gradient">GST Invoice</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link to="/" className="nav-link-dark">Dashboard</Link>
                <Link to="/invoice/new" className="nav-link-dark">New Invoice</Link>
                <Link to="/customers" className="nav-link-dark">Customers</Link>
                <Link to="/settings" className="nav-link-dark">Settings</Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice/new" element={<CreateInvoice />} />
            <Route path="/invoice/:id" element={<ViewInvoice />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customers" element={<Customers />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
