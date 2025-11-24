import { createNewPdf, createDocumentHeader, createFooter, createFinancialTable, createSignatureArea, PDF_CONFIG, safeText } from './pdfTemplate';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Generate Invoice/Collection Receipt PDF
 * Uses the Global PDF Design System
 * 
 * Features:
 * - Financial Table with proper styling
 * - Signature areas for Agency and Guest
 * - Clean, professional layout
 */
export const generateInvoicePdf = async (invoiceData, company) => {
  // Validasyon
  if (!invoiceData) {
    throw new Error('Invoice data gerekli');
  }
  
  if (!company) {
    company = {
      company_name: 'Firma Adı',
      phone: '',
      address: '',
      email: '',
      website: ''
    };
  }
  
  const invoiceNumber = invoiceData.invoice_number || invoiceData.id || 'INV-XXXX';
  const doc = createNewPdf('COLLECTION RECEIPT', invoiceNumber);
  
  let yPos = PDF_CONFIG.MARGIN + 30; // After header
  
  // ==================== CUSTOMER INFO SECTION ====================
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text('Customer Information', PDF_CONFIG.MARGIN, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  
  if (invoiceData.customer_name) {
    doc.text(`Name: ${safeText(invoiceData.customer_name)}`, PDF_CONFIG.MARGIN, yPos);
    yPos += 5;
  }
  if (invoiceData.customer_email) {
    doc.text(`Email: ${safeText(invoiceData.customer_email)}`, PDF_CONFIG.MARGIN, yPos);
    yPos += 5;
  }
  if (invoiceData.customer_phone) {
    doc.text(`Phone: ${safeText(invoiceData.customer_phone)}`, PDF_CONFIG.MARGIN, yPos);
    yPos += 5;
  }
  if (invoiceData.customer_address) {
    const addressLines = doc.splitTextToSize(safeText(invoiceData.customer_address), PDF_CONFIG.CONTENT_WIDTH);
    addressLines.forEach((line, idx) => {
      doc.text(line, PDF_CONFIG.MARGIN, yPos);
      yPos += 5;
    });
  }
  
  yPos += 8;
  
  // Separator line
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, yPos, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos);
  yPos += 10;
  
  // ==================== FINANCIAL TABLE ====================
  // Prepare items array
  const items = invoiceData.items || [];
  
  // If no items but has amount, create a single item
  if (items.length === 0 && invoiceData.amount) {
    items.push({
      description: invoiceData.description || 'Service',
      quantity: invoiceData.quantity || 1,
      amount: invoiceData.amount || 0,
      tax: invoiceData.tax || 0
    });
  }
  
  yPos = createFinancialTable(doc, items, yPos);
  
  // ==================== SIGNATURE AREA ====================
  const maxY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN;
  if (yPos < maxY - 50) {
    yPos += 10;
    yPos = createSignatureArea(doc, yPos);
  }
  
  // PDF filename
  const filename = `invoice-${invoiceNumber}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  return { doc, filename };
};

/**
 * Invoice PDF'i indir
 */
export const downloadInvoicePdf = async (invoiceData, company) => {
  const { doc, filename } = await generateInvoicePdf(invoiceData, company);
  
  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    createFooter(doc, '', totalPages, i);
  }
  
  doc.save(filename);
  return filename;
};

/**
 * Invoice PDF'i yazdır
 */
export const printInvoicePdf = async (invoiceData, company) => {
  const { doc, filename } = await generateInvoicePdf(invoiceData, company);
  
  // Add footer to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    createFooter(doc, '', totalPages, i);
  }
  
  // PDF'i yazdırma için yeni pencerede aç
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  return filename;
};



