import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Güvenli metin - özel karakterleri temizle
 */
const safeText = (text) => {
  if (!text) return '';
  return String(text).replace(/[^\x00-\x7F]/g, ''); // ASCII olmayan karakterleri kaldır
};

/**
 * Yatay (landscape) voucher PDF oluştur
 * Bilet/ticket formatında, çift dilli (TR/EN)
 */
export const generateVoucherPdf = async (reservation, company) => {
  // Validasyon
  if (!reservation) {
    throw new Error('Rezervasyon bilgisi gerekli');
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
  
  // PDF oluştur - Landscape (yatay) A4
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Margin'ler
  const margin = 30;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);
  
  // Bilet çerçevesi - rounded rectangle
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(2);
  doc.roundedRect(margin, margin, contentWidth, contentHeight, 10, 10);
  
  // Perforation çizgisi (yırtma çizgisi) - sol ve sağ blok arasında
  const perforationX = margin + (contentWidth * 0.4); // Sol blok %40 genişliğinde
  doc.setLineDash([3, 3]);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(1);
  doc.line(perforationX, margin + 20, perforationX, margin + contentHeight - 20);
  doc.setLineDash([]); // Reset
  
  // ==================== SOL BLOK - FİRMA BİLGİLERİ ====================
  let yPos = margin + 40;
  const leftBlockWidth = perforationX - margin - 20;
  
  // Logo alanı (varsa - şimdilik boş bırakıyoruz, ileride eklenebilir)
  // Logo varsa: doc.addImage(logoData, 'PNG', margin + 10, yPos, 40, 40);
  
  yPos += 20;
  
  // Firma Adı (büyük font)
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  const companyName = company?.company_name || 'Firma Adı';
  const companyNameLines = doc.splitTextToSize(safeText(companyName), leftBlockWidth - 20);
  doc.text(companyNameLines, margin + 10, yPos);
  yPos += (companyNameLines.length * 20) + 15;
  
  // Firma bilgileri (küçük font)
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);
  
  if (company?.phone) {
    doc.text(`Tel: ${safeText(company.phone)}`, margin + 10, yPos);
    yPos += 18;
  }
  
  if (company?.address) {
    const addressLines = doc.splitTextToSize(`Adres: ${safeText(company.address)}`, leftBlockWidth - 20);
    doc.text(addressLines, margin + 10, yPos);
    yPos += (addressLines.length * 18);
  }
  
  if (company?.email) {
    doc.text(`E-posta: ${safeText(company.email)}`, margin + 10, yPos);
    yPos += 18;
  }
  
  if (company?.website) {
    doc.text(`Web: ${safeText(company.website)}`, margin + 10, yPos);
    yPos += 18;
  }
  
  // Voucher numarası ve tarih (sol alt)
  yPos = margin + contentHeight - 60;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  
  const voucherCode = reservation.voucher_code || 'VCHR-XXXX';
  doc.text(`Voucher No / Voucher Number:`, margin + 10, yPos);
  yPos += 16;
  doc.setFontSize(12);
  doc.text(safeText(voucherCode), margin + 10, yPos);
  yPos += 20;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const issuedDate = format(new Date(reservation.created_at || new Date()), 'dd.MM.yyyy', { locale: tr });
  doc.text(`Olusturulma Tarihi / Issued Date: ${issuedDate}`, margin + 10, yPos);
  
  // ==================== SAĞ BLOK - REZERVASYON DETAYLARI ====================
  const rightBlockX = perforationX + 20;
  const rightBlockWidth = pageWidth - rightBlockX - margin;
  yPos = margin + 40;
  
  // Başlık
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Rezervasyon Detaylari / Reservation Details', rightBlockX, yPos);
  yPos += 30;
  
  // Grid yapısı - çift dilli alanlar
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const fieldSpacing = 25;
  
  // Rezervasyon Tarihi / Reservation Date
  doc.setFont(undefined, 'bold');
  doc.text('Rezervasyon Tarihi', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Reservation Date', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const reservationDate = format(new Date(reservation.date), 'dd.MM.yyyy', { locale: tr });
  doc.text(reservationDate, rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Rezervasyon Saati / Reservation Time
  doc.setFont(undefined, 'bold');
  doc.text('Rezervasyon Saati', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Reservation Time', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(safeText(reservation.time || '-'), rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Tur Zamanı / Tour Time
  doc.setFont(undefined, 'bold');
  doc.text('Tur Zamani', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Tour Time', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const tourTime = reservation.time || '-';
  doc.text(safeText(tourTime), rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Hizmet Tipi / Service Type
  doc.setFont(undefined, 'bold');
  doc.text('Hizmet Tipi', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Service Type', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const serviceType = reservation.tour_type_name || 'Belirtilmedi / Not Provided';
  doc.text(safeText(serviceType), rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Hizmet Adedi / Quantity
  doc.setFont(undefined, 'bold');
  doc.text('Hizmet Adedi', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Quantity', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`${reservation.atv_count || 0} ATV`, rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Müşteri Adı / Customer Name
  doc.setFont(undefined, 'bold');
  doc.text('Musteri Adi', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Name', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const customerName = reservation.customer_name || 'Belirtilmedi / Not Provided';
  const customerNameLines = doc.splitTextToSize(safeText(customerName), rightBlockWidth - 140);
  doc.text(customerNameLines, rightBlockX + 120, yPos);
  yPos += (customerNameLines.length > 1 ? customerNameLines.length * 18 : fieldSpacing);
  
  // Cari Firma / Agency
  doc.setFont(undefined, 'bold');
  doc.text('Cari Firma', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Agency', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const agencyName = reservation.cari_name || 'Belirtilmedi / Not Provided';
  const agencyNameLines = doc.splitTextToSize(safeText(agencyName), rightBlockWidth - 140);
  doc.text(agencyNameLines, rightBlockX + 120, yPos);
  yPos += (agencyNameLines.length > 1 ? agencyNameLines.length * 18 : fieldSpacing);
  
  // Tutar / Amount
  doc.setFont(undefined, 'bold');
  doc.text('Tutar', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Amount', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`${(reservation.price || 0).toFixed(2)}`, rightBlockX + 120, yPos);
  yPos += fieldSpacing;
  
  // Döviz Tipi / Currency
  doc.setFont(undefined, 'bold');
  doc.text('Doviz Tipi', rightBlockX, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Currency', rightBlockX, yPos + 12);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(reservation.currency || 'EUR', rightBlockX + 120, yPos);
  
  // ==================== FOOTER ====================
  const footerY = margin + contentHeight - 20;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120, 120, 120);
  const footerText = 'Bu voucher sistem tarafindan otomatik olusturulmustur. / This voucher has been automatically generated by the system.';
  const footerLines = doc.splitTextToSize(footerText, contentWidth - 40);
  const footerStartY = footerY - (footerLines.length * 10);
  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerStartY + (index * 10), { align: 'center' });
  });
  
  // PDF'i kaydet veya yazdır
  const filename = `voucher-${reservation.voucher_code || reservation.id.substring(0, 8)}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  return { doc, filename };
};

/**
 * Voucher PDF'i indir
 */
export const downloadVoucherPdf = async (reservation, company) => {
  const { doc, filename } = await generateVoucherPdf(reservation, company);
  doc.save(filename);
  return filename;
};

/**
 * Voucher PDF'i yazdır
 */
export const printVoucherPdf = async (reservation, company) => {
  const { doc, filename } = await generateVoucherPdf(reservation, company);
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
