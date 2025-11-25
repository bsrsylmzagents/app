import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { 
  User, Building2, Search, Edit, AlertCircle, FileText, DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CustomerDetailDialog from '../components/CustomerDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Customers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('individual');
  
  // Individual customers state
  const [individualCustomers, setIndividualCustomers] = useState([]);
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [individualLoading, setIndividualLoading] = useState(false);
  
  // Corporate customers state
  const [corporateCustomers, setCorporateCustomers] = useState([]);
  const [corporateSearchQuery, setCorporateSearchQuery] = useState('');
  const [corporateLoading, setCorporateLoading] = useState(false);
  const [selectedCariId, setSelectedCariId] = useState('');
  const [cariAccounts, setCariAccounts] = useState([]);
  
  // Common state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    currency: 'EUR',
    payment_type_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentTypes, setPaymentTypes] = useState([]);

  useEffect(() => {
    if (activeTab === 'individual') {
      fetchIndividualCustomers();
    } else {
      fetchCariAccounts();
      if (selectedCariId) {
        fetchCorporateCustomers();
      }
    }
  }, [activeTab, selectedCariId]);

  useEffect(() => {
    if (individualSearchQuery !== undefined) {
      fetchIndividualCustomers();
    }
  }, [individualSearchQuery]);

  useEffect(() => {
    if (corporateSearchQuery !== undefined && selectedCariId) {
      fetchCorporateCustomers();
    }
  }, [corporateSearchQuery]);

  useEffect(() => {
    fetchPaymentTypes();
  }, []);

  const fetchPaymentTypes = async () => {
    try {
      const response = await axios.get(`${API}/payment-types`);
      setPaymentTypes(response.data.filter(pt => pt.is_active));
    } catch (error) {
      console.error('Payment types yüklenemedi');
    }
  };

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      const filtered = response.data.filter(c => !c.is_munferit && c.name !== "Münferit");
      setCariAccounts(filtered);
      if (filtered.length > 0 && !selectedCariId) {
        setSelectedCariId(filtered[0].id);
      }
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchIndividualCustomers = async () => {
    setIndividualLoading(true);
    try {
      const params = {};
      if (individualSearchQuery) {
        params.search = individualSearchQuery;
      }
      const response = await axios.get(`${API}/munferit-customers`, { params });
      setIndividualCustomers(response.data);
    } catch (error) {
      toast.error('Münferit müşteriler yüklenemedi');
    } finally {
      setIndividualLoading(false);
    }
  };

  const fetchCorporateCustomers = async () => {
    setCorporateLoading(true);
    try {
      const params = { cari_id: selectedCariId };
      if (corporateSearchQuery) {
        params.search = corporateSearchQuery;
      }
      const response = await axios.get(`${API}/cari-customers`, { params });
      setCorporateCustomers(response.data);
    } catch (error) {
      toast.error('Cari müşteriler yüklenemedi');
    } finally {
      setCorporateLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailDialogOpen(true);
  };

  const handleSaveCustomerDetails = async (details) => {
    if (!selectedCustomer) return;
    
    try {
      const endpoint = activeTab === 'individual' 
        ? `${API}/munferit-customers/${selectedCustomer.id}`
        : `${API}/cari-customers/${selectedCustomer.id}`;
      
      await axios.put(endpoint, details);
      toast.success('Müşteri güncellendi');
      setCustomerDetailDialogOpen(false);
      setSelectedCustomer(null);
      
      if (activeTab === 'individual') {
        fetchIndividualCustomers();
      } else {
        fetchCorporateCustomers();
      }
    } catch (error) {
      toast.error('Müşteri güncellenemedi');
    }
  };

  const handleQuickPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentData({
      amount: customer.unpaid_amount?.EUR > 0 ? customer.unpaid_amount.EUR.toString() : 
              customer.unpaid_amount?.USD > 0 ? customer.unpaid_amount.USD.toString() :
              customer.unpaid_amount?.TRY > 0 ? customer.unpaid_amount.TRY.toString() : '',
      currency: customer.unpaid_amount?.EUR > 0 ? 'EUR' :
                customer.unpaid_amount?.USD > 0 ? 'USD' : 'TRY',
      payment_type_id: '',
      date: new Date().toISOString().split('T')[0],
      notes: `Ödeme: ${customer.customer_name}`
    });
    setQuickPaymentModalOpen(true);
  };

  const handleSubmitQuickPayment = async () => {
    if (!selectedCustomer || !paymentData.amount || !paymentData.payment_type_id) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      // Münferit müşteriler için münferit cari hesabını bul
      const munferitCariResponse = await axios.get(`${API}/cari-accounts`);
      const munferitCari = munferitCariResponse.data.find(c => c.is_munferit);
      
      if (!munferitCari) {
        toast.error('Münferit cari hesabı bulunamadı');
        return;
      }

      // Quick payment için transaction oluştur
      await axios.post(`${API}/transactions`, {
        cari_id: munferitCari.id,
        customer_name: selectedCustomer.customer_name, // Transaction description için
        transaction_type: 'payment',
        amount: parseFloat(paymentData.amount),
        currency: paymentData.currency,
        payment_type_id: paymentData.payment_type_id,
        date: paymentData.date,
        description: paymentData.notes || `Ödeme: ${selectedCustomer.customer_name}`
      });

      toast.success('Ödeme kaydedildi');
      setQuickPaymentModalOpen(false);
      setSelectedCustomer(null);
      fetchIndividualCustomers();
    } catch (error) {
      toast.error('Ödeme kaydedilemedi');
      console.error(error);
    }
  };

  const formatBalance = (balance) => {
    if (!balance) return '0.00 TRY';
    const parts = [];
    if (balance.EUR && balance.EUR !== 0) parts.push(`${balance.EUR.toFixed(2)} EUR`);
    if (balance.USD && balance.USD !== 0) parts.push(`${balance.USD.toFixed(2)} USD`);
    if (balance.TRY && balance.TRY !== 0) parts.push(`${balance.TRY.toFixed(2)} TRY`);
    return parts.length > 0 ? parts.join(' / ') : '0.00 TRY';
  };

  const filteredIndividualCustomers = individualCustomers.filter(customer => {
    if (!individualSearchQuery) return true;
    const query = individualSearchQuery.toLowerCase();
    return (
      customer.customer_name?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  });

  const filteredCorporateCustomers = corporateCustomers.filter(customer => {
    if (!corporateSearchQuery) return true;
    const query = corporateSearchQuery.toLowerCase();
    return (
      customer.customer_name?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Müşteriler</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Müşteri kayıtları ve yönetimi</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderWidth: '1px', borderStyle: 'solid' }}>
          <TabsTrigger value="individual">
            <User className="h-4 w-4 mr-2" />
            Münferit Müşteriler
          </TabsTrigger>
          <TabsTrigger value="corporate">
            <Building2 className="h-4 w-4 mr-2" />
            Cari Müşteriler
          </TabsTrigger>
        </TabsList>

        {/* Individual Customers Tab */}
        <TabsContent value="individual" className="space-y-4 mt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Müşteri ara..."
              value={individualSearchQuery}
              onChange={(e) => setIndividualSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F5F5F4] dark:bg-[#2D2F33] border-0 dark:border-[#2D2F33] rounded-lg text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-[#A5A5A5] focus:outline-none focus:bg-white focus:ring-2 focus:ring-stone-300 dark:focus:border-[#3EA6FF] hover:bg-stone-200 dark:hover:bg-[#2D2F33] transition-colors"
            />
          </div>

          {/* Desktop Table - Material Design 3 */}
          <div className="bg-white dark:bg-[#25272A] backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_2px_8px_0_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.1)] dark:shadow-none border-b border-stone-100">
            <div className="overflow-x-auto">
              <table className="w-full hidden md:table">
                <thead className="bg-transparent">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Müşteri Adı</th>
                    <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Telefon</th>
                    <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Son Aktivite</th>
                    <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Ödeme Durumu</th>
                    <th className="px-6 py-4 text-right text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2D2F33]">
                  {individualLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</td>
                    </tr>
                  ) : filteredIndividualCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#A5A5A5]">
                        {individualSearchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı' : 'Henüz münferit müşteri bulunmamaktadır'}
                      </td>
                    </tr>
                  ) : (
                    filteredIndividualCustomers.map((customer) => (
                      <tr key={customer.id} className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-[#2D2F33] border-b border-slate-100 dark:border-[#2D2F33]">
                        <td className="px-6 py-4 text-sm text-white font-medium">{customer.customer_name}</td>
                        <td className="px-6 py-4 text-sm text-white">{customer.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {customer.last_sale_date ? new Date(customer.last_sale_date).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {customer.has_unpaid ? (
                            <Badge 
                              variant="destructive" 
                              className="cursor-pointer hover:bg-red-600 rounded-full px-3 py-1 text-xs font-medium"
                              onClick={() => handleQuickPayment(customer)}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Ödeme Alınmadı
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 rounded-full px-3 py-1 text-xs font-medium">
                              Ödendi
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit size={18} style={{ color: 'var(--accent)' }} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View - Material Design 3 */}
          <div className="grid md:hidden gap-4">
            {individualLoading ? (
              <div className="text-center py-12 bg-white dark:bg-[#25272A] backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_-4px_rgba(120,113,108,0.1)] dark:shadow-none border-b border-stone-100">
                <p className="text-[#A5A5A5]">Yükleniyor...</p>
              </div>
            ) : filteredIndividualCustomers.length === 0 ? (
              <div className="text-center py-12 bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl">
                <p className="text-[#A5A5A5]">
                  {individualSearchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı' : 'Henüz münferit müşteri bulunmamaktadır'}
                </p>
              </div>
            ) : (
              filteredIndividualCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-[#25272A] backdrop-blur-xl rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_0_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.1)] dark:shadow-none border-b border-stone-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{customer.customer_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                        {customer.phone && <span>📞 {customer.phone}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors flex-shrink-0"
                      title="Düzenle"
                    >
                      <Edit size={18} className="text-[#3EA6FF]" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Son Aktivite:</span>
                    <span className="text-sm text-white">
                      {customer.last_sale_date ? new Date(customer.last_sale_date).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ödeme Durumu:</span>
                    {customer.has_unpaid ? (
                      <Badge 
                        variant="destructive" 
                        className="cursor-pointer hover:bg-red-600"
                        onClick={() => handleQuickPayment(customer)}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Ödeme Alınmadı
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Ödendi
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Corporate Customers Tab */}
        <TabsContent value="corporate" className="space-y-4 mt-6">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-white">Cari Firma Seçin</label>
              <select
                value={selectedCariId}
                onChange={(e) => setSelectedCariId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F5F4] dark:bg-[#2D2F33] border-0 dark:border-[#2D2F33] rounded-lg text-stone-800 dark:text-white focus:bg-white focus:ring-2 focus:ring-stone-300 dark:focus:border-[#3EA6FF] hover:bg-stone-200 dark:hover:bg-[#2D2F33]"
              >
                <option value="">Cari firma seçin</option>
                {cariAccounts.map(cari => (
                  <option key={cari.id} value={cari.id}>{cari.name}</option>
                ))}
              </select>
            </div>
            {selectedCariId && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Müşteri ara..."
                  value={corporateSearchQuery}
                  onChange={(e) => setCorporateSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 rounded-lg text-white focus:outline-none"
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
            )}
          </div>

          {/* Desktop Table - Material Design 3 */}
          {selectedCariId ? (
            <div className="bg-white dark:bg-[#25272A] backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_2px_8px_0_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.1)] dark:shadow-none border-b border-stone-100">
              <div className="overflow-x-auto">
                <table className="w-full hidden md:table">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Firma Adı</th>
                      <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Yetkili Kişi</th>
                      <th className="px-6 py-4 text-left text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">Bakiye</th>
                      <th className="px-6 py-4 text-right text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-white">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2D2F33]">
                    {corporateLoading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[#A5A5A5]">Yükleniyor...</td>
                      </tr>
                    ) : filteredCorporateCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[#A5A5A5]">
                          {corporateSearchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı' : 'Bu cari firmaya ait müşteri bulunmamaktadır'}
                        </td>
                      </tr>
                    ) : (
                      filteredCorporateCustomers.map((customer) => (
                        <tr key={customer.id} className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-[#2D2F33] border-b border-slate-100 dark:border-[#2D2F33]">
                          <td className="px-6 py-4 text-sm text-white font-medium">{customer.customer_name}</td>
                          <td className="px-6 py-4 text-sm text-white">{customer.phone || '-'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`font-semibold ${
                              customer.current_balance?.EUR > 0 || customer.current_balance?.USD > 0 || customer.current_balance?.TRY > 0
                                ? 'text-red-400' 
                                : customer.current_balance?.EUR < 0 || customer.current_balance?.USD < 0 || customer.current_balance?.TRY < 0
                                ? 'text-green-400'
                                : 'text-slate-600 dark:text-[#A5A5A5]'
                            }`}>
                              {formatBalance(customer.current_balance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/cari-accounts/${customer.cari_id}`)}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                                title="Ekstre"
                              >
                                <FileText size={18} className="text-blue-600 dark:text-[#3EA6FF]" />
                              </button>
                              <button
                                onClick={() => handleEdit(customer)}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                                title="Düzenle"
                              >
                                <Edit size={18} style={{ color: 'var(--accent)' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-lg p-6">
              <p className="text-[#A5A5A5] text-center py-8">Lütfen bir cari firma seçin</p>
            </div>
          )}

          {/* Mobile Card View */}
          {selectedCariId && (
            <div className="grid md:hidden gap-4">
              {corporateLoading ? (
                <div className="text-center py-12 bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl">
                  <p className="text-[#A5A5A5]">Yükleniyor...</p>
                </div>
              ) : filteredCorporateCustomers.length === 0 ? (
                <div className="text-center py-12 bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl">
                  <p className="text-[#A5A5A5]">
                    {corporateSearchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı' : 'Bu cari firmaya ait müşteri bulunmamaktadır'}
                  </p>
                </div>
              ) : (
                filteredCorporateCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="bg-white dark:bg-[#25272A] backdrop-blur-xl rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_0_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.1)] dark:shadow-none border-b border-stone-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{customer.customer_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                          {customer.phone && <span>📞 {customer.phone}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/cari-accounts/${customer.cari_id}`)}
                          className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                          title="Ekstre"
                        >
                          <FileText size={18} className="text-[#3EA6FF]" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={18} className="text-[#3EA6FF]" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#A5A5A5]">Bakiye:</span>
                      <span className={`text-sm font-semibold ${
                        customer.current_balance?.EUR > 0 || customer.current_balance?.USD > 0 || customer.current_balance?.TRY > 0
                          ? 'text-red-400' 
                          : customer.current_balance?.EUR < 0 || customer.current_balance?.USD < 0 || customer.current_balance?.TRY < 0
                          ? 'text-green-400'
                          : 'text-[#A5A5A5]'
                      }`}>
                        {formatBalance(customer.current_balance)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Customer Detail Dialog */}
      {selectedCustomer && (
        <CustomerDetailDialog
          open={customerDetailDialogOpen}
          onOpenChange={(open) => {
            setCustomerDetailDialogOpen(open);
            if (!open) {
              setSelectedCustomer(null);
            }
          }}
          customerName={selectedCustomer.customer_name}
          initialData={selectedCustomer}
          onSave={handleSaveCustomerDetails}
        />
      )}

      {/* Quick Payment Modal */}
      <Dialog open={quickPaymentModalOpen} onOpenChange={setQuickPaymentModalOpen}>
        <DialogContent className="bg-[#1E1E1E] border-[#2D2F33] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Hızlı Ödeme Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Müşteri</Label>
              <Input
                value={selectedCustomer?.customer_name || ''}
                disabled
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Tutar</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="bg-[#2D2F33] border-[#2D2F33] text-white"
                />
                </div>
                <div>
                <Label className="text-white">Para Birimi</Label>
                <Select
                  value={paymentData.currency}
                  onValueChange={(value) => setPaymentData({ ...paymentData, currency: value })}
                >
                  <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2D2F33] border-[#2D2F33]">
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="TRY">TRY</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            <div>
              <Label className="text-white">Ödeme Tipi</Label>
              <Select
                value={paymentData.payment_type_id}
                onValueChange={(value) => setPaymentData({ ...paymentData, payment_type_id: value })}
              >
                <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                  <SelectValue placeholder="Ödeme tipi seçin" />
                </SelectTrigger>
                <SelectContent className="bg-[#2D2F33] border-[#2D2F33]">
                  {paymentTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Tarih</Label>
              <Input
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Notlar</Label>
              <Input
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setQuickPaymentModalOpen(false)}
                className="border-[#2D2F33] text-gray-400 hover:text-white"
              >
                İptal
              </Button>
              <Button
                onClick={handleSubmitQuickPayment}
                className="bg-stone-900 hover:bg-stone-950 text-white rounded-full shadow-md hover:-translate-y-0.5 transition-all"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Ödeme Kaydet
              </Button>
      </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
