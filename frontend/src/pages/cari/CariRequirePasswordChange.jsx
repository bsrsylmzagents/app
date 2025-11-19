import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { Lock, Key } from 'lucide-react';

const CariRequirePasswordChange = () => {
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.new_password !== formData.confirm_password) {
      toast.error('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('cari_token');
      await axios.post(
        `${API}/cari/auth/change-password`,
        {
          old_password: null, // İlk girişte null
          new_password: formData.new_password
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Şifre başarıyla değiştirildi');
      navigate('/cari/dashboard', { replace: true });
    } catch (error) {
      console.error('Password change error:', error);
      if (error.response) {
        const errorMessage = error.response?.data?.detail || 'Şifre değiştirme başarısız';
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
          <div className="inline-block p-4 rounded-2xl mb-4" style={{ background: 'var(--accent)' }}>
            <Key size={40} style={{ color: 'var(--text-primary)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Şifre Değiştirme
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            İlk girişinizde şifrenizi değiştirmeniz gerekmektedir
          </p>
        </div>

        <div className="backdrop-blur-xl rounded-2xl p-8 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Yeni Şifre
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Yeni şifrenizi girin (min 6 karakter)"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-lg focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Şifrenizi tekrar girin"
                  required
                  minLength={6}
                />
              </div>
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
              {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CariRequirePasswordChange;



