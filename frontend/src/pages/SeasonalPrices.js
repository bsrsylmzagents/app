import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const SeasonalPrices = () => {
  const [seasonalPrices, setSeasonalPrices] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [seasonalPriceForm, setSeasonalPriceForm] = useState({
    start_date: '',
    end_date: '',
    currency: 'TRY',
    tour_type_ids: [],
    cari_prices: {},
    apply_to_new_caris: false,
    price: 0  // Tek fiyat kutusu için
  });
  const [selectedCaris, setSelectedCaris] = useState([]);
  const [cariSearchFilter, setCariSearchFilter] = useState('');
  const [editingSeasonalPrice, setEditingSeasonalPrice] = useState(null);
  
  useEffect(() => {
    fetchCariAccounts();
    fetchTourTypes();
    fetchSeasonalPrices();
  }, []);

  useEffect(() => {
    // Tüm carileri başlangıçta seçili yap
    if (cariAccounts.length > 0 && selectedCaris.length === 0) {
      setSelectedCaris(cariAccounts.map(c => c.id));
    }
  }, [cariAccounts]);

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

  const fetchSeasonalPrices = async () => {
    try {
      const response = await axios.get(`${API}/seasonal-prices`);
      setSeasonalPrices(response.data);
    } catch (error) {
      toast.error('Fiyatlar yüklenemedi');
    }
  };

  const handleSelectAllCaris = () => {
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
    if (seasonalPriceForm.tour_type_ids.includes(tourTypeId)) {
      setSeasonalPriceForm({
        ...seasonalPriceForm,
        tour_type_ids: seasonalPriceForm.tour_type_ids.filter(id => id !== tourTypeId)
      });
    } else {
      setSeasonalPriceForm({
        ...seasonalPriceForm,
        tour_type_ids: [...seasonalPriceForm.tour_type_ids, tourTypeId]
      });
    }
  };

  const handlePriceChange = (value) => {
    setSeasonalPriceForm({
      ...seasonalPriceForm,
      price: parseFloat(value) || 0
    });
  };

  const handleSeasonalPriceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!seasonalPriceForm.price || seasonalPriceForm.price <= 0) {
        toast.error('Lütfen geçerli bir fiyat girin');
        return;
      }
      
      // Seçili tüm carilere aynı fiyatı uygula
      const cariPricesToSubmit = {};
      selectedCaris.forEach(cariId => {
        cariPricesToSubmit[cariId] = seasonalPriceForm.price;
      });

      const submitData = {
        ...seasonalPriceForm,
        cari_prices: cariPricesToSubmit
      };
      delete submitData.price; // Backend'e göndermeden önce kaldır

      if (editingSeasonalPrice) {
        await axios.put(`${API}/seasonal-prices/${editingSeasonalPrice.id}`, submitData);
        toast.success('Fiyat güncellendi');
      } else {
        await axios.post(`${API}/seasonal-prices`, submitData);
        toast.success('Fiyat oluşturuldu');
      }
      
      resetSeasonalPriceForm();
      fetchSeasonalPrices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fiyat kaydedilemedi');
    }
  };

  const resetSeasonalPriceForm = () => {
    setSeasonalPriceForm({
      start_date: '',
      end_date: '',
      currency: 'TRY',
      tour_type_ids: [],
      cari_prices: {},
      apply_to_new_caris: false,
      price: 0
    });
    setSelectedCaris(cariAccounts.map(c => c.id));
    setEditingSeasonalPrice(null);
    setCariSearchFilter('');
  };

  const handleEditSeasonalPrice = (price) => {
    setEditingSeasonalPrice(price);
    // İlk cari fiyatını al (tüm cariler aynı fiyata sahip olmalı)
    const firstPrice = price.cari_prices && Object.keys(price.cari_prices).length > 0 
      ? price.cari_prices[Object.keys(price.cari_prices)[0]] 
      : 0;
    
    setSeasonalPriceForm({
      start_date: price.start_date,
      end_date: price.end_date,
      currency: price.currency,
      tour_type_ids: price.tour_type_ids || [],
      cari_prices: price.cari_prices || {},
      apply_to_new_caris: price.apply_to_new_caris || false,
      price: firstPrice
    });
    setSelectedCaris(Object.keys(price.cari_prices || []));
  };

  const handleDeleteSeasonalPrice = async (priceId) => {
    if (!window.confirm('Bu fiyatı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/seasonal-prices/${priceId}`);
      toast.success('Fiyat silindi');
      fetchSeasonalPrices();
    } catch (error) {
      toast.error('Fiyat silinemedi');
    }
  };

  const filteredCariAccountsForSeasonal = cariAccounts.filter(c => 
    c.name.toLowerCase().includes(cariSearchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="seasonal-prices-page">
      <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-white">Fiyat Yönetimi</h1>
        <Button
          onClick={resetSeasonalPriceForm}
          className="bg-[#3EA6FF] hover:bg-[#2B8FE6]"
        >
          <Plus size={18} className="mr-2" />
          Yeni Fiyat
        </Button>
      </div>

      <div className="bg-[#25272A] backdrop-blur-xl border border-[#3EA6FF]/20 rounded-xl p-6 space-y-6">
        {/* Form */}
        <form onSubmit={handleSeasonalPriceSubmit} className="space-y-6">
          {/* Tarih Aralığı */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Başlangıç Tarihi</label>
              <input
                type="date"
                value={seasonalPriceForm.start_date}
                onChange={(e) => setSeasonalPriceForm({ ...seasonalPriceForm, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Bitiş Tarihi</label>
              <input
                type="date"
                value={seasonalPriceForm.end_date}
                onChange={(e) => setSeasonalPriceForm({ ...seasonalPriceForm, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              />
            </div>
          </div>

          {/* Fiyat ve Para Birimi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Fiyat</label>
              <input
                type="number"
                step="0.01"
                value={seasonalPriceForm.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                placeholder="Fiyat girin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Para Birimi</label>
              <select
                value={seasonalPriceForm.currency}
                onChange={(e) => setSeasonalPriceForm({ ...seasonalPriceForm, currency: e.target.value })}
                className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                required
              >
                <option value="TRY">TRY</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Tur Tipleri */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Tur Tipleri</label>
            <div className="bg-[#2D2F33] border border-[#2D2F33] rounded-lg p-4 max-h-40 overflow-y-auto">
              {tourTypes.map(tourType => (
                <label key={tourType.id} className="flex items-center justify-between py-2 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={seasonalPriceForm.tour_type_ids.includes(tourType.id)}
                      onChange={() => handleToggleTourType(tourType.id)}
                      className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#3EA6FF] rounded focus:ring-[#3EA6FF]"
                    />
                    <span className="text-white">{tourType.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    tourType.pricing_model === 'vehicle_based'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {tourType.pricing_model === 'vehicle_based' ? 'Araç Bazlı' : 'Kişi Bazlı'}
                  </span>
                </label>
              ))}
              {tourTypes.length === 0 && (
                <p className="text-[#A5A5A5] text-sm">Henüz tur tipi eklenmemiş</p>
              )}
            </div>
          </div>

          {/* Cari Hesaplar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white">Cari Hesaplar</label>
              <Button
                type="button"
                onClick={handleSelectAllCaris}
                variant="outline"
                className="text-xs border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                {selectedCaris.length === cariAccounts.length && cariAccounts.length > 0 ? 'Tümünü Kaldır' : 'Hepsini Seç'}
              </Button>
            </div>
            
            {/* Arama */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-4" />
                <input
                  type="text"
                  placeholder="Cari ara..."
                  value={cariSearchFilter}
                  onChange={(e) => setCariSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                />
              </div>
            </div>

            {/* Cari Listesi */}
            <div className="bg-[#2D2F33] border border-[#2D2F33] rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {filteredCariAccountsForSeasonal.map(cari => {
                const isSelected = selectedCaris.includes(cari.id);
                return (
                  <div key={cari.id} className="flex items-center space-x-3 p-2 hover:bg-[#3EA6FF]/10 rounded">
                    <button
                      type="button"
                      onClick={() => handleToggleCari(cari.id)}
                      className="flex items-center space-x-2 flex-1"
                    >
                      {isSelected ? (
                        <CheckSquare className="text-[#3EA6FF] size-5" />
                      ) : (
                        <Square className="text-[#A5A5A5] size-5" />
                      )}
                      <span className="text-white">{cari.name}</span>
                    </button>
                  </div>
                );
              })}
              {filteredCariAccountsForSeasonal.length === 0 && (
                <p className="text-[#A5A5A5] text-sm text-center py-4">Cari hesap bulunamadı</p>
              )}
            </div>
          </div>

          {/* Yeni Cariler */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seasonalPriceForm.apply_to_new_caris}
                onChange={(e) => setSeasonalPriceForm({ ...seasonalPriceForm, apply_to_new_caris: e.target.checked })}
                className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#3EA6FF] rounded focus:ring-[#3EA6FF]"
              />
              <span className="text-white">Yeni cariler (Bu tarihler arasında oluşturulan her yeni cari için bu fiyatlar geçerli olacak)</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetSeasonalPriceForm}
              className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#3EA6FF] hover:bg-[#005a9e] text-white"
            >
              {editingSeasonalPrice ? 'Güncelle' : 'Kaydet'}
            </Button>
          </div>
        </form>

        {/* Kaydedilmiş Fiyatlar Listesi */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-4">Kaydedilmiş Fiyatlar</h3>
          <div className="space-y-3">
            {seasonalPrices.map(price => (
              <div key={price.id} className="bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-white font-semibold">
                        {format(new Date(price.start_date), 'dd.MM.yyyy', { locale: tr })} - {format(new Date(price.end_date), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                      <span className="text-[#3EA6FF]">{price.currency}</span>
                      {price.apply_to_new_caris && (
                        <span className="px-2 py-1 bg-[#3EA6FF]/20 text-[#3EA6FF] text-xs rounded">Yeni Cariler</span>
                      )}
                    </div>
                    <div className="text-sm text-[#A5A5A5]">
                      <p>Tur Tipleri: {price.tour_type_ids?.length || 0} adet</p>
                      <p>Cari Sayısı: {Object.keys(price.cari_prices || {}).length} adet</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => handleEditSeasonalPrice(price)}
                      variant="outline"
                      className="border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleDeleteSeasonalPrice(price.id)}
                      variant="outline"
                      className="border-[#2D2F33] text-red-400 hover:bg-[#2D2F33]"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {seasonalPrices.length === 0 && (
              <p className="text-center text-[#A5A5A5] py-8">Henüz fiyat kaydedilmemiş</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalPrices;