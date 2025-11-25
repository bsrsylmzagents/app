import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { ArrowLeft, Save, User, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CustomerDetailDialog from '../../components/CustomerDetailDialog';

const CariCreateReservation = () => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    customer_details: null,
    date: '',
    time: '',
    tour_type_id: '',
    person_count: 1,
    vehicle_count: 1,
    pickup_location: '',
    pickup_maps_link: '',
    price: 0,
    currency: 'EUR',
    exchange_rate: 1.0,
    notes: ''
  });
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
  const [tourTypes, setTourTypes] = useState([]);
  const [rates, setRates] = useState({ EUR: 1.0, USD: 1.0, TRY: 1.0 });
  const [loading, setLoading] = useState(false);
  const [cari, setCari] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('cari_token');
    const cariData = JSON.parse(localStorage.getItem('cari') || '{}');
    
    if (!token || !cariData.id) {
      navigate('/cari/login', { replace: true });
      return;
    }

    setCari(cariData);
    fetchTourTypes();
    fetchRates();
    
    // Cari bilgilerini form'a set et
    if (cariData.pickup_location) {
      setFormData(prev => ({
        ...prev,
        pickup_location: cariData.pickup_location || '',
        pickup_maps_link: cariData.pickup_maps_link || ''
      }));
    }
  }, [navigate]);

  const fetchTourTypes = async () => {
    try {
      const token = localStorage.getItem('cari_token');
      const response = await axios.get(`${API}/cari/tour-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTourTypes(response.data || []);
    } catch (error) {
      console.error('Fetch tour types error:', error);
      toast.error('Tur tipleri yüklenemedi');
    }
  };

  const fetchRates = async () => {
    try {
      const token = localStorage.getItem('cari_token');
      const response = await axios.get(`${API}/cari/company-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.currency_rates) {
        setRates(response.data.currency_rates);
      }
    } catch (error) {
      console.error('Fetch rates error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('cari_token');
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        navigate('/cari/login', { replace: true });
        return;
      }

      const requestPayload = {
        customer_name: formData.customer_name,
        date: formData.date,
        time: formData.time,
        tour_id: formData.tour_type_id,
        person_count: parseInt(formData.person_count) || 1,
        vehicle_count: parseInt(formData.vehicle_count) || 1,
        price: parseFloat(formData.price) || 0,
        currency: formData.currency,
        exchange_rate: formData.exchange_rate
      };
      
      if (formData.customer_contact) {
        requestPayload.customer_contact = formData.customer_contact;
      }
      
      if (formData.pickup_location) {
        requestPayload.pickup_location = formData.pickup_location;
      }
      
      if (formData.pickup_maps_link) {
        requestPayload.pickup_maps_link = formData.pickup_maps_link;
      }
      
      if (formData.notes) {
        requestPayload.notes = formData.notes;
      }
      
      if (formData.customer_details) {
        const details = formData.customer_details;
        const hasDetails = details.phone || details.email || details.nationality || details.id_number || details.birth_date;
        if (hasDetails) {
          requestPayload.customer_details = details;
        }
      }
      
      const response = await axios.post(
        `${API}/cari/reservations`,
        requestPayload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      toast.success('Rezervasyon oluşturuldu ve onay bekliyor');
      navigate('/cari/dashboard', { replace: true });
    } catch (error) {
      console.error('Create reservation error:', error);
      
      if (error.response) {
        let errorMessage = 'Rezervasyon oluşturulamadı';
        const detail = error.response?.data?.detail;
        const message = error.response?.data?.message;
        
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          const firstError = detail[0];
          errorMessage = typeof firstError === 'string' 
            ? firstError 
            : firstError?.msg || 'Rezervasyon oluşturulamadı';
        } else if (detail && typeof detail === 'object') {
          errorMessage = detail.msg || detail.message || 'Rezervasyon oluşturulamadı';
        } else if (typeof message === 'string') {
          errorMessage = message;
        }
        
        toast.error(errorMessage);
      } else if (error.request) {
        toast.error('Backend\'e bağlanılamadı. Backend\'in çalıştığından emin olun.');
      } else {
        toast.error('Bağlantı hatası: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/cari/dashboard"
            className="inline-flex items-center gap-2 text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={18} />
            Geri Dön
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Yeni Rezervasyon
          </h1>
          {cari && (
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              {cari.display_name}
            </p>
          )}
        </div>

        <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cari Name (Display Only - Fixed) */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Cari Firma
              </label>
              <input
                type="text"
                value={cari?.display_name || cari?.name || ''}
                disabled
                className="w-full px-4 py-3 rounded-lg"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-secondary)',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Tarih <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Saat <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {/* Tour Type */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Tur Tipi <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tour_type_id}
                  onChange={(e) => setFormData({ ...formData, tour_type_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                >
                  <option value="">Tur tipi seçin</option>
                  {tourTypes.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Müşteri Adı <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-lg focus:outline-none transition-colors"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!formData.customer_name.trim()) {
                        toast.error('Önce müşteri adını girin');
                        return;
                      }
                      setCustomerDetailDialogOpen(true);
                    }}
                    className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                    title="Müşteri Detay Gir"
                  >
                    <User size={18} />
                  </Button>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Müşteri İletişim
                </label>
                <input
                  type="text"
                  value={formData.customer_contact}
                  onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Person Count */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Kişi Sayısı <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.person_count}
                  onChange={(e) => setFormData({ ...formData, person_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {/* Vehicle Count */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Araç Sayısı <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.vehicle_count}
                  onChange={(e) => setFormData({ ...formData, vehicle_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {/* Pick-up Location */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Pick-up Yeri
                </label>
                <input
                  type="text"
                  value={formData.pickup_location}
                  onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  placeholder="Pick-up yeri otomatik doldurulur veya manuel girebilirsiniz"
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Google Maps Link */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Google Maps Link
                </label>
                <input
                  type="url"
                  value={formData.pickup_maps_link}
                  onChange={(e) => setFormData({ ...formData, pickup_maps_link: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="https://maps.google.com/..."
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Fiyat <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, price: newPrice });
                  }}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Döviz <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    const newCurrency = e.target.value;
                    setFormData({ 
                      ...formData, 
                      currency: newCurrency, 
                      exchange_rate: rates[newCurrency] || 1.0 
                    });
                  }}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="TRY">TRY</option>
                </select>
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
              >
                <Save size={18} />
                {loading ? 'Oluşturuluyor...' : 'Rezervasyon Oluştur'}
              </button>
              <Link
                to="/cari/dashboard"
                className="px-6 py-3 rounded-lg transition-colors"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                İptal
              </Link>
            </div>
          </form>
        </div>
      </div>
      
      {/* Müşteri Detay Dialog */}
      <CustomerDetailDialog
        open={customerDetailDialogOpen}
        onOpenChange={setCustomerDetailDialogOpen}
        customerName={formData.customer_name}
        initialData={formData.customer_details}
        onSave={(details) => {
          setFormData({ ...formData, customer_details: details });
          toast.success('Müşteri detayları kaydedildi');
        }}
      />
    </div>
  );
};

export default CariCreateReservation;
