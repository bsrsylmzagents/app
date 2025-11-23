import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API } from '../App';
import { Calendar as CalendarIcon, Bike, Download, CheckCircle2, CheckSquare, X, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createNewPdf, createTitle, savePdf, createTable, safeText } from '../utils/pdfTemplate';
import { formatDateStringDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateFormatter';
import Loading from '../components/Loading';

const Dashboard = () => {
  const timelineRef = useRef(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [tooltipState, setTooltipState] = useState({ visible: false, content: null, x: 0, y: 0 });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyHourThreshold, setBusyHourThreshold] = useState(5);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [approvingReservation, setApprovingReservation] = useState(null);
  const [pickupTimes, setPickupTimes] = useState({}); // Her rezervasyon için ayrı pick-up saati

  useEffect(() => {
    fetchDashboard();
    fetchBusyHourThreshold();
    fetchPendingReservations();
  }, [selectedDate]);

  // Pending reservations sayısını periyodik olarak güncelle
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard();
      fetchPendingReservations();
    }, 10000); // Her 10 saniyede bir güncelle
    return () => clearInterval(interval);
  }, [selectedDate]);
  
  // Pending reservations sayısını pendingReservations listesinden de güncelle
  useEffect(() => {
    if (dashboardData && pendingReservations.length !== dashboardData.pending_reservations_count) {
      setDashboardData(prev => ({
        ...prev,
        pending_reservations_count: pendingReservations.length
      }));
    }
  }, [pendingReservations]);

  const fetchPendingReservations = async () => {
    try {
      setLoadingPending(true);
      const response = await axios.get(`${API}/reservations/pending`);
      setPendingReservations(response.data || []);
    } catch (error) {
      console.error('Pending reservations alınamadı:', error);
      setPendingReservations([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveReservation = async (reservationId) => {
    const pickupTime = pickupTimes[reservationId];
    if (!pickupTime || pickupTime.trim() === '') {
      toast.error('Pick-up saati zorunludur');
      return;
    }

    try {
      setApprovingReservation(reservationId);
      await axios.post(`${API}/reservations/${reservationId}/approve`, {
        pickup_time: pickupTime
      });
      toast.success('Rezervasyon onaylandı');
      // Pick-up saatini temizle
      setPickupTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[reservationId];
        return newTimes;
      });
      setApprovingReservation(null);
      fetchPendingReservations();
      fetchDashboard();
    } catch (error) {
      console.error('Onaylama hatası:', error);
      toast.error(error.response?.data?.detail || 'Rezervasyon onaylanamadı');
      setApprovingReservation(null);
    }
  };

  const handleRejectReservation = async (reservationId, reason = '') => {
    try {
      await axios.post(`${API}/reservations/${reservationId}/reject`, { reason });
      toast.success('Rezervasyon reddedildi');
      fetchPendingReservations();
      fetchDashboard();
    } catch (error) {
      console.error('Reddetme hatası:', error);
      toast.error(error.response?.data?.detail || 'Rezervasyon reddedilemedi');
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/dashboard`, {
        params: { date: selectedDate }
      });
      console.log('Dashboard verisi:', response.data); // Debug için
      console.log('Pending count:', response.data?.pending_reservations_count); // Debug için
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard verisi alınamadı:', error);
      console.error('Hata detayı:', error.response?.data); // Debug için
      // Hata durumunda boş veri set et
      setDashboardData({
        date: selectedDate,
        total_departures: 0,
        total_atvs: 0,
        pending_reservations_count: 0,
        reservations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusyHourThreshold = async () => {
    try {
      const response = await axios.get(`${API}/busy-hour-threshold`);
      setBusyHourThreshold(response.data.threshold || 5);
    } catch (error) {
      console.error('Yoğun saat tanımı yüklenemedi:', error);
      // Varsayılan değer kullan
      setBusyHourThreshold(5);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getReservationsForHour = (hour) => {
    if (!dashboardData) return [];
    // Tüm rezervasyonları getir (cancelled hariç) - tamamlananlar DAHIL
    return dashboardData.reservations.filter(r => {
      const reservationHour = parseInt(r.time.split(':')[0]);
      // Sadece cancelled olanları filtrele, completed olanlar dahil edilmeli
      return reservationHour === hour && r.status !== 'cancelled';
    });
  };

  // Current time state - moved before usage
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTimeString, setCurrentTimeString] = useState(format(new Date(), 'HH:mm'));

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setCurrentTimeString(format(now, 'HH:mm'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rezervasyon durumunu belirle (pending/active/completed)
  const getReservationStatus = (reservation) => {
    if (reservation.status === 'completed') return 'completed';
    if (reservation.status === 'cancelled') return 'cancelled';
    
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) return 'pending';
    
    const reservationHour = parseInt(reservation.time.split(':')[0]);
    const reservationMinute = parseInt(reservation.time.split(':')[1] || 0);
    const reservationTime = reservationHour * 60 + reservationMinute;
    const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Tur başlama saatinden 2 saat sonra tamamlanmış sayılır (varsayılan tur süresi)
    const tourDuration = 120; // dakika
    const endTime = reservationTime + tourDuration;
    
    if (currentTimeMinutes >= endTime) {
      return 'completed'; // Otomatik tamamlandı
    } else if (currentTimeMinutes >= reservationTime) {
      return 'active'; // Aktif tur
    } else {
      return 'pending'; // Henüz başlamamış
    }
  };

  // Aktif turlar (status = 'active' veya başlamış ama tamamlanmamış)
  const getActiveReservations = () => {
    if (!dashboardData) return [];
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) return [];
    
    return dashboardData.reservations.filter(r => {
      // Backend'den gelen status'u önce kontrol et
      if (r.status === 'completed' || r.status === 'cancelled') return false;
      const status = getReservationStatus(r);
      return status === 'active';
    });
  };

  // Seçili güne ait tamamlanan turlar
  const getCompletedReservations = () => {
    if (!dashboardData) return [];
    
    // Seçili tarihe göre filtrele
    const selectedDateStr = selectedDate;
    
    return dashboardData.reservations.filter(r => {
      // Önce tarih kontrolü yap - sadece seçili güne ait turlar
      if (r.date !== selectedDateStr) return false;
      
      // Backend'den gelen status'u öncelikle kontrol et
      if (r.status === 'completed') return true;
      
      // Eğer backend'de completed değilse, otomatik hesaplanan status'u kullan
      const status = getReservationStatus(r);
      return status === 'completed';
    });
  };

  // Rezervasyon status güncelleme
  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      await axios.put(`${API}/reservations/${reservationId}`, { status: newStatus });
      toast.success('Rezervasyon durumu güncellendi');
      // Dashboard'ı yeniden yükle - await ile bekle
      await fetchDashboard();
    } catch (error) {
      console.error('Rezervasyon durumu güncellenemedi:', error);
      toast.error('Rezervasyon durumu güncellenemedi');
    }
  };

  // Toplu tamamlandı işaretleme
  const markMultipleAsCompleted = async (reservationIds) => {
    try {
      await Promise.all(
        reservationIds.map(id => axios.put(`${API}/reservations/${id}`, { status: 'completed' }))
      );
      toast.success(`${reservationIds.length} rezervasyon tamamlandı olarak işaretlendi`);
      fetchDashboard();
    } catch (error) {
      toast.error('Rezervasyonlar güncellenemedi');
    }
  };

  const getTotalSeatsForHour = (hour) => {
    if (!dashboardData) return 0;
    // Direkt dashboardData'dan al, tüm rezervasyonları say (tamamlananlar dahil, cancelled hariç)
    const reservations = dashboardData.reservations.filter(r => {
      const reservationHour = parseInt(r.time.split(':')[0]);
      return reservationHour === hour && r.status !== 'cancelled';
    });
    return reservations.reduce((sum, r) => sum + (r.atv_count || 0), 0);
  };

  // Rezervasyon bar hesaplama ve çakışma kontrolü (memoized)
  const reservationBars = useMemo(() => {
    if (!dashboardData) return [];
    
    const allReservations = dashboardData.reservations.filter(r => r.status !== 'cancelled');
    
    // Her rezervasyon için bar bilgilerini hesapla
    const bars = allReservations.map(reservation => {
      const timeParts = reservation.time.split(':');
      const startHour = parseInt(timeParts[0]) || 0;
      const startMinute = parseInt(timeParts[1]) || 0;
      
      // Başlangıç pozisyonu (piksel cinsinden)
      const left = (startHour * 80) + (startMinute / 60 * 80);
      
      // Genişlik (süreye göre)
      const durationHours = reservation.duration_hours || 2.0;
      const width = durationHours * 80;
      
      return {
        reservation,
        start: left,
        end: left + width,
        width,
        startHour,
        startMinute,
        durationHours
      };
    });
    
    // Çakışma kontrolü ve satır yerleştirme
    const rows = [];
    bars.forEach(bar => {
      let rowIndex = 0;
      
      // Uygun satırı bul
      while (rowIndex < rows.length) {
        const row = rows[rowIndex];
        const hasConflict = row.some(existingBar => {
          // Çakışma kontrolü: başlangıç veya bitiş noktaları çakışıyor mu?
          return !(bar.end <= existingBar.start || bar.start >= existingBar.end);
        });
        
        if (!hasConflict) {
          break;
        }
        rowIndex++;
      }
      
      // Yeni satır oluştur gerekirse
      if (rowIndex >= rows.length) {
        rows.push([]);
      }
      
      rows[rowIndex].push({ ...bar, rowIndex });
    });
    
    // Tüm bar'ları düzleştir
    return rows.flat();
  }, [dashboardData]);

  // Renk kontrastı hesaplama (beyaz/siyah metin seçimi)
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#FFFFFF';
    
    // Hex'i RGB'ye çevir
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Luminance hesapla
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Koyu renkler için beyaz, açık renkler için siyah
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Rezervasyonları pickup_location'a göre grupla
  const groupReservationsByPickup = (hour) => {
    const reservations = getReservationsForHour(hour);
    const grouped = {};
    
    reservations.forEach(reservation => {
      const pickupLocation = reservation.pickup_location || 'Belirtilmemiş';
      if (!grouped[pickupLocation]) {
        grouped[pickupLocation] = {
          location: pickupLocation,
          mapsLink: reservation.pickup_maps_link || null,
          customers: [],
          totalAtvs: 0,
          totalCustomers: 0
        };
      } else {
        // Eğer maps linki yoksa ve bu rezervasyonda varsa ekle
        if (!grouped[pickupLocation].mapsLink && reservation.pickup_maps_link) {
          grouped[pickupLocation].mapsLink = reservation.pickup_maps_link;
        }
      }
      grouped[pickupLocation].customers.push({
        id: reservation.id,
        name: reservation.customer_name,
        atvCount: reservation.atv_count,
        personCount: reservation.person_count,
        cariName: reservation.cari_name,
        time: reservation.time,
        price: reservation.price,
        currency: reservation.currency,
        tourTypeName: reservation.tour_type_name,
        voucherCode: reservation.voucher_code,
        pickupLocation: reservation.pickup_location,
        pickupMapsLink: reservation.pickup_maps_link,
        notes: reservation.notes,
        status: reservation.status
      });
      grouped[pickupLocation].totalAtvs += reservation.atv_count;
      grouped[pickupLocation].totalCustomers += 1;
    });
    
    return Object.values(grouped);
  };

  const handleHourClick = (hour) => {
    const reservations = getReservationsForHour(hour);
    if (reservations.length > 0) {
      setSelectedHour(hour);
      setDialogOpen(true);
    }
  };

  const handleDialogClose = (open) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedHour(null);
    }
  };

  const generatePDF = () => {
    if (!selectedHour) return;

    const groupedData = groupReservationsByPickup(selectedHour);
    const hourStr = `${selectedHour.toString().padStart(2, '0')}:00`;

    try {
      const doc = createNewPdf();
      let yPos = createTitle(doc, 'REZERVASYON DETAY RAPORU', {
        date: selectedDate,
        hour: hourStr
      });
      
      // Özet bilgiler
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Ozet Bilgiler', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Tarih: ${format(new Date(selectedDate), 'dd.MM.yyyy', { locale: tr })}`, 20, yPos);
      yPos += 6;
      doc.text(`Saat: ${hourStr}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam Pick-up Yeri: ${groupedData.length}`, 20, yPos);
      yPos += 6;
      const totalCustomers = groupedData.reduce((sum, g) => sum + g.totalCustomers, 0);
      const totalATVs = groupedData.reduce((sum, g) => sum + g.totalAtvs, 0);
      doc.text(`Toplam Musteri: ${totalCustomers}`, 20, yPos);
      yPos += 6;
      doc.text(`Toplam ATV: ${totalATVs}`, 20, yPos);
      yPos += 12;
      
      // Pick-up yerlerine göre detaylı liste
      groupedData.forEach((group, index) => {
        // Sayfa taşması kontrolü
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Pick-up yeri başlığı
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        const pickupLocation = safeText(group.location || 'Belirtilmemis');
        doc.text(`Pick-up Yeri: ${pickupLocation}`, 20, yPos);
        yPos += 8;
        
        // Maps linki varsa ekle
        if (group.mapsLink) {
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 255);
          doc.setFont(undefined, 'normal');
          const linkText = 'Haritada Goruntule';
          const linkX = 20;
          const linkY = yPos;
          
          // Link ekle (jsPDF'de link ekleme)
          try {
            // Text'i yaz
            doc.text(linkText, linkX, linkY);
            
            // Link annotation ekle - jsPDF'de link() metodu koordinatları mm cinsinden alır
            // link(x, y, width, height, options)
            const linkWidth = doc.getTextWidth(linkText);
            const linkHeight = 5; // Link yüksekliği
            doc.link(linkX, linkY - linkHeight, linkWidth, linkHeight, { url: group.mapsLink });
          } catch (e) {
            console.warn('Link eklenemedi, sadece text yazılıyor:', e);
            // Link eklenemezse URL'yi de göster
            doc.text(linkText + ': ' + group.mapsLink, linkX, linkY);
          }
          yPos += 6;
        }
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Toplam Musteri: ${group.totalCustomers}`, 20, yPos);
        yPos += 6;
        doc.text(`Toplam ATV: ${group.totalAtvs}`, 20, yPos);
        yPos += 8;
        
        // Müşteri listesi tablosu
        if (group.customers && group.customers.length > 0) {
          const tableData = group.customers.map((customer, idx) => {
            const customerName = safeText(customer.name || 'Isimsiz Musteri');
            const cariName = safeText(customer.cariName || 'Belirtilmemis');
            return {
              sira: (idx + 1).toString(),
              musteri: customerName,
              cari: cariName,
              atv: (customer.atvCount || 0).toString(),
              kisi: (customer.personCount || 0).toString()
            };
          });
          
          const columns = [
            { header: 'Sira', key: 'sira', width: 15, align: 'center' },
            { header: 'Musteri Adi', key: 'musteri', width: 50 },
            { header: 'Cari Firma', key: 'cari', width: 50 },
            { header: 'ATV', key: 'atv', width: 20, align: 'center' },
            { header: 'Kisi', key: 'kisi', width: 20, align: 'center' }
          ];
          
          yPos = createTable(doc, tableData, columns, yPos);
          yPos += 5;
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text('Bu pick-up yerinde musteri bulunmamaktadir.', 20, yPos);
          yPos += 8;
        }
        
        // Gruplar arası boşluk
        if (index < groupedData.length - 1) {
          yPos += 5;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }
      });
      
      // PDF'i kaydet
      const fileName = `rezervasyon-detay-${selectedDate}-${hourStr.replace(':', '')}.pdf`;
      savePdf(doc, fileName, 'Rezervasyon Detay Raporu');
      toast.success('PDF oluşturuldu');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Auto-scroll to current time on mount and when date changes - ortala
  useEffect(() => {
    if (timelineRef.current && selectedDate === format(new Date(), 'yyyy-MM-dd') && dashboardData) {
      // Her saat 80px genişliğinde
      const currentTimeDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;
      const currentTimePosition = currentTimeDecimal * 80;
      const containerWidth = timelineRef.current.clientWidth || window.innerWidth;
      const scrollPosition = currentTimePosition - (containerWidth / 2) + 40;
      
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [selectedDate, dashboardData]);

  if (loading && !dashboardData) {
    return <Loading />;
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6" data-testid="dashboard-page">
        <div className="text-center py-12">
          <p className="text-[#A5A5A5]">Dashboard verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-[#A5A5A5]">
            {formatDateStringDDMMYYYY(selectedDate)}
          </p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
            data-testid="dashboard-date-picker"
          />
        </div>
      </div>

      {/* Stats - Tek Sıra, Kompakt */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Onay Bekleyen Rezervasyonlar */}
        <div 
          className="stat-card p-4 rounded-xl cursor-pointer hover:bg-[#2D2F33] transition-colors relative"
          onClick={() => setPendingDialogOpen(true)}
          style={{ 
            border: ((dashboardData?.pending_reservations_count ?? pendingReservations.length) > 0) ? '2px solid #3EA6FF' : '1px solid #2D2F33',
            background: ((dashboardData?.pending_reservations_count ?? pendingReservations.length) > 0) ? 'rgba(62, 166, 255, 0.1)' : 'var(--bg-elevated)'
          }}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[#A5A5A5] text-xs">Onay Bekleyen</p>
              {((dashboardData?.pending_reservations_count ?? pendingReservations.length) > 0) && (
                <div className="relative">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping absolute" />
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">
                {(dashboardData?.pending_reservations_count ?? pendingReservations.length) || 0}
              </p>
              {((dashboardData?.pending_reservations_count ?? pendingReservations.length) > 0) && (
                <span className="text-red-500 text-xl animate-bounce inline-block">⚠</span>
              )}
            </div>
            {((dashboardData?.pending_reservations_count ?? pendingReservations.length) > 0) && (
              <p className="text-xs text-[#3EA6FF] mt-1 animate-pulse">Yeni!</p>
            )}
          </div>
        </div>

        {/* Toplam Depar */}
        <div className="stat-card p-4 rounded-xl">
          <div className="flex flex-col">
            <p className="text-[#A5A5A5] text-xs mb-1">Toplam Depar</p>
            <p className="text-2xl font-bold text-white" data-testid="total-departures">
              {dashboardData?.reservations?.filter(r => r.status !== 'cancelled').length || 0}
            </p>
          </div>
        </div>

        {/* Şu Anki Turlar - ATV Sayısı */}
        <div className="stat-card p-4 rounded-xl">
          <div className="flex flex-col">
            <p className="text-[#A5A5A5] text-xs mb-1">Şu Anki Turlar</p>
            <p className="text-2xl font-bold text-white">
              {getActiveReservations().reduce((sum, r) => sum + (r.atv_count || 0), 0)} ATV
            </p>
          </div>
        </div>

        {/* Yoğun Saatler */}
        <div className="stat-card p-4 rounded-xl">
          <div className="flex flex-col">
            <p className="text-[#A5A5A5] text-xs mb-1">Yoğun Saatler</p>
            <p className="text-2xl font-bold text-white">
              {(() => {
                const busyHours = hours.filter(hour => {
                  const reservations = getReservationsForHour(hour);
                  const totalAtvs = reservations.reduce((sum, r) => sum + (r.atv_count || 0), 0);
                  return totalAtvs > busyHourThreshold;
                });
                return busyHours.length;
              })()}
            </p>
            <p className="text-xs text-[#A5A5A5] mt-1">saat yoğun</p>
          </div>
        </div>

        {/* Tamamlanan Turlar */}
        <div className="stat-card p-4 rounded-xl">
          <div className="flex flex-col">
            <p className="text-[#A5A5A5] text-xs mb-1">Tamamlanan Turlar</p>
            <p className="text-2xl font-bold text-white">{getCompletedReservations().length}</p>
          </div>
        </div>

        {/* Kalan Turlar */}
        <div className="stat-card p-4 rounded-xl">
          <div className="flex flex-col">
            <p className="text-[#A5A5A5] text-xs mb-1">Kalan Turlar</p>
            <p className="text-2xl font-bold text-white">
              {(() => {
                const allReservations = dashboardData?.reservations?.filter(r => r.status !== 'cancelled') || [];
                const completed = getCompletedReservations().length;
                return Math.max(0, allReservations.length - completed);
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Günlük Zaman Çizelgesi</h2>
        
        <div className="relative overflow-visible">
          {/* Timeline container */}
          <div 
            className="relative overflow-visible"
            style={{
              minHeight: '180px',
              height: (() => {
                const maxRow = reservationBars.length > 0 ? Math.max(...reservationBars.map(b => b.rowIndex), 0) : 0;
                return `${40 + (maxRow + 1) * 70 + 50}px`; // 40px header + (rows * 70px) + 50px bottom area (saat kutusu için)
              })()
            }}
          >
            <div
              ref={timelineRef}
              className="relative overflow-x-auto overflow-y-visible h-full"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#3EA6FF #25272A'
              }}
            >
              <div className="relative flex overflow-visible" style={{ minWidth: '1920px', height: '100%' }}>
                {/* Current time indicator line - bayrak direği gibi */}
                {selectedDate === format(new Date(), 'yyyy-MM-dd') && (
                  <>
                    {/* Dikey çizgi - saat başlıkları alanının altından başlayıp saat kutusunun hemen altına kadar */}
                    <div
                      className="absolute w-0.5 bg-[#3EA6FF] z-20 pointer-events-none transition-all duration-1000"
                      style={{
                        left: `${((currentTime.getHours() + currentTime.getMinutes() / 60) / 24) * 100}%`,
                        top: '40px', // Saat başlıkları alanının altından başlıyor
                        bottom: '43px', // Saat kutusunun hemen altına kadar
                        boxShadow: '0 0 10px rgba(62, 166, 255, 0.8)'
                      }}
                    >
                    </div>
                    {/* Saat Kutusu - Scroll bar'ın hemen üstünde, en altta */}
                    <div
                      className="absolute z-20 pointer-events-none transition-all duration-1000"
                      style={{
                        left: `${((currentTime.getHours() + currentTime.getMinutes() / 60) / 24) * 100}%`,
                        bottom: '2px', // Scroll bar'a daha yakın
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div
                        className="inline-flex items-center justify-center"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--soft-shadow)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      >
                        {currentTimeString}
                      </div>
                    </div>
                  </>
                )}
                
                {hours.map((hour) => {
                  const isCurrent = hour === currentHour && selectedDate === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <div
                      key={hour}
                      className="relative flex-shrink-0 border-r border-[#2D2F33]"
                      style={{ width: '80px' }}
                      data-testid={`timeline-hour-${hour}`}
                    >
                      {/* Hour label */}
                      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center z-10">
                        <span
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? 'text-[#3EA6FF]'
                              : 'text-[#A5A5A5]'
                          }`}
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      </div>

                      {/* Hour background */}
                      <div
                        className={`absolute top-10 bottom-0 left-0 right-0 transition-colors ${
                          isCurrent
                            ? 'bg-[#3EA6FF]/10'
                            : 'bg-transparent hover:bg-[#2D2F33]/10'
                        }`}
                      ></div>
                    </div>
                  );
                })}
                
                {/* Rezervasyon Bar'ları */}
                {reservationBars.map((bar, index) => {
                  const reservation = bar.reservation;
                  const barColor = reservation.tour_type_color || '#3EA6FF';
                  const textColor = getContrastColor(barColor);
                  const topPosition = 40 + (bar.rowIndex * 70); // 40px header + (rowIndex * 70px)
                  
                  return (
                    <div
                      key={`reservation-${reservation.id}-row-${bar.rowIndex}-idx-${index}`}
                      className="absolute rounded-lg shadow-md transition-all hover:scale-105 hover:shadow-lg cursor-pointer z-20"
                      style={{
                        left: `${bar.start}px`,
                        top: `${topPosition}px`,
                        width: `${bar.width}px`,
                        height: '60px',
                        backgroundColor: barColor,
                        color: textColor,
                        minWidth: '60px'
                      }}
                      onClick={() => {
                        const reservationHour = parseInt(reservation.time.split(':')[0]);
                        handleHourClick(reservationHour);
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipState({
                          visible: true,
                          content: {
                            customer_name: reservation.customer_name,
                            time: reservation.time,
                            tour_type_name: reservation.tour_type_name || 'Tur',
                            atv_count: reservation.atv_count,
                            person_count: reservation.person_count,
                            pickup_location: reservation.pickup_location
                          },
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltipState({ visible: false, content: null, x: 0, y: 0 });
                      }}
                      title={`${reservation.customer_name} - ${reservation.time} - ${reservation.tour_type_name || 'Tur'} - ${reservation.atv_count} ATV - ${reservation.pickup_location || 'Belirtilmemiş'}`}
                    >
                      <div className="flex items-center justify-between h-full px-2">
                        <span className="text-xs font-bold truncate">
                          {reservation.atv_count} ATV
                        </span>
                        {bar.width > 100 && (
                          <span className="text-xs font-semibold truncate ml-1">
                            {reservation.tour_type_name ? reservation.tour_type_name.substring(0, 8) : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Tooltip - Dashboard seviyesinde, portal ile body'ye render ediliyor */}
      {tooltipState.visible && tooltipState.content && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed px-3 py-2 bg-[#1E1E1E] border border-[#3EA6FF]/30 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[99999]"
          style={{
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y - 8}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="text-xs text-white font-semibold">{tooltipState.content.customer_name}</p>
          <p className="text-xs text-[#A5A5A5]">{tooltipState.content.time} • {tooltipState.content.tour_type_name}</p>
          <p className="text-xs text-[#3EA6FF]">{tooltipState.content.atv_count} ATV • {tooltipState.content.person_count} Kişi</p>
          {tooltipState.content.pickup_location && (
            <p className="text-xs text-[#A5A5A5] mt-1">📍 {tooltipState.content.pickup_location}</p>
          )}
        </div>,
        document.body
      )}

      {/* Hour Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
              <span>
                {selectedHour !== null && `${selectedHour.toString().padStart(2, '0')}:00 - Rezervasyon Detayları`}
              </span>
              <Button
                onClick={generatePDF}
                className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                size="sm"
                title="PDF İndir"
              >
                <Download size={16} />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedHour !== null && (
            <div className="space-y-6 mt-4">
              <div className="text-sm text-[#A5A5A5] mb-4">
                Tarih: {formatDateStringDDMMYYYY(selectedDate)}
              </div>
              
              {groupReservationsByPickup(selectedHour).map((group, index) => (
                <div
                  key={index}
                  className="bg-[#1E1E1E] border border-[#2D2F33] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {group.location}
                      </h3>
                      {group.mapsLink && (
                        <a
                          href={group.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3EA6FF] text-sm hover:underline"
                        >
                          Haritada Görüntüle
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-[#A5A5A5]">Toplam Müşteri</div>
                      <div className="text-xl font-bold text-[#3EA6FF]">{group.totalCustomers}</div>
                      <div className="text-sm text-[#A5A5A5] mt-2">Toplam ATV</div>
                      <div className="text-xl font-bold text-[#3EA6FF]">{group.totalAtvs}</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#2D2F33] pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Müşteri Listesi:</h4>
                    <div className="space-y-2">
                      {group.customers.map((customer, idx) => {
                        return (
                          <div
                            key={customer.id || idx}
                            className="flex items-center justify-between bg-[#25272A] p-3 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-white font-medium">{customer.name}</div>
                                {customer.voucherCode && (
                                  <span className="text-xs font-mono text-[#3EA6FF] bg-[#3EA6FF]/10 px-2 py-0.5 rounded">
                                    {customer.voucherCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-[#A5A5A5] mt-1">
                                {customer.cariName} • {customer.time}
                                {customer.tourTypeName && ` • ${customer.tourTypeName}`}
                              </div>
                              <div className="text-sm text-white mt-1 font-semibold">
                                {customer.price ? parseFloat(customer.price).toFixed(2) : '0.00'} {customer.currency || 'EUR'}
                              </div>
                              {customer.pickupLocation && (
                                <div className="text-xs text-[#A5A5A5] mt-1">
                                  📍 {customer.pickupLocation}
                                </div>
                              )}
                              {customer.notes && (
                                <div className="text-xs text-[#A5A5A5] mt-1 italic">
                                  {customer.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <div className="text-sm text-[#A5A5A5]">ATV</div>
                                <div className="text-lg font-bold text-[#3EA6FF]">{customer.atvCount}</div>
                                <div className="text-xs text-[#A5A5A5]">{customer.personCount} Kişi</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              {groupReservationsByPickup(selectedHour).length === 0 && (
                <div className="text-center py-8 text-[#A5A5A5]">
                  Bu saatte rezervasyon bulunmamaktadır.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Şu Anki Turlar - Aktif Turlar */}
      {selectedDate === format(new Date(), 'yyyy-MM-dd') && (
        <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Şu Anki Turlar ({getActiveReservations().length})
            </h2>
            {getActiveReservations().length > 0 && (
              <Button
                onClick={() => {
                  const ids = getActiveReservations().map(r => r.id);
                  markMultipleAsCompleted(ids);
                }}
                className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                size="sm"
              >
                <CheckSquare size={16} className="mr-2" />
                Tümünü Tamamlandı İşaretle
              </Button>
            )}
          </div>
          
          {getActiveReservations().length > 0 ? (
            <div className="space-y-3">
              {getActiveReservations().map((reservation) => {
                const reservationHour = parseInt(reservation.time.split(':')[0]);
                const reservationMinute = parseInt(reservation.time.split(':')[1] || 0);
                const estimatedEndHour = reservationHour + 2; // 2 saatlik tur varsayımı
                const estimatedEndTime = `${estimatedEndHour.toString().padStart(2, '0')}:${reservationMinute.toString().padStart(2, '0')}`;
                
                return (
                  <div
                    key={reservation.id}
                    className="bg-[#2D2F33] border border-[#3EA6FF]/50 rounded-lg p-4 flex items-center justify-between hover:border-[#3EA6FF] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold">{reservation.customer_name || 'İsimsiz Müşteri'}</h3>
                        {reservation.voucher_code && (
                          <span className="text-xs font-mono text-[#3EA6FF] bg-[#3EA6FF]/10 px-2 py-0.5 rounded">
                            {reservation.voucher_code}
                          </span>
                        )}
                        <span className="text-sm text-[#A5A5A5]">{reservation.cari_name}</span>
                        <span className="text-sm text-[#3EA6FF] font-semibold">
                          {reservation.atv_count} ATV
                        </span>
                        <span className="text-sm text-[#A5A5A5]">
                          {reservation.person_count} Kişi
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#A5A5A5]">
                        <span>Başlangıç: {reservation.time}</span>
                        <span>→</span>
                        <span>Tahmini Bitiş: {estimatedEndTime}</span>
                        {reservation.tour_type_name && (
                          <>
                            <span>•</span>
                            <span>{reservation.tour_type_name}</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-white mt-1 font-semibold">
                        {reservation.price?.toFixed(2)} {reservation.currency}
                      </div>
                      {reservation.pickup_location && (
                        <p className="text-sm text-[#A5A5A5] mt-1">
                          📍 {reservation.pickup_location}
                        </p>
                      )}
                      {reservation.notes && (
                        <p className="text-xs text-[#A5A5A5] mt-1 italic">
                          {reservation.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => updateReservationStatus(reservation.id, 'completed')}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        size="sm"
                      >
                        <CheckCircle2 size={16} className="mr-2" />
                        Tamamlandı
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[#A5A5A5] py-8">
              Şu anda aktif tur bulunmamaktadır
            </p>
          )}
        </div>
      )}

      {/* Tamamlanan Turlar - Seçili güne ait tüm tamamlanan turlar */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Tamamlanan Turlar ({getCompletedReservations().length})
        </h2>
          
          {getCompletedReservations().length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getCompletedReservations().map((reservation) => {
                const reservationHour = parseInt(reservation.time.split(':')[0]);
                const reservationMinute = parseInt(reservation.time.split(':')[1] || 0);
                const estimatedEndHour = reservationHour + 2;
                const estimatedEndTime = `${estimatedEndHour.toString().padStart(2, '0')}:${reservationMinute.toString().padStart(2, '0')}`;
                
                return (
                  <div
                    key={reservation.id}
                    className="bg-[#2D2F33] border border-[#555555]/50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold">{reservation.customer_name || 'İsimsiz Müşteri'}</h3>
                          {reservation.voucher_code && (
                            <span className="text-xs font-mono text-[#3EA6FF] bg-[#3EA6FF]/10 px-2 py-0.5 rounded">
                              {reservation.voucher_code}
                            </span>
                          )}
                          <span className="text-sm text-[#A5A5A5]">{reservation.cari_name}</span>
                          <span className="text-sm text-[#3EA6FF] font-semibold">
                            {reservation.atv_count} ATV
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#A5A5A5]">
                          <span>{reservation.time}</span>
                          <span>→</span>
                          <span>{estimatedEndTime}</span>
                          {reservation.tour_type_name && (
                            <>
                              <span>•</span>
                              <span>{reservation.tour_type_name}</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-white mt-1 font-semibold">
                          {reservation.price?.toFixed(2)} {reservation.currency}
                        </div>
                        {reservation.pickup_location && (
                          <p className="text-sm text-[#A5A5A5] mt-1">
                            📍 {reservation.pickup_location}
                          </p>
                        )}
                        {reservation.notes && (
                          <p className="text-xs text-[#A5A5A5] mt-1 italic">
                            {reservation.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 bg-[#555555]/30 text-[#999999] rounded-full text-xs font-medium">
                          Tamamlandı
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[#A5A5A5] py-8">
              Henüz tamamlanan tur bulunmamaktadır
            </p>
          )}
      </div>

      {/* Pending Reservations Dialog */}
      <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="text-[#3EA6FF]" size={24} />
              Onay Bekleyen Rezervasyonlar ({pendingReservations.length})
            </DialogTitle>
          </DialogHeader>
          
          {loadingPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3EA6FF]"></div>
            </div>
          ) : pendingReservations.length === 0 ? (
            <p className="text-center text-[#A5A5A5] py-8">
              Onay bekleyen rezervasyon bulunmamaktadır
            </p>
          ) : (
            <div className="space-y-4">
              {pendingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="bg-[#2D2F33] border border-[#3EA6FF]/30 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold">{reservation.customer_name || 'İsimsiz Müşteri'}</h3>
                        {reservation.voucher_code && (
                          <span className="text-xs font-mono text-[#3EA6FF] bg-[#3EA6FF]/10 px-2 py-0.5 rounded">
                            {reservation.voucher_code}
                          </span>
                        )}
                        <span className="text-sm text-[#A5A5A5]">{reservation.cari_name || reservation.display_name}</span>
                        <span className="text-xs text-[#3EA6FF] bg-[#3EA6FF]/10 px-2 py-0.5 rounded">
                          {reservation.cari_code_snapshot}
                        </span>
                        <span className="text-sm text-[#3EA6FF] font-semibold">
                          {reservation.atv_count} ATV
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#A5A5A5] mb-2">
                        <span>📅 {reservation.date}</span>
                        <span>🕐 {reservation.time}</span>
                        {reservation.tour_type_name && (
                          <>
                            <span>•</span>
                            <span>{reservation.tour_type_name}</span>
                          </>
                        )}
                      </div>
                      {reservation.created_at && (
                        <div className="text-xs text-[#A5A5A5] mb-2">
                          ⏰ Oluşturulma: {format(new Date(reservation.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </div>
                      )}
                      <div className="text-lg text-white font-semibold mb-2">
                        {reservation.price?.toFixed(2)} {reservation.currency}
                      </div>
                      {reservation.customer_contact && (
                        <p className="text-sm text-[#A5A5A5] mb-1">
                          📞 {reservation.customer_contact}
                        </p>
                      )}
                      {reservation.pickup_location && (
                        <p className="text-sm text-[#A5A5A5] mb-1">
                          📍 {reservation.pickup_location}
                        </p>
                      )}
                      {reservation.notes && (
                        <p className="text-xs text-[#A5A5A5] mt-2 italic">
                          {reservation.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="mb-2">
                        <label className="block text-xs text-[#A5A5A5] mb-1">
                          Pick-up Saati <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={pickupTimes[reservation.id] || ''}
                          onChange={(e) => setPickupTimes(prev => ({
                            ...prev,
                            [reservation.id]: e.target.value
                          }))}
                          className="w-full px-3 py-2 bg-[#1E1E1E] border border-[#2D2F33] rounded-lg text-white focus:outline-none focus:border-[#3EA6FF]"
                          required
                        />
                      </div>
                      <button
                        onClick={() => handleApproveReservation(reservation.id)}
                        disabled={!pickupTimes[reservation.id] || approvingReservation === reservation.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {approvingReservation === reservation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Onaylanıyor...
                          </>
                        ) : (
                          <>
                            <Check size={18} />
                            Onayla
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reddetme sebebi (opsiyonel):');
                          if (reason !== null) {
                            handleRejectReservation(reservation.id, reason || '');
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <X size={18} />
                        Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;