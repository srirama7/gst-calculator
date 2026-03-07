import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { collection, addDoc, getDocs, doc, getDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { numberToWords } from '../utils/numberToWords'
import { generateInvoicePDF } from '../utils/generatePDF'
import toast from 'react-hot-toast'

const emptyItem = {
  mfr: '', particulars: '', hsn: '', pack: '',
  qty: 0, free: 0, batchNo: '', exp: '',
  mrp: 0, rate: 0, discount: 0, gstPercent: 18
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [company, setCompany] = useState({});
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);

  const [invoice, setInvoice] = useState({
    invoiceNo: '',
    date: new Date().toLocaleDateString('en-IN'),
    dueDate: '',
    billType: 'CREDIT BILL',
    customer: { name: '', address: '', city: '', pincode: '', gstin: '', phone: '', dlNo: '' },
    transport: { name: '', lrNo: '', lrDate: '', noOfCs: '', phone: '' },
    repName: '',
    items: [{ ...emptyItem }],
    freight: 0,
    terms: '1) We are registered under GST Rule and liable to pay tax.\n2) Goods once sold will not be taken back or exchanged\n3) Interest will be charged @24%p.a for the delayed payment if not made within duedate\n4) Payments should be made by Draft or Cheques in the name of company only'
  });

  useEffect(() => {
    loadCompany();
    loadCustomers();
    loadNextInvoiceNo();
  }, []);

  async function loadCompany() {
    try {
      const snap = await getDoc(doc(db, 'companies', 'default'));
      if (snap.exists()) setCompany(snap.data());
    } catch (e) { /* silently fail */ }
  }

  async function loadCustomers() {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { /* silently fail */ }
  }

  async function loadNextInvoiceNo() {
    try {
      const q = query(collection(db, 'invoices'), orderBy('invoiceNo', 'desc'), limit(1));
      const snap = await getDocs(q);
      const lastNo = snap.empty ? 0 : (snap.docs[0].data().invoiceNo || 0);
      setInvoice(prev => ({ ...prev, invoiceNo: lastNo + 1 }));
    } catch (e) {
      setInvoice(prev => ({ ...prev, invoiceNo: 1 }));
    }
  }

  function selectCustomer(custId) {
    const c = customers.find(x => x.id === custId);
    if (c) {
      setInvoice(prev => ({
        ...prev,
        customer: { name: c.name, address: c.address, city: c.city, pincode: c.pincode, gstin: c.gstin, phone: c.phone, dlNo: c.dlNo || '' }
      }));
    }
  }

  function updateCustomer(field, value) {
    setInvoice(prev => ({ ...prev, customer: { ...prev.customer, [field]: value } }));
  }

  function updateTransport(field, value) {
    setInvoice(prev => ({ ...prev, transport: { ...prev.transport, [field]: value } }));
  }

  function updateItem(index, field, value) {
    setInvoice(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      // Recalculate amount
      const qty = parseFloat(items[index].qty) || 0;
      const rate = parseFloat(items[index].rate) || 0;
      const disc = parseFloat(items[index].discount) || 0;
      const subtotal = qty * rate;
      items[index].amount = subtotal - (subtotal * disc / 100);
      return { ...prev, items };
    });
  }

  function addItem() {
    setInvoice(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }

  // Calculate totals
  const items = invoice.items;
  const subTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalDiscount = items.reduce((s, i) => {
    const sub = (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0);
    return s + (sub * (parseFloat(i.discount) || 0) / 100);
  }, 0);
  const taxableAmount = subTotal;
  const cgstAmount = items.reduce((s, i) => s + ((i.amount || 0) * (parseFloat(i.gstPercent) || 0) / 2 / 100), 0);
  const sgstAmount = cgstAmount;
  const igstAmount = 0; // For inter-state, swap with cgst+sgst
  const freight = parseFloat(invoice.freight) || 0;
  const beforeRound = taxableAmount + cgstAmount + sgstAmount + igstAmount + freight;
  const grandTotal = Math.round(beforeRound);
  const roundOff = +(grandTotal - beforeRound).toFixed(2);

  async function handleSave() {
    setSaving(true);
    const data = {
      ...invoice,
      invoiceNo: parseInt(invoice.invoiceNo),
      subTotal,
      discount: totalDiscount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      freight,
      roundOff,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      createdAt: serverTimestamp()
    };

    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out. Please check your Firebase Firestore database is created and rules allow writes.')), 10000));
      const docRef = await Promise.race([addDoc(collection(db, 'invoices'), data), timeout]);
      toast.success('Invoice saved!');
      navigate(`/invoice/${docRef.id}`);
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    }
    setSaving(false);
  }

  function handlePreviewPDF() {
    const data = {
      ...invoice,
      subTotal, discount: totalDiscount, taxableAmount,
      cgstAmount, sgstAmount, igstAmount, freight, roundOff, grandTotal,
      amountInWords: numberToWords(grandTotal)
    };
    const pdfDoc = generateInvoicePDF(data, company);
    pdfDoc.output('dataurlnewwindow');
  }

  const inputClass = "mt-1 block w-full rounded border-gray-300 border px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Create Invoice</h1>
        <div className="flex gap-2">
          <button onClick={handlePreviewPDF}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm">
            Preview PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Invoice No.</label>
            <input type="number" value={invoice.invoiceNo}
              onChange={e => setInvoice(prev => ({ ...prev, invoiceNo: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input type="text" value={invoice.date}
              onChange={e => setInvoice(prev => ({ ...prev, date: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="text" value={invoice.dueDate}
              onChange={e => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bill Type</label>
            <select value={invoice.billType}
              onChange={e => setInvoice(prev => ({ ...prev, billType: e.target.value }))}
              className={inputClass}>
              <option>CREDIT BILL</option>
              <option>CASH BILL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer + Transport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-gray-700">Customer Details</h2>
            <select onChange={e => selectCustomer(e.target.value)}
              className="text-xs border rounded px-2 py-1">
              <option value="">-- Select saved customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Name</label>
              <input type="text" value={invoice.customer.name} onChange={e => updateCustomer('name', e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Address</label>
              <input type="text" value={invoice.customer.address} onChange={e => updateCustomer('address', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={invoice.customer.city} onChange={e => updateCustomer('city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input type="text" value={invoice.customer.pincode} onChange={e => updateCustomer('pincode', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GSTIN</label>
              <input type="text" value={invoice.customer.gstin} onChange={e => updateCustomer('gstin', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={invoice.customer.phone} onChange={e => updateCustomer('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>D.L. No.</label>
              <input type="text" value={invoice.customer.dlNo} onChange={e => updateCustomer('dlNo', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rep Name</label>
              <input type="text" value={invoice.repName} onChange={e => setInvoice(prev => ({ ...prev, repName: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Transport Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Transport Name</label>
              <input type="text" value={invoice.transport.name} onChange={e => updateTransport('name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>L.R. No.</label>
              <input type="text" value={invoice.transport.lrNo} onChange={e => updateTransport('lrNo', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>L.R. Date</label>
              <input type="text" value={invoice.transport.lrDate} onChange={e => updateTransport('lrDate', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>No of C/s</label>
              <input type="text" value={invoice.transport.noOfCs} onChange={e => updateTransport('noOfCs', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={invoice.transport.phone} onChange={e => updateTransport('phone', e.target.value)} className={inputClass} />
            </div>
          </div>

          <h2 className="text-sm font-bold text-gray-700 mt-4 mb-2">Additional</h2>
          <div>
            <label className={labelClass}>Freight</label>
            <input type="number" step="0.01" value={invoice.freight}
              onChange={e => setInvoice(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
              className={inputClass} />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 overflow-x-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-gray-700">Items</h2>
          <button onClick={addItem} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">+ Add Item</button>
        </div>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-1 py-2">Sl</th>
              <th className="px-1 py-2">Mfr</th>
              <th className="px-1 py-2">Particulars</th>
              <th className="px-1 py-2">HSN</th>
              <th className="px-1 py-2">Pack</th>
              <th className="px-1 py-2">Qty</th>
              <th className="px-1 py-2">Free</th>
              <th className="px-1 py-2">Batch No</th>
              <th className="px-1 py-2">Exp</th>
              <th className="px-1 py-2">MRP</th>
              <th className="px-1 py-2">Rate</th>
              <th className="px-1 py-2">Disc%</th>
              <th className="px-1 py-2">GST%</th>
              <th className="px-1 py-2">Amount</th>
              <th className="px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="px-1 py-1 text-center">{i + 1}</td>
                <td><input type="text" value={item.mfr} onChange={e => updateItem(i, 'mfr', e.target.value)} className="w-14 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="text" value={item.particulars} onChange={e => updateItem(i, 'particulars', e.target.value)} className="w-36 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="text" value={item.hsn} onChange={e => updateItem(i, 'hsn', e.target.value)} className="w-14 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="text" value={item.pack} onChange={e => updateItem(i, 'pack', e.target.value)} className="w-14 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} className="w-12 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="number" value={item.free} onChange={e => updateItem(i, 'free', e.target.value)} className="w-10 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="text" value={item.batchNo} onChange={e => updateItem(i, 'batchNo', e.target.value)} className="w-16 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="text" value={item.exp} onChange={e => updateItem(i, 'exp', e.target.value)} className="w-14 border rounded px-1 py-1 text-xs" placeholder="MM/YY" /></td>
                <td><input type="number" step="0.01" value={item.mrp} onChange={e => updateItem(i, 'mrp', e.target.value)} className="w-16 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="number" step="0.01" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className="w-14 border rounded px-1 py-1 text-xs" /></td>
                <td><input type="number" step="0.01" value={item.discount} onChange={e => updateItem(i, 'discount', e.target.value)} className="w-12 border rounded px-1 py-1 text-xs" /></td>
                <td>
                  <select value={item.gstPercent} onChange={e => updateItem(i, 'gstPercent', parseFloat(e.target.value))} className="w-14 border rounded px-1 py-1 text-xs">
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </td>
                <td className="px-1 py-1 text-right font-medium">₹{(item.amount || 0).toFixed(2)}</td>
                <td>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 px-1">x</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Sub Total:</span><span className="font-medium">₹{subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Discount:</span><span className="font-medium">₹{totalDiscount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">CGST:</span><span className="font-medium">₹{cgstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">SGST:</span><span className="font-medium">₹{sgstAmount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">IGST:</span><span className="font-medium">₹{igstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Freight:</span><span className="font-medium">₹{freight.toFixed(2)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Round Off:</span><span className="font-medium">₹{roundOff.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg border-t pt-2">
              <span className="font-bold text-gray-800">GRAND TOTAL:</span>
              <span className="font-bold text-indigo-700">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">{numberToWords(grandTotal)}</p>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <label className={labelClass}>Terms & Conditions</label>
        <textarea value={invoice.terms}
          onChange={e => setInvoice(prev => ({ ...prev, terms: e.target.value }))}
          rows={4} className="mt-1 block w-full rounded border-gray-300 border px-3 py-2 text-sm shadow-sm" />
      </div>
    </div>
  );
}
