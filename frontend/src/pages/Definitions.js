import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin, CreditCard, DollarSign, TrendingDown, Clock, Save, Car, Users, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TourTypes from './TourTypes';
import PaymentTypes from './PaymentTypes';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const Definitions = () => {
  const [currencies, setCurrencies] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [busyHourThreshold, setBusyHourThreshold] = useState({ threshold: 5 });
  const [loading, setLoading] = useState(true);
  
  // Currency states
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [currencyFormData, setCurrencyFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    is_active: true
  });
  
  // Expense Category states
  const [expenseCategoryDialogOpen, setExpenseCategoryDialogOpen] = useState(false);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState(null);
  const [expenseCategoryFormData, setExpenseCategoryFormData] = useState({
    name: '',
    description: ''
  });
  
  // Busy Hour Threshold state
  const [thresholdValue, setThresholdValue] = useState(5);
  
  // Vehicle Category states
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [vehicleCategoryDialogOpen, setVehicleCategoryDialogOpen] = useState(false);
  const [editingVehicleCategory, setEditingVehicleCategory] = useState(null);
  const [vehicleCategoryFormData, setVehicleCategoryFormData] = useState({
    name: '',
    description: '',
    order: 0,
    is_active: true
  });
  
  // Staff Role states
  const [staffRoles, setStaffRoles] = useState([]);
  const [staffRoleDialogOpen, setStaffRoleDialogOpen] = useState(false);
  const [editingStaffRole, setEditingStaffRole] = useState(null);
  const [staffRoleFormData, setStaffRoleFormData] = useState({
    name: '',
    description: '',
    color: '#3EA6FF',
    order: 0,
    is_active: true
  });
  
  // Bank states
  const [banks, setBanks] = useState([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankFormData, setBankFormData] = useState({
    name: '',
    code: '',
    is_active: true
  });
  
  // Bank Account states
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);
  const [bankAccountFormData, setBankAccountFormData] = useState({
    bank_id: '',
    account_type: 'bank_account', // 'bank_account' veya 'credit_card'
    account_name: '',
    account_number: '',
    iban: '',
    currency: 'TRY',
    commission_rate: '', // Sadece credit_card için
    valor_days: '', // Sadece credit_card için
    is_active: true,
    order: 0
  });
  const [bankAccountFilter, setBankAccountFilter] = useState('all'); // 'all', 'bank_account', 'credit_card'
  
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    fetchCurrencies();
    fetchExpenseCategories();
    fetchBusyHourThreshold();
    fetchVehicleCategories();
    fetchStaffRoles();
    fetchBanks();
    fetchBankAccounts();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/currencies`);
      setCurrencies(response.data);
    } catch (error) {
      console.error('Para birimleri yüklenemedi:', error);
    }
  };

  const fetchExpenseCategories = async () => {
    try {
      const response = await axios.get(`${API}/expense-categories`);
      setExpenseCategories(response.data);
    } catch (error) {
      console.error('Gider kalemleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusyHourThreshold = async () => {
    try {
      const response = await axios.get(`${API}/busy-hour-threshold`);
      setBusyHourThreshold(response.data);
      setThresholdValue(response.data.threshold || 5);
    } catch (error) {
      console.error('Yoğun saat tanımı yüklenemedi:', error);
    }
  };

  const fetchVehicleCategories = async () => {
    try {
      const response = await axios.get(`${API}/vehicle-categories`);
      setVehicleCategories(response.data);
    } catch (error) {
      console.error('Araç kategorileri yüklenemedi:', error);
    }
  };

  const handleVehicleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (!vehicleCategoryFormData.name) {
        toast.error('Lütfen kategori adı girin');
        return;
      }

      if (editingVehicleCategory) {
        await axios.put(`${API}/vehicle-categories/${editingVehicleCategory.id}`, vehicleCategoryFormData);
        toast.success('Araç kategorisi güncellendi');
      } else {
        await axios.post(`${API}/vehicle-categories`, vehicleCategoryFormData);
        toast.success('Araç kategorisi eklendi');
      }
      setVehicleCategoryDialogOpen(false);
      resetVehicleCategoryForm();
      fetchVehicleCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Araç kategorisi kaydedilemedi');
    }
  };

  const handleEditVehicleCategory = (category) => {
    setEditingVehicleCategory(category);
    setVehicleCategoryFormData({
      name: category.name || '',
      description: category.description || '',
      order: category.order || 0,
      is_active: category.is_active !== undefined ? category.is_active : true
    });
    setVehicleCategoryDialogOpen(true);
  };

  const handleDeleteVehicleCategory = async (categoryId) => {
    const confirmed = await confirm({
      title: "Araç Kategorisini Sil",
      message: "Bu kategoriyi silmek istediğinize emin misiniz? Bu kategoriye ait araçlar varsa silme işlemi başarısız olacaktır.",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API}/vehicle-categories/${categoryId}`);
      toast.success('Araç kategorisi silindi');
      fetchVehicleCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Araç kategorisi silinemedi');
    }
  };

  const resetVehicleCategoryForm = () => {
    setVehicleCategoryFormData({
      name: '',
      description: '',
      order: 0,
      is_active: true
    });
    setEditingVehicleCategory(null);
  };

  const fetchStaffRoles = async () => {
    try {
      const response = await axios.get(`${API}/staff-roles`);
      setStaffRoles(response.data);
    } catch (error) {
      console.error('Personel rolleri yüklenemedi:', error);
    }
  };

  const handleStaffRoleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!staffRoleFormData.name) {
        toast.error('Lütfen rol adı girin');
        return;
      }

      if (editingStaffRole) {
        await axios.put(`${API}/staff-roles/${editingStaffRole.id}`, staffRoleFormData);
        toast.success('Personel rolü güncellendi');
      } else {
        await axios.post(`${API}/staff-roles`, staffRoleFormData);
        toast.success('Personel rolü eklendi');
      }
      setStaffRoleDialogOpen(false);
      resetStaffRoleForm();
      fetchStaffRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Personel rolü kaydedilemedi');
    }
  };

  const handleEditStaffRole = (role) => {
    setEditingStaffRole(role);
    setStaffRoleFormData({
      name: role.name || '',
      description: role.description || '',
      color: role.color || '#3EA6FF',
      order: role.order || 0,
      is_active: role.is_active !== undefined ? role.is_active : true
    });
    setStaffRoleDialogOpen(true);
  };

  const handleDeleteStaffRole = async (roleId) => {
    const confirmed = await confirm({
      title: "Personel Rolünü Sil",
      message: "Bu rolü silmek istediğinize emin misiniz? Bu role ait personeller varsa silme işlemi başarısız olacaktır.",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API}/staff-roles/${roleId}`);
      toast.success('Personel rolü silindi');
      fetchStaffRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Personel rolü silinemedi');
    }
  };

  const resetStaffRoleForm = () => {
    setStaffRoleFormData({
      name: '',
      description: '',
      color: '#3EA6FF',
      order: 0,
      is_active: true
    });
    setEditingStaffRole(null);
  };

  const handleCurrencySubmit = async (e) => {
    e.preventDefault();
    try {
      if (!currencyFormData.code || !currencyFormData.name) {
        toast.error('Lütfen kod ve isim girin');
        return;
      }

      if (editingCurrency) {
        await axios.put(`${API}/currencies/${editingCurrency.id}`, currencyFormData);
        toast.success('Para birimi güncellendi');
      } else {
        await axios.post(`${API}/currencies`, currencyFormData);
        toast.success('Para birimi eklendi');
      }
      setCurrencyDialogOpen(false);
      resetCurrencyForm();
      fetchCurrencies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Para birimi kaydedilemedi');
    }
  };

  const handleExpenseCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (!expenseCategoryFormData.name) {
        toast.error('Lütfen gider kalemi adı girin');
        return;
      }

      if (editingExpenseCategory) {
        await axios.put(`${API}/expense-categories/${editingExpenseCategory.id}`, expenseCategoryFormData);
        toast.success('Gider kalemi güncellendi');
      } else {
        await axios.post(`${API}/expense-categories`, expenseCategoryFormData);
        toast.success('Gider kalemi eklendi');
      }
      setExpenseCategoryDialogOpen(false);
      resetExpenseCategoryForm();
      fetchExpenseCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gider kalemi kaydedilemedi');
    }
  };

  const handleBusyHourThresholdSave = async () => {
    try {
      // String'i integer'a çevir
      const thresholdInt = parseInt(thresholdValue);
      
      // Validation: Tam sayı ve 1'den büyük olmalı
      if (isNaN(thresholdInt) || thresholdInt < 1) {
        toast.error('Lütfen geçerli bir tam sayı girin (1 veya daha büyük)');
        return;
      }

      await axios.put(`${API}/busy-hour-threshold`, { threshold: thresholdInt });
      toast.success('Yoğun saat tanımı kaydedildi');
      fetchBusyHourThreshold();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Yoğun saat tanımı kaydedilemedi';
      toast.error(errorMessage);
      console.error('Yoğun saat tanımı kaydetme hatası:', error);
    }
  };

  const handleDeleteCurrency = async (id) => {
    if (!window.confirm('Para birimini silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/currencies/${id}`);
      toast.success('Para birimi silindi');
      fetchCurrencies();
    } catch (error) {
      toast.error('Para birimi silinemedi');
    }
  };

  const handleDeleteExpenseCategory = async (id) => {
    if (!window.confirm('Gider kalemini silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/expense-categories/${id}`);
      toast.success('Gider kalemi silindi');
      fetchExpenseCategories();
    } catch (error) {
      toast.error('Gider kalemi silinemedi');
    }
  };

  const resetCurrencyForm = () => {
    setCurrencyFormData({
      code: '',
      name: '',
      symbol: '',
      is_active: true
    });
    setEditingCurrency(null);
  };

  const resetExpenseCategoryForm = () => {
    setExpenseCategoryFormData({
      name: '',
      description: ''
    });
    setEditingExpenseCategory(null);
  };

  const handleEditCurrency = (currency) => {
    setEditingCurrency(currency);
    setCurrencyFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol || '',
      is_active: currency.is_active !== false
    });
    setCurrencyDialogOpen(true);
  };

  const handleEditExpenseCategory = (category) => {
    setEditingExpenseCategory(category);
    setExpenseCategoryFormData({
      name: category.name,
      description: category.description || ''
    });
    setExpenseCategoryDialogOpen(true);
  };

  // Bank functions
  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${API}/banks`);
      setBanks(response.data);
    } catch (error) {
      console.error('Bankalar yüklenemedi:', error);
    }
  };

  const fetchBankAccounts = async (accountType = null) => {
    try {
      const params = accountType && accountType !== 'all' ? { account_type: accountType } : {};
      const response = await axios.get(`${API}/bank-accounts`, { params });
      setBankAccounts(response.data);
    } catch (error) {
      console.error('Banka hesapları yüklenemedi:', error);
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!bankFormData.name) {
        toast.error('Lütfen banka adı girin');
        return;
      }

      if (editingBank) {
        await axios.put(`${API}/banks/${editingBank.id}`, bankFormData);
        toast.success('Banka güncellendi');
      } else {
        await axios.post(`${API}/banks`, bankFormData);
        toast.success('Banka eklendi');
      }
      setBankDialogOpen(false);
      resetBankForm();
      fetchBanks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Banka kaydedilemedi');
    }
  };

  const handleEditBank = (bank) => {
    setEditingBank(bank);
    setBankFormData({
      name: bank.name || '',
      code: bank.code || '',
      is_active: bank.is_active !== undefined ? bank.is_active : true
    });
    setBankDialogOpen(true);
  };

  const handleDeleteBank = async (bankId) => {
    const confirmed = await confirm({
      title: "Bankayı Sil",
      message: "Bu bankayı silmek istediğinize emin misiniz? Bu bankaya ait hesaplar varsa silme işlemi başarısız olacaktır.",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/banks/${bankId}`);
      toast.success('Banka silindi');
      fetchBanks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Banka silinemedi');
    }
  };

  const resetBankForm = () => {
    setEditingBank(null);
    setBankFormData({
      name: '',
      code: '',
      is_active: true
    });
  };

  // Bank Account functions
  const handleBankAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!bankAccountFormData.bank_id) {
        toast.error('Lütfen banka seçin');
        return;
      }
      if (!bankAccountFormData.account_name) {
        toast.error('Lütfen hesap adı girin');
        return;
      }

      const submitData = {
        ...bankAccountFormData,
        commission_rate: bankAccountFormData.account_type === 'credit_card' && bankAccountFormData.commission_rate ? parseFloat(bankAccountFormData.commission_rate) : null,
        valor_days: bankAccountFormData.account_type === 'credit_card' && bankAccountFormData.valor_days ? parseInt(bankAccountFormData.valor_days) : null,
        order: parseInt(bankAccountFormData.order) || 0
      };

      if (editingBankAccount) {
        await axios.put(`${API}/bank-accounts/${editingBankAccount.id}`, submitData);
        toast.success('Banka hesabı güncellendi');
      } else {
        await axios.post(`${API}/bank-accounts`, submitData);
        toast.success('Banka hesabı eklendi');
      }
      setBankAccountDialogOpen(false);
      resetBankAccountForm();
      fetchBankAccounts(bankAccountFilter !== 'all' ? bankAccountFilter : null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Banka hesabı kaydedilemedi');
    }
  };

  const handleEditBankAccount = (account) => {
    setEditingBankAccount(account);
    setBankAccountFormData({
      bank_id: account.bank_id || '',
      account_type: account.account_type || 'bank_account',
      account_name: account.account_name || '',
      account_number: account.account_number || '',
      iban: account.iban || '',
      currency: account.currency || 'TRY',
      commission_rate: account.commission_rate ? account.commission_rate.toString() : '',
      valor_days: account.valor_days ? account.valor_days.toString() : '',
      is_active: account.is_active !== undefined ? account.is_active : true,
      order: account.order || 0
    });
    setBankAccountDialogOpen(true);
  };

  const handleDeleteBankAccount = async (accountId) => {
    const confirmed = await confirm({
      title: "Banka Hesabını Sil",
      message: "Bu banka hesabını silmek istediğinize emin misiniz? İlgili kasa hesabı da silinecektir.",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/bank-accounts/${accountId}`);
      toast.success('Banka hesabı silindi');
      fetchBankAccounts(bankAccountFilter !== 'all' ? bankAccountFilter : null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Banka hesabı silinemedi');
    }
  };

  const resetBankAccountForm = () => {
    setEditingBankAccount(null);
    setBankAccountFormData({
      bank_id: '',
      account_type: 'bank_account',
      account_name: '',
      account_number: '',
      iban: '',
      currency: 'TRY',
      commission_rate: '',
      valor_days: '',
      is_active: true,
      order: 0
    });
  };

  useEffect(() => {
    fetchBankAccounts(bankAccountFilter !== 'all' ? bankAccountFilter : null);
  }, [bankAccountFilter]);

  return (
    <div className="space-y-6" data-testid="definitions-page">
      <h1 className="text-3xl font-bold text-white">Tanımlamalar</h1>

      <Tabs defaultValue="tour-types" className="w-full">
        <TabsList className="bg-[#25272A] border border-[#2D2F33]">
          <TabsTrigger value="tour-types" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <MapPin size={18} className="mr-2" />
            Tur Tipleri
          </TabsTrigger>
          <TabsTrigger value="payment-types" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <CreditCard size={18} className="mr-2" />
            Ödeme Yöntemleri
          </TabsTrigger>
          <TabsTrigger value="currencies" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <DollarSign size={18} className="mr-2" />
            Para Birimi
          </TabsTrigger>
          <TabsTrigger value="expense-categories" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <TrendingDown size={18} className="mr-2" />
            Gider Kalemleri
          </TabsTrigger>
          <TabsTrigger value="busy-hour" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <Clock size={18} className="mr-2" />
            Yoğun Saat Tanımı
          </TabsTrigger>
          <TabsTrigger value="vehicle-categories" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <Car size={18} className="mr-2" />
            Araç Kategorileri
          </TabsTrigger>
          <TabsTrigger value="staff-roles" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <Users size={18} className="mr-2" />
            Personel Rolleri
          </TabsTrigger>
          <TabsTrigger value="banks" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            <Building2 size={18} className="mr-2" />
            Bankalar
          </TabsTrigger>
        </TabsList>

        {/* Tur Tipleri Sekmesi */}
        <TabsContent value="tour-types" className="mt-4">
          <TourTypes />
        </TabsContent>

        {/* Ödeme Yöntemleri Sekmesi */}
        <TabsContent value="payment-types" className="mt-4">
          <PaymentTypes />
        </TabsContent>

        {/* Para Birimi Sekmesi */}
        <TabsContent value="currencies" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Para Birimleri</h2>
            <Dialog open={currencyDialogOpen} onOpenChange={(open) => {
              setCurrencyDialogOpen(open);
              if (!open) resetCurrencyForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                  <Plus size={18} className="mr-2" />
                  Para Birimi Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    {editingCurrency ? 'Para Birimi Düzenle' : 'Yeni Para Birimi'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCurrencySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Kod * (örn: EUR, USD, TRY)</label>
                    <input
                      type="text"
                      value={currencyFormData.code}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="EUR"
                      required
                      disabled={!!editingCurrency}
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">İsim *</label>
                    <input
                      type="text"
                      value={currencyFormData.name}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="Euro"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sembol (örn: €, $, ₺)</label>
                    <input
                      type="text"
                      value={currencyFormData.symbol}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, symbol: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="€"
                      maxLength={5}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={currencyFormData.is_active}
                      onChange={(e) => setCurrencyFormData({ ...currencyFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
                    />
                    <label htmlFor="is_active" className="text-sm text-white">Aktif</label>
                  </div>
                  <Button type="submit" className="w-full bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                    {editingCurrency ? 'Güncelle' : 'Kaydet'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kod</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">İsim</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Sembol</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {currencies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-[#A5A5A5] py-12">
                        Henüz para birimi eklenmemiş
                      </td>
                    </tr>
                  ) : (
                    currencies.map((currency) => (
                      <tr key={currency.id} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm font-semibold">{currency.code}</td>
                        <td className="px-6 py-4 text-white text-sm">{currency.name}</td>
                        <td className="px-6 py-4 text-white text-sm">{currency.symbol || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${currency.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {currency.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCurrency(currency)}
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCurrency(currency.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Gider Kalemleri Sekmesi */}
        <TabsContent value="expense-categories" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Gider Kalemleri</h2>
            <Dialog open={expenseCategoryDialogOpen} onOpenChange={(open) => {
              setExpenseCategoryDialogOpen(open);
              if (!open) resetExpenseCategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                  <Plus size={18} className="mr-2" />
                  Gider Kalemi Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    {editingExpenseCategory ? 'Gider Kalemi Düzenle' : 'Yeni Gider Kalemi'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleExpenseCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Gider Kalemi Adı *</label>
                    <input
                      type="text"
                      value={expenseCategoryFormData.name}
                      onChange={(e) => setExpenseCategoryFormData({ ...expenseCategoryFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="Örn: Yakıt, Bakım, Personel"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      value={expenseCategoryFormData.description}
                      onChange={(e) => setExpenseCategoryFormData({ ...expenseCategoryFormData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows="3"
                      placeholder="Gider kalemi açıklaması (opsiyonel)"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                    {editingExpenseCategory ? 'Güncelle' : 'Kaydet'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Gider Kalemi Adı</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D2F33]">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="text-center text-[#A5A5A5] py-12">
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : expenseCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-[#A5A5A5] py-12">
                        Henüz gider kalemi eklenmemiş
                      </td>
                    </tr>
                  ) : (
                    expenseCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm font-semibold">{category.name}</td>
                        <td className="px-6 py-4 text-[#A5A5A5] text-sm">{category.description || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpenseCategory(category)}
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpenseCategory(category.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Yoğun Saat Tanımı Sekmesi */}
        <TabsContent value="busy-hour" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Yoğun Saat Tanımı</h2>
            <p className="text-sm text-[#A5A5A5] mb-6">
              Bu sayı, bir saatte bulunan ATV sayısının üzerinde olması durumunda o saatin "yoğun saat" olarak işaretlenmesi için kullanılır.
              Örneğin, bu değer 5 ise, bir saatte 5'ten fazla ATV varsa o saat yoğun saat olarak gösterilir.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Yoğun Saat Eşiği (Minimum ATV Sayısı) *
                </label>
                <input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Sadece pozitif tam sayıları kabul et
                    if (value === '' || (!isNaN(value) && parseInt(value) >= 1)) {
                      setThresholdValue(value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  placeholder="5"
                  min="1"
                  step="1"
                  required
                />
                <p className="text-xs text-[#A5A5A5] mt-2">
                  Bu sayı veya daha fazla ATV'nin olduğu saatler yoğun saat olarak işaretlenecektir.
                </p>
              </div>
              <Button
                onClick={handleBusyHourThresholdSave}
                className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                <Save size={18} className="mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Araç Kategorileri Sekmesi */}
        <TabsContent value="vehicle-categories" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Araç Kategorileri</h2>
              <Dialog open={vehicleCategoryDialogOpen} onOpenChange={(open) => {
                setVehicleCategoryDialogOpen(open);
                if (!open) resetVehicleCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                    <Plus size={18} className="mr-2" />
                    Yeni Kategori
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      {editingVehicleCategory ? 'Araç Kategorisi Düzenle' : 'Yeni Araç Kategorisi'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleVehicleCategorySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Kategori Adı *</label>
                      <input
                        type="text"
                        value={vehicleCategoryFormData.name}
                        onChange={(e) => setVehicleCategoryFormData({ ...vehicleCategoryFormData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        placeholder="ATV, Jeep Safari, Klasik Araç, vb."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Açıklama</label>
                      <textarea
                        value={vehicleCategoryFormData.description}
                        onChange={(e) => setVehicleCategoryFormData({ ...vehicleCategoryFormData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        rows="3"
                        placeholder="Kategori açıklaması"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sıralama</label>
                      <input
                        type="number"
                        value={vehicleCategoryFormData.order}
                        onChange={(e) => setVehicleCategoryFormData({ ...vehicleCategoryFormData, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-[#A5A5A5] mt-1">Kategorilerin görüntülenme sırası (düşük sayı önce gösterilir)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active_vehicle"
                        checked={vehicleCategoryFormData.is_active}
                        onChange={(e) => setVehicleCategoryFormData({ ...vehicleCategoryFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
                      />
                      <label htmlFor="is_active_vehicle" className="text-sm text-white">Aktif</label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setVehicleCategoryDialogOpen(false);
                          resetVehicleCategoryForm();
                        }}
                        className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                      >
                        {editingVehicleCategory ? 'Güncelle' : 'Kaydet'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2D2F33]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Ad</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Sıralama</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Aktif</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleCategories.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-[#A5A5A5]">
                        Henüz araç kategorisi eklenmemiş
                      </td>
                    </tr>
                  ) : (
                    vehicleCategories.map((category) => (
                      <tr key={category.id} className="border-b border-[#2D2F33] hover:bg-[#2D2F33]/50">
                        <td className="px-4 py-3 text-sm text-white">{category.name}</td>
                        <td className="px-4 py-3 text-sm text-[#A5A5A5]">{category.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[#A5A5A5]">{category.order || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          {category.is_active ? (
                            <span className="text-green-400">Aktif</span>
                          ) : (
                            <span className="text-red-400">Pasif</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVehicleCategory(category)}
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVehicleCategory(category.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Personel Rolleri Sekmesi */}
        <TabsContent value="staff-roles" className="mt-4">
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Personel Rolleri</h2>
              <Dialog open={staffRoleDialogOpen} onOpenChange={(open) => {
                setStaffRoleDialogOpen(open);
                if (!open) resetStaffRoleForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                    <Plus size={18} className="mr-2" />
                    Yeni Rol
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      {editingStaffRole ? 'Personel Rolü Düzenle' : 'Yeni Personel Rolü'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStaffRoleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rol Adı *</label>
                      <input
                        type="text"
                        value={staffRoleFormData.name}
                        onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        placeholder="Satış Temsilcisi, Operasyon Müdürü, Muhasebe, vb."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Açıklama</label>
                      <textarea
                        value={staffRoleFormData.description}
                        onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        rows="3"
                        placeholder="Rol açıklaması"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Renk</label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={staffRoleFormData.color}
                          onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, color: e.target.value })}
                          className="w-16 h-10 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={staffRoleFormData.color}
                          onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, color: e.target.value })}
                          className="flex-1 px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          placeholder="#3EA6FF"
                        />
                      </div>
                      <p className="text-xs text-[#A5A5A5] mt-1">Kartlarda gösterilecek renk</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sıralama</label>
                      <input
                        type="number"
                        value={staffRoleFormData.order}
                        onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-[#A5A5A5] mt-1">Rollerin görüntülenme sırası (düşük sayı önce gösterilir)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active_staff"
                        checked={staffRoleFormData.is_active}
                        onChange={(e) => setStaffRoleFormData({ ...staffRoleFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
                      />
                      <label htmlFor="is_active_staff" className="text-sm text-white">Aktif</label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setStaffRoleDialogOpen(false);
                          resetStaffRoleForm();
                        }}
                        className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                      >
                        {editingStaffRole ? 'Güncelle' : 'Kaydet'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2D2F33]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Ad</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Açıklama</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Renk</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Sıralama</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Aktif</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-white">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRoles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-[#A5A5A5]">
                        Henüz personel rolü eklenmemiş
                      </td>
                    </tr>
                  ) : (
                    staffRoles.map((role) => (
                      <tr key={role.id} className="border-b border-[#2D2F33] hover:bg-[#2D2F33]/50">
                        <td className="px-4 py-3 text-sm text-white">{role.name}</td>
                        <td className="px-4 py-3 text-sm text-[#A5A5A5]">{role.description || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full border border-[#2D2F33]"
                              style={{ backgroundColor: role.color || '#3EA6FF' }}
                            />
                            <span className="text-[#A5A5A5]">{role.color || '#3EA6FF'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#A5A5A5]">{role.order || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          {role.is_active ? (
                            <span className="text-green-400">Aktif</span>
                          ) : (
                            <span className="text-red-400">Pasif</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStaffRole(role)}
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStaffRole(role.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Bankalar Sekmesi */}
        <TabsContent value="banks" className="mt-4">
          <div className="space-y-6">
            {/* Banka Yönetimi */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Bankalar</h2>
                <Dialog open={bankDialogOpen} onOpenChange={(open) => {
                  setBankDialogOpen(open);
                  if (!open) resetBankForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                      <Plus size={18} className="mr-2" />
                      Banka Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">
                        {editingBank ? 'Banka Düzenle' : 'Yeni Banka'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBankSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Banka Adı *</label>
                        <input
                          type="text"
                          value={bankFormData.name}
                          onChange={(e) => setBankFormData({ ...bankFormData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          placeholder="Örn: Ziraat Bankası, İş Bankası"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Banka Kodu</label>
                        <input
                          type="text"
                          value={bankFormData.code}
                          onChange={(e) => setBankFormData({ ...bankFormData, code: e.target.value })}
                          className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                          placeholder="Opsiyonel"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="bank_is_active"
                          checked={bankFormData.is_active}
                          onChange={(e) => setBankFormData({ ...bankFormData, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
                        />
                        <label htmlFor="bank_is_active" className="text-sm text-white">Aktif</label>
                      </div>
                      <Button type="submit" className="w-full bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                        {editingBank ? 'Güncelle' : 'Kaydet'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Banka Adı</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Kod</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2F33]">
                      {banks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-[#A5A5A5] py-12">
                            Henüz banka eklenmemiş
                          </td>
                        </tr>
                      ) : (
                        banks.map((bank) => (
                          <tr key={bank.id} className="hover:bg-[#2D2F33]">
                            <td className="px-6 py-4 text-white text-sm font-semibold">{bank.name}</td>
                            <td className="px-6 py-4 text-white text-sm">{bank.code || '-'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs ${bank.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {bank.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditBank(bank)}
                                  className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                                >
                                  <Edit size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteBank(bank.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Banka Hesapları Yönetimi */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Banka Hesapları</h2>
                <div className="flex items-center gap-4">
                  <select
                    value={bankAccountFilter}
                    onChange={(e) => setBankAccountFilter(e.target.value)}
                    className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  >
                    <option value="all">Tümü</option>
                    <option value="bank_account">Banka Hesapları</option>
                    <option value="credit_card">Kredi Kartları</option>
                  </select>
                  <Dialog open={bankAccountDialogOpen} onOpenChange={(open) => {
                    setBankAccountDialogOpen(open);
                    if (!open) resetBankAccountForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                        <Plus size={18} className="mr-2" />
                        Hesap Ekle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                          {editingBankAccount ? 'Banka Hesabı Düzenle' : 'Yeni Banka Hesabı'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleBankAccountSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Banka *</label>
                          <select
                            value={bankAccountFormData.bank_id}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, bank_id: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required
                          >
                            <option value="">Banka seçin</option>
                            {banks.filter(b => b.is_active).map((bank) => (
                              <option key={bank.id} value={bank.id}>{bank.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Hesap Tipi *</label>
                          <select
                            value={bankAccountFormData.account_type}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, account_type: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required
                          >
                            <option value="bank_account">Banka Hesabı (Havale)</option>
                            <option value="credit_card">Kredi Kartı</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Hesap Adı *</label>
                          <input
                            type="text"
                            value={bankAccountFormData.account_name}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, account_name: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            placeholder="Örn: Ana Hesap, Kredi Kartı - Visa"
                            required
                          />
                        </div>
                        {bankAccountFormData.account_type === 'bank_account' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">Hesap Numarası</label>
                              <input
                                type="text"
                                value={bankAccountFormData.account_number}
                                onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, account_number: e.target.value })}
                                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                                placeholder="Opsiyonel"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">IBAN</label>
                              <input
                                type="text"
                                value={bankAccountFormData.iban}
                                onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, iban: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                                placeholder="TR..."
                              />
                            </div>
                          </>
                        )}
                        {bankAccountFormData.account_type === 'credit_card' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">Komisyon Oranı (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={bankAccountFormData.commission_rate}
                                onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, commission_rate: e.target.value })}
                                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                                placeholder="Örn: 2.5"
                              />
                              <p className="text-xs text-[#A5A5A5] mt-1">Kredi kartı komisyon oranı (örn: 2.5 = %2.5)</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Valör Süresi (Gün)</label>
                              <input
                                type="number"
                                value={bankAccountFormData.valor_days}
                                onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, valor_days: e.target.value })}
                                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                                placeholder="Örn: 1, 2, 3"
                                min="0"
                              />
                              <p className="text-xs text-[#A5A5A5] mt-1">Tahsilatın hesaba geçeceği gün sayısı</p>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium mb-2">Para Birimi *</label>
                          <select
                            value={bankAccountFormData.currency}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, currency: e.target.value })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            required
                          >
                            <option value="TRY">TRY</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Sıralama</label>
                          <input
                            type="number"
                            value={bankAccountFormData.order}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, order: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="bank_account_is_active"
                            checked={bankAccountFormData.is_active}
                            onChange={(e) => setBankAccountFormData({ ...bankAccountFormData, is_active: e.target.checked })}
                            className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded focus:ring-[#3EA6FF]"
                          />
                          <label htmlFor="bank_account_is_active" className="text-sm text-white">Aktif</label>
                        </div>
                        <Button type="submit" className="w-full bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                          {editingBankAccount ? 'Güncelle' : 'Kaydet'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Banka</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hesap Tipi</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hesap Adı</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Para Birimi</th>
                        {bankAccountFilter === 'credit_card' || bankAccountFilter === 'all' ? (
                          <>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Komisyon (%)</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-white">Valör (Gün)</th>
                          </>
                        ) : null}
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2F33]">
                      {bankAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={bankAccountFilter === 'credit_card' || bankAccountFilter === 'all' ? 8 : 6} className="text-center text-[#A5A5A5] py-12">
                            Henüz banka hesabı eklenmemiş
                          </td>
                        </tr>
                      ) : (
                        bankAccounts.map((account) => (
                          <tr key={account.id} className="hover:bg-[#2D2F33]">
                            <td className="px-6 py-4 text-white text-sm">{account.bank_name || '-'}</td>
                            <td className="px-6 py-4 text-white text-sm">
                              {account.account_type === 'bank_account' ? 'Banka Hesabı' : 'Kredi Kartı'}
                            </td>
                            <td className="px-6 py-4 text-white text-sm font-semibold">{account.account_name}</td>
                            <td className="px-6 py-4 text-white text-sm">{account.currency}</td>
                            {(bankAccountFilter === 'credit_card' || bankAccountFilter === 'all') && (
                              <>
                                <td className="px-6 py-4 text-white text-sm">
                                  {account.commission_rate ? `${account.commission_rate}%` : '-'}
                                </td>
                                <td className="px-6 py-4 text-white text-sm">
                                  {account.valor_days ? `${account.valor_days} gün` : '-'}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs ${account.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {account.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditBankAccount(account)}
                                  className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                                >
                                  <Edit size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteBankAccount(account.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      {dialog}
    </div>
  );
};

export default Definitions;


