import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Filter, Receipt, Printer, Download, Search, XCircle, User, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadVoucherPdf, printVoucherPdf } from '../utils/voucherPdf';
import { formatDate, formatDateStringDDMMYYYY } from '../utils/dateFormatter';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import useConfirmDialog from '../hooks/useConfirmDialog';
import CustomerDetailDialog from '../components/CustomerDetailDialog';
import { COUNTRIES } from '../components/CustomerDetailDialog';
import Loading from '../components/Loading';

const Reservations = () => {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();
  const [reservations, setReservations] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'completed', 'cancelled'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'unpaid' - Ödeme alınmadı filtresi
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false); // Tahsilat ekleme dialogu
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState(null); // Tahsilat eklenecek rezervasyon
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
    customer_first_name: '',
    customer_last_name: '',
    customer_contact: '',
    customer_details: null,
    person_count: 1,
    vehicle_count: 1,
    pickup_location: '',
    pickup_maps_link: '',
    price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    notes: ''
  });
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [lastCreatedReservation, setLastCreatedReservation] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    currency: 'EUR',
    payment_type: '',
    description: '',
    date: '',
    time: '',
    bank_account_id: '',
    transfer_to_cari_id: '',
    transfer_to_cari_search: '',
    due_date: '',
    check_number: '',
    bank_name: ''
  });
  const [customerDetails, setCustomerDetails] = useState({
    phone: '',
    email: '',
    nationality: '',
    id_number: '',
    birth_date: ''
  });
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [activeTab, setActiveTab] = useState('reservation');
  const [paymentAdded, setPaymentAdded] = useState(false); // Tahsilat eklendi mi?
  const [savedPaymentTransactionId, setSavedPaymentTransactionId] = useState(null); // Kaydedilen tahsilat transaction ID

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
    fetchPaymentTypes();
    fetchBankAccounts();
  }, [filteredStatus, statusFilter]);

  // Rezervasyon fiyatı değiştiğinde tahsilat detayları sekmesindeki amount'u güncelle
  useEffect(() => {
    if (formData.price > 0 && !paymentFormData.amount) {
      setPaymentFormData(prev => ({
        ...prev,
        amount: formData.price.toString(),
        currency: formData.currency
      }));
    }
  }, [formData.price, formData.currency]);

  useEffect(() => {
    fetchSeasonalPrices();
  }, []);

  const fetchReservations = async (status = null) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      setPaymentTypes(response.data);
    } catch (error) {
      console.error('Ödeme tipleri yüklenemedi');
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cash-accounts`);
      setBankAccounts(response.data);
    } catch (error) {
      console.error('Banka hesapları yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Status'u payload'dan çıkar (backend default "confirmed" kullanacak)
      const { status, customer_first_name, customer_last_name, ...payload } = formData;
      
      // Ad ve Soyad'ı birleştir
      const customer_name = `${customer_first_name || ''} ${customer_last_name || ''}`.trim();
      payload.customer_name = customer_name || 'Müşteri';
      
      payload.person_count = parseInt(payload.person_count) || 1;
      payload.vehicle_count = parseInt(payload.vehicle_count) || 1;
      payload.price = parseFloat(payload.price) || 0;
      payload.exchange_rate = parseFloat(payload.exchange_rate) || 1.0;
      
      const details = {};
      if (customerDetails.phone) details.phone = customerDetails.phone;
      if (customerDetails.email) details.email = customerDetails.email;
      if (customerDetails.nationality) details.nationality = customerDetails.nationality;
      if (customerDetails.id_number) details.id_number = customerDetails.id_number;
      if (customerDetails.birth_date) details.birth_date = customerDetails.birth_date;
      
      const hasDetails = Object.keys(details).length > 0;
      payload.customer_details = hasDetails ? details : null;
      
      // Type conversions - Backend expects specific types
      payload.person_count = parseInt(payload.person_count) || 1;
      payload.vehicle_count = parseInt(payload.vehicle_count) || 1;
      payload.price = parseFloat(payload.price) || 0;
      payload.exchange_rate = parseFloat(payload.exchange_rate) || 1.0;
      
      // Convert empty strings to null for optional fields
      if (payload.tour_type_id === '' || payload.tour_type_id === null) {
        payload.tour_type_id = null;
      }
      if (payload.customer_contact === '' || payload.customer_contact === null) {
        payload.customer_contact = null;
      }
      if (payload.pickup_location === '' || payload.pickup_location === null) {
        payload.pickup_location = null;
      }
      if (payload.pickup_maps_link === '' || payload.pickup_maps_link === null) {
        payload.pickup_maps_link = null;
      }
      if (payload.notes === '' || payload.notes === null) {
        payload.notes = null;
      }
      
      // Seçili cari'nin münferit olup olmadığını kontrol et
      const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
      const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
      
      if (editingReservation) {
        await axios.put(`${API}/reservations/${editingReservation.id}`, payload);
        toast.success('Rezervasyon güncellendi');
        setDialogOpen(false);
        setEditingReservation(null);
        resetForm();
        fetchReservations();
      } else {
        const response = await axios.post(`${API}/reservations`, payload);
        
        // Münferit ise ve tahsilat eklendiyse, transaction'ı rezervasyon ile ilişkilendir
        if (isMunferit && paymentAdded && savedPaymentTransactionId) {
          try {
            // Transaction'ı güncelle - reference_id ve reference_type ekle
            await axios.put(`${API}/transactions/${savedPaymentTransactionId}`, {
              reference_id: response.data.id,
              reference_type: 'reservation',
              description: paymentFormData.description || `Rezervasyon tahsilatı - ${payload.customer_name} - ${payload.date}`
            });
            toast.success('Rezervasyon oluşturuldu ve tahsilat ile ilişkilendirildi');
          } catch (error) {
            console.error('Tahsilat güncellenirken hata:', error);
            toast.success('Rezervasyon oluşturuldu');
            toast.warning('Tahsilat rezervasyon ile ilişkilendirilemedi');
          }
        } else if (isMunferit && !paymentAdded) {
          // Münferit ama tahsilat eklenmemiş - uyarı göster
          toast.success('Rezervasyon oluşturuldu');
          toast.warning('⚠️ Ödeme alınmadı - Tahsilat eklenmemiş rezervasyon');
        } else {
          toast.success('Rezervasyon oluşturuldu');
        }
        
        setDialogOpen(false);
        setEditingReservation(null);
        resetForm();
        fetchReservations();
        // Cari firma için tutar zaten backend'de cari hesabına yansıyor (transaction oluşturuluyor)
      }
    } catch (error) {
      // Handle 422 validation errors with detailed messages
      if (error.response?.status === 422) {
        const detail = error.response?.data?.detail;
        let errorMessage = 'Doğrulama hatası: ';
        
        if (Array.isArray(detail)) {
          // Pydantic validation errors format
          const messages = detail.map(err => {
            const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'bilinmeyen alan';
            const msg = err.msg || 'Geçersiz değer';
            return `${field}: ${msg}`;
          });
          errorMessage += messages.join(', ');
        } else if (typeof detail === 'string') {
          errorMessage += detail;
        } else if (typeof detail === 'object' && detail.msg) {
          errorMessage += detail.msg;
        } else {
          errorMessage += 'Form verileri geçersiz. Lütfen tüm alanları kontrol edin.';
        }
        
        toast.error(errorMessage);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        // Don't redirect on 422, but handle auth errors normally
        toast.error(error.response?.data?.detail || 'Yetkilendirme hatası');
      } else {
        toast.error(error.response?.data?.detail || 'Rezervasyon kaydedilemedi');
      }
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

  const handleAddPayment = async () => {
    try {
      const amount = parseFloat(paymentFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      if (!paymentFormData.payment_type) {
        toast.error('Ödeme tipi seçilmelidir');
        return;
      }

      if (paymentFormData.payment_type === 'bank_transfer' && !paymentFormData.bank_account_id) {
        toast.error('Havale için banka hesabı seçilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'credit_card' && !paymentFormData.bank_account_id) {
        toast.error('Kredi kartı için hesap seçilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'check_promissory' && !paymentFormData.due_date) {
        toast.error('Çek/Senet için vade tarihi girilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'transfer_to_cari' && !paymentFormData.transfer_to_cari_id) {
        toast.error('Cariye Aktar için cari hesap seçilmelidir');
        return;
      }

      const paymentType = paymentTypes.find(pt => pt.code === paymentFormData.payment_type);
      if (!paymentType) {
        toast.error('Geçersiz ödeme tipi');
        return;
      }

      // Münferit cari'yi bul
      const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
      const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
      
      if (!isMunferit) {
        toast.error('Tahsilat sadece Münferit rezervasyonlar için eklenebilir');
        return;
      }

      const munferitCari = cariAccounts.find(c => c.is_munferit || c.name === "Münferit");
      if (!munferitCari) {
        toast.error('Münferit cari hesabı bulunamadı');
        return;
      }

      const exchangeRate = rates[paymentFormData.currency] || 1.0;
      const customer_name = `${formData.customer_first_name || ''} ${formData.customer_last_name || ''}`.trim() || 'Müşteri';
      
      const transactionData = {
        cari_id: munferitCari.id,
        transaction_type: 'payment',
        amount: amount,
        currency: paymentFormData.currency,
        exchange_rate: exchangeRate,
        payment_type_id: paymentType.id,
        payment_type_name: paymentType.name,
        description: paymentFormData.description || `Rezervasyon tahsilatı - ${customer_name} - ${formData.date}`,
        // Rezervasyon henüz oluşturulmadığı için reference_id ve reference_type boş
        // reference_type'ı null bırakıyoruz ki sonra güncelleyebilelim
        date: paymentFormData.date,
        time: paymentFormData.time
      };

      if (paymentFormData.payment_type === 'bank_transfer' || paymentFormData.payment_type === 'credit_card') {
        transactionData.bank_account_id = paymentFormData.bank_account_id;
      }
      if (paymentFormData.payment_type === 'transfer_to_cari') {
        transactionData.transfer_to_cari_id = paymentFormData.transfer_to_cari_id;
      }
      if (paymentFormData.payment_type === 'check_promissory') {
        transactionData.due_date = paymentFormData.due_date;
        transactionData.check_number = paymentFormData.check_number || '';
        transactionData.bank_name = paymentFormData.bank_name || '';
      }

      const response = await axios.post(`${API}/transactions`, transactionData);
      setSavedPaymentTransactionId(response.data.id);
      setPaymentAdded(true);
      toast.success('Tahsilat başarıyla eklendi');
    } catch (error) {
      console.error('Tahsilat eklenirken hata:', error);
      toast.error('Tahsilat eklenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(paymentFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      if (!paymentFormData.payment_type) {
        toast.error('Ödeme tipi seçilmelidir');
        return;
      }

      if (paymentFormData.payment_type === 'bank_transfer' && !paymentFormData.bank_account_id) {
        toast.error('Havale için banka hesabı seçilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'credit_card' && !paymentFormData.bank_account_id) {
        toast.error('Kredi kartı için hesap seçilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'check_promissory' && !paymentFormData.due_date) {
        toast.error('Çek/Senet için vade tarihi girilmelidir');
        return;
      }
      if (paymentFormData.payment_type === 'transfer_to_cari' && !paymentFormData.transfer_to_cari_id) {
        toast.error('Cariye Aktar için cari hesap seçilmelidir');
        return;
      }

      const paymentType = paymentTypes.find(pt => pt.code === paymentFormData.payment_type);
      if (!paymentType) {
        toast.error('Geçersiz ödeme tipi');
        return;
      }

      const exchangeRate = rates[paymentFormData.currency] || 1.0;
      
      const transactionData = {
        cari_id: lastCreatedReservation.cari_id,
        transaction_type: 'payment',
        amount: amount,
        currency: paymentFormData.currency,
        exchange_rate: exchangeRate,
        payment_type_id: paymentType.id,
        payment_type_name: paymentType.name,
        description: paymentFormData.description || `Rezervasyon tahsilatı - ${lastCreatedReservation.customer_name} - ${lastCreatedReservation.date}`,
        reference_id: lastCreatedReservation.id,
        reference_type: 'reservation',
        date: paymentFormData.date,
        time: paymentFormData.time
      };

      if (paymentFormData.payment_type === 'bank_transfer' || paymentFormData.payment_type === 'credit_card') {
        transactionData.bank_account_id = paymentFormData.bank_account_id;
      }
      if (paymentFormData.payment_type === 'transfer_to_cari') {
        transactionData.transfer_to_cari_id = paymentFormData.transfer_to_cari_id;
      }
      if (paymentFormData.payment_type === 'check_promissory') {
        transactionData.due_date = paymentFormData.due_date;
        transactionData.check_number = paymentFormData.check_number || '';
        transactionData.bank_name = paymentFormData.bank_name || '';
      }

      await axios.post(`${API}/transactions`, transactionData);

      toast.success('Tahsilat başarıyla eklendi');
      setPaymentDialogOpen(false);
      setLastCreatedReservation(null);
      setPaymentFormData({
        amount: '',
        currency: 'EUR',
        payment_type: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        bank_account_id: '',
        transfer_to_cari_id: '',
        transfer_to_cari_search: '',
        due_date: '',
        check_number: '',
        bank_name: ''
      });
      setFilteredCariAccountsForPayment([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Tahsilat eklenemedi');
      console.error('Error adding payment:', error);
    }
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
    
    // Ad ve Soyad'ı ayır
    const customer_name = reservation.customer_name || '';
    const nameParts = customer_name.trim().split(/\s+/);
    const customer_first_name = nameParts[0] || '';
    const customer_last_name = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      cari_id: reservation.cari_id,
      date: reservation.date,
      time: reservation.time,
      tour_type_id: reservation.tour_type_id || '',
      customer_first_name: customer_first_name,
      customer_last_name: customer_last_name,
      customer_contact: reservation.customer_contact || '',
      customer_details: reservation.customer_details || null,
      person_count: reservation.person_count,
      vehicle_count: reservation.vehicle_count || reservation.atv_count, // Backward compatibility
      pickup_location: reservation.pickup_location || '',
      pickup_maps_link: reservation.pickup_maps_link || '',
      price: reservation.price,
      currency: reservation.currency,
      exchange_rate: reservation.exchange_rate,
      notes: reservation.notes || ''
    });
    
    // Müşteri detaylarını yükle
    const details = reservation.customer_details || {};
    setCustomerDetails({
      phone: details.phone || '',
      email: details.email || '',
      nationality: details.nationality || '',
      id_number: details.id_number || '',
      birth_date: details.birth_date || ''
    });
    
    // Tahsilat detaylarını yükle (rezervasyon fiyatından)
    const now = new Date();
    setPaymentFormData({
      amount: reservation.price?.toString() || '',
      currency: reservation.currency || 'EUR',
      payment_type: '',
      description: `Rezervasyon tahsilatı - ${customer_name} - ${reservation.date}`,
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
      bank_account_id: '',
      transfer_to_cari_id: '',
      transfer_to_cari_search: '',
      due_date: '',
      check_number: '',
      bank_name: ''
    });
    
    setActiveTab('reservation');
    setDialogOpen(true);
  };

  const resetForm = () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm');
    
    setFormData({
      cari_id: '',
      date: today, // Bugün otomatik
      time: currentTime, // Şu an otomatik
      tour_type_id: '',
      customer_first_name: '',
      customer_last_name: '',
      customer_contact: '',
      customer_details: null,
      person_count: 1,
      vehicle_count: 1,
      pickup_location: '',
      pickup_maps_link: '',
      price: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      notes: ''
    });
    setCustomerDetails({
      phone: '',
      email: '',
      nationality: '',
      id_number: '',
      birth_date: ''
    });
    setPaymentFormData({
      amount: '',
      currency: 'EUR',
      payment_type: '',
      description: '',
      date: today,
      time: currentTime,
      bank_account_id: '',
      transfer_to_cari_id: '',
      transfer_to_cari_search: '',
      due_date: '',
      check_number: '',
      bank_name: ''
    });
    setCariSearch('');
    setNationalityOpen(false);
    setNationalitySearch('');
    setActiveTab('reservation'); // İlk sekmeye dön
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

  const [filteredCariAccountsForPayment, setFilteredCariAccountsForPayment] = useState([]);

  useEffect(() => {
    if (paymentFormData.transfer_to_cari_search && paymentFormData.transfer_to_cari_search.length >= 2) {
      const munferitCari = cariAccounts.find(c => c.is_munferit || c.name === "Münferit");
      const filtered = cariAccounts.filter(c => 
        c.id !== (munferitCari?.id || '') && 
        c.name.toLowerCase().includes(paymentFormData.transfer_to_cari_search.toLowerCase())
      );
      setFilteredCariAccountsForPayment(filtered);
    } else {
      setFilteredCariAccountsForPayment([]);
    }
  }, [paymentFormData.transfer_to_cari_search, cariAccounts]);

  useEffect(() => {
    // Ödeme tipi değiştiğinde ilgili alanları sıfırla
    setPaymentFormData(prev => ({
      ...prev,
      bank_account_id: '',
      transfer_to_cari_id: '',
      transfer_to_cari_search: '',
      due_date: '',
      check_number: '',
      bank_name: ''
    }));
  }, [paymentFormData.payment_type]);

  // Rezervasyonları sırala (en son olanlar üstte) ve filtrele
  const sortedAndFilteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Status filtresi
    if (filteredStatus) {
      filtered = filtered.filter(r => r.status === filteredStatus);
    }

    // Ödeme alınmadı filtresi
    if (paymentFilter === 'unpaid') {
      filtered = filtered.filter(reservation => {
        const selectedCari = cariAccounts.find(c => c.id === reservation.cari_id);
        const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
        const hasPayment = reservation.has_payment !== false;
        return isMunferit && hasPayment === false && reservation.status !== 'cancelled';
      });
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
          String(reservation.vehicle_count || reservation.atv_count || '').includes(query) ||
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
  }, [reservations, filteredStatus, searchQuery, paymentFilter, cariAccounts]);

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
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-48 px-3 py-2 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
            data-testid="payment-filter"
          >
            <option value="all">Tüm Ödemeler</option>
            <option value="unpaid">Ödeme Alınmadı</option>
          </select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-reservation-btn" onClick={() => { setEditingReservation(null); resetForm(); }}>
                <Plus size={18} className="mr-2" />
                Yeni Rezervasyon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(() => {
                  const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
                  const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
                  const showPaymentTab = isMunferit;
                  
                  return (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className={`grid w-full ${showPaymentTab ? 'grid-cols-3' : 'grid-cols-2'} bg-[#2D2F33]`}>
                        <TabsTrigger value="reservation">Rezervasyon Detayları</TabsTrigger>
                        <TabsTrigger value="customer">Müşteri Detay</TabsTrigger>
                        {showPaymentTab && (
                          <TabsTrigger value="payment">Tahsilat Detayları</TabsTrigger>
                        )}
                      </TabsList>
                  
                  <TabsContent value="reservation" className="space-y-4 mt-4">
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
                    {/* Münferit seçeneği - Her zaman görünür */}
                    <div className="mt-2">
                      <div
                        onClick={() => {
                          const munferitCari = cariAccounts.find(c => c.is_munferit || c.name === "Münferit");
                          if (munferitCari) {
                            handleCariSelect(munferitCari.id);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${
                          formData.cari_id && (() => {
                            const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
                            return selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit")
                              ? 'bg-[#3EA6FF] text-white'
                              : 'bg-[#2D2F33] text-[#3EA6FF] hover:bg-[#3EA6FF]/20'
                          })()
                        }`}
                      >
                        Münferit
                      </div>
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
                    <label className="block text-sm font-medium mb-2">Araç Sayısı</label>
                    <input
                      type="number"
                      value={formData.vehicle_count}
                      onChange={(e) => {
                        const newVehicleCount = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, vehicle_count: newVehicleCount });
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
                        setFormData({ ...formData, price: newPrice });
                      }}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                      data-testid="reservation-price"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Döviz</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => {
                        const newCurrency = e.target.value;
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
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows="3"
                      placeholder="Açıklama (opsiyonel)"
                    />
                  </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          // Validasyon
                          if (!formData.cari_id) {
                            toast.error('Cari firma seçilmelidir');
                            return;
                          }
                          if (!formData.date) {
                            toast.error('Tarih seçilmelidir');
                            return;
                          }
                          if (!formData.time) {
                            toast.error('Saat seçilmelidir');
                            return;
                          }
                          setActiveTab('customer');
                        }}
                        className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                      >
                        Devam
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="customer" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Ad */}
                      <div>
                        <Label className="text-sm font-medium text-white">Ad</Label>
                        <Input
                          type="text"
                          value={formData.customer_first_name}
                          onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                          placeholder="Ad"
                          data-testid="customer-first-name"
                        />
                      </div>

                      {/* Soyad */}
                      <div>
                        <Label className="text-sm font-medium text-white">Soyad</Label>
                        <Input
                          type="text"
                          value={formData.customer_last_name}
                          onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                          placeholder="Soyad"
                          data-testid="customer-last-name"
                        />
                      </div>

                      {/* Telefon */}
                      <div>
                        <Label className="text-sm font-medium text-white">Telefon</Label>
                        <Input
                          type="tel"
                          value={customerDetails.phone}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                          placeholder="Telefon numarası"
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <Label className="text-sm font-medium text-white">Email</Label>
                        <Input
                          type="email"
                          value={customerDetails.email}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                          placeholder="Email adresi"
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                        />
                      </div>

                      {/* Uyruk - Searchable */}
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-white">Uyruk</Label>
                        <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={nationalityOpen}
                              className="w-full justify-between bg-[#2D2F33] border-[#2D2F33] text-white hover:bg-[#2D2F33] hover:text-white"
                            >
                              {customerDetails.nationality
                                ? (() => {
                                    // COUNTRIES listesinden bul (basit bir liste kullanıyoruz)
                                    const country = COUNTRIES.find((c) => c.code === customerDetails.nationality);
                                    return country ? country.name : customerDetails.nationality;
                                  })()
                                : "Uyruk seçin veya yazın..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-[#2D2F33] border-[#2D2F33]">
                            <Command className="bg-[#2D2F33]">
                              <CommandInput
                                placeholder="Uyruk ara..."
                                value={nationalitySearch}
                                onValueChange={setNationalitySearch}
                                className="text-white placeholder:text-[#A5A5A5]"
                              />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty className="text-[#A5A5A5] py-6 text-center text-sm">
                                  {nationalitySearch ? (
                                    <div>
                                      <div className="mb-2">Sonuç bulunamadı</div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setCustomerDetails({ ...customerDetails, nationality: nationalitySearch.toUpperCase() });
                                          setNationalityOpen(false);
                                          setNationalitySearch('');
                                        }}
                                        className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white border-0"
                                      >
                                        "{nationalitySearch.toUpperCase()}" olarak kaydet
                                      </Button>
                                    </div>
                                  ) : (
                                    'Uyruk bulunamadı'
                                  )}
                                </CommandEmpty>
                                <CommandGroup>
                                  {COUNTRIES
                                    .filter((country) =>
                                      country.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
                                      country.code.toLowerCase().includes(nationalitySearch.toLowerCase())
                                    )
                                    .map((country) => (
                                      <CommandItem
                                        key={country.code}
                                        value={country.code}
                                        onSelect={() => {
                                          setCustomerDetails({ ...customerDetails, nationality: country.code });
                                          setNationalityOpen(false);
                                          setNationalitySearch('');
                                        }}
                                        className="text-white hover:bg-[#3EA6FF]/20 cursor-pointer"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            customerDetails.nationality === country.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {country.name} ({country.code})
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* TC/Pasaport No */}
                      <div>
                        <Label className="text-sm font-medium text-white">TC/Pasaport No</Label>
                        <Input
                          type="text"
                          value={customerDetails.id_number}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, id_number: e.target.value })}
                          placeholder="TC veya Pasaport numarası"
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                        />
                      </div>

                      {/* Doğum Tarihi */}
                      <div>
                        <Label className="text-sm font-medium text-white">Doğum Tarihi</Label>
                        <Input
                          type="date"
                          value={customerDetails.birth_date}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, birth_date: e.target.value })}
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      {(() => {
                        const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
                        const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
                        
                        if (isMunferit) {
                          // Münferit seçiliyse Tahsilat sekmesine geç
                          return (
                            <Button
                              type="button"
                              onClick={() => {
                                setActiveTab('payment');
                              }}
                              className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                            >
                              Devam
                            </Button>
                          );
                        } else {
                          // Cari firma seçiliyse direkt rezervasyon oluştur
                          return (
                            <Button
                              type="submit"
                              className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                            >
                              Rezervasyon Oluştur
                            </Button>
                          );
                        }
                      })()}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="payment" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">Döviz *</label>
                        <select
                          value={paymentFormData.currency}
                          onChange={(e) => {
                            const selectedCurrency = e.target.value;
                            setPaymentFormData({
                              ...paymentFormData,
                              currency: selectedCurrency
                            });
                          }}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          required
                        >
                          <option value="TRY">TRY - Türk Lirası</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - Dolar</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Tutar ({paymentFormData.currency}) {!paymentAdded && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentFormData.amount}
                          onChange={(e) => setPaymentFormData({
                            ...paymentFormData,
                            amount: e.target.value
                          })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          placeholder="0.00"
                          required={!paymentAdded}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Tarih {!paymentAdded && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="date"
                          value={paymentFormData.date}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          required={!paymentAdded}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Saat {!paymentAdded && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="time"
                          value={paymentFormData.time}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, time: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          required={!paymentAdded}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2 text-white">
                          Ödeme Tipi {!paymentAdded && <span className="text-red-400">*</span>}
                        </label>
                        <select
                          value={paymentFormData.payment_type}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_type: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          required={!paymentAdded}
                        >
                          <option value="">Seçiniz</option>
                          {paymentTypes
                            .filter(pt => pt.is_active && ['cash', 'bank_transfer', 'credit_card', 'check_promissory', 'transfer_to_cari', 'write_off'].includes(pt.code))
                            .map((type) => (
                              <option key={type.id} value={type.code}>{type.name}</option>
                            ))}
                        </select>
                      </div>

                      {paymentFormData.payment_type === 'bank_transfer' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2 text-white">
                            Havale Hesabı {!paymentAdded && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            value={paymentFormData.bank_account_id}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required={!paymentAdded}
                          >
                            <option value="">Seçiniz</option>
                            {bankAccounts
                              .filter(acc => acc.account_type === 'bank_account' && acc.is_active && acc.currency === paymentFormData.currency)
                              .map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.bank_name} - {account.account_name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {paymentFormData.payment_type === 'credit_card' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2 text-white">
                            Kredi Kartı Hesabı {!paymentAdded && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            value={paymentFormData.bank_account_id}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required={!paymentAdded}
                          >
                            <option value="">Seçiniz</option>
                            {bankAccounts
                              .filter(acc => acc.account_type === 'credit_card' && acc.is_active && acc.currency === paymentFormData.currency)
                              .map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.bank_name} - {account.account_name}
                                  {account.commission_rate ? ` (Komisyon: %${account.commission_rate})` : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {paymentFormData.payment_type === 'check_promissory' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2 text-white">
                            Vade Tarihi {!paymentAdded && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="date"
                            value={paymentFormData.due_date}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, due_date: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required={!paymentAdded}
                          />
                        </div>
                      )}

                      {paymentFormData.payment_type === 'transfer_to_cari' && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2 text-white">
                            Hedef Cari Hesap Ara {!paymentAdded && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="text"
                            value={paymentFormData.transfer_to_cari_search}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, transfer_to_cari_search: e.target.value, transfer_to_cari_id: '' })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            placeholder="En az 2 karakter giriniz"
                            required={!paymentAdded}
                          />
                          {filteredCariAccountsForPayment.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto bg-[#2D2F33] rounded-lg border border-[#3EA6FF]/30">
                              {filteredCariAccountsForPayment.map((cari) => (
                                <div
                                  key={cari.id}
                                  onClick={() => {
                                    setPaymentFormData({
                                      ...paymentFormData,
                                      transfer_to_cari_id: cari.id,
                                      transfer_to_cari_search: cari.name
                                    });
                                    setFilteredCariAccountsForPayment([]);
                                  }}
                                  className="px-3 py-2 hover:bg-[#3EA6FF]/20 cursor-pointer text-white"
                                >
                                  {cari.name} - Bakiye: {
                                    paymentFormData.currency === 'EUR' 
                                      ? (cari.balance_eur || 0).toFixed(2)
                                      : paymentFormData.currency === 'USD'
                                      ? (cari.balance_usd || 0).toFixed(2)
                                      : (cari.balance_try || 0).toFixed(2)
                                  } {paymentFormData.currency}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
                        <textarea
                          value={paymentFormData.description}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          rows="3"
                          placeholder="Açıklama (opsiyonel)"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {!paymentAdded && (
                        <Button
                          type="button"
                          onClick={handleAddPayment}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          Tahsilat Ekle
                        </Button>
                      )}
                      {paymentAdded && (
                        <div className="flex items-center gap-2 text-green-400 text-sm font-semibold mr-auto">
                          ✓ Tahsilat eklendi
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={(e) => {
                          // Form validasyonunu atla ve direkt submit et
                          e.preventDefault();
                          handleSubmit(e);
                        }}
                        className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                        data-testid="submit-reservation"
                      >
                        Rezervasyon Oluştur
                      </Button>
                    </div>
                  </TabsContent>
                    </Tabs>
                  );
                })()}
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
        {loading ? (
          <Loading className="py-20" />
        ) : (
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tahsilat</th>
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
                    {reservation.date ? formatDate(reservation.date) : ''} {reservation.time}
                  </td>
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-white'}`}>
                    {reservation.customer_name}
                  </td>
                  <td className={`px-6 py-4 text-sm ${reservation.status === 'cancelled' ? 'text-red-400/70 line-through' : 'text-[#A5A5A5]'}`}>
                    {reservation.cari_name}
                  </td>
                  <td className={`px-6 py-4 text-sm font-semibold ${reservation.status === 'cancelled' ? 'text-red-400 line-through' : 'text-[#3EA6FF]'}`}>
                    {reservation.vehicle_count || reservation.atv_count}
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
                      <div className="space-y-1">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                          Onaylı
                        </span>
                        {(() => {
                          // Münferit rezervasyon için ödeme kontrolü
                          const selectedCari = cariAccounts.find(c => c.id === reservation.cari_id);
                          const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
                          const hasPayment = reservation.has_payment !== false; // Backend'den geliyor
                          
                          if (isMunferit && hasPayment === false && reservation.status !== 'cancelled') {
                            return (
                              <div className="text-xs text-orange-400 mt-1 font-semibold">
                                ⚠️ Ödeme alınmadı
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      // Cari firma veya Münferit kontrolü
                      const selectedCari = cariAccounts.find(c => c.id === reservation.cari_id);
                      const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
                      const hasPayment = reservation.has_payment !== false;
                      
                      if (!isMunferit) {
                        // Cari firmaya gitmişse
                        return (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            Cari
                          </span>
                        );
                      } else {
                        // Münferit ise
                        if (hasPayment) {
                          return (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                              Alındı
                            </span>
                          );
                        } else {
                          // Alınmadı - tıklanabilir
                          return (
                            <button
                              onClick={() => {
                                setSelectedReservationForPayment(reservation);
                                // Tahsilat formunu rezervasyon bilgileriyle doldur
                                const now = new Date();
                                setPaymentFormData({
                                  amount: reservation.price?.toString() || '',
                                  currency: reservation.currency || 'EUR',
                                  payment_type: '',
                                  description: `Rezervasyon tahsilatı - ${reservation.customer_name} - ${reservation.date}`,
                                  date: format(now, 'yyyy-MM-dd'),
                                  time: format(now, 'HH:mm'),
                                  bank_account_id: '',
                                  transfer_to_cari_id: '',
                                  transfer_to_cari_search: '',
                                  due_date: '',
                                  check_number: '',
                                  bank_name: ''
                                });
                                setAddPaymentDialogOpen(true);
                              }}
                              className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium hover:bg-orange-500/30 cursor-pointer transition-colors"
                              title="Tahsilat eklemek için tıklayın"
                            >
                              Alınmadı
                            </button>
                          );
                        }
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(() => {
                        // Münferit rezervasyon için ödeme kontrolü
                        const selectedCari = cariAccounts.find(c => c.id === reservation.cari_id);
                        const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
                        const hasPayment = reservation.has_payment !== false;
                        
                        // Ödeme alınmamış Münferit rezervasyonlar için "Tahsilat Ekle" butonu
                        if (isMunferit && hasPayment === false && reservation.status !== 'cancelled') {
                          return (
                            <button
                              onClick={() => {
                                setSelectedReservationForPayment(reservation);
                                // Tahsilat formunu rezervasyon bilgileriyle doldur
                                const now = new Date();
                                setPaymentFormData({
                                  amount: reservation.price?.toString() || '',
                                  currency: reservation.currency || 'EUR',
                                  payment_type: '',
                                  description: `Rezervasyon tahsilatı - ${reservation.customer_name} - ${reservation.date}`,
                                  date: format(now, 'yyyy-MM-dd'),
                                  time: format(now, 'HH:mm'),
                                  bank_account_id: '',
                                  transfer_to_cari_id: '',
                                  transfer_to_cari_search: '',
                                  due_date: '',
                                  check_number: '',
                                  bank_name: ''
                                });
                                setAddPaymentDialogOpen(true);
                              }}
                              className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                              title="Tahsilat Ekle"
                              data-testid={`add-payment-${reservation.id}`}
                            >
                              <DollarSign size={18} className="text-yellow-400" />
                            </button>
                          );
                        }
                        return null;
                      })()}
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
        )}
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
      
      {/* Tahsilat Ekleme Dialog */}
      <Dialog open={addPaymentDialogOpen} onOpenChange={(open) => {
        setAddPaymentDialogOpen(open);
        if (!open) {
          setSelectedReservationForPayment(null);
          setPaymentFormData({
            amount: '',
            currency: 'EUR',
            payment_type: '',
            description: '',
            date: '',
            time: '',
            bank_account_id: '',
            transfer_to_cari_id: '',
            transfer_to_cari_search: '',
            due_date: '',
            check_number: '',
            bank_name: ''
          });
        }
      }}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tahsilat Ekle</DialogTitle>
          </DialogHeader>
          {selectedReservationForPayment && (
            <div className="space-y-4 mt-4">
              {/* Rezervasyon Bilgisi */}
              <div className="bg-[#2D2F33] rounded-lg p-3">
                <p className="text-sm text-[#A5A5A5] mb-1">Müşteri:</p>
                <p className="text-white font-semibold">{selectedReservationForPayment.customer_name}</p>
                <p className="text-sm text-[#A5A5A5] mt-2 mb-1">Tarih/Saat:</p>
                <p className="text-white">{selectedReservationForPayment.date} {selectedReservationForPayment.time}</p>
                <p className="text-sm text-[#A5A5A5] mt-2 mb-1">Tutar:</p>
                <p className="text-white font-semibold">{selectedReservationForPayment.price} {selectedReservationForPayment.currency}</p>
              </div>
              
              {/* Tahsilat Formu */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Döviz *</label>
                  <select
                    value={paymentFormData.currency}
                    onChange={(e) => {
                      const selectedCurrency = e.target.value;
                      setPaymentFormData({
                        ...paymentFormData,
                        currency: selectedCurrency
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="TRY">TRY - Türk Lirası</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dolar</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Tutar ({paymentFormData.currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Tarih *</label>
                  <input
                    type="date"
                    value={paymentFormData.date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Saat *</label>
                  <input
                    type="time"
                    value={paymentFormData.time}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-white">Ödeme Tipi *</label>
                  <select
                    value={paymentFormData.payment_type}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {paymentTypes
                      .filter(pt => pt.is_active && ['cash', 'bank_transfer', 'credit_card', 'check_promissory', 'transfer_to_cari', 'write_off'].includes(pt.code))
                      .map((type) => (
                        <option key={type.id} value={type.code}>{type.name}</option>
                      ))}
                  </select>
                </div>

                {paymentFormData.payment_type === 'bank_transfer' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">Havale Hesabı *</label>
                    <select
                      value={paymentFormData.bank_account_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    >
                      <option value="">Seçiniz</option>
                      {bankAccounts
                        .filter(acc => acc.account_type === 'bank_account' && acc.is_active && acc.currency === paymentFormData.currency)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.bank_name} - {account.account_name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {paymentFormData.payment_type === 'credit_card' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">Kredi Kartı Hesabı *</label>
                    <select
                      value={paymentFormData.bank_account_id}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    >
                      <option value="">Seçiniz</option>
                      {bankAccounts
                        .filter(acc => acc.account_type === 'credit_card' && acc.is_active && acc.currency === paymentFormData.currency)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.bank_name} - {account.account_name}
                            {account.commission_rate ? ` (Komisyon: %${account.commission_rate})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {paymentFormData.payment_type === 'check_promissory' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">Vade Tarihi *</label>
                    <input
                      type="date"
                      value={paymentFormData.due_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                )}

                {paymentFormData.payment_type === 'transfer_to_cari' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 text-white">Hedef Cari Hesap Ara *</label>
                    <input
                      type="text"
                      value={paymentFormData.transfer_to_cari_search}
                      onChange={(e) => {
                        const search = e.target.value;
                        setPaymentFormData({ ...paymentFormData, transfer_to_cari_search: search, transfer_to_cari_id: '' });
                        if (search.length >= 2) {
                          const filtered = cariAccounts.filter(c => 
                            c.name.toLowerCase().includes(search.toLowerCase()) && 
                            c.id !== selectedReservationForPayment.cari_id
                          );
                          setFilteredCariAccountsForPayment(filtered);
                        } else {
                          setFilteredCariAccountsForPayment([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="En az 2 karakter giriniz"
                      required
                    />
                    {filteredCariAccountsForPayment.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto bg-[#2D2F33] rounded-lg border border-[#3EA6FF]/30">
                        {filteredCariAccountsForPayment.map((cari) => (
                          <div
                            key={cari.id}
                            onClick={() => {
                              setPaymentFormData({
                                ...paymentFormData,
                                transfer_to_cari_id: cari.id,
                                transfer_to_cari_search: cari.name
                              });
                              setFilteredCariAccountsForPayment([]);
                            }}
                            className="px-3 py-2 hover:bg-[#3EA6FF]/20 cursor-pointer text-white"
                          >
                            {cari.name} - Bakiye: {
                              paymentFormData.currency === 'EUR' 
                                ? (cari.balance_eur || 0).toFixed(2)
                                : paymentFormData.currency === 'USD'
                                ? (cari.balance_usd || 0).toFixed(2)
                                : (cari.balance_try || 0).toFixed(2)
                            } {paymentFormData.currency}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
                  <textarea
                    value={paymentFormData.description}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    rows="3"
                    placeholder="Açıklama (opsiyonel)"
                  />
                </div>
              </div>
              
              {/* Butonlar */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddPaymentDialogOpen(false);
                    setSelectedReservationForPayment(null);
                  }}
                  className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                >
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const amount = parseFloat(paymentFormData.amount);
                      if (isNaN(amount) || amount <= 0) {
                        toast.error('Geçerli bir tutar giriniz');
                        return;
                      }

                      if (!paymentFormData.payment_type) {
                        toast.error('Ödeme tipi seçilmelidir');
                        return;
                      }

                      if (paymentFormData.payment_type === 'bank_transfer' && !paymentFormData.bank_account_id) {
                        toast.error('Havale için banka hesabı seçilmelidir');
                        return;
                      }
                      if (paymentFormData.payment_type === 'credit_card' && !paymentFormData.bank_account_id) {
                        toast.error('Kredi kartı için hesap seçilmelidir');
                        return;
                      }
                      if (paymentFormData.payment_type === 'check_promissory' && !paymentFormData.due_date) {
                        toast.error('Çek/Senet için vade tarihi girilmelidir');
                        return;
                      }
                      if (paymentFormData.payment_type === 'transfer_to_cari' && !paymentFormData.transfer_to_cari_id) {
                        toast.error('Cariye Aktar için cari hesap seçilmelidir');
                        return;
                      }

                      const paymentType = paymentTypes.find(pt => pt.code === paymentFormData.payment_type);
                      if (!paymentType) {
                        toast.error('Geçersiz ödeme tipi');
                        return;
                      }

                      const munferitCari = cariAccounts.find(c => c.is_munferit || c.name === "Münferit");
                      if (!munferitCari) {
                        toast.error('Münferit cari hesabı bulunamadı');
                        return;
                      }

                      const exchangeRate = rates[paymentFormData.currency] || 1.0;
                      
                      const transactionData = {
                        cari_id: munferitCari.id,
                        transaction_type: 'payment',
                        amount: amount,
                        currency: paymentFormData.currency,
                        exchange_rate: exchangeRate,
                        payment_type_id: paymentType.id,
                        payment_type_name: paymentType.name,
                        description: paymentFormData.description || `Rezervasyon tahsilatı - ${selectedReservationForPayment.customer_name} - ${selectedReservationForPayment.date}`,
                        reference_id: selectedReservationForPayment.id,
                        reference_type: 'reservation',
                        date: paymentFormData.date,
                        time: paymentFormData.time
                      };

                      if (paymentFormData.payment_type === 'bank_transfer' || paymentFormData.payment_type === 'credit_card') {
                        transactionData.bank_account_id = paymentFormData.bank_account_id;
                      }
                      if (paymentFormData.payment_type === 'transfer_to_cari') {
                        transactionData.transfer_to_cari_id = paymentFormData.transfer_to_cari_id;
                      }
                      if (paymentFormData.payment_type === 'check_promissory') {
                        transactionData.due_date = paymentFormData.due_date;
                        transactionData.check_number = paymentFormData.check_number || '';
                        transactionData.bank_name = paymentFormData.bank_name || '';
                      }

                      await axios.post(`${API}/transactions`, transactionData);
                      toast.success('Tahsilat başarıyla eklendi');
                      setAddPaymentDialogOpen(false);
                      setSelectedReservationForPayment(null);
                      fetchReservations();
                    } catch (error) {
                      console.error('Tahsilat eklenirken hata:', error);
                      toast.error('Tahsilat eklenemedi: ' + (error.response?.data?.detail || error.message));
                    }
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Tahsilat Ekle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Müşteri Detay Dialog */}
      <CustomerDetailDialog
        open={customerDetailDialogOpen}
        onOpenChange={setCustomerDetailDialogOpen}
        customerName={`${formData.customer_first_name || ''} ${formData.customer_last_name || ''}`.trim()}
        initialData={formData.customer_details}
        onSave={(details) => {
          setFormData({ ...formData, customer_details: details });
          toast.success('Müşteri detayları kaydedildi');
        }}
      />

      {/* Tahsilat Ekle Dialog (Münferit için) */}
      {lastCreatedReservation && (
        <Dialog 
          open={paymentDialogOpen} 
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) {
              setLastCreatedReservation(null);
              setPaymentFormData({
                amount: '',
                currency: 'EUR',
                payment_type: '',
                description: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: format(new Date(), 'HH:mm'),
                bank_account_id: '',
                transfer_to_cari_id: '',
                transfer_to_cari_search: '',
                due_date: '',
                check_number: '',
                bank_name: ''
              });
              setFilteredCariAccountsForPayment([]);
            }
          }}
        >
          <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Tahsilat Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Para Birimi *</label>
                <select
                  value={paymentFormData.currency}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  required
                >
                  <option value="TRY">TRY - Türk Lirası</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dolar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Tutar ({paymentFormData.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Tarih *</label>
                  <input
                    type="date"
                    value={paymentFormData.date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Saat *</label>
                  <input
                    type="time"
                    value={paymentFormData.time}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Ödeme Tipi *</label>
                <select
                  value={paymentFormData.payment_type}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  required
                >
                  <option value="">Seçiniz</option>
                  {paymentTypes
                    .filter(pt => pt.is_active && ['cash', 'bank_transfer', 'credit_card', 'check_promissory', 'transfer_to_cari', 'write_off'].includes(pt.code))
                    .map((type) => (
                      <option key={type.id} value={type.code}>{type.name}</option>
                    ))}
                </select>
              </div>

              {paymentFormData.payment_type === 'bank_transfer' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Havale Hesabı *</label>
                  <select
                    value={paymentFormData.bank_account_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {bankAccounts
                      .filter(acc => acc.account_type === 'bank_account' && acc.is_active && acc.currency === paymentFormData.currency)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {paymentFormData.payment_type === 'credit_card' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Kredi Kartı Hesabı *</label>
                  <select
                    value={paymentFormData.bank_account_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {bankAccounts
                      .filter(acc => acc.account_type === 'credit_card' && acc.is_active && acc.currency === paymentFormData.currency)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_name}
                          {account.commission_rate ? ` (Komisyon: %${account.commission_rate})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {paymentFormData.payment_type === 'check_promissory' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Vade Tarihi *</label>
                  <input
                    type="date"
                    value={paymentFormData.due_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
              )}

              {paymentFormData.payment_type === 'transfer_to_cari' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Cari Hesap Ara *</label>
                  <input
                    type="text"
                    value={paymentFormData.transfer_to_cari_search}
                    onChange={(e) => setPaymentFormData({ 
                      ...paymentFormData, 
                      transfer_to_cari_search: e.target.value,
                      transfer_to_cari_id: ''
                    })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="En az 2 harf yazın..."
                    required
                  />
                  {filteredCariAccountsForPayment.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-[#2D2F33] rounded-lg bg-[#1E1E1E]">
                      {filteredCariAccountsForPayment.map((cari) => (
                        <div
                          key={cari.id}
                          onClick={() => {
                            setPaymentFormData({
                              ...paymentFormData,
                              transfer_to_cari_id: cari.id,
                              transfer_to_cari_search: cari.name
                            });
                            setFilteredCariAccountsForPayment([]);
                          }}
                          className="px-3 py-2 hover:bg-[#2D2F33] cursor-pointer text-white text-sm"
                        >
                          {cari.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
                <textarea
                  value={paymentFormData.description}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  rows="3"
                  placeholder="Opsiyonel"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setLastCreatedReservation(null);
                    setPaymentFormData({
                      amount: '',
                      currency: 'EUR',
                      payment_type: '',
                      description: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      time: format(new Date(), 'HH:mm'),
                      bank_account_id: '',
                      transfer_to_cari_id: '',
                      transfer_to_cari_search: '',
                      due_date: '',
                      check_number: '',
                      bank_name: ''
                    });
                    setFilteredCariAccountsForPayment([]);
                  }}
                  className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Tahsilat Ekle
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Reservations;