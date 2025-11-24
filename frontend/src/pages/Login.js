import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LogIn, User, Lock, Smartphone, Building2, Phone, Mail, X, MapPin, Plane, Car, Bike, Activity, Mountain } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 120, 
      damping: 12,
      duration: 0.5
    } 
  }
};

const sentence1Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0
  },
  exit: {
    opacity: 0,
    y: -30
  }
};

const sentence2Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0
  },
  exit: {
    opacity: 0,
    y: -30
  }
};

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: ''
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      
      if (response.data.require2FA) {
        setRequire2FA(true);
        setTempToken(response.data.tempToken);
        toast.info('İki faktörlü kimlik doğrulama gerekiyor');
        return;
      }
      
      // Normal login flow
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('company', JSON.stringify(response.data.company));
      toast.success('Giriş başarılı!');
      setAuth(true);
      
      // Get user's preferred start page
      const startPage = response.data.user?.preferences?.startPage || '/dashboard';
      
      // Navigate to user's preferred start page
      navigate(startPage, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error('Backend bağlantısı yapılamadı! Backend\'in çalıştığından emin olun. (http://localhost:8000)');
      } else if (error.response) {
        let errorMessage = 'Giriş başarısız';
        const detail = error.response?.data?.detail;
        
        if (detail) {
          if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (Array.isArray(detail)) {
            const messages = detail.map(err => {
              if (typeof err === 'object' && err.msg) {
                return err.msg;
              }
              return String(err);
            });
            errorMessage = messages.join(', ');
          } else if (typeof detail === 'object' && detail.msg) {
            errorMessage = detail.msg;
          } else {
            errorMessage = String(detail);
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası: ' + (error.message || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAValidation = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu girin');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/2fa/validate-login`, {
        tempToken: tempToken,
        code: twoFactorCode
      });

      if (response.data.recovery_code_used) {
        toast.warning('Kurtarma kodu kullanıldı. Lütfen yeni bir kurtarma kodu oluşturun.');
      }

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('company', JSON.stringify(response.data.company));
      toast.success('Giriş başarılı!');
      setAuth(true);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('2FA validation error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error('Backend bağlantısı yapılamadı! Backend\'in çalıştığından emin olun.');
      } else if (error.response) {
        let errorMessage = 'Doğrulama kodu geçersiz';
        const detail = error.response?.data?.detail;
        
        if (detail) {
          if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (Array.isArray(detail)) {
            const messages = detail.map(err => {
              if (typeof err === 'object' && err.msg) {
                return err.msg;
              }
              return String(err);
            });
            errorMessage = messages.join(', ');
          } else if (typeof detail === 'object' && detail.msg) {
            errorMessage = detail.msg;
          } else {
            errorMessage = String(detail);
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası: ' + (error.message || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRequest = async (e) => {
    e.preventDefault();
    setDemoLoading(true);

    try {
      await axios.post(`${API}/auth/demo-request`, demoFormData);
      toast.success('Demo talebiniz alındı! En kısa sürede size dönüş yapacağız.');
      setDemoModalOpen(false);
      setDemoFormData({
        company_name: '',
        contact_name: '',
        phone: '',
        email: ''
      });
    } catch (error) {
      console.error('Demo request error:', error);
      
      if (error.response) {
        let errorMessage = 'Demo talebi gönderilemedi';
        const detail = error.response?.data?.detail;
        
        if (detail) {
          if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (Array.isArray(detail)) {
            const messages = detail.map(err => {
              if (typeof err === 'object' && err.msg) {
                return err.msg;
              }
              return String(err);
            });
            errorMessage = messages.join(', ');
          } else if (typeof detail === 'object' && detail.msg) {
            errorMessage = detail.msg;
          } else {
            errorMessage = String(detail);
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error('Bağlantı hatası: ' + (error.message || 'Bilinmeyen hata'));
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const AnimatedATVIcon = () => {
    return (
      <div className="relative inline-flex items-center justify-center">
        <div className="relative z-10 flex flex-col items-center">
          <svg 
            width="80" 
            height="20" 
            viewBox="0 0 80 20" 
            className="absolute -bottom-2 text-orange-400 opacity-60"
            style={{ animationDuration: '2s' }}
          >
            <path 
              d="M0,10 Q10,5 20,10 T40,10 T60,8 T80,10" 
              stroke="currentColor" 
              strokeWidth="2" 
              fill="none"
              className="animate-pulse"
            />
          </svg>
          <Bike 
            size={64} 
            className="text-orange-600 animate-bounce relative"
            style={{ animationDuration: '2s' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Brand Panel */}
      <div className="w-full h-64 lg:h-screen lg:w-5/12 lg:w-1/2 bg-gradient-to-br from-orange-400 via-orange-600 to-orange-900 relative overflow-hidden">
        {/* Enhanced Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-800/20 via-transparent to-transparent"></div>
        
        {/* Wave/Topography Pattern Overlay */}
        <div className="absolute inset-0 opacity-50 mix-blend-soft-light">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <pattern id="wave-topography" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
                <path d="M0,150 Q75,100 150,150 T300,150" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                <path d="M0,180 Q75,130 150,180 T300,180" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5"/>
                <path d="M0,210 Q75,160 150,210 T300,210" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4"/>
                <path d="M0,240 Q75,190 150,240 T300,240" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
                <path d="M0,50 Q50,30 100,50 T200,50 Q250,30 300,50" fill="none" stroke="white" strokeWidth="1" opacity="0.5"/>
                <path d="M0,80 Q50,60 100,80 T200,80 Q250,60 300,80" fill="none" stroke="white" strokeWidth="1" opacity="0.4"/>
                <path d="M0,110 Q50,90 100,110 T200,110 Q250,90 300,110" fill="none" stroke="white" strokeWidth="1" opacity="0.35"/>
                <path d="M0,120 Q100,100 200,120 Q250,110 300,120" fill="none" stroke="white" strokeWidth="1.2" opacity="0.3"/>
                <path d="M0,270 Q75,250 150,270 T300,270" fill="none" stroke="white" strokeWidth="1.5" opacity="0.25"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wave-topography)" />
          </svg>
        </div>

        <div className="relative z-10 h-full flex flex-col justify-between items-center text-center p-6 lg:p-8 md:p-12">
          {/* Logo & Branding */}
          <motion.div 
            className="max-w-lg flex-1 flex flex-col justify-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 lg:mb-8 tracking-tight text-white drop-shadow-lg font-display" 
              style={{ letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              variants={itemVariants}
            >
              TourCast
            </motion.h1>
            <div className="hidden lg:block min-h-[200px] flex flex-col justify-center items-center relative">
              {/* First Sentence - Turizmin Geleceğini Yönetin */}
              <motion.h2 
                className="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-3 lg:mb-6 leading-tight tracking-tight text-white drop-shadow-md font-display -ml-2 text-center w-full absolute" 
                style={{ letterSpacing: '-0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                initial="hidden"
                animate={["visible", "visible", "exit", "hidden"]}
                transition={{
                  times: [0, 0.25, 0.4, 0.55, 1],
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut"
                }}
                variants={sentence1Variants}
              >
                Turizmin Geleceğini Yönetin.
              </motion.h2>
              
              {/* Second Sentence - ATV, Balon, Transfer... */}
              <motion.p 
                className="text-sm md:text-lg lg:text-xl xl:text-2xl text-orange-100/90 leading-relaxed font-medium font-display ml-8 md:ml-12 text-center w-full absolute" 
                style={{ letterSpacing: '0.01em', textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
                initial="hidden"
                animate={["hidden", "hidden", "visible", "visible", "exit", "hidden"]}
                transition={{
                  times: [0, 0.4, 0.55, 0.75, 0.85, 1],
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut"
                }}
                variants={sentence2Variants}
              >
                ATV, Balon, Transfer, Günlük Turlar... Operasyon ne olursa olsun, kontrol sizde. Tek platform, tam hakimiyet.
              </motion.p>
            </div>
          </motion.div>

          {/* Footer Links and Copyright - Desktop only */}
          <div className="w-full max-w-lg ml-4 hidden lg:block">
            <div className="flex flex-wrap justify-center gap-6 text-sm mb-4 font-display">
              <a href="#" className="text-white/90 hover:text-white hover:underline transition-all font-semibold">
                SSS
              </a>
              <a href="#" className="text-white/90 hover:text-white hover:underline transition-all font-semibold">
                Kullanım Kılavuzu
              </a>
              <a href="#" className="text-white/90 hover:text-white hover:underline transition-all font-semibold">
                Bize Ulaşın
              </a>
            </div>
            <p className="text-center text-xs text-white/80 font-display">
              © {new Date().getFullYear()} TourCast. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
        </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-7/12 lg:w-1/2 bg-white flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 relative -mt-4 lg:mt-0 rounded-t-3xl lg:rounded-none">
        <div className="w-full max-w-md flex-1 flex flex-col justify-center">
          {!require2FA ? (
            <>
              {/* Header with Animated Icon */}
              <div className="text-center mb-10">
                <div className="flex justify-center items-center mb-6">
                  <AnimatedATVIcon />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
                  Giriş Yap
                </h1>
                <p className="text-base md:text-lg text-gray-900 font-normal" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}>
                  Hesabınıza devam etmek için bilgilerinizi girin.
                </p>
              </div>

              {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                Kullanıcı Adı
              </label>
              <div className="relative">
                    <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="Kullanıcı adı veya e-posta"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                Şifre
              </label>
              <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="Şifreniz"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 !text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 relative z-10"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', letterSpacing: '0.01em', backgroundColor: '#f97316', color: '#ffffff' }}
              data-testid="login-submit-btn"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

              {/* Demo Request Link */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-900 font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Henüz bir hesabınız yok mu?{' '}
                  <button
                    onClick={() => setDemoModalOpen(true)}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-all"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Demo Talebi Gönder
                  </button>
                </p>
              </div>

              {/* Mobile Footer Links - Only visible on mobile */}
              <div className="mt-12 pt-8 border-t border-gray-200 block lg:hidden">
                <div className="flex flex-wrap justify-center gap-6 text-sm mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <a href="#" className="text-gray-500 hover:text-orange-600 hover:underline transition-all font-medium">
                    SSS
                  </a>
                  <a href="#" className="text-gray-500 hover:text-orange-600 hover:underline transition-all font-medium">
                    Kullanım Kılavuzu
                  </a>
                  <a href="#" className="text-gray-500 hover:text-orange-600 hover:underline transition-all font-medium">
                    Bize Ulaşın
                  </a>
                </div>
                <p className="text-center text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                  © {new Date().getFullYear()} TourCast. Tüm hakları saklıdır.
                </p>
              </div>
            </>
          ) : (
            <form onSubmit={handle2FAValidation} className="space-y-6">
              <div className="text-center mb-6">
                <Smartphone size={56} className="mx-auto mb-6 text-orange-600" />
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', fontWeight: 700 }}>
                  İki Faktörlü Kimlik Doğrulama
                </h2>
                <p className="text-base text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Authenticator uygulamanızdan 6 haneli kodu girin
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Doğrulama Kodu
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-center text-3xl tracking-[0.5em] font-semibold text-white placeholder:text-gray-400"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs mt-3 text-gray-500 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Kurtarma kodunuz varsa onu da kullanabilirsiniz
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 !text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 relative z-10"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', backgroundColor: '#f97316', color: '#ffffff' }}
              >
                {loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequire2FA(false);
                  setTempToken(null);
                  setTwoFactorCode('');
                }}
                className="w-full py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                ← Geri Dön
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Demo Request Modal */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
              TourCast Demo Talebi
            </DialogTitle>
            <DialogDescription className="text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
              Demo talebinizi gönderin, size en kısa sürede dönüş yapalım.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleDemoRequest} className="space-y-5 mt-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                Firma Adı
              </label>
              <div className="relative">
                <Building2 size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={demoFormData.company_name}
                  onChange={(e) => setDemoFormData({ ...demoFormData, company_name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="Firma adınız"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                Yetkili Kişi Adı
              </label>
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={demoFormData.contact_name}
                  onChange={(e) => setDemoFormData({ ...demoFormData, contact_name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="Adınız ve soyadınız"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                Telefon Numarası
              </label>
              <div className="relative">
                <Phone size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={demoFormData.phone}
                  onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="05XX XXX XX XX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                E-posta
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={demoFormData.email}
                  onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#1e293b] border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder:text-gray-400 font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                  placeholder="ornek@firma.com"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDemoModalOpen(false)}
                className="flex-1 font-semibold"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={demoLoading}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {demoLoading ? 'Gönderiliyor...' : 'Talebi Gönder'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
