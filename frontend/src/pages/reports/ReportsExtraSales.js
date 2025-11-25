import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import { Button } from '@/components/ui/button';

const ReportsExtraSales = () => {
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
      const response = await axios.get(`${API}/reports/extra-sales`, { params });
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
      let yPos = createTitle(doc, 'EXTRA SALES RAPORU', {
        date_from: filters.date_from,
        date_to: filters.date_to
      });
      
      // Toplam Gelir
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Toplam Gelir', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`EUR: ${reportData.total_revenue?.EUR?.toFixed(2) || '0.00'} EUR`, 20, yPos);
      yPos += 6;
      doc.text(`USD: ${reportData.total_revenue?.USD?.toFixed(2) || '0.00'} USD`, 20, yPos);
      yPos += 6;
      doc.text(`TRY: ${reportData.total_revenue?.TRY?.toFixed(2) || '0.00'} TRY`, 20, yPos);
      yPos += 12;
      
      // En çok satılan ürünler
      if (reportData.top_products && reportData.top_products.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('En Cok Satilan Urunler', 20, yPos);
        yPos += 8;
        
        const productData = reportData.top_products.slice(0, 20).map(p => ({
          urun: safeText(p.product_name || '-'),
          adet: (p.count || 0).toString(),
          gelir: Object.entries(p.revenue || {})
            .filter(([_, v]) => v > 0)
            .map(([curr, val]) => `${(val || 0).toFixed(2)} ${curr}`)
            .join(' / ') || '0.00'
        }));
        
        const columns = [
          { header: 'Urun', key: 'urun', width: 60 },
          { header: 'Adet', key: 'adet', width: 30, align: 'center' },
          { header: 'Gelir', key: 'gelir', width: 50, align: 'right' }
        ];
        
        yPos = createTable(doc, productData, columns, yPos);
      }
      
      const filename = `extra-sales-raporu-${filters.date_from}-${filters.date_to}.pdf`;
      savePdf(doc, filename, 'Extra Sales Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-extra-sales-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Extra Sales Raporu</h1>
        </div>
        <Button onClick={generatePDF} variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]" title="PDF İndir">
          <Download size={18} />
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
          <div>
            <label className="block text-sm font-medium text-[#A5A5A5] mb-2">Cari Firma</label>
            <select
              value={filters.cari_id}
              onChange={(e) => setFilters({ ...filters, cari_id: e.target.value })}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="">Tümü</option>
              {cariAccounts.map(cari => (
                <option key={cari.id} value={cari.id}>{cari.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchReport} className="w-full btn-primary">
              <Filter size={18} className="mr-2" />
              Raporu Getir
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
          {/* Toplam Gelir */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir EUR</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_revenue?.EUR?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir USD</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_revenue?.USD?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
              <div className="text-[#A5A5A5] text-sm mb-2">Toplam Gelir TRY</div>
              <div className="text-2xl font-bold text-[#3EA6FF]">{reportData.total_revenue?.TRY?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* En Çok Satılan Ürünler */}
          {reportData.top_products && reportData.top_products.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">En Çok Satılan Ürünler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ürün</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Adet</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Gelir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.top_products.map((product, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{product.product_name}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{product.count}</td>
                        <td className="px-6 py-4 text-white text-sm text-right">
                          {product.revenue ? Object.entries(product.revenue)
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

          {/* Cari Firmalara Göre Dağılım */}
          {reportData.cari_distribution && reportData.cari_distribution.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Cari Firmalara Göre Dağılım</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Adet</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Gelir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.cari_distribution.map((cari, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{cari.cari_name}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{cari.count}</td>
                        <td className="px-6 py-4 text-white text-sm text-right">
                          {cari.revenue ? Object.entries(cari.revenue)
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

          {/* Extra Sales Listesi */}
          {reportData.extra_sales && reportData.extra_sales.length > 0 && (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2D2F33]">
                <h2 className="text-xl font-bold text-white">Extra Sales Listesi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ürün</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Pax</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">Fiyat</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Döviz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {reportData.extra_sales.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm">{sale.date}</td>
                        <td className="px-6 py-4 text-white text-sm">{sale.product_name || '-'}</td>
                        <td className="px-6 py-4 text-white text-sm">{sale.customer_name || '-'}</td>
                        <td className="px-6 py-4 text-[#3EA6FF] text-sm text-right">{sale.person_count || 0}</td>
                        <td className="px-6 py-4 text-white text-sm text-right">{(sale.sale_price || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-white text-sm">{sale.currency || 'EUR'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!reportData.extra_sales || reportData.extra_sales.length === 0) && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">Rapor verisi bulunamadı</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsExtraSales;
