import jsPDF from 'jspdf';

// PDF sabitleri - Tüm değerler mm cinsinden (A4: 210x297mm)
const PDF_CONFIG = {
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  MARGIN_TOP: 20,
  MARGIN_BOTTOM: 25,
  MARGIN_LEFT: 20,
  MARGIN_RIGHT: 20,
  HEADER_HEIGHT: 30,
  FOOTER_HEIGHT: 20,
  CONTENT_WIDTH: 170, // PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  HEADER_BG: '#F4F4F4',
  HEADER_TEXT: '#000000',
  FOOTER_BG: '#F4F4F4',
  FOOTER_TEXT: '#666666',
  TABLE_HEADER_BG: '#333333',
  TABLE_HEADER_TEXT: '#FFFFFF',
  TABLE_ROW_ALT: '#FAFAFA',
  TABLE_BORDER: '#E0E0E0'
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
 * Yeni PDF dokümanı oluştur
 */
export const createNewPdf = () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  
  // İlk sayfa header'ı
  createHeader(doc);
  
  return doc;
};

/**
 * PDF Header oluştur (80px = ~30mm yükseklik)
 */
export const createHeader = (doc) => {
  const company = getCompanyInfo();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Header arka plan kutusu
  doc.setFillColor(240, 240, 240); // #F4F4F4
  doc.rect(0, 0, PDF_CONFIG.PAGE_WIDTH, PDF_CONFIG.HEADER_HEIGHT, 'F');
  
  // Logo alanı (sol üst, 40x40px = ~15x15mm)
  const logoSize = 15;
  const logoX = PDF_CONFIG.MARGIN_LEFT;
  const logoY = (PDF_CONFIG.HEADER_HEIGHT - logoSize) / 2;
  
  if (company.logo) {
    try {
      // Logo base64 data URL formatında geliyor (data:image/png;base64,...)
      // jsPDF'de logo ekleme
      const logoData = company.logo;
      if (logoData.startsWith('data:image/')) {
        // Data URL'den format ve base64 verisini çıkar
        const matches = logoData.match(/data:image\/(\w+);base64,(.+)/);
        if (matches && matches.length === 3) {
          const format = matches[1].toUpperCase();
          const base64Data = matches[2];
          
          // jsPDF'de addImage kullan (format: PNG, JPEG, etc.)
          doc.addImage(logoData, format, logoX, logoY, logoSize, logoSize);
        } else {
          // Eğer parse edilemezse direkt eklemeyi dene
          doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
        }
      } else {
        // Direkt base64 veya URL ise
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
      }
    } catch (e) {
      console.warn('Logo eklenemedi, placeholder gösteriliyor:', e);
      // Logo eklenemezse placeholder göster
      doc.setFillColor(220, 220, 220);
      doc.rect(logoX, logoY, logoSize, logoSize, 'F');
      doc.setFillColor(180, 180, 180);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text('[LOGO]', logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' });
    }
  } else {
    // Logo placeholder - açık gri kutu
    doc.setFillColor(220, 220, 220);
    doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    doc.setFillColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('[LOGO]', logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' });
  }
  
  // Firma bilgileri (logonun sağında)
  const infoX = logoX + logoSize + 5;
  let infoY = 8;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(safeText(company.name), infoX, infoY);
  infoY += 6;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  if (company.phone) {
    doc.text(`Tel: ${company.phone}`, infoX, infoY);
    infoY += 5;
  }
  
  if (company.address) {
    const addressLines = doc.splitTextToSize(safeText(company.address), PDF_CONFIG.CONTENT_WIDTH - (infoX - PDF_CONFIG.MARGIN_LEFT));
    addressLines.forEach((line, idx) => {
      if (infoY < PDF_CONFIG.HEADER_HEIGHT - 3) {
        doc.text(line, infoX, infoY);
        infoY += 4;
      }
    });
  }
  
  // Oluşturulma tarihi (sağ üst)
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const dateText = safeText(`Olusturulma: ${dateStr}`);
  doc.text(dateText, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT, 8, { align: 'right' });
  
  // Header alt çizgisi
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(0, PDF_CONFIG.HEADER_HEIGHT, PDF_CONFIG.PAGE_WIDTH, PDF_CONFIG.HEADER_HEIGHT);
  
  return PDF_CONFIG.HEADER_HEIGHT + 5; // Başlangıç Y pozisyonu
};

/**
 * Rapor başlığı ekle
 */
export const createTitle = (doc, reportName, filters = {}) => {
  let yPos = PDF_CONFIG.HEADER_HEIGHT + 10;
  
  // Ana başlık
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  const titleLines = doc.splitTextToSize(safeText(reportName), PDF_CONFIG.CONTENT_WIDTH);
  titleLines.forEach((line, idx) => {
    doc.text(line, PDF_CONFIG.PAGE_WIDTH / 2, yPos, { align: 'center' });
    yPos += 7;
  });
  
  // Filtre bilgileri
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
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
  
  // Başlık alt çizgisi
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN_LEFT, yPos + 3, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT, yPos + 3);
  
  return yPos + 10; // İçerik başlangıç Y pozisyonu
};

/**
 * Stilize tablo oluştur (autoTable benzeri ama manuel)
 */
export const createTable = (doc, tableData, columns, startY) => {
  let yPos = startY;
  const colWidths = columns.map(col => col.width || (PDF_CONFIG.CONTENT_WIDTH / columns.length));
  const colPositions = [];
  let currentX = PDF_CONFIG.MARGIN_LEFT;
  
  columns.forEach((col, idx) => {
    colPositions.push(currentX);
    currentX += colWidths[idx];
  });
  
  // Tablo başlıkları
  doc.setFillColor(51, 51, 51); // #333
  doc.rect(PDF_CONFIG.MARGIN_LEFT, yPos - 6, PDF_CONFIG.CONTENT_WIDTH, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
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
    // Sayfa taşması kontrolü
    const maxY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN_BOTTOM;
    if (yPos > maxY) {
      doc.addPage();
      createHeader(doc);
      yPos = PDF_CONFIG.HEADER_HEIGHT + 10;
      
      // Yeni sayfada başlıkları tekrar yaz
      doc.setFillColor(51, 51, 51);
      doc.rect(PDF_CONFIG.MARGIN_LEFT, yPos - 6, PDF_CONFIG.CONTENT_WIDTH, 8, 'F');
      doc.setTextColor(255, 255, 255);
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
    
    // Alternatif satır rengi
    if (rowIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250); // #FAFAFA
      doc.rect(PDF_CONFIG.MARGIN_LEFT, yPos - 5, PDF_CONFIG.CONTENT_WIDTH, 7, 'F');
    }
    
    // Satır çizgileri
    doc.setDrawColor(224, 224, 224); // #E0E0E0
    doc.setLineWidth(0.2);
    doc.line(PDF_CONFIG.MARGIN_LEFT, yPos - 5, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT, yPos - 5);
    
    // Hücre verileri
    doc.setTextColor(0, 0, 0);
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
  
  // Tablo alt çizgisi
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.5);
  doc.line(PDF_CONFIG.MARGIN_LEFT, yPos - 5, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT, yPos - 5);
  
  return yPos;
};

/**
 * PDF Footer oluştur
 */
export const createFooter = (doc, reportName = '', totalPages = null, currentPage = null) => {
  if (totalPages === null) totalPages = doc.internal.getNumberOfPages();
  if (currentPage === null) currentPage = doc.internal.pageNumber || 1;
  
  const footerY = PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT;
  
  // Footer üst çizgisi
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(PDF_CONFIG.MARGIN_LEFT, footerY, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT, footerY);
  
  // Sol altta: Otomatik üretim mesajı
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(
    safeText('Bu dokuman sistem tarafindan otomatik uretilmistir.'),
    PDF_CONFIG.MARGIN_LEFT,
    footerY + 12
  );
  
  // Sağ altta: Sayfa numarası
  doc.text(
    `Sayfa ${currentPage} / ${totalPages}`,
    PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN_RIGHT,
    footerY + 12,
    { align: 'right' }
  );
  
  // Rapor adı (varsa, ortada)
  if (reportName) {
    const safeReportName = safeText(reportName);
    doc.text(
      safeReportName,
      PDF_CONFIG.PAGE_WIDTH / 2,
      footerY + 12,
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