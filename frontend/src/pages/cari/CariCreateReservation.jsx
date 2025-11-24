import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { ArrowLeft, Save, User } from 'lucide-react';
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
    tour_id: '',
    person_count: 1,
    atv_count: 1,
    notes: ''
  });
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
  const [tourTypes, setTourTypes] = useState([]);
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [calculatedCurrency, setCalculatedCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
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
  }, [navigate]);

  const fetchTourTypes = async () => {
    try {
      const token = localStorage.getItem('cari_token');
      // Tour types endpoint'i cari token ile çalışmalı (backend'de kontrol edilmeli)
      // Şimdilik company_id'ye göre filtreleme yapılabilir
      const response = await axios.get(`${API}/cari/tour-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTourTypes(response.data || []);
    } catch (error) {
      console.error('Fetch tour types error:', error);
      toast.error('Tur tipleri yüklenemedi');
    }
  };

  const calculatePrice = async () => {
    if (!formData.tour_id || !formData.date) {
      setCalculatedPrice(null);
      return;
    }

    setFetchingPrice(true);
    try {
      // Fiyat hesaplama için geçici bir rezervasyon oluşturup fiyatı alabiliriz
      // Veya backend'de ayrı bir price calculation endpoint'i eklenebilir
      // Şimdilik frontend'de tour type'ın default price'ını gösterelim
      const tourType = tourTypes.find(t => t.id === formData.tour_id);
      if (tourType) {
        setCalculatedPrice(tourType.default_price || 0);
        setCalculatedCurrency(tourType.default_currency || 'EUR');
      }
    } catch (error) {
      console.error('Calculate price error:', error);
    } finally {
      setFetchingPrice(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [formData.tour_id, formData.date, tourTypes]);

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

      // API URL'i oluştur
      const apiUrl = `${API}/cari/reservations`;
      console.log('📤 Sending request to:', apiUrl);
      console.log('📤 Request data:', {
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact,
        date: formData.date,
        time: formData.time,
        tour_id: formData.tour_id,
        person_count: formData.person_count,
        atv_count: formData.atv_count,
        notes: formData.notes
      });
      console.log('📤 Token exists:', !!token);

      // Prepare request payload - only send fields that backend expects
      const requestPayload = {
        customer_name: formData.customer_name,
        date: formData.date,
        time: formData.time,
        tour_id: formData.tour_id,
        person_count: formData.person_count || 1,
        atv_count: formData.atv_count || 1
      };
      
      // Add optional fields only if they have values
      if (formData.customer_contact) {
        requestPayload.customer_contact = formData.customer_contact;
      }
      
      if (formData.notes) {
        requestPayload.notes = formData.notes;
      }
      
      // Customer details - only include if it has actual data
      if (formData.customer_details) {
        const details = formData.customer_details;
        const hasDetails = details.phone || details.email || details.nationality || details.id_number || details.birth_date;
        if (hasDetails) {
          requestPayload.customer_details = details;
        }
      }
      
      const response = await axios.post(
        apiUrl,
        requestPayload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 saniye timeout
        }
      );

      toast.success('Rezervasyon oluşturuldu ve onay bekliyor');
      navigate('/cari/dashboard', { replace: true });
    } catch (error) {
      console.error('Create reservation error:', error);
      console.error('Error details:', error.response?.data);
      console.error('Request URL:', `${API}/cari/reservations`);
      console.error('Request data:', {
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact,
        date: formData.date,
        time: formData.time,
        tour_id: formData.tour_id,
        person_count: formData.person_count,
        atv_count: formData.atv_count,
        notes: formData.notes
      });
      
      if (error.response) {
        let errorMessage = 'Rezervasyon oluşturulamadı';
        const detail = error.response?.data?.detail;
        const message = error.response?.data?.message;
        
        // Handle different error formats
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          // Pydantic validation errors - extract first error message
          const firstError = detail[0];
          errorMessage = typeof firstError === 'string' 
            ? firstError 
            : firstError?.msg || 'Rezervasyon oluşturulamadı';
        } else if (detail && typeof detail === 'object') {
          // If detail is an object, try to extract a message
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
            {/* Cari Name (Display Only) */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Cari Adı
              </label>
              <input
                type="text"
                value={cari?.display_name || ''}
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

            {/* Customer Name */}
            <div>
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
            <div>
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
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Tur Tipi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tour_id}
                onChange={(e) => setFormData({ ...formData, tour_id: e.target.value })}
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
                    {tour.name} {tour.default_price ? `(${tour.default_price} ${tour.default_currency})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Person Count */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Kişi Sayısı
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
              />
            </div>

            {/* ATV Count */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                ATV Sayısı
              </label>
              <input
                type="number"
                min="1"
                value={formData.atv_count}
                onChange={(e) => setFormData({ ...formData, atv_count: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Price (Display Only) */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Fiyat (Hesaplanan)
              </label>
              <input
                type="text"
                value={fetchingPrice ? 'Hesaplanıyor...' : calculatedPrice !== null ? `${calculatedPrice} ${calculatedCurrency}` : 'Tur tipi ve tarih seçin'}
                disabled
                className="w-full px-4 py-3 rounded-lg"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-secondary)',
                  cursor: 'not-allowed'
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Fiyat sunucu tarafından otomatik hesaplanacaktır
              </p>
            </div>

            {/* Notes */}
            <div>
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

            <div className="flex gap-4">
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

