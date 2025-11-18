import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    tour_type_id: '',
    cari_id: '',
    pickup_location: '',
    currency: ''
  });
  const [tourTypes, setTourTypes] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);

  useEffect(() => {
    fetchTourTypes();
    fetchCariAccounts();
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
      const response = await axios.get(`${API}/reports/reservations`, { params });
      setReservations(response.data);
    } catch (error) {
      toast.error('Rapor yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (reservations.length === 0) {
      toast.error('Rapor verisi yok');
      return;
    }

    try {
      toast.info('PDF hazırlanıyor...');
      
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'REZERVASYON RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Tablo verilerini hazırla
      const tableData = reservations.map(r => ({
        rez_no: r.id.substring(0, 8),
        musteri: safeText(r.customer_name || '-'),
        atv: r.atv_count?.toString() || '0',
        birim_fiyat: `${r.unit_price?.toFixed(2) || '0.00'} ${r.currency || 'EUR'}`,
        toplam: `${r.price?.toFixed(2) || '0.00'} ${r.currency || 'EUR'}`,
        tur_tipi: safeText(r.tour_type_name || '-'),
        tarih: r.date || '-'
      }));
      
      const columns = [
        { header: 'Rez. No', key: 'rez_no', width: 25, maxLength: 10 },
        { header: 'Musteri', key: 'musteri', width: 35, maxLength: 20 },
        { header: 'ATV', key: 'atv', width: 20, align: 'center' },
        { header: 'Birim Fiyat', key: 'birim_fiyat', width: 35, align: 'right' },
        { header: 'Toplam', key: 'toplam', width: 35, align: 'right' },
        { header: 'Tur Tipi', key: 'tur_tipi', width: 30, maxLength: 15 },
        { header: 'Tarih', key: 'tarih', width: 30, align: 'center' }
      ];
      
      yPos = createTable(doc, tableData, columns, yPos);
      
      const filename = `rezervasyon-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Rezervasyon Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const generateExcel = () => {
    toast.info('Excel export özelliği için xlsx paketi yüklenmesi gerekiyor. Lütfen terminalde "npm install xlsx" komutunu çalıştırın.');
  };

  return (
    <div className="space-y-6" data-testid="reports-reservations-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Rezervasyon Raporları</h1>
        </div>
        <div className="flex gap-3">
          <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
            <Download size={18} />
          </Button>
          <Button onClick={generateExcel} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="Excel İndir">
            <FileSpreadsheet size={18} />
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Pick-Up Noktası</label>
            <input
              type="text"
              value={filters.pickup_location}
              onChange={(e) => setFilters({ ...filters, pickup_location: e.target.value })}
              placeholder="Pick-up yeri"
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Döviz Tipi</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="TRY">TRY</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={fetchReport} className="btn-primary" title="Filtrele">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Rez. No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">ATV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Birim Fiyat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam Fiyat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tur Tipi</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Pick-Up</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2F33]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-[#A5A5A5]">
                    Yükleniyor...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-[#A5A5A5]">
                    Rezervasyon bulunamadı
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-[#2D2F33]">
                    <td className="px-6 py-4 text-white text-sm font-mono">{r.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-white text-sm">{r.customer_name || '-'}</td>
                    <td className="px-6 py-4 text-[#3EA6FF] text-sm font-semibold">{r.atv_count || 0}</td>
                    <td className="px-6 py-4 text-white text-sm">
                      {r.unit_price?.toFixed(2) || '0.00'} {r.currency || 'EUR'}
                    </td>
                    <td className="px-6 py-4 text-white text-sm font-semibold">
                      {r.price?.toFixed(2) || '0.00'} {r.currency || 'EUR'}
                    </td>
                    <td className="px-6 py-4 text-[#A5A5A5] text-sm">{r.tour_type_name || '-'}</td>
                    <td className="px-6 py-4 text-[#A5A5A5] text-sm">{r.pickup_location || '-'}</td>
                    <td className="px-6 py-4 text-[#A5A5A5] text-sm">{r.notes || '-'}</td>
                    <td className="px-6 py-4 text-white text-sm">{r.date || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsReservations;

