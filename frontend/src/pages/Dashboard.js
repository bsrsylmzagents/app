import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Calendar as CalendarIcon, Clock, Bike } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`, {
        params: { date: selectedDate }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getReservationsForHour = (hour) => {
    if (!dashboardData) return [];
    return dashboardData.reservations.filter(r => {
      const reservationHour = parseInt(r.time.split(':')[0]);
      return reservationHour === hour;
    });
  };

  const currentHour = new Date().getHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14b8dc]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            {format(new Date(selectedDate), 'd MMMM yyyy, EEEE', { locale: tr })}
          </p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
            data-testid="dashboard-date-picker"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Toplam Depar</p>
              <p className="text-3xl font-bold text-white" data-testid="total-departures">{dashboardData?.total_departures || 0}</p>
            </div>
            <div className="p-3 bg-[#14b8dc]/20 rounded-lg">
              <CalendarIcon size={32} className="text-[#14b8dc]" />
            </div>
          </div>
        </div>

        <div className="stat-card p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Toplam ATV</p>
              <p className="text-3xl font-bold text-white" data-testid="total-atvs">{dashboardData?.total_atvs || 0}</p>
            </div>
            <div className="p-3 bg-[#14b8dc]/20 rounded-lg">
              <Bike size={32} className="text-[#14b8dc]" />
            </div>
          </div>
        </div>

        <div className="stat-card p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Sonu Saat</p>
              <p className="text-3xl font-bold text-white">{format(new Date(), 'HH:mm')}</p>
            </div>
            <div className="p-3 bg-[#14b8dc]/20 rounded-lg">
              <Clock size={32} className="text-[#14b8dc]" />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Günlük Zaman Çizgesi</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const reservations = getReservationsForHour(hour);
            const totalAtvs = reservations.reduce((sum, r) => sum + r.atv_count, 0);
            const isCurrent = hour === currentHour && selectedDate === format(new Date(), 'yyyy-MM-dd');
            const isPast = selectedDate === format(new Date(), 'yyyy-MM-dd') && hour < currentHour;

            return (
              <div
                key={hour}
                className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-[#14b8dc]/20 border border-[#14b8dc]'
                    : isPast
                    ? 'bg-[#1a1f2e]/50 opacity-60'
                    : 'bg-[#1a1f2e] hover:bg-[#1a1f2e]/80'
                }`}
                data-testid={`timeline-hour-${hour}`}
              >
                <div className="flex-shrink-0 w-20">
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <div className="timeline-dot w-3 h-3 bg-[#14b8dc] rounded-full"></div>
                    )}
                    <span className={`text-lg font-semibold ${
                      isCurrent ? 'text-[#14b8dc]' : 'text-gray-400'
                    }`}>
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  {reservations.length > 0 ? (
                    <div className="space-y-2">
                      {reservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex items-center justify-between bg-[#14b8dc]/10 border border-[#14b8dc]/30 rounded-lg px-4 py-2"
                        >
                          <div>
                            <p className="text-white font-medium">{reservation.customer_name}</p>
                            <p className="text-sm text-gray-400">{reservation.cari_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bike size={18} className="text-[#14b8dc]" />
                            <span className="text-white font-semibold">{reservation.atv_count} ATV</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">Boş</p>
                  )}
                </div>

                {totalAtvs > 0 && (
                  <div className="flex-shrink-0">
                    <div className="px-4 py-2 bg-[#14b8dc]/20 rounded-lg">
                      <p className="text-[#14b8dc] font-bold text-lg">{totalAtvs}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
