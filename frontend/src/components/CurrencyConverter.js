import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ArrowRightLeft } from 'lucide-react';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({ EUR: 1.0, USD: 1.1, TRY: 35.0 });
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 3600000); // Her saat güncelle
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates`);
      setRates(response.data.rates);
    } catch (error) {
      console.error('Döviz kurları alınamadı:', error);
    }
  };

  const convert = (amount, from) => {
    const amountInEur = amount / rates[from];
    return {
      EUR: (amountInEur * rates.EUR).toFixed(2),
      USD: (amountInEur * rates.USD).toFixed(2),
      TRY: (amountInEur * rates.TRY).toFixed(2),
    };
  };

  const converted = amount ? convert(parseFloat(amount), selectedCurrency) : { EUR: '0.00', USD: '0.00', TRY: '0.00' };

  return (
    <div className="relative">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowConverter(!showConverter)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14b8dc]/10 border border-[#14b8dc]/30 hover:bg-[#14b8dc]/20 transition-colors"
          data-testid="currency-converter-toggle"
        >
          <ArrowRightLeft size={18} className="text-[#14b8dc]" />
          <span className="text-sm text-white">Döviz Çevirici</span>
        </button>
        
        {/* Quick Rates Display */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div className="text-gray-400">1 EUR =</div>
          <div className="text-[#14b8dc]">{rates.USD.toFixed(4)} USD</div>
          <div className="text-[#14b8dc]">{rates.TRY.toFixed(2)} TRY</div>
        </div>
      </div>

      {showConverter && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f1419] border border-[#14b8dc]/30 rounded-lg shadow-xl p-4 z-50" data-testid="currency-converter-panel">
          <h3 className="text-lg font-semibold text-white mb-4">Döviz Çevirici</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Miktar</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Miktar girin"
                className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#14b8dc]/30 rounded-lg text-white focus:outline-none focus:border-[#14b8dc]"
                data-testid="currency-amount-input"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Para Birimi</label>
              <div className="flex gap-2">
                {['EUR', 'USD', 'TRY'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedCurrency === curr
                        ? 'bg-[#14b8dc] text-white'
                        : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#14b8dc]/20'
                    }`}
                    data-testid={`currency-select-${curr.toLowerCase()}`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#14b8dc]/20">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">EUR</span>
                  <span className="text-white font-semibold" data-testid="converted-eur">{converted.EUR}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">USD</span>
                  <span className="text-white font-semibold" data-testid="converted-usd">{converted.USD}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">TRY</span>
                  <span className="text-white font-semibold" data-testid="converted-try">{converted.TRY}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverter;
