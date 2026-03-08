import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { generateInvoicePDF } from '../utils/generatePDF'
import toast from 'react-hot-toast'

function safeFixed(val, digits = 2) {
  const num = parseFloat(val);
  return isNaN(num) ? '0.00' : num.toFixed(digits);
}

export default function ViewInvoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [invSnap, compSnap] = await Promise.all([
        getDoc(doc(db, 'invoices', id)),
        getDoc(doc(db, 'companies', 'default'))
      ]);
      let inv = null;
      let comp = {};
      if (invSnap.exists()) inv = { id: invSnap.id, ...invSnap.data() };
      if (compSnap.exists()) comp = compSnap.data();
      setInvoice(inv);
      setCompany(comp);

      // Auto-generate PDF preview
      if (inv) {
        try {
          const pdfDoc = generateInvoicePDF(inv, comp);
          const blob = pdfDoc.output('blob');
          setPdfUrl(URL.createObjectURL(blob));
        } catch (e) {
          console.error('PDF generation failed:', e);
        }
      }
    } catch (e) {
      toast.error('Failed to load: ' + e.message);
    }
    setLoading(false);
  }

  function handleDownload() {
    try {
      const pdfDoc = generateInvoicePDF(invoice, company);
      pdfDoc.save(`Invoice_${invoice.invoiceNo || 'draft'}.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('PDF download failed: ' + e.message);
    }
  }

  function handleRegenerate() {
    try {
      const pdfDoc = generateInvoicePDF(invoice, company);
      const blob = pdfDoc.output('blob');
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast.error('PDF preview failed: ' + e.message);
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!invoice) return <div className="text-center py-10 text-gray-400">Invoice not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/" style={{ color: '#00ccff' }} className="text-sm hover:opacity-70">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gradient mt-1">Invoice #{invoice.invoiceNo}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRegenerate} className="btn-neon btn-glass text-sm">
            Refresh Preview
          </button>
          <button onClick={handleDownload} className="btn-neon btn-cyan text-sm">
            Download PDF
          </button>
        </div>
      </div>

      {/* PDF Preview - shown by default */}
      {pdfUrl && (
        <div className="glass-card p-5 mb-6">
          <h2 className="text-sm font-bold text-gradient mb-3">Invoice PDF</h2>
          <iframe src={pdfUrl} className="w-full rounded-xl" style={{ height: '85vh', border: '1px solid rgba(255,255,255,0.1)' }} title="Invoice PDF Preview" />
        </div>
      )}

      {/* Invoice Details Summary */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-gradient mb-4">Invoice Details</h2>

        {/* Header */}
        <div className="text-center pb-5 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs text-gray-500">TAX INVOICE</p>
          <h2 className="text-xl font-bold text-gradient">{company.name}</h2>
          <p className="text-sm text-gray-400">{company.address}</p>
          <p className="text-sm text-gray-400">{company.city} - {company.pincode}</p>
          <p className="text-xs text-gray-500">Ph: {company.phone} | Email: {company.email}</p>
          <p className="text-xs text-gray-500">GSTIN: {company.gstin} | D.L.No: {company.dlNo}</p>
        </div>

        {/* Invoice info */}
        <div className="flex justify-between pb-4 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div><span className="font-semibold text-sm text-gray-300">INV No:</span> <span className="text-sm" style={{ color: '#00ffcc' }}>{invoice.invoiceNo}</span></div>
          <div className="font-semibold text-sm text-gray-300">{invoice.billType}</div>
          <div><span className="font-semibold text-sm text-gray-300">Date:</span> <span className="text-sm text-gray-400">{invoice.date}</span></div>
        </div>

        {/* Customer + Transport */}
        <div className="grid grid-cols-2 gap-6 pb-5 mb-5 text-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <p className="font-bold italic" style={{ color: '#00ffcc' }}>{invoice.customer?.name}</p>
            <p className="text-gray-400">{invoice.customer?.address}</p>
            <p className="text-gray-400">{invoice.customer?.city} - {invoice.customer?.pincode}</p>
            <p className="text-gray-400">GSTIN: {invoice.customer?.gstin}</p>
            <p className="text-gray-400">Phone: {invoice.customer?.phone}</p>
            <p className="text-gray-400">Rep: {invoice.repName}</p>
          </div>
          <div className="text-gray-400">
            <p>Transport: {invoice.transport?.name}</p>
            <p>L.R. No: {invoice.transport?.lrNo}</p>
            <p>L.R. Date: {invoice.transport?.lrDate}</p>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-8 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-sm space-y-2">
            <p className="italic text-xs" style={{ color: '#707070' }}>{invoice.amountInWords}</p>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-400">Sub Total:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.subTotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Discount:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.discount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">CGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.cgstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">SGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.sgstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">IGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.igstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Freight:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.freight)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Round Off:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.roundOff)}</span></div>
            <div className="flex justify-between text-lg font-bold pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-white">GRAND TOTAL:</span><span style={{ color: '#00ffcc' }}>{'\u20B9'}{safeFixed(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
