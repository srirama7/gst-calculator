const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertGroup(n) {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
}

export function numberToWords(num) {
  if (num === 0) return 'Zero Only';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  const paise = Math.round((num % 1) * 100);

  let words = 'Rupees ';
  if (crore) words += convertGroup(crore) + ' Crore ';
  if (lakh) words += convertGroup(lakh) + ' Lakh ';
  if (thousand) words += convertGroup(thousand) + ' Thousand ';
  if (remainder) words += convertGroup(remainder) + ' ';

  words = words.trim();
  if (paise > 0) {
    words += ' and ' + convertGroup(paise) + ' Paise';
  }
  words += ' Only';
  return words;
}
