import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createNewPdf, createDocumentHeader, createFooter, PDF_CONFIG, safeText } from './pdfTemplate';

/**
 * Generate QR Code Data URL (placeholder - replace with actual QR code generation)
 * In production, use a QR code library like qrcode.js
 */
const generateQRCode = (text) => {
  // Placeholder - replace with actual QR code generation
  // For now, return null (QR code will be skipped)
  return null;
};

/**
 * Voucher PDF Generator - Global Design System
 * Portrait A4 format with warm/premium styling
 * 
 * Features:
 * - Hero Section: Big, Bold Pickup Time & Location
 * - QR Code: Top-right for easy scanning
 * - Guest Info: Clean grid layout
 * - Services: List with bullet points
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
  
  const voucherCode = reservation.voucher_code || reservation.id?.substring(0, 8) || 'VCHR-XXXX';
  const doc = createNewPdf('VOUCHER', voucherCode);
  
  let yPos = PDF_CONFIG.MARGIN + 30; // After header
  
  // ==================== HERO SECTION - Pickup Time & Location ====================
  // Big, Bold Pickup Time & Location
  const pickupTime = reservation.time || reservation.pickup_time || '-';
  const pickupLocation = reservation.pickup_location || reservation.location || '-';
  
  // Hero Background Box (subtle)
  const heroHeight = 35;
  doc.setFillColor(...PDF_CONFIG.COLORS.HEADER_BG);
  doc.rect(PDF_CONFIG.MARGIN, yPos, PDF_CONFIG.CONTENT_WIDTH, heroHeight, 'F');
  
  // Pickup Time - Large and Bold
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text('PICKUP TIME', PDF_CONFIG.MARGIN + 5, yPos + 10);
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'normal');
  doc.text(safeText(pickupTime), PDF_CONFIG.MARGIN + 5, yPos + 20);
  
  // Pickup Location - Large and Bold
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PICKUP LOCATION', PDF_CONFIG.MARGIN + 5, yPos + 30);
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'normal');
  const locationLines = doc.splitTextToSize(safeText(pickupLocation), PDF_CONFIG.CONTENT_WIDTH - 60);
  locationLines.forEach((line, idx) => {
    doc.text(line, PDF_CONFIG.MARGIN + 5, yPos + 30 + (idx + 1) * 6);
  });
  
  const qrCode = generateQRCode(voucherCode);
  if (qrCode) {
    try {
      const qrSize = 30;
      const qrX = PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN - qrSize;
      const qrY = yPos + 2;
      doc.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn('QR code eklenemedi:', e);
    }
  }
  
  yPos += heroHeight + 15;
  
  // Separator line
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, yPos, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos);
  yPos += 10;
  
  // ==================== GUEST INFO - Clean Grid Layout ====================
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text('Guest Information', PDF_CONFIG.MARGIN, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const gridSpacing = 6;
  
  // Name
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text('Name:', PDF_CONFIG.MARGIN, yPos);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  const customerName = reservation.customer_name || 'Not Provided';
  doc.text(safeText(customerName), PDF_CONFIG.MARGIN + 30, yPos);
  yPos += gridSpacing;
  
  // Pax (Passengers)
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text('Pax:', PDF_CONFIG.MARGIN, yPos);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text(String(reservation.pax || reservation.atv_count || 0), PDF_CONFIG.MARGIN + 30, yPos);
  yPos += gridSpacing;
  
  // Hotel
  if (reservation.hotel || reservation.hotel_name) {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
    doc.text('Hotel:', PDF_CONFIG.MARGIN, yPos);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text(safeText(reservation.hotel || reservation.hotel_name), PDF_CONFIG.MARGIN + 30, yPos);
    yPos += gridSpacing;
  }
  
  // Agency
  if (reservation.cari_name) {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
    doc.text('Agency:', PDF_CONFIG.MARGIN, yPos);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text(safeText(reservation.cari_name), PDF_CONFIG.MARGIN + 30, yPos);
    yPos += gridSpacing;
  }
  
  // Reservation Date
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
  doc.text('Date:', PDF_CONFIG.MARGIN, yPos);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  const reservationDate = format(new Date(reservation.date || new Date()), 'dd.MM.yyyy', { locale: tr });
  doc.text(reservationDate, PDF_CONFIG.MARGIN + 30, yPos);
  yPos += gridSpacing;
  
  // Service Type
  if (reservation.tour_type_name) {
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_SECONDARY);
    doc.text('Service Type:', PDF_CONFIG.MARGIN, yPos);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text(safeText(reservation.tour_type_name), PDF_CONFIG.MARGIN + 30, yPos);
    yPos += gridSpacing;
  }
  
  yPos += 8;
  
  // Separator line
  doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
  doc.setLineWidth(0.3);
  doc.line(PDF_CONFIG.MARGIN, yPos, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos);
  yPos += 10;
  
  // ==================== SERVICES - List with Bullet Points ====================
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
  doc.text('Included Services', PDF_CONFIG.MARGIN, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  // Services list
  const services = [];
  
  // Add service type as main service
  if (reservation.tour_type_name) {
    services.push(reservation.tour_type_name);
  }
  
  // Add quantity info
  if (reservation.atv_count) {
    services.push(`${reservation.atv_count} ATV`);
  }
  
  // Add any additional services from reservation
  if (reservation.services && Array.isArray(reservation.services)) {
    services.push(...reservation.services);
  } else if (reservation.services) {
    services.push(reservation.services);
  }
  
  // If no services, add default
  if (services.length === 0) {
    services.push('Tour Service');
  }
  
  // Display services with bullet points
  services.forEach((service, idx) => {
    if (yPos > PDF_CONFIG.PAGE_HEIGHT - PDF_CONFIG.FOOTER_HEIGHT - PDF_CONFIG.MARGIN - 10) {
      doc.addPage();
      createDocumentHeader(doc, 'VOUCHER', voucherCode);
      yPos = PDF_CONFIG.MARGIN + 30;
    }
    
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text('•', PDF_CONFIG.MARGIN, yPos);
    doc.text(safeText(String(service)), PDF_CONFIG.MARGIN + 5, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // ==================== ADDITIONAL INFO ====================
  // Amount and Currency
  if (reservation.price) {
    doc.setDrawColor(...PDF_CONFIG.COLORS.BORDER);
    doc.setLineWidth(0.3);
    doc.line(PDF_CONFIG.MARGIN, yPos, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...PDF_CONFIG.COLORS.TEXT_PRIMARY);
    doc.text('Total Amount:', PDF_CONFIG.MARGIN, yPos);
    
    doc.setFontSize(14);
    const amountText = `${(reservation.price || 0).toFixed(2)} ${reservation.currency || 'EUR'}`;
    doc.text(amountText, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, yPos, { align: 'right' });
  }
  
  // PDF'i kaydet veya yazdır
  const filename = `voucher-${voucherCode}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  return { doc, filename };
};

/**
 * Voucher PDF'i indir
 */
export const downloadVoucherPdf = async (reservation, company) => {
  const { doc, filename } = await generateVoucherPdf(reservation, company);
  
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
 * Voucher PDF'i yazdır
 */
export const printVoucherPdf = async (reservation, company) => {
  const { doc, filename } = await generateVoucherPdf(reservation, company);
  
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
