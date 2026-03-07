# GST Calculator & Invoice Generator - Specification

## Overview
A web + mobile (APK via Capacitor) application for generating GST-compliant tax invoices with PDF export and Firebase backend.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Mobile**: Capacitor (Android APK)
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication (optional, email/password)
- **Hosting**: Firebase compatible

## Features

### 1. Company Profile Setup
- Company name, address, phone, email
- GSTIN, D.L. No.
- Saved in Firebase for reuse

### 2. Invoice Creation
- Auto-generated invoice number (sequential)
- Invoice date, due date
- Bill type (Credit Bill / Cash Bill)

### 3. Customer Details
- Customer name, address, pincode
- GSTIN, phone
- D.L. No.
- Transport details (Transport, L.R. No., L.R. Date, No of C/s)
- Rep Name

### 4. Item Line Entry
- Sl No (auto)
- Manufacturer (Mfr)
- Particulars (product name)
- HSN code
- Pack size
- Quantity
- Free quantity
- Batch No.
- Expiry date
- MRP
- Rate
- Discount %
- GST % (0, 5, 12, 18, 28)
- Auto-calculated: Amount = Qty * Rate, then discount applied

### 5. Tax Calculation
- Sub Total (sum of all line amounts)
- Discount (total)
- Taxable amount
- CGST (half of GST for intra-state)
- SGST (half of GST for intra-state)
- IGST (full GST for inter-state)
- Freight
- Round Off (auto to nearest rupee)
- Grand Total

### 6. Invoice Footer
- Total items count
- Total quantity
- Amount in words
- Terms & conditions (editable)
- Authorized signatory name

### 7. PDF Invoice Format (matching the physical invoice)
Layout:
```
+--------------------------------------------------+
| TAX INVOICE                                       |
| [Company Name - Bold, Large]                      |
| [Address Line 1]                                  |
| [Address Line 2, City - Pincode]                  |
| Ph: [phone]  E-mail: [email]                     |
| GSTINo.: [gstin]  D.L.No.: [dlno]               |
+--------------------------------------------------+
| INV. No.: [num]  [Bill Type]  Date: [date] [time]|
+--------------------------------------------------+
| [Customer Name - Bold Italic]    | D.L.No.       |
| [Customer Address]               | Transport:    |
| [City]                           | L.R. No.      |
| [Pincode]                        | L.R. Date     |
|                                  | No of C/s     |
| GSTNo.: [gstin]                  | Phone         |
| Phone: [phone]                   |               |
| Rep Name: [rep]                  |               |
+--------------------------------------------------+
| Sl|Mfr|Particulars|HSN|Pack|Qty|Free|Batch|Exp|MRP|Rate|Amount|Disc|GST%|
+--------------------------------------------------+
| 1 |...|...........|...|....|...|....|.....|...|...|....|......|....|....|
+--------------------------------------------------+
| Flash:                            | Page No. 1   |
+--------------------------------------------------+
| Taxable|CGST%|CGST Amt|SGST%|SGST Amt|Exempted|FreeGST|
+--------------------------------------------------+
|                    | Items: [n]     | Sub Total    |
|                    | Total Items    | Discount     |
|                    | PC/BC:         | CGST Amount  |
|                    | Cr/Db Amt      | SGST Amount  |
|                    |                | IGST Amount  |
|                    | Freight   0.00 | Round Off    |
| Due Date: [date]   | GRAND TOTAL:   | [amount]    |
+--------------------------------------------------+
| [Amount in words]                                 |
| Terms & Conditions...                             |
| For [Company Name]                                |
|                               Authorised Signatory|
+--------------------------------------------------+
```

### 8. Firebase Schema

#### Collection: `companies`
```
{
  id: string,
  name: string,
  address: string,
  city: string,
  pincode: string,
  phone: string,
  email: string,
  gstin: string,
  dlNo: string
}
```

#### Collection: `customers`
```
{
  id: string,
  name: string,
  address: string,
  city: string,
  pincode: string,
  gstin: string,
  phone: string,
  dlNo: string
}
```

#### Collection: `invoices`
```
{
  id: string,
  invoiceNo: number,
  date: timestamp,
  dueDate: timestamp,
  billType: "Credit Bill" | "Cash Bill",
  companyId: string,
  customer: { name, address, city, pincode, gstin, phone, dlNo },
  transport: { name, lrNo, lrDate, noOfCs, phone },
  repName: string,
  items: [
    {
      slNo: number,
      mfr: string,
      particulars: string,
      hsn: string,
      pack: string,
      qty: number,
      free: number,
      batchNo: string,
      exp: string,
      mrp: number,
      rate: number,
      amount: number,
      discount: number,
      gstPercent: number
    }
  ],
  subTotal: number,
  discount: number,
  taxableAmount: number,
  cgstAmount: number,
  sgstAmount: number,
  igstAmount: number,
  freight: number,
  roundOff: number,
  grandTotal: number,
  amountInWords: string,
  terms: string,
  createdAt: timestamp
}
```

### 9. Pages / Routes
1. **Dashboard** (`/`) - List of recent invoices, quick stats
2. **Create Invoice** (`/invoice/new`) - Full invoice form
3. **View Invoice** (`/invoice/:id`) - View + Download PDF
4. **Company Settings** (`/settings`) - Company profile
5. **Customers** (`/customers`) - Customer list/management

### 10. APK Build
- Capacitor Android project
- Build command: `npx cap sync android && cd android && ./gradlew assembleDebug`
