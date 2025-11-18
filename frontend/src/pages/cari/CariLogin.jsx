import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { LogIn, Building2, Lock } from 'lucide-react';

const CariLogin = () => {
  const { companySlug, cariCode } = useParams(); // companySlug yeni, cariCode eski (backward compatibility)
  const [formData, setFormData] = useState({
    username: '', // Artık URL'den gelmeyecek, kullanıcı girecek
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Eski sistem için: /r/:cariCode route'undan geldiyse username'i doldur (backward compatibility)
    if (cariCode) {
      setFormData(prev => ({ ...prev, username: cariCode }));
    }
    
    // Yeni sistem: companySlug varsa firma bilgilerini backend'den al
    if (companySlug) {
      fetchCompanyInfo(companySlug);
    }
  }, [companySlug, cariCode]);

  const fetchCompanyInfo = async (slug) => {
    try {
      const response = await axios.get(`${API}/cari/company/${slug}`);
      setCompanyInfo(response.data);
    } catch (error) {
      console.error('Company info fetch error:', error);
      // Hata durumunda sadece slug'ı göster
      setCompanyInfo({ company_code: slug, company_name: slug });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/cari/auth/login`, {
        username: formData.username,
        password: formData.password,
        company_code: companySlug || null  // Güvenlik: Company kontrolü için
      });

      localStorage.setItem('cari_token', response.data.access_token);
      localStorage.setItem('cari', JSON.stringify(response.data.cari));
      localStorage.setItem('cari_company', JSON.stringify(response.data.company));

      // İlk girişte şifre değiştirme gerekli mi?
      if (response.data.cari.require_password_change) {
        navigate('/cari/change-password', { replace: true });
      } else {
        navigate('/cari/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Cari login error:', error);
      if (error.response) {
        const errorMessage = error.response?.data?.detail || 'Giriş başarısız';
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Company Logo */}
          {companyInfo?.logo_url ? (
            <div className="mb-4">
              <img 
                src={companyInfo.logo_url} 
                alt={companyInfo.company_name || 'Company Logo'} 
                className="max-h-24 mx-auto object-contain"
              />
            </div>
          ) : (
            <div className="inline-block p-4 rounded-2xl mb-4" style={{ background: 'var(--accent)' }}>
              <Building2 size={40} style={{ color: 'var(--text-primary)' }} />
            </div>
          )}
          
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {companyInfo?.company_name || 'Cari Rezervasyon Paneli'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {companyInfo?.company_name 
              ? `${companyInfo.company_name} - Rezervasyon paneli için giriş yapınız` 
              : 'Giriş yapınız'}
          </p>
          
          {/* Company Contact Info */}
          {(companyInfo?.contact_phone || companyInfo?.contact_email || companyInfo?.address) && (
            <div className="mt-4 text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              {companyInfo.contact_phone && (
                <p>📞 {companyInfo.contact_phone}</p>
              )}
              {companyInfo.contact_email && (
                <p>✉️ {companyInfo.contact_email}</p>
              )}
              {companyInfo.address && (
                <p>📍 {companyInfo.address}</p>
              )}
            </div>
          )}
          
          {companySlug && !companyInfo && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Cari kodunuzu ve şifrenizi girin
            </p>
          )}
        </div>

        <div className="backdrop-blur-xl rounded-2xl p-8 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Cari Kodu
              </label>
              <div className="relative">
                <Building2 size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Cari kodunuzu girin"
                  required
                  autoFocus={!cariCode} // Eski sistemde cariCode varsa focus yok
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Şifre
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Şifrenizi girin"
                  required
                />
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                İlk girişte şifre = cari kodu
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-primary)'
              }}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CariLogin;

