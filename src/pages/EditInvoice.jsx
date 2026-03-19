import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { numberToWords } from '../utils/numberToWords'
import { generateInvoicePDF } from '../utils/generatePDF'
import { downloadPdf, getPdfPreviewUrl, isNativePlatform, savePdfToDevice, sharePdf } from '../utils/mobilePdf'
import toast from 'react-hot-toast'

const emptyItem = {
  mfr: '', particulars: '', hsn: '', pack: '',
  qty: 0, free: 0, batchNo: '', exp: '',
  mrp: 0, rate: 0, discount: 0, gstPercent: 18,
  gstMode: 'exclude'
};

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [invoice, setInvoice] = useState({
    invoiceNo: '',
    date: '',
    dueDate: '',
    billType: 'CREDIT BILL',
    customer: { name: '', address: '', city: '', pincode: '', gstin: '', phone: '', dlNo: '' },
    transport: { name: '', lrNo: '', lrDate: '', noOfCs: '', phone: '' },
    repName: '',
    items: [{ ...emptyItem }],
    freight: 0,
    terms: ''
  });

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    try {
      const [invSnap, compSnap, custSnap, prodSnap] = await Promise.all([
        getDoc(doc(db, 'invoices', id)),
        getDoc(doc(db, 'companies', 'default')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'products'))
      ]);

      if (compSnap.exists()) setCompany(compSnap.data());
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (invSnap.exists()) {
        const data = invSnap.data();
        setInvoice({
          invoiceNo: data.invoiceNo || '',
          date: data.date || '',
          dueDate: data.dueDate || '',
          billType: data.billType || 'CREDIT BILL',
          customer: data.customer || { name: '', address: '', city: '', pincode: '', gstin: '', phone: '', dlNo: '' },
          transport: data.transport || { name: '', lrNo: '', lrDate: '', noOfCs: '', phone: '' },
          repName: data.repName || '',
          items: (data.items && data.items.length > 0) ? data.items.map(item => ({
            ...emptyItem,
            ...item,
            qty: item.qty || 0,
            free: item.free || 0,
            mrp: item.mrp || 0,
            rate: item.rate || 0,
            discount: item.discount || 0,
            gstPercent: item.gstPercent || 18,
            gstMode: item.gstMode || 'exclude',
            amount: item.amount || 0,
          })) : [{ ...emptyItem }],
          freight: data.freight || 0,
          terms: data.terms || ''
        });
      } else {
        toast.error('Invoice not found');
        navigate('/');
      }
    } catch (e) {
      toast.error('Failed to load invoice: ' + e.message);
    }
    setLoading(false);
  }

  function selectProduct(index, prodId) {
    const p = products.find(x => x.id === prodId);
    if (p) {
      setInvoice(prev => {
        const items = [...prev.items];
        items[index] = {
          ...items[index],
          mfr: p.mfr || '',
          particulars: p.name || '',
          hsn: p.hsn || '',
          pack: p.pack || '',
          mrp: parseFloat(p.mrp) || 0,
          rate: parseFloat(p.rate) || 0,
          gstPercent: parseFloat(p.gstPercent) || 18
        };
        const qty = parseFloat(items[index].qty) || 0;
        const rate = parseFloat(items[index].rate) || 0;
        const disc = parseFloat(items[index].discount) || 0;
        const gstPercent = parseFloat(items[index].gstPercent) || 0;
        const gstMode = items[index].gstMode || 'exclude';
        if (gstMode === 'include') {
          const baseRate = rate / (1 + gstPercent / 100);
          const subtotal = qty * baseRate;
          items[index].amount = subtotal - (subtotal * disc / 100);
        } else {
          const subtotal = qty * rate;
          items[index].amount = subtotal - (subtotal * disc / 100);
        }
        return { ...prev, items };
      });
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
        const baseRate = rate / (1 + gstPercent / 100);
        const subtotal = qty * baseRate;
        items[index].amount = subtotal - (subtotal * disc / 100);
      } else {
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

  async function handlePreviewPDF() {
    try {
      const data = buildInvoiceData();
      const pdfDoc = generateInvoicePDF(data, company);
      if (isNativePlatform()) {
        const filename = `Invoice_${invoice.invoiceNo || 'draft'}.pdf`;
        const uri = await savePdfToDevice(pdfDoc, filename);
        await sharePdf(uri, filename);
      } else {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        const url = getPdfPreviewUrl(pdfDoc);
        setPdfPreviewUrl(url);
      }
    } catch (e) {
      toast.error('PDF preview failed: ' + e.message);
    }
  }

  async function handleDownloadPDF() {
    try {
      const data = buildInvoiceData();
      const pdfDoc = generateInvoicePDF(data, company);
      const filename = `Invoice_${invoice.invoiceNo || 'draft'}.pdf`;
      await downloadPdf(pdfDoc, filename);
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
      updatedAt: serverTimestamp()
    };

    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out.')), 10000));
      await Promise.race([updateDoc(doc(db, 'invoices', id), data), timeout]);
      toast.success('Invoice updated!');
      navigate(`/invoice/${id}`);
    } catch (e) {
      toast.error('Failed to update: ' + e.message);
    }
    setSaving(false);
  }

  const inputSmall = "input-dark text-xs py-1.5 px-2";

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link to={`/invoice/${id}`} style={{ color: 'var(--accent)' }} className="text-sm hover:opacity-70">&larr; Back to Invoice</Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient mt-2">Edit Invoice #{invoice.invoiceNo}</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={handlePreviewPDF} className="btn-neon btn-glass text-xs sm:text-sm py-2.5 px-4 sm:px-6">
            {isNativePlatform() ? 'View PDF' : 'Preview PDF'}
          </button>
          <button onClick={handleDownloadPDF} className="btn-neon btn-cyan text-xs sm:text-sm py-2.5 px-4 sm:px-6">
            Download PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-neon text-xs sm:text-sm py-2.5 px-4 sm:px-6 disabled:opacity-50">
            {saving ? 'Saving...' : 'Update Invoice'}
          </button>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="glass-card p-6 sm:p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-gradient">Customer Details</h2>
            <select onChange={e => selectCustomer(e.target.value)}
              className="input-dark text-xs py-1.5 w-auto">
              <option value="">-- Select saved customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="label-dark">Name</label>
              <input type="text" value={invoice.customer.name} onChange={e => updateCustomer('name', e.target.value)} className="input-dark" />
            </div>
            <div className="sm:col-span-2">
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

        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-sm font-bold text-gradient mb-6">Transport Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
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

          <h2 className="text-sm font-bold text-gradient mt-8 mb-4">Additional</h2>
          <div>
            <label className="label-dark">Freight</label>
            <input type="number" step="0.01" value={invoice.freight}
              onChange={e => setInvoice(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
              className="input-dark" />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card p-6 sm:p-8 mb-8 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-gradient">Items</h2>
          <button onClick={addItem} className="btn-neon btn-success text-xs py-2 px-5">+ Add Item</button>
        </div>
        <div className="space-y-6">
          {items.map((item, i) => (
            <div key={i} className="p-5 sm:p-6 rounded-lg" style={{ background: 'var(--item-card-bg)', border: '1px solid var(--item-card-border)' }}>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400">Item {i + 1}</span>
                  <select onChange={e => selectProduct(i, e.target.value)}
                    className="input-dark text-xs py-1 px-2 w-auto">
                    <option value="">-- Select product --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold" style={{ color: 'var(--success-text)' }}>{'\u20B9'}{(item.amount || 0).toFixed(2)}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} style={{ color: 'var(--danger-text)' }} className="text-xs px-2 py-1 hover:opacity-70 rounded" title="Remove item">x</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Mfr</label>
                  <input type="text" value={item.mfr} onChange={e => updateItem(i, 'mfr', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-2 block">Particulars</label>
                  <input type="text" value={item.particulars} onChange={e => updateItem(i, 'particulars', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">HSN</label>
                  <input type="text" value={item.hsn} onChange={e => updateItem(i, 'hsn', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Pack</label>
                  <input type="text" value={item.pack} onChange={e => updateItem(i, 'pack', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Qty</label>
                  <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Free</label>
                  <input type="number" value={item.free} onChange={e => updateItem(i, 'free', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Batch No</label>
                  <input type="text" value={item.batchNo} onChange={e => updateItem(i, 'batchNo', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Exp</label>
                  <input type="text" value={item.exp} onChange={e => updateItem(i, 'exp', e.target.value)} className={`${inputSmall} w-full`} placeholder="MM/YY" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">MRP</label>
                  <input type="number" step="0.01" value={item.mrp} onChange={e => updateItem(i, 'mrp', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Rate</label>
                  <input type="number" step="0.01" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Disc%</label>
                  <input type="number" step="0.01" value={item.discount} onChange={e => updateItem(i, 'discount', e.target.value)} className={`${inputSmall} w-full`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">GST%</label>
                  <select value={item.gstPercent} onChange={e => updateItem(i, 'gstPercent', parseFloat(e.target.value))} className={`${inputSmall} w-full`}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">GST Mode</label>
                  <select value={item.gstMode || 'exclude'} onChange={e => updateItem(i, 'gstMode', e.target.value)} className={`${inputSmall} w-full`}>
                    <option value="exclude">Exclude</option>
                    <option value="include">Include</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="glass-card p-6 sm:p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Sub Total:</span><span className="font-medium text-white">{'\u20B9'}{subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Discount:</span><span className="font-medium text-white">{'\u20B9'}{totalDiscount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">CGST:</span><span className="font-medium text-white">{'\u20B9'}{cgstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">SGST:</span><span className="font-medium text-white">{'\u20B9'}{sgstAmount.toFixed(2)}</span></div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">IGST:</span><span className="font-medium text-white">{'\u20B9'}{igstAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Freight:</span><span className="font-medium text-white">{'\u20B9'}{freight.toFixed(2)}</span></div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Round Off:</span><span className="font-medium text-white">{'\u20B9'}{roundOff.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="font-bold text-white">GRAND TOTAL:</span>
              <span className="font-bold" style={{ color: 'var(--success-text)' }}>{'\u20B9'}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p className="text-xs mt-4 italic" style={{ color: 'var(--text-muted)' }}>{numberToWords(grandTotal)}</p>
      </div>

      {/* Terms */}
      <div className="glass-card p-6 sm:p-8 mb-8">
        <label className="label-dark">Terms & Conditions</label>
        <textarea value={invoice.terms}
          onChange={e => setInvoice(prev => ({ ...prev, terms: e.target.value }))}
          rows={4} className="input-dark mt-2" />
      </div>

      {/* PDF Preview */}
      {pdfPreviewUrl && (
        <div className="glass-card p-6 sm:p-8 mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-bold text-gradient">PDF Preview</h2>
            <button onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}
              style={{ color: 'var(--danger-text)' }} className="text-sm hover:opacity-70">Close Preview</button>
          </div>
          <iframe src={pdfPreviewUrl} className="w-full rounded-xl" style={{ height: '80vh', border: '1px solid var(--border-color)' }} title="Invoice PDF Preview" />
        </div>
      )}
    </div>
  );
}
