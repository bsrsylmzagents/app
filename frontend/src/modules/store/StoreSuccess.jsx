import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Package } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../../App';

const StoreSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const module = searchParams.get('module');

  useEffect(() => {
    // Poll for module activation
    const checkModule = async () => {
      try {
        const response = await axios.get(`${API}/companies/me`);
        const modules = response.data.company?.modules_enabled || {};
        if (module && modules[module]) {
          toast.success(`${module} modülü başarıyla etkinleştirildi!`);
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (error) {
        console.error('Module check error:', error);
      }
    };

    checkModule();
    const interval = setInterval(checkModule, 2000);
    return () => clearInterval(interval);
  }, [module, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center bg-[#2D2F33] rounded-xl p-8 border border-[#3EA6FF]/20">
        <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
          <Check size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
        <p className="text-[#A5A5A5] mb-4">
          {module ? `${module} modülü` : 'Modül'} etkinleştiriliyor...
        </p>
        <div className="flex items-center justify-center gap-2 text-[#A5A5A5]">
          <Package size={20} className="animate-pulse" />
          <span>Lütfen bekleyin</span>
        </div>
      </div>
    </div>
  );
};

export default StoreSuccess;



