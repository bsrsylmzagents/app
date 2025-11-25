import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, FileText, CheckSquare, Square, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { formatDateStringDDMMYYYY } from '../../utils/dateFormatter';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../../utils/pdfTemplate';
import useConfirmDialog from '../../hooks/useConfirmDialog';

const CashExpense = () => {
  const { confirm, dialog } = useConfirmDialog();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [filteredCariAccounts, setFilteredCariAccounts] = useState([]);
  const [rates, setRates] = useState({ EUR: 1.0, USD: 35.0, TRY: 1.0 });
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseStatistics, setExpenseStatistics] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState({
    date_from: '',
    date_to: '',
    currency: '',
    category_id: '',
    search: ''
  });
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [expenseCategoryDialogOpen, setExpenseCategoryDialogOpen] = useState(false);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [expenseCategoryFormData, setExpenseCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    expense_category_id: '',
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
    fetchExpenses();
    fetchExpenseCategories();
    fetchPaymentTypes();
    fetchCariAccounts();
    fetchRates();
    fetchExpenseStatistics();
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchExpenseStatistics();
  }, [expenseFilters]);

  const fetchRates = async () => {
    try {
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

  const fetchExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const params = {};
      if (expenseFilters.date_from) params.date_from = expenseFilters.date_from;
      if (expenseFilters.date_to) params.date_to = expenseFilters.date_to;
      if (expenseFilters.currency) params.currency = expenseFilters.currency;
      if (expenseFilters.category_id) params.category_id = expenseFilters.category_id;
      if (expenseFilters.search) params.search = expenseFilters.search;
      
      const response = await axios.get(`${API}/expenses`, { params });
      setExpenses(response.data || []);
    } catch (error) {
      console.error('Giderler yüklenemedi:', error);
      toast.error(error.response?.data?.detail || 'Giderler yüklenemedi');
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const response = await axios.get(`${API}/expense-categories`);
      setExpenseCategories(response.data || []);
    } catch (error) {
      console.error('Gider kategorileri yüklenemedi:', error);
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
      if (filteredPaymentTypes.length > 0 && !expenseFormData.payment_type_id) {
        const defaultPaymentType = filteredPaymentTypes.find(pt => pt.code === 'cash') || filteredPaymentTypes[0];
        setExpenseFormData(prev => ({ ...prev, payment_type_id: defaultPaymentType.id }));
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
    if (expenseFormData.cari_search && expenseFormData.cari_search.length >= 2) {
      const filtered = cariAccounts.filter(c => 
        c.name.toLowerCase().includes(expenseFormData.cari_search.toLowerCase())
      );
      setFilteredCariAccounts(filtered);
    } else {
      setFilteredCariAccounts([]);
    }
  }, [expenseFormData.cari_search, cariAccounts]);

  const fetchExpenseStatistics = async () => {
    try {
      const params = {};
      if (expenseFilters.date_from) params.date_from = expenseFilters.date_from;
      if (expenseFilters.date_to) params.date_to = expenseFilters.date_to;
      
      const response = await axios.get(`${API}/expenses/statistics`, { params });
      setExpenseStatistics(response.data);
    } catch (error) {
      console.error('Gider istatistikleri yüklenemedi:', error);
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
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount),
        exchange_rate: rates[expenseFormData.currency] || 1.0
      };
      
      if (editingExpense) {
        await axios.put(`${API}/expenses/${editingExpense.id}`, data);
        toast.success('Gider güncellendi');
      } else {
        await axios.post(`${API}/expenses`, data);
        toast.success('Gider eklendi');
      }
      
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      const defaultPaymentType = paymentTypes.find(pt => pt.code === 'cash') || paymentTypes[0];
      setExpenseFormData({
        description: '',
        expense_category_id: '',
        payment_type_id: defaultPaymentType?.id || '',
        cari_id: '',
        cari_search: '',
        amount: '',
        currency: 'EUR',
        exchange_rate: 1.0,
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      fetchExpenses();
      fetchExpenseStatistics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gider kaydedilemedi');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    // Transaction'dan cari_id'yi al
    const getCariIdFromExpense = async () => {
      try {
        const transactionResponse = await axios.get(`${API}/transactions`, {
          params: {
            reference_type: 'expense',
            reference_id: expense.id
          }
        });
        const transactions = transactionResponse.data || [];
        const transaction = transactions.find(t => t.reference_type === 'expense' && t.reference_id === expense.id);
        const cariId = transaction?.cari_id || '';
        const cari = cariAccounts.find(c => c.id === cariId);
        setExpenseFormData({
          description: expense.description || '',
          expense_category_id: expense.expense_category_id || '',
          payment_type_id: expense.payment_type_id || '',
          cari_id: cariId,
          cari_search: cari?.name || '',
          amount: expense.amount || '',
          currency: expense.currency || 'EUR',
          exchange_rate: expense.exchange_rate || 1.0,
          date: expense.date || format(new Date(), 'yyyy-MM-dd'),
          notes: expense.notes || ''
        });
      } catch (error) {
        setExpenseFormData({
          description: expense.description || '',
          expense_category_id: expense.expense_category_id || '',
          payment_type_id: expense.payment_type_id || '',
          cari_id: '',
          cari_search: '',
          amount: expense.amount || '',
          currency: expense.currency || 'EUR',
          exchange_rate: expense.exchange_rate || 1.0,
          date: expense.date || format(new Date(), 'yyyy-MM-dd'),
          notes: expense.notes || ''
        });
      }
    };
    getCariIdFromExpense();
    setExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = await confirm({
      title: "Gideri Sil",
      message: "Bu gideri silmek istediğinize emin misiniz?",
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/expenses/${id}`);
      toast.success('Gider silindi');
      fetchExpenses();
      fetchExpenseStatistics();
      setSelectedExpenses(selectedExpenses.filter(selId => selId !== id));
    } catch (error) {
      toast.error('Gider silinemedi');
    }
  };

  const handleBulkDeleteExpenses = async () => {
    if (selectedExpenses.length === 0) {
      toast.error('Lütfen silmek için en az bir gider seçin');
      return;
    }
    
    const confirmed = await confirm({
      title: "Giderleri Sil",
      message: `${selectedExpenses.length} adet gider kaydını silmek istediğinize emin misiniz?`,
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await Promise.all(selectedExpenses.map(id => axios.delete(`${API}/expenses/${id}`)));
      toast.success(`${selectedExpenses.length} gider kaydı silindi`);
      setSelectedExpenses([]);
      fetchExpenses();
      fetchExpenseStatistics();
    } catch (error) {
      toast.error('Giderler silinemedi');
    }
  };

  const toggleExpenseSelection = (id) => {
    setSelectedExpenses(prev => 
      prev.includes(id) ? prev.filter(selId => selId !== id) : [...prev, id]
    );
  };

  const toggleAllExpensesSelection = () => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenses.map(exp => exp.id));
    }
  };

  const handleExpenseCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpenseCategory) {
        await axios.put(`${API}/expense-categories/${editingExpenseCategory.id}`, expenseCategoryFormData);
        toast.success('Kategori güncellendi');
      } else {
        await axios.post(`${API}/expense-categories`, expenseCategoryFormData);
        toast.success('Kategori eklendi');
      }
      setExpenseCategoryDialogOpen(false);
      setEditingExpenseCategory(null);
      setExpenseCategoryFormData({ name: '', description: '' });
      fetchExpenseCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kategori kaydedilemedi');
    }
  };

  const handleDeleteExpenseCategory = async (id) => {
    const confirmed = await confirm({
      title: "Gider Kategorisini Sil",
      message: "Bu gider kategorisini silmek istediğinize emin misiniz?",
      variant: "danger"
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/expense-categories/${id}`);
      toast.success('Kategori silindi');
      fetchExpenseCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kategori silinemedi');
    }
  };

  const handleEditExpenseCategory = (category) => {
    setEditingExpenseCategory(category);
    setExpenseCategoryFormData({
      name: category.name || '',
      description: category.description || ''
    });
    setExpenseCategoryDialogOpen(true);
  };

  const generateExpensePDF = () => {
    if (expenses.length === 0) {
      toast.error('Rapor verisi yok');
      return;
    }

    try {
      const doc = createNewPdf();
      createTitle(doc, 'Gider Raporu');
      
      let yPos = 40;
      
      if (expenseFilters.date_from || expenseFilters.date_to) {
        doc.setFontSize(10);
        doc.text(`Tarih Aralığı: ${expenseFilters.date_from || 'Başlangıç'} - ${expenseFilters.date_to || 'Bitiş'}`, 20, yPos);
        yPos += 8;
      }
      
      const headers = ['Tarih', 'Açıklama', 'Kategori', 'Tutar', 'Döviz', 'TRY Değeri'];
      const rows = expenses.map(exp => [
        formatDateStringDDMMYYYY(exp.date),
        safeText(exp.description || '-'),
        safeText(exp.expense_category_name || '-'),
        (exp.amount || 0).toFixed(2),
        exp.currency || 'EUR',
        calculateTryValue(exp.amount || 0, exp.currency || 'EUR').toFixed(2)
      ]);
      
      createTable(doc, headers, rows, 20, yPos);
      
      const filename = `gider-raporu-${expenseFilters.date_from || 'all'}-${expenseFilters.date_to || 'all'}.pdf`;
      savePdf(doc, filename, 'Gider Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const generateExpenseExcel = async () => {
    if (expenses.length === 0) {
      toast.error('Rapor verisi yok');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const data = expenses.map(exp => ({
        'Tarih': formatDateStringDDMMYYYY(exp.date),
        'Açıklama': exp.description || '-',
        'Kategori': exp.expense_category_name || '-',
        'Tutar': exp.amount || 0,
        'Döviz': exp.currency || 'EUR',
        'TRY Değeri': calculateTryValue(exp.amount || 0, exp.currency || 'EUR')
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Giderler');
      XLSX.writeFile(wb, `gider-raporu-${expenseFilters.date_from || 'all'}-${expenseFilters.date_to || 'all'}.xlsx`);
      toast.success('Excel dosyası oluşturuldu');
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-6" data-testid="cash-expense-page">
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
        <h1 className="text-3xl font-bold text-white">Gider</h1>
      </div>

      {/* İstatistikler */}
      {expenseStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Toplam Gider (TRY)</p>
            <p className="text-2xl font-bold text-red-400">
              {expenseStatistics.total_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Bu Ay Toplam</p>
            <p className="text-2xl font-bold text-orange-400">
              {expenseStatistics.this_month_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Ortalama Gider</p>
            <p className="text-2xl font-bold text-white">
              {expenseStatistics.average_try_value?.toFixed(2) || '0.00'} TRY
            </p>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5] mb-1">Toplam Kayıt</p>
            <p className="text-2xl font-bold text-white">
              {expenseStatistics.count || 0}
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
            value={expenseFilters.search}
            onChange={(e) => setExpenseFilters({ ...expenseFilters, search: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF] min-w-[200px]"
          />
          <input
            type="date"
            placeholder="Başlangıç"
            value={expenseFilters.date_from}
            onChange={(e) => setExpenseFilters({ ...expenseFilters, date_from: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <input
            type="date"
            placeholder="Bitiş"
            value={expenseFilters.date_to}
            onChange={(e) => setExpenseFilters({ ...expenseFilters, date_to: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <select
            value={expenseFilters.currency}
            onChange={(e) => setExpenseFilters({ ...expenseFilters, currency: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Tüm Para Birimleri</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="TRY">TRY</option>
          </select>
          <select
            value={expenseFilters.category_id}
            onChange={(e) => setExpenseFilters({ ...expenseFilters, category_id: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Tüm Kategoriler</option>
            {expenseCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Dialog open={expenseCategoryDialogOpen} onOpenChange={(open) => {
            setExpenseCategoryDialogOpen(open);
            if (!open) {
              setEditingExpenseCategory(null);
              setExpenseCategoryFormData({ name: '', description: '' });
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
                <DialogTitle>Gider Kategorileri</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <form onSubmit={handleExpenseCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Kategori Adı</label>
                    <input
                      type="text"
                      value={expenseCategoryFormData.name}
                      onChange={(e) => setExpenseCategoryFormData({ ...expenseCategoryFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      value={expenseCategoryFormData.description}
                      onChange={(e) => setExpenseCategoryFormData({ ...expenseCategoryFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                      {editingExpenseCategory ? 'Güncelle' : 'Ekle'}
                    </Button>
                    {editingExpenseCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingExpenseCategory(null);
                          setExpenseCategoryFormData({ name: '', description: '' });
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
                    {expenseCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 bg-[#2D2F33] rounded-lg">
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          {cat.description && <p className="text-xs text-[#A5A5A5]">{cat.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditExpenseCategory(cat)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteExpenseCategory(cat.id)}
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
          {selectedExpenses.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkDeleteExpenses}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={16} className="mr-2" />
              Seçilileri Sil ({selectedExpenses.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={generateExpensePDF}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            <FileText size={16} className="mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={generateExpenseExcel}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Excel
          </Button>
          <Dialog open={expenseDialogOpen} onOpenChange={(open) => {
            setExpenseDialogOpen(open);
            if (!open) {
              setEditingExpense(null);
              const defaultPaymentType = paymentTypes.find(pt => pt.code === 'cash') || paymentTypes[0];
              setExpenseFormData({
                description: '',
                expense_category_id: '',
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
                Gider Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Gider Düzenle' : 'Yeni Gider'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama</label>
                  <input
                    type="text"
                    value={expenseFormData.description}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori</label>
                  <select
                    value={expenseFormData.expense_category_id}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  >
                    <option value="">Kategori Seçin</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gider Kanalı</label>
                  <select
                    value={expenseFormData.payment_type_id}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, payment_type_id: e.target.value })}
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
                      value={expenseFormData.cari_search}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, cari_search: e.target.value, cari_id: '' })}
                      onFocus={() => {
                        if (expenseFormData.cari_search.length < 2) {
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
                              setExpenseFormData({
                                ...expenseFormData,
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
                  {expenseFormData.cari_id && (
                    <p className="text-xs text-[#A5A5A5] mt-1">Seçili: {expenseFormData.cari_search}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tutar</label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Para Birimi</label>
                    <select
                      value={expenseFormData.currency}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, currency: e.target.value, exchange_rate: rates[e.target.value] || 1.0 })}
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
                    value={expenseFormData.date}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notlar</label>
                  <textarea
                    value={expenseFormData.notes}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExpenseDialogOpen(false)}
                    className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button type="submit" className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                    {editingExpense ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Gider Tablosu */}
      {loadingExpenses ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF] mx-auto"></div>
          <p className="mt-4 text-[#A5A5A5]">Yükleniyor...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 bg-[#25272A] border border-[#2D2F33] rounded-xl">
          <p className="text-[#A5A5A5]">Henüz gider kaydı bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleAllExpensesSelection}
                      className="text-white hover:text-[#3EA6FF]"
                    >
                      {selectedExpenses.length === expenses.length ? (
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
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-[#2D2F33] hover:bg-[#2D2F33]/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpenseSelection(expense.id)}
                        className="text-white hover:text-[#3EA6FF]"
                      >
                        {selectedExpenses.includes(expense.id) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-white">{formatDateStringDDMMYYYY(expense.date)}</td>
                    <td className="px-4 py-3 text-white">{expense.description || '-'}</td>
                    <td className="px-4 py-3 text-white">{expense.expense_category_name || '-'}</td>
                    <td className="px-4 py-3 text-white">{(expense.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-white">{expense.currency || 'EUR'}</td>
                    <td className="px-4 py-3 text-red-400 font-semibold">
                      {calculateTryValue(expense.amount || 0, expense.currency || 'EUR').toFixed(2)} TRY
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditExpense(expense)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExpense(expense.id)}
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

export default CashExpense;
