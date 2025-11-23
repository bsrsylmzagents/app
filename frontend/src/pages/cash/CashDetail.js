import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { ArrowLeft, Euro, DollarSign, TrendingUp, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { formatDateStringDDMMYYYY } from '../../utils/dateFormatter';
import Loading from '../../components/Loading';

const CashDetail = () => {
  const navigate = useNavigate();
  const [cashDetail, setCashDetail] = useState(null);
  const [rates, setRates] = useState({ EUR: 1.0, USD: 35.0, TRY: 1.0 });
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exchangeHistory, setExchangeHistory] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [valorPending, setValorPending] = useState([]);
  const [transactions, setTransactions] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null); // 'cash', 'bank', 'credit_card', 'check_promissory'
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [filteredCariAccounts, setFilteredCariAccounts] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    cari_id: '',
    cari_search: '',
    amount: '',
    currency: 'TRY',
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
  const [exchangeFormData, setExchangeFormData] = useState({
    from_currency: 'EUR',
    to_currency: 'TRY',
    amount: '',
    exchange_rate: 35.0,
    from_account_id: '',
    to_account_id: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [transferFormData, setTransferFormData] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    currency: 'TRY',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [exchangeHistoryFilters, setExchangeHistoryFilters] = useState({
    date_from: '',
    date_to: '',
    currency: ''
  });
  const [fixingPaymentMethods, setFixingPaymentMethods] = useState(false);

  useEffect(() => {
    fetchCashData();
    fetchRates();
    fetchStatistics();
    fetchExchangeHistory();
    fetchCashAccounts();
    fetchValorPending();
    fetchTransactionsByPaymentMethod();
    fetchCariAccounts();
    fetchPaymentTypes();
    fetchBankAccounts();
    
    // Manuel kur güncellemesi event'ini dinle
    const handleCurrencyRatesUpdated = (event) => {
      if (event.detail?.type === 'system') {
        fetchRates();
      }
    };
    
    window.addEventListener('currencyRatesUpdated', handleCurrencyRatesUpdated);
    
    return () => {
      window.removeEventListener('currencyRatesUpdated', handleCurrencyRatesUpdated);
    };
  }, []);

  // Cash accounts yüklendiğinde exchange form'u güncelle
  useEffect(() => {
    if (cashAccounts.length > 0 && exchangeFormData.from_currency && !exchangeFormData.from_account_id) {
      const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === exchangeFormData.from_currency);
      const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
      if (cashAccount) {
        setExchangeFormData(prev => ({ ...prev, from_account_id: cashAccount.id }));
      }
    }
    
    if (cashAccounts.length > 0 && exchangeFormData.to_currency && !exchangeFormData.to_account_id) {
      const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === exchangeFormData.to_currency);
      const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
      if (cashAccount) {
        setExchangeFormData(prev => ({ ...prev, to_account_id: cashAccount.id }));
      }
    }
  }, [cashAccounts]);

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

  useEffect(() => {
    if (paymentFormData.cari_search && paymentFormData.cari_search.length >= 2) {
      const filtered = cariAccounts.filter(c => 
        c.name.toLowerCase().includes(paymentFormData.cari_search.toLowerCase())
      );
      setFilteredCariAccounts(filtered);
    } else {
      setFilteredCariAccounts([]);
    }
  }, [paymentFormData.cari_search, cariAccounts]);

  useEffect(() => {
    if (paymentFormData.transfer_to_cari_search && paymentFormData.transfer_to_cari_search.length >= 2) {
      const filtered = cariAccounts.filter(c => 
        c.id !== paymentFormData.cari_id && 
        c.name.toLowerCase().includes(paymentFormData.transfer_to_cari_search.toLowerCase())
      );
      setFilteredCariAccounts(filtered);
    } else {
      setFilteredCariAccounts([]);
    }
  }, [paymentFormData.transfer_to_cari_search, cariAccounts, paymentFormData.cari_id]);


  useEffect(() => {
    fetchExchangeHistory();
  }, [exchangeHistoryFilters]);

  const fetchCashData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/cash/detail`);
      setCashDetail(response.data);
      setCashAccounts(response.data?.cash_accounts || []);
    } catch (error) {
      console.error('Kasa verisi yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      // Sistem kurlarını al (rezervasyonlar, gelir/gider için kullanılan)
      const ratesResponse = await axios.get(`${API}/currency/rates`);
      if (ratesResponse.data?.rates) {
        const newRates = {
          EUR: ratesResponse.data.rates.EUR || 35.0,
          USD: ratesResponse.data.rates.USD || 34.0,
          TRY: 1.0
        };
        setRates(newRates);
        // Update exchange rate in form if currencies are selected
        calculateExchangeRate(exchangeFormData.from_currency, exchangeFormData.to_currency, newRates);
      }
    } catch (error) {
      console.error('Kurlar yüklenemedi:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/cash/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const fetchExchangeHistory = async () => {
    try {
      const params = {};
      if (exchangeHistoryFilters.date_from) params.date_from = exchangeHistoryFilters.date_from;
      if (exchangeHistoryFilters.date_to) params.date_to = exchangeHistoryFilters.date_to;
      if (exchangeHistoryFilters.currency) params.currency = exchangeHistoryFilters.currency;
      
      const response = await axios.get(`${API}/cash/exchange-history`, { params });
      setExchangeHistory(response.data || []);
    } catch (error) {
      console.error('Döviz geçmişi yüklenemedi:', error);
    }
  };

  const fetchCashAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cash-accounts`);
      setCashAccounts(response.data || []);
    } catch (error) {
      console.error('Kasa hesapları yüklenemedi:', error);
    }
  };

  const fetchValorPending = async () => {
    try {
      // Tüm transaction'ları çek ve valör süresindeki olanları filtrele
      const response = await axios.get(`${API}/transactions`, {
        params: {
          transaction_type: 'payment',
          payment_method: 'credit_card'
        }
      });
      
      const today = new Date();
      const pending = response.data.filter(t => {
        if (!t.valor_date || t.is_settled) return false;
        const valorDate = new Date(t.valor_date);
        return valorDate > today;
      });
      
      setValorPending(pending);
    } catch (error) {
      console.error('Valör takibi yüklenemedi:', error);
    }
  };

  const fetchTransactionsByPaymentMethod = async () => {
    try {
      const paymentMethods = {
        cash: 'cash',
        bank: 'bank_transfer',
        credit_card: 'credit_card',
        check_promissory: 'check_promissory'
      };

      const allTransactions = {};
      
      for (const [tab, method] of Object.entries(paymentMethods)) {
        try {
          const response = await axios.get(`${API}/transactions`, {
            params: {
              transaction_type: 'payment',
              payment_method: method
            }
          });
          allTransactions[tab] = response.data || [];
        } catch (error) {
          console.error(`${method} transactionlari yuklenemedi:`, error);
          allTransactions[tab] = [];
        }
      }
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Transactionlar yüklenemedi:', error);
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi:', error);
    }
  };

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      setPaymentTypes(response.data);
    } catch (error) {
      console.error('Ödeme tipleri yüklenemedi:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(`${API}/bank-accounts`);
      setBankAccounts(response.data);
    } catch (error) {
      console.error('Banka hesapları yüklenemedi:', error);
    }
  };

  const handleFixPaymentMethods = async () => {
    if (!window.confirm('Mevcut transaction\'larda payment_method null olanlar düzeltilecek. Devam etmek istiyor musunuz?')) {
      return;
    }
    
    try {
      setFixingPaymentMethods(true);
      const response = await axios.post(`${API}/cash/fix-payment-methods`);
      toast.success(response.data.message || `${response.data.fixed_count} transaction düzeltildi`);
      // Veriyi yenile
      fetchCashData();
      fetchTransactionsByPaymentMethod();
    } catch (error) {
      console.error('Payment method düzeltilemedi:', error);
      toast.error(error.response?.data?.detail || 'Payment method düzeltilemedi');
    } finally {
      setFixingPaymentMethods(false);
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

      if (!paymentFormData.cari_id) {
        toast.error('Cari hesap seçilmelidir');
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
        cari_id: paymentFormData.cari_id,
        transaction_type: 'payment',
        amount: amount,
        currency: paymentFormData.currency,
        exchange_rate: exchangeRate,
        payment_type_id: paymentType.id,
        payment_type_name: paymentType.name,
        description: paymentFormData.description || `Tahsilat - ${format(new Date(paymentFormData.date), 'dd.MM.yyyy')}`,
        reference_id: null,
        reference_type: 'manual',
        date: paymentFormData.date,
        time: paymentFormData.time || format(new Date(), 'HH:mm')
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
      setPaymentFormData({
        cari_id: '',
        cari_search: '',
        amount: '',
        currency: 'TRY',
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
      setFilteredCariAccounts([]);
      fetchCashData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Tahsilat eklenemedi');
      console.error('Error adding payment:', error);
    }
  };

  const calculateExchangeRate = (from, to, customRates = null) => {
    const currentRates = customRates || rates;
    let rate = 1.0;
    
    if (from === to) {
      rate = 1.0;
    } else if (to === 'TRY') {
      rate = currentRates[from] || 1.0;
    } else if (from === 'TRY') {
      rate = 1.0 / (currentRates[to] || 1.0);
    } else {
      // EUR <-> USD gibi durumlar için
      rate = currentRates[from] / currentRates[to];
    }
    
    setExchangeFormData(prev => ({
      ...prev,
      from_currency: from,
      to_currency: to,
      exchange_rate: rate
    }));
  };

  const handleExchangeSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(exchangeFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      // Account ID'leri para birimine göre otomatik bul
      if (!exchangeFormData.from_account_id) {
        const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === exchangeFormData.from_currency);
        const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
        if (!cashAccount) {
          toast.error(`${exchangeFormData.from_currency} para birimi için aktif hesap bulunamadı`);
          return;
        }
        exchangeFormData.from_account_id = cashAccount.id;
      }
      
      if (!exchangeFormData.to_account_id) {
        const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === exchangeFormData.to_currency);
        const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
        if (!cashAccount) {
          toast.error(`${exchangeFormData.to_currency} para birimi için aktif hesap bulunamadı`);
          return;
        }
        exchangeFormData.to_account_id = cashAccount.id;
      }

      const data = {
        from_currency: exchangeFormData.from_currency,
        to_currency: exchangeFormData.to_currency,
        amount: amount,
        exchange_rate: parseFloat(exchangeFormData.exchange_rate),
        date: exchangeFormData.date,
        from_account_id: exchangeFormData.from_account_id,
        to_account_id: exchangeFormData.to_account_id
      };
      
      await axios.post(`${API}/cash/exchange`, data);
      toast.success('Döviz bozma işlemi tamamlandı');
      setExchangeDialogOpen(false);
      setExchangeFormData({
        from_currency: 'EUR',
        to_currency: 'TRY',
        amount: '',
        exchange_rate: rates.EUR || 35.0,
        from_account_id: '',
        to_account_id: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchCashData();
      fetchStatistics();
      fetchExchangeHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Döviz bozma işlemi başarısız');
      console.error('Error exchanging currency:', error);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(transferFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      if (!transferFormData.from_account_id || !transferFormData.to_account_id) {
        toast.error('Kaynak ve hedef hesap seçilmelidir');
        return;
      }

      await axios.post(`${API}/cash/transfer`, {
        from_account_id: transferFormData.from_account_id,
        to_account_id: transferFormData.to_account_id,
        amount: amount,
        currency: transferFormData.currency,
        description: transferFormData.description,
        date: transferFormData.date
      });

      toast.success('Transfer işlemi tamamlandı');
      setTransferDialogOpen(false);
      setTransferFormData({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        currency: 'TRY',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchCashData();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transfer işlemi başarısız');
      console.error('Error transferring cash:', error);
    }
  };

  const handleDeleteExchange = async (id) => {
    if (!window.confirm('Döviz işlemini silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/cash/exchange/${id}`);
      toast.success('Döviz işlemi silindi');
      fetchCashData();
      fetchStatistics();
      fetchExchangeHistory();
    } catch (error) {
      toast.error('Döviz işlemi silinemedi');
    }
  };

  const updateRates = async () => {
    toast.info('Kurlar güncelleniyor...');
    await fetchRates();
    toast.success('Kurlar güncellendi');
  };

  const calculateTryValue = (amount, currency) => {
    if (currency === 'TRY') return amount;
    return amount * (rates[currency] || 1.0);
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'EUR':
        return <Euro size={24} className="text-blue-400" />;
      case 'USD':
        return <DollarSign size={24} className="text-green-400" />;
      case 'TRY':
        return <TrendingUp size={24} className="text-orange-400" />;
      default:
        return <Euro size={24} className="text-white" />;
    }
  };

  if (loading && !cashDetail) {
    return <Loading />;
  }

  return (
    <div className="space-y-6" data-testid="cash-detail-page">
      <div className="flex items-center justify-between">
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
          <h1 className="text-3xl font-bold text-white">Kasa Detay</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleFixPaymentMethods}
            disabled={fixingPaymentMethods}
            className="bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
          >
            <RefreshCw size={18} className={`mr-2 ${fixingPaymentMethods ? 'animate-spin' : ''}`} />
            {fixingPaymentMethods ? 'Düzeltiliyor...' : 'Ödeme Tipi Düzelt'}
          </Button>
          <Dialog 
            open={paymentDialogOpen} 
            onOpenChange={(open) => {
              setPaymentDialogOpen(open);
              if (open) {
                const now = new Date();
                setPaymentFormData({
                  cari_id: '',
                  cari_search: '',
                  amount: '',
                  currency: 'TRY',
                  payment_type: '',
                  description: '',
                  date: format(now, 'yyyy-MM-dd'),
                  time: format(now, 'HH:mm'),
                  bank_account_id: '',
                  transfer_to_cari_id: '',
                  transfer_to_cari_search: '',
                  due_date: '',
                  check_number: '',
                  bank_name: ''
                });
                setFilteredCariAccounts([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                <Plus size={18} className="mr-2" />
                Tahsilat Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md max-h-[90vh] overflow-y-auto z-[100] left-[calc(50%+140px)] -translate-x-1/2">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Tahsilat Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Cari Hesap Ara *</label>
                  <input
                    type="text"
                    value={paymentFormData.cari_search}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, cari_search: e.target.value, cari_id: '' })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="En az 2 karakter giriniz"
                    required
                  />
                  {filteredCariAccounts.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto bg-[#2D2F33] rounded-lg border border-[#3EA6FF]/30">
                      {filteredCariAccounts.map((cari) => (
                        <div
                          key={cari.id}
                          onClick={() => {
                            setPaymentFormData({
                              ...paymentFormData,
                              cari_id: cari.id,
                              cari_search: cari.name,
                              amount: Math.abs(
                                paymentFormData.currency === 'EUR' 
                                  ? (cari.balance_eur || 0)
                                  : paymentFormData.currency === 'USD'
                                  ? (cari.balance_usd || 0)
                                  : (cari.balance_try || 0)
                              ).toFixed(2)
                            });
                            setFilteredCariAccounts([]);
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

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Para Birimi *</label>
                  <select
                    value={paymentFormData.currency}
                    onChange={(e) => {
                      const selectedCurrency = e.target.value;
                      const selectedCari = cariAccounts.find(c => c.id === paymentFormData.cari_id);
                      const balance = selectedCari 
                        ? (selectedCurrency === 'EUR' 
                            ? (selectedCari.balance_eur || 0)
                            : selectedCurrency === 'USD'
                            ? (selectedCari.balance_usd || 0)
                            : (selectedCari.balance_try || 0))
                        : 0;
                      
                      setPaymentFormData({
                        ...paymentFormData,
                        currency: selectedCurrency,
                        amount: Math.abs(balance).toFixed(2)
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
                    Tutar ({paymentFormData.currency}) *
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
                    <label className="block text-sm font-medium mb-2 text-white">Hedef Cari Hesap Ara *</label>
                    <input
                      type="text"
                      value={paymentFormData.transfer_to_cari_search}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, transfer_to_cari_search: e.target.value, transfer_to_cari_id: '' })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="En az 2 karakter giriniz"
                      required
                    />
                    {filteredCariAccounts.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto bg-[#2D2F33] rounded-lg border border-[#3EA6FF]/30">
                        {filteredCariAccounts.map((cari) => (
                          <div
                            key={cari.id}
                            onClick={() => {
                              setPaymentFormData({
                                ...paymentFormData,
                                transfer_to_cari_id: cari.id,
                                transfer_to_cari_search: cari.name
                              });
                              setFilteredCariAccounts([]);
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

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
                  <textarea
                    value={paymentFormData.description}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    rows="3"
                    placeholder="Açıklama (opsiyonel)"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                    className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    Ekle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={updateRates}
            className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
          >
            <RefreshCw size={16} className="mr-2" />
            Kurları Güncelle
          </Button>
        </div>
      </div>

      {/* Özet Kutucukları */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Kullanılabilir Tutar - Mavi Dolgu */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/50 rounded-xl p-6">
          <p className="text-sm text-[#A5A5A5] mb-2">Kullanılabilir Tutar</p>
          <p className="text-4xl font-bold text-white mb-3">
            {(
              (cashDetail?.available_amounts?.TRY || 0) +
              (cashDetail?.available_amounts?.EUR || 0) * (rates.EUR || 1) +
              (cashDetail?.available_amounts?.USD || 0) * (rates.USD || 1)
            ).toFixed(2)} TRY
          </p>
          <div className="space-y-1">
            <p className="text-sm text-white">
              TRY: {cashDetail?.available_amounts?.TRY?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-white">
              EUR: {cashDetail?.available_amounts?.EUR?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-white">
              USD: {cashDetail?.available_amounts?.USD?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
        
        {/* Vadedeki Tutar - Sarı Dolgu */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/50 rounded-xl p-6">
          <p className="text-sm text-[#A5A5A5] mb-2">Vadedeki Tutar</p>
          <p className="text-4xl font-bold text-white mb-3">
            {(
              (cashDetail?.pending_amounts?.TRY || 0) +
              (cashDetail?.pending_amounts?.EUR || 0) * (rates.EUR || 1) +
              (cashDetail?.pending_amounts?.USD || 0) * (rates.USD || 1)
            ).toFixed(2)} TRY
          </p>
          <div className="space-y-1">
            <p className="text-sm text-white">
              TRY: {cashDetail?.pending_amounts?.TRY?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-white">
              EUR: {cashDetail?.pending_amounts?.EUR?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-white">
              USD: {cashDetail?.pending_amounts?.USD?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
        
        {/* Toplam - Yeşil Dolgu */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/50 rounded-xl p-6">
          <p className="text-sm text-[#A5A5A5] mb-2">Toplam</p>
          <p className="text-4xl font-bold text-white mb-3">
            {(
              ((cashDetail?.available_amounts?.TRY || 0) + (cashDetail?.pending_amounts?.TRY || 0)) +
              ((cashDetail?.available_amounts?.EUR || 0) + (cashDetail?.pending_amounts?.EUR || 0)) * (rates.EUR || 1) +
              ((cashDetail?.available_amounts?.USD || 0) + (cashDetail?.pending_amounts?.USD || 0)) * (rates.USD || 1)
            ).toFixed(2)} TRY
          </p>
          <div className="space-y-1">
            <p className="text-sm text-white">
              TRY: {((cashDetail?.available_amounts?.TRY || 0) + (cashDetail?.pending_amounts?.TRY || 0)).toFixed(2)}
            </p>
            <p className="text-sm text-white">
              EUR: {((cashDetail?.available_amounts?.EUR || 0) + (cashDetail?.pending_amounts?.EUR || 0)).toFixed(2)}
            </p>
            <p className="text-sm text-white">
              USD: {((cashDetail?.available_amounts?.USD || 0) + (cashDetail?.pending_amounts?.USD || 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>


      {/* 4 Kutu Görünümü */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Nakit Kutusu */}
        <div 
          className="bg-[#25272A] border-2 border-[#2D2F33] rounded-xl p-6 cursor-pointer transition-all hover:border-[#3EA6FF]/50 hover:shadow-lg hover:shadow-[#3EA6FF]/20"
          onClick={() => {
            setSelectedPaymentType('cash');
            setDetailModalOpen(true);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Nakit</h3>
            <div className="text-2xl font-bold text-[#3EA6FF]">
              {(() => {
                const cashPayments = cashDetail?.cash_payments || [];
                const totalTRY = cashPayments
                  .filter(t => t.currency === 'TRY')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                const totalEUR = cashPayments
                  .filter(t => t.currency === 'EUR')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                const totalUSD = cashPayments
                  .filter(t => t.currency === 'USD')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                return (totalTRY + totalEUR * (rates.EUR || 1) + totalUSD * (rates.USD || 1)).toFixed(2);
              })()} TRY
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[#A5A5A5] mb-1">TRY</p>
              <p className="text-white font-semibold">
                {(() => {
                  const cashPayments = cashDetail?.cash_payments || [];
                  return cashPayments
                    .filter(t => t.currency === 'TRY')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">EUR</p>
              <p className="text-white font-semibold">
                {(() => {
                  const cashPayments = cashDetail?.cash_payments || [];
                  return cashPayments
                    .filter(t => t.currency === 'EUR')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">USD</p>
              <p className="text-white font-semibold">
                {(() => {
                  const cashPayments = cashDetail?.cash_payments || [];
                  return cashPayments
                    .filter(t => t.currency === 'USD')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Banka Hesabı Kutusu */}
        <div 
          className="bg-[#25272A] border-2 border-[#2D2F33] rounded-xl p-6 cursor-pointer transition-all hover:border-[#3EA6FF]/50 hover:shadow-lg hover:shadow-[#3EA6FF]/20"
          onClick={() => {
            setSelectedPaymentType('bank');
            setDetailModalOpen(true);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Banka Hesabı</h3>
            <div className="text-2xl font-bold text-[#3EA6FF]">
              {(() => {
                const bankPayments = cashDetail?.bank_transfer_payments || [];
                const totalTRY = bankPayments
                  .filter(t => t.currency === 'TRY')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                const totalEUR = bankPayments
                  .filter(t => t.currency === 'EUR')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                const totalUSD = bankPayments
                  .filter(t => t.currency === 'USD')
                  .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                return (totalTRY + totalEUR * (rates.EUR || 1) + totalUSD * (rates.USD || 1)).toFixed(2);
              })()} TRY
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[#A5A5A5] mb-1">TRY</p>
              <p className="text-white font-semibold">
                {(() => {
                  const bankPayments = cashDetail?.bank_transfer_payments || [];
                  return bankPayments
                    .filter(t => t.currency === 'TRY')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">EUR</p>
              <p className="text-white font-semibold">
                {(() => {
                  const bankPayments = cashDetail?.bank_transfer_payments || [];
                  return bankPayments
                    .filter(t => t.currency === 'EUR')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">USD</p>
              <p className="text-white font-semibold">
                {(() => {
                  const bankPayments = cashDetail?.bank_transfer_payments || [];
                  return bankPayments
                    .filter(t => t.currency === 'USD')
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Kredi Kartı Hesabı Kutusu */}
        <div 
          className="bg-[#25272A] border-2 border-[#2D2F33] rounded-xl p-6 cursor-pointer transition-all hover:border-[#3EA6FF]/50 hover:shadow-lg hover:shadow-[#3EA6FF]/20"
          onClick={() => {
            setSelectedPaymentType('credit_card');
            setDetailModalOpen(true);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Kredi Kartı Hesabı</h3>
            <div className="text-right">
              {/* Mavi büyük puntolu: Kullanılabilir Tutar (modal'daki Kullanılabilir Tutar listesindeki net tutarların toplamı) */}
              <div className="text-2xl font-bold text-[#3EA6FF]">
                {(() => {
                  const creditCardPayments = cashDetail?.credit_card_payments || [];
                  const today = new Date().toISOString().split('T')[0];
                  // Kullanılabilir tutar: valor_date null veya valor_date <= today olanların net_amount toplamı
                  const availableTRY = creditCardPayments
                    .filter(t => t.currency === 'TRY' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                  const availableEUR = creditCardPayments
                    .filter(t => t.currency === 'EUR' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                  const availableUSD = creditCardPayments
                    .filter(t => t.currency === 'USD' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
                  return (availableTRY + availableEUR * (rates.EUR || 1) + availableUSD * (rates.USD || 1)).toFixed(2);
                })()} TRY
              </div>
              {/* Sarı küçük puntolu: Vadedeki Tutar (modal'daki Vadedeki Tutar listesindeki net tutarların toplamı) */}
              <div className="text-sm font-semibold text-yellow-400 mt-1">
                {(() => {
                  const valorList = cashDetail?.credit_card_valor_list || [];
                  // Vadedeki tutar: credit_card_valor_list'teki net_amount toplamı
                  const pendingTRY = valorList
                    .filter(item => item.currency === 'TRY')
                    .reduce((sum, item) => sum + (item.net_amount || 0), 0);
                  const pendingEUR = valorList
                    .filter(item => item.currency === 'EUR')
                    .reduce((sum, item) => sum + (item.net_amount || 0), 0);
                  const pendingUSD = valorList
                    .filter(item => item.currency === 'USD')
                    .reduce((sum, item) => sum + (item.net_amount || 0), 0);
                  return (pendingTRY + pendingEUR * (rates.EUR || 1) + pendingUSD * (rates.USD || 1)).toFixed(2);
                })()} TRY
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[#A5A5A5] mb-1">TRY</p>
              <p className="text-white font-semibold">
                {(() => {
                  const creditCardPayments = cashDetail?.credit_card_payments || [];
                  const today = new Date().toISOString().split('T')[0];
                  // Kullanılabilir tutar: valor_date null veya valor_date <= today olanların net_amount toplamı
                  return creditCardPayments
                    .filter(t => t.currency === 'TRY' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">EUR</p>
              <p className="text-white font-semibold">
                {(() => {
                  const creditCardPayments = cashDetail?.credit_card_payments || [];
                  const today = new Date().toISOString().split('T')[0];
                  return creditCardPayments
                    .filter(t => t.currency === 'EUR' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">USD</p>
              <p className="text-white font-semibold">
                {(() => {
                  const creditCardPayments = cashDetail?.credit_card_payments || [];
                  const today = new Date().toISOString().split('T')[0];
                  return creditCardPayments
                    .filter(t => t.currency === 'USD' && (!t.valor_date || t.valor_date <= today))
                    .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0).toFixed(2);
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Çek/Senet Kutusu */}
        <div 
          className="bg-[#25272A] border-2 border-[#2D2F33] rounded-xl p-6 cursor-pointer transition-all hover:border-[#3EA6FF]/50 hover:shadow-lg hover:shadow-[#3EA6FF]/20"
          onClick={() => {
            setSelectedPaymentType('check_promissory');
            setDetailModalOpen(true);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Çek/Senet</h3>
            <div className="text-right">
              {/* Mavi büyük puntolu: Kullanılabilir Tutar (modal'daki Kullanılabilir Tutar listesindeki net tutarların toplamı) */}
              <div className="text-2xl font-bold text-[#3EA6FF]">
                {(() => {
                  const checkList = cashDetail?.check_promissory_list || [];
                  const today = new Date().toISOString().split('T')[0];
                  // Kullanılabilir tutar: due_date <= today && is_collected olanların amount toplamı
                  const availableTRY = checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'TRY' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0);
                  const availableEUR = checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'EUR' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0);
                  const availableUSD = checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'USD' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0);
                  return (availableTRY + availableEUR * (rates.EUR || 1) + availableUSD * (rates.USD || 1)).toFixed(2);
                })()} TRY
              </div>
              {/* Sarı küçük puntolu: Vadedeki Tutar (modal'daki Vadedeki Tutar listesindeki net tutarların toplamı) */}
              <div className="text-sm font-semibold text-yellow-400 mt-1">
                {(() => {
                  const valorList = cashDetail?.check_promissory_valor_list || [];
                  // Vadedeki tutar: check_promissory_valor_list'teki amount toplamı
                  const pendingTRY = valorList
                    .filter(item => item.currency === 'TRY')
                    .reduce((sum, item) => sum + (item.amount || 0), 0);
                  const pendingEUR = valorList
                    .filter(item => item.currency === 'EUR')
                    .reduce((sum, item) => sum + (item.amount || 0), 0);
                  const pendingUSD = valorList
                    .filter(item => item.currency === 'USD')
                    .reduce((sum, item) => sum + (item.amount || 0), 0);
                  return (pendingTRY + pendingEUR * (rates.EUR || 1) + pendingUSD * (rates.USD || 1)).toFixed(2);
                })()} TRY
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[#A5A5A5] mb-1">TRY</p>
              <p className="text-white font-semibold">
                {(() => {
                  const checkList = cashDetail?.check_promissory_list || [];
                  const today = new Date().toISOString().split('T')[0];
                  return checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'TRY' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">EUR</p>
              <p className="text-white font-semibold">
                {(() => {
                  const checkList = cashDetail?.check_promissory_list || [];
                  const today = new Date().toISOString().split('T')[0];
                  return checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'EUR' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0).toFixed(2);
                })()}
              </p>
            </div>
            <div>
              <p className="text-[#A5A5A5] mb-1">USD</p>
              <p className="text-white font-semibold">
                {(() => {
                  const checkList = cashDetail?.check_promissory_list || [];
                  const today = new Date().toISOString().split('T')[0];
                  return checkList
                    .filter(item => {
                      const check = item.transaction || item;
                      return check.currency === 'USD' && check.due_date && check.due_date <= today && check.is_collected;
                    })
                    .reduce((sum, item) => {
                      const check = item.transaction || item;
                      return sum + (check.amount || 0);
                    }, 0).toFixed(2);
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detay Modal */}
      <Dialog open={detailModalOpen} onOpenChange={(open) => {
        setDetailModalOpen(open);
        if (open) {
          // Modal açıldığında veriyi yenile
          fetchCashData();
        }
      }}>
        <DialogContent className={`max-w-5xl ${selectedPaymentType === 'credit_card' ? 'max-h-[85vh]' : 'max-h-[90vh]'} overflow-y-auto bg-[#1A1B1E] border-[#2D2F33] z-[100]`}>
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              {selectedPaymentType === 'cash' && 'Nakit Detayları'}
              {selectedPaymentType === 'bank' && 'Banka Hesabı Detayları'}
              {selectedPaymentType === 'credit_card' && 'Kredi Kartı Hesabı Detayları'}
              {selectedPaymentType === 'check_promissory' && 'Çek/Senet Detayları'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPaymentType === 'cash' && (
            <div className="mt-4 space-y-4">
              {/* Döviz Gösterge Kutuları */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {['TRY', 'EUR', 'USD'].map((currency) => {
              const cashPayments = cashDetail?.cash_payments || [];
              const total = cashPayments
                .filter(t => t.currency === currency)
                .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
              const tryValue = currency === 'TRY' ? total : total * (rates[currency] || 1);
              
              return (
                <div
                  key={currency}
                  className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4 hover:border-[#3EA6FF]/50 transition-all cursor-pointer"
                  onClick={() => {
                    if (currency !== 'TRY') {
                      setExchangeFormData({
                        ...exchangeFormData,
                        from_currency: currency,
                        to_currency: 'TRY',
                        exchange_rate: rates[currency] || 1.0
                      });
                      setExchangeDialogOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCurrencyIcon(currency)}
                    <p className="text-xl font-bold text-white">{total.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mb-1">{currency}</p>
                  {currency !== 'TRY' && (
                    <p className="text-xs text-blue-400">
                      {tryValue.toFixed(2)} TRY
                    </p>
                  )}
                </div>
                );
                })}
              </div>

              {/* Nakit Transaction'ları - Kullanılabilir Tutar Listesi */}
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Kullanılabilir Tutar</h3>
                  <Button
                    size="sm"
                    onClick={() => setTransferDialogOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Transfer
                  </Button>
                </div>
                {cashDetail?.cash_payments && cashDetail.cash_payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Cari Firma</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D2F33]">
                        {cashDetail.cash_payments.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-white text-sm font-medium">{transaction.cari_name || '-'}</td>
                            <td className="px-4 py-3 text-white text-sm">
                              {transaction.date ? formatDateStringDDMMYYYY(transaction.date) : '-'}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">
                              {transaction.time || '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-white text-sm font-semibold">
                              {(transaction.net_amount || transaction.amount || 0).toFixed(2)} {transaction.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[#A5A5A5]">Henüz nakit işlem bulunmamaktadır</p>
                  </div>
                )}
              </div>

              {/* Döviz İşlem Geçmişi */}
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Döviz İşlem Geçmişi</h3>
                {exchangeHistory.filter(e => e.payment_method === 'cash').length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kaynak</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Hedef</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-white">Kur</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-white">Sonuç</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D2F33]">
                        {exchangeHistory.filter(e => e.payment_method === 'cash').map((exchange) => (
                          <tr key={exchange.id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-white text-sm">
                              {exchange.date ? formatDateStringDDMMYYYY(exchange.date) : '-'}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">
                              {exchange.from_amount} {exchange.from_currency}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">
                              {exchange.to_amount} {exchange.to_currency}
                            </td>
                            <td className="px-4 py-3 text-right text-white text-sm">
                              {exchange.exchange_rate?.toFixed(4)}
                            </td>
                            <td className="px-4 py-3 text-right text-white text-sm">
                              {exchange.to_amount?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[#A5A5A5]">Henüz döviz işlemi bulunmamaktadır</p>
                  </div>
                )}
          </div>
            </div>
          )}

          {selectedPaymentType === 'bank' && (
            <div className="mt-4 space-y-4">
          {/* Döviz Gösterge Kutuları */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {['TRY', 'EUR', 'USD'].map((currency) => {
              const bankPayments = cashDetail?.bank_transfer_payments || [];
              const total = bankPayments
                .filter(t => t.currency === currency)
                .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
              const tryValue = currency === 'TRY' ? total : total * (rates[currency] || 1);
              
              return (
                <div
                  key={currency}
                  className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4 hover:border-[#3EA6FF]/50 transition-all cursor-pointer"
                  onClick={() => {
                    if (currency !== 'TRY') {
                      setExchangeFormData({
                        ...exchangeFormData,
                        from_currency: currency,
                        to_currency: 'TRY',
                        exchange_rate: rates[currency] || 1.0
                      });
                      setExchangeDialogOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCurrencyIcon(currency)}
                    <p className="text-xl font-bold text-white">{total.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mb-1">{currency}</p>
                  {currency !== 'TRY' && (
                    <p className="text-xs text-blue-400">
                      {tryValue.toFixed(2)} TRY
                    </p>
                  )}
                </div>
              );
            })}
              </div>

              {/* Havale Transaction'ları - Kullanılabilir Tutar Listesi */}
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Kullanılabilir Tutar</h3>
              <Button
                size="sm"
                onClick={() => setTransferDialogOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Transfer
              </Button>
            </div>
            {cashDetail?.bank_transfer_payments && cashDetail.bank_transfer_payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Cari Hesap</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Banka Hesabı</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Para Birimi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {cashDetail.bank_transfer_payments.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {transaction.date ? formatDateStringDDMMYYYY(transaction.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {transaction.time || '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{transaction.cari_name || '-'}</td>
                        <td className="px-4 py-3 text-[#A5A5A5] text-sm">{transaction.bank_account_name || '-'}</td>
                        <td className="px-4 py-3 text-right text-white text-sm font-semibold">
                          {(transaction.net_amount || transaction.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{transaction.currency}</td>
                        <td className="px-4 py-3 text-[#A5A5A5] text-sm">{transaction.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Henüz havale işlemi bulunmamaktadır</p>
              </div>
            )}
          </div>

          {/* Döviz İşlem Geçmişi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Döviz İşlem Geçmişi</h3>
            {exchangeHistory.filter(e => e.payment_method === 'bank_transfer').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kaynak</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Hedef</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Kur</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {exchangeHistory.filter(e => e.payment_method === 'bank_transfer').map((exchange) => (
                      <tr key={exchange.id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.date ? formatDateStringDDMMYYYY(exchange.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.from_amount} {exchange.from_currency}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.to_amount} {exchange.to_currency}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.exchange_rate?.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.to_amount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Henüz döviz işlemi bulunmamaktadır</p>
              </div>
            )}
              </div>
            </div>
          )}

          {selectedPaymentType === 'credit_card' && (
            <div className="mt-4 space-y-4">
              {/* Döviz Gösterge Kutuları - Kullanılabilir */}
              <div className="grid grid-cols-3 gap-4 mb-4">
            {['TRY', 'EUR', 'USD'].map((currency) => {
              const creditCardPayments = cashDetail?.credit_card_payments || [];
              const today = new Date().toISOString().split('T')[0];
              const available = creditCardPayments
                .filter(t => t.currency === currency && (!t.valor_date || t.valor_date <= today))
                .reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0);
              const tryValue = currency === 'TRY' ? available : available * (rates[currency] || 1);
              
              return (
                <div
                  key={currency}
                  className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4 hover:border-[#3EA6FF]/50 transition-all cursor-pointer"
                  onClick={() => {
                    if (currency !== 'TRY') {
                      setExchangeFormData({
                        ...exchangeFormData,
                        from_currency: currency,
                        to_currency: 'TRY',
                        exchange_rate: rates[currency] || 1.0
                      });
                      setExchangeDialogOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCurrencyIcon(currency)}
                    <p className="text-xl font-bold text-white">{available.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mb-1">Kullanılabilir - {currency}</p>
                  {currency !== 'TRY' && (
                    <p className="text-xs text-blue-400">
                      {tryValue.toFixed(2)} TRY
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Kullanılabilir Tutar Listesi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Kullanılabilir Tutar</h3>
              <Button
                size="sm"
                onClick={() => setTransferDialogOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Transfer
              </Button>
            </div>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const availablePayments = (cashDetail?.credit_card_payments || []).filter(
                t => !t.valor_date || t.valor_date <= today
              );
              
              return availablePayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Cari Hesap</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kredi Kartı</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Toplam</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Komisyon</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Komisyon Oranı</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Net Tutar</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Para Birimi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2F33]">
                      {availablePayments.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                          <td className="px-4 py-3 text-white text-sm">
                            {transaction.date ? formatDateStringDDMMYYYY(transaction.date) : '-'}
                          </td>
                          <td className="px-4 py-3 text-white text-sm">
                            {transaction.time || '-'}
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{transaction.cari_name || '-'}</td>
                          <td className="px-4 py-3 text-[#A5A5A5] text-sm">{transaction.bank_account_name || '-'}</td>
                          <td className="px-4 py-3 text-right text-white text-sm">
                            {transaction.amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-400 text-sm">
                            {transaction.commission_amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-right text-[#A5A5A5] text-sm">
                            {transaction.commission_rate ? `${transaction.commission_rate}%` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 text-sm font-semibold">
                            {(transaction.net_amount || transaction.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{transaction.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Kullanılabilir tutar bulunmamaktadır</p>
                </div>
              );
            })()}
          </div>

          {/* Vadedeki Tutar Listesi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Vadedeki Tutar</h3>
            {cashDetail?.credit_card_valor_list && cashDetail.credit_card_valor_list.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Valör Tarihi</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Toplam Tutar</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Komisyon</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Komisyon Oranı</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Net Tutar</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Valör Süresi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kalan Gün</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Para Birimi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {cashDetail.credit_card_valor_list.map((item) => (
                      <tr key={item.transaction_id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {item.date ? formatDateStringDDMMYYYY(item.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {item.time || '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {item.valor_date ? formatDateStringDDMMYYYY(item.valor_date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {item.original_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400 text-sm">
                          {item.commission_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-right text-[#A5A5A5] text-sm">
                          {item.commission_rate ? `${item.commission_rate}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 text-sm font-semibold">
                          {item.net_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-[#A5A5A5] text-sm">
                          {item.valor_days ? `${item.valor_days} gün` : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.days_remaining < 0 ? 'bg-red-500/20 text-red-400' :
                            item.days_remaining <= 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.days_remaining} gün
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{item.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Vadedeki tutar bulunmamaktadır</p>
              </div>
            )}
          </div>

          {/* Döviz İşlem Geçmişi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Döviz İşlem Geçmişi</h3>
            {exchangeHistory.filter(e => e.payment_method === 'credit_card').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kaynak</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Hedef</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Kur</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {exchangeHistory.filter(e => e.payment_method === 'credit_card').map((exchange) => (
                      <tr key={exchange.id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.date ? formatDateStringDDMMYYYY(exchange.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.from_amount} {exchange.from_currency}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.to_amount} {exchange.to_currency}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.exchange_rate?.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.to_amount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Henüz döviz işlemi bulunmamaktadır</p>
              </div>
            )}
              </div>
            </div>
          )}

          {selectedPaymentType === 'check_promissory' && (
            <div className="mt-4 space-y-4">
              {/* Döviz Gösterge Kutuları - Kullanılabilir */}
              <div className="grid grid-cols-3 gap-4 mb-4">
            {['TRY', 'EUR', 'USD'].map((currency) => {
              const checkList = cashDetail?.check_promissory_list || [];
              const today = new Date().toISOString().split('T')[0];
              const available = checkList
                .filter(item => {
                  const check = item.transaction || item;
                  return check.currency === currency && 
                         check.due_date && 
                         check.due_date <= today && 
                         check.is_collected;
                })
                .reduce((sum, item) => {
                  const check = item.transaction || item;
                  return sum + (check.amount || 0);
                }, 0);
              const tryValue = currency === 'TRY' ? available : available * (rates[currency] || 1);
              
              return (
                <div
                  key={currency}
                  className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4 hover:border-[#3EA6FF]/50 transition-all cursor-pointer"
                  onClick={() => {
                    if (currency !== 'TRY') {
                      setExchangeFormData({
                        ...exchangeFormData,
                        from_currency: currency,
                        to_currency: 'TRY',
                        exchange_rate: rates[currency] || 1.0
                      });
                      setExchangeDialogOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCurrencyIcon(currency)}
                    <p className="text-xl font-bold text-white">{available.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mb-1">Kullanılabilir - {currency}</p>
                  {currency !== 'TRY' && (
                    <p className="text-xs text-blue-400">
                      {tryValue.toFixed(2)} TRY
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Kullanılabilir Tutar Listesi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Kullanılabilir Tutar</h3>
              <Button
                size="sm"
                onClick={() => setTransferDialogOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Transfer
              </Button>
            </div>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const checkList = cashDetail?.check_promissory_list || [];
              // Vade tarihine göre sırala (en yakın vade en üstte)
              const sortedCheckList = [...checkList].sort((a, b) => {
                const dueDateA = (a.transaction?.due_date || a.due_date || '9999-12-31');
                const dueDateB = (b.transaction?.due_date || b.due_date || '9999-12-31');
                return dueDateA.localeCompare(dueDateB);
              });
              const availableChecks = sortedCheckList.filter(item => {
                const check = item.transaction || item;
                return check.due_date && check.due_date <= today && check.is_collected;
              });
              
              return availableChecks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Cari Hesap</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Vade Tarihi</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Çek/Senet No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Banka</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Para Birimi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2F33]">
                      {availableChecks.map((item) => {
                        const check = item.transaction || item;
                        // Transaction'dan date ve time bilgilerini al
                        const transactionDate = item.date || check.date || (item.transaction && item.transaction.date);
                        const transactionTime = item.time || check.time || (item.transaction && item.transaction.time);
                        return (
                          <tr key={check.id || check.transaction_id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-white text-sm">
                              {transactionDate ? formatDateStringDDMMYYYY(transactionDate) : '-'}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">
                              {transactionTime || '-'}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">{check.cari_name || item.cari_name || '-'}</td>
                            <td className="px-4 py-3 text-white text-sm">
                              {check.due_date ? formatDateStringDDMMYYYY(check.due_date) : '-'}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">{check.check_number || item.check_number || '-'}</td>
                            <td className="px-4 py-3 text-white text-sm">{check.bank_name || item.bank_name || '-'}</td>
                            <td className="px-4 py-3 text-right text-white text-sm font-semibold">
                              {(check.amount || item.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-white text-sm">{check.currency || item.currency}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Kullanılabilir tutar bulunmamaktadır</p>
                </div>
              );
            })()}
          </div>

          {/* Vadedeki Tutar Listesi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Vadedeki Tutar</h3>
            {cashDetail?.check_promissory_valor_list && cashDetail.check_promissory_valor_list.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Vade Tarihi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Cari Hesap</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Çek/Senet No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Banka</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kalan Gün</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Para Birimi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {cashDetail.check_promissory_valor_list.map((item) => (
                      <tr key={item.check_id || item.transaction_id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {item.date ? formatDateStringDDMMYYYY(item.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {item.time || '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {item.due_date ? formatDateStringDDMMYYYY(item.due_date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{item.cari_name || '-'}</td>
                        <td className="px-4 py-3 text-white text-sm">{item.check_number || '-'}</td>
                        <td className="px-4 py-3 text-white text-sm">{item.bank_name || '-'}</td>
                        <td className="px-4 py-3 text-right text-white text-sm font-semibold">
                          {item.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.days_remaining < 0 ? 'bg-red-500/20 text-red-400' :
                            item.days_remaining <= 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.days_remaining} gün
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{item.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Vadedeki tutar bulunmamaktadır</p>
              </div>
            )}
          </div>

          {/* Döviz İşlem Geçmişi */}
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Döviz İşlem Geçmişi</h3>
            {exchangeHistory.filter(e => e.payment_method === 'check_promissory').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Kaynak</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Hedef</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Kur</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-white">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {exchangeHistory.filter(e => e.payment_method === 'check_promissory').map((exchange) => (
                      <tr key={exchange.id} className="hover:bg-[#2D2F33]">
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.date ? formatDateStringDDMMYYYY(exchange.date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.from_amount} {exchange.from_currency}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {exchange.to_amount} {exchange.to_currency}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.exchange_rate?.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          {exchange.to_amount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">Henüz döviz işlemi bulunmamaktadır</p>
              </div>
            )}
          </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Para Birimi Kartları - Eski (Kaldırılabilir) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 hidden">
        {['EUR', 'USD', 'TRY'].map((currency) => (
          <div
            key={currency}
            className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6 hover:border-[#3EA6FF]/50 transition-all cursor-pointer"
            onClick={() => {
              if (currency !== 'TRY') {
                setExchangeFormData({
                  ...exchangeFormData,
                  from_currency: currency,
                  to_currency: 'TRY',
                  exchange_rate: rates[currency] || 1.0
                });
                setExchangeDialogOpen(true);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              {getCurrencyIcon(currency)}
              <p className="text-2xl font-bold text-white">
                {(cashDetail?.total_amounts?.[currency] || 0).toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-[#A5A5A5] mb-2">{currency} Bakiye</p>
            {currency !== 'TRY' && (
              <>
                <p className="text-xs text-[#A5A5A5] mb-1">
                  TRY Değeri: {calculateTryValue(cashDetail?.total_amounts?.[currency] || 0, currency).toFixed(2)} TRY
                </p>
                <p className="text-xs text-blue-400">
                  1 {currency} = {rates[currency]?.toFixed(2)} TRY
                </p>
              </>
            )}
          </div>
        ))}
      </div>


      {/* Valör Süresindeki Tutarlar */}
      {valorPending.length > 0 && (
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">Valör Süresindeki Tutarlar</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Valör Tarihi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kalan Gün</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Orijinal Tutar</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Komisyon</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Net Tutar</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Para Birimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2F33]">
                {valorPending.map((transaction) => {
                  const valorDate = transaction.valor_date ? new Date(transaction.valor_date) : null;
                  const today = new Date();
                  const daysRemaining = valorDate ? Math.ceil((valorDate - today) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.date ? formatDateStringDDMMYYYY(transaction.date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.valor_date ? formatDateStringDDMMYYYY(transaction.valor_date) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${
                          daysRemaining < 0 ? 'text-red-400' :
                          daysRemaining <= 3 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {daysRemaining} gün
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {transaction.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right text-red-400 text-sm">
                        {transaction.commission_amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right text-green-400 text-sm font-semibold">
                        {transaction.net_amount?.toFixed(2) || transaction.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{transaction.currency}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Döviz İşlem Geçmişi */}
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Döviz İşlem Geçmişi</h2>
          <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3EA6FF] hover:bg-[#2D8CE6] text-white">
                Döviz Çevir
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white z-[110]">
              <DialogHeader>
                <DialogTitle>Döviz Çevirisi</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Kaynak Para Birimi</label>
                  <select
                    value={exchangeFormData.from_currency}
                    onChange={(e) => {
                      const fromCurrency = e.target.value;
                      // Tüm aktif cash_accounts'tan o para birimine sahip olanları bul
                      const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === fromCurrency);
                      const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
                      calculateExchangeRate(fromCurrency, exchangeFormData.to_currency);
                      setExchangeFormData({
                        ...exchangeFormData,
                        from_currency: fromCurrency,
                        from_account_id: cashAccount?.id || ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Dolar</option>
                    <option value="TRY">TRY - Türk Lirası</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Hedef Para Birimi</label>
                  <select
                    value={exchangeFormData.to_currency}
                    onChange={(e) => {
                      const toCurrency = e.target.value;
                      // Tüm aktif cash_accounts'tan o para birimine sahip olanları bul
                      const matchingAccounts = cashAccounts.filter(acc => acc.is_active && acc.currency === toCurrency);
                      const cashAccount = matchingAccounts.find(acc => acc.account_type === 'cash') || matchingAccounts[0];
                      calculateExchangeRate(exchangeFormData.from_currency, toCurrency);
                      setExchangeFormData({
                        ...exchangeFormData,
                        to_currency: toCurrency,
                        to_account_id: cashAccount?.id || ''
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
                  <label className="block text-sm font-medium mb-2 text-white">Tutar ({exchangeFormData.from_currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exchangeFormData.amount}
                    onChange={(e) => setExchangeFormData({ ...exchangeFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Kur</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeFormData.exchange_rate}
                    onChange={(e) => setExchangeFormData({ ...exchangeFormData, exchange_rate: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    1 {exchangeFormData.from_currency} = {exchangeFormData.exchange_rate} {exchangeFormData.to_currency}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    Alınacak Tutar: {(parseFloat(exchangeFormData.amount || 0) * parseFloat(exchangeFormData.exchange_rate || 0)).toFixed(2)} {exchangeFormData.to_currency}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Tarih</label>
                  <input
                    type="date"
                    value={exchangeFormData.date}
                    onChange={(e) => setExchangeFormData({ ...exchangeFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExchangeDialogOpen(false)}
                    className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                    Döviz Boz
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="date"
            placeholder="Başlangıç"
            value={exchangeHistoryFilters.date_from}
            onChange={(e) => setExchangeHistoryFilters({ ...exchangeHistoryFilters, date_from: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <input
            type="date"
            placeholder="Bitiş"
            value={exchangeHistoryFilters.date_to}
            onChange={(e) => setExchangeHistoryFilters({ ...exchangeHistoryFilters, date_to: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          />
          <select
            value={exchangeHistoryFilters.currency}
            onChange={(e) => setExchangeHistoryFilters({ ...exchangeHistoryFilters, currency: e.target.value })}
            className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Tüm Para Birimleri</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="TRY">TRY</option>
          </select>
        </div>

        {/* Tablo */}
        {exchangeHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#A5A5A5]">Henüz döviz işlemi bulunmuyor</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33]">
                <tr>
                  <th className="px-4 py-3 text-left text-white font-semibold">Tarih</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Çıkış</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Giriş</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Kur</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {exchangeHistory.map((exchange) => (
                  <tr key={exchange.id} className="border-t border-[#2D2F33] hover:bg-[#2D2F33]/50">
                    <td className="px-4 py-3 text-white">{formatDateStringDDMMYYYY(exchange.date)}</td>
                    <td className="px-4 py-3 text-red-400">
                      {exchange.from_amount?.toFixed(2)} {exchange.from_currency}
                    </td>
                    <td className="px-4 py-3 text-green-400">
                      {exchange.to_amount?.toFixed(2)} {exchange.to_currency}
                    </td>
                    <td className="px-4 py-3 text-white">{exchange.exchange_rate?.toFixed(4)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteExchange(exchange.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md z-[110]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Kaynak Hesap</label>
              <select
                value={transferFormData.from_account_id}
                onChange={(e) => setTransferFormData({
                  ...transferFormData,
                  from_account_id: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              >
                <option value="">Seçiniz</option>
                {cashAccounts
                  .filter(acc => acc.is_active && 
                    (acc.account_type === 'cash' || acc.account_type === 'bank_account' || acc.account_type === 'credit_card'))
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.currency})
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Hedef Hesap</label>
              <select
                value={transferFormData.to_account_id}
                onChange={(e) => {
                  const toAccount = cashAccounts.find(acc => acc.id === e.target.value);
                  setTransferFormData({
                    ...transferFormData,
                    to_account_id: e.target.value,
                    currency: toAccount?.currency || 'TRY'
                  });
                }}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              >
                <option value="">Seçiniz</option>
                {cashAccounts
                  .filter(acc => 
                    acc.id !== transferFormData.from_account_id && 
                    acc.is_active &&
                    (acc.account_type === 'cash' || acc.account_type === 'bank_account')
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.currency})
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Tutar ({transferFormData.currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={transferFormData.amount}
                onChange={(e) => setTransferFormData({
                  ...transferFormData,
                  amount: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
              <textarea
                value={transferFormData.description}
                onChange={(e) => setTransferFormData({
                  ...transferFormData,
                  description: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                rows="3"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Tarih</label>
              <input
                type="date"
                value={transferFormData.date}
                onChange={(e) => setTransferFormData({
                  ...transferFormData,
                  date: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferDialogOpen(false)}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                Transfer Et
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashDetail;

