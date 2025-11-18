import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsCustomers = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    cari_id: ''
  });
  const [cariAccounts, setCariAccounts] = useState([]);

  useEffect(() => {
    fetchCariAccounts();
    fetchReport();
  }, []);

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/customers`, { params });
      setReportData(response.data);
    } catch (error) {
      toast.error('Rapor yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!reportData) return;

    try {
      toast.info('PDF hazırlanıyor...');
      
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'MUSTERI RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to,
        cari_name: filters.cari_id ? cariAccounts.find(c => c.id === filters.cari_id)?.name : undefined
      });
      
      // Özet bilgi
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Toplam Musteri Sayisi: ${reportData.total_customers}`, 20, yPos);
      yPos += 12;
      
      // Tablo verilerini hazırla
      const tableData = reportData.top_customers.map(c => ({
        musteri: safeText(c.customer_name || '-'),
        cari_firma: safeText(c.cari_name || '-'),
        rezervasyon: c.reservation_count.toString(),
        harcama: `${c.total_spent.toFixed(2)} ${Object.entries(c.currencies).find(([_, v]) => v > 0)?.[0] || 'EUR'}`
      }));
      
      const columns = [
        { header: 'Musteri', key: 'musteri', width: 50, maxLength: 25 },
        { header: 'Cari Firma', key: 'cari_firma', width: 50, maxLength: 25 },
        { header: 'Rezervasyon', key: 'rezervasyon', width: 30, align: 'center' },
        { header: 'Toplam Harcama', key: 'harcama', width: 40, align: 'right' }
      ];
      
      yPos = createTable(doc, tableData, columns, yPos);
      
      const filename = `musteri-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Müşteri Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const chartData = reportData?.top_customers.slice(0, 10).map(c => ({
    name: c.customer_name.substring(0, 15),
    rezervasyon: c.reservation_count,
    harcama: c.total_spent
  })) || [];

  return (
    <div className="space-y-6" data-testid="reports-customers-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Müşteri Raporları</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Cari Firma</label>
            <select
              value={filters.cari_id}
              onChange={(e) => setFilters({ ...filters, cari_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {cariAccounts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Toplam Müşteri</h2>
              <div className="text-4xl font-bold text-[#3EA6FF]">{reportData.total_customers}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">En Çok Rezervasyon Yapanlar</h2>
              <div className="text-4xl font-bold text-[#3EA6FF]">{reportData.top_customers.length}</div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Müşteri Performans</h2>
              <div className="space-y-3">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#2D2F33] rounded-lg">
                    <div className="flex-1">
                      <div className="text-white font-semibold mb-1">{item.name}</div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-[#3EA6FF]">Rezervasyon: {item.rezervasyon}</span>
                        <span className="text-[#10B981]">Harcama: {item.harcama.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Rezervasyon</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam Harcama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {reportData.top_customers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">{customer.customer_name}</td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{customer.cari_name}</td>
                      <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold">{customer.reservation_count}</td>
                      <td className="px-6 py-4 text-white text-sm">
                        {Object.entries(customer.currencies)
                          .filter(([_, v]) => v > 0)
                          .map(([curr, val]) => `${val.toFixed(2)} ${curr}`)
                          .join(' / ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsCustomers;

