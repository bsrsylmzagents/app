import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../../App';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign } from 'lucide-react';

const CariTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({ balance_eur: 0, balance_usd: 0, balance_try: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('cari_token');
    if (!token) {
      navigate('/cari/login', { replace: true });
      return;
    }

    fetchTransactions();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('cari_token');
      const response = await axios.get(`${API}/cari/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
      setBalances({
        balance_eur: response.data.balance_eur || 0,
        balance_usd: response.data.balance_usd || 0,
        balance_try: response.data.balance_try || 0
      });
    } catch (error) {
      console.error('Fetch transactions error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('cari_token');
        localStorage.removeItem('cari');
        navigate('/cari/login', { replace: true });
      } else {
        toast.error('Ekstre yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'debit':
        return 'Borç';
      case 'credit':
        return 'Alacak';
      case 'payment':
        return 'Ödeme';
      case 'refund':
        return 'İade';
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'debit':
        return 'text-red-600';
      case 'credit':
        return 'text-green-600';
      case 'payment':
        return 'text-blue-600';
      case 'refund':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14b8dc] mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/cari/dashboard"
            className="inline-flex items-center gap-2 text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={18} />
            Geri Dön
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ekstre
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            İşlem geçmişiniz (salt okunur)
          </p>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>EUR Bakiye</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {balances.balance_eur.toFixed(2)} EUR
                </p>
              </div>
              <DollarSign size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>USD Bakiye</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {balances.balance_usd.toFixed(2)} USD
                </p>
              </div>
              <DollarSign size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="rounded-lg p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>TRY Bakiye</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {balances.balance_try.toFixed(2)} TRY
                </p>
              </div>
              <DollarSign size={32} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              İşlem Geçmişi
            </h2>
          </div>
          <div className="p-6">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>Henüz işlem yok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Tarih
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Tip
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Açıklama
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b hover:bg-opacity-50 transition-colors"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {transaction.date} {transaction.time || ''}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                            {getTransactionTypeText(transaction.transaction_type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {transaction.amount.toFixed(2)} {transaction.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CariTransactions;


