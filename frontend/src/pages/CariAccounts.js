import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CariAccounts = () => {
  const [cariAccounts, setCariAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCari, setEditingCari] = useState(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    authorized_person: '',
    phone: '',
    email: '',
    address: '',
    tax_office: '',
    tax_number: '',
    pickup_location: '',
    pickup_maps_link: '',
    notes: ''
  });

  useEffect(() => {
    fetchCariAccounts();
  }, []);

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      setCariAccounts(response.data);
    } catch (error) {
      toast.error('Cari hesaplar yüklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCari) {
        await axios.put(`${API}/cari-accounts/${editingCari.id}`, formData);
        toast.success('Cari hesap güncellendi');
      } else {
        await axios.post(`${API}/cari-accounts`, formData);
        toast.success('Cari hesap oluşturuldu');
      }
      setDialogOpen(false);
      setEditingCari(null);
      resetForm();
      fetchCariAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cari hesap kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cari hesabı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/cari-accounts/${id}`);
      toast.success('Cari hesap silindi');
      fetchCariAccounts();
    } catch (error) {
      toast.error('Cari hesap silinemedi');
    }
  };

  const handleEdit = (cari) => {
    setEditingCari(cari);
    setFormData({
      name: cari.name,
      authorized_person: cari.authorized_person || '',
      phone: cari.phone || '',
      email: cari.email || '',
      address: cari.address || '',
      tax_office: cari.tax_office || '',
      tax_number: cari.tax_number || '',
      pickup_location: cari.pickup_location || '',
      pickup_maps_link: cari.pickup_maps_link || '',
      notes: cari.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      authorized_person: '',
      phone: '',
      email: '',
      address: '',
      tax_office: '',
      tax_number: '',
      pickup_location: '',
      pickup_maps_link: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6" data-testid="cari-accounts-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Cari Firmalar</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="new-cari-btn" onClick={() => { setEditingCari(null); resetForm(); }}>
              <Plus size={18} className="mr-2" />
              Yeni Cari
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[#0f1419] border-[#14b8dc]/30 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingCari ? 'Cariyi Düzenle' : 'Yeni Cari'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Firma Adı" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" required data-testid="cari-name" />
              <input type="text" placeholder="Yetkili Kişi" value={formData.authorized_person} onChange={(e) => setFormData({ ...formData, authorized_person: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              <div className="grid grid-cols-2 gap-4">
                <input type="tel" placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
                <input type="email" placeholder="E-posta" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              </div>
              <textarea placeholder="Adres" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" rows="2" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Vergi Dairesi" value={formData.tax_office} onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
                <input type="text" placeholder="Vergi Numarası" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              </div>
              <input type="text" placeholder="Pick-up Yeri" value={formData.pickup_location} onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              <input type="url" placeholder="Google Maps Link" value={formData.pickup_maps_link} onChange={(e) => setFormData({ ...formData, pickup_maps_link: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              <textarea placeholder="Notlar" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" rows="2" />
              <Button type="submit" className="w-full btn-primary" data-testid="submit-cari">{editingCari ? 'Güncelle' : 'Oluştur'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cariAccounts.map((cari) => (
          <div key={cari.id} className="card-hover bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6" data-testid={`cari-card-${cari.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{cari.name}</h3>
                {cari.authorized_person && <p className="text-sm text-gray-400 mt-1">{cari.authorized_person}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(cari)} className="p-2 hover:bg-[#14b8dc]/20 rounded-lg" data-testid={`edit-cari-${cari.id}`}>
                  <Edit size={16} className="text-[#14b8dc]" />
                </button>
                <button onClick={() => handleDelete(cari.id)} className="p-2 hover:bg-red-500/20 rounded-lg" data-testid={`delete-cari-${cari.id}`}>
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {cari.phone && <p className="text-sm text-gray-400"><span className="text-white">Tel:</span> {cari.phone}</p>}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bakiye EUR:</span>
                <span className={cari.balance_eur > 0 ? 'text-green-400 font-semibold' : cari.balance_eur < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}>{cari.balance_eur.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bakiye USD:</span>
                <span className={cari.balance_usd > 0 ? 'text-green-400 font-semibold' : cari.balance_usd < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}>{cari.balance_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bakiye TRY:</span>
                <span className={cari.balance_try > 0 ? 'text-green-400 font-semibold' : cari.balance_try < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}>{cari.balance_try.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => navigate(`/cari-accounts/${cari.id}`)} className="w-full btn-primary py-2 rounded-lg flex items-center justify-center gap-2" data-testid={`view-cari-${cari.id}`}>
              Detay Görüntüle
              <ExternalLink size={16} />
            </button>
          </div>
        ))}
      </div>
      {cariAccounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">Henüz cari firma bulunmamaktadır</p>
        </div>
      )}
    </div>
  );
};

export default CariAccounts;
