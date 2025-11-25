import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Calendar, Users, Loader2, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PortalDashboard = () => {
  const { agencySlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState([]);
  const [agency, setAgency] = useState(null);
  const [corporate, setCorporate] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    date: '',
    pax: 1,
    customerName: '',
    customerContact: '',
    notes: ''
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [agencySlug]);

  const checkAuth = () => {
    const token = localStorage.getItem('portal_token');
    const corporateData = localStorage.getItem('portal_corporate');
    const agencyData = localStorage.getItem('portal_agency');

    if (!token || !corporateData || !agencyData) {
      navigate(`/portal/${agencySlug}/login`, { replace: true });
      return;
    }

    try {
      setCorporate(JSON.parse(corporateData));
      setAgency(JSON.parse(agencyData));
    } catch (error) {
      console.error('Error parsing stored data:', error);
      navigate(`/portal/${agencySlug}/login`, { replace: true });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('portal_token');
      
      const response = await axios.get(`${API}/portal/tours`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTours(response.data.tours || []);
    } catch (error) {
      console.error('Error fetching tours:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        handleLogout();
      } else {
        toast.error('Turlar yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_corporate');
    localStorage.removeItem('portal_agency');
    navigate(`/portal/${agencySlug}/login`, { replace: true });
  };

  const handleTourClick = (tour) => {
    setSelectedTour(tour);
    setBookingForm({
      date: '',
      pax: 1,
      customerName: '',
      customerContact: '',
      notes: ''
    });
    setBookingDialogOpen(true);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    
    if (!selectedTour) return;
    
    // Validation
    if (!bookingForm.date) {
      toast.error('Lütfen tarih seçin');
      return;
    }
    
    if (bookingForm.pax < 1) {
      toast.error('Kişi sayısı en az 1 olmalıdır');
      return;
    }
    
    if (!bookingForm.customerName.trim()) {
      toast.error('Lütfen müşteri adını girin');
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('portal_token');
      
      const response = await axios.post(
        `${API}/portal/reservations`,
        {
          tourId: selectedTour.id,
          date: bookingForm.date,
          pax: bookingForm.pax,
          customerName: bookingForm.customerName,
          customerContact: bookingForm.customerContact || null,
          notes: bookingForm.notes || null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast.success('Rezervasyon talebiniz başarıyla oluşturuldu! Onay bekliyor.');
      setBookingDialogOpen(false);
      setBookingForm({
        date: '',
        pax: 1,
        customerName: '',
        customerContact: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error submitting booking:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        handleLogout();
      } else {
        toast.error(error.response?.data?.detail || 'Rezervasyon talebi gönderilirken bir hata oluştu');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#1E1E1E]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-[#3EA6FF] mx-auto mb-4" />
          <p className="text-slate-600 dark:text-[#A5A5A5]">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#1E1E1E]">
      {/* Header */}
      <header className="bg-white dark:bg-[#25272A] shadow-sm border-b border-slate-200 dark:border-[#2D2F33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {agency?.logo_url && (
                <img 
                  src={agency.logo_url} 
                  alt={agency.name}
                  className="h-10 w-10 object-contain rounded"
                />
              )}
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {agency?.name || 'Bayi Paneli'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#A5A5A5]">
                  {corporate?.display_name || corporate?.cari_code}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-slate-600 dark:text-[#A5A5A5] hover:text-slate-900 dark:hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Tur Kataloğu
          </h2>
          <p className="text-slate-600 dark:text-[#A5A5A5]">
            Rezervasyon yapmak için bir tur seçin
          </p>
        </div>

        {tours.length === 0 ? (
          <div className="bg-white dark:bg-[#25272A] rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none p-12 text-center">
            <p className="text-slate-600 dark:text-[#A5A5A5]">Henüz tur bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white dark:bg-[#25272A] rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTourClick(tour)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {tour.name}
                  </h3>
                  {tour.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tour.color }}
                    />
                  )}
                </div>
                
                {tour.description && (
                  <p className="text-slate-600 dark:text-[#A5A5A5] text-sm mb-4 line-clamp-2">
                    {tour.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-[#A5A5A5] mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{tour.duration_hours} saat</span>
                  </div>
                </div>
                
                {tour.default_price && tour.default_price > 0 && (
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-[#3EA6FF]">
                      {tour.default_price.toFixed(2)} {tour.default_currency}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#A5A5A5]">ATV başına</p>
                  </div>
                )}
                
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTourClick(tour);
                  }}
                >
                  Rezervasyon Yap
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="bg-white dark:bg-[#25272A] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                Rezervasyon Talebi
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-[#A5A5A5]">
                {selectedTour?.name} için rezervasyon talebinizi oluşturun
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitBooking} className="space-y-6 mt-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-900 dark:text-white">
                  Tarih <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  required
                />
              </div>

              {/* Pax */}
              <div className="space-y-2">
                <Label htmlFor="pax" className="text-slate-900 dark:text-white">
                  Kişi Sayısı <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pax"
                  type="number"
                  min="1"
                  value={bookingForm.pax}
                  onChange={(e) => setBookingForm({ ...bookingForm, pax: parseInt(e.target.value) || 1 })}
                  className="bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  required
                />
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-slate-900 dark:text-white">
                  Müşteri Adı <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  type="text"
                  value={bookingForm.customerName}
                  onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                  className="bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  required
                />
              </div>

              {/* Customer Contact */}
              <div className="space-y-2">
                <Label htmlFor="customerContact" className="text-slate-900 dark:text-white">
                  İletişim (Telefon/E-posta)
                </Label>
                <Input
                  id="customerContact"
                  type="text"
                  value={bookingForm.customerContact}
                  onChange={(e) => setBookingForm({ ...bookingForm, customerContact: e.target.value })}
                  className="bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-900 dark:text-white">
                  Notlar (Opsiyonel)
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingDialogOpen(false)}
                  className="border-slate-200 dark:border-[#2D2F33]"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    'Rezervasyon Talebi Oluştur'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PortalDashboard;




