import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin, Search, Filter, CheckSquare, Square, TrendingUp, GripVertical, Palette, Image as ImageIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TourTypes = () => {
  const [tourTypes, setTourTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTourType, setEditingTourType] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [selectedTourTypes, setSelectedTourTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all, active, inactive
  const [formData, setFormData] = useState({
    name: '',
    duration_hours: '',
    description: '',
    order: 0,
    color: '#3EA6FF',
    icon: '',
    is_active: true,
    pricing_model: 'vehicle_based'
  });

  useEffect(() => {
    fetchTourTypes();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchTourTypes();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    // Fetch statistics for all tour types
    tourTypes.forEach(tt => {
      if (!statistics[tt.id]) {
        fetchTourTypeStatistics(tt.id);
      }
    });
  }, [tourTypes]);

  const fetchTourTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tour-types`);
      const sorted = (response.data || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setTourTypes(sorted);
    } catch (error) {
      toast.error('Tur tipleri yüklenemedi');
      console.error('Error fetching tour types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTourTypeStatistics = async (tourTypeId) => {
    try {
      const response = await axios.get(`${API}/tour-types/${tourTypeId}/statistics`);
      setStatistics(prev => ({ ...prev, [tourTypeId]: response.data }));
    } catch (error) {
      console.error('Error fetching tour type statistics:', error);
    }
  };

  const filteredAndSortedTourTypes = useMemo(() => {
    let filtered = tourTypes;
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(tt => 
        tt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tt.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Active/Inactive filter
    if (filterActive === 'active') {
      filtered = filtered.filter(tt => tt.is_active !== false);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(tt => tt.is_active === false);
    }
    
    return filtered;
  }, [tourTypes, searchQuery, filterActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        duration_hours: parseFloat(formData.duration_hours),
        description: formData.description || null,
        order: parseInt(formData.order) || 0,
        color: formData.color,
        icon: formData.icon || null,
        is_active: formData.is_active,
        pricing_model: formData.pricing_model || 'vehicle_based'
      };

      if (editingTourType) {
        await axios.put(`${API}/tour-types/${editingTourType.id}`, data);
        toast.success('Tur tipi güncellendi');
      } else {
        await axios.post(`${API}/tour-types`, data);
        toast.success('Tur tipi eklendi');
      }
      setDialogOpen(false);
      resetForm();
      fetchTourTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || (editingTourType ? 'Tur tipi güncellenemedi' : 'Tur tipi eklenemedi'));
      console.error('Error saving tour type:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu tur tipini silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      await axios.delete(`${API}/tour-types/${id}`);
      toast.success('Tur tipi silindi');
      fetchTourTypes();
    } catch (error) {
      toast.error('Tur tipi silinemedi');
      console.error('Error deleting tour type:', error);
    }
  };

  const handleEdit = (tourType) => {
    setEditingTourType(tourType);
    setFormData({
      name: tourType.name || '',
      duration_hours: tourType.duration_hours?.toString() || '',
      description: tourType.description || '',
      order: tourType.order || 0,
      color: tourType.color || '#3EA6FF',
      icon: tourType.icon || '',
      is_active: tourType.is_active !== false,
      pricing_model: tourType.pricing_model || 'vehicle_based'
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      duration_hours: '',
      description: '',
      order: 0,
      color: '#3EA6FF',
      icon: '',
      is_active: true,
      pricing_model: 'vehicle_based'
    });
    setEditingTourType(null);
  };

  const toggleTourTypeSelection = (id) => {
    setSelectedTourTypes(prev => 
      prev.includes(id) ? prev.filter(selId => selId !== id) : [...prev, id]
    );
  };

  const toggleAllTourTypesSelection = () => {
    if (selectedTourTypes.length === filteredAndSortedTourTypes.length) {
      setSelectedTourTypes([]);
    } else {
      setSelectedTourTypes(filteredAndSortedTourTypes.map(tt => tt.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTourTypes.length === 0) {
      toast.error('Lütfen silmek için en az bir tur tipi seçin');
      return;
    }
    if (!window.confirm(`${selectedTourTypes.length} tur tipini silmek istediğinizden emin misiniz?`)) return;
    
    try {
      await Promise.all(selectedTourTypes.map(id => axios.delete(`${API}/tour-types/${id}`)));
      toast.success(`${selectedTourTypes.length} tur tipi silindi`);
      setSelectedTourTypes([]);
      fetchTourTypes();
    } catch (error) {
      toast.error('Tur tipleri silinemedi');
    }
  };

  const handleBulkToggleActive = async (isActive) => {
    if (selectedTourTypes.length === 0) {
      toast.error('Lütfen işlem yapmak için en az bir tur tipi seçin');
      return;
    }
    
    try {
      await Promise.all(selectedTourTypes.map(id => 
        axios.put(`${API}/tour-types/${id}`, { is_active: isActive })
      ));
      toast.success(`${selectedTourTypes.length} tur tipi ${isActive ? 'aktif' : 'pasif'} yapıldı`);
      setSelectedTourTypes([]);
      fetchTourTypes();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleDialogClose = (open) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tour-types-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tur Tipleri</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className="bg-[#3EA6FF] hover:bg-[#005a9e] text-white"
            >
              <Plus size={20} className="mr-2" />
              Yeni Tur Tipi
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingTourType ? 'Tur Tipi Düzenle' : 'Yeni Tur Tipi'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tur Tipi Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                  required
                  placeholder="Örn: ATV Turu, Jeep Safari"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Süre (Saat) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    required
                    placeholder="Örn: 2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sıralama</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Renk</label>
                  
                  {/* Hazır Renk Paleti */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-2 text-[#A5A5A5]">Hazır Renkler</label>
                    <div className="grid grid-cols-8 gap-2">
                      {/* 1 saatlik turlar için: Yeşil tonları */}
                      {['#10B981', '#059669', '#047857', '#065F46'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {/* 2 saatlik turlar için: Mavi tonları */}
                      {['#3EA6FF', '#2563EB', '#1D4ED8', '#1E40AF'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {/* 3 saatlik turlar için: Mor tonları */}
                      {['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {/* 4 saatlik turlar için: Turuncu tonları */}
                      {['#F59E0B', '#D97706', '#B45309', '#92400E'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {/* 5+ saatlik turlar için: Kırmızı tonları */}
                      {['#EF4444', '#DC2626', '#B91C1C', '#991B1B'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {/* Özel renkler */}
                      {['#EC4899', '#14B8A6', '#F97316', '#84CC16'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                            formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#25272A]' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Özel Renk Seç */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#A5A5A5]">Özel Renk Seç</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-16 h-10 bg-[#2D2F33] border border-[#2D2F33] rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                        placeholder="#3EA6FF"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">İkon (Opsiyonel)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                    placeholder="İkon adı veya URL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                  rows="3"
                  placeholder="Tur tipi hakkında açıklama (opsiyonel)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fiyatlandırma Modeli *</label>
                <Select
                  value={formData.pricing_model}
                  onValueChange={(value) => setFormData({ ...formData, pricing_model: value })}
                >
                  <SelectTrigger className="w-full bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#25272A] border-[#2D2F33]">
                    <SelectItem value="vehicle_based">Araç Bazlı</SelectItem>
                    <SelectItem value="person_based">Kişi Bazlı</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#A5A5A5] mt-1">
                  {formData.pricing_model === 'vehicle_based' 
                    ? 'Fiyat araç sayısına göre hesaplanır' 
                    : 'Fiyat kişi sayısına göre hesaplanır'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <label className="text-sm font-medium text-white">Aktif</label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#3EA6FF] hover:bg-[#005a9e] text-white"
                >
                  {editingTourType ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtreler ve Arama */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
          <Input
            type="text"
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#2D2F33] border-[#2D2F33] text-white placeholder:text-[#A5A5A5]"
          />
        </div>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[180px] bg-[#2D2F33] border-[#2D2F33] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#25272A] border-[#2D2F33]">
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
        {selectedTourTypes.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 size={16} className="mr-2" />
              Seçili Olanları Sil ({selectedTourTypes.length})
            </Button>
            <Button
              onClick={() => handleBulkToggleActive(true)}
              variant="outline"
              size="sm"
              className="border-green-500 text-green-400 hover:bg-green-500/20"
            >
              Aktif Yap ({selectedTourTypes.length})
            </Button>
            <Button
              onClick={() => handleBulkToggleActive(false)}
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
            >
              Pasif Yap ({selectedTourTypes.length})
            </Button>
          </div>
        )}
      </div>

      {filteredAndSortedTourTypes.length === 0 ? (
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-12 text-center">
          <MapPin size={48} className="text-gray-500 mx-auto mb-4" />
          <p className="text-[#A5A5A5] text-lg mb-2">Henüz tur tipi eklenmemiş</p>
          <p className="text-gray-500 text-sm">Yeni tur tipi eklemek için yukarıdaki butonu kullanın</p>
        </div>
      ) : (
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2d2d30] border-b border-[#2D2F33]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleAllTourTypesSelection} className="text-[#A5A5A5] hover:text-white">
                      {selectedTourTypes.length === filteredAndSortedTourTypes.length && filteredAndSortedTourTypes.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Sıra</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tur Tipi Adı</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Süre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fiyatlandırma Modeli</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Varsayılan Fiyat</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">İstatistikler</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Durum</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3e3e42]">
                {filteredAndSortedTourTypes.map((tourType) => {
                  const stats = statistics[tourType.id];
                  return (
                    <tr key={tourType.id} className="hover:bg-[#2d2d30] transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleTourTypeSelection(tourType.id)} className="text-[#A5A5A5] hover:text-white">
                          {selectedTourTypes.includes(tourType.id) ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-[#A5A5A5]">{tourType.order || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {tourType.color && (
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: tourType.color }}
                            />
                          )}
                          <span className="text-white font-medium">{tourType.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{tourType.duration_hours} saat</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tourType.pricing_model === 'vehicle_based'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {tourType.pricing_model === 'vehicle_based' ? 'Araç Bazlı' : 'Kişi Bazlı'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        Fiyat Yönetimi'nden belirlenir
                      </td>
                      <td className="px-6 py-4">
                        {stats ? (
                          <div className="text-xs text-[#A5A5A5]">
                            <div>Rezervasyon: {stats.total_reservations || 0}</div>
                            <div className="flex gap-2 mt-1">
                              {Object.entries(stats.total_revenue || {}).filter(([_, v]) => v > 0).map(([curr, val]) => (
                                <span key={curr} className="text-green-400">
                                  {curr}: {val.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#A5A5A5]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {tourType.is_active !== false ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Aktif</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Pasif</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tourType)}
                            className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit size={18} className="text-[#3EA6FF]" />
                          </button>
                          <button
                            onClick={() => handleDelete(tourType.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourTypes;
