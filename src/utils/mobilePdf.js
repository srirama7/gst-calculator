import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Save PDF to device storage and share/open it.
 * Works on Android via Capacitor Filesystem + Share.
 */
export async function savePdfToDevice(pdfDoc, filename) {
  const base64 = pdfDoc.output('datauristring').split(',')[1];

  // Write to app's cache directory
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  return result.uri;
}

export async function sharePdf(uri, filename) {
  await Share.share({
    title: filename,
    url: uri,
    dialogTitle: 'Share Invoice PDF',
  });
}

/**
 * Download PDF: on mobile saves to device and opens share dialog,
 * on web uses jsPDF's built-in save.
 */
export async function downloadPdf(pdfDoc, filename) {
  if (!isNativePlatform()) {
    pdfDoc.save(filename);
    return;
  }

  const uri = await savePdfToDevice(pdfDoc, filename);
  await sharePdf(uri, filename);
}

/**
 * Get a preview URL for the PDF.
 * On web: returns a blob URL for iframe embedding.
 * On mobile: returns null (iframe PDF preview doesn't work in WebView).
 */
export function getPdfPreviewUrl(pdfDoc) {
  if (isNativePlatform()) {
    return null;
  }
  const blob = pdfDoc.output('blob');
  return URL.createObjectURL(blob);
}
