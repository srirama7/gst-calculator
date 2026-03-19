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
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timed out. Check Firebase Firestore.')), 8000));
      const snap = await Promise.race([getDocs(collection(db, 'customers')), timeout]);
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      toast.error('Failed to load customers: ' + e.message);
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out. Check Firebase Firestore connection.')), 10000));
      await Promise.race([addDoc(collection(db, 'customers'), form), timeout]);
      toast.success('Customer added!');
      setForm({ ...emptyCustomer });
      setShowForm(false);
      loadCustomers();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return;
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Delete timed out.')), 10000));
      await Promise.race([deleteDoc(doc(db, 'customers', id)), timeout]);
      toast.success('Deleted');
      loadCustomers();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Customers</h1>
        <button onClick={() => setShowForm(!showForm)}
          className={`${showForm ? 'btn-neon btn-glass' : 'btn-neon'} text-sm py-2.5 px-6`}>
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-6 sm:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(emptyCustomer).map(field => (
              <div key={field}>
                <label className="label-dark capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input type="text" value={form[field]} onChange={e => update(field, e.target.value)}
                  className="input-dark" />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving}
            className="btn-neon btn-success mt-8 py-2.5 px-6 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      )}

      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="table-dark min-w-[500px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>GSTIN</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-white">{c.name || '-'}</td>
                <td>{c.city || '-'}</td>
                <td>{c.gstin || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>
                  <button onClick={() => handleDelete(c.id)} className="text-sm" style={{ color: 'var(--danger-text)' }}>Delete</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="5" className="text-center py-6" style={{ color: 'var(--text-muted)' }}>No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
