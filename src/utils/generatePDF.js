import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { numberToWords } from './numberToWords';

// Safe number helper - ensures we always have a number
function n(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

// Safe string helper
function s(val) {
  return val != null ? String(val) : '';
}

export function generateInvoicePDF(invoice, company) {
  // Default empty objects if not provided
  invoice = invoice || {};
  company = company || {};
  const customer = invoice.customer || {};
  const transport = invoice.transport || {};

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
  doc.text(s(company.name) || 'YOUR COMPANY NAME', pageWidth / 2, y + 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(s(company.address), pageWidth / 2, y + 17, { align: 'center' });
  doc.text(
    `${s(company.city)} - ${s(company.pincode)}`,
    pageWidth / 2, y + 21, { align: 'center' }
  );
  doc.text(
    `Ph.: ${s(company.phone)}  E-mail: ${s(company.email)}`,
    pageWidth / 2, y + 25, { align: 'center' }
  );
  doc.text(
    `GSTINo.: ${s(company.gstin)}  D.L.No.: ${s(company.dlNo)}`,
    pageWidth / 2, y + 29, { align: 'center' }
  );

  y += 32;
  doc.line(margin, y, pageWidth - margin, y);

  // --- INVOICE INFO ROW ---
  y += 1;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`INV. No.: ${s(invoice.invoiceNo)}`, margin + 3, y + 5);
  doc.text(s(invoice.billType) || 'CREDIT BILL', pageWidth / 2, y + 5, { align: 'center' });
  doc.text(`Date: ${s(invoice.date)}`, pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 8;
  doc.line(margin, y, pageWidth - margin, y);

  // --- CUSTOMER + TRANSPORT SECTION ---
  y += 1;
  const custX = margin + 3;
  const midX = pageWidth / 2 + 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bolditalic');
  doc.text(s(customer.name), custX, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.text(s(customer.address), custX, y + 8);
  doc.text(s(customer.city), custX, y + 12);
  doc.text(s(customer.pincode), custX, y + 16);

  doc.text(`GSTNo.: ${s(customer.gstin)}`, custX, y + 22);
  doc.text(`Phone  : ${s(customer.phone)}`, custX, y + 26);
  doc.text(`Rep Name: ${s(invoice.repName)}`, custX, y + 30);

  // Vertical divider
  doc.line(midX - 5, y, midX - 5, y + 33);

  // Right side - D.L.No and Transport
  doc.text(`D.L.No.:`, midX, y + 4);
  doc.text(s(customer.dlNo), midX + 20, y + 4);

  // Transport column
  const transX = pageWidth * 0.72;
  doc.line(transX - 3, y, transX - 3, y + 33);

  doc.text('Transport:', transX, y + 4);
  doc.text(s(transport.name), transX + 22, y + 4);
  doc.text('L.R. No.', transX, y + 8);
  doc.text(s(transport.lrNo), transX + 22, y + 8);
  doc.text('L.R. Date', transX, y + 12);
  doc.text(s(transport.lrDate), transX + 22, y + 12);
  doc.text('No of C/s', transX, y + 16);
  doc.text(s(transport.noOfCs), transX + 22, y + 16);
  doc.text('Phone', transX, y + 20);
  doc.text(s(transport.phone), transX + 22, y + 20);

  y += 33;
  doc.line(margin, y, pageWidth - margin, y);

  // --- ITEMS TABLE ---
  const items = invoice.items || [];
  const tableBody = items.map((item, i) => [
    i + 1,
    s(item.mfr),
    s(item.particulars),
    s(item.hsn),
    s(item.pack),
    n(item.qty),
    n(item.free),
    s(item.batchNo),
    s(item.exp),
    n(item.mrp) ? n(item.mrp).toFixed(2) : '',
    n(item.rate) ? n(item.rate).toFixed(2) : '',
    n(item.amount) ? n(item.amount).toFixed(2) : '',
    n(item.discount) ? n(item.discount).toFixed(2) : '',
    n(item.gstPercent) ? n(item.gstPercent).toFixed(2) : ''
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
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - margin * 2);
    }
  });

  y = doc.lastAutoTable.finalY;

  // --- TAX SUMMARY SECTION ---
  const taxGroups = {};
  items.forEach(item => {
    const gst = n(item.gstPercent);
    if (!taxGroups[gst]) {
      taxGroups[gst] = { taxable: 0, cgst: 0, sgst: 0 };
    }
    taxGroups[gst].taxable += n(item.amount);
    taxGroups[gst].cgst += (n(item.amount) * gst / 2) / 100;
    taxGroups[gst].sgst += (n(item.amount) * gst / 2) / 100;
  });

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Flash:', margin + 3, y + 4);
  doc.text(`Page No. 1`, pageWidth - margin - 3, y + 4, { align: 'right' });
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);

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
  const summaryX = pageWidth * 0.55;
  const labelX = summaryX + 2;
  const valX = pageWidth - margin - 3;
  let sy = y + 2;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const totalItems = items.reduce((sum, i) => sum + n(i.qty), 0);

  const summaryLines = [
    [`Items    ${items.length}`, `Sub Total`, n(invoice.subTotal).toFixed(2)],
    [`Total Items ${totalItems}`, `Discount`, n(invoice.discount).toFixed(2)],
    [`PC/BC :`, `CGST Amount`, n(invoice.cgstAmount).toFixed(2)],
    [`Cr/Db Amt`, `SGST Amount`, n(invoice.sgstAmount).toFixed(2)],
    [``, `IGST Amount`, n(invoice.igstAmount).toFixed(2)],
    [`Freight    ${n(invoice.freight).toFixed(2)}`, `Round Off`, n(invoice.roundOff).toFixed(2)],
  ];

  summaryLines.forEach(([left, label, value]) => {
    doc.text(left, labelX, sy + 3);
    doc.text(label, labelX + 28, sy + 3);
    doc.text(value, valX, sy + 3, { align: 'right' });
    sy += 5;
  });

  // Grand Total
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  sy += 2;
  doc.line(summaryX, sy - 2, pageWidth - margin, sy - 2);
  doc.text(`Due Date    ${s(invoice.dueDate)}`, margin + 3, sy + 3);
  doc.text('GRAND TOTAL :', labelX, sy + 3);
  doc.text(n(invoice.grandTotal).toFixed(2), valX, sy + 3, { align: 'right' });

  y = Math.max(taxTableEndY, sy + 6);
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);

  // --- AMOUNT IN WORDS ---
  y += 1;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bolditalic');
  const amtWords = s(invoice.amountInWords) || numberToWords(n(invoice.grandTotal));
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
  const termsArray = Array.isArray(terms) ? terms : String(terms).split('\n');
  termsArray.forEach((t, i) => {
    doc.text(s(t), margin + 3, y + (i * 3.5));
  });

  y += termsArray.length * 3.5 + 2;
  doc.setFontSize(6);
  doc.text(`E. & O.E. Subject to ${s(company.city)}-${s(company.pincode)} Jurisdiction`, margin + 3, y);

  // --- AUTHORIZED SIGNATORY ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${s(company.name)}`, pageWidth - margin - 5, y - 10, { align: 'right' });
  doc.setFontSize(7);
  doc.text('Authorised Signatory', pageWidth - margin - 5, y, { align: 'right' });

  return doc;
}
