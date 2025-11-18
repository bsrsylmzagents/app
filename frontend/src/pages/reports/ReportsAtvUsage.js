import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsAtvUsage = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    tour_type_id: ''
  });
  const [tourTypes, setTourTypes] = useState([]);

  useEffect(() => {
    fetchTourTypes();
    fetchReport();
  }, []);

  const fetchTourTypes = async () => {
    try {
      const response = await axios.get(`${API}/tour-types`);
      setTourTypes(response.data);
    } catch (error) {
      console.error('Tur tipleri yüklenemedi');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await axios.get(`${API}/reports/atv-usage`, { params });
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
      let yPos = createTitle(doc, 'ATV KULLANIM / DOLULUK RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to,
        tour_type_name: filters.tour_type_id ? tourTypes.find(tt => tt.id === filters.tour_type_id)?.name : undefined
      });
      
      // Özet bilgi
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Toplam Rezervasyon: ${reportData.total_reservations}`, 20, yPos);
      yPos += 12;
      
      // Günlük kullanım tablosu
      if (Object.keys(reportData.daily_usage).length > 0) {
        const tableData = Object.entries(reportData.daily_usage)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({
            tarih: date,
            kullanim: count.toString()
          }));
        
        const columns = [
          { header: 'Tarih', key: 'tarih', width: 85 },
          { header: 'ATV Kullanimi', key: 'kullanim', width: 85, align: 'center' }
        ];
        
        yPos = createTable(doc, tableData, columns, yPos);
      }
      
      const filename = `atv-kullanim-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'ATV Kullanım Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const dailyChartData = reportData ? Object.entries(reportData.daily_usage)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: format(new Date(date), 'dd.MM'),
      kullanim: count
    })) : [];

  const hourlyChartData = reportData ? Object.entries(reportData.hourly_usage || {})
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([hour, count]) => ({
      saat: `${hour}:00`,
      kullanim: count
    })) : [];

  const tourTypeChartData = reportData?.tour_type_usage ? reportData.tour_type_usage
    .map((item) => ({
      name: item.tour_type_name || '-',
      kullanim: item.atv_count || 0
    })) : [];

  return (
    <div className="space-y-6" data-testid="reports-atv-usage-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">ATV Kullanım / Doluluk Raporu</h1>
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
            <label className="block text-sm font-medium mb-2 text-white">Tur Tipi</label>
            <select
              value={filters.tour_type_id}
              onChange={(e) => setFilters({ ...filters, tour_type_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {tourTypes.map(tt => (
                <option key={tt.id} value={tt.id}>{tt.name}</option>
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
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Toplam Rezervasyon</h2>
            <div className="text-4xl font-bold text-[#3EA6FF]">{reportData.total_reservations}</div>
          </div>

          {dailyChartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Günlük ATV Kullanım Trendi</h2>
              <div className="space-y-2">
                {dailyChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                    <div className="text-white font-semibold">{item.date}</div>
                    <div className="text-[#3EA6FF] font-bold">{item.kullanim} ATV</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hourlyChartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Saatlik Yoğunluk</h2>
              <div className="space-y-2">
                {hourlyChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                    <div className="text-white font-semibold">{item.saat}</div>
                    <div className="text-[#3EA6FF] font-bold">{item.kullanim} ATV</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tourTypeChartData.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Tur Tipine Göre ATV Kullanımı</h2>
              <div className="space-y-2">
                {tourTypeChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg">
                    <div className="text-white font-semibold">{item.name}</div>
                    <div className="text-[#10B981] font-bold">{item.kullanim} ATV</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsAtvUsage;

