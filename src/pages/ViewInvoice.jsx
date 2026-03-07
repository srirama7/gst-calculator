import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { generateInvoicePDF } from '../utils/generatePDF'
import toast from 'react-hot-toast'

export default function ViewInvoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [invSnap, compSnap] = await Promise.all([
        getDoc(doc(db, 'invoices', id)),
        getDoc(doc(db, 'companies', 'default'))
      ]);
      if (invSnap.exists()) setInvoice({ id: invSnap.id, ...invSnap.data() });
      if (compSnap.exists()) setCompany(compSnap.data());
    } catch (e) {
      toast.error('Failed to load: ' + e.message);
    }
    setLoading(false);
  }

  function handleDownload() {
    const pdfDoc = generateInvoicePDF(invoice, company);
    pdfDoc.save(`Invoice_${invoice.invoiceNo}.pdf`);
    toast.success('PDF downloaded!');
  }

  function handlePreview() {
    const pdfDoc = generateInvoicePDF(invoice, company);
    pdfDoc.output('dataurlnewwindow');
  }

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (!invoice) return <div className="text-center py-10">Invoice not found</div>;

  const items = invoice.items || [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">Invoice #{invoice.invoiceNo}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm">
            Preview PDF
          </button>
          <button onClick={handleDownload}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 text-sm font-medium">
            Download PDF
          </button>
        </div>
      </div>

      {/* Invoice Preview Card */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-4">
          <p className="text-xs text-gray-500">TAX INVOICE</p>
          <h2 className="text-xl font-bold">{company.name}</h2>
          <p className="text-sm text-gray-600">{company.address}</p>
          <p className="text-sm text-gray-600">{company.city} - {company.pincode}</p>
          <p className="text-xs text-gray-500">Ph: {company.phone} | Email: {company.email}</p>
          <p className="text-xs text-gray-500">GSTIN: {company.gstin} | D.L.No: {company.dlNo}</p>
        </div>

        {/* Invoice info */}
        <div className="flex justify-between border-b pb-3 mb-4">
          <div><span className="font-semibold text-sm">INV No:</span> <span className="text-sm">{invoice.invoiceNo}</span></div>
          <div className="font-semibold text-sm">{invoice.billType}</div>
          <div><span className="font-semibold text-sm">Date:</span> <span className="text-sm">{invoice.date}</span></div>
        </div>

        {/* Customer + Transport */}
        <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4 text-sm">
          <div>
            <p className="font-bold italic">{invoice.customer?.name}</p>
            <p>{invoice.customer?.address}</p>
            <p>{invoice.customer?.city} - {invoice.customer?.pincode}</p>
            <p>GSTIN: {invoice.customer?.gstin}</p>
            <p>Phone: {invoice.customer?.phone}</p>
            <p>Rep: {invoice.repName}</p>
          </div>
          <div>
            <p>Transport: {invoice.transport?.name}</p>
            <p>L.R. No: {invoice.transport?.lrNo}</p>
            <p>L.R. Date: {invoice.transport?.lrDate}</p>
          </div>
        </div>

        {/* Items */}
        <table className="min-w-full text-xs mb-4 border">
          <thead className="bg-gray-50">
            <tr>
              {['Sl','Mfr','Particulars','HSN','Pack','Qty','Free','Batch','Exp','MRP','Rate','Amount','Disc','GST%'].map(h => (
                <th key={h} className="border px-2 py-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="border px-2 py-1 text-center">{i + 1}</td>
                <td className="border px-2 py-1">{item.mfr}</td>
                <td className="border px-2 py-1">{item.particulars}</td>
                <td className="border px-2 py-1 text-center">{item.hsn}</td>
                <td className="border px-2 py-1 text-center">{item.pack}</td>
                <td className="border px-2 py-1 text-center">{item.qty}</td>
                <td className="border px-2 py-1 text-center">{item.free}</td>
                <td className="border px-2 py-1">{item.batchNo}</td>
                <td className="border px-2 py-1">{item.exp}</td>
                <td className="border px-2 py-1 text-right">{item.mrp?.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right">{item.rate?.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right font-medium">{item.amount?.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right">{item.discount}</td>
                <td className="border px-2 py-1 text-center">{item.gstPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-8 border-t pt-4">
          <div className="text-sm space-y-1">
            <p className="italic text-xs text-gray-600">{invoice.amountInWords}</p>
            <div className="mt-3 text-xs text-gray-500 whitespace-pre-line">{invoice.terms}</div>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Sub Total:</span><span>₹{invoice.subTotal?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount:</span><span>₹{invoice.discount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>CGST:</span><span>₹{invoice.cgstAmount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>SGST:</span><span>₹{invoice.sgstAmount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IGST:</span><span>₹{invoice.igstAmount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Freight:</span><span>₹{invoice.freight?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Round Off:</span><span>₹{invoice.roundOff?.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>GRAND TOTAL:</span><span>₹{invoice.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
