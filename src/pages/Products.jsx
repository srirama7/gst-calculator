import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import toast from 'react-hot-toast'

const emptyProduct = {
  name: '', mfr: '', hsn: '', pack: '',
  mrp: '', rate: '', gstPercent: 18
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ ...emptyProduct });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timed out. Check Firebase Firestore.')), 8000));
      const snap = await Promise.race([getDocs(collection(db, 'products')), timeout]);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      toast.error('Failed to load products: ' + e.message);
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out. Check Firebase Firestore connection.')), 10000));
      await Promise.race([
        addDoc(collection(db, 'products'), {
          name: form.name || '',
          mfr: form.mfr || '',
          hsn: form.hsn || '',
          pack: form.pack || '',
          mrp: parseFloat(form.mrp) || 0,
          rate: parseFloat(form.rate) || 0,
          gstPercent: parseFloat(form.gstPercent) || 18
        }),
        timeout
      ]);
      toast.success('Product added!');
      setForm({ ...emptyProduct });
      setShowForm(false);
      loadProducts();
    } catch (e) {
      toast.error('Failed to save product: ' + e.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return;
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Delete timed out.')), 10000));
      await Promise.race([deleteDoc(doc(db, 'products', id)), timeout]);
      toast.success('Deleted');
      loadProducts();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Products</h1>
        <button onClick={() => setShowForm(!showForm)}
          className={`${showForm ? 'btn-neon btn-glass' : 'btn-neon'} text-sm py-2.5 px-6`}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass-card p-6 sm:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label-dark">Product Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                className="input-dark" placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div>
              <label className="label-dark">Manufacturer</label>
              <input type="text" value={form.mfr} onChange={e => update('mfr', e.target.value)}
                className="input-dark" />
            </div>
            <div>
              <label className="label-dark">HSN Code</label>
              <input type="text" value={form.hsn} onChange={e => update('hsn', e.target.value)}
                className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Pack</label>
              <input type="text" value={form.pack} onChange={e => update('pack', e.target.value)}
                className="input-dark" placeholder="e.g. 10x10" />
            </div>
            <div>
              <label className="label-dark">MRP</label>
              <input type="number" step="0.01" value={form.mrp} onChange={e => update('mrp', e.target.value)}
                className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Rate</label>
              <input type="number" step="0.01" value={form.rate} onChange={e => update('rate', e.target.value)}
                className="input-dark" />
            </div>
            <div>
              <label className="label-dark">GST %</label>
              <select value={form.gstPercent} onChange={e => update('gstPercent', e.target.value)}
                className="input-dark">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="btn-neon btn-success mt-8 py-2.5 px-6 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </form>
      )}

      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="table-dark min-w-[600px]">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Mfr</th>
              <th>HSN</th>
              <th>Pack</th>
              <th>MRP</th>
              <th>Rate</th>
              <th>GST%</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-white">{p.name || '-'}</td>
                <td>{p.mfr || '-'}</td>
                <td>{p.hsn || '-'}</td>
                <td>{p.pack || '-'}</td>
                <td>{'\u20B9'}{(parseFloat(p.mrp) || 0).toFixed(2)}</td>
                <td>{'\u20B9'}{(parseFloat(p.rate) || 0).toFixed(2)}</td>
                <td>{p.gstPercent}%</td>
                <td>
                  <button onClick={() => handleDelete(p.id)} className="text-sm" style={{ color: 'var(--danger-text)' }}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="8" className="text-center py-6" style={{ color: 'var(--text-muted)' }}>No products yet. Add your first!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
