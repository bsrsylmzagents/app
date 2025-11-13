import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [tourTypes, setTourTypes] = useState([]);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [cariDialogOpen, setCariDialogOpen] = useState(false);
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [cariSearch, setCariSearch] = useState('');

  const [formData, setFormData] = useState({
    cari_id: '',
    date: '',
    time: '',
    tour_type_id: '',
    customer_name: '',
    person_count: 1,
    atv_count: 1,
    pickup_location: '',
    pickup_maps_link: '',
    price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    notes: ''
  });

  const [newCariData, setNewCariData] = useState({
    name: '',
    phone: '',
    pickup_location: ''
  });

  useEffect(() => {
    fetchReservations();
    fetchCariAccounts();
    fetchTourTypes();
    fetchRates();
  }, [filteredStatus]);

  const fetchReservations = async () => {
    try {
      const response = await axios.get(`${API}/reservations`, {
        params: { status: filteredStatus || undefined }
      });
      setReservations(response.data);
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi');
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

  const fetchTourTypes = async () => {
    try {
      const response = await axios.get(`${API}/tour-types`);
      setTourTypes(response.data);
    } catch (error) {
      console.error('Tur tipleri yüklenemedi');
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
      if (editingReservation) {
        await axios.put(`${API}/reservations/${editingReservation.id}`, formData);
        toast.success('Rezervasyon güncellendi');
      } else {
        await axios.post(`${API}/reservations`, formData);
        toast.success('Rezervasyon oluşturuldu');
      }
      setDialogOpen(false);
      setEditingReservation(null);
      resetForm();
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Rezervasyon kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Rezervasyonu silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/reservations/${id}`);
      toast.success('Rezervasyon silindi');
      fetchReservations();
    } catch (error) {
      toast.error('Rezervasyon silinemedi');
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setFormData({
      cari_id: reservation.cari_id,
      date: reservation.date,
      time: reservation.time,
      tour_type_id: reservation.tour_type_id || '',
      customer_name: reservation.customer_name,
      person_count: reservation.person_count,
      atv_count: reservation.atv_count,
      pickup_location: reservation.pickup_location || '',
      pickup_maps_link: reservation.pickup_maps_link || '',
      price: reservation.price,
      currency: reservation.currency,
      exchange_rate: reservation.exchange_rate,
      notes: reservation.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      cari_id: '',
      date: '',
      time: '',
      tour_type_id: '',
      customer_name: '',
      person_count: 1,
      atv_count: 1,
      pickup_location: '',
      pickup_maps_link: '',
      price: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      notes: ''
    });
  };

  const handleCariSelect = (cariId) => {
    const cari = cariAccounts.find(c => c.id === cariId);
    if (cari) {
      setFormData({
        ...formData,
        cari_id: cariId,
        pickup_location: cari.pickup_location || '',
        pickup_maps_link: cari.pickup_maps_link || ''
      });
    }
  };

  const handleQuickCreateCari = async () => {
    try {
      const response = await axios.post(`${API}/cari-accounts`, newCariData);
      toast.success('Cari hesap oluşturuldu');
      setCariDialogOpen(false);
      setNewCariData({ name: '', phone: '', pickup_location: '' });
      fetchCariAccounts();
      setFormData({ ...formData, cari_id: response.data.id });
    } catch (error) {
      toast.error('Cari hesap oluşturulamadı');
    }
  };

  const filteredCariAccounts = cariAccounts.filter(c => 
    c.name.toLowerCase().includes(cariSearch.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="reservations-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Rezervasyonlar</h1>
        <div className="flex items-center gap-4">
          <select
            value={filteredStatus}
            onChange={(e) => setFilteredStatus(e.target.value)}
            className="w-48 px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
            data-testid="status-filter"
          >
            <option value="">Tümü</option>
            <option value="confirmed">Onaylandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-reservation-btn" onClick={() => { setEditingReservation(null); resetForm(); }}>
                <Plus size={18} className="mr-2" />
                Yeni Rezervasyon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0f1419] border-[#14b8dc]/30 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {editingReservation ? 'Rezervasyonu Düzenle' : 'Yeni Rezervasyon'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Cari Firma</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cari ara (ilk 2 harf)..."
                        value={cariSearch}
                        onChange={(e) => setCariSearch(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
                        data-testid="cari-search-input"
                      />
                      <Dialog open={cariDialogOpen} onOpenChange={setCariDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" className="bg-[#14b8dc] hover:bg-[#106ebe]" data-testid="quick-create-cari-btn">
                            <Plus size={18} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f1419] border-[#14b8dc]/30 text-white">
                          <DialogHeader>
                            <DialogTitle>Hızlı Cari Oluştur</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Firma Adı"
                              value={newCariData.name}
                              onChange={(e) => setNewCariData({ ...newCariData, name: e.target.value })}
                              className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                              data-testid="new-cari-name"
                            />
                            <input
                              type="text"
                              placeholder="Telefon"
                              value={newCariData.phone}
                              onChange={(e) => setNewCariData({ ...newCariData, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                            />
                            <input
                              type="text"
                              placeholder="Pick-up Yeri"
                              value={newCariData.pickup_location}
                              onChange={(e) => setNewCariData({ ...newCariData, pickup_location: e.target.value })}
                              className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                            />
                            <Button type="button" onClick={handleQuickCreateCari} className="w-full btn-primary" data-testid="create-cari-submit">
                              Oluştur
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {cariSearch.length >= 2 && (
                      <div className="mt-2 max-h-40 overflow-y-auto bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg">
                        {filteredCariAccounts.map(cari => (
                          <div
                            key={cari.id}
                            onClick={() => { handleCariSelect(cari.id); setCariSearch(''); }}
                            className="px-3 py-2 hover:bg-[#14b8dc]/20 cursor-pointer text-sm"
                            data-testid={`cari-option-${cari.id}`}
                          >
                            {cari.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tarih</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      required
                      data-testid="reservation-date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Saat</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      required
                      data-testid="reservation-time"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Tur Tipi</label>
                    <select
                      value={formData.tour_type_id}
                      onChange={(e) => setFormData({ ...formData, tour_type_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
                    >
                      <option value="">Tur tipi seçin</option>
                      {tourTypes.map(tt => (
                        <option key={tt.id} value={tt.id}>{tt.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Müşteri Adı</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      required
                      data-testid="customer-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Kişi Sayısı</label>
                    <input
                      type="number"
                      value={formData.person_count}
                      onChange={(e) => setFormData({ ...formData, person_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">ATV Sayısı</label>
                    <input
                      type="number"
                      value={formData.atv_count}
                      onChange={(e) => setFormData({ ...formData, atv_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      min="1"
                      required
                      data-testid="atv-count"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Pick-up Yeri</label>
                    <input
                      type="text"
                      value={formData.pickup_location}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Google Maps Link</label>
                    <input
                      type="url"
                      value={formData.pickup_maps_link}
                      onChange={(e) => setFormData({ ...formData, pickup_maps_link: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      placeholder="https://maps.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Fiyat</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      required
                      data-testid="reservation-price"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Döviz</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value, exchange_rate: rates[e.target.value] })}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
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
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                      rows="3"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full btn-primary" data-testid="submit-reservation">
                  {editingReservation ? 'Güncelle' : 'Oluştur'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#14b8dc]/10 border-b border-[#14b8dc]/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tarih/Saat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Müşteri</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cari Firma</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">ATV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fiyat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Durum</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14b8dc]/10">
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-[#14b8dc]/5" data-testid={`reservation-row-${reservation.id}`}>
                  <td className="px-6 py-4 text-white text-sm">
                    {reservation.date} {reservation.time}
                  </td>
                  <td className="px-6 py-4 text-white text-sm">{reservation.customer_name}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{reservation.cari_name}</td>
                  <td className="px-6 py-4 text-[#14b8dc] text-sm font-semibold">{reservation.atv_count}</td>
                  <td className="px-6 py-4 text-white text-sm">
                    {reservation.price} {reservation.currency}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      reservation.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      reservation.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {reservation.status === 'confirmed' ? 'Onaylandı' :
                       reservation.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(reservation)}
                        className="p-2 hover:bg-[#14b8dc]/20 rounded-lg transition-colors"
                        data-testid={`edit-reservation-${reservation.id}`}
                      >
                        <Edit size={18} className="text-[#14b8dc]" />
                      </button>
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        data-testid={`delete-reservation-${reservation.id}`}
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reservations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">Henüz rezervasyon bulunmamaktadır</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reservations;
