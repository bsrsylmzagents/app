import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsCreditors = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/creditors`);
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
      let yPos = createTitle(doc, 'ALACAKLI OLANLAR RAPORU', {});
      
      // Alacaklılar Listesi
      if (reportData.creditors && reportData.creditors.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Alacakli Olanlar (Bize Borclu Olanlar)', 20, yPos);
        yPos += 8;
        
        const creditorData = reportData.creditors.slice(0, 50).map(c => ({
          cari: safeText(c.cari_name || '-'),
          eur: c.balance_eur?.toFixed(2) || '0.00',
          usd: c.balance_usd?.toFixed(2) || '0.00',
          try: c.balance_try?.toFixed(2) || '0.00',
          toplam: c.total_balance?.toFixed(2) || '0.00'
        }));
        
        const columns = [
          { header: 'Cari Firma', key: 'cari', width: 60 },
          { header: 'EUR', key: 'eur', width: 30, align: 'right' },
          { header: 'USD', key: 'usd', width: 30, align: 'right' },
          { header: 'TRY', key: 'try', width: 30, align: 'right' },
          { header: 'Toplam Alacak', key: 'toplam', width: 40, align: 'right' }
        ];
        
        yPos = createTable(doc, creditorData, columns, yPos);
      }
      
      const filename = `alacakli-olanlar-raporu-${new Date().toISOString().split('T')[0]}.pdf`;
      savePdf(doc, filename, 'Alacaklı Olanlar Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const totalCreditors = reportData?.creditors ? reportData.creditors.reduce((sum, c) => {
    return sum + (c.total_balance || 0);
  }, 0) : 0;

  return (
    <div className="space-y-6" data-testid="reports-creditors-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alacaklı Olanlar Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="text-[#A5A5A5] mt-4">Rapor yükleniyor...</p>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* Özet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Alacaklı Cari Hesap Sayısı</div>
              <div className="text-3xl font-bold text-white">{reportData.creditors?.length || 0}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Alacak</div>
              <div className="text-3xl font-bold text-green-400">{totalCreditors.toFixed(2)}</div>
            </div>
          </div>

          {/* Alacaklılar Listesi */}
          {reportData.creditors && reportData.creditors.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Alacaklı Olanlar (Bize Borçlu Olanlar)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Alacak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.creditors.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_eur?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_usd?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-green-400 text-sm text-right">{cari.balance_try?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-green-400 text-sm font-semibold text-right">{cari.total_balance?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!reportData.creditors || reportData.creditors.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Alacaklı cari hesap bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsCreditors;
