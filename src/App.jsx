import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import CreateInvoice from './pages/CreateInvoice'
import ViewInvoice from './pages/ViewInvoice'
import EditInvoice from './pages/EditInvoice'
import Settings from './pages/Settings'
import Customers from './pages/Customers'
import Products from './pages/Products'
import CalculatorWidget from './components/CalculatorWidget'

function BottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
    { path: '/invoice/new', label: 'New Invoice', icon: '\u{1F4DD}' },
    { path: '/customers', label: 'Customers', icon: '\u{1F465}' },
    { path: '/products', label: 'Products', icon: '\u{1F4E6}' },
    { path: '/settings', label: 'Settings', icon: '\u{2699}\uFE0F' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`bottom-nav-item ${isActive(item.path) ? 'bottom-nav-active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

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
        <nav className="sticky top-0 z-50 nav-bg safe-top">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-12 sm:h-16">
              <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-sm sm:text-lg"
                  style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: 'var(--logo-text)', boxShadow: '0 0 20px rgba(0,255,204,0.3)' }}>
                  GST
                </div>
                <span className="text-sm sm:text-lg font-bold text-gradient">GST Invoice</span>
              </Link>
              {/* Desktop nav links */}
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/" className="nav-link-dark text-sm px-4 py-2">Dashboard</Link>
                <Link to="/invoice/new" className="nav-link-dark text-sm px-4 py-2">New Invoice</Link>
                <Link to="/customers" className="nav-link-dark text-sm px-4 py-2">Customers</Link>
                <Link to="/products" className="nav-link-dark text-sm px-4 py-2">Products</Link>
                <Link to="/settings" className="nav-link-dark text-sm px-4 py-2">Settings</Link>
                <button onClick={toggleTheme} className="theme-toggle-btn ml-2" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
                </button>
              </div>
              {/* Mobile: only theme toggle in top bar */}
              <div className="sm:hidden">
                <button onClick={toggleTheme} className="theme-toggle-btn" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice/new" element={<CreateInvoice />} />
            <Route path="/invoice/:id" element={<ViewInvoice />} />
            <Route path="/invoice/:id/edit" element={<EditInvoice />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
          </Routes>
        </main>
        {/* Bottom nav for mobile */}
        <BottomNav />
        {/* Floating calculator widget */}
        <CalculatorWidget />
      </div>
    </Router>
  )
}

export default App
