import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'

const emptyCustomer = {
  name: '', address: '', city: '', pincode: '',
  gstin: '', phone: '', dlNo: ''
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ ...emptyCustomer });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      toast.error('Failed to load customers');
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), form);
      toast.success('Customer added!');
      setForm({ ...emptyCustomer });
      setShowForm(false);
      loadCustomers();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
      toast.success('Deleted');
      loadCustomers();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(emptyCustomer).map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input type="text" value={form[field]} onChange={e => update(field, e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
              </div>
            ))}
          </div>
          <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Save</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-4 py-3 text-sm">{c.city}</td>
                <td className="px-4 py-3 text-sm">{c.gstin}</td>
                <td className="px-4 py-3 text-sm">{c.phone}</td>
                <td className="px-4 py-3 text-sm">
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
