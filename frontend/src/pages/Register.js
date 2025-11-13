import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { UserPlus, Building2, User, Lock, Mail } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    admin_username: '',
    admin_password: '',
    admin_full_name: '',
    admin_email: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      toast.success(
        `Kayıt başarılı! Firma Kodunuz: ${response.data.company_code}. Lütfen bu kodu saklaya kaydedini unutmayın!`,
        { duration: 10000 }
      );
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0e1a] to-[#0f1419] px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-[#14b8dc] to-[#106ebe] rounded-2xl mb-4">
            <UserPlus size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="register-title">Firma Kaydı</h1>
          <p className="text-gray-400">Yeni bir firma hesabı oluşturun</p>
        </div>

        {/* Register Form */}
        <div className="bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Firma Adı
              </label>
              <div className="relative">
                <Building2 size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Firma adınız"
                  required
                  data-testid="company-name-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Adı Soyadı
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.admin_full_name}
                  onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Adınız ve soyadınız"
                  required
                  data-testid="admin-name-input"
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
                  value={formData.admin_username}
                  onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Kullanıcı adı seçin"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-posta (Opsiyonel)
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="E-posta adresiniz"
                  data-testid="email-input"
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
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#14b8dc] transition-colors"
                  placeholder="Güçlü bir şifre seçin"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="register-submit-btn"
            >
              {loading ? 'Kayıt yapılıyor...' : 'Firma Kaydı Oluştur'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="text-[#14b8dc] hover:underline" data-testid="login-link">
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
