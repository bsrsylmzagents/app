import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Download, Calendar, DollarSign, Package, CreditCard, Receipt, Printer, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { downloadVoucherPdf, printVoucherPdf } from '../utils/voucherPdf';
import { formatDate, formatDateStringDDMMYYYY } from '../utils/dateFormatter';
import useConfirmDialog from '../hooks/useConfirmDialog';
import Loading from '../components/Loading';

const CariDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cari, setCari] = useState(null);
  const [cariDetail, setCariDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [servicePurchases, setServicePurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [outgoingPayments, setOutgoingPayments] = useState([]);
  const [rates, setRates] = useState({ EUR: 1.0, USD: 1.1, TRY: 35.0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statement'); // 'statement', 'services', 'purchased_services', 'payments', 'outgoing_payments'
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editTransactionFormData, setEditTransactionFormData] = useState({});
  const { confirm: confirmDialog, dialog: confirmDialogElement } = useConfirmDialog();
  const [cariAccounts, setCariAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [filteredCariAccounts, setFilteredCariAccounts] = useState([]);
  const [totalBalanceInTRY, setTotalBalanceInTRY] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [outgoingPaymentDialogOpen, setOutgoingPaymentDialogOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
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
  const [outgoingPaymentFormData, setOutgoingPaymentFormData] = useState({
    amount: '',
    currency: 'EUR',
    payment_type_id: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });


  useEffect(() => {
    fetchCariDetail();
    fetchPaymentTypes();
    fetchRates();
    fetchBankAccounts();
    fetchCariAccounts();
  }, [id]);

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
    if (paymentFormData.transfer_to_cari_search && paymentFormData.transfer_to_cari_search.length >= 2) {
      const filtered = cariAccounts.filter(c => 
        c.id !== id && 
        c.name.toLowerCase().includes(paymentFormData.transfer_to_cari_search.toLowerCase())
      );
      setFilteredCariAccounts(filtered);
    } else {
      setFilteredCariAccounts([]);
    }
  }, [paymentFormData.transfer_to_cari_search, cariAccounts, id]);

  const fetchCariDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/cari-accounts/${id}`);
      setCari(response.data.cari);
      setCariDetail(response.data);
      setTransactions(response.data.transactions || []);
      setReservations(response.data.reservations || []);
      setServicePurchases(response.data.service_purchases || []);
      setCustomers(response.data.customers || []);
      // Outgoing payments (reference_type: 'outgoing_payment')
      const outgoing = (response.data.transactions || []).filter(t => t.reference_type === 'outgoing_payment');
      setOutgoingPayments(outgoing);
      
      // Münferit cari için varsayılan sekme "customers" olsun
      if (response.data.cari?.is_munferit || response.data.cari?.name === "Münferit") {
        setActiveTab('customers');
      }
    } catch (error) {
      toast.error('Cari detayları yüklenemedi');
      console.error('Error fetching cari detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      setPaymentTypes(response.data);
    } catch (error) {
      console.error('Error fetching payment types:', error);
    }
  };

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates`);
      setRates(response.data.rates);
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get(`${API}/bank-accounts`);
      setBankAccounts(response.data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data);
    } catch (error) {
      console.error('Error fetching cari accounts:', error);
    }
  };

  const calculateTryValue = (amount, currency) => {
    if (!rates || currency === 'TRY') return amount;
    return amount * (rates[currency] || 0);
  };

  const calculateTotalBalanceInTRY = () => {
    if (!cari || !rates) return 0;
    
    const eurBalance = cari.balance_eur || 0;
    const usdBalance = cari.balance_usd || 0;
    const tryBalance = cari.balance_try || 0;
    
    // EUR ve USD'yi TRY'ye çevir
    const eurInTRY = eurBalance * (rates.EUR || 0);
    const usdInTRY = usdBalance * (rates.USD || 0);
    
    // Toplam TRY
    const total = eurInTRY + usdInTRY + tryBalance;
    
    return total;
  };

  useEffect(() => {
    if (cari && rates) {
      const total = calculateTotalBalanceInTRY();
      setTotalBalanceInTRY(total);
    }
  }, [cari, rates]);

  const getTransactionTypeLabel = (type) => {
    const labels = {
      'debit': 'Borç',
      'credit': 'Alacak',
      'payment': 'Tahsilat',
      'refund': 'İade'
    };
    return labels[type] || type;
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setEditTransactionFormData({
      amount: transaction.amount,
      currency: transaction.currency,
      payment_type_id: transaction.payment_type_id || '',
      description: transaction.description || '',
      date: transaction.date || format(new Date(), 'yyyy-MM-dd'),
      bank_account_id: transaction.bank_account_id || '',
      transfer_to_cari_id: transaction.transfer_to_cari_id || '',
      due_date: transaction.due_date || '',
      check_number: transaction.check_number || '',
      bank_name: transaction.bank_name || ''
    });
    setEditTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = async (transactionId) => {
    const confirmed = await confirmDialog({
      title: 'İşlemi Sil',
      message: 'Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API}/transactions/${transactionId}`);
      toast.success('İşlem silindi');
      fetchCariDetail();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem silinemedi');
      console.error('Error deleting transaction:', error);
    }
  };

  const handleRecalculateBalance = async () => {
    try {
      setRecalculating(true);
      const response = await axios.post(`${API}/cari-accounts/${id}/recalculate-balance`);
      toast.success('Bakiye yeniden hesaplandı');
      fetchCariDetail(); // Veriyi yeniden yükle
    } catch (error) {
      console.error('Bakiye yeniden hesaplanamadı:', error);
      toast.error(error.response?.data?.detail || 'Bakiye yeniden hesaplanamadı');
    } finally {
      setRecalculating(false);
    }
  };

  const handleEditTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(editTransactionFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      await axios.put(`${API}/transactions/${editingTransaction.id}`, {
        amount: amount,
        currency: editTransactionFormData.currency,
        payment_type_id: editTransactionFormData.payment_type_id || null,
        description: editTransactionFormData.description || '',
        date: editTransactionFormData.date,
        bank_account_id: editTransactionFormData.bank_account_id || null,
        transfer_to_cari_id: editTransactionFormData.transfer_to_cari_id || null,
        due_date: editTransactionFormData.due_date || null,
        check_number: editTransactionFormData.check_number || null,
        bank_name: editTransactionFormData.bank_name || null
      });

      toast.success('İşlem güncellendi');
      setEditTransactionDialogOpen(false);
      setEditingTransaction(null);
      setEditTransactionFormData({});
      fetchCariDetail();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem güncellenemedi');
      console.error('Error updating transaction:', error);
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
        cari_id: id,
        transaction_type: 'payment',
        amount: amount,
        currency: paymentFormData.currency,
        exchange_rate: exchangeRate,
        payment_type_id: paymentType.id,
        payment_type_name: paymentType.name,
        description: paymentFormData.description || `Tahsilat - ${format(new Date(paymentFormData.date), 'dd.MM.yyyy', { locale: tr })}`,
        reference_id: null,
        reference_type: 'manual',
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
      setPaymentFormData({
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
      fetchCariDetail();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Tahsilat eklenemedi');
      console.error('Error adding payment:', error);
    }
  };

  const handleOutgoingPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(outgoingPaymentFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Geçerli bir tutar giriniz');
        return;
      }

      const exchangeRate = rates[outgoingPaymentFormData.currency] || 1.0;
      
      await axios.post(`${API}/transactions`, {
        cari_id: id,
        transaction_type: 'payment',
        amount: amount,
        currency: outgoingPaymentFormData.currency,
        exchange_rate: exchangeRate,
        payment_type_id: outgoingPaymentFormData.payment_type_id || null,
        description: outgoingPaymentFormData.description || `Ödeme - ${format(new Date(outgoingPaymentFormData.date), 'dd.MM.yyyy', { locale: tr })}`,
        reference_id: null,
        reference_type: 'outgoing_payment',
        date: outgoingPaymentFormData.date
      });

      toast.success('Ödeme başarıyla eklendi');
      setOutgoingPaymentDialogOpen(false);
      setOutgoingPaymentFormData({
        amount: '',
        currency: 'TRY',
        payment_type_id: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchCariDetail();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ödeme eklenemedi');
      console.error('Error adding outgoing payment:', error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!cari) {
    return (
      <div className="text-center py-12">
        <p className="text-[#A5A5A5]">Cari firma bulunamadı</p>
        <Button onClick={() => navigate('/cari-accounts')} className="mt-4">
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cari-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/cari-accounts')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-[#2D2F33]"
          >
            <ArrowLeft size={16} className="mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{cari.name}</h1>
            {!cari.is_munferit && cari.name !== "Münferit" && cari.authorized_person && (
              <p className="text-[#A5A5A5] mt-1">Yetkili: {cari.authorized_person}</p>
            )}
          </div>
        </div>
        {(!cari?.is_munferit && cari?.name !== "Münferit") && (
        <div className="flex gap-2">
          <Dialog 
            open={paymentDialogOpen} 
            onOpenChange={(open) => {
              setPaymentDialogOpen(open);
              if (open) {
                const now = new Date();
                const balance = cari?.balance_try || 0;
                setPaymentFormData({
                  amount: Math.abs(balance).toFixed(2),
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
          <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Tahsilat Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Para Birimi *</label>
                <select
                  value={paymentFormData.currency}
                  onChange={(e) => {
                    const selectedCurrency = e.target.value;
                    const balance = selectedCurrency === 'EUR' 
                      ? (cari?.balance_eur || 0)
                      : selectedCurrency === 'USD'
                      ? (cari?.balance_usd || 0)
                      : (cari?.balance_try || 0);
                    
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
                <p className="text-xs text-[#A5A5A5] mt-1">
                  Mevcut Bakiye: {
                    paymentFormData.currency === 'EUR' 
                      ? (cari?.balance_eur || 0).toFixed(2)
                      : paymentFormData.currency === 'USD'
                      ? (cari?.balance_usd || 0).toFixed(2)
                      : (cari?.balance_try || 0).toFixed(2)
                  } {paymentFormData.currency}
                </p>
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
                  {filteredCariAccounts.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-[#2D2F33] rounded-lg bg-[#1E1E1E]">
                      {filteredCariAccounts.map((cari) => {
                        const balance = paymentFormData.currency === 'EUR' 
                          ? (cari.balance_eur || 0)
                          : paymentFormData.currency === 'USD'
                          ? (cari.balance_usd || 0)
                          : (cari.balance_try || 0);
                        return (
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
                            className="px-3 py-2 hover:bg-[#2D2F33] cursor-pointer text-white text-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span>{cari.name}</span>
                              <span className="text-xs text-[#A5A5A5]">
                                Bakiye: {balance.toFixed(2)} {paymentFormData.currency}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {paymentFormData.transfer_to_cari_search.length >= 2 && filteredCariAccounts.length === 0 && (
                    <p className="text-xs text-[#A5A5A5] mt-1">Cari hesap bulunamadı</p>
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
                    setPaymentFormData({
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
                  }}
                  className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Ekle
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          
          <Button
            onClick={handleRecalculateBalance}
            disabled={recalculating}
            className="bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
          >
            <RefreshCw size={18} className={`mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Hesaplanıyor...' : 'Bakiyeyi Yeniden Hesapla'}
          </Button>
          
          <Dialog open={outgoingPaymentDialogOpen} onOpenChange={setOutgoingPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <Plus size={18} className="mr-2" />
                Ödeme Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Ödeme Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleOutgoingPaymentSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Para Birimi *</label>
                  <select
                    value={outgoingPaymentFormData.currency}
                    onChange={(e) => {
                      const selectedCurrency = e.target.value;
                      const balance = selectedCurrency === 'EUR' 
                        ? (cari?.balance_eur || 0)
                        : selectedCurrency === 'USD'
                        ? (cari?.balance_usd || 0)
                        : (cari?.balance_try || 0);
                      
                      setOutgoingPaymentFormData({
                        ...outgoingPaymentFormData,
                        currency: selectedCurrency,
                        amount: balance < 0 ? Math.abs(balance).toFixed(2) : ''
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
                    Tutar ({outgoingPaymentFormData.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outgoingPaymentFormData.amount}
                    onChange={(e) => setOutgoingPaymentFormData({
                      ...outgoingPaymentFormData,
                      amount: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    Mevcut Bakiye: {
                      outgoingPaymentFormData.currency === 'EUR' 
                        ? (cari?.balance_eur || 0).toFixed(2)
                        : outgoingPaymentFormData.currency === 'USD'
                        ? (cari?.balance_usd || 0).toFixed(2)
                        : (cari?.balance_try || 0).toFixed(2)
                    } {outgoingPaymentFormData.currency}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Ödeme Tipi</label>
                  <select
                    value={outgoingPaymentFormData.payment_type_id}
                    onChange={(e) => setOutgoingPaymentFormData({ ...outgoingPaymentFormData, payment_type_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  >
                    <option value="">Seçiniz (Opsiyonel)</option>
                    {paymentTypes.filter(pt => pt.is_active).map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tarih</label>
                  <input
                    type="date"
                    value={outgoingPaymentFormData.date}
                    onChange={(e) => setOutgoingPaymentFormData({ ...outgoingPaymentFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Açıklama (Opsiyonel)</label>
                  <textarea
                    value={outgoingPaymentFormData.description}
                    onChange={(e) => setOutgoingPaymentFormData({ ...outgoingPaymentFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    rows="3"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOutgoingPaymentDialogOpen(false)}
                    className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    Ekle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        )}
      </div>

      {/* Cari Bilgileri */}
      {(!cari?.is_munferit && cari?.name !== "Münferit") && (
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Firma Bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cari.phone && (
            <div>
              <p className="text-sm text-[#A5A5A5]">Telefon</p>
              <p className="text-white">{cari.phone}</p>
            </div>
          )}
          {cari.email && (
            <div>
              <p className="text-sm text-[#A5A5A5]">E-posta</p>
              <p className="text-white">{cari.email}</p>
            </div>
          )}
          {cari.tax_number && (
            <div>
              <p className="text-sm text-[#A5A5A5]">Vergi Numarası</p>
              <p className="text-white">{cari.tax_number}</p>
            </div>
          )}
          {cari.tax_office && (
            <div>
              <p className="text-sm text-[#A5A5A5]">Vergi Dairesi</p>
              <p className="text-white">{cari.tax_office}</p>
            </div>
          )}
          {cari.address && (
            <div className="md:col-span-2">
              <p className="text-sm text-[#A5A5A5]">Adres</p>
              <p className="text-white">{cari.address}</p>
            </div>
          )}
        </div>

        {/* Bakiyeler */}
        <div className="mt-6 pt-6 border-t border-[#2D2F33]">
          <h3 className="text-lg font-semibold text-white mb-4">Bakiyeler</h3>
          
          {/* Toplam Bakiye (TRY) */}
          <div className="mb-6 bg-gradient-to-r from-[#3EA6FF]/20 to-[#3EA6FF]/10 border border-[#3EA6FF]/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A5A5A5] mb-2">Toplam Bakiye (TRY)</p>
                <p className="text-4xl font-bold text-[#3EA6FF]">
                  {totalBalanceInTRY.toFixed(2)} TRY
                </p>
                <p className="text-xs text-[#A5A5A5] mt-2">
                  EUR: {cari?.balance_eur || 0} × {rates?.EUR || 0} = {(calculateTryValue(cari?.balance_eur || 0, 'EUR')).toFixed(2)} TRY
                  {' + '}
                  USD: {cari?.balance_usd || 0} × {rates?.USD || 0} = {(calculateTryValue(cari?.balance_usd || 0, 'USD')).toFixed(2)} TRY
                  {' + '}
                  TRY: {cari?.balance_try || 0}
                </p>
              </div>
            </div>
          </div>

          
          {/* Ayrı Ayrı Bakiyeler (EUR, USD, TRY) */}
          <div className="grid grid-cols-3 gap-4">
            {['EUR', 'USD', 'TRY'].map((currency) => {
              const balance = currency === 'EUR' 
                ? (cari?.balance_eur || 0)
                : currency === 'USD'
                ? (cari?.balance_usd || 0)
                : (cari?.balance_try || 0);
              
              return (
                <div 
                  key={currency}
                  className="bg-[#1E1E1E] rounded-lg p-4"
                >
                  <p className="text-sm text-[#A5A5A5] mb-1">{currency}</p>
                  <p className={`text-2xl font-bold ${
                    balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {balance.toFixed(2)}
                  </p>
                  {currency !== 'TRY' && balance !== 0 && (
                    <p className="text-xs text-blue-400 mt-1">
                      {(calculateTryValue(balance, currency)).toFixed(2)} TRY
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Sekmeler */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        {cari?.is_munferit || cari?.name === "Münferit" ? (
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="customers">Müşteriler</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="statement">Ekstre</TabsTrigger>
            <TabsTrigger value="services">Hizmetler</TabsTrigger>
            <TabsTrigger value="purchased_services">Alınan Hizmetler</TabsTrigger>
            <TabsTrigger value="payments">Tahsilatlar</TabsTrigger>
            <TabsTrigger value="outgoing_payments">Ödemeler</TabsTrigger>
          </TabsList>
        )}

        {/* Ekstre Sekmesi */}
        <TabsContent value="statement" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tip</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ödeme Tipi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.date ? format(new Date(transaction.date), 'dd.MM.yyyy', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.time || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${
                          transaction.transaction_type === 'debit' ? 'text-red-400' :
                          transaction.transaction_type === 'credit' ? 'text-yellow-400' :
                          transaction.transaction_type === 'payment' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {transaction.transaction_type === 'debit' ? 'Borç' :
                           transaction.transaction_type === 'credit' ? 'Alacak' :
                           transaction.transaction_type === 'payment' ? 'Tahsilat' : 'İade'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{transaction.description}</td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {transaction.amount.toFixed(2)} {transaction.currency}
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                        {transaction.payment_type_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz hesap hareketi bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Hizmetler Sekmesi */}
        <TabsContent value="services" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tur Tipi</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">ATV</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Kişi</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {reservation.date ? formatDate(reservation.date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{reservation.time || '-'}</td>
                      <td className="px-6 py-4 text-white text-sm">{reservation.customer_name || '-'}</td>
                      <td className="px-6 py-4 text-white text-sm">{reservation.tour_type_name || '-'}</td>
                      <td className="px-6 py-4 text-right text-white text-sm">{reservation.atv_count || 0}</td>
                      <td className="px-6 py-4 text-right text-white text-sm">{reservation.person_count || 0}</td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {reservation.price?.toFixed(2) || '0.00'} {reservation.currency || 'EUR'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${
                          reservation.status === 'confirmed' ? 'text-green-400' :
                          reservation.status === 'completed' ? 'text-blue-400' :
                          reservation.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {reservation.status === 'confirmed' ? 'Onaylandı' :
                           reservation.status === 'completed' ? 'Tamamlandı' :
                           reservation.status === 'cancelled' ? 'İptal Edildi' : 'Beklemede'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reservations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz rezervasyon bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Alınan Hizmetler Sekmesi */}
        <TabsContent value="purchased_services" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hizmet Adı</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tedarikçi</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Miktar</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Birim Fiyat</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Para Birimi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {servicePurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {purchase.date ? format(new Date(purchase.date), 'dd.MM.yyyy', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{purchase.service_name || '-'}</td>
                      <td className="px-6 py-4 text-white text-sm">{purchase.supplier_name || '-'}</td>
                      <td className="px-6 py-4 text-right text-white text-sm">{purchase.quantity || 0}</td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {purchase.unit_price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {purchase.total_price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{purchase.currency || 'EUR'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {servicePurchases.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz hizmet alımı bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tahsilatlar Sekmesi */}
        <TabsContent value="payments" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Para Birimi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ödeme Tipi</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {transactions.filter(t => t.transaction_type === 'payment' && t.reference_type !== 'outgoing_payment').map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.date ? format(new Date(transaction.date), 'dd.MM.yyyy', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.time || '-'}
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{transaction.description}</td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{transaction.currency}</td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                        {transaction.payment_type_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setEditTransactionFormData({
                                amount: transaction.amount,
                                currency: transaction.currency,
                                payment_type_id: transaction.payment_type_id || '',
                                description: transaction.description || '',
                                date: transaction.date || format(new Date(), 'yyyy-MM-dd')
                              });
                              setEditTransactionDialogOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Düzenle
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.filter(t => t.transaction_type === 'payment' && t.reference_type !== 'outgoing_payment').length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz tahsilat kaydı bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Ödemeler Sekmesi */}
        <TabsContent value="outgoing_payments" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Saat</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Para Birimi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ödeme Tipi</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {outgoingPayments.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.date ? format(new Date(transaction.date), 'dd.MM.yyyy', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {transaction.time || '-'}
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{transaction.description}</td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">{transaction.currency}</td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                        {transaction.payment_type_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setEditTransactionFormData({
                                amount: transaction.amount,
                                currency: transaction.currency,
                                payment_type_id: transaction.payment_type_id || '',
                                description: transaction.description || '',
                                date: transaction.date || format(new Date(), 'yyyy-MM-dd')
                              });
                              setEditTransactionDialogOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Düzenle
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outgoingPayments.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz ödeme kaydı bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Müşteriler Sekmesi (Sadece Münferit için) */}
        <TabsContent value="customers" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri Adı</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">İletişim</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">İlk Satış</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Son Satış</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Satış</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {customers.map((customer, index) => (
                    <tr key={index} className="hover:bg-[#2D2F33]">
                      <td className="px-6 py-4 text-white text-sm font-semibold">{customer.customer_name}</td>
                      <td className="px-6 py-4 text-[#A5A5A5] text-sm">{customer.customer_contact || '-'}</td>
                      <td className="px-6 py-4 text-white text-sm">
                        {customer.first_sale_date ? formatDateStringDDMMYYYY(customer.first_sale_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-white text-sm">
                        {customer.last_sale_date ? formatDateStringDDMMYYYY(customer.last_sale_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">{customer.total_sales || 0}</td>
                      <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                        {customer.total_amount?.toFixed(2) || '0.00'} {customer.currency || 'EUR'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#A5A5A5]">Henüz müşteri bulunmamaktadır</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Düzenleme Dialog */}
      <Dialog open={editTransactionDialogOpen} onOpenChange={setEditTransactionDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingTransaction?.transaction_type === 'payment' ? 'Tahsilat Düzenle' : 'Ödeme Düzenle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTransactionSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Para Birimi</label>
              <select
                value={editTransactionFormData.currency}
                onChange={(e) => setEditTransactionFormData({
                  ...editTransactionFormData,
                  currency: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="TRY">TRY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">Tutar</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editTransactionFormData.amount}
                onChange={(e) => setEditTransactionFormData({
                  ...editTransactionFormData,
                  amount: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">Ödeme Tipi</label>
              <select
                value={editTransactionFormData.payment_type_id}
                onChange={(e) => setEditTransactionFormData({
                  ...editTransactionFormData,
                  payment_type_id: e.target.value
                })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              >
                <option value="">Seçiniz</option>
                {paymentTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">Açıklama</label>
              <textarea
                value={editTransactionFormData.description}
                onChange={(e) => setEditTransactionFormData({
                  ...editTransactionFormData,
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
                value={editTransactionFormData.date}
                onChange={(e) => setEditTransactionFormData({
                  ...editTransactionFormData,
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
                onClick={() => {
                  setEditTransactionDialogOpen(false);
                  setEditingTransaction(null);
                  setEditTransactionFormData({});
                }}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {confirmDialogElement}
    </div>
  );
};

export default CariDetail;
