import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsPickupPerformance = () => {
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
      const response = await axios.get(`${API}/reports/pickup-performance`, {
        params: filters
      });
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
      let yPos = createTitle(doc, 'PICK-UP NOKTASI PERFORMANS RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Tablo verilerini hazırla
      const tableData = reportData.pickup_stats.map(p => ({
        pickup: safeText(p.pickup_location || '-'),
        musteri: p.customer_count.toString(),
        atv: p.total_atvs.toString(),
        tur_tipleri: safeText(Object.keys(p.tour_types).join(', '))
      }));
      
      const columns = [
        { header: 'Pick-Up Yeri', key: 'pickup', width: 50, maxLength: 25 },
        { header: 'Musteri Sayisi', key: 'musteri', width: 40, align: 'center' },
        { header: 'Toplam ATV', key: 'atv', width: 40, align: 'center' },
        { header: 'Tur Tipleri', key: 'tur_tipleri', width: 40, maxLength: 20 }
      ];
      
      yPos = createTable(doc, tableData, columns, yPos);
      
      const filename = `pickup-performans-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Pick-Up Performans Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const chartData = reportData?.pickup_stats.map(p => ({
    name: p.pickup_location.substring(0, 15),
    musteri: p.customer_count,
    atv: p.total_atvs
  })) || [];

  return (
    <div className="space-y-6" data-testid="reports-pickup-performance-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pick-Up Noktası Performans Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <div className="mt-4">
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {reportData && (
        <>
          {chartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Pick-Up Performans</h2>
              <div className="space-y-3">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#2D2F33] rounded-lg">
                    <div className="flex-1">
                      <div className="text-white font-semibold mb-1">{item.name}</div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-[#3EA6FF]">Müşteri: {item.musteri}</span>
                        <span className="text-[#10B981]">ATV: {item.atv}</span>
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Pick-Up Yeri</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri Sayısı</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam ATV</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tur Tipi Dağılımı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {reportData.pickup_stats.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm font-semibold">{p.pickup_location}</td>
                      <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold">{p.customer_count}</td>
                      <td className="px-6 py-4 text-[#10B981] text-sm font-semibold">{p.total_atvs}</td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                        {Object.entries(p.tour_types)
                          .map(([type, count]) => `${type} (${count})`)
                          .join(', ')}
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

export default ReportsPickupPerformance;

