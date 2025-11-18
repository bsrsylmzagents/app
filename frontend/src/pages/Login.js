import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { LogIn, Building2, User, Lock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({
    company_code: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('company', JSON.stringify(response.data.company));
      toast.success('Giriş başarılı!');
      // State'i güncelle
      setAuth(true);
      // Navigate kullan (App.js'deki useEffect token'ı kontrol edecek)
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      console.error('API URL:', `${API}/auth/login`);
      console.error('Backend URL:', BACKEND_URL);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error('Backend bağlantısı yapılamadı! Backend\'in çalıştığından emin olun. (http://localhost:8000)');
      } else if (error.response) {
        const errorMessage = error.response?.data?.detail || 'Giriş başarısız';
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası: ' + (error.message || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-2xl mb-4" style={{ background: 'var(--accent)' }}>
            <LogIn size={40} style={{ color: 'var(--text-primary)' }} />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }} data-testid="login-title">TravelSystem Online</h1>
          <p style={{ color: 'var(--text-secondary)' }}>ATV Tur Yönetim Sistemi</p>
        </div>

        {/* Login Form */}
        <div className="backdrop-blur-xl rounded-2xl p-8 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Firma Kodu
              </label>
              <div className="relative">
                <Building2 size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={formData.company_code}
                  onChange={(e) => setFormData({ ...formData, company_code: e.target.value.toUpperCase() })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Firma kodunuzu girin"
                  required
                  data-testid="company-code-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Kullanıcı adınız"
                  required
                  data-testid="username-input"
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
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent)';
                    e.target.style.boxShadow = '0 0 0 3px var(--input-focus)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Şifreniz"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => !loading && (e.target.style.background = 'var(--accent)')}
              data-testid="login-submit-btn"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Henüz hesabınız yok mu?{' '}
              <Link to="/register" className="hover:underline" style={{ color: 'var(--accent)' }} data-testid="register-link">
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;