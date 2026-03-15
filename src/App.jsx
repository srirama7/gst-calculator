import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import CreateInvoice from './pages/CreateInvoice'
import ViewInvoice from './pages/ViewInvoice'
import Settings from './pages/Settings'
import Customers from './pages/Customers'

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        },
      }} />
      <div className="min-h-screen app-bg">
        <nav className="sticky top-0 z-50 nav-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg"
                  style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: 'var(--logo-text)', boxShadow: '0 0 20px rgba(0,255,204,0.3)' }}>
                  G
                </div>
                <span className="text-base sm:text-lg font-bold text-gradient hidden sm:inline">GST Invoice</span>
              </Link>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                <Link to="/" className="nav-link-dark text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">Dashboard</Link>
                <Link to="/invoice/new" className="nav-link-dark text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">New Invoice</Link>
                <Link to="/customers" className="nav-link-dark text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">Customers</Link>
                <Link to="/settings" className="nav-link-dark text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">Settings</Link>
                <button onClick={toggleTheme} className="theme-toggle-btn ml-1 sm:ml-2" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
