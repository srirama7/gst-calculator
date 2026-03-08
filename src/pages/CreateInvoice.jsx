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
  mrp: 0, rate: 0, discount: 0, gstPercent: 18,
  gstMode: 'exclude' // 'exclude' = rate is base price, GST added on top; 'include' = rate already has GST
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
      const qty = parseFloat(items[index].qty) || 0;
      const rate = parseFloat(items[index].rate) || 0;
      const disc = parseFloat(items[index].discount) || 0;
      const gstPercent = parseFloat(items[index].gstPercent) || 0;
      const gstMode = items[index].gstMode || 'exclude';

      if (gstMode === 'include') {
        // Rate already includes GST, back-calculate base price
        const baseRate = rate / (1 + gstPercent / 100);
        const subtotal = qty * baseRate;
        items[index].amount = subtotal - (subtotal * disc / 100);
      } else {
        // Rate is base price, GST will be added on top (default)
        const subtotal = qty * rate;
        items[index].amount = subtotal - (subtotal * disc / 100);
      }
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
    const qty = parseFloat(i.qty) || 0;
    const rate = parseFloat(i.rate) || 0;
    const gstPercent = parseFloat(i.gstPercent) || 0;
    const gstMode = i.gstMode || 'exclude';
    const baseRate = gstMode === 'include' ? rate / (1 + gstPercent / 100) : rate;
    const sub = qty * baseRate;
    return s + (sub * (parseFloat(i.discount) || 0) / 100);
  }, 0);
  const taxableAmount = subTotal;
  const cgstAmount = items.reduce((s, i) => s + ((i.amount || 0) * (parseFloat(i.gstPercent) || 0) / 2 / 100), 0);
  const sgstAmount = cgstAmount;
  const igstAmount = 0;
  const freight = parseFloat(invoice.freight) || 0;
  const beforeRound = taxableAmount + cgstAmount + sgstAmount + igstAmount + freight;
  const grandTotal = Math.round(beforeRound);
  const roundOff = +(grandTotal - beforeRound).toFixed(2);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  function buildInvoiceData() {
    return {
      ...invoice,
      subTotal, discount: totalDiscount, taxableAmount,
      cgstAmount, sgstAmount, igstAmount, freight, roundOff, grandTotal,
      amountInWords: numberToWords(grandTotal)
    };
  }

  function handlePreviewPDF() {
    try {
      const data = buildInvoiceData();
      const pdfDoc = generateInvoicePDF(data, company);
      const blob = pdfDoc.output('blob');
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (e) {
      toast.error('PDF preview failed: ' + e.message);
    }
  }

  function handleDownloadPDF() {
    try {
      const data = buildInvoiceData();
      const pdfDoc = generateInvoicePDF(data, company);
      pdfDoc.save(`Invoice_${invoice.invoiceNo || 'draft'}.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('PDF download failed: ' + e.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    const data = {
      ...invoice,
      invoiceNo: parseInt(invoice.invoiceNo) || 1,
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

  const inputSmall = "input-dark text-xs py-1.5 px-2";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gradient">Create Invoice</h1>
        <div className="flex gap-3">
          <button onClick={handlePreviewPDF} className="btn-neon btn-glass text-sm">
            Preview PDF
          </button>
          <button onClick={handleDownloadPDF} className="btn-neon btn-cyan text-sm">
            Download PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-neon text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="glass-card p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label-dark">Invoice No.</label>
            <input type="number" value={invoice.invoiceNo}
              onChange={e => setInvoice(prev => ({ ...prev, invoiceNo: e.target.value }))}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Date</label>
            <input type="text" value={invoice.date}
              onChange={e => setInvoice(prev => ({ ...prev, date: e.target.value }))}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Due Date</label>
            <input type="text" value={invoice.dueDate}
              onChange={e => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
              className="input-dark" />
          </div>
          <div>
            <label className="label-dark">Bill Type</label>
            <select value={invoice.billType}
              onChange={e => setInvoice(prev => ({ ...prev, billType: e.target.value }))}
              className="input-dark">
              <option>CREDIT BILL</option>
              <option>CASH BILL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer + Transport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gradient">Customer Details</h2>
            <select onChange={e => selectCustomer(e.target.value)}
              className="input-dark text-xs py-1.5 w-auto">
              <option value="">-- Select saved customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-dark">Name</label>
              <input type="text" value={invoice.customer.name} onChange={e => updateCustomer('name', e.target.value)} className="input-dark" />
            </div>
            <div className="col-span-2">
              <label className="label-dark">Address</label>
              <input type="text" value={invoice.customer.address} onChange={e => updateCustomer('address', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">City</label>
              <input type="text" value={invoice.customer.city} onChange={e => updateCustomer('city', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Pincode</label>
              <input type="text" value={invoice.customer.pincode} onChange={e => updateCustomer('pincode', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">GSTIN</label>
              <input type="text" value={invoice.customer.gstin} onChange={e => updateCustomer('gstin', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Phone</label>
              <input type="text" value={invoice.customer.phone} onChange={e => updateCustomer('phone', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">D.L. No.</label>
              <input type="text" value={invoice.customer.dlNo} onChange={e => updateCustomer('dlNo', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Rep Name</label>
              <input type="text" value={invoice.repName} onChange={e => setInvoice(prev => ({ ...prev, repName: e.target.value }))} className="input-dark" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-gradient mb-4">Transport Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-dark">Transport Name</label>
              <input type="text" value={invoice.transport.name} onChange={e => updateTransport('name', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">L.R. No.</label>
              <input type="text" value={invoice.transport.lrNo} onChange={e => updateTransport('lrNo', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">L.R. Date</label>
              <input type="text" value={invoice.transport.lrDate} onChange={e => updateTransport('lrDate', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">No of C/s</label>
              <input type="text" value={invoice.transport.noOfCs} onChange={e => updateTransport('noOfCs', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label className="label-dark">Phone</label>
              <input type="text" value={invoice.transport.phone} onChange={e => updateTransport('phone', e.target.value)} className="input-dark" />
            </div>
          </div>

          <h2 className="text-sm font-bold text-gradient mt-5 mb-3">Additional</h2>
          <div>
            <label className="label-dark">Freight</label>
            <input type="number" step="0.01" value={invoice.freight}
              onChange={e => setInvoice(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
              className="input-dark" />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card p-5 mb-5 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gradient">Items</h2>
          <button onClick={addItem} className="btn-neon btn-success text-xs py-1.5 px-4">+ Add Item</button>
        </div>
        <table className="min-w-full text-xs">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
              {['Sl','Mfr','Particulars','HSN','Pack','Qty','Free','Batch No','Exp','MRP','Rate','Disc%','GST%','GST Mode','Amount',''].map(h => (
                <th key={h} className="px-1 py-2 text-left text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="px-1 py-1 text-center text-gray-400">{i + 1}</td>
                <td><input type="text" value={item.mfr} onChange={e => updateItem(i, 'mfr', e.target.value)} className={`${inputSmall} w-14`} /></td>
                <td><input type="text" value={item.particulars} onChange={e => updateItem(i, 'particulars', e.target.value)} className={`${inputSmall} w-36`} /></td>
                <td><input type="text" value={item.hsn} onChange={e => updateItem(i, 'hsn', e.target.value)} className={`${inputSmall} w-14`} /></td>
                <td><input type="text" value={item.pack} onChange={e => updateItem(i, 'pack', e.target.value)} className={`${inputSmall} w-14`} /></td>
                <td><input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} className={`${inputSmall} w-12`} /></td>
                <td><input type="number" value={item.free} onChange={e => updateItem(i, 'free', e.target.value)} className={`${inputSmall} w-10`} /></td>
                <td><input type="text" value={item.batchNo} onChange={e => updateItem(i, 'batchNo', e.target.value)} className={`${inputSmall} w-16`} /></td>
                <td><input type="text" value={item.exp} onChange={e => updateItem(i, 'exp', e.target.value)} className={`${inputSmall} w-14`} placeholder="MM/YY" /></td>
                <td><input type="number" step="0.01" value={item.mrp} onChange={e => updateItem(i, 'mrp', e.target.value)} className={`${inputSmall} w-16`} /></td>
                <td><input type="number" step="0.01" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className={`${inputSmall} w-14`} /></td>
                <td><input type="number" step="0.01" value={item.discount} onChange={e => updateItem(i, 'discount', e.target.value)} className={`${inputSmall} w-12`} /></td>
                <td>
                  <select value={item.gstPercent} onChange={e => updateItem(i, 'gstPercent', parseFloat(e.target.value))} className={`${inputSmall} w-14`}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </td>
                <td>
                  <select value={item.gstMode || 'exclude'} onChange={e => updateItem(i, 'gstMode', e.target.value)} className={`${inputSmall} w-20`}>
                    <option value="exclude">Excl.</option>
                    <option value="include">Incl.</option>
                  </select>
                </td>
                <td className="px-1 py-1 text-right font-medium" style={{ color: '#00ffcc' }}>{'\u20B9'}{(item.amount || 0).toFixed(2)}</td>
                <td>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} style={{ color: '#ff6b6b' }} className="px-1 hover:opacity-70">x</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="glass-card p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Sub Total:</span><span className="font-medium text-white">{'\u20B9'}{subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Discount:</span><span className="font-medium text-white">{'\u20B9'}{totalDiscount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">CGST:</span><span className="font-medium text-white">{'\u20B9'}{cgstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">SGST:</span><span className="font-medium text-white">{'\u20B9'}{sgstAmount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">IGST:</span><span className="font-medium text-white">{'\u20B9'}{igstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Freight:</span><span className="font-medium text-white">{'\u20B9'}{freight.toFixed(2)}</span></div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Round Off:</span><span className="font-medium text-white">{'\u20B9'}{roundOff.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="font-bold text-white">GRAND TOTAL:</span>
              <span className="font-bold" style={{ color: '#00ffcc' }}>{'\u20B9'}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p className="text-xs mt-3 italic" style={{ color: '#707070' }}>{numberToWords(grandTotal)}</p>
      </div>

      {/* Terms */}
      <div className="glass-card p-5 mb-5">
        <label className="label-dark">Terms & Conditions</label>
        <textarea value={invoice.terms}
          onChange={e => setInvoice(prev => ({ ...prev, terms: e.target.value }))}
          rows={4} className="input-dark mt-1" />
      </div>

      {/* PDF Preview */}
      {pdfPreviewUrl && (
        <div className="glass-card p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gradient">PDF Preview</h2>
            <button onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}
              style={{ color: '#ff6b6b' }} className="text-sm hover:opacity-70">Close Preview</button>
          </div>
          <iframe src={pdfPreviewUrl} className="w-full rounded-xl" style={{ height: '80vh', border: '1px solid rgba(255,255,255,0.1)' }} title="Invoice PDF Preview" />
        </div>
      )}
    </div>
  );
}
