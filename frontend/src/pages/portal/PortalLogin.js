import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { LogIn, Building2, Lock, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PortalLogin = () => {
  const { agencySlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingAgency, setFetchingAgency] = useState(true);
  const [agency, setAgency] = useState(null);
  const [formData, setFormData] = useState({
    corporateCode: '',
    password: ''
  });

  useEffect(() => {
    fetchAgencyInfo();
  }, [agencySlug]);

  const fetchAgencyInfo = async () => {
    try {
      setFetchingAgency(true);
      // Use public endpoint to get agency info
      const response = await axios.get(`${API}/public/agency/${agencySlug}/tours`);
      setAgency(response.data.agency);
    } catch (error) {
      console.error('Error fetching agency info:', error);
      // Acenta bilgileri yüklenemese bile giriş formunu göster
      // Hata mesajı gösterme - sadece varsayılan değerlerle devam et
      // Alternatif olarak cari/company endpoint'ini dene
      try {
        const fallbackResponse = await axios.get(`${API}/cari/company/${agencySlug}`);
        setAgency({
          name: fallbackResponse.data.company_name,
          company_code: fallbackResponse.data.company_code,
          logo_url: fallbackResponse.data.logo_url,
          contact_phone: fallbackResponse.data.contact_phone,
          contact_email: fallbackResponse.data.contact_email,
          address: fallbackResponse.data.address
        });
      } catch (fallbackError) {
        // Her iki endpoint de başarısız oldu, varsayılan değerlerle devam et
        // Giriş formu yine de gösterilecek, sadece firma bilgileri eksik olacak
        // Hata mesajı gösterme - kullanıcı giriş yapabilir
        setAgency({ name: agencySlug, company_code: agencySlug });
      }
    } finally {
      setFetchingAgency(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/b2b-login`, {
        agencySlug: agencySlug,
        corporateCode: formData.corporateCode.toUpperCase(),
        password: formData.password
      });

      // Store token and corporate info in cari format (for compatibility with existing cari system)
      localStorage.setItem('cari_token', response.data.access_token);
      localStorage.setItem('cari', JSON.stringify({
        id: response.data.corporate.id,
        cari_code: response.data.corporate.cari_code,
        display_name: response.data.corporate.display_name,
        require_password_change: response.data.corporate.require_password_change
      }));
      localStorage.setItem('cari_company', JSON.stringify(response.data.agency));

      // Also store in portal format (for future use)
      localStorage.setItem('portal_token', response.data.access_token);
      localStorage.setItem('portal_corporate', JSON.stringify(response.data.corporate));
      localStorage.setItem('portal_agency', JSON.stringify(response.data.agency));

      // Check if password change is required
      if (response.data.corporate.require_password_change) {
        toast.info('İlk girişte şifre değiştirmeniz gerekiyor');
        navigate('/cari/change-password', { replace: true });
      } else {
        navigate('/cari/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('B2B login error:', error);
      if (error.response) {
        let errorMessage = 'Giriş başarısız';
        const detail = error.response?.data?.detail;
        
        // Handle different error formats
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          // Pydantic validation errors - extract first error message
          const firstError = detail[0];
          errorMessage = typeof firstError === 'string' 
            ? firstError 
            : firstError?.msg || 'Giriş başarısız';
        } else if (detail && typeof detail === 'object') {
          // If detail is an object, try to extract a message
          errorMessage = detail.msg || detail.message || 'Giriş başarısız';
        }
        
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası');
      }
    } finally {
      setLoading(false);
    }
  };

  // Acenta bilgileri yüklenirken de giriş formunu göster
  // Sadece loading state'i göster

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100 dark:bg-[#1E1E1E]">
      <div className="w-full max-w-md">
        {/* Agency Header */}
        <div className="text-center mb-8">
          {fetchingAgency ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-[#3EA6FF]" />
              <p className="text-slate-600 dark:text-[#A5A5A5]">Acenta bilgileri yükleniyor...</p>
            </div>
          ) : (
            <>
              {agency?.logo_url && (
                <img 
                  src={agency.logo_url} 
                  alt={agency.name}
                  className="h-20 w-20 object-contain mx-auto mb-4 rounded-lg bg-white p-2"
                />
              )}
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {typeof agency?.name === 'string' ? agency.name : agencySlug}
              </h1>
              <p className="text-sm text-slate-600 dark:text-[#A5A5A5] mb-4">
                B2B Paneli Girişi
              </p>
              
              {/* İletişim Bilgileri */}
              {(agency?.contact_phone || agency?.contact_email || agency?.address) && (
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-[#A5A5A5]">
                  {agency.contact_phone && typeof agency.contact_phone === 'string' && (
                    <div className="flex items-center justify-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{agency.contact_phone}</span>
                    </div>
                  )}
                  {agency.contact_email && typeof agency.contact_email === 'string' && (
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{agency.contact_email}</span>
                    </div>
                  )}
                  {agency.address && typeof agency.address === 'string' && (
                    <div className="flex items-center justify-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{agency.address}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-[#25272A] rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="corporateCode" className="text-slate-900 dark:text-white mb-2">
                Cari Kodu
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-[#A5A5A5]" />
                <Input
                  id="corporateCode"
                  type="text"
                  value={formData.corporateCode}
                  onChange={(e) => setFormData({ ...formData, corporateCode: e.target.value.toUpperCase() })}
                  className="pl-11 bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  placeholder="Cari kodunuzu girin"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-900 dark:text-white mb-2">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-[#A5A5A5]" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 bg-slate-50 dark:bg-[#2D2F33] border-slate-200 dark:border-[#2D2F33]"
                  placeholder="Şifrenizi girin"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-[#A5A5A5]">
                İlk girişte şifre = cari kodu
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giriş Yap
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;

