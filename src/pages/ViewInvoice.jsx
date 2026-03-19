import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { generateInvoicePDF } from '../utils/generatePDF'
import { downloadPdf, getPdfPreviewUrl, isNativePlatform, savePdfToDevice, sharePdf } from '../utils/mobilePdf'
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

      // Auto-generate PDF preview (web only; mobile WebView can't render PDFs in iframe)
      if (inv) {
        try {
          const pdfDoc = generateInvoicePDF(inv, comp);
          const url = getPdfPreviewUrl(pdfDoc);
          setPdfUrl(url);
        } catch (e) {
          console.error('PDF generation failed:', e);
        }
      }
    } catch (e) {
      toast.error('Failed to load: ' + e.message);
    }
    setLoading(false);
  }

  async function handleDownload() {
    try {
      const pdfDoc = generateInvoicePDF(invoice, company);
      const filename = `Invoice_${invoice.invoiceNo || 'draft'}.pdf`;
      await downloadPdf(pdfDoc, filename);
      toast.success('PDF downloaded!');
    } catch (e) {
      toast.error('PDF download failed: ' + e.message);
    }
  }

  async function handleRegenerate() {
    try {
      const pdfDoc = generateInvoicePDF(invoice, company);
      if (isNativePlatform()) {
        // On mobile, open externally since WebView can't render PDFs
        const filename = `Invoice_${invoice.invoiceNo || 'draft'}.pdf`;
        const uri = await savePdfToDevice(pdfDoc, filename);
        await sharePdf(uri, filename);
      } else {
        const blob = pdfDoc.output('blob');
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      toast.error('PDF preview failed: ' + e.message);
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!invoice) return <div className="text-center py-10 text-gray-400">Invoice not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Link to="/" style={{ color: 'var(--accent)' }} className="text-sm hover:opacity-70">&larr; Back to Dashboard</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gradient mt-2">Invoice #{invoice.invoiceNo}</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to={`/invoice/${id}/edit`} className="btn-neon text-xs sm:text-sm py-2.5 px-4 sm:px-6" style={{ background: 'linear-gradient(135deg, #ff8e53, #ffb347)' }}>
            Edit Invoice
          </Link>
          <button onClick={handleRegenerate} className="btn-neon btn-glass text-xs sm:text-sm py-2.5 px-4 sm:px-6">
            Refresh Preview
          </button>
          <button onClick={handleDownload} className="btn-neon btn-cyan text-xs sm:text-sm py-2.5 px-4 sm:px-6">
            Download PDF
          </button>
        </div>
      </div>

      {/* PDF Preview - iframe on web, message on mobile */}
      {pdfUrl ? (
        <div className="glass-card p-6 sm:p-8 mb-8">
          <h2 className="text-sm font-bold text-gradient mb-4">Invoice PDF</h2>
          <iframe src={pdfUrl} className="w-full rounded-xl" style={{ height: '85vh', border: '1px solid var(--border-color)' }} title="Invoice PDF Preview" />
        </div>
      ) : isNativePlatform() && (
        <div className="glass-card p-6 sm:p-8 mb-8 text-center">
          <p className="text-gray-400 text-sm mb-4">PDF preview is not available in the app. Use the buttons below to view or download.</p>
          <div className="flex justify-center gap-4">
            <button onClick={handleRegenerate} className="btn-neon btn-glass text-xs sm:text-sm py-2.5 px-4 sm:px-6">
              View PDF
            </button>
            <button onClick={handleDownload} className="btn-neon btn-cyan text-xs sm:text-sm py-2.5 px-4 sm:px-6">
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* Invoice Details Summary */}
      <div className="glass-card p-6 sm:p-8">
        <h2 className="text-sm font-bold text-gradient mb-4">Invoice Details</h2>

        {/* Header */}
        <div className="text-center pb-5 mb-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <p className="text-xs text-gray-500">TAX INVOICE</p>
          <h2 className="text-xl font-bold text-gradient">{company.name}</h2>
          <p className="text-sm text-gray-400">{company.address}</p>
          <p className="text-sm text-gray-400">{company.city} - {company.pincode}</p>
          <p className="text-xs text-gray-500">Ph: {company.phone} | Email: {company.email}</p>
          <p className="text-xs text-gray-500">GSTIN: {company.gstin} | D.L.No: {company.dlNo}</p>
        </div>

        {/* Invoice info */}
        <div className="flex justify-between pb-4 mb-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div><span className="font-semibold text-sm text-gray-300">INV No:</span> <span className="text-sm" style={{ color: 'var(--accent)' }}>{invoice.invoiceNo}</span></div>
          <div className="font-semibold text-sm text-gray-300">{invoice.billType}</div>
          <div><span className="font-semibold text-sm text-gray-300">Date:</span> <span className="text-sm text-gray-400">{invoice.date}</span></div>
        </div>

        {/* Customer + Transport */}
        <div className="grid grid-cols-2 gap-6 pb-5 mb-5 text-sm" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <p className="font-bold italic" style={{ color: 'var(--accent)' }}>{invoice.customer?.name}</p>
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
        <div className="grid grid-cols-2 gap-8 pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
          <div className="text-sm space-y-2">
            <p className="italic text-xs" style={{ color: 'var(--text-muted)' }}>{invoice.amountInWords}</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>Sub Total:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.subTotal)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>Discount:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.discount)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>CGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.cgstAmount)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>SGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.sgstAmount)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>IGST:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.igstAmount)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>Freight:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.freight)}</span></div>
            <div className="flex justify-between text-base font-bold"><span style={{ color: 'var(--text-secondary)' }}>Round Off:</span><span className="text-white">{'\u20B9'}{safeFixed(invoice.roundOff)}</span></div>
            <div className="flex justify-between text-xl font-bold pt-3" style={{ borderTop: '2px solid var(--border-color)' }}>
              <span className="text-white">GRAND TOTAL:</span><span style={{ color: 'var(--success-text)' }}>{'\u20B9'}{safeFixed(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
