import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsBalancedAccounts = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/balanced-accounts`);
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
      let yPos = createTitle(doc, 'BAKIYESI OLANLAR RAPORU', {});
      
      // Bakiyesi Olanlar Listesi
      if (reportData.balanced_accounts && reportData.balanced_accounts.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Bakiyesi Olanlar', 20, yPos);
        yPos += 8;
        
        const balancedData = reportData.balanced_accounts.slice(0, 50).map(c => ({
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
          { header: 'Toplam', key: 'toplam', width: 30, align: 'right' }
        ];
        
        yPos = createTable(doc, balancedData, columns, yPos);
      }
      
      const filename = `bakiyesi-olanlar-raporu-${new Date().toISOString().split('T')[0]}.pdf`;
      savePdf(doc, filename, 'Bakiyesi Olanlar Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-balanced-accounts-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bakiyesi Olanlar Raporu</h1>
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
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <div className="text-[#A5A5A5] text-sm mb-2">Toplam Cari Hesap Sayısı</div>
            <div className="text-3xl font-bold text-white">{reportData.balanced_accounts?.length || 0}</div>
          </div>

          {/* Bakiyesi Olanlar Listesi */}
          {reportData.balanced_accounts && reportData.balanced_accounts.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Bakiyesi Olanlar</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">EUR</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">USD</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">TRY</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.balanced_accounts.map((cari, idx) => {
                      const total = (cari.balance_eur || 0) + (cari.balance_usd || 0) + (cari.balance_try || 0);
                      return (
                        <tr key={idx} className="hover:bg-[#2D2F33]">
                          <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                          <td className={`px-6 py-4 text-sm text-right ${cari.balance_eur > 0 ? 'text-green-400' : cari.balance_eur < 0 ? 'text-red-400' : 'text-[#A5A5A5]'}`}>
                            {cari.balance_eur?.toFixed(2) || '0.00'}
                          </td>
                          <td className={`px-6 py-4 text-sm text-right ${cari.balance_usd > 0 ? 'text-green-400' : cari.balance_usd < 0 ? 'text-red-400' : 'text-[#A5A5A5]'}`}>
                            {cari.balance_usd?.toFixed(2) || '0.00'}
                          </td>
                          <td className={`px-6 py-4 text-sm text-right ${cari.balance_try > 0 ? 'text-green-400' : cari.balance_try < 0 ? 'text-red-400' : 'text-[#A5A5A5]'}`}>
                            {cari.balance_try?.toFixed(2) || '0.00'}
                          </td>
                          <td className={`px-6 py-4 text-sm font-semibold text-right ${total > 0 ? 'text-green-400' : total < 0 ? 'text-red-400' : 'text-[#A5A5A5]'}`}>
                            {total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!reportData.balanced_accounts || reportData.balanced_accounts.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Bakiyesi olan cari hesap bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsBalancedAccounts;
