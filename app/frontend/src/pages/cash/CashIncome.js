import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Download, FileText, Search, Filter, X, CheckSquare, Square, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { formatDateStringDDMMYYYY } from '../../utils/dateFormatter';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import useConfirmDialog from '../../hooks/useConfirmDialog';

// CashIncome.js - Gelir sayfası
const CashIncome = () => {
  const { confirm, dialog } = useConfirmDialog();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [filteredCariAccounts, setFilteredCariAccounts] = useState([]);
  const [rates, setRates] = useState({ EUR: 1.0, USD: 1.1, TRY: 35.0 });
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [incomeStatistics, setIncomeStatistics] = useState(null);
  const [loadingIncomes, setLoadingIncomes] = useState(false);
  const [incomeFilters, setIncomeFilters] = useState({
    date_from: '',
    date_to: '',
    currency: '',
    category_id: '',
    search: ''
  });
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [incomeCategoryDialogOpen, setIncomeCategoryDialogOpen] = useState(false);
  const [editingIncomeCategory, setEditingIncomeCategory] = useState(null);
  const [incomeCategoryFormData, setIncomeCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const [incomeFormData, setIncomeFormData] = useState({
    description: '',
    income_category_id: '',
    payment_type_id: '',
    cari_id: '',
    cari_search: '',
    amount: '',
    currency: 'EUR',
    exchange_rate: 1.0,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    fetchIncomes();
    fetchIncomeCategories();
    fetchPaymentTypes();
    fetchCariAccounts();
    fetchRates();
    fetchIncomeStatistics();
  }, []);

  useEffect(() => {
    fetchIncomes();
    fetchIncomeStatistics();
  }, [incomeFilters]);

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/cash`);
      // Rates backend'den gelmiyorsa varsayılan değerleri kullan
      const companyResponse = await axios.get(`${API}/companies/me`);
      if (companyResponse.data?.currency_rates) {
        setRates({
          EUR: companyResponse.data.currency_rates.EUR || 1.0,
          USD: companyResponse.data.currency_rates.USD || 35.0,
          TRY: 1.0
        });
      }
    } catch (error) {
      console.error('Kurlar yüklenemedi:', error);
    }
  };

  const fetchIncomes = async () => {
    try {
      setLoadingIncomes(true);
      const params = {};
      if (incomeFilters.date_from) params.date_from = incomeFilters.date_from;
      if (incomeFilters.date_to) params.date_to = incomeFilters.date_to;
      if (incomeFilters.currency) params.currency = incomeFilters.currency;
      if (incomeFilters.category_id) params.category_id = incomeFilters.category_id;
      if (incomeFilters.search) params.search = incomeFilters.search;
      
      const response = await axios.get(`${API}/income`, { params });
      setIncomes(response.data || []);
    } catch (error) {
      console.error('Gelirler yüklenemedi:', error);
      toast.error(error.response?.data?.detail || 'Gelirler yüklenemedi');
      setIncomes([]);
    } finally {
      setLoadingIncomes(false);
    }
  };

  const fetchIncomeCategories = async () => {
    try {
      const response = await axios.get(`${API}/income-categories`);
      setIncomeCategories(response.data || []);
    } catch (error) {
      console.error('Gelir kategorileri yüklenemedi:', error);
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
      if (filteredPaymentTypes.length > 0 && !incomeFormData.payment_type_id) {
        const defaultPaymentType = filteredPaymentTypes.find(pt => pt.code === 'cash') || filteredPaymentTypes[0];
        setIncomeFormData(prev => ({ ...prev, payment_type_id: defaultPaymentType.id }));
      }
    } catch (error) {
      console.error('Ödeme tipleri yüklenemedi:', error);
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data || []);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi:', error);
    }
  };

  useEffect(() => {
    if (incomeFormData.cari_search && incomeFormData.cari_search.length >= 2) {
      const filtered = cariAccounts.filter(c => 
        c.name.toLowerCase().includes(incomeFormData.cari_search.toLowerCase())
      );
      setFilteredCariAccounts(filtered);
    } else {
      setFilteredCariAccounts([]);
    }
  }, [incomeFormData.cari_search, cariAccounts]);

  const fetchIncomeStatistics = async () => {
    try {
      const params = {};
      if (incomeFilters.date_from) params.date_from = incomeFilters.date_from;
      if (incomeFilters.date_to) params.date_to = incomeFilters.date_to;
      
      const response = await axios.get(`${API}/income/statistics`, { params });
      setIncomeStatistics(response.data);
    } catch (error) {
      console.error('Gelir istatistikleri yüklenemedi:', error);
    }
  };

  const calculateTryValue = (amount, currency) => {
    if (currency === 'TRY') return amount;
    return amount * (rates[currency] || (currency === 'USD' ? 35.0 : 1.0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...incomeFormData,
        amount: parseFloat(incomeFormData.amount),
        exchange_rate: rates[incomeFormData.currency] || 1.0
      };
      
      if (editingIncome) {
        await axios.put(`${API}/income/${editingIncome.id}`, data);
        toast.success('Gelir güncellendi');
      } else {
        await axios.post(`${API}/income`, data);
        toast.success('Gelir eklendi');
      }
      
      setIncomeDialogOpen(false);
      setEditingIncome(null);
      const defaultPaymentType = paymentTypes.find(pt => pt.code === 'cash') || paymentTypes[0];
      setIncomeFormData({
        description: '',
        income_category_id: '',
        payment_type_id: defaultPaymentType?.id || '',
        cari_id: '',
        cari_search: '',
        amount: '',
        currency: 'EUR',
        exchange_rate: 1.0,
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      fetchIncomes();
      fetchIncomeStatistics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gelir kaydedilemedi');
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncome(income);
    // Transaction'dan cari_id'yi al
    const getCariIdFromIncome = async () => {
      try {
        const transactionResponse = await axios.get(`${API}/transactions`, {
          params: {
            reference_type: 'income',
            reference_id: income.id
          }
        });
        const transactions = transactionResponse.data || [];
        const transaction = transactions.find(t => t.reference_type === 'income' && t.reference_id === income.id);
        const cariId = transaction?.cari_id || '';
        const cari = cariAccounts.find(c => c.id === cariId);
        setIncomeFormData({
          description: income.description || '',
          income_category_id: income.income_category_id || '',
          payment_type_id: income.payment_type_id || '',
          cari_id: cariId,
          cari_search: cari?.name || '',
          amount: income.amount || '',
          currency: income.currency || 'EUR',
          exchange_rate: income.exchange_rate || 1.0,
          date: income.date || format(new Date(), 'yyyy-MM-dd'),
          notes: income.notes || ''
        });
      } catch (error) {
        setIncomeFormData({
          description: income.description || '',
          income_category_id: income.income_category_id || '',
          payment_type_id: income.payment_type_id || '',
          cari_id: '',
          cari_search: '',
          amount: income.amount || '',
          currency: income.currency || 'EUR',
          exchange_rate: income.exchange_rate || 1.0,
          date: income.date || format(new Date(), 'yyyy-MM-dd'),
          notes: income.notes || ''
        });
      }
    };
    getCariIdFromIncome();
    setIncomeDialogOpen(true);
  };

  const handleDeleteIncome = async (id) => {
    const confirmed = await confirm({
      title: "Geliri Sil",
      message: "Bu geliri silmek istediğinize emin misiniz?",
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/income/${id}`);
      toast.success('Gelir silindi');
      fetchIncomes();
      fetchIncomeStatistics();
      setSelectedIncomes(selectedIncomes.filter(selId => selId !== id));
    } catch (error) {
      toast.error('Gelir silinemedi');
    }
  };

  const handleBulkDeleteIncomes = async () => {
    if (selectedIncomes.length === 0) {
      toast.error('Lütfen silmek için en az bir gelir seçin');
      return;
    }
    
    const confirmed = await confirm({
      title: "Gelirleri Sil",
      message: `${selectedIncomes.length} adet gelir kaydını silmek istediğinize emin misiniz?`,
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await Promise.all(selectedIncomes.map(id => axios.delete(`${API}/income/${id}`)));
      toast.success(`${selectedIncomes.length} gelir kaydı silindi`);
      setSelectedIncomes([]);
      fetchIncomes();
      fetchIncomeStatistics();
    } catch (error) {
      toast.error('Gelirler silinemedi');
    }
  };

  const toggleIncomeSelection = (id) => {
    setSelectedIncomes(prev => 
      prev.includes(id) ? prev.filter(selId => selId !== id) : [...prev, id]
    );
  };

  const toggleAllIncomesSelection = () => {
    if (selectedIncomes.length === incomes.length) {
      setSelectedIncomes([]);
    } else {
      setSelectedIncomes(incomes.map(inc => inc.id));
    }
  };

  const handleIncomeCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIncomeCategory) {
        await axios.put(`${API}/income-categories/${editingIncomeCategory.id}`, incomeCategoryFormData);
        toast.success('Kategori güncellendi');
      } else {
        await axios.post(`${API}/income-categories`, incomeCategoryFormData);
        toast.success('Kategori eklendi');
      }
      setIncomeCategoryDialogOpen(false);
      setEditingIncomeCategory(null);
      setIncomeCategoryFormData({ name: '', description: '' });
      fetchIncomeCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kategori kaydedilemedi');
    }
  };

  const handleDeleteIncomeCategory = async (id) => {
    const confirmed = await confirm({
      title: "Gelir Kategorisini Sil",
      message: "Bu gelir kategorisini silmek istediğinize emin misiniz?",
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/income-categories/${id}`);
      toast.success('Kategori silindi');
      fetchIncomeCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kategori silinemedi');
    }
  };

  const handleEditIncomeCategory = (category) => {
    setEditingIncomeCategory(category);
    setIncomeCategoryFormData({
      name: category.name || '',
      description: category.description || ''
    });
    setIncomeCategoryDialogOpen(true);
  };

  const generateIncomePDF = () => {
    if (incomes.length === 0) {
      toast.error('Rapor verisi yok');
      return;
    }

    try {
      const doc = createNewPdf();
      createTitle(doc, 'Gelir Raporu');
      
      let yPos = 40;
      
      // Filtre bilgileri
      if (incomeFilters.date_from || incomeFilters.date_to) {
        doc.setFontSize(10);
        doc.text(`Tarih Aralığı: ${incomeFilters.date_from || 'Başlangıç'} - ${incomeFilters.date_to || 'Bitiş'}`, 20, yPos);
        yPos += 8;
      }
      
      // Tablo başlıkları
      const headers = ['Tarih', 'Açıklama', 'Kategori', 'Tutar', 'Döviz', 'TRY Değeri'];
      const rows = incomes.map(inc => [
        formatDateStringDDMMYYYY(inc.date),
        safeText(inc.description || '-'),
        safeText(inc.income_category_name || '-'),
        (inc.amount || 0).toFixed(2),
        inc.currency || 'EUR',
        calculateTryValue(inc.amount || 0, inc.currency || 'EUR').toFixed(2)
      ]);
      
      createTable(doc, headers, rows, 20, yPos);
      
      const filename = `gelir-raporu-${incomeFilters.date_from || 'all'}-${incomeFilters.date_to || 'all'}.pdf`;
      savePdf(doc, filename, 'Gelir Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const generateIncomeExcel = async () => {
    if (incomes.length === 0) {
      toast.error('Rapor verisi yok');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const data = incomes.map(inc => ({
        'Tarih': formatDateStringDDMMYYYY(inc.date),
        'Açıklama': inc.description || '-',
        'Kategori': inc.income_category_name || '-',
        'Tutar': inc.amount || 0,
        'Döviz': inc.currency || 'EUR',
        'TRY Değeri': calculateTryValue(inc.amount || 0, inc.currency || 'EUR')
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gelirler');
      XLSX.writeFile(wb, `gelir-raporu-${incomeFilters.date_from || 'all'}-${incomeFilters.date_to || 'all'}.xlsx`);
      toast.success('Excel dosyası oluşturuldu');
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="cash-income-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cash')}
          className="text-white hover:bg-[#2D2F33]"
        >
          <ArrowLeft size={16} className="mr-2" />
          Geri
        </Button>
        <h1 className="text-3xl font-bold text-white">Gelir</h1>
      </div>

      {/* İstatistikler */}
      {incomeStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Toplam Gelir (TRY)</p>
            <p className="text-2xl font-bold text-green-400">
              {incomeStatistics.total_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Bu Ay Toplam</p>
            <p className="text-2xl font-bold text-blue-400">
              {incomeStatistics.this_month_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Ortalama Gelir</p>
            <p className="text-2xl font-bold text-white">
              {incomeStatistics.average_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Toplam Kayıt</p>
            <p className="text-2xl font-bold text-white">
              {incomeStatistics.count || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filtreler ve Butonlar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            type="text"
            placeholder="Ara..."
            value={incomeFilters.search}
            onChange={(e) => setIncomeFilters({ ...incomeFilters, search: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF] min-w-[200px]"
          />
          <input
            type="date"
            placeholder="Başlangıç"
            value={incomeFilters.date_from}
            onChange={(e) => setIncomeFilters({ ...incomeFilters, date_from: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <input
            type="date"
            placeholder="Bitiş"
            value={incomeFilters.date_to}
            onChange={(e) => setIncomeFilters({ ...incomeFilters, date_to: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <select
            value={incomeFilters.currency}
            onChange={(e) => setIncomeFilters({ ...incomeFilters, currency: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Tüm Para Birimleri</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="TRY">TRY</option>
          </select>
          <select
            value={incomeFilters.category_id}
            onChange={(e) => setIncomeFilters({ ...incomeFilters, category_id: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Tüm Kategoriler</option>
            {incomeCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Dialog open={incomeCategoryDialogOpen} onOpenChange={(open) => {
            setIncomeCategoryDialogOpen(open);
            if (!open) {
              setEditingIncomeCategory(null);
              setIncomeCategoryFormData({ name: '', description: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#2D2F33] text-white hover:bg-[#2D2F33]">
                <Plus size={16} className="mr-2" />
                Kategori Yönetimi
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gelir Kategorileri</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <form onSubmit={handleIncomeCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Kategori Adı</label>
                    <input
                      type="text"
                      value={incomeCategoryFormData.name}
                      onChange={(e) => setIncomeCategoryFormData({ ...incomeCategoryFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      value={incomeCategoryFormData.description}
                      onChange={(e) => setIncomeCategoryFormData({ ...incomeCategoryFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                      {editingIncomeCategory ? 'Güncelle' : 'Ekle'}
                    </Button>
                    {editingIncomeCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingIncomeCategory(null);
                          setIncomeCategoryFormData({ name: '', description: '' });
                        }}
                        className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                      >
                        İptal
                      </Button>
                    )}
                  </div>
                </form>
                <div className="border-t border-[#2D2F33] pt-4">
                  <h3 className="font-semibold mb-2">Mevcut Kategoriler</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {incomeCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 bg-[#2D2F33] rounded-lg">
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          {cat.description && <p className="text-xs text-[#A5A5A5]">{cat.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditIncomeCategory(cat)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteIncomeCategory(cat.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
          {selectedIncomes.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkDeleteIncomes}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={16} className="mr-2" />
              Seçilileri Sil ({selectedIncomes.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={generateIncomePDF}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            <FileText size={16} className="mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={generateIncomeExcel}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Excel
          </Button>
          <Dialog open={incomeDialogOpen} onOpenChange={(open) => {
            setIncomeDialogOpen(open);
            if (!open) {
              setEditingIncome(null);
              const defaultPaymentType = paymentTypes.find(pt => pt.code === 'cash') || paymentTypes[0];
              setIncomeFormData({
                description: '',
                income_category_id: '',
                payment_type_id: defaultPaymentType?.id || '',
                cari_id: '',
                cari_search: '',
                amount: '',
                currency: 'EUR',
                exchange_rate: 1.0,
                date: format(new Date(), 'yyyy-MM-dd'),
                notes: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                <Plus size={16} className="mr-2" />
                Gelir Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white">
              <DialogHeader>
                <DialogTitle>{editingIncome ? 'Gelir Düzenle' : 'Yeni Gelir'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <input
                    type="text"
                    value={incomeFormData.description}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori</label>
                  <select
                    value={incomeFormData.income_category_id}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, income_category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  >
                    <option value="">Kategori Seçin</option>
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ödeme Alma Tipi</label>
                  <select
                    value={incomeFormData.payment_type_id}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, payment_type_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {paymentTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cari Hesap</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={incomeFormData.cari_search}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, cari_search: e.target.value, cari_id: '' })}
                      onFocus={() => {
                        if (incomeFormData.cari_search.length < 2) {
                          setFilteredCariAccounts(cariAccounts.slice(0, 10));
                        }
                      }}
                      placeholder="Cari hesap ara..."
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    />
                    {filteredCariAccounts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-[#2D2F33] border border-[#3EA6FF] rounded-lg max-h-60 overflow-y-auto">
                        {filteredCariAccounts.map(cari => (
                          <div
                            key={cari.id}
                            onClick={() => {
                              setIncomeFormData({
                                ...incomeFormData,
                                cari_id: cari.id,
                                cari_search: cari.name
                              });
                              setFilteredCariAccounts([]);
                            }}
                            className="px-3 py-2 hover:bg-[#3EA6FF]/20 cursor-pointer text-white"
                          >
                            {cari.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {incomeFormData.cari_id && (
                    <p className="text-xs text-[#A5A5A5] mt-1">Seçili: {incomeFormData.cari_search}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tutar</label>
                    <input
                      type="number"
                      step="0.01"
                      value={incomeFormData.amount}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Para Birimi</label>
                    <select
                      value={incomeFormData.currency}
                      onChange={(e) => setIncomeFormData({ ...incomeFormData, currency: e.target.value, exchange_rate: rates[e.target.value] || 1.0 })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tarih</label>
                  <input
                    type="date"
                    value={incomeFormData.date}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notlar</label>
                  <textarea
                    value={incomeFormData.notes}
                    onChange={(e) => setIncomeFormData({ ...incomeFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIncomeDialogOpen(false)}
                    className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button type="submit" className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                    {editingIncome ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Gelir Tablosu */}
      {loadingIncomes ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="mt-4 text-[#A5A5A5]">Yükleniyor...</p>
        </div>
      ) : incomes.length === 0 ? (
        <div className="text-center py-12 bg-[#25272A] border border-[#2D2F33] rounded-xl">
          <p className="text-[#A5A5A5]">Henüz gelir kaydı bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleAllIncomesSelection}
                      className="text-white hover:text-[#3EA6FF]"
                    >
                      {selectedIncomes.length === incomes.length ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Tarih</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Açıklama</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Kategori</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Tutar</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Döviz</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">TRY Değeri</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id} className="border-t border-[#2D2F33] hover:bg-[#2D2F33]/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleIncomeSelection(income.id)}
                        className="text-white hover:text-[#3EA6FF]"
                      >
                        {selectedIncomes.includes(income.id) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-white">{formatDateStringDDMMYYYY(income.date)}</td>
                    <td className="px-4 py-3 text-white">{income.description || '-'}</td>
                    <td className="px-4 py-3 text-white">{income.income_category_name || '-'}</td>
                    <td className="px-4 py-3 text-white">{(income.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-white">{income.currency || 'EUR'}</td>
                    <td className="px-4 py-3 text-green-400 font-semibold">
                      {calculateTryValue(income.amount || 0, income.currency || 'EUR').toFixed(2)} TRY
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditIncome(income)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteIncome(income.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default CashIncome;
