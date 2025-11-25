import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Calendar, Download, Filter, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsDaily = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/daily`, {
        params: { date: selectedDate }
      });
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
      let yPos = createTitle(doc, 'GUNLUK ISLEM RAPORU', { date: selectedDate });
      
      // İstatistikler
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Istatistikler', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Toplam Islem Sayisi: ${reportData.total_reservations}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Musteri Sayisi: ${reportData.total_customers}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam ATV Sayisi: ${reportData.total_atvs}`, 20, yPos);
      yPos += 10;
      
      // Döviz bazlı gelir
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Doviz Bazli Gelir', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${reportData.revenue.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${reportData.revenue.USD?.toFixed(2) || '0.00'} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${reportData.revenue.TRY?.toFixed(2) || '0.00'} TRY`, 20, yPos);
      yPos += 12;
      
      // Pick-up dağılımı tablosu
      if (Object.keys(reportData.pickup_distribution).length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Pick-Up Dagilimi', 20, yPos);
        yPos += 8;
        
        const tableData = Object.entries(reportData.pickup_distribution).map(([location, count]) => ({
          location: safeText(location),
          count: count.toString()
        }));
        
        const columns = [
          { header: 'Pick-Up Yeri', key: 'location', width: 120 },
          { header: 'Rezervasyon Sayisi', key: 'count', width: 50, align: 'center' }
        ];
        
        yPos = createTable(doc, tableData, columns, yPos);
      }
      
      const filename = `gunluk-islem-raporu-${selectedDate}.pdf`;
      savePdf(doc, filename, 'Günlük İşlem Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const generateExcel = () => {
    if (!reportData) return;
    
    // Excel export için XLSX kullanılacak
    toast.info('Excel export özelliği yakında eklenecek');
  };

  const COLORS = ['#3EA6FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const pickupChartData = Object.entries(reportData?.pickup_distribution || {}).map(([name, value]) => ({
    name,
    value
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="mt-4 text-gray-400">Rapor yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-daily-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="text-white hover:bg-[#2D2F33]"
          >
            <ArrowLeft size={16} className="mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Günlük İşlem Raporu</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#A5A5A5]" size={20} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} />
          </Button>
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
        </div>
      </div>

      {reportData && (
        <>
          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam İşlem</div>
              <div className="text-3xl font-bold text-white">{reportData.total_reservations}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Müşteri</div>
              <div className="text-3xl font-bold text-white">{reportData.total_customers}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam ATV</div>
              <div className="text-3xl font-bold text-white">{reportData.total_atvs}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">
                {Object.entries(reportData.revenue)
                  .filter(([_, val]) => val > 0)
                  .map(([curr, val]) => `${val.toFixed(2)} ${curr}`)
                  .join(' / ')}
              </div>
            </div>
          </div>

          {/* Döviz Bazlı Gelir */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Döviz Bazlı Gelir</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#2D2F33] rounded-lg">
                <div className="text-[#A5A5A5] text-sm mb-2">EUR</div>
                <div className="text-2xl font-bold text-white">{reportData.revenue.EUR?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="text-center p-4 bg-[#2D2F33] rounded-lg">
                <div className="text-[#A5A5A5] text-sm mb-2">USD</div>
                <div className="text-2xl font-bold text-white">{reportData.revenue.USD?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="text-center p-4 bg-[#2D2F33] rounded-lg">
                <div className="text-[#A5A5A5] text-sm mb-2">TRY</div>
                <div className="text-2xl font-bold text-white">{reportData.revenue.TRY?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>

          {/* Pick-Up Dağılımı */}
          {pickupChartData.length > 0 && (
            <div className="backdrop-blur-xl rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Pick-Up Dağılımı</h2>
              <div className="space-y-2">
                {pickupChartData.map((entry, index) => {
                  const total = pickupChartData.reduce((sum, e) => sum + e.value, 0);
                  const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--chip-bg)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{entry.value}</div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{percent}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsDaily;

