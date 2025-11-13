import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWeekend, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [currentMonth]);

  const fetchReservations = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const response = await axios.get(`${API}/reservations`, {
        params: { date_from: start, date_to: end }
      });
      setReservations(response.data);
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReservationsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
  };

  const getTotalAtvs = (date) => {
    const dayReservations = getReservationsForDate(date);
    return dayReservations.reduce((sum, r) => sum + r.atv_count, 0);
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Takvim</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#14b8dc]/20 rounded-lg transition-colors"
            data-testid="prev-month-btn"
          >
            <ChevronLeft size={24} className="text-[#14b8dc]" />
          </button>
          <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#14b8dc]/20 rounded-lg transition-colors"
            data-testid="next-month-btn"
          >
            <ChevronRight size={24} className="text-[#14b8dc]" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
            <div key={day} className="text-center text-gray-400 font-semibold text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayReservations = getReservationsForDate(day);
            const totalAtvs = getTotalAtvs(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const isWeekendDay = isWeekend(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-[120px] p-3 rounded-lg cursor-pointer transition-all ${
                  !isCurrentMonth ? 'opacity-40' :
                  isTodayDate ? 'bg-[#14b8dc]/20 border-2 border-[#14b8dc]' :
                  isWeekendDay ? 'bg-[#1a1f2e]/80' : 'bg-[#1a1f2e]/50'
                } hover:bg-[#14b8dc]/10 hover:scale-105`}
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${
                    isTodayDate ? 'text-[#14b8dc]' : 'text-white'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayReservations.length > 0 && (
                    <span className="px-2 py-1 bg-[#14b8dc]/30 rounded-full text-xs text-[#14b8dc] font-bold">
                      {dayReservations.length}
                    </span>
                  )}
                </div>
                {totalAtvs > 0 && (
                  <div className="text-xs text-gray-400">
                    <span className="text-[#14b8dc] font-semibold">{totalAtvs}</span> ATV
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open reservation form with this date
                    window.location.href = `/reservations?date=${format(day, 'yyyy-MM-dd')}`;
                  }}
                  className="mt-2 w-full py-1 px-2 bg-[#14b8dc]/20 hover:bg-[#14b8dc]/40 rounded text-xs text-[#14b8dc] font-medium transition-colors"
                  data-testid={`add-reservation-${format(day, 'yyyy-MM-dd')}`}
                >
                  <Plus size={14} className="inline mr-1" />
                  Rezervasyon
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0f1419] border-[#14b8dc]/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedDate && format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && getReservationsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getReservationsForDate(selectedDate).map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-4 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{reservation.customer_name}</p>
                        <p className="text-sm text-gray-400">{reservation.cari_name}</p>
                        <p className="text-sm text-gray-400 mt-1">Saat: {reservation.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#14b8dc] font-bold">{reservation.atv_count} ATV</p>
                        <p className="text-sm text-gray-400">{reservation.person_count} Kişi</p>
                      </div>
                    </div>
                    {reservation.notes && (
                      <p className="text-sm text-gray-400 mt-2 italic">{reservation.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">Bu tarihte rezervasyon bulunmamaktadır</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
