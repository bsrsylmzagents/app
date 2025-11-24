import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, Receipt, Printer, Download, Search, XCircle, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { downloadVoucherPdf, printVoucherPdf } from '../utils/voucherPdf';
import { formatDateStringDDMMYYYY } from '../utils/dateFormatter';
import CustomerDetailDialog from '../components/CustomerDetailDialog';
import Loading from '../components/Loading';

const ExtraSales = () => {
  const [sales, setSales] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSaleForCancel, setSelectedSaleForCancel] = useState(null);
  const [cancelFormData, setCancelFormData] = useState({
    cancellation_reason: '',
    apply_no_show: false,
    no_show_amount: '',
    no_show_currency: 'EUR',
    exchange_rate: 1.0
  });
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    product_name: '',
    cari_id: '',
    customer_name: '',
    person_count: '',
    customer_contact: '',
    customer_details: null,
    pickup_location: '',
    date: '',
    time: '',
    sale_price: 0,
    purchase_price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    supplier_id: '',
    notes: '',
    payment_type_id: '',
    bank_account_id: ''
  });
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchCariAccounts();
    fetchPaymentTypes();
    fetchBankAccounts();
    fetchRates();
  }, [statusFilter]);

  const fetchSales = async (status = null) => {
    try {
      setLoading(true);
      const params = {};
      if (status || statusFilter !== 'all') {
        params.status = status || statusFilter;
      }
      const response = await axios.get(`${API}/extra-sales`, { params });
      setSales(response.data);
    } catch (error) {
      toast.error('Satışlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data);
      // Münferit cari varsa default olarak seç
      const munferitCari = response.data.find(c => c.is_munferit || c.name === "Münferit");
      if (munferitCari && !formData.cari_id) {
        setFormData(prev => ({ ...prev, cari_id: munferitCari.id }));
      }
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      const paymentTypesData = response.data || [];
      // Sadece "cash" ve "bank_transfer" ödeme tiplerini al
      const filteredPaymentTypes = paymentTypesData.filter(pt => 
        pt.is_active && (pt.code === 'cash' || pt.code === 'bank_transfer')
      );
      setPaymentTypes(filteredPaymentTypes);
      
      // Default olarak "cash" seç
      if (filteredPaymentTypes.length > 0 && !formData.payment_type_id) {
        const defaultPaymentType = filteredPaymentTypes.find(pt => pt.code === 'cash') || filteredPaymentTypes[0];
        setFormData(prev => ({ ...prev, payment_type_id: defaultPaymentType.id }));
      }
    } catch (error) {
      console.error('Ödeme tipleri yüklenemedi:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(`${API}/bank-accounts`);
      setBankAccounts(response.data || []);
    } catch (error) {
      console.error('Banka hesapları yüklenemedi:', error);
    }
  };

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates`);
      setRates(response.data.rates);
    } catch (error) {
      console.error('Kurlar yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        person_count: formData.person_count ? parseInt(formData.person_count) : null,
        sale_price: parseFloat(formData.sale_price),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0
      };
      
      if (submitData.customer_details) {
        const details = submitData.customer_details;
        const hasDetails = details.phone || details.email || details.nationality || details.id_number || details.birth_date;
        if (!hasDetails) {
          submitData.customer_details = null;
        }
      }
      
      await axios.post(`${API}/extra-sales`, submitData);
      toast.success('Satış oluşturuldu');
      setDialogOpen(false);
      resetForm();
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Satış kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Satışı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/extra-sales/${id}`);
      toast.success('Satış silindi');
      fetchSales();
    } catch (error) {
      toast.error('Satış silinemedi');
    }
  };

  const handleCancelSale = async () => {
    if (!cancelFormData.cancellation_reason.trim()) {
      toast.error('Lütfen iptal sebebini girin');
      return;
    }
    
    if (cancelFormData.apply_no_show && (!cancelFormData.no_show_amount || parseFloat(cancelFormData.no_show_amount) <= 0)) {
      toast.error('No-show bedeli için tutar girin');
      return;
    }
    
    try {
      const payload = {
        cancellation_reason: cancelFormData.cancellation_reason,
        apply_no_show: cancelFormData.apply_no_show,
        no_show_amount: cancelFormData.apply_no_show ? parseFloat(cancelFormData.no_show_amount) : null,
        no_show_currency: cancelFormData.apply_no_show ? cancelFormData.no_show_currency : null,
        exchange_rate: rates[cancelFormData.no_show_currency] || 1.0
      };
      
      await axios.put(`${API}/extra-sales/${selectedSaleForCancel.id}/cancel`, payload);
      toast.success(cancelFormData.apply_no_show ? 'Satış iptal edildi ve no-show bedeli uygulandı' : 'Satış iptal edildi');
      setCancelDialogOpen(false);
      setSelectedSaleForCancel(null);
      resetCancelForm();
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Satış iptal edilemedi');
    }
  };

  const resetCancelForm = () => {
    setCancelFormData({
      cancellation_reason: '',
      apply_no_show: false,
      no_show_amount: '',
      no_show_currency: 'EUR',
      exchange_rate: 1.0
    });
  };

  const handleDownloadVoucher = async (saleId, action = 'download') => {
    try {
      toast.info('Voucher hazırlanıyor...');
      
      // Voucher oluştur veya mevcut voucher'ı getir
      const voucherResponse = await axios.post(`${API}/extra-sales/${saleId}/voucher`);
      
      if (!voucherResponse.data) {
        throw new Error('Voucher yanıtı boş');
      }
      
      const { sale, company } = voucherResponse.data;
      
      if (!sale) {
        throw new Error('Satış bilgisi bulunamadı');
      }
      
      // Firma bilgilerini al (eğer eksikse)
      let companyData = company;
      if (!companyData) {
        try {
          const companyResponse = await axios.get(`${API}/auth/me`);
          companyData = companyResponse.data?.company;
        } catch (e) {
          console.warn('Company bilgisi alınamadı, varsayılan kullanılıyor');
        }
      }
      
      if (!companyData) {
        companyData = {
          company_name: 'Firma Adı',
          phone: '',
          address: '',
          email: '',
          website: ''
        };
      }
      
      // Rezervasyon formatına dönüştür (voucherPdf rezervasyon formatı bekliyor)
      const reservationFormat = {
        id: sale.id,
        voucher_code: sale.voucher_code,
        date: sale.date || '',
        time: sale.time || '',
        tour_type_name: sale.product_name || 'Açık Satış',
        atv_count: sale.person_count || 0,
        customer_name: sale.customer_name || 'Belirtilmedi / Not Provided',
        cari_name: sale.cari_name || 'Belirtilmedi / Not Provided',
        price: sale.sale_price || 0,
        currency: sale.currency || 'EUR',
        created_at: sale.created_at || new Date().toISOString()
      };
      
      // PDF oluştur ve indir veya yazdır
      if (action === 'print') {
        await printVoucherPdf(reservationFormat, companyData);
        toast.success('Voucher yazdırılıyor...');
      } else {
        await downloadVoucherPdf(reservationFormat, companyData);
        toast.success('Voucher indirildi');
      }
    } catch (error) {
      console.error('Voucher oluşturma hatası:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Voucher oluşturulamadı';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    // Münferit cari varsa default olarak seç
    const munferitCari = cariAccounts.find(c => c.is_munferit || c.name === "Münferit");
    const defaultPaymentType = paymentTypes.find(pt => pt.code === 'cash') || paymentTypes[0];
    setFormData({
      product_name: '',
      cari_id: munferitCari?.id || '',
      customer_name: '',
      person_count: '',
      customer_contact: '',
      customer_details: null,
      pickup_location: '',
      date: '',
      time: '',
      sale_price: 0,
      purchase_price: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      supplier_id: '',
      notes: '',
      payment_type_id: defaultPaymentType?.id || '',
      bank_account_id: ''
    });
  };

  // WhatsApp linki oluştur
  const getWhatsAppLink = (phone) => {
    if (!phone) return null;
    // Telefon numarasından sadece rakamları al
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    // Türkiye için +90 ekle (eğer yoksa)
    const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : (cleanPhone.startsWith('0') ? '90' + cleanPhone.substring(1) : '90' + cleanPhone);
    return `https://wa.me/${formattedPhone}`;
  };

  // Gün sonu 08:00'da olacak şekilde bugünün tarihini hesapla
  const getTodayDateRange = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    let todayStart, todayEnd;
    
    if (currentHour < 8) {
      // Eğer saat 08:00'dan önceyse, bugün = dün 08:00 - bugün 08:00
      todayStart = new Date(now);
      todayStart.setDate(todayStart.getDate() - 1);
      todayStart.setHours(8, 0, 0, 0);
      
      todayEnd = new Date(now);
      todayEnd.setHours(8, 0, 0, 0);
    } else {
      // Eğer saat 08:00'dan sonraysa, bugün = bugün 08:00 - şu an
      todayStart = new Date(now);
      todayStart.setHours(8, 0, 0, 0);
      
      todayEnd = new Date(now);
    }
    
    return {
      start: todayStart.toISOString().split('T')[0] + ' ' + todayStart.toTimeString().split(' ')[0].substring(0, 5),
      end: todayEnd.toISOString().split('T')[0] + ' ' + todayEnd.toTimeString().split(' ')[0].substring(0, 5),
      startDate: todayStart.toISOString().split('T')[0],
      endDate: todayEnd.toISOString().split('T')[0]
    };
  };

  // Bugünkü satışları filtrele (basit tarih karşılaştırması)
  const todaySales = useMemo(() => {
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD formatında
    
    return sales.filter(sale => {
      if (!sale.date) return false;
      // Bugünün tarihine sahip satışlar
      return sale.date === todayDateStr;
    });
  }, [sales]);

  const pastSales = useMemo(() => {
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD formatında
    
    return sales.filter(sale => {
      if (!sale.date) return false;
      // Bugünden önceki tarihlere sahip satışlar
      return sale.date !== todayDateStr;
    });
  }, [sales]);

  // Arama filtresi ve sıralama (en son eklenenler üstte)
  const filterAndSortSales = (salesList) => {
    let filtered = [...salesList];
    
    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => {
        return (
          (sale.product_name || '').toLowerCase().includes(query) ||
          (sale.customer_name || '').toLowerCase().includes(query) ||
          (sale.cari_name || '').toLowerCase().includes(query) ||
          (sale.customer_contact || '').toLowerCase().includes(query) ||
          (sale.pickup_location || '').toLowerCase().includes(query) ||
          (sale.date || '').includes(query) ||
          (sale.time || '').includes(query) ||
          String(sale.sale_price || '').includes(query) ||
          (sale.currency || '').toLowerCase().includes(query) ||
          String(sale.person_count || '').includes(query)
        );
      });
    }
    
    // En son eklenenler üstte olacak şekilde sırala
    // Önce date+time'a göre, sonra created_at'e göre
    filtered.sort((a, b) => {
      // Tarih ve saat birleştir
      const dateTimeA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}:00`);
      const dateTimeB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}:00`);
      
      // Tarih/saat karşılaştırması
      if (dateTimeB.getTime() !== dateTimeA.getTime()) {
        return dateTimeB.getTime() - dateTimeA.getTime(); // En yeni üstte
      }
      
      // Eğer tarih/saat aynıysa, created_at'e göre sırala
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA; // En yeni üstte
    });
    
    return filtered;
  };

  const filteredTodaySales = filterAndSortSales(todaySales);
  const filteredPastSales = filterAndSortSales(pastSales);

  const renderSalesTable = (salesList, title) => (
    <div className="backdrop-blur-xl rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderWidth: '1px', borderStyle: 'solid' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {loading ? (
        <Loading className="py-20" />
      ) : (
        <table className="w-full">
        <thead className="border-b" style={{ backgroundColor: 'var(--table-header)', borderColor: 'var(--border-color)' }}>
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ürün</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Pax</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Telefon</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Pick-up</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Fiyat</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2D2F33]">
          {salesList.map((sale) => {
            const whatsappLink = getWhatsAppLink(sale.customer_contact);
            return (
              <tr 
                key={sale.id} 
                className={sale.status === 'cancelled' ? 'opacity-60 bg-red-500/5' : ''}
                style={{ backgroundColor: 'var(--bg-card)' }}
                onMouseEnter={(e) => {
                  if (sale.status !== 'cancelled') {
                    e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (sale.status !== 'cancelled') {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  }
                }}
              >
                <td className={`px-6 py-4 text-sm ${sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                  {sale.date ? formatDateStringDDMMYYYY(sale.date) : ''} {sale.time}
                </td>
                <td className={`px-6 py-4 text-sm ${sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                  {sale.product_name}
                </td>
                <td className={`px-6 py-4 text-sm ${sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                  {sale.customer_name}
                </td>
                <td className={`px-6 py-4 text-sm ${sale.status === 'cancelled' ? 'text-red-400/70 line-through' : ''}`}
                style={{ color: sale.status === 'cancelled' ? undefined : 'var(--text-secondary)' }}>
                  {sale.person_count || '-'}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {sale.customer_contact ? (
                    whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25D366] hover:text-[#20BA5A] hover:underline flex items-center gap-1"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        {sale.customer_contact}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{sale.customer_contact}</span>
                    )
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{sale.pickup_location || '-'}</td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{sale.cari_name}</td>
                <td className={`px-6 py-4 text-sm font-semibold ${sale.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                  {sale.sale_price} {sale.currency}
                </td>
                <td className="px-6 py-4 text-sm">
                  {sale.status === 'cancelled' ? (
                    <div className="space-y-1">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                        İptal Edildi
                      </span>
                      {sale.no_show_applied && (
                        <div className="text-xs text-orange-400 mt-1">
                          No-show: {sale.no_show_amount} {sale.no_show_currency}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                      Aktif
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="relative group">
                      <button
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Voucher İşlemleri"
                        data-testid={`voucher-menu-${sale.id}`}
                      >
                        <Receipt size={18} className="text-green-400" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-auto bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col">
                        <button
                          onClick={() => handleDownloadVoucher(sale.id, 'download')}
                          className="p-2 text-white hover:bg-[#3EA6FF]/20 flex items-center justify-center rounded-t-lg"
                          title="PDF İndir"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadVoucher(sale.id, 'print')}
                          className="p-2 text-white hover:bg-[#3EA6FF]/20 flex items-center justify-center rounded-b-lg"
                          title="Yazdır"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </div>
                    {sale.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setSelectedSaleForCancel(sale);
                          setCancelDialogOpen(true);
                        }}
                        className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                        title="İptal Et"
                      >
                        <XCircle size={18} className="text-orange-400" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(sale.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" data-testid={`delete-sale-${sale.id}`}>
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      {!loading && salesList.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: 'var(--text-secondary)' }}>Henüz satış bulunmamaktadır</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="extra-sales-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Açık Satışlar</h1>
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchSales(e.target.value);
            }}
            className="w-48 px-3 py-2 rounded-lg text-white focus:outline-none"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--accent)',
              borderWidth: '1px',
              borderStyle: 'solid',
              opacity: 0.3,
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.opacity = '1';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.opacity = '0.3';
            }}
          >
            <option value="all">Tümü</option>
            <option value="active">Aktif</option>
            <option value="cancelled">İptal Edilen</option>
          </select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="new-sale-btn" onClick={resetForm}>
              <Plus size={18} className="mr-2" />
              Yeni Satış
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl text-white max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Yeni Satış</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Ürün Adı"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
                data-testid="product-name"
              />
              <select
                value={formData.cari_id}
                onChange={(e) => {
                  const selectedCari = cariAccounts.find(c => c.id === e.target.value);
                  const isMunferit = selectedCari?.is_munferit || selectedCari?.name === "Münferit";
                  setFormData({ 
                    ...formData, 
                    cari_id: e.target.value,
                    // Münferit cari seçildiyse payment_type_id'yi kontrol et
                    payment_type_id: isMunferit ? (formData.payment_type_id || paymentTypes.find(pt => pt.code === 'cash')?.id || '') : ''
                  });
                }}
                className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              >
                <option value="">Cari Firma Seçin</option>
                <option value={cariAccounts.find(c => c.is_munferit || c.name === "Münferit")?.id || ''}>
                  Münferit
                </option>
                {cariAccounts.filter(c => !c.is_munferit && c.name !== "Münferit").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Müşteri Adı *"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg text-white focus:outline-none"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!formData.customer_name.trim()) {
                      toast.error('Önce müşteri adını girin');
                      return;
                    }
                    setCustomerDetailDialogOpen(true);
                  }}
                  className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                  title="Müşteri Detay Gir"
                >
                  <User size={18} />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Pax Sayısı"
                  value={formData.person_count}
                  onChange={(e) => setFormData({ ...formData, person_count: e.target.value ? parseInt(e.target.value) : '' })}
                  className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                  min="1"
                />
                <input
                  type="tel"
                  placeholder="Telefon Numarası"
                  value={formData.customer_contact}
                  onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                />
              </div>
              <input
                type="text"
                placeholder="Pick-up Yeri"
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  className="px-3 py-2 rounded-lg text-white focus:outline-none"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required 
                />
                <input 
                  type="time" 
                  value={formData.time} 
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })} 
                  className="px-3 py-2 rounded-lg text-white focus:outline-none"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Satış Fiyatı" 
                  value={formData.sale_price} 
                  onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })} 
                  className="px-3 py-2 rounded-lg text-white focus:outline-none"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required 
                />
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Alış Fiyatı" 
                  value={formData.purchase_price} 
                  onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })} 
                  className="px-3 py-2 rounded-lg text-white focus:outline-none"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <select 
                value={formData.currency} 
                onChange={(e) => setFormData({ ...formData, currency: e.target.value, exchange_rate: rates[e.target.value] })} 
                className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="TRY">TRY</option>
              </select>
              {/* Münferit cari seçildiyse ödeme tipi alanlarını göster */}
              {(cariAccounts.find(c => c.id === formData.cari_id)?.is_munferit || cariAccounts.find(c => c.id === formData.cari_id)?.name === "Münferit") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Ödeme Alma Tipi *</label>
                    <select
                      value={formData.payment_type_id}
                      onChange={(e) => setFormData({ ...formData, payment_type_id: e.target.value, bank_account_id: '' })}
                      className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                      required
                    >
                      <option value="">Seçiniz</option>
                      {paymentTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                  {paymentTypes.find(pt => pt.id === formData.payment_type_id)?.code === 'bank_transfer' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Havale Hesabı *</label>
                      <select
                        value={formData.bank_account_id}
                        onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {bankAccounts
                          .filter(acc => acc.account_type === 'bank_account' && acc.is_active && acc.currency === formData.currency)
                          .map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.bank_name} - {account.account_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full btn-primary" data-testid="submit-sale">Oluştur</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Arama Çubuğu */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Ürün, müşteri, cari, telefon, pick-up veya tarih ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-lg text-white focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--border-color)',
            borderWidth: '1px',
            borderStyle: 'solid',
            color: 'var(--text-primary)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Bugünkü Satışlar */}
      {renderSalesTable(filteredTodaySales, `Bugünkü Satışlar (${filteredTodaySales.length})`)}

      {/* Geçmiş Günlere Ait Satışlar */}
      {filteredPastSales.length > 0 && (
        <div className="mt-6">
          {renderSalesTable(filteredPastSales, `Geçmiş Günlere Ait Satışlar (${filteredPastSales.length})`)}
        </div>
      )}

      {/* İptal Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setSelectedSaleForCancel(null);
          resetCancelForm();
        }
      }}>
        <DialogContent 
          className="max-w-md"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Satışı İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Satış Bilgisi */}
            {selectedSaleForCancel && (
              <div 
                className="rounded-lg p-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Müşteri:</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedSaleForCancel.customer_name}</p>
                <p className="text-sm mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>Ürün:</p>
                <p style={{ color: 'var(--text-primary)' }}>{selectedSaleForCancel.product_name}</p>
                <p className="text-sm mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>Tarih:</p>
                <p style={{ color: 'var(--text-primary)' }}>{selectedSaleForCancel.date} {selectedSaleForCancel.time}</p>
                {selectedSaleForCancel.cari_name && (
                  <>
                    <p className="text-sm mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>Cari:</p>
                    <p style={{ color: 'var(--text-primary)' }}>{selectedSaleForCancel.cari_name}</p>
                  </>
                )}
              </div>
            )}
            
            {/* İptal Sebebi */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>İptal Sebebi *</label>
              <textarea
                value={cancelFormData.cancellation_reason}
                onChange={(e) => setCancelFormData({ ...cancelFormData, cancellation_reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                rows="3"
                placeholder="İptal sebebini açıklayın..."
                required
              />
            </div>
            
            {/* No-Show Uygula */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-color)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <input
                type="checkbox"
                id="apply_no_show_sale"
                checked={cancelFormData.apply_no_show}
                onChange={(e) => setCancelFormData({ ...cancelFormData, apply_no_show: e.target.checked })}
                className="w-4 h-4 rounded focus:ring-2"
                style={{
                  accentColor: 'var(--accent)',
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)'
                }}
              />
              <label htmlFor="apply_no_show_sale" className="cursor-pointer flex-1" style={{ color: 'var(--text-primary)' }}>
                No-show bedeli uygula
              </label>
            </div>
            
            {/* No-Show Detayları */}
            {cancelFormData.apply_no_show && (
              <div 
                className="space-y-3 pl-7 border-l-2"
                style={{ borderColor: 'var(--accent)' + '4D' }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Tutar *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cancelFormData.no_show_amount}
                      onChange={(e) => setCancelFormData({ ...cancelFormData, no_show_amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                      placeholder="0.00"
                      required={cancelFormData.apply_no_show}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Para Birimi *</label>
                    <select
                      value={cancelFormData.no_show_currency}
                      onChange={(e) => setCancelFormData({ 
                        ...cancelFormData, 
                        no_show_currency: e.target.value,
                        exchange_rate: rates[e.target.value] || 1.0
                      })}
                      className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                      required={cancelFormData.apply_no_show}
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-orange-400">
                  ⚠️ Bu tutar cari hesabına borç olarak eklenecektir.
                </p>
              </div>
            )}
            
            {/* Butonlar */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setSelectedSaleForCancel(null);
                  resetCancelForm();
                }}
                className="flex-1"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={handleCancelSale}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                İptal Et
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Müşteri Detay Dialog */}
      <CustomerDetailDialog
        open={customerDetailDialogOpen}
        onOpenChange={setCustomerDetailDialogOpen}
        customerName={formData.customer_name}
        initialData={formData.customer_details}
        onSave={(details) => {
          setFormData({ ...formData, customer_details: details });
          toast.success('Müşteri detayları kaydedildi');
        }}
      />
    </div>
  );
};

export default ExtraSales;