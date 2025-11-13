import React from 'react';
import { FileText, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

const Reports = () => {
  const reportCards = [
    { title: 'Kazanç Raporu', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { title: 'Tahsilat Raporu', icon: TrendingUp, color: 'from-blue-500 to-cyan-600' },
    { title: 'Depar Raporu', icon: FileText, color: 'from-purple-500 to-pink-600' },
    { title: 'Borçlu Cariler', icon: AlertCircle, color: 'from-orange-500 to-red-600' },
    { title: 'Alacaklı Cariler', icon: AlertCircle, color: 'from-teal-500 to-green-600' },
    { title: 'İptal Edilen Rezervasyonlar', icon: FileText, color: 'from-red-500 to-rose-600' },
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <h1 className="text-3xl font-bold text-white">Raporlar</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report, idx) => {
          const Icon = report.icon;
          return (
            <div
              key={idx}
              className="card-hover bg-[#0f1419]/80 backdrop-blur-xl border border-[#14b8dc]/20 rounded-xl p-6 cursor-pointer"
              data-testid={`report-card-${idx}`}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center mb-4`}>
                <Icon size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">{report.title}</h3>
              <p className="text-sm text-gray-400 mt-2">Raporu görüntülemek için tıklayın</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;
