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
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="text-xl font-bold">GST Invoice</Link>
              <div className="flex space-x-4">
                <Link to="/" className="hover:bg-indigo-600 px-3 py-2 rounded">Dashboard</Link>
                <Link to="/invoice/new" className="hover:bg-indigo-600 px-3 py-2 rounded">New Invoice</Link>
                <Link to="/customers" className="hover:bg-indigo-600 px-3 py-2 rounded">Customers</Link>
                <Link to="/settings" className="hover:bg-indigo-600 px-3 py-2 rounded">Settings</Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">
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
