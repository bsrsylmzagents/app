import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { ShoppingCart, Check, X, Package, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Store = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyModules, setCompanyModules] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
    fetchCompanyModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get(`${API}/store/modules`);
      setModules(response.data.modules || []);
    } catch (error) {
      console.error('Modules fetch error:', error);
      toast.error('Modüller yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyModules = async () => {
    try {
      const response = await axios.get(`${API}/companies/me`);
      setCompanyModules(response.data.company?.modules_enabled || {});
    } catch (error) {
      console.error('Company modules fetch error:', error);
    }
  };

  const handlePurchase = async (moduleName, planId) => {
    try {
      const successUrl = `${window.location.origin}/store/success?module=${moduleName}`;
      const cancelUrl = `${window.location.origin}/store`;

      const response = await axios.post(`${API}/store/create-checkout-session`, {
        module: moduleName,
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl
      });

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Checkout session oluşturulamadı');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error.response?.data?.detail || 'Satın alma başarısız');
    }
  };

  const formatPrice = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3EA6FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Modül Mağazası</h1>
          <p className="text-[#A5A5A5]">İhtiyacınıza uygun modülleri satın alın</p>
        </div>
        <div className="flex items-center gap-2">
          <Package size={24} className="text-[#3EA6FF]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div
            key={module.name}
            className="bg-[#2D2F33] rounded-xl p-6 border border-[#3EA6FF]/20 hover:border-[#3EA6FF]/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white capitalize">{module.display_name}</h2>
              {companyModules[module.name] ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
                  <Check size={16} />
                  Aktif
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
                  Satın Al
                </span>
              )}
            </div>

            <p className="text-[#A5A5A5] mb-6">
              {module.name === 'hotel' 
                ? 'Otel yönetimi, rezervasyon sistemi ve ICS senkronizasyonu'
                : 'Tur yönetimi ve rezervasyon sistemi'}
            </p>

            <div className="space-y-3 mb-6">
              {module.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2D2F33]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">
                        {formatPrice(plan.amount, plan.currency)}
                      </div>
                      {plan.interval && (
                        <div className="text-xs text-[#A5A5A5]">/ {plan.interval}</div>
                      )}
                    </div>
                  </div>
                  {!companyModules[module.name] && (
                    <button
                      onClick={() => handlePurchase(module.name, plan.id)}
                      className="w-full mt-3 px-4 py-2 bg-[#3EA6FF] hover:bg-[#3EA6FF]/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard size={18} />
                      Satın Al
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-[#A5A5A5] mb-4" />
          <p className="text-[#A5A5A5]">Henüz modül bulunmamaktadır</p>
        </div>
      )}
    </div>
  );
};

export default Store;


