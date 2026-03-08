import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, count: 0, gst: 0 });

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timed out. Check Firebase Firestore is created.')), 8000));
      let snap;
      try {
        const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(20));
        snap = await Promise.race([getDocs(q), timeout]);
      } catch {
        snap = await Promise.race([getDocs(collection(db, 'invoices')), timeout]);
      }
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvoices(list);

      const totalRevenue = list.reduce((s, i) => s + (i.grandTotal || 0), 0);
      const totalGST = list.reduce((s, i) => s + (i.cgstAmount || 0) + (i.sgstAmount || 0) + (i.igstAmount || 0), 0);
      setStats({ total: totalRevenue, count: list.length, gst: totalGST });
    } catch (e) {
      toast.error('Failed to load invoices: ' + e.message);
    }
    setLoading(false);
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
        <Link to="/invoice/new" className="btn-neon">
          + New Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-card glass-card-glow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)' }}>
              <span role="img">&#128202;</span>
            </div>
            <span className="text-sm text-gray-400">Total Invoices</span>
          </div>
          <p className="stat-neon">{stats.count}</p>
          <p className="text-xs text-gray-500 mt-2">All time invoices created</p>
        </div>
        <div className="glass-card glass-card-glow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}>
              <span role="img">&#128176;</span>
            </div>
            <span className="text-sm text-gray-400">Total Revenue</span>
          </div>
          <p className="stat-neon">{'\u20B9'}{stats.total.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">Cumulative revenue generated</p>
        </div>
        <div className="glass-card glass-card-glow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)' }}>
              <span role="img">&#127919;</span>
            </div>
            <span className="text-sm text-gray-400">Total GST Collected</span>
          </div>
          <p className="stat-neon">{'\u20B9'}{stats.gst.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">CGST + SGST + IGST collected</p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="glass-card overflow-hidden">
        <h2 className="px-6 py-4 text-lg font-semibold text-gradient" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Recent Invoices
        </h2>
        <table className="table-dark">
          <thead>
            <tr>
              <th>Inv No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Grand Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td className="font-medium text-white">{inv.invoiceNo}</td>
                <td>{inv.date}</td>
                <td>{inv.customer?.name || '-'}</td>
                <td className="font-semibold" style={{ color: '#00ffcc' }}>{'\u20B9'}{inv.grandTotal?.toFixed(2)}</td>
                <td>
                  <Link to={`/invoice/${inv.id}`} className="text-sm" style={{ color: '#00ccff' }}>View</Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="5" className="text-center py-6" style={{ color: '#707070' }}>No invoices yet. Create your first!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
