import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'

const COMPANY_DOC = 'default';

export default function Settings() {
  const [company, setCompany] = useState({
    name: '', address: '', city: '', pincode: '',
    phone: '', email: '', gstin: '', dlNo: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 8000));
      const snap = await Promise.race([getDoc(doc(db, 'companies', COMPANY_DOC)), timeout]);
      if (snap.exists()) setCompany(snap.data());
    } catch (e) {
      toast.error('Failed to load company: ' + e.message);
    }
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out. Check Firestore rules.')), 10000));
      await Promise.race([setDoc(doc(db, 'companies', COMPANY_DOC), company), timeout]);
      toast.success('Company details saved!');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
  }

  function update(field, value) {
    setCompany(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gradient mb-8">Company Settings</h1>
      <form onSubmit={handleSave} className="glass-card p-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-dark">Company Name</label>
            <input type="text" value={company.name} onChange={e => update('name', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Phone</label>
            <input type="text" value={company.phone} onChange={e => update('phone', e.target.value)}
              className="input-dark" />
          </div>
          <div className="md:col-span-2">
            <label className="label-dark">Address</label>
            <input type="text" value={company.address} onChange={e => update('address', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">City</label>
            <input type="text" value={company.city} onChange={e => update('city', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Pincode</label>
            <input type="text" value={company.pincode} onChange={e => update('pincode', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Email</label>
            <input type="email" value={company.email} onChange={e => update('email', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">GSTIN</label>
            <input type="text" value={company.gstin} onChange={e => update('gstin', e.target.value)}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">D.L. No.</label>
            <input type="text" value={company.dlNo} onChange={e => update('dlNo', e.target.value)}
              className="input-dark" />
          </div>
        </div>
        <button type="submit" className="btn-neon w-full text-center">
          Save Company Details
        </button>
      </form>
    </div>
  );
}
