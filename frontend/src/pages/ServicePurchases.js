import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, DollarSign, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatDateStringDDMMYYYY } from '../utils/dateFormatter';

const ServicePurchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [cariSearch, setCariSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    supplier_id: '',
    service_area: 'diğer',
    service_description: '',
    amount: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    date: '',
    notes: ''
  });

  useEffect(() => {
    fetchPurchases();
    fetchCariAccounts();
    fetchRates();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${API}/service-purchases`);
      setPurchases(response.data);
    } catch (error) {
      toast.error('Hizmet alımları yüklenemedi');
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
      if (!formData.supplier_id) {
        toast.error('Lütfen cari firma seçin');
        return;
      }
      if (!formData.service_description) {
        toast.error('Lütfen hizmet adı girin');
        return;
      }
      if (!formData.date) {
        toast.error('Lütfen tarih seçin');
        return;
      }
      
      await axios.post(`${API}/service-purchases`, formData);
      toast.success('Hizmet alımı oluşturuldu');
      setDialogOpen(false);
      resetForm();
      fetchPurchases();
      fetchCariAccounts(); // Bakiye güncellenmiş olabilir
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hizmet alımı kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hizmet alımını silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/service-purchases/${id}`);
      toast.success('Hizmet alımı silindi');
      fetchPurchases();
      fetchCariAccounts();
    } catch (error) {
      toast.error('Hizmet alımı silinemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      service_area: 'diğer',
      service_description: '',
      amount: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      date: '',
      notes: ''
    });
    setCariSearch('');
  };

  const handleCariSelect = (cariId) => {
    const cari = cariAccounts.find(c => c.id === cariId);
    if (cari) {
      setCariSearch(cari.name);
      setFormData({ ...formData, supplier_id: cariId });
    }
  };

  const filteredCariAccounts = cariAccounts.filter(c => 
    c.name.toLowerCase().includes(cariSearch.toLowerCase())
  );

  const getServiceAreaLabel = (area) => {
    const labels = {
      'açık satış': 'Açık Satış',
      'rezervasyonlar': 'Rezervasyonlar',
      'diğer': 'Diğer'
    };
    return labels[area] || area;
  };

  // Arama filtresi
  const filteredPurchases = purchases.filter((purchase) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (purchase.supplier_name || '').toLowerCase().includes(query) ||
      (purchase.service_description || '').toLowerCase().includes(query) ||
      (purchase.service_area || '').toLowerCase().includes(query) ||
      (purchase.notes || '').toLowerCase().includes(query) ||
      (purchase.date || '').includes(query)
    );
  });

  return (
    <div className="space-y-6" data-testid="service-purchases-page">
      <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-white">Hizmet Al</h1>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6]">
                <Plus size={18} className="mr-2" />
                Hizmet Al
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Yeni Hizmet Alımı</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Cari Firma (Tedarikçi)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-4" />
                      <input
                        type="text"
                        placeholder="Cari ara..."
                        value={cariSearch}
                        onChange={(e) => {
                          setCariSearch(e.target.value);
                          if (e.target.value === '') {
                            setFormData({ ...formData, supplier_id: '' });
                          }
                        }}
                        className="w-full pl-10 pr-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                      />
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
                    <label className="block text-sm font-medium mb-2">Hizmet Alanı</label>
                    <select
                      value={formData.service_area}
                      onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      required
                    >
                      <option value="açık satış">Açık Satış</option>
                      <option value="rezervasyonlar">Rezervasyonlar</option>
                      <option value="diğer">Diğer</option>
                    </select>
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

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Hizmet Adı</label>
                    <input
                      type="text"
                      value={formData.service_description}
                      onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="Hizmet adını girin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tutar</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      placeholder="Hizmet tutarı (cari firmanın bakiyesine - olarak eklenecek)"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Döviz</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        currency: e.target.value, 
                        exchange_rate: rates[e.target.value] || 1.0 
                      })}
                      className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                    </select>
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

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#3EA6FF] hover:bg-[#005a9e] text-white"
                  >
                    Kaydet
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Arama Barı */}
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
          <input
            type="text"
            placeholder="Tedarikçi, hizmet adı, hizmet alanı veya tarih ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF]"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#3EA6FF]/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Tarih</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Cari Firma</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hizmet Alanı</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hizmet Adı</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white">Tutar</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2F33]">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-[#A5A5A5] py-12">
                    {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz hizmet alımı kaydı bulunmamaktadır'}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-[#2D2F33]">
                    <td className="px-6 py-4 text-white text-sm">
                      {formatDateStringDDMMYYYY(purchase.date)}
                    </td>
                    <td className="px-6 py-4 text-white text-sm">{purchase.supplier_name}</td>
                    <td className="px-6 py-4 text-white text-sm">
                      <span className="px-2 py-1 bg-[#3EA6FF]/20 text-[#3EA6FF] text-xs rounded">
                        {getServiceAreaLabel(purchase.service_area)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white text-sm">{purchase.service_description}</td>
                    <td className="px-6 py-4 text-right text-white text-sm font-semibold">
                      {(purchase.amount || purchase.service_fee || 0).toFixed(2)} {purchase.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(purchase.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServicePurchases;