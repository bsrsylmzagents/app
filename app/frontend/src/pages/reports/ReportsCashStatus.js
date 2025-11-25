import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsCashStatus = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/cash-status`, { params });
      setReportData(response.data);
    } catch (error) {
      toast.error('Rapor yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!reportData) return;

    try {
      toast.info('PDF hazırlanıyor...');
      
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'KASA DURUM RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Kasa Bakiyeleri
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Kasa Bakiyeleri', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${reportData.cash_balance?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${reportData.cash_balance?.USD?.toFixed(2) || '0.00'} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${reportData.cash_balance?.TRY?.toFixed(2) || '0.00'} TRY`, 20, yPos);
      yPos += 12;
      
      // Gelir Kaynakları
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Gelir Kaynaklari', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Rezervasyon Gelirleri: ${reportData.reservation_revenue?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`Extra Sales Gelirleri: ${reportData.extra_sales_revenue?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`Ekstra Gelirler: ${reportData.extra_income?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 12;
      
      // Giderler
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Giderler', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Toplam Giderler: ${reportData.total_expenses?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`Cari Odemeler: ${reportData.outgoing_payments?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      
      const filename = `kasa-durum-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Kasa Durum Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-cash-status-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kasa Durum Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchReport} className="w-full btn-primary" title="Raporu Getir">
              <Filter size={18} />
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="text-[#A5A5A5] mt-4">Rapor yükleniyor...</p>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* Kasa Bakiyeleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Kasa Bakiye EUR</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.cash_balance?.EUR?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Kasa Bakiye USD</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.cash_balance?.USD?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Kasa Bakiye TRY</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.cash_balance?.TRY?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* Gelir Kaynakları */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Gelir Kaynakları</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-[#A5A5A5] text-sm mb-2">Rezervasyon Gelirleri</div>
                <div className="text-lg font-bold text-green-400">
                  {reportData.reservation_revenue ? Object.entries(reportData.reservation_revenue)
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                    .join(' / ') : '0.00'}
                </div>
              </div>
              <div>
                <div className="text-[#A5A5A5] text-sm mb-2">Extra Sales Gelirleri</div>
                <div className="text-lg font-bold text-green-400">
                  {reportData.extra_sales_revenue ? Object.entries(reportData.extra_sales_revenue)
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                    .join(' / ') : '0.00'}
                </div>
              </div>
              <div>
                <div className="text-[#A5A5A5] text-sm mb-2">Ekstra Gelirler</div>
                <div className="text-lg font-bold text-green-400">
                  {reportData.extra_income ? Object.entries(reportData.extra_income)
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                    .join(' / ') : '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Giderler */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Giderler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[#A5A5A5] text-sm mb-2">Toplam Giderler</div>
                <div className="text-lg font-bold text-red-400">
                  {reportData.total_expenses ? Object.entries(reportData.total_expenses)
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                    .join(' / ') : '0.00'}
                </div>
              </div>
              <div>
                <div className="text-[#A5A5A5] text-sm mb-2">Cari Ödemeler</div>
                <div className="text-lg font-bold text-red-400">
                  {reportData.outgoing_payments ? Object.entries(reportData.outgoing_payments)
                    .filter(([_, v]) => v > 0)
                    .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                    .join(' / ') : '0.00'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsCashStatus;
