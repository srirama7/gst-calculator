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
      const snap = await getDoc(doc(db, 'companies', COMPANY_DOC));
      if (snap.exists()) setCompany(snap.data());
    } catch (e) {
      toast.error('Failed to load company: ' + e.message);
    }
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'companies', COMPANY_DOC), company);
      toast.success('Company details saved!');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
  }

  function update(field, value) {
    setCompany(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Company Settings</h1>
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input type="text" value={company.name} onChange={e => update('name', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input type="text" value={company.phone} onChange={e => update('phone', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input type="text" value={company.address} onChange={e => update('address', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input type="text" value={company.city} onChange={e => update('city', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pincode</label>
            <input type="text" value={company.pincode} onChange={e => update('pincode', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={company.email} onChange={e => update('email', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">GSTIN</label>
            <input type="text" value={company.gstin} onChange={e => update('gstin', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">D.L. No.</label>
            <input type="text" value={company.dlNo} onChange={e => update('dlNo', e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 shadow-sm" />
          </div>
        </div>
        <button type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 font-medium">
          Save Company Details
        </button>
      </form>
    </div>
  );
}
