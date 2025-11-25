import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// ============================================================================
// GLOBAL PDF DESIGN SYSTEM - Warm/Premium UI for Print (A4 Format)
// ============================================================================
// Page Size: A4 (210mm x 297mm)
// Margins: 15mm on all sides
// Colors: Stone palette (warm/premium)
// Typography: Roboto/Open Sans (safe for PDF)
// ============================================================================

const PDF_CONFIG = {
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  MARGIN: 15, // Consistent 15mm padding on all sides
  HEADER_HEIGHT: 35,
  FOOTER_HEIGHT: 25,
  CONTENT_WIDTH: 180, // PAGE_WIDTH - (MARGIN * 2)
  
  // Warm/Premium Stone Color Palette
  COLORS: {
    TEXT_PRIMARY: [28, 25, 23],      // #1C1917 (Stone-900) - High contrast reading
    TEXT_SECONDARY: [120, 113, 108],  // #78716C (Stone-500) - Labels
    BORDER: [231, 229, 228],         // #E7E5E4 (Stone-200) - Thin, crisp lines
    BACKGROUND: [255, 255, 255],     // #FFFFFF - Pure white (no gray backgrounds)
    HEADER_BG: [245, 245, 244],      // #F5F5F4 (Stone-100) - Very light gray for headers
    TEXT_STONE_400: [168, 162, 158], // #A8A29E (Stone-400) - Document titles
  }
};

// Firma bilgilerini localStorage'dan al
const getCompanyInfo = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const company = JSON.parse(localStorage.getItem('company') || '{}');
    return {
      name: company.name || userInfo.company_name || 'Firma Adı',
      phone: company.phone || userInfo.company_phone || '',
      address: company.address || userInfo.company_address || '',
      email: company.email || userInfo.company_email || '',
      website: company.website || userInfo.company_website || '',
      logo: company.logo || userInfo.company_logo || null
    };
  } catch {
    return {
      name: 'Firma Adı',
      phone: '',
      address: '',
      email: '',
      website: '',
      logo: null
    };
  }
};

/**
 * Türkçe karakter desteği için text encoding düzeltmesi
 */
export const safeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, 've') // & karakterini "ve" ile değiştir
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
};

/**
 * Yeni PDF dokümanı oluştur (Global Design System)
 * Backward compatible - can be called with or without parameters
 */
export const createNewPdf = (documentTitle = '', documentId = '', options = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  
  // İlk sayfa header'ı
  if (documentTitle || documentId) {
    createDocumentHeader(doc, documentTitle, documentId);
  } else {
    // Legacy mode for reports
    createHeader(doc);
  }
  
  return doc;
};

/**
 * Document Header - Global Design System
 * Left: Agency Logo (High Res)
 * Right: Document Title (e.g., "VOUCHER", "COLLECTION RECEIPT") in stone-400, uppercase, tracking-widest
 * Sub-header: Document ID & Generation Date (Small, stone-500)
 */
export const createDocumentHeader = (doc, documentTitle = '', documentId = '') => {
  const company = getCompanyInfo();
  const now = new Date();
  const dateStr = format(now, 'dd.MM.yyyy HH:mm', { locale: tr });
  
  // Logo alanı (sol üst)
  const logoSize = 20;
  const logoX = PDF_CONFIG.MARGIN;
  const logoY = PDF_CONFIG.MARGIN;
  
  if (company.logo) {
    try {
      const logoData = company.logo;
      if (logoData.startsWith('data:image/')) {
        const matches = logoData.match(/data:image\/(\w+);base64,(.+)/);
        if (matches && matches.length === 3) {
          const format = matches[1].toUpperCase();
          doc.addImage(logoData, format, logoX, logoY, logoSize, logoSize);
        } else {
          doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
        }
      } else {
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
      }
    } catch (e) {
      console.warn('Logo eklenemedi:', e);
      // Placeholder - very subtle
      doc.setFillColor(...PDF_CONFIG.COLORS.BORDER);
      doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    }
  }
  
  // Document Title (sağ üst) - Stone-400, Uppercase, Tracking-widest
  if (documentTitle) {
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_STONE_400);
    const titleText = safeText(documentTitle.toUpperCase());
    doc.text(titleText, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, logoY + 8, { align: 'right' });
  }
  
  // Sub-header: Document ID & Generation Date (Stone-500)
  let subHeaderY = logoY + logoSize - 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  
  if (documentId) {
    doc.text(`ID: ${safeText(documentId)}`, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, subHeaderY, { align: 'right' });
    subHeaderY += 4;
  }
  doc.text(format(now, 'dd.MM.yyyy', { locale: tr }), PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, subHeaderY, { align: 'right' });
  
  // Header alt çizgisi - Thin stone-200 border
  const headerBottomY = PDF_CONFIG.MARGIN + logoSize + 5;
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, headerBottomY, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, headerBottomY);
  
  return headerBottomY + 8; // Başlangıç Y pozisyonu
};

/**
 * Legacy Header (for backward compatibility with reports)
 * Uses the old header style but with new design system colors
 */
export const createHeader = (doc) => {
  const company = getCompanyInfo();
  const now = new Date();
  const dateStr = format(now, 'dd.MM.yyyy HH:mm', { locale: tr });
  
  // Logo alanı (sol üst)
  const logoSize = 15;
  const logoX = PDF_CONFIG.MARGIN;
  const logoY = PDF_CONFIG.MARGIN;
  
  if (company.logo) {
    try {
      const logoData = company.logo;
      if (logoData.startsWith('data:image/')) {
        const matches = logoData.match(/data:image\/(\w+);base64,(.+)/);
        if (matches && matches.length === 3) {
          const format = matches[1].toUpperCase();
          doc.addImage(logoData, format, logoX, logoY, logoSize, logoSize);
        } else {
          doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
        }
      } else {
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
      }
    } catch (e) {
      console.warn('Logo eklenemedi:', e);
    }
  }
  
  // Firma bilgileri (logonun sağında)
  const infoX = logoX + logoSize + 5;
  let infoY = PDF_CONFIG.MARGIN + 5;
  
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(safeText(company.name), infoX, infoY);
  infoY += 6;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  if (company.phone) {
    doc.text(`Tel: ${company.phone}`, infoX, infoY);
    infoY += 5;
  }
  
  if (company.address) {
    const addressLines = doc.splitTextToSize(safeText(company.address), PDF_CONFIG.CONTENT_WIDTH - (infoX - PDF_CONFIG.MARGIN));
    addressLines.forEach((line, idx) => {
      if (infoY < PDF_CONFIG.MARGIN + logoSize - 2) {
        doc.text(line, infoX, infoY);
        infoY += 4;
      }
    });
  }
  
  // Oluşturulma tarihi (sağ üst)
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text(safeText(`Olusturulma: ${dateStr}`), PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, PDF_CONFIG.MARGIN + 5, { align: 'right' });
  
  // Header alt çizgisi - Thin stone-200 border
  const headerBottomY = PDF_CONFIG.MARGIN + logoSize + 5;
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, headerBottomY, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, headerBottomY);
  
  return headerBottomY + 8;
};

/**
 * Rapor başlığı ekle (Updated with new design system)
 */
export const createTitle = (doc, reportName, filters = {}) => {
  let yPos = PDF_CONFIG.MARGIN + 30; // After header
  
  // Ana başlık - Stone-900, Bold
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  const titleLines = doc.splitTextToSize(safeText(reportName), PDF_CONFIG.CONTENT_WIDTH);
  titleLines.forEach((line, idx) => {
    doc.text(line, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 7;
  });
  
  // Filtre bilgileri - Stone-500
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  yPos += 3;
  
  if (filters.date_from && filters.date_to) {
    const dateFrom = new Date(filters.date_from).toLocaleDateString('tr-TR');
    const dateTo = new Date(filters.date_to).toLocaleDateString('tr-TR');
    doc.text(`Tarih Araligi: ${dateFrom} - ${dateTo}`, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 5;
  } else if (filters.date) {
    const dateStr = new Date(filters.date).toLocaleDateString('tr-TR');
    doc.text(`Tarih: ${dateStr}`, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (filters.tour_type_name) {
    doc.text(`Tur Tipi: ${safeText(filters.tour_type_name)}`, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (filters.cari_name) {
    doc.text(`Cari Firma: ${safeText(filters.cari_name)}`, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (filters.hour) {
    doc.text(`Saat: ${filters.hour}`, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  // Başlık alt çizgisi - Thin stone-200 border
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, yPos + 3, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos + 3);
  
  return yPos + 10; // İçerik başlangıç Y pozisyonu
};

/**
 * Stilize tablo oluştur (Updated with new design system)
 * Header: bg-stone-100 (Very light gray), Bold text
 * Rows: Clean white with bottom borders (no gray backgrounds)
 * Borders: Thin stone-200 lines
 */
export const createTable = (doc, tableData, columns, startY) => {
  let yPos = startY;
  const colWidths = columns.map(col => col.width || (PDF_CONFIG.CONTENT_WIDTH / columns.length));
  const colPositions = [];
  let currentX = PDF_CONFIG.MARGIN;
  
  columns.forEach((col, idx) => {
    colPositions.push(currentX);
    currentX += colWidths[idx];
  });
  
  // Tablo başlıkları - Stone-100 background, Bold text
  doc.setFillColor(...PDF_CONFIG.COLORS.HEADER_BG);
  doc.rect(PDF_CONFIG.MARGIN, yPos - 6, PDF_CONFIG.CONTENT_WIDTH, 8, 'F');
  
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  
  columns.forEach((col, idx) => {
    const headerText = safeText(col.header);
    doc.text(
      headerText,
      colPositions[idx] + (colWidths[idx] / 2),
      yPos - 1,
      { align: 'center' }
    );
  });
  
  yPos += 4;
  
  // Tablo verileri
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  tableData.forEach((row, rowIdx) => {
    // Sayfa taşması kontrolü - page-break-inside: avoid
    const maxY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN;
    if (yPos > maxY) {
      doc.addPage();
      createDocumentHeader(doc, '', '');
      yPos = PDF_CONFIG.MARGIN + 30;
      
      // Yeni sayfada başlıkları tekrar yaz
      doc.setFillColor(...PDF_CONFIG.COLORS.HEADER_BG);
      doc.rect(PDF_CONFIG.MARGIN, yPos - 6, PDF_CONFIG.CONTENT_WIDTH, 8, 'F');
      doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      columns.forEach((col, idx) => {
        doc.text(
          safeText(col.header),
          colPositions[idx] + (colWidths[idx] / 2),
          yPos - 1,
          { align: 'center' }
        );
      });
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      yPos += 4;
    }
    
    // NO gray backgrounds - use borders only
    // Satır alt çizgisi - Thin stone-200 border
    doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
    doc.setLineWidth(0.2);
    doc.line(PDF_CONFIG.MARGIN, yPos - 5, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos - 5);
    
    // Hücre verileri - Stone-900 text
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    columns.forEach((col, idx) => {
      const value = row[col.key] || '-';
      let text = typeof value === 'string' ? safeText(value) : String(value);
      
      // MaxLength kontrolü
      if (col.maxLength && text.length > col.maxLength) {
        text = text.substring(0, col.maxLength - 3) + '...';
      }
      
      // Text wrapping
      const maxWidth = colWidths[idx] - 6;
      const textLines = doc.splitTextToSize(text, maxWidth);
      const align = col.align || 'left';
      const xPos = align === 'center' 
        ? colPositions[idx] + (colWidths[idx] / 2)
        : align === 'right'
        ? colPositions[idx] + colWidths[idx] - 3
        : colPositions[idx] + 3;
      
      textLines.forEach((line, lineIdx) => {
        if (lineIdx === 0) {
          doc.text(line, xPos, yPos, { align, maxWidth });
        } else if (yPos + (lineIdx * 4) < maxY) {
          doc.text(line, xPos, yPos + (lineIdx * 4), { align, maxWidth });
        }
      });
    });
    
    yPos += 7;
  });
  
  // Tablo alt çizgisi - Thin stone-200 border
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, yPos - 5, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos - 5);
  
  return yPos;
};

/**
 * PDF Footer - Global Design System
 * Center: Agency Contact Info (Address, Phone)
 * Right: Page Numbers ("Page 1 of 3")
 * Style: Separated by thin stone-200 border
 */
export const createFooter = (doc, reportName = '', totalPages = null, currentPage = null) => {
  if (totalPages === null) totalPages = doc.internal.getNumberOfPages();
  if (currentPage === null) currentPage = doc.internal.pageNumber || 1;
  
  const company = getCompanyInfo();
  const footerY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT;
  
  // Footer üst çizgisi - Thin stone-200 border
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, footerY, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, footerY);
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  
  doc.text(
    safeText('Generated by TourCast'),
    PDF_CONFIG.MARGIN,
    footerY + 8
  );
  
  // Center: Agency Contact Info
  let centerText = '';
  if (company.address) {
    centerText = safeText(company.address);
    if (company.phone) {
      centerText += ` | Tel: ${company.phone}`;
    }
  } else if (company.phone) {
    centerText = `Tel: ${company.phone}`;
  }
  
  if (centerText) {
    doc.text(
      centerText,
      PDF_CONFIG.PAGE_WIDTH / 2,
      footerY + 8,
      { align: 'center' }
    );
  }
  
  doc.text(
    `Page ${currentPage} of ${totalPages}`,
    PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN,
    footerY + 8,
    { align: 'right' }
  );
  
  // Rapor adı (varsa, ikinci satırda ortada)
  if (reportName) {
    doc.text(
      safeText(reportName),
      PDF_CONFIG.PAGE_WIDTH / 2,
      footerY + 15,
      { align: 'center' }
    );
  }
  
  return footerY - 5; // Footer'dan önceki son Y pozisyonu
};

/**
 * PDF'i kaydet ve footer ekle
 */
export const savePdf = (doc, filename, reportName = '') => {
  // Tüm sayfalara footer ekle
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    createFooter(doc, reportName, totalPages, i);
  }
  
  doc.save(filename);
};

// ============================================================================
// INVOICE / COLLECTION RECEIPT GENERATOR
// ============================================================================

/**
 * Create Financial Table for Invoices/Collection Receipts
 * Header: bg-stone-100, Bold text
 * Rows: Clean white with bottom borders
 * Totals: Align to the right, make Final Amount LARGE and BOLD
 */
export const createFinancialTable = (doc, items, startY) => {
  let yPos = startY;
  
  // Table columns - Description (flexible), Quantity (fixed), Amount (fixed)
  const colWidths = [PDF_CONFIG.CONTENT_WIDTH - 60, 30, 60]; // Description, Quantity, Amount
  const colPositions = [
    PDF_CONFIG.MARGIN,
    PDF_CONFIG.MARGIN + colWidths[0],
    PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN - colWidths[2]
  ];
  
  // Header - Stone-100 background
  doc.setFillColor(...PDF_CONFIG.COLORS.HEADER_BG);
  doc.rect(PDF_CONFIG.MARGIN, yPos - 6, PDF_CONFIG.CONTENT_WIDTH, 8, 'F');
  
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  
  doc.text('Description', colPositions[0] + 3, yPos - 1);
  doc.text('Quantity', colPositions[1] + (colWidths[1] / 2), yPos - 1, { align: 'center' });
  doc.text('Amount', colPositions[2], yPos - 1, { align: 'right' });
  
  yPos += 4;
  
  // Items
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  let subtotal = 0;
  
  items.forEach((item, idx) => {
    const maxY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN;
    if (yPos > maxY) {
      doc.addPage();
      createDocumentHeader(doc, '', '');
      yPos = PDF_CONFIG.MARGIN + 30;
    }
    
    // Row border
    doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
    doc.setLineWidth(0.2);
    doc.line(PDF_CONFIG.MARGIN, yPos - 5, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos - 5);
    
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text(safeText(item.description || '-'), colPositions[0] + 3, yPos);
    doc.text(String(item.quantity || 0), colPositions[1] + (colWidths[1] / 2), yPos, { align: 'center' });
    
    const amount = (item.amount || 0);
    subtotal += amount;
    doc.text(amount.toFixed(2), colPositions[2], yPos, { align: 'right' });
    
    yPos += 7;
  });
  
  // Totals section
  yPos += 5;
  
  // Subtotal
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text('Subtotal:', colPositions[1], yPos, { align: 'right' });
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text(subtotal.toFixed(2), colPositions[2], yPos, { align: 'right' });
  yPos += 6;
  
  // Tax (if applicable)
  const tax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
  if (tax > 0) {
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
    doc.text('Tax:', colPositions[1], yPos, { align: 'right' });
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text(tax.toFixed(2), colPositions[2], yPos, { align: 'right' });
    yPos += 6;
  }
  
  // Final Amount - LARGE and BOLD
  const total = subtotal + tax;
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.5);
  doc.line(colPositions[1], yPos - 2, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos - 2);
  yPos += 3;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text('Total:', colPositions[1], yPos, { align: 'right' });
  doc.setFontSize(14);
  doc.text(total.toFixed(2), colPositions[2], yPos, { align: 'right' });
  
  return yPos + 10;
};

/**
 * Create Signature Area for Invoices/Collection Receipts
 */
export const createSignatureArea = (doc, startY) => {
  let yPos = startY;
  const signatureWidth = 70;
  const signatureHeight = 30;
  const spacing = 20;
  
  // Agency Signature (Left)
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.rect(PDF_CONFIG.MARGIN, yPos, signatureWidth, signatureHeight);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text('Agency Signature', PDF_CONFIG.MARGIN + (signatureWidth / 2), yPos + 8, { align: 'center' });
  
  // Guest Signature (Right)
  const rightX = PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN - signatureWidth;
  doc.rect(rightX, yPos, signatureWidth, signatureHeight);
  doc.text('Guest Signature', rightX + (signatureWidth / 2), yPos + 8, { align: 'center' });
  
  return yPos + signatureHeight + 10;
};

/**
 * Generate Invoice/Collection Receipt PDF
 */
export const generateInvoicePdf = (invoiceData, company) => {
  const doc = createNewPdf('COLLECTION RECEIPT', invoiceData.id || invoiceData.invoice_number);
  
  let yPos = PDF_CONFIG.MARGIN + 30;
  
  // Customer Info Section
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
  
  yPos += 5;
  
  // Financial Table
  const items = invoiceData.items || [
    { description: invoiceData.description || 'Service', quantity: 1, amount: invoiceData.amount || 0 }
  ];
  
  yPos = createFinancialTable(doc, items, yPos);
  
  // Signature Area
  const maxY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN;
  if (yPos < maxY - 50) {
    yPos = createSignatureArea(doc, yPos);
  }
  
  return { doc, filename: `invoice-${invoiceData.id || 'receipt'}-${format(new Date(), 'yyyyMMdd')}.pdf` };
};

// Export PDF_CONFIG for use in other files
export { PDF_CONFIG };