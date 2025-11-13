import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ExtraSales = () => {
  const [sales, setSales] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rates, setRates] = useState({ EUR: 1, USD: 1.1, TRY: 35 });
  const [formData, setFormData] = useState({
    product_name: '',
    cari_id: '',
    customer_name: '',
    customer_contact: '',
    pickup_location: '',
    date: '',
    time: '',
    sale_price: 0,
    purchase_price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    supplier_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchSales();
    fetchCariAccounts();
    fetchRates();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API}/extra-sales`);
      setSales(response.data);
    } catch (error) {
      toast.error('Satışlar yüklenemedi');
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
      await axios.post(`${API}/extra-sales`, formData);
      toast.success('Satış oluşturuldu');
      setDialogOpen(false);
      resetForm();
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Satış kaydedilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Satışı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/extra-sales/${id}`);
      toast.success('Satış silindi');
      fetchSales();
    } catch (error) {
      toast.error('Satış silinemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      cari_id: '',
      customer_name: '',
      customer_contact: '',
      pickup_location: '',
      date: '',
      time: '',
      sale_price: 0,
      purchase_price: 0,
      currency: 'EUR',
      exchange_rate: 1.0,
      supplier_id: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6" data-testid="extra-sales-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Açık Satışlar</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="new-sale-btn" onClick={resetForm}>
              <Plus size={18} className="mr-2" />
              Yeni Satış
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[#0f1419] border-[#14b8dc]/30 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Yeni Satış</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Ürün Adı"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                required
                data-testid="product-name"
              />
              <select
                value={formData.cari_id}
                onChange={(e) => setFormData({ ...formData, cari_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                required
              >
                <option value="">Cari Firma Seçin</option>
                {cariAccounts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Müşteri Adı"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" required />
                <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Satış Fiyatı" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" required />
                <input type="number" step="0.01" placeholder="Alış Fiyatı" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })} className="px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white" />
              </div>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value, exchange_rate: rates[e.target.value] })} className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="TRY">TRY</option>
              </select>
              <Button type="submit" className="w-full btn-primary" data-testid="submit-sale">Oluştur</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#14b8dc]/10 border-b border-[#14b8dc]/20">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tarih</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ürün</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Müşteri</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cari</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fiyat</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#14b8dc]/10">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-[#14b8dc]/5">
                <td className="px-6 py-4 text-white text-sm">{sale.date} {sale.time}</td>
                <td className="px-6 py-4 text-white text-sm">{sale.product_name}</td>
                <td className="px-6 py-4 text-white text-sm">{sale.customer_name}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">{sale.cari_name}</td>
                <td className="px-6 py-4 text-[#14b8dc] text-sm font-semibold">{sale.sale_price} {sale.currency}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(sale.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" data-testid={`delete-sale-${sale.id}`}>
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">Henüz satış bulunmamaktadır</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtraSales;
