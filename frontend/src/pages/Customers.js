import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User,
  Building2
} from 'lucide-react';

const Customers = () => {
  const navigate = useNavigate();

  const customerMenuItems = [
    { 
      id: 'munferit',
      title: 'Münferit Müşteriler', 
      icon: User, 
      path: '/customers/munferit',
      description: 'Münferit müşteri kayıtları ve yönetimi'
    },
    { 
      id: 'cari',
      title: 'Cari Müşteriler', 
      icon: Building2, 
      path: '/customers/cari',
      description: 'Cari hesap müşterileri ve yönetimi'
    },
  ];

  return (
    <div className="space-y-6" data-testid="customers-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Müşteriler</h1>
        <p className="text-[#A5A5A5]">Müşteri kayıtları ve yönetimi</p>
      </div>

      {/* Customer Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customerMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.path)}
              className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-lg p-6 cursor-pointer hover:border-[#3EA6FF]/50 hover:bg-[#25272A]/80 transition-all group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#2D2F33] border border-[#3EA6FF]/20 flex items-center justify-center group-hover:border-[#3EA6FF]/50 group-hover:bg-[#2D2F33]/80 transition-all">
                  <Icon size={24} className="text-[#3EA6FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white leading-tight mb-2">{item.title}</h3>
                  <p className="text-xs text-[#A5A5A5] leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Customers;


