import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Edit, Trash2, Search, CheckSquare, Square, Receipt, Printer, Download, Filter, Grid3x3, List, CalendarDays, Copy, FileSpreadsheet, FileText, Clock, TrendingUp, Users, DollarSign, AlertCircle, X, CheckCircle, MoreVertical, Calendar as CalendarIcon2, BarChart3, RefreshCw, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, isSameDay, parseISO, startOfToday, isAfter, isBefore, addWeeks, subWeeks, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
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
import CustomerDetailDialog from '../components/CustomerDetailDialog';
import { COUNTRIES } from '../components/CustomerDetailDialog';

// Custom hook for mobile detection
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

const Calendar = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Ensure selectedDate is set when switching to mobile view
  useEffect(() => {
    if (isMobile && !selectedDate) {
      setSelectedDate(new Date());
    }
  }, [isMobile]);
  
  // Rezervasyon formu için state'ler
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [reservationDate, setReservationDate] = useState(null);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [cariSearch, setCariSearch] = useState('');
  const [cariDialogOpen, setCariDialogOpen] = useState(false);
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
  const [paymentAdded, setPaymentAdded] = useState(false);
  const [savedPaymentTransactionId, setSavedPaymentTransactionId] = useState(null);
  const [newCariData, setNewCariData] = useState({
    name: '',
    phone: '',
    pickup_location: ''
  });
  const [filteredCariAccountsForPayment, setFilteredCariAccountsForPayment] = useState([]);

  // Dönemsel Fiyat için state'ler
  const [seasonalPrices, setSeasonalPrices] = useState([]);
  const [seasonalPriceForm, setSeasonalPriceForm] = useState({
    start_date: '',
    end_date: '',
    currency: 'EUR',
    tour_type_ids: [],
    cari_prices: {},
    apply_to_new_caris: false
  });
  const [selectedCaris, setSelectedCaris] = useState([]);
  const [cariSearchFilter, setCariSearchFilter] = useState('');
  const [editingSeasonalPrice, setEditingSeasonalPrice] = useState(null);

  // Yeni özellikler için state'ler
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'quarter', 'year'
  const [filters, setFilters] = useState({
    search: ''
  });
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [editingReservation, setEditingReservation] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [copyReservation, setCopyReservation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchStatistics();
    fetchUpcomingReservations();
  }, [currentMonth, filters]);

  useEffect(() => {
    fetchCariAccounts();
    fetchTourTypes();
    fetchRates();
    fetchSeasonalPrices();
    fetchPaymentTypes();
    fetchBankAccounts();
  }, []);

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

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (viewMode === 'month') {
          setCurrentMonth(subMonths(currentMonth, 1));
        } else if (viewMode === 'week') {
          setCurrentMonth(subWeeks(currentMonth, 1));
        } else {
          setCurrentMonth(addDays(currentMonth, -1));
        }
      } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (viewMode === 'month') {
          setCurrentMonth(addMonths(currentMonth, 1));
        } else if (viewMode === 'week') {
          setCurrentMonth(addWeeks(currentMonth, 1));
        } else {
          setCurrentMonth(addDays(currentMonth, 1));
        }
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedDate) {
          handleReservationButtonClick(selectedDate);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentMonth, viewMode, selectedDate]);

  useEffect(() => {
    // Tüm carileri başlangıçta seçili yap
    if (cariAccounts.length > 0 && selectedCaris.length === 0) {
      setSelectedCaris(cariAccounts.map(c => c.id));
      // Her cari için başlangıç fiyatını 0 olarak ayarla
      const initialPrices = {};
      cariAccounts.forEach(cari => {
        initialPrices[cari.id] = 0;
      });
      setSeasonalPriceForm(prev => ({
        ...prev,
        cari_prices: initialPrices
      }));
    }
  }, [cariAccounts]);


  const fetchReservations = async () => {
    try {
      let start, end;
      
      // Görünüm moduna göre tarih aralığı belirle
      if (viewMode === 'week') {
        const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
        start = format(weekStart, 'yyyy-MM-dd');
        end = format(weekEnd, 'yyyy-MM-dd');
      } else if (viewMode === 'quarter') {
        // 3 aylık görünüm - mevcut ay ve sonraki 2 ay
        start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const quarterEnd = addMonths(currentMonth, 2);
        end = format(endOfMonth(quarterEnd), 'yyyy-MM-dd');
      } else if (viewMode === 'year') {
        // Yıllık görünüm
        start = format(startOfYear(currentMonth), 'yyyy-MM-dd');
        end = format(endOfYear(currentMonth), 'yyyy-MM-dd');
      } else {
        // Aylık görünüm (varsayılan)
        start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      }

      const params = { date_from: start, date_to: end };
      
      const response = await axios.get(`${API}/reservations`, { params });
      let filtered = response.data || [];

      // Sadece arama filtresi
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(r => 
          r.customer_name?.toLowerCase().includes(searchLower) ||
          r.cari_name?.toLowerCase().includes(searchLower) ||
          r.notes?.toLowerCase().includes(searchLower) ||
          r.voucher_code?.toLowerCase().includes(searchLower)
        );
      }

      setReservations(filtered);
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi');
    }
  };

  const fetchStatistics = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const response = await axios.get(`${API}/reservations`, {
        params: { date_from: start, date_to: end }
      });
      
      const monthReservations = response.data || [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayReservations = monthReservations.filter(r => r.date === today);
      
      const totalReservations = monthReservations.length;
      const totalAtvs = monthReservations.reduce((sum, r) => sum + (r.atv_count || 0), 0);
      const totalPersons = monthReservations.reduce((sum, r) => sum + (r.person_count || 0), 0);
      
      const revenue = { EUR: 0, USD: 0, TRY: 0 };
      monthReservations.forEach(r => {
        if (r.price && r.currency) {
          revenue[r.currency] = (revenue[r.currency] || 0) + r.price;
        }
      });
      
      const todayTotalAtvs = todayReservations.reduce((sum, r) => sum + (r.atv_count || 0), 0);
      const todayTotalPersons = todayReservations.reduce((sum, r) => sum + (r.person_count || 0), 0);
      
      setStatistics({
        totalReservations,
        totalAtvs,
        totalPersons,
        revenue,
        todayReservations: todayReservations.length,
        todayTotalAtvs,
        todayTotalPersons
      });
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const fetchUpcomingReservations = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await axios.get(`${API}/reservations`, {
        params: { date_from: today, status: 'confirmed' }
      });
      
      const upcoming = (response.data || [])
        .filter(r => r.status === 'confirmed')
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        })
        .slice(0, 5);
      
      setUpcomingReservations(upcoming);
    } catch (error) {
      console.error('Yaklaşan rezervasyonlar yüklenemedi:', error);
    }
  };

  // Takvim günlerini hesapla - ayın ilk gününden önceki günleri ve son gününden sonraki günleri de ekle
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Pazartesi başlangıç
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Pazartesi başlangıç
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getReservationsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
  };

  const getTotalAtvs = (date) => {
    const dayReservations = getReservationsForDate(date);
    return dayReservations.reduce((sum, r) => sum + r.atv_count, 0);
  };

  // Renk kodlaması fonksiyonları
  const getDayIntensity = (date) => {
    const dayReservations = getReservationsForDate(date);
    const count = dayReservations.length;
    if (count === 0) return 'none';
    if (count <= 2) return 'low';
    if (count <= 5) return 'medium';
    return 'high';
  };

  const getDayBackgroundColor = (date) => {
    const intensity = getDayIntensity(date);
    const isTodayDate = isToday(date);
    const isWeekendDay = isWeekend(date);
    
    if (isTodayDate) {
      return 'border-2';
    }
    
    if (isWeekendDay) {
      return 'border';
    }
    
    switch (intensity) {
      case 'high':
        return 'bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-400/30';
      case 'medium':
        return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-400/30';
      case 'low':
        return 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-400/30';
      default:
        return 'border';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'border-green-400/50';
      case 'completed':
        return 'border-blue-400/50';
      case 'cancelled':
        return 'border-red-400/50';
      default:
        return '';
    }
  };


  // Rezervasyon düzenleme
  const handleEditReservation = (reservation) => {
    setEditingReservation(reservation);
    setReservationDate(parseISO(reservation.date));
    
    const customerName = reservation.customer_name || '';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      cari_id: reservation.cari_id || '',
      date: reservation.date,
      time: reservation.time || '',
      tour_type_id: reservation.tour_type_id || '',
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_contact: reservation.customer_contact || '',
      customer_details: reservation.customer_details || null,
      person_count: reservation.person_count || 1,
      vehicle_count: reservation.vehicle_count || reservation.atv_count || 1,
      pickup_location: reservation.pickup_location || '',
      pickup_maps_link: reservation.pickup_maps_link || '',
      price: reservation.price || 0,
      currency: reservation.currency || 'EUR',
      exchange_rate: reservation.exchange_rate || 1.0,
      notes: reservation.notes || ''
    });
    
    if (reservation.customer_details) {
      setCustomerDetails({
        phone: reservation.customer_details.phone || '',
        email: reservation.customer_details.email || '',
        nationality: reservation.customer_details.nationality || '',
        id_number: reservation.customer_details.id_number || '',
        birth_date: reservation.customer_details.birth_date || ''
      });
    } else {
      setCustomerDetails({
        phone: '',
        email: '',
        nationality: '',
        id_number: '',
        birth_date: ''
      });
    }
    
    setCariSearch(reservation.cari_name || '');
    setActiveTab('reservation');
    setReservationDialogOpen(true);
  };

  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    try {
      const { status, customer_first_name, customer_last_name, ...payload } = formData;
      
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
      
      await axios.put(`${API}/reservations/${editingReservation.id}`, payload);
      toast.success('Rezervasyon güncellendi');
      setReservationDialogOpen(false);
      setEditingReservation(null);
      resetReservationForm();
      fetchReservations();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Rezervasyon güncellenemedi');
    }
  };

  const handleDeleteReservation = async (id) => {
    if (!window.confirm('Rezervasyonu silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/reservations/${id}`);
      toast.success('Rezervasyon silindi');
      fetchReservations();
      fetchStatistics();
      setSelectedReservations(selectedReservations.filter(selId => selId !== id));
    } catch (error) {
      toast.error('Rezervasyon silinemedi');
    }
  };

  const handleCopyReservation = (reservation) => {
    setCopyReservation(reservation);
    setReservationDate(new Date());
    
    const customerName = reservation.customer_name || '';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      cari_id: reservation.cari_id || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: reservation.time || '',
      tour_type_id: reservation.tour_type_id || '',
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_contact: reservation.customer_contact || '',
      customer_details: reservation.customer_details || null,
      person_count: reservation.person_count || 1,
      vehicle_count: reservation.vehicle_count || reservation.atv_count || 1,
      pickup_location: reservation.pickup_location || '',
      pickup_maps_link: reservation.pickup_maps_link || '',
      price: reservation.price || 0,
      currency: reservation.currency || 'EUR',
      exchange_rate: reservation.exchange_rate || 1.0,
      notes: reservation.notes || ''
    });
    
    if (reservation.customer_details) {
      setCustomerDetails({
        phone: reservation.customer_details.phone || '',
        email: reservation.customer_details.email || '',
        nationality: reservation.customer_details.nationality || '',
        id_number: reservation.customer_details.id_number || '',
        birth_date: reservation.customer_details.birth_date || ''
      });
    } else {
      setCustomerDetails({
        phone: '',
        email: '',
        nationality: '',
        id_number: '',
        birth_date: ''
      });
    }
    
    setCariSearch(reservation.cari_name || '');
    setActiveTab('reservation');
    setReservationDialogOpen(true);
  };

  const toggleReservationSelection = (id) => {
    setSelectedReservations(prev => 
      prev.includes(id) ? prev.filter(selId => selId !== id) : [...prev, id]
    );
  };

  const toggleAllReservationsSelection = (dateReservations) => {
    const allSelected = dateReservations.every(r => selectedReservations.includes(r.id));
    if (allSelected) {
      setSelectedReservations(prev => prev.filter(id => !dateReservations.some(r => r.id === id)));
    } else {
      setSelectedReservations(prev => [...prev, ...dateReservations.map(r => r.id)]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReservations.length === 0) {
      toast.error('Lütfen silmek için en az bir rezervasyon seçin');
      return;
    }
    if (!window.confirm(`${selectedReservations.length} rezervasyonu silmek istediğinizden emin misiniz?`)) return;
    
    try {
      await Promise.all(selectedReservations.map(id => axios.delete(`${API}/reservations/${id}`)));
      toast.success(`${selectedReservations.length} rezervasyon silindi`);
      setSelectedReservations([]);
      fetchReservations();
      fetchStatistics();
    } catch (error) {
      toast.error('Rezervasyonlar silinemedi');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { createNewPdf, createTitle, savePdf, createTable, safeText } = await import('../utils/pdfTemplate');
      const { formatDateStringDDMMYYYY } = await import('../utils/dateFormatter');
      
      const doc = createNewPdf();
      createTitle(doc, 'Takvim Raporu');
      
      let yPos = 40;
      doc.setFontSize(10);
      doc.text(`Tarih Aralığı: ${format(startOfMonth(currentMonth), 'dd.MM.yyyy')} - ${format(endOfMonth(currentMonth), 'dd.MM.yyyy')}`, 20, yPos);
      yPos += 10;
      
      const headers = ['Tarih', 'Saat', 'Müşteri', 'Cari', 'ATV', 'Kişi', 'Fiyat', 'Durum'];
      const rows = reservations.map(r => [
        formatDateStringDDMMYYYY(r.date),
        r.time || '-',
        safeText(r.customer_name || '-'),
        safeText(r.cari_name || '-'),
        (r.atv_count || 0).toString(),
        (r.person_count || 0).toString(),
        `${(r.price || 0).toFixed(2)} ${r.currency || 'EUR'}`,
        r.status || 'confirmed'
      ]);
      
      createTable(doc, headers, rows, 20, yPos);
      
      const filename = `takvim-raporu-${format(currentMonth, 'yyyy-MM')}.pdf`;
      savePdf(doc, filename, 'Takvim Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const { formatDateStringDDMMYYYY } = await import('../utils/dateFormatter');
      
      const data = reservations.map(r => ({
        'Tarih': formatDateStringDDMMYYYY(r.date),
        'Saat': r.time || '-',
        'Müşteri': r.customer_name || '-',
        'Cari': r.cari_name || '-',
        'Tur Tipi': r.tour_type_name || '-',
        'ATV': r.atv_count || 0,
        'Kişi': r.person_count || 0,
        'Fiyat': r.price || 0,
        'Döviz': r.currency || 'EUR',
        'Durum': r.status || 'confirmed',
        'Notlar': r.notes || '-'
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rezervasyonlar');
      XLSX.writeFile(wb, `takvim-raporu-${format(currentMonth, 'yyyy-MM')}.xlsx`);
      toast.success('Excel dosyası oluşturuldu');
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel oluşturulurken hata oluştu');
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

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleReservationButtonClick = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setReservationDate(date);
    setFormData({
      cari_id: '',
      date: dateStr,
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
      exchange_rate: rates.EUR || 1.0,
      notes: ''
    });
    setCustomerDetails({
      phone: '',
      email: '',
      nationality: '',
      id_number: '',
      birth_date: ''
    });
    setCariSearch('');
    setActiveTab('reservation');
    setPaymentAdded(false);
    setSavedPaymentTransactionId(null);
    setReservationDialogOpen(true);
  };

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    try {
      const { status, customer_first_name, customer_last_name, ...payload } = formData;
      
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
      
      const selectedCari = cariAccounts.find(c => c.id === formData.cari_id);
      const isMunferit = selectedCari && (selectedCari.is_munferit || selectedCari.name === "Münferit");
      
      const response = await axios.post(`${API}/reservations`, payload);
      
      if (isMunferit && paymentAdded && savedPaymentTransactionId) {
        try {
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
        toast.success('Rezervasyon oluşturuldu');
        toast.warning('⚠️ Ödeme alınmadı - Tahsilat eklenmemiş rezervasyon');
      } else {
        toast.success('Rezervasyon oluşturuldu');
      }
      
      setReservationDialogOpen(false);
      setEditingReservation(null);
      resetReservationForm();
      fetchReservations();
      fetchStatistics();
    } catch (error) {
      if (error.response?.status === 422) {
        const detail = error.response?.data?.detail;
        let errorMessage = 'Doğrulama hatası: ';
        
        if (Array.isArray(detail)) {
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
        toast.error(error.response?.data?.detail || 'Yetkilendirme hatası');
      } else {
        toast.error(error.response?.data?.detail || 'Rezervasyon kaydedilemedi');
      }
    }
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
      setFilteredCariAccountsForPayment([]);
    } catch (error) {
      console.error('Tahsilat eklenirken hata:', error);
      toast.error('Tahsilat eklenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetReservationForm = () => {
    setFormData({
      cari_id: '',
      date: reservationDate ? format(reservationDate, 'yyyy-MM-dd') : '',
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
    setCustomerDetails({
      phone: '',
      email: '',
      nationality: '',
      id_number: '',
      birth_date: ''
    });
    setCariSearch('');
    setActiveTab('reservation');
    setPaymentAdded(false);
    setSavedPaymentTransactionId(null);
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
  };

  const handleCariSelect = (cariId) => {
    const cari = cariAccounts.find(c => c.id === cariId);
    if (cari) {
      setCariSearch(cari.name);
      setFormData({
        ...formData,
        cari_id: cariId,
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
      
      const newCariId = response.data.id;
      const newCari = response.data;
      setCariSearch(newCari.name);
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

  const filteredCariAccountsForSeasonal = cariAccounts.filter(c => 
    c.name.toLowerCase().includes(cariSearchFilter.toLowerCase())
  );

  const fetchSeasonalPrices = async () => {
    try {
      const response = await axios.get(`${API}/seasonal-prices`);
      setSeasonalPrices(response.data);
    } catch (error) {
      toast.error('Dönemsel fiyatlar yüklenemedi');
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

  const handleCariSelect = (cariId) => {
    const cari = cariAccounts.find(c => c.id === cariId);
    if (cari) {
      setCariSearch(cari.name);
      setFormData({
        ...formData,
        cari_id: cariId,
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
      
      const newCariId = response.data.id;
      const newCari = response.data;
      setCariSearch(newCari.name);
      setFormData({ 
        ...formData, 
        cari_id: newCariId,
        pickup_location: newCari.pickup_location || '',
        pickup_maps_link: newCari.pickup_maps_link || ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cari hesap oluşturulamadı');
    }
  };

  const filteredCariAccounts = useMemo(() => {
    return cariAccounts.filter(c => 
      c.name.toLowerCase().includes(cariSearch.toLowerCase())
    );
  }, [cariAccounts, cariSearch]);

  const handleSelectAllCaris = () => {
    // Tüm carileri kontrol et (filtrelenmiş değil)
    if (selectedCaris.length === cariAccounts.length && cariAccounts.length > 0) {
      setSelectedCaris([]);
    } else {
      setSelectedCaris(cariAccounts.map(c => c.id));
    }
  };

  const handleToggleCari = (cariId) => {
    if (selectedCaris.includes(cariId)) {
      setSelectedCaris(selectedCaris.filter(id => id !== cariId));
    } else {
      setSelectedCaris([...selectedCaris, cariId]);
    }
  };

  const handleToggleTourType = (tourTypeId) => {
    const currentIds = seasonalPriceForm.tour_type_ids;
    if (currentIds.includes(tourTypeId)) {
      setSeasonalPriceForm({
        ...seasonalPriceForm,
        tour_type_ids: currentIds.filter(id => id !== tourTypeId)
      });
    } else {
      setSeasonalPriceForm({
        ...seasonalPriceForm,
        tour_type_ids: [...currentIds, tourTypeId]
      });
    }
  };

  const handleCariPriceChange = (cariId, price) => {
    setSeasonalPriceForm({
      ...seasonalPriceForm,
      cari_prices: {
        ...seasonalPriceForm.cari_prices,
        [cariId]: parseFloat(price) || 0
      }
    });
  };

  const handleSeasonalPriceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!seasonalPriceForm.start_date || !seasonalPriceForm.end_date) {
        toast.error('Lütfen tarih aralığı seçin');
        return;
      }
      if (seasonalPriceForm.tour_type_ids.length === 0) {
        toast.error('Lütfen en az bir tur tipi seçin');
        return;
      }
      if (selectedCaris.length === 0 && !seasonalPriceForm.apply_to_new_caris) {
        toast.error('Lütfen en az bir cari seçin veya "Yeni cariler" seçeneğini işaretleyin');
        return;
      }

      const priceData = {
        ...seasonalPriceForm,
        cari_prices: selectedCaris.reduce((acc, cariId) => {
          acc[cariId] = seasonalPriceForm.cari_prices[cariId] || 0;
          return acc;
        }, {})
      };

      if (editingSeasonalPrice) {
        await axios.put(`${API}/seasonal-prices/${editingSeasonalPrice.id}`, priceData);
        toast.success('Dönemsel fiyat güncellendi');
      } else {
        await axios.post(`${API}/seasonal-prices`, priceData);
        toast.success('Dönemsel fiyat oluşturuldu');
      }
      
      fetchSeasonalPrices();
      resetSeasonalPriceForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Dönemsel fiyat kaydedilemedi');
    }
  };

  const resetSeasonalPriceForm = () => {
    setSeasonalPriceForm({
      start_date: '',
      end_date: '',
      currency: 'EUR',
      tour_type_ids: [],
      cari_prices: {},
      apply_to_new_caris: false
    });
    setSelectedCaris(cariAccounts.map(c => c.id));
    setCariSearchFilter('');
    setEditingSeasonalPrice(null);
  };

  const handleEditSeasonalPrice = (price) => {
    setEditingSeasonalPrice(price);
    setSeasonalPriceForm({
      start_date: price.start_date,
      end_date: price.end_date,
      currency: price.currency,
      tour_type_ids: price.tour_type_ids || [],
      cari_prices: price.cari_prices || {},
      apply_to_new_caris: price.apply_to_new_caris || false
    });
    setSelectedCaris(Object.keys(price.cari_prices || []));
  };

  const handleDeleteSeasonalPrice = async (priceId) => {
    if (!window.confirm('Bu dönemsel fiyatı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/seasonal-prices/${priceId}`);
      toast.success('Dönemsel fiyat silindi');
      fetchSeasonalPrices();
    } catch (error) {
      toast.error('Dönemsel fiyat silinemedi');
    }
  };

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Takvim</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Rezervasyon yönetimi ve takvim görünümü</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Görünüm Modları */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'text-white' : ''}
              style={{
                backgroundColor: viewMode === 'month' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'month' ? 'var(--primary-foreground)' : 'var(--text-secondary)'
              }}
            >
              Aylık
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              Haftalık
            </Button>
            <Button
              variant={viewMode === 'quarter' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('quarter')}
              className={viewMode === 'quarter' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              3 Aylık
            </Button>
            <Button
              variant={viewMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('year')}
              className={viewMode === 'year' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              Yıllık
            </Button>
          </div>
          {/* Export Butonları */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="text-white"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileText size={16} className="mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-white"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Excel
          </Button>
          {/* Navigasyon */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentMonth(subMonths(currentMonth, 1));
                } else if (viewMode === 'week') {
                  setCurrentMonth(subWeeks(currentMonth, 1));
                } else if (viewMode === 'quarter') {
                  setCurrentMonth(subMonths(currentMonth, 3));
                } else if (viewMode === 'year') {
                  setCurrentMonth(subMonths(currentMonth, 12));
                }
              }}
              className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
              data-testid="prev-month-btn"
            >
              <ChevronLeft size={24} style={{ color: 'var(--accent)' }} />
            </button>
            <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
              {viewMode === 'week' ? `${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMM', { locale: tr })} - ${format(endOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: tr })}` :
               viewMode === 'quarter' ? `${format(startOfMonth(currentMonth), 'MMMM yyyy', { locale: tr })} - ${format(endOfMonth(addMonths(currentMonth, 2)), 'MMMM yyyy', { locale: tr })}` :
               viewMode === 'year' ? format(currentMonth, 'yyyy', { locale: tr }) :
               format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </h2>
            <button
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentMonth(addMonths(currentMonth, 1));
                } else if (viewMode === 'week') {
                  setCurrentMonth(addWeeks(currentMonth, 1));
                } else if (viewMode === 'quarter') {
                  setCurrentMonth(addMonths(currentMonth, 3));
                } else if (viewMode === 'year') {
                  setCurrentMonth(addMonths(currentMonth, 12));
                }
              }}
              className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
              data-testid="next-month-btn"
            >
              <ChevronRight size={24} style={{ color: 'var(--accent)' }} />
            </button>
          </div>
        </div>
      </div>


      {/* Filtreler ve Arama */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderWidth: '1px', borderStyle: 'solid' }}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Arama */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Müşteri, cari veya notlarda ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 rounded-lg text-white"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
          </div>
          {/* Görünüm Modları */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'text-white' : ''}
              style={{
                backgroundColor: viewMode === 'month' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'month' ? 'var(--primary-foreground)' : 'var(--text-secondary)'
              }}
            >
              Aylık
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              Haftalık
            </Button>
            <Button
              variant={viewMode === 'quarter' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('quarter')}
              className={viewMode === 'quarter' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              3 Aylık
            </Button>
            <Button
              variant={viewMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('year')}
              className={viewMode === 'year' ? 'bg-[#3EA6FF] text-white' : 'text-[#A5A5A5] hover:text-white'}
            >
              Yıllık
            </Button>
          </div>
        </div>
      </div>

      {/* Yaklaşan Rezervasyonlar */}
      {upcomingReservations.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderWidth: '1px', borderStyle: 'solid' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-400" />
              Yaklaşan Rezervasyonlar
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchUpcomingReservations}
              className=""
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <RefreshCw size={14} />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {upcomingReservations.map((res) => (
              <div
                key={res.id}
                className="p-3 rounded-lg border transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--accent)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  opacity: 0.2
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.2';
                }}
                onClick={() => {
                  setSelectedDate(parseISO(res.date));
                  setDialogOpen(true);
                }}
              >
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{format(parseISO(res.date), 'd MMM', { locale: tr })} {res.time}</p>
                <p className="text-sm font-semibold text-white mt-1">{res.customer_name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>{res.atv_count} ATV • {res.person_count} Kişi</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takvim */}
      <div className="mt-6">
        {/* Mobile View: Mini Calendar + Event List */}
        {isMobile && (
          <div className="space-y-4 md:hidden">
            {/* Mini Calendar */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                  <div
                    key={day}
                    className={`text-center text-xs font-semibold py-2 ${
                      index >= 5 ? 'text-orange-600' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const monthStart = startOfMonth(currentMonth);
                  const monthEnd = endOfMonth(currentMonth);
                  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

                  return days.map((day) => {
                    const dayReservations = getReservationsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`h-10 w-10 rounded-full flex flex-col items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : isTodayDate
                            ? 'bg-orange-100 text-orange-600 font-semibold'
                            : isCurrentMonth
                            ? 'text-gray-900 hover:bg-gray-100'
                            : 'text-gray-400'
                        }`}
                      >
                        <span className="text-sm">{format(day, 'd')}</span>
                        {dayReservations.length > 0 && (
                          <div className="h-1.5 w-1.5 bg-orange-500 rounded-full mx-auto mt-1" />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Event List for Selected Date */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDate && format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                </h3>
                <Button
                  onClick={() => {
                    if (selectedDate) {
                      handleReservationButtonClick(selectedDate);
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <Plus size={16} className="mr-1" />
                  Yeni
                </Button>
              </div>

              {selectedDate && getReservationsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {getReservationsForDate(selectedDate)
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map((reservation) => (
                      <div
                        key={reservation.id}
                        className="w-full bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock size={16} className="text-orange-600" />
                              <p className="text-gray-900 font-semibold text-base">
                                {reservation.customer_name}
                              </p>
                              {reservation.status && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    reservation.status === 'confirmed'
                                      ? 'bg-green-100 text-green-700'
                                      : reservation.status === 'completed'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {reservation.status === 'confirmed'
                                    ? 'Onaylı'
                                    : reservation.status === 'completed'
                                    ? 'Tamamlandı'
                                    : 'İptal'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{reservation.cari_name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Saat: {reservation.time}
                            </p>
                            {reservation.tour_type_name && (
                              <p className="text-xs text-gray-500 mt-1">
                                Tur: {reservation.tour_type_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-orange-600 font-bold text-lg">
                              {reservation.atv_count} ATV
                            </p>
                            <p className="text-sm text-gray-600">{reservation.person_count} Kişi</p>
                            <p className="text-sm text-green-600 mt-1 font-semibold">
                              {(reservation.price || 0).toFixed(2)} {reservation.currency || 'EUR'}
                            </p>
                          </div>
                        </div>
                        {reservation.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-orange-200 pl-2">
                            {reservation.notes}
                          </p>
                        )}
                        {reservation.pickup_location && (
                          <p className="text-xs text-gray-500 mt-2">📍 {reservation.pickup_location}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleEditReservation(reservation);
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit size={14} className="mr-1" />
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleCopyReservation(reservation);
                            }}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            <Copy size={14} className="mr-1" />
                            Kopyala
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteReservation(reservation.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Sil
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Bugün planlanmış tur yok.</p>
                  <Button
                    onClick={() => {
                      if (selectedDate) {
                        handleReservationButtonClick(selectedDate);
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    Yeni Rezervasyon Ekle
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop View: Full Calendar Grid */}
        <div className="hidden md:block">
          {/* Calendar Grid */}
          <div className="backdrop-blur-xl rounded-xl p-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
            <div 
              key={day} 
              className={`text-center font-semibold text-sm py-2 ${
                index >= 5 ? '#B8860B' : 'var(--text-secondary)'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {(() => {
          let days = [];
          if (viewMode === 'month') {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);
            const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          } else if (viewMode === 'week') {
            const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start: weekStart, end: weekEnd });
          } else if (viewMode === 'quarter') {
            const quarterStart = startOfMonth(currentMonth);
            const quarterEnd = endOfMonth(addMonths(currentMonth, 2));
            const calendarStart = startOfWeek(quarterStart, { weekStartsOn: 1 });
            const calendarEnd = endOfWeek(quarterEnd, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          } else if (viewMode === 'year') {
            const yearStart = startOfYear(currentMonth);
            const yearEnd = endOfYear(currentMonth);
            const calendarStart = startOfWeek(yearStart, { weekStartsOn: 1 });
            const calendarEnd = endOfWeek(yearEnd, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
          }

          return (
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
              const dayReservations = getReservationsForDate(day);
              const totalAtvs = getTotalAtvs(day);
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentMonth) : 
                                     viewMode === 'week' ? true :
                                     viewMode === 'quarter' ? (isSameMonth(day, currentMonth) || isSameMonth(day, addMonths(currentMonth, 1)) || isSameMonth(day, addMonths(currentMonth, 2))) :
                                     viewMode === 'year' ? true : true;
              const isTodayDate = isToday(day);
              const isWeekendDay = isWeekend(day);
              const intensity = getDayIntensity(day);

              return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`rounded-lg cursor-pointer transition-all relative group ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${getDayBackgroundColor(day)} hover:scale-105 hover:shadow-lg hover:shadow-[#3EA6FF]/20 ${
                  isTodayDate ? 'min-h-[160px] p-4' : 'min-h-[140px] p-3'
                }`}
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold"
                    style={{
                      color: isTodayDate ? 'var(--accent)' : 
                             isWeekendDay ? '#B8860B' : 'var(--text-primary)'
                    }}>
                      {format(day, 'd')}
                    </span>
                    {dayReservations.length > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs text-white font-bold shadow-md ${
                        intensity === 'high' ? 'bg-red-500' :
                        intensity === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}>
                        {dayReservations.length}
                      </span>
                    )}
                  </div>
                  
                  {totalAtvs > 0 && (
                    <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold" style={{ color: 'var(--accent)' }}>{totalAtvs}</span> ATV
                    </div>
                  )}
                  
                  {/* Mini Rezervasyon Listesi */}
                  {dayReservations.length > 0 && dayReservations.length <= 3 && (
                    <div className="space-y-1 mb-2">
                      {dayReservations.slice(0, 3).map((res) => (
                        <div
                          key={res.id}
                          className={`text-xs p-1 rounded border ${getStatusBorderColor(res.status || 'confirmed')} bg-[#2D2F33]/50 truncate`}
                          title={`${res.customer_name} - ${res.time}`}
                        >
                          <span className="text-white">{res.time}</span> {res.customer_name}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {dayReservations.length > 3 && (
                    <div className="text-xs text-[#A5A5A5] mb-2">
                      +{dayReservations.length - 3} daha fazla
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReservationButtonClick(day);
                    }}
                    className="mt-2 w-full py-1 px-2 bg-[#3EA6FF]/20 hover:bg-[#3EA6FF]/40 rounded text-xs text-[#3EA6FF] font-medium transition-colors"
                    data-testid={`add-reservation-${format(day, 'yyyy-MM-dd')}`}
                  >
                    <Plus size={14} className="inline mr-1" />
                    Rezervasyon
                  </button>
                  
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1E1E1E] border border-[#3EA6FF]/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-nowrap">
                    <p className="text-xs text-white font-semibold">{format(day, 'd MMMM yyyy', { locale: tr })}</p>
                    <p className="text-xs text-[#A5A5A5]">{dayReservations.length} rezervasyon</p>
                    <p className="text-xs text-[#3EA6FF]">{totalAtvs} ATV</p>
                  </div>
                </div>
              );
            })}
            </div>
          );
        })()}
          </div>
        </div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                {selectedDate && format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
              </DialogTitle>
              {selectedDate && getReservationsForDate(selectedDate).length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const dateReservations = getReservationsForDate(selectedDate);
                      toggleAllReservationsSelection(dateReservations);
                    }}
                    variant="outline"
                    className="text-white"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {getReservationsForDate(selectedDate).every(r => selectedReservations.includes(r.id)) ? (
                      <CheckSquare size={16} className="mr-2" />
                    ) : (
                      <Square size={16} className="mr-2" />
                    )}
                    Tümünü Seç
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReservationButtonClick(selectedDate)}
                    className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    Yeni Rezervasyon
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && getReservationsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getReservationsForDate(selectedDate)
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map((reservation) => {
                  const handleDownloadVoucher = async (action = 'download') => {
                    try {
                      toast.info('Voucher hazırlanıyor...');
                      const voucherResponse = await axios.post(`${API}/reservations/${reservation.id}/voucher`);
                      
                      if (!voucherResponse.data) {
                        throw new Error('Voucher yanıtı boş');
                      }
                      
                      const { reservation: resData, company } = voucherResponse.data;
                      
                      if (!resData) {
                        throw new Error('Rezervasyon bilgisi bulunamadı');
                      }
                      
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
                      
                      if (action === 'print') {
                        await printVoucherPdf(resData, companyData);
                        toast.success('Voucher yazdırılıyor...');
                      } else {
                        await downloadVoucherPdf(resData, companyData);
                        toast.success('Voucher indirildi');
                      }
                    } catch (error) {
                      console.error('Voucher oluşturma hatası:', error);
                      const errorMessage = error.response?.data?.detail || error.message || 'Voucher oluşturulamadı';
                      toast.error(errorMessage);
                    }
                  };
                  
                  return (
                    <div
                      key={reservation.id}
                      className={`p-4 bg-[#25272A] border rounded-lg ${getStatusBorderColor(reservation.status || 'confirmed')} hover:border-[#3EA6FF]/50 transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock size={16} className="text-[#3EA6FF]" />
                                <p className="text-white font-semibold text-lg">{reservation.customer_name}</p>
                                {reservation.status && (
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    reservation.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                    reservation.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {reservation.status === 'confirmed' ? 'Onaylı' :
                                     reservation.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#A5A5A5]">{reservation.cari_name}</p>
                              <p className="text-sm text-[#A5A5A5] mt-1">Saat: {reservation.time}</p>
                              {reservation.tour_type_name && (
                                <p className="text-xs text-[#A5A5A5] mt-1">Tur: {reservation.tour_type_name}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[#3EA6FF] font-bold text-lg">{reservation.atv_count} ATV</p>
                              <p className="text-sm text-[#A5A5A5]">{reservation.person_count} Kişi</p>
                              <p className="text-sm text-green-400 mt-1">
                                {(reservation.price || 0).toFixed(2)} {reservation.currency || 'EUR'}
                              </p>
                            </div>
                          </div>
                          {reservation.notes && (
                            <p className="text-sm text-[#A5A5A5] mt-2 italic border-l-2 border-[#3EA6FF]/30 pl-2">
                              {reservation.notes}
                            </p>
                          )}
                          {reservation.pickup_location && (
                            <p className="text-xs text-[#A5A5A5] mt-2">
                              📍 {reservation.pickup_location}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleEditReservation(reservation);
                                setDialogOpen(false);
                              }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Edit size={14} className="mr-2" />
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleCopyReservation(reservation);
                                setDialogOpen(false);
                              }}
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            >
                              <Copy size={14} className="mr-2" />
                              Kopyala
                            </Button>
                            <div className="relative group">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                title="Voucher İşlemleri"
                              >
                                <Receipt size={14} className="mr-2" />
                                Voucher
                              </Button>
                              <div className="absolute right-0 top-full mt-1 w-40 bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                  onClick={() => handleDownloadVoucher('download')}
                                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3EA6FF]/20 flex items-center gap-2 rounded-t-lg"
                                >
                                  <Download size={16} />
                                  PDF İndir
                                </button>
                                <button
                                  onClick={() => handleDownloadVoucher('print')}
                                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3EA6FF]/20 flex items-center gap-2 rounded-b-lg"
                                >
                                  <Printer size={16} />
                                  Yazdır
                                </button>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleDeleteReservation(reservation.id);
                                if (getReservationsForDate(selectedDate).length === 1) {
                                  setDialogOpen(false);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5] mb-4">Bu tarihte rezervasyon bulunmamaktadır</p>
                <Button
                  onClick={() => {
                    handleReservationButtonClick(selectedDate);
                    setDialogOpen(false);
                  }}
                  className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Yeni Rezervasyon Ekle
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rezervasyon Form Dialog */}
      <Dialog open={reservationDialogOpen} onOpenChange={(open) => {
        setReservationDialogOpen(open);
        if (!open) {
          setEditingReservation(null);
          setCopyReservation(null);
          resetReservationForm();
        }
      }}>
        <DialogContent className="max-w-4xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'} - {reservationDate && format(reservationDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingReservation ? handleUpdateReservation : handleReservationSubmit} className="space-y-4">
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
                        if (e.target.value === '') {
                          setFormData({ ...formData, cari_id: '', pickup_location: '', pickup_maps_link: '' });
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    />
                    {formData.cari_id && cariSearch && (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#3EA6FF] font-semibold">
                        ✓
                      </span>
                    )}
                  </div>
                  <Dialog open={cariDialogOpen} onOpenChange={setCariDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" className="bg-[#3EA6FF] hover:bg-[#2B8FE6]">
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
                        <Button type="button" onClick={handleQuickCreateCari} className="w-full bg-[#3EA6FF] hover:bg-[#005a9e]">
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
                        onClick={() => handleCariSelect(cari.id)}
                        className="px-3 py-2 hover:bg-[#3EA6FF]/20 cursor-pointer text-sm"
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
                      <div>
                        <Label className="text-sm font-medium text-white">Ad</Label>
                        <Input
                          type="text"
                          value={formData.customer_first_name}
                          onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                          placeholder="Ad"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-white">Soyad</Label>
                        <Input
                          type="text"
                          value={formData.customer_last_name}
                          onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
                          className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                          placeholder="Soyad"
                        />
                      </div>

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
                          e.preventDefault();
                          handleReservationSubmit(e);
                        }}
                        className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
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

export default Calendar;