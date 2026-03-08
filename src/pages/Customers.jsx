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

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gradient">Customers</h1>
        <button onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-neon btn-glass' : 'btn-neon'}>
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(emptyCustomer).map(field => (
              <div key={field}>
                <label className="label-dark capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input type="text" value={form[field]} onChange={e => update(field, e.target.value)}
                  className="input-dark" />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-neon btn-success mt-5">Save Customer</button>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <table className="table-dark">
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
                <td className="font-medium text-white">{c.name}</td>
                <td>{c.city}</td>
                <td>{c.gstin}</td>
                <td>{c.phone}</td>
                <td>
                  <button onClick={() => handleDelete(c.id)} className="text-sm" style={{ color: '#ff6b6b' }}>Delete</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="5" className="text-center py-6" style={{ color: '#707070' }}>No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
