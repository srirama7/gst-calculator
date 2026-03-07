import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { numberToWords } from './numberToWords';

export function generateInvoicePDF(invoice, company) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Border around entire page
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - margin * 2);

  // --- HEADER: Company Details ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', pageWidth / 2, y + 5, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'YOUR COMPANY NAME', pageWidth / 2, y + 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address || '', pageWidth / 2, y + 17, { align: 'center' });
  doc.text(
    `${company.city || ''} - ${company.pincode || ''}`,
    pageWidth / 2, y + 21, { align: 'center' }
  );
  doc.text(
    `Ph.: ${company.phone || ''}  E-mail: ${company.email || ''}`,
    pageWidth / 2, y + 25, { align: 'center' }
  );
  doc.text(
    `GSTINo.: ${company.gstin || ''}  D.L.No.: ${company.dlNo || ''}`,
    pageWidth / 2, y + 29, { align: 'center' }
  );

  y += 32;
  doc.line(margin, y, pageWidth - margin, y);

  // --- INVOICE INFO ROW ---
  y += 1;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`INV. No.: ${invoice.invoiceNo}`, margin + 3, y + 5);
  doc.text(invoice.billType || 'CREDIT BILL', pageWidth / 2, y + 5, { align: 'center' });
  doc.text(`Date: ${invoice.date}`, pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 8;
  doc.line(margin, y, pageWidth - margin, y);

  // --- CUSTOMER + TRANSPORT SECTION ---
  y += 1;
  const custX = margin + 3;
  const midX = pageWidth / 2 + 5;
  const rightX = pageWidth - margin - 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bolditalic');
  doc.text(invoice.customer?.name || '', custX, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customer?.address || '', custX, y + 8);
  doc.text(invoice.customer?.city || '', custX, y + 12);
  doc.text(invoice.customer?.pincode || '', custX, y + 16);

  doc.text(`GSTNo.: ${invoice.customer?.gstin || ''}`, custX, y + 22);
  doc.text(`Phone  : ${invoice.customer?.phone || ''}`, custX, y + 26);
  doc.text(`Rep Name: ${invoice.repName || ''}`, custX, y + 30);

  // Vertical divider
  doc.line(midX - 5, y, midX - 5, y + 33);

  // Right side - D.L.No and Transport
  doc.text(`D.L.No.:`, midX, y + 4);
  doc.text(invoice.customer?.dlNo || '', midX + 20, y + 4);

  // Transport column
  const transX = pageWidth * 0.72;
  doc.line(transX - 3, y, transX - 3, y + 33);

  doc.text('Transport:', transX, y + 4);
  doc.text(invoice.transport?.name || '', transX + 22, y + 4);
  doc.text('L.R. No.', transX, y + 8);
  doc.text(invoice.transport?.lrNo || '', transX + 22, y + 8);
  doc.text('L.R. Date', transX, y + 12);
  doc.text(invoice.transport?.lrDate || '', transX + 22, y + 12);
  doc.text('No of C/s', transX, y + 16);
  doc.text(invoice.transport?.noOfCs || '', transX + 22, y + 16);
  doc.text('Phone', transX, y + 20);
  doc.text(invoice.transport?.phone || '', transX + 22, y + 20);

  y += 33;
  doc.line(margin, y, pageWidth - margin, y);

  // --- ITEMS TABLE ---
  const items = invoice.items || [];
  const tableBody = items.map((item, i) => [
    i + 1,
    item.mfr || '',
    item.particulars || '',
    item.hsn || '',
    item.pack || '',
    item.qty || 0,
    item.free || 0,
    item.batchNo || '',
    item.exp || '',
    item.mrp ? item.mrp.toFixed(2) : '',
    item.rate ? item.rate.toFixed(2) : '',
    item.amount ? item.amount.toFixed(2) : '',
    item.discount ? item.discount.toFixed(2) : '',
    item.gstPercent ? item.gstPercent.toFixed(2) : ''
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Sl', 'Mfr', 'Particulars', 'HSN', 'Pack', 'Qty', 'Free', 'Batch No', 'Exp', 'MRP', 'Rate', 'Amount', 'Disc', 'GST%']],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 12 },
      2: { cellWidth: 38 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 11, halign: 'center' },
      5: { cellWidth: 9, halign: 'center' },
      6: { cellWidth: 9, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 14, halign: 'right' },
      10: { cellWidth: 13, halign: 'right' },
      11: { cellWidth: 17, halign: 'right' },
      12: { cellWidth: 10, halign: 'right' },
      13: { cellWidth: 12, halign: 'right' }
    },
    didDrawPage: function () {
      // Redraw page border
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - margin * 2);
    }
  });

  y = doc.lastAutoTable.finalY;

  // --- TAX SUMMARY SECTION ---
  // Group items by GST %
  const taxGroups = {};
  items.forEach(item => {
    const gst = item.gstPercent || 0;
    if (!taxGroups[gst]) {
      taxGroups[gst] = { taxable: 0, cgst: 0, sgst: 0 };
    }
    taxGroups[gst].taxable += item.amount || 0;
    taxGroups[gst].cgst += ((item.amount || 0) * gst / 2) / 100;
    taxGroups[gst].sgst += ((item.amount || 0) * gst / 2) / 100;
  });

  // Flash / Tax breakdown row
  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Flash:', margin + 3, y + 4);
  doc.text(`Page No. 1`, pageWidth - margin - 3, y + 4, { align: 'right' });
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);

  // Tax summary table
  const taxRows = Object.keys(taxGroups).map(gst => [
    taxGroups[gst].taxable.toFixed(2),
    (parseFloat(gst) / 2).toFixed(2),
    taxGroups[gst].cgst.toFixed(2),
    (parseFloat(gst) / 2).toFixed(2),
    taxGroups[gst].sgst.toFixed(2),
    '',
    '0.00'
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin + contentWidth * 0.45 },
    head: [['Taxable', 'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt', 'Exempted', 'FreeGST']],
    body: taxRows,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0]
    }
  });

  const taxTableEndY = doc.lastAutoTable.finalY;

  // --- RIGHT SIDE SUMMARY ---
  const summaryX = pageWidth * 0.57;
  const valX = pageWidth - margin - 5;
  let sy = y + 2;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const totalItems = items.reduce((sum, i) => sum + (i.qty || 0), 0);

  const summaryLines = [
    [`Items    ${items.length}`, `Sub Total`, `${invoice.subTotal?.toFixed(2) || '0.00'}`],
    [`Total Items ${totalItems}`, `Discount`, `${invoice.discount?.toFixed(2) || '0.00'}`],
    [`PC/BC :`, `CGST Amount`, `${invoice.cgstAmount?.toFixed(2) || '0.00'}`],
    [`Cr/Db Amt`, `SGST Amount`, `${invoice.sgstAmount?.toFixed(2) || '0.00'}`],
    [``, `IGST Amount`, `${invoice.igstAmount?.toFixed(2) || '0.00'}`],
    [`Freight    ${invoice.freight?.toFixed(2) || '0.00'}`, `Round Off`, `${invoice.roundOff?.toFixed(2) || '0.00'}`],
  ];

  summaryLines.forEach(([left, label, value]) => {
    doc.text(left, summaryX, sy + 3);
    doc.text(label, valX - 30, sy + 3);
    doc.text(value, valX, sy + 3, { align: 'right' });
    sy += 5;
  });

  // Grand Total
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  sy += 1;
  doc.line(summaryX - 2, sy - 2, pageWidth - margin, sy - 2);
  doc.text(`Due Date    ${invoice.dueDate || ''}`, margin + 3, sy + 3);
  doc.text('GRAND TOTAL :', valX - 30, sy + 3);
  doc.text(`${invoice.grandTotal?.toFixed(2) || '0.00'}`, valX, sy + 3, { align: 'right' });

  y = Math.max(taxTableEndY, sy + 6);
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);

  // --- AMOUNT IN WORDS ---
  y += 1;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bolditalic');
  const amtWords = invoice.amountInWords || numberToWords(invoice.grandTotal || 0);
  doc.text(amtWords, margin + 3, y + 4);

  // --- TERMS ---
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const terms = invoice.terms || [
    '1) We are registered under GST Rule and liable to pay tax.',
    '2) Goods once sold will not be taken back or exchanged',
    '3) Interest will be charged @24%p.a for the delayed payment if not made within duedate',
    '4) Payments should be made by Draft or Cheques in the name of company only'
  ];
  const termsArray = Array.isArray(terms) ? terms : terms.split('\n');
  termsArray.forEach((t, i) => {
    doc.text(t, margin + 3, y + (i * 3.5));
  });

  y += termsArray.length * 3.5 + 2;
  doc.setFontSize(6);
  doc.text(`E. & O.E. Subject to ${company.city || ''}-${company.pincode || ''} Jurisdiction`, margin + 3, y);

  // --- AUTHORIZED SIGNATORY ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${company.name || ''}`, pageWidth - margin - 5, y - 10, { align: 'right' });
  doc.setFontSize(7);
  doc.text('Authorised Signatory', pageWidth - margin - 5, y, { align: 'right' });

  return doc;
}
