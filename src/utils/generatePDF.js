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
  const midX = pageWidth * 0.38;
  const transX = pageWidth * 0.72;

  // Left column - Customer name & address (wrap text to fit within column)
  const custColWidth = midX - 3 - custX - 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bolditalic');
  const nameLines = doc.splitTextToSize(s(customer.name), custColWidth);
  doc.text(nameLines, custX, y + 4);

  doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize(s(customer.address), custColWidth);
  let addrY = y + 4 + nameLines.length * 4;
  doc.text(addrLines, custX, addrY);
  addrY += addrLines.length * 3.5;
  doc.text(s(customer.city), custX, addrY);
  doc.text(s(customer.pincode), custX, addrY + 4);

  // Vertical divider after address
  doc.line(midX - 3, y, midX - 3, y + 33);

  // Middle column - D.L.No, GSTNo, Phone, Rep Name
  doc.text(`D.L.No.:`, midX, y + 4);
  doc.text(s(customer.dlNo), midX + 20, y + 4);
  doc.text(`GSTNo.: ${s(customer.gstin)}`, midX, y + 10);
  doc.text(`Phone  : ${s(customer.phone)}`, midX, y + 16);
  doc.text(`Rep Name: ${s(invoice.repName)}`, midX, y + 22);

  // Vertical divider before transport
  doc.line(transX - 3, y, transX - 3, y + 33);

  // Right column - Transport
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

  // Calculate where the bottom section starts
  const bottomSectionHeight = 95;
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableTargetEndY = pageHeight - margin - bottomSectionHeight;

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
      textColor: [0, 0, 0],
      minCellHeight: 6
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
      doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);
    }
  });

  const tableEndY = doc.lastAutoTable.finalY;

  // Draw vertical column lines continuing down through the empty area (no horizontal lines)
  if (tableEndY < tableTargetEndY) {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    // Draw outer left and right borders
    doc.line(margin, tableEndY, margin, tableTargetEndY);
    doc.line(pageWidth - margin, tableEndY, pageWidth - margin, tableTargetEndY);
    // Draw bottom border of the empty area
    doc.line(margin, tableTargetEndY, pageWidth - margin, tableTargetEndY);
    // Draw vertical lines for each column divider
    const colWidths = [7, 12, 38, 12, 11, 9, 9, 16, 12, 14, 13, 17, 10, 12];
    let colX = margin;
    for (let i = 0; i < colWidths.length - 1; i++) {
      colX += colWidths[i];
      doc.line(colX, tableEndY, colX, tableTargetEndY);
    }
  }

  y = tableTargetEndY;

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

  // Flash line
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Flash:', margin + 3, y + 4);
  doc.text('Page No.  1', pageWidth - margin - 3, y + 4, { align: 'right' });
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);

  // Divider line between tax table (left) and summary (right)
  const summaryDividerX = pageWidth * 0.52;
  const bottomSectionStartY = y;

  // --- LEFT SIDE: Tax breakdown table (drawn manually for exact control) ---
  const taxKeys = Object.keys(taxGroups);
  const taxTableHeaders = ['Taxable', 'CGST%', 'CGST Amt', 'SGST%', 'SGST Amt', 'Exempted', 'FreeGST'];
  const taxColWidths = [16, 10, 14, 10, 14, 16, 14];
  const taxTableLeftX = margin;
  const taxTableWidth = summaryDividerX - margin;

  // Draw tax table header
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  let txX = taxTableLeftX;
  const taxHeaderY = y;
  taxColWidths.forEach((w, i) => {
    doc.text(taxTableHeaders[i], txX + 1, y + 3.5);
    txX += (taxTableWidth / taxColWidths.reduce((a, b) => a + b, 0)) * w;
  });
  y += 5;
  doc.line(margin, y, summaryDividerX, y);

  // Draw tax data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  taxKeys.forEach(gst => {
    txX = taxTableLeftX;
    const row = [
      taxGroups[gst].taxable.toFixed(2),
      (parseFloat(gst) / 2).toFixed(2),
      taxGroups[gst].cgst.toFixed(2),
      (parseFloat(gst) / 2).toFixed(2),
      taxGroups[gst].sgst.toFixed(2),
      '',
      '0.00'
    ];
    const totalW = taxColWidths.reduce((a, b) => a + b, 0);
    row.forEach((val, i) => {
      doc.text(val, txX + 1, y + 3.5);
      txX += (taxTableWidth / totalW) * taxColWidths[i];
    });
    y += 5;
  });

  const taxTableEndY = y;

  // --- RIGHT SIDE SUMMARY ---
  const labelX = summaryDividerX + 2;
  const summaryLabelX = summaryDividerX + 22;
  const valX = pageWidth - margin - 3;
  let sy = bottomSectionStartY + 1;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');

  const totalItems = items.reduce((sum, i) => sum + n(i.qty), 0);

  const summaryLines = [
    [`Items    ${items.length}`, `Sub Total`, n(invoice.subTotal).toFixed(2)],
    [`Total Items ${totalItems}`, `Discount`, n(invoice.discount).toFixed(2)],
    [`PC/BC :`, `CGST Amount`, n(invoice.cgstAmount).toFixed(2)],
    [`Cr/Db Amt`, `SGST Amount`, n(invoice.sgstAmount).toFixed(2)],
    [``, `IGST Amount`, n(invoice.igstAmount).toFixed(2)],
  ];

  summaryLines.forEach(([left, label, value]) => {
    doc.text(left, labelX, sy + 4);
    doc.text(label, summaryLabelX, sy + 4);
    doc.text(value, valX, sy + 4, { align: 'right' });
    sy += 5;
  });

  // Freight + Round Off on same row area
  doc.text(`Freight    ${n(invoice.freight).toFixed(2)}`, labelX, sy + 4);
  doc.text('Round Off', summaryLabelX, sy + 4);
  doc.text(n(invoice.roundOff).toFixed(2), valX, sy + 4, { align: 'right' });
  sy += 6;

  // Grand Total line
  doc.setLineWidth(0.4);
  doc.line(summaryDividerX, sy, pageWidth - margin, sy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL :', summaryLabelX - 2, sy + 5);
  doc.text(n(invoice.grandTotal).toFixed(2), valX, sy + 5, { align: 'right' });
  sy += 8;

  // Vertical divider between left tax table and right summary
  doc.setLineWidth(0.3);
  doc.line(summaryDividerX, bottomSectionStartY, summaryDividerX, Math.max(taxTableEndY, sy));

  // Vertical divider between left labels (Items/Total Items) and right labels (Sub Total/CGST) in summary
  doc.line(summaryLabelX - 2, bottomSectionStartY, summaryLabelX - 2, Math.max(taxTableEndY, sy));

  // Due Date row
  y = Math.max(taxTableEndY, sy) + 1;
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`Due Date    ${s(invoice.dueDate)}`, margin + 3, y + 4);
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);

  // --- AMOUNT IN WORDS ---
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bolditalic');
  const amtWords = s(invoice.amountInWords) || numberToWords(n(invoice.grandTotal));
  doc.text(amtWords, margin + 3, y + 4);

  // --- TERMS ---
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const terms = invoice.terms || [
    '1) We are registered under GST Rule and liable to pay tax.',
    '2) Goods once sold will not be taken back or exchanged',
    '3) Interest will be charged @24%p.a for the delayed payment if not made within duedate',
    '4) Payments should be made by Draft or Cheques in the name of company only'
  ];
  const termsArray = Array.isArray(terms) ? terms : String(terms).split('\n');
  termsArray.forEach((t, i) => {
    doc.text(s(t), margin + 3, y + 4 + (i * 3.5));
  });

  // "For Company Name" top-right of the bottom area (aligned with terms)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${s(company.name)}`, pageWidth - margin - 5, y + 5, { align: 'right' });

  y += 4 + termsArray.length * 3.5 + 2;

  // --- BOTTOM BOX: E&OE (left) + Signatory (right) ---
  const bottomBoxBottomY = pageHeight - margin;

  // E. & O.E. text on the left
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`E. & O.E. Subject to ${s(company.city)}-${s(company.pincode)} Jurisdiction`, margin + 3, y + 4);

  // "Authorised Signatory" bottom-right inside the box
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorised Signatory', pageWidth - margin - 5, bottomBoxBottomY - 3, { align: 'right' });

  return doc;
}
