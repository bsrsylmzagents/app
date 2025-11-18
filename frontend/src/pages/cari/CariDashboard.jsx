import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { Plus, Calendar, DollarSign, LogOut, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const CariDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
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
    fetchReservations();
    
    // Polling: Her 15 saniyede bir güncelle
    const interval = setInterval(fetchReservations, 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('cari_token');
      const response = await axios.get(`${API}/cari/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservations(response.data.reservations || []);
    } catch (error) {
      console.error('Fetch reservations error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('cari_token');
        localStorage.removeItem('cari');
        navigate('/cari/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cari_token');
    localStorage.removeItem('cari');
    localStorage.removeItem('cari_company');
    navigate('/cari/login', { replace: true });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_approval':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'approved':
        return 'bg-green-500/20 text-green-600';
      case 'rejected':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_approval':
        return 'Onay Bekliyor';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14b8dc] mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Cari Rezervasyon Paneli
            </h1>
            {cari && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {cari.display_name} ({cari.cari_code})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to="/cari/create-reservation"
              className="px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
            >
              <Plus size={18} />
              Yeni Rezervasyon
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Toplam Rezervasyon</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {reservations.length}
                </p>
              </div>
              <Calendar size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Onay Bekleyen</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {reservations.filter(r => r.status === 'pending_approval').length}
                </p>
              </div>
              <RefreshCw size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Onaylanan</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {reservations.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <DollarSign size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Rezervasyonlarım
            </h2>
          </div>
          <div className="p-6">
            {reservations.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>Henüz rezervasyon yok</p>
                <Link
                  to="/cari/create-reservation"
                  className="mt-4 inline-block px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ background: 'var(--accent)', color: 'var(--text-primary)' }}
                >
                  İlk Rezervasyonu Oluştur
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-4 rounded-lg border"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {reservation.customer_name}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(reservation.status)}`}>
                            {getStatusText(reservation.status)}
                            {reservation.status === 'approved' && reservation.pickup_time && (
                              <span className="ml-2">• Pick-up: {reservation.pickup_time}</span>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <div>
                            <span className="font-medium">Tarih:</span> {reservation.date}
                          </div>
                          <div>
                            <span className="font-medium">Saat:</span> {reservation.time}
                          </div>
                          <div>
                            <span className="font-medium">Tur:</span> {reservation.tour_type_name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Fiyat:</span> {reservation.price} {reservation.currency}
                          </div>
                        </div>
                        {reservation.notes && (
                          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {reservation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4">
          <Link
            to="/cari/transactions"
            className="px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Ekstre Görüntüle
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CariDashboard;

