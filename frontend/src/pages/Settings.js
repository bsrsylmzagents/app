import React from 'react';
import { Users, MapPin, CreditCard } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6" data-testid="settings-page">
      <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-hover bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6 cursor-pointer">
          <Users size={40} className="text-[#14b8dc] mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Personel</h3>
          <p className="text-sm text-gray-400">Kullanıcı ve personel yönetimi</p>
        </div>
        <div className="card-hover bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6 cursor-pointer">
          <MapPin size={40} className="text-[#14b8dc] mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Tur Tipleri</h3>
          <p className="text-sm text-gray-400">Tur tipi tanımları</p>
        </div>
        <div className="card-hover bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6 cursor-pointer">
          <CreditCard size={40} className="text-[#14b8dc] mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Tahsilat Tipleri</h3>
          <p className="text-sm text-gray-400">Ödeme yöntemleri</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
