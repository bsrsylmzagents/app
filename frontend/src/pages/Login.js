import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { LogIn, Building2, User, Lock } from 'lucide-react';

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
      setAuth(true);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e1a] to-[#0f1419] px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-[#14b8dc] to-[#106ebe] rounded-2xl mb-4">
            <LogIn size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="login-title">TravelSystem Online</h1>
          <p className="text-gray-400">ATV Tur Yönetim Sistemi</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Firma Kodu
              </label>
              <div className="relative">
                <Building2 size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.company_code}
                  onChange={(e) => setFormData({ ...formData, company_code: e.target.value.toUpperCase() })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Firma kodunuzu girin"
                  required
                  data-testid="company-code-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Kullanıcı adınız"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Şifreniz"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit-btn"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Henüz hesabınız yok mu?{' '}
              <Link to="/register" className="text-[#14b8dc] hover:underline" data-testid="register-link">
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
