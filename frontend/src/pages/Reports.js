import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Receipt,
  CreditCard,
  ListChecks,
  TrendingUp,
  TrendingDown,
  User
} from 'lucide-react';

const Reports = () => {
  const navigate = useNavigate();

  const reportMenuItems = [
    { 
      id: 'income',
      title: 'Gelir', 
      icon: DollarSign, 
      path: '/reports/income',
      description: 'Tur tiplerine ve döviz tiplerine göre gelir analizi'
    },
    { 
      id: 'expenses',
      title: 'Gider', 
      icon: Receipt, 
      path: '/reports/expenses',
      description: 'Gider kalemlerine ve döviz tiplerine göre gider analizi'
    },
    { 
      id: 'collections',
      title: 'Tahsilat', 
      icon: CreditCard, 
      path: '/reports/collections',
      description: 'Ödeme tiplerine ve döviz tiplerine göre tahsilat analizi'
    },
    { 
      id: 'logs',
      title: 'Loglar', 
      icon: ListChecks, 
      path: '/reports/logs',
      description: 'Sistem logları ve aktivite kayıtları'
    },
    { 
      id: 'profit',
      title: 'Kazanç', 
      icon: TrendingUp, 
      path: '/reports/profit',
      description: 'Kar/Zarar analizi ve kazanç raporu'
    },
    { 
      id: 'cash-flow',
      title: 'Nakit Akış', 
      icon: TrendingDown, 
      path: '/reports/cash-flow',
      description: 'Günlük/haftalık/aylık nakit giriş-çıkış analizi'
    },
    { 
      id: 'customer-analysis',
      title: 'Müşteri Analizi', 
      icon: User, 
      path: '/reports/customer-analysis',
      description: 'Müşteri bazlı satış, gelir ve tekrar ziyaret analizi'
    },
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
          <div>
        <h1 className="text-3xl font-bold text-white mb-2">Raporlar</h1>
        <p className="text-[#A5A5A5]">Kapsamlı raporlama ve analiz sistemi</p>
      </div>

      {/* Report Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {reportMenuItems.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              onClick={() => navigate(report.path)}
              className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-lg p-6 cursor-pointer hover:border-[#3EA6FF]/50 hover:bg-[#25272A]/80 transition-all group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#2D2F33] border border-[#3EA6FF]/20 flex items-center justify-center group-hover:border-[#3EA6FF]/50 group-hover:bg-[#2D2F33]/80 transition-all">
                  <Icon size={24} className="text-[#3EA6FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white leading-tight mb-2">{report.title}</h3>
                  <p className="text-xs text-[#A5A5A5] leading-relaxed">{report.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;
