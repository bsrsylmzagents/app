import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Filter, Receipt, Printer, Download, Search, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { downloadVoucherPdf, printVoucherPdf } from '../utils/voucherPdf';
import { formatDateStringDDMMYYYY } from '../utils/dateFormatter';
import useConfirmDialog from '../hooks/useConfirmDialog';

const Reservations = () => {
  const { confirm, dialog } = useConfirmDialog();
  const [reservations, setReservations] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'completed', 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [cariDialogOpen, setCariDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservationForCancel, setSelectedReservationForCancel] = useState(null);
  const [cancelFormData, setCancelFormData] = useState({
    cancellation_reason: '',
    apply_no_show: false,
    no_show_amount: '',
    no_show_currency: 'EUR',
    exchange_rate: 1.0
  });
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [cariSearch, setCariSearch] = useState('');
  const [seasonalPrices, setSeasonalPrices] = useState([]);

  const [formData, setFormData] = useState({
    cari_id: '',
    date: '',
    time: '',
    tour_type_id: '',
    customer_name: '',
    person_count: 1,
    atv_count: 1,
    pickup_location: '',
    pickup_maps_link: '',
    price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    notes: ''
  });
  const [basePricePerAtv, setBasePricePerAtv] = useState(null); // 1 ATV için dönemsel fiyat
  const [seasonalPriceCurrency, setSeasonalPriceCurrency] = useState(null); // Dönemsel fiyat döviz tipi

  const [newCariData, setNewCariData] = useState({
    name: '',
    phone: '',
    pickup_location: ''
  });

  useEffect(() => {
    fetchReservations();
    fetchCariAccounts();
    fetchTourTypes();
    fetchRates();
    fetchSeasonalPrices();
  }, [filteredStatus, statusFilter]);

  useEffect(() => {
    fetchSeasonalPrices();
  }, []);

  // Dönemsel fiyat kontrolü - rezervasyon formunda cari, tur tipi ve tarih seçildiğinde
  useEffect(() => {
    const checkSeasonalPrice = async () => {
      if (formData.cari_id && formData.tour_type_id && formData.date && dialogOpen) {
        try {
          // Tarih aralığında ve tur tipine uygun dönemsel fiyat ara
          const matchingPrices = seasonalPrices.filter(price => {
            const priceStart = new Date(price.start_date);
            const priceEnd = new Date(price.end_date);
            const reservationDate = new Date(formData.date);
            
            return priceStart <= reservationDate && 
                   reservationDate <= priceEnd &&
                   price.tour_type_ids && price.tour_type_ids.includes(formData.tour_type_id);
          });

          // En uygun fiyatı bul
          for (const seasonalPrice of matchingPrices) {
            // Dönemsel fiyattan currency'yi direkt al, varsayılan EUR kullanma
            const seasonalCurrency = seasonalPrice.currency || formData.currency || 'EUR';
            const seasonalExchangeRate = rates[seasonalCurrency] || 1.0;
            
            // Cari ID'sine özel fiyat var mı?
            if (seasonalPrice.cari_prices && seasonalPrice.cari_prices[formData.cari_id]) {
              const pricePerAtv = seasonalPrice.cari_prices[formData.cari_id]; // 1 ATV için fiyat
              const totalPrice = pricePerAtv * formData.atv_count; // ATV sayısı ile çarp
              
              setBasePricePerAtv(pricePerAtv);
              setSeasonalPriceCurrency(seasonalCurrency);
              
              setFormData(prev => ({
                ...prev,
                price: totalPrice,
                currency: seasonalCurrency,
                exchange_rate: seasonalExchangeRate
              }));
              toast.success(`Dönemsel fiyat uygulandı: ${pricePerAtv} ${seasonalCurrency}/ATV x ${formData.atv_count} = ${totalPrice} ${seasonalCurrency}`);
              return;
            }
            // Yeni cariler için geçerli mi?
            else if (seasonalPrice.apply_to_new_caris) {
              const cari = cariAccounts.find(c => c.id === formData.cari_id);
              if (cari && cari.created_at) {
                const cariCreated = new Date(cari.created_at);
                const priceStart = new Date(seasonalPrice.start_date);
                const priceEnd = new Date(seasonalPrice.end_date);
                
                if (priceStart <= cariCreated && cariCreated <= priceEnd) {
                  // İlk bulunan fiyatı kullan
                  const prices = Object.values(seasonalPrice.cari_prices || {});
                  if (prices.length > 0) {
                    const pricePerAtv = prices[0]; // 1 ATV için fiyat
                    const totalPrice = pricePerAtv * formData.atv_count; // ATV sayısı ile çarp
                    
                    setBasePricePerAtv(pricePerAtv);
                    setSeasonalPriceCurrency(seasonalCurrency);
                    
                    setFormData(prev => ({
                      ...prev,
                      price: totalPrice,
                      currency: seasonalCurrency,
                      exchange_rate: seasonalExchangeRate
                    }));
                    toast.success(`Dönemsel fiyat uygulandı: ${pricePerAtv} ${seasonalCurrency}/ATV x ${formData.atv_count} = ${totalPrice} ${seasonalCurrency}`);
                    return;
                  }
                }
              }
            }
          }
          
          // Dönemsel fiyat bulunamadıysa base price'ı sıfırla
          if (matchingPrices.length === 0) {
            setBasePricePerAtv(null);
            setSeasonalPriceCurrency(null);
          }
        } catch (error) {
          console.error('Dönemsel fiyat kontrolü hatası:', error);
        }
      }
    };

    checkSeasonalPrice();
  }, [formData.cari_id, formData.tour_type_id, formData.date, dialogOpen, seasonalPrices, cariAccounts, rates]);

  // ATV sayısı değiştiğinde fiyatı güncelle (dönemsel fiyat varsa)
  useEffect(() => {
    if (basePricePerAtv !== null && dialogOpen) {
      const totalPrice = basePricePerAtv * formData.atv_count;
      const currency = seasonalPriceCurrency || formData.currency;
      const exchangeRate = rates[currency] || 1.0;
      
      setFormData(prev => ({
        ...prev,
        price: totalPrice,
        currency: currency,
        exchange_rate: exchangeRate
      }));
    }
  }, [formData.atv_count, basePricePerAtv, seasonalPriceCurrency, rates, dialogOpen]);

  const fetchReservations = async (status = null) => {
    try {
      const params = {};
      if (status || statusFilter !== 'all') {
        params.status = status || statusFilter;
      }
      if (filteredStatus) {
        params.status = filteredStatus;
      }
      const response = await axios.get(`${API}/reservations`, { params });
      setReservations(response.data);
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi');
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

  const fetchTourTypes = async () => {
    try {
      const response = await axios.get(`${API}/tour-types`);
      setTourTypes(response.data);
    } catch (error) {
      console.error('Tur tipleri yüklenemedi');
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

  const fetchSeasonalPrices = async () => {
    try {
      const response = await axios.get(`${API}/seasonal-prices`);
      setSeasonalPrices(response.data);
    } catch (error) {
      console.error('Dönemsel fiyatlar yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Status'u payload'dan çıkar (backend default "confirmed" kullanacak)
      const { status, ...payload } = formData;
      
      if (editingReservation) {
        await axios.put(`${API}/reservations/${editingReservation.id}`, payload);
        toast.success('Rezervasyon güncellendi');
      } else {
        await axios.post(`${API}/reservations`, payload);
        toast.success('Rezervasyon oluşturuldu');
      }
      setDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Rezervasyon kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Rezervasyonu Sil",
      message: "Bu rezervasyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/reservations/${id}`);
      toast.success('Rezervasyon silindi');
      fetchReservations();
    } catch (error) {
      toast.error('Rezervasyon silinemedi');
    }
  };

  const handleCancelReservation = async () => {
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
      
      await axios.put(`${API}/reservations/${selectedReservationForCancel.id}/cancel`, payload);
      toast.success(cancelFormData.apply_no_show ? 'Rezervasyon iptal edildi ve no-show bedeli uygulandı' : 'Rezervasyon iptal edildi');
      setCancelDialogOpen(false);
      setSelectedReservationForCancel(null);
      resetCancelForm();
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Rezervasyon iptal edilemedi');
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

  const handleDownloadVoucher = async (reservationId, action = 'download') => {
    try {
      toast.info('Voucher hazırlanıyor...');
      
      // Voucher oluştur veya mevcut voucher'ı getir
      const voucherResponse = await axios.post(`${API}/reservations/${reservationId}/voucher`);
      
      if (!voucherResponse.data) {
        throw new Error('Voucher yanıtı boş');
      }
      
      const { reservation, company } = voucherResponse.data;
      
      if (!reservation) {
        throw new Error('Rezervasyon bilgisi bulunamadı');
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
      
      // Varsayılan company bilgisi
      if (!companyData) {
        companyData = {
          company_name: 'Firma Adı',
          phone: '',
          address: '',
          email: '',
          website: ''
        };
      }
      
      // PDF oluştur ve indir veya yazdır
      if (action === 'print') {
        await printVoucherPdf(reservation, companyData);
        toast.success('Voucher yazdırılıyor...');
      } else {
        await downloadVoucherPdf(reservation, companyData);
        toast.success('Voucher indirildi');
      }
    } catch (error) {
      console.error('Voucher oluşturma hatası:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Voucher oluşturulamadı';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    
    // Cari firma adını bul ve input'a yaz
    const cari = cariAccounts.find(c => c.id === reservation.cari_id);
    setCariSearch(cari ? cari.name : '');
    
    setFormData({
      cari_id: reservation.cari_id,
      date: reservation.date,
      time: reservation.time,
      tour_type_id: reservation.tour_type_id || '',
      customer_name: reservation.customer_name,
      person_count: reservation.person_count,
      atv_count: reservation.atv_count,
      pickup_location: reservation.pickup_location || '',
      pickup_maps_link: reservation.pickup_maps_link || '',
      price: reservation.price,
      currency: reservation.currency,
      exchange_rate: reservation.exchange_rate,
      notes: reservation.notes || ''
    });
    // Düzenleme modunda base price'ı sıfırla (manuel fiyat girişi için)
    setBasePricePerAtv(null);
    setSeasonalPriceCurrency(null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      cari_id: '',
      date: '',
      time: '',
      tour_type_id: '',
      customer_name: '',
      person_count: 1,
      atv_count: 1,
      pickup_location: '',
      pickup_maps_link: '',
      price: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      notes: ''
    });
    setBasePricePerAtv(null);
    setSeasonalPriceCurrency(null);
    setCariSearch(''); // Cari arama input'unu da temizle
  };

  const handleCariSelect = (cariId) => {
    const cari = cariAccounts.find(c => c.id === cariId);
    if (cari) {
      // Seçilen firma adını input'a yaz
      setCariSearch(cari.name);
      
      // Form data'yı güncelle - pick-up yeri otomatik olarak default olarak güncellensin
      setFormData({
        ...formData,
        cari_id: cariId,
        // Pick-up yeri otomatik olarak cari'deki değerle güncellensin (varsa)
        pickup_location: cari.pickup_location || '',
        pickup_maps_link: cari.pickup_maps_link || ''
      });
    }
  };

  const handleQuickCreateCari = async () => {
    try {
      const response = await axios.post(`${API}/cari-accounts`, newCariData);
      toast.success('Cari hesap oluşturuldu');
      setCariDialogOpen(false);
      setNewCariData({ name: '', phone: '', pickup_location: '' });
      await fetchCariAccounts();
      
      // Yeni oluşturulan cari'yi seç ve form data'yı güncelle
      const newCariId = response.data.id;
      const newCari = response.data;
      
      // Cari adını input'a yaz
      setCariSearch(newCari.name);
      
      // Form data'yı güncelle - pick-up yeri otomatik olarak default olarak güncellensin
      setFormData({ 
        ...formData, 
        cari_id: newCariId,
        pickup_location: newCari.pickup_location || '',
        pickup_maps_link: newCari.pickup_maps_link || ''
      });
    } catch (error) {
      toast.error('Cari hesap oluşturulamadı');
    }
  };

  const filteredCariAccounts = cariAccounts.filter(c => 
    c.name.toLowerCase().includes(cariSearch.toLowerCase())
  );

  // Rezervasyonları sırala (en son olanlar üstte) ve filtrele
  const sortedAndFilteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Status filtresi
    if (filteredStatus) {
      filtered = filtered.filter(r => r.status === filteredStatus);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => {
        return (
          (reservation.customer_name || '').toLowerCase().includes(query) ||
          (reservation.cari_name || '').toLowerCase().includes(query) ||
          (reservation.tour_type_name || '').toLowerCase().includes(query) ||
          (reservation.date || '').includes(query) ||
          (reservation.time || '').includes(query) ||
          (reservation.voucher_code || '').toLowerCase().includes(query) ||
          (reservation.pickup_location || '').toLowerCase().includes(query) ||
          String(reservation.price || '').includes(query) ||
          (reservation.currency || '').toLowerCase().includes(query) ||
          String(reservation.atv_count || '').includes(query) ||
          String(reservation.person_count || '').includes(query)
        );
      });
    }

    // En son olanlar üstte olacak şekilde sırala
    // Önce date+time'a göre, sonra created_at'e göre
    filtered.sort((a, b) => {
      // Tarih ve saat birleştir
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}:00`);
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}:00`);
      
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
  }, [reservations, filteredStatus, searchQuery]);

  return (
    <div className="space-y-6" data-testid="reservations-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Rezervasyonlar</h1>
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchReservations(e.target.value);
            }}
            className="w-48 px-3 py-2 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
            data-testid="status-filter"
          >
            <option value="all">Tümü</option>
            <option value="confirmed">Onaylı</option>
            <option value="completed">Tamamlanan</option>
            <option value="cancelled">İptal Edilen</option>
          </select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-reservation-btn" onClick={() => { setEditingReservation(null); resetForm(); }}>
                <Plus size={18} className="mr-2" />
                Yeni Rezervasyon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Cari Firma</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Cari ara veya seçilen firma..."
                          value={cariSearch}
                          onChange={(e) => {
                            setCariSearch(e.target.value);
                            // Eğer input temizlenirse, cari_id'yi de temizle
                            if (e.target.value === '') {
                              setFormData({ ...formData, cari_id: '', pickup_location: '', pickup_maps_link: '' });
                            }
                          }}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                          data-testid="cari-search-input"
                        />
                        {formData.cari_id && cariSearch && (
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#3EA6FF] font-semibold">
                            ✓
                          </span>
                        )}
                      </div>
                      <Dialog open={cariDialogOpen} onOpenChange={setCariDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" className="bg-[#3EA6FF] hover:bg-[#2B8FE6]" data-testid="quick-create-cari-btn">
                            <Plus size={18} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white">
                          <DialogHeader>
                            <DialogTitle>Hızlı Cari Oluştur</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Firma Adı"
                              value={newCariData.name}
                              onChange={(e) => setNewCariData({ ...newCariData, name: e.target.value })}
                              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                              data-testid="new-cari-name"
                            />
                            <input
                              type="text"
                              placeholder="Telefon"
                              value={newCariData.phone}
                              onChange={(e) => setNewCariData({ ...newCariData, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            />
                            <input
                              type="text"
                              placeholder="Pick-up Yeri"
                              value={newCariData.pickup_location}
                              onChange={(e) => setNewCariData({ ...newCariData, pickup_location: e.target.value })}
                              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            />
                            <Button type="button" onClick={handleQuickCreateCari} className="w-full btn-primary" data-testid="create-cari-submit">
                              Oluştur
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {cariSearch.length >= 2 && (
                      <div className="mt-2 max-h-40 overflow-y-auto bg-[#2D2F33] border border-[#2D2F33] rounded-lg">
                        {filteredCariAccounts.map(cari => (
                          <div
                            key={cari.id}
                            onClick={() => { handleCariSelect(cari.id); }}
                            className="px-3 py-2 hover:bg-[#3EA6FF]/20 cursor-pointer text-sm"
                            data-testid={`cari-option-${cari.id}`}
                          >
                            {cari.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tarih</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                      data-testid="reservation-date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Saat</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                      data-testid="reservation-time"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Tur Tipi</label>
                    <select
                      value={formData.tour_type_id}
                      onChange={(e) => setFormData({ ...formData, tour_type_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    >
                      <option value="">Tur tipi seçin</option>
                      {tourTypes.map(tt => (
                        <option key={tt.id} value={tt.id}>{tt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Müşteri Adı</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                      data-testid="customer-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Kişi Sayısı</label>
                    <input
                      type="number"
                      value={formData.person_count}
                      onChange={(e) => setFormData({ ...formData, person_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">ATV Sayısı</label>
                    <input
                      type="number"
                      value={formData.atv_count}
                      onChange={(e) => {
                        const newAtvCount = parseInt(e.target.value) || 1;
                        // Dönemsel fiyat varsa, fiyatı anında hesapla
                        if (basePricePerAtv !== null) {
                          const totalPrice = basePricePerAtv * newAtvCount;
                          const currency = seasonalPriceCurrency || formData.currency;
                          const exchangeRate = rates[currency] || 1.0;
                          setFormData(prev => ({
                            ...prev,
                            atv_count: newAtvCount,
                            price: totalPrice,
                            currency: currency,
                            exchange_rate: exchangeRate
                          }));
                        } else {
                          setFormData({ ...formData, atv_count: newAtvCount });
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      min="1"
                      required
                      data-testid="atv-count"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Pick-up Yeri</label>
                    <input
                      type="text"
                      value={formData.pickup_location}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                      placeholder="Pick-up yeri otomatik doldurulur veya manuel girebilirsiniz"
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Google Maps Link</label>
                    <input
                      type="url"
                      value={formData.pickup_maps_link}
                      onChange={(e) => setFormData({ ...formData, pickup_maps_link: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Fiyat</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        // Manuel fiyat değişikliği yapılıyorsa, dönemsel fiyat bağlantısını kaldır
                        if (basePricePerAtv !== null) {
                          setBasePricePerAtv(null);
                          setSeasonalPriceCurrency(null);
                        }
                        setFormData({ ...formData, price: newPrice });
                      }}
                      disabled={basePricePerAtv !== null}
                      className={`w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF] ${
                        basePricePerAtv !== null ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      required
                      data-testid="reservation-price"
                    />
                    {basePricePerAtv !== null && (
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        Dönemsel fiyat: {basePricePerAtv} {seasonalPriceCurrency}/ATV × {formData.atv_count} = {formData.price} {formData.currency}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Döviz</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => {
                        const newCurrency = e.target.value;
                        // Dönemsel fiyat varsa ve kullanıcı manuel değiştiriyorsa, base price'ı sıfırla
                        if (basePricePerAtv !== null && newCurrency !== seasonalPriceCurrency) {
                          setBasePricePerAtv(null);
                          setSeasonalPriceCurrency(null);
                        }
                        setFormData({ 
                          ...formData, 
                          currency: newCurrency, 
                          exchange_rate: rates[newCurrency] || 1.0 
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                    </select>
                    {basePricePerAtv !== null && seasonalPriceCurrency && (
                      <p className="text-xs text-[#A5A5A5] mt-1">
                        Dönemsel fiyat: {seasonalPriceCurrency}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Notlar</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows="3"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full btn-primary" data-testid="submit-reservation">
                  {editingReservation ? 'Güncelle' : 'Oluştur'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Arama Çubuğu */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
        <input
          type="text"
          placeholder="Müşteri, cari, tur tipi, tarih, saat, voucher kodu, pick-up veya fiyat ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF] transition-colors"
        />
      </div>

      {/* Reservations Table */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih/Saat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">ATV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Fiyat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Voucher</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2F33]">
              {sortedAndFilteredReservations.map((reservation) => (
                <tr 
                  key={reservation.id} 
                  className={`hover:bg-[#2D2F33] ${reservation.status === 'cancelled' ? 'opacity-60 bg-red-500/5' : ''}`}
                  data-testid={`reservation-row-${reservation.id}`}
                >
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                    {reservation.date ? formatDateStringDDMMYYYY(reservation.date) : ''} {reservation.time}
                  </td>
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                    {reservation.customer_name}
                  </td>
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400/70 line-through' : 'text-[#A5A5A5]'}`}>
                    {reservation.cari_name}
                  </td>
                  <td className={`px-6 py-4 text-sm font-semibold ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-[#3EA6FF]'}`}>
                    {reservation.atv_count}
                  </td>
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                    {reservation.price} {reservation.currency}
                  </td>
                  <td className={`px-6 py-4 text-sm font-mono ${reservation.status === 'cancelled' ? 'text-red-400/70 line-through' : reservation.voucher_code ? 'text-[#3EA6FF] font-semibold' : 'text-[#A5A5A5]'}`}>
                    {reservation.voucher_code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {reservation.status === 'cancelled' ? (
                      <div className="space-y-1">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                          İptal Edildi
                        </span>
                        {reservation.no_show_applied && (
                          <div className="text-xs text-orange-400 mt-1">
                            No-show: {reservation.no_show_amount} {reservation.no_show_currency}
                          </div>
                        )}
                      </div>
                    ) : reservation.status === 'completed' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        Tamamlandı
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                        Onaylı
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative group">
                        <button
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Voucher İşlemleri"
                          data-testid={`voucher-menu-${reservation.id}`}
                        >
                          <Receipt size={18} className="text-green-400" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-auto bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col">
                          <button
                            onClick={() => handleDownloadVoucher(reservation.id, 'download')}
                            className="p-2 text-white hover:bg-[#3EA6FF]/20 flex items-center justify-center rounded-t-lg"
                            title="PDF İndir"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadVoucher(reservation.id, 'print')}
                            className="p-2 text-white hover:bg-[#3EA6FF]/20 flex items-center justify-center rounded-b-lg"
                            title="Yazdır"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(reservation)}
                        className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                        data-testid={`edit-reservation-${reservation.id}`}
                      >
                        <Edit size={18} className="text-[#3EA6FF]" />
                      </button>
                      {reservation.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setSelectedReservationForCancel(reservation);
                            setCancelDialogOpen(true);
                          }}
                          className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                          title="İptal Et"
                        >
                          <XCircle size={18} className="text-orange-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        data-testid={`delete-reservation-${reservation.id}`}
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedAndFilteredReservations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#A5A5A5]">
                {searchQuery || filteredStatus 
                  ? 'Arama kriterlerinize uygun rezervasyon bulunamadı' 
                  : 'Henüz rezervasyon bulunmamaktadır'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* İptal Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setSelectedReservationForCancel(null);
          resetCancelForm();
        }
      }}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Rezervasyonu İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Rezervasyon Bilgisi */}
            {selectedReservationForCancel && (
              <div className="bg-[#2D2F33] rounded-lg p-3">
                <p className="text-sm text-[#A5A5A5] mb-1">Müşteri:</p>
                <p className="text-white font-semibold">{selectedReservationForCancel.customer_name}</p>
                <p className="text-sm text-[#A5A5A5] mt-2 mb-1">Tarih/Saat:</p>
                <p className="text-white">{selectedReservationForCancel.date} {selectedReservationForCancel.time}</p>
                {selectedReservationForCancel.cari_name && (
                  <>
                    <p className="text-sm text-[#A5A5A5] mt-2 mb-1">Cari:</p>
                    <p className="text-white">{selectedReservationForCancel.cari_name}</p>
                  </>
                )}
              </div>
            )}
            
            {/* İptal Sebebi */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">İptal Sebebi *</label>
              <textarea
                value={cancelFormData.cancellation_reason}
                onChange={(e) => setCancelFormData({ ...cancelFormData, cancellation_reason: e.target.value })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                rows="3"
                placeholder="İptal sebebini açıklayın..."
                required
              />
            </div>
            
            {/* No-Show Uygula */}
            <div className="flex items-center gap-3 p-3 bg-[#2D2F33] rounded-lg">
              <input
                type="checkbox"
                id="apply_no_show"
                checked={cancelFormData.apply_no_show}
                onChange={(e) => setCancelFormData({ ...cancelFormData, apply_no_show: e.target.checked })}
                className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
              />
              <label htmlFor="apply_no_show" className="text-white cursor-pointer flex-1">
                No-show bedeli uygula
              </label>
            </div>
            
            {/* No-Show Detayları */}
            {cancelFormData.apply_no_show && (
              <div className="space-y-3 pl-7 border-l-2 border-[#3EA6FF]/30">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Tutar *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cancelFormData.no_show_amount}
                      onChange={(e) => setCancelFormData({ ...cancelFormData, no_show_amount: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="0.00"
                      required={cancelFormData.apply_no_show}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Para Birimi *</label>
                    <select
                      value={cancelFormData.no_show_currency}
                      onChange={(e) => setCancelFormData({ 
                        ...cancelFormData, 
                        no_show_currency: e.target.value,
                        exchange_rate: rates[e.target.value] || 1.0
                      })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
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
                  setSelectedReservationForCancel(null);
                  resetCancelForm();
                }}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={handleCancelReservation}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                İptal Et
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
};

export default Reservations;