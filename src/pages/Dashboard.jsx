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

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/invoice/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium">
          + New Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.count}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">₹{stats.total.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total GST Collected</p>
          <p className="text-3xl font-bold text-orange-600">₹{stats.gst.toFixed(2)}</p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-6 py-4 text-lg font-semibold border-b">Recent Invoices</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inv No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grand Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{inv.invoiceNo}</td>
                <td className="px-4 py-3 text-sm">{inv.date}</td>
                <td className="px-4 py-3 text-sm">{inv.customer?.name || '-'}</td>
                <td className="px-4 py-3 text-sm font-semibold">₹{inv.grandTotal?.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">
                  <Link to={`/invoice/${inv.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No invoices yet. Create your first!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
