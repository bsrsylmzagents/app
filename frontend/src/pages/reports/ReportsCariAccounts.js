import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsCariAccounts = () => {
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
      const response = await axios.get(`${API}/reports/cari-accounts`, { params });
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
      let yPos = createTitle(doc, 'CARI HESAP RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Toplam Bakiyeler
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Toplam Bakiyeler', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${reportData.total_balances.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${reportData.total_balances.USD?.toFixed(2) || '0.00'} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${reportData.total_balances.TRY?.toFixed(2) || '0.00'} TRY`, 20, yPos);
      yPos += 12;
      
      // Alacaklılar
      if (reportData.alacaklilar && reportData.alacaklilar.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Alacaklilar', 20, yPos);
        yPos += 8;
        
        const alacakliData = reportData.alacaklilar.slice(0, 20).map(c => ({
          cari: safeText(c.cari_name || '-'),
          eur: c.balance_eur?.toFixed(2) || '0.00',
          usd: c.balance_usd?.toFixed(2) || '0.00',
          try: c.balance_try?.toFixed(2) || '0.00'
        }));
        
        const columns = [
          { header: 'Cari Firma', key: 'cari', width: 60 },
          { header: 'EUR', key: 'eur', width: 30, align: 'right' },
          { header: 'USD', key: 'usd', width: 30, align: 'right' },
          { header: 'TRY', key: 'try', width: 30, align: 'right' }
        ];
        
        yPos = createTable(doc, alacakliData, columns, yPos);
        yPos += 10;
      }
      
      // Borçlular
      if (reportData.borclular && reportData.borclular.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Borclular', 20, yPos);
        yPos += 8;
        
        const borcluData = reportData.borclular.slice(0, 20).map(c => ({
          cari: safeText(c.cari_name || '-'),
          eur: c.balance_eur?.toFixed(2) || '0.00',
          usd: c.balance_usd?.toFixed(2) || '0.00',
          try: c.balance_try?.toFixed(2) || '0.00'
        }));
        
        const columns = [
          { header: 'Cari Firma', key: 'cari', width: 60 },
          { header: 'EUR', key: 'eur', width: 30, align: 'right' },
          { header: 'USD', key: 'usd', width: 30, align: 'right' },
          { header: 'TRY', key: 'try', width: 30, align: 'right' }
        ];
        
        yPos = createTable(doc, borcluData, columns, yPos);
      }
      
      const filename = `cari-hesap-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Cari Hesap Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-cari-accounts-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cari Hesap Raporu</h1>
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
          {/* Toplam Bakiyeler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Bakiye EUR</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_balances?.EUR?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Bakiye USD</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_balances?.USD?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Bakiye TRY</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_balances?.TRY?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* Alacaklılar */}
          {reportData.alacaklilar && reportData.alacaklilar.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Alacaklılar</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.alacaklilar.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_eur?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_usd?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_try?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Borçlular */}
          {reportData.borclular && reportData.borclular.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Borçlular</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.borclular.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-red-400 text-sm text-right">{cari.balance_eur?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-red-400 text-sm text-right">{cari.balance_usd?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-red-400 text-sm text-right">{cari.balance_try?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* En Fazla İşlem Hacmi */}
          {reportData.top_volume && reportData.top_volume.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">En Fazla İşlem Hacmi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlem Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlem Hacmi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.top_volume.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{cari.transaction_count}</td>
                        <td className="px-6 py-4 text-white text-sm text-right">
                          {cari.transaction_volume ? Object.entries(cari.transaction_volume)
                            .filter(([_, v]) => v > 0)
                            .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                            .join(' / ') : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* En Fazla Kazandıran */}
          {reportData.top_revenue && reportData.top_revenue.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">En Fazla Kazandıran Cari Hesaplar</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Rezervasyon Sayısı</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Gelir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.top_revenue.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{cari.reservation_count}</td>
                        <td className="px-6 py-4 text-white text-sm text-right">
                          {cari.reservation_revenue ? Object.entries(cari.reservation_revenue)
                            .filter(([_, v]) => v > 0)
                            .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
                            .join(' / ') : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!reportData.alacaklilar || reportData.alacaklilar.length === 0) && 
           (!reportData.borclular || reportData.borclular.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Rapor verisi bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsCariAccounts;
