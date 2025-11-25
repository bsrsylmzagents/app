import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ExternalLink, Search, RefreshCw, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Loading from '../components/Loading';

const CariAccounts = () => {
  const [cariAccounts, setCariAccounts] = useState([]);
  const [filteredCariAccounts, setFilteredCariAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCari, setEditingCari] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchCariAccounts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCariAccounts(cariAccounts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cariAccounts.filter(cari => 
        (cari.name && cari.name.toLowerCase().includes(query)) ||
        (cari.authorized_person && cari.authorized_person.toLowerCase().includes(query)) ||
        (cari.phone && cari.phone.includes(query)) ||
        (cari.tax_number && cari.tax_number.includes(query)) ||
        (cari.email && cari.email.toLowerCase().includes(query)) ||
        (cari.tax_office && cari.tax_office.toLowerCase().includes(query)) ||
        (cari.cari_code && cari.cari_code.toLowerCase().includes(query))
      );
      setFilteredCariAccounts(filtered);
    }
  }, [searchQuery, cariAccounts]);

  const fetchCariAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/cari-accounts`);
      console.log('Cari hesaplar response:', response.data); // Debug için
      const data = response.data || [];
      setCariAccounts(data);
      setFilteredCariAccounts(data);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi:', error);
      console.error('Hata detayı:', error.response?.data); // Debug için
      toast.error(error.response?.data?.detail || 'Cari hesaplar yüklenemedi');
      setCariAccounts([]);
      setFilteredCariAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || formData.name.trim() === '') {
        toast.error('Firma adı zorunludur');
        return;
      }
      
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
      console.error('Cari hesap kaydetme hatası:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Cari hesap kaydedilemedi';
      toast.error(errorMessage);
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

  const handleRecalculateAllBalances = async () => {
    if (!window.confirm('Tüm cari hesapların bakiyeleri yeniden hesaplanacak. Devam etmek istiyor musunuz?')) {
      return;
    }
    
    try {
      setRecalculatingAll(true);
      const response = await axios.post(`${API}/cari-accounts/recalculate-all-balances`);
      toast.success(response.data.message);
      fetchCariAccounts(); // Listeyi yeniden yükle
    } catch (error) {
      console.error('Bakiyeler yeniden hesaplanamadı:', error);
      toast.error(error.response?.data?.detail || 'Bakiyeler yeniden hesaplanamadı');
    } finally {
      setRecalculatingAll(false);
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

  const handleCopyCode = async (cariCode) => {
    try {
      await navigator.clipboard.writeText(cariCode);
      setCopiedCode(cariCode);
      toast.success('Cari kodu kopyalandı!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Kopyalama başarısız');
    }
  };

  const getCariPanelUrl = (cariCode) => {
    if (!cariCode) return null;
    return `${window.location.origin}/r/${cariCode}`;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6" data-testid="cari-accounts-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Cari Firmalar</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleRecalculateAllBalances}
            disabled={recalculatingAll}
            className="bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
          >
            <RefreshCw size={18} className={`mr-2 ${recalculatingAll ? 'animate-spin' : ''}`} />
            {recalculatingAll ? 'Hesaplanıyor...' : 'Tüm Bakiyeleri Yeniden Hesapla'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-cari-btn" onClick={() => { setEditingCari(null); resetForm(); }}>
                <Plus size={18} className="mr-2" />
                Yeni Cari
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingCari ? 'Cariyi Düzenle' : 'Yeni Cari'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Firma Adı" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]" required data-testid="cari-name" />
              <input type="text" placeholder="Yetkili Kişi" value={formData.authorized_person} onChange={(e) => setFormData({ ...formData, authorized_person: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]" />
              <div className="grid grid-cols-2 gap-4">
                <input type="tel" placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
                <input type="email" placeholder="E-posta" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
              </div>
              <textarea placeholder="Adres" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" rows="2" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Vergi Dairesi" value={formData.tax_office} onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })} className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
                <input type="text" placeholder="Vergi Numarası" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} className="px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
              </div>
              <input type="text" placeholder="Pick-up Yeri" value={formData.pickup_location} onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
              <input type="url" placeholder="Google Maps Link" value={formData.pickup_maps_link} onChange={(e) => setFormData({ ...formData, pickup_maps_link: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" />
              <textarea placeholder="Notlar" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] focus:border-[#3EA6FF] rounded-lg text-white" rows="2" />
              <Button type="submit" className="w-full btn-primary" data-testid="submit-cari">{editingCari ? 'Güncelle' : 'Oluştur'}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Arama Kutusu */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5]" size={20} />
        <input
          type="text"
          placeholder="Cari ismi, cari kodu, yetkili ismi, telefon, vergi numarası ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF] transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCariAccounts.map((cari) => {
          const isMunferit = cari.is_munferit || cari.name === "Münferit";
          return (
          <div key={cari.id} className="card-hover bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6" data-testid={`cari-card-${cari.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">{cari.name}</h3>
                </div>
                {!isMunferit && cari.authorized_person && <p className="text-sm text-[#A5A5A5] mb-2">{cari.authorized_person}</p>}
                {!isMunferit && (
                  <div className="mt-2 mb-3 p-2 rounded-lg bg-[#2D2F33] border border-[#3EA6FF]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#A5A5A5]">Cari Kodu:</span>
                        {cari.cari_code ? (
                          <>
                            <span className="text-sm font-bold text-[#3EA6FF]">{cari.cari_code}</span>
                            <button
                              onClick={() => handleCopyCode(cari.cari_code)}
                              className="p-1 hover:bg-[#3EA6FF]/20 rounded transition-colors ml-1"
                              title="Kodu kopyala"
                            >
                              {copiedCode === cari.cari_code ? (
                                <Check size={14} className="text-green-400" />
                              ) : (
                                <Copy size={14} className="text-[#3EA6FF]" />
                              )}
                            </button>
                            {getCariPanelUrl(cari.cari_code) && (
                              <a
                                href={getCariPanelUrl(cari.cari_code)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-[#3EA6FF]/20 rounded transition-colors"
                                title="Rezervasyon paneline git"
                              >
                                <ExternalLink size={14} className="text-[#3EA6FF]" />
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-yellow-400 italic">Kod oluşturuluyor...</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!isMunferit && (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(cari)} className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg" data-testid={`edit-cari-${cari.id}`}>
                    <Edit size={16} className="text-[#3EA6FF]" />
                  </button>
                  <button onClick={() => handleDelete(cari.id)} className="p-2 hover:bg-red-500/20 rounded-lg" data-testid={`delete-cari-${cari.id}`}>
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              )}
            </div>
            {!isMunferit && (
              <div className="space-y-2 mb-4">
                {cari.phone && <p className="text-sm text-[#A5A5A5]"><span className="text-white">Tel:</span> {cari.phone}</p>}
                <div className="flex justify-between text-sm">
                  <span className="text-[#A5A5A5]">Bakiye EUR:</span>
                  <span className={cari.balance_eur > 0 ? 'text-green-400 font-semibold' : cari.balance_eur < 0 ? 'text-red-400 font-semibold' : 'text-[#A5A5A5]'}>{cari.balance_eur.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A5A5A5]">Bakiye USD:</span>
                  <span className={cari.balance_usd > 0 ? 'text-green-400 font-semibold' : cari.balance_usd < 0 ? 'text-red-400 font-semibold' : 'text-[#A5A5A5]'}>{cari.balance_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A5A5A5]">Bakiye TRY:</span>
                  <span className={cari.balance_try > 0 ? 'text-green-400 font-semibold' : cari.balance_try < 0 ? 'text-red-400 font-semibold' : 'text-[#A5A5A5]'}>{cari.balance_try.toFixed(2)}</span>
                </div>
              </div>
            )}
            <button onClick={() => navigate(`/cari-accounts/${cari.id}`)} className="w-full btn-primary py-2 rounded-lg flex items-center justify-center gap-2" data-testid={`view-cari-${cari.id}`}>
              Detay Görüntüle
              <ExternalLink size={16} />
            </button>
          </div>
          );
        })}
      </div>
      {filteredCariAccounts.length === 0 && cariAccounts.length > 0 && (
        <div className="text-center py-12">
          <p className="text-[#A5A5A5]">Arama kriterlerine uygun cari firma bulunamadı</p>
        </div>
      )}
      {cariAccounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#A5A5A5]">Henüz cari firma bulunmamaktadır</p>
        </div>
      )}
    </div>
  );
};

export default CariAccounts;