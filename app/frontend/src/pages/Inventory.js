import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, AlertTriangle, Calendar, Car } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, differenceInDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const Inventory = () => {
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState({
    total_vehicles: 0,
    category_stats: [],
    warning_stats: { expired: 0, one_month: 0, three_months: 0, total_warnings: 0 }
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [warningFilter, setWarningFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    category_id: '',
    brand: '',
    model: '',
    insurance_expiry: '',
    inspection_expiry: '',
    notes: ''
  });

  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    fetchCategories();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, warningFilter]);

  useEffect(() => {
    fetchStatistics();
  }, [vehicles]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/vehicle-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      if (warningFilter !== 'all') {
        params.warning_type = warningFilter;
      }
      const response = await axios.get(`${API}/inventory`, { params });
      setVehicles(response.data);
    } catch (error) {
      toast.error('Envanter yüklenemedi');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/inventory/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.plate_number) {
        toast.error('Lütfen plaka numarası girin');
        return;
      }
      if (!formData.category_id) {
        toast.error('Lütfen kategori seçin');
        return;
      }

      if (editingVehicle) {
        await axios.put(`${API}/inventory/${editingVehicle.id}`, formData);
        toast.success('Araç güncellendi');
      } else {
        await axios.post(`${API}/inventory`, formData);
        toast.success('Araç eklendi');
      }
      setDialogOpen(false);
      setEditingVehicle(null);
      resetForm();
      fetchInventory();
      fetchStatistics();
    } catch (error) {
      console.error('Araç kaydetme hatası:', error);
      toast.error(error.response?.data?.detail || 'Araç kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Aracı Sil",
      message: "Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API}/inventory/${id}`);
      toast.success('Araç silindi');
      fetchInventory();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Araç silinemedi');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number || '',
      category_id: vehicle.category_id || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      inspection_expiry: vehicle.inspection_expiry || '',
      notes: vehicle.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      plate_number: '',
      category_id: '',
      brand: '',
      model: '',
      insurance_expiry: '',
      inspection_expiry: '',
      notes: ''
    });
    setEditingVehicle(null);
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = parseISO(expiryDate);
    const today = new Date();
    return differenceInDays(expiry, today);
  };

  const formatExpiryDate = (date) => {
    if (!date) return '-';
    return format(parseISO(date), 'dd.MM.yyyy', { locale: tr });
  };

  const getWarningColor = (warnings) => {
    if (!warnings || warnings.length === 0) return '';
    const hasExpired = warnings.some(w => w.status === 'expired');
    const has1Month = warnings.some(w => w.status === '1month');
    if (hasExpired) return 'bg-red-500/20 border-red-500/50';
    if (has1Month) return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-yellow-500/20 border-yellow-500/50';
  };

  // Kategori bazlı gruplama
  const groupedVehicles = selectedCategory === 'all' 
    ? categories.reduce((acc, category) => {
        const categoryVehicles = vehicles.filter(v => v.category_id === category.id);
        if (categoryVehicles.length > 0) {
          acc.push({ category, vehicles: categoryVehicles });
        }
        return acc;
      }, [])
    : [{ category: categories.find(c => c.id === selectedCategory) || { name: 'Seçili Kategori' }, vehicles }];

  // Kategorisiz araçlar
  const uncategorizedVehicles = vehicles.filter(v => !v.category_id || !categories.find(c => c.id === v.category_id));
  if (selectedCategory === 'all' && uncategorizedVehicles.length > 0) {
    groupedVehicles.push({ category: { name: 'Kategorisiz', id: null }, vehicles: uncategorizedVehicles });
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Envanter Yönetimi</h1>
          <p className="text-[#A5A5A5]">Araç envanteri ve takip sistemi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingVehicle(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
              <Plus size={20} className="mr-2" />
              Araç Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingVehicle ? 'Araç Düzenle' : 'Yeni Araç Ekle'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plaka Numarası *</label>
                  <input
                    type="text"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                    placeholder="34 ABC 123"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Araç Kategorisi *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    required
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Marka</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="Örn: Honda, Toyota"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                    placeholder="Örn: CRF 250, Land Cruiser"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sigorta Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Muayene Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.inspection_expiry}
                    onChange={(e) => setFormData({ ...formData, inspection_expiry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                  rows="3"
                  placeholder="Ek notlar..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingVehicle(null);
                    resetForm();
                  }}
                  className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
                >
                  İptal
                </Button>
                <Button type="submit" className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white">
                  {editingVehicle ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="text-[#A5A5A5] text-xs mb-1">Toplam Araç</div>
          <div className="text-2xl font-bold text-white">{statistics.total_vehicles}</div>
        </div>
        
        {statistics.category_stats.slice(0, 4).map((stat) => (
          <div key={stat.category_id || 'uncategorized'} className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <div className="text-[#A5A5A5] text-xs mb-1 truncate">{stat.category_name}</div>
            <div className="text-2xl font-bold text-[#3EA6FF]">{stat.count}</div>
          </div>
        ))}
        
        {statistics.warning_stats.expired > 0 && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div className="text-red-400 text-xs mb-1">Süresi Dolmuş</div>
            <div className="text-2xl font-bold text-red-400">{statistics.warning_stats.expired}</div>
          </div>
        )}
        
        {statistics.warning_stats.one_month > 0 && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-4">
            <div className="text-orange-400 text-xs mb-1">1 Ay İçinde</div>
            <div className="text-2xl font-bold text-orange-400">{statistics.warning_stats.one_month}</div>
          </div>
        )}
      </div>

      {/* Kritik Uyarılar Banner */}
      {(statistics.warning_stats.expired > 0 || statistics.warning_stats.one_month > 0) && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold mb-1">Dikkat: Yaklaşan Son Tarihler</p>
            <p className="text-red-300 text-sm">
              {statistics.warning_stats.expired > 0 && (
                <span>{statistics.warning_stats.expired} aracın sigorta/muayene süresi dolmuş. </span>
              )}
              {statistics.warning_stats.one_month > 0 && (
                <span>{statistics.warning_stats.one_month} aracın sigorta/muayene süresi 1 ay içinde dolacak.</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => setWarningFilter(warningFilter === 'expired' ? 'all' : 'expired')}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Göster
          </Button>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2 text-white">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2 text-white">Uyarı Durumu</label>
            <select
              value={warningFilter}
              onChange={(e) => setWarningFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
            >
              <option value="all">Tümü</option>
              <option value="expired">Süresi Dolmuş</option>
              <option value="1month">1 Ay İçinde Dolacak</option>
              <option value="3months">3 Ay İçinde Dolacak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kategori Bazlı Listeleme */}
      <div className="space-y-6">
        {groupedVehicles.length === 0 ? (
          <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-12 text-center">
            <p className="text-[#A5A5A5]">
              {selectedCategory === 'all' ? 'Henüz araç eklenmemiş' : 'Bu filtreye uygun araç bulunamadı'}
            </p>
          </div>
        ) : (
          groupedVehicles.map(({ category, vehicles: categoryVehicles }) => (
            <div key={category.id || 'uncategorized'} className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
              <div className="bg-[#2D2F33] px-6 py-4 border-b border-[#2D2F33]">
                <h3 className="text-lg font-semibold text-white">
                  {category.name} <span className="text-[#3EA6FF]">({categoryVehicles.length})</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Plaka</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Marka/Model</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Sigorta</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Muayene</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2F33]">
                    {categoryVehicles.map((vehicle) => {
                      const warnings = vehicle.warnings || [];
                      const warningColor = getWarningColor(warnings);
                      
                      return (
                        <tr
                          key={vehicle.id}
                          className={`hover:bg-[#2D2F33]/50 ${warningColor}`}
                        >
                          <td className="px-6 py-4 text-white text-sm font-semibold">
                            {vehicle.plate_number}
                          </td>
                          <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                            {vehicle.brand && vehicle.model ? `${vehicle.brand} ${vehicle.model}` : vehicle.brand || vehicle.model || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {vehicle.insurance_expiry ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-white">{formatExpiryDate(vehicle.insurance_expiry)}</span>
                                {warnings.some(w => w.type === 'insurance') && (
                                  <span className="text-xs text-red-400">
                                    {warnings.find(w => w.type === 'insurance')?.status === 'expired' ? 'Süresi dolmuş' : 
                                     warnings.find(w => w.type === 'insurance')?.status === '1month' ? `${warnings.find(w => w.type === 'insurance')?.days} gün kaldı` :
                                     `${warnings.find(w => w.type === 'insurance')?.days} gün kaldı`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#A5A5A5]">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {vehicle.inspection_expiry ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-white">{formatExpiryDate(vehicle.inspection_expiry)}</span>
                                {warnings.some(w => w.type === 'inspection') && (
                                  <span className="text-xs text-red-400">
                                    {warnings.find(w => w.type === 'inspection')?.status === 'expired' ? 'Süresi dolmuş' : 
                                     warnings.find(w => w.type === 'inspection')?.status === '1month' ? `${warnings.find(w => w.type === 'inspection')?.days} gün kaldı` :
                                     `${warnings.find(w => w.type === 'inspection')?.days} gün kaldı`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#A5A5A5]">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {warnings.length > 0 ? (
                              <div className="space-y-1">
                                {warnings.map((warning, idx) => {
                                  const isExpired = warning.status === 'expired';
                                  const isOneMonth = warning.status === '1month';
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                                        isExpired
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                          : isOneMonth
                                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                      }`}
                                    >
                                      <AlertTriangle size={12} />
                                      <span>
                                        {warning.type === 'insurance' ? 'Sigorta' : 'Muayene'}: {
                                          isExpired
                                            ? 'Süresi dolmuş'
                                            : `${warning.days} gün kaldı`
                                        }
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-green-400 text-xs">✓ Normal</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(vehicle)}
                                className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                                title="Düzenle"
                              >
                                <Edit size={18} className="text-[#3EA6FF]" />
                              </button>
                              <button
                                onClick={() => handleDelete(vehicle.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Sil"
                              >
                                <Trash2 size={18} className="text-red-400" />
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
          ))
        )}
      </div>
      {dialog}
    </div>
  );
};

export default Inventory;