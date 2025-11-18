import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { ArrowRightLeft } from 'lucide-react';

const CurrencyConverter = () => {
  const [rates, setRates] = useState({ EUR: 35.0, USD: 34.0, TRY: 1.0 });
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [showConverter, setShowConverter] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000); // Her dakika güncelle (manuel güncellemeleri yakalamak için)
    
    // Sayfa focus olduğunda kurları yeniden yükle
    const handleFocus = () => {
      fetchRates();
    };
    
    // Manuel kur güncellemesi event'ini dinle
    const handleCurrencyRatesUpdated = (event) => {
      if (event.detail?.type === 'header') {
        fetchRates();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('currencyRatesUpdated', handleCurrencyRatesUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('currencyRatesUpdated', handleCurrencyRatesUpdated);
    };
  }, []);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowConverter(false);
      }
    };

    if (showConverter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConverter]);

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates/header`);
      // Backend'den gelen kurlar TRY bazlı: { EUR: 35.0, USD: 34.0, TRY: 1.0 }
      setRates(response.data.rates || { EUR: 35.0, USD: 34.0, TRY: 1.0 });
    } catch (error) {
      console.error('Döviz kurları alınamadı:', error);
    }
  };

  const convert = (amount, from) => {
    // Tüm dövizler TRY karşılığı olarak tutuluyor
    const amountInTry = amount * rates[from]; // from'dan TRY'ye çevir
    
    return {
      EUR: (amountInTry / rates.EUR).toFixed(2),  // TRY'den EUR'ye
      USD: (amountInTry / rates.USD).toFixed(2),  // TRY'den USD'ye
      TRY: amountInTry.toFixed(2)  // TRY'den TRY'ye (aynı)
    };
  };

  const converted = amount ? convert(parseFloat(amount), selectedCurrency) : { EUR: '0.00', USD: '0.00', TRY: '0.00' };

  return (
    <div className="relative z-[10001]" ref={dropdownRef}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowConverter(!showConverter)}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'rgba(0, 120, 255, 0.1)',
            border: '1px solid rgba(0, 120, 255, 0.3)'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(0, 120, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(0, 120, 255, 0.1)'}
          data-testid="currency-converter-toggle"
          title="Döviz Çevirici"
        >
          <ArrowRightLeft size={20} style={{ color: 'var(--accent)' }} />
        </button>
        {/* EUR ve USD'nin TRY karşılığı */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <div style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>1 EUR</span> = {rates.EUR.toFixed(2)} TRY
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>1 USD</span> = {rates.USD.toFixed(2)} TRY
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showConverter && (
        <div 
          className="absolute left-0 top-full mt-2 w-80 rounded-lg shadow-2xl p-4 z-[10002]"
          style={{
            background: 'var(--popup-bg)',
            border: '1px solid var(--border)'
          }}
          data-testid="currency-converter-panel"
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Döviz Çevirici</h3>
          
          {/* Quick Rates Display */}
          <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--divider)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Güncel Kurlar</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>1 EUR =</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rates.EUR.toFixed(4)} TRY</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>1 USD =</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rates.USD.toFixed(4)} TRY</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>1 EUR =</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(rates.EUR / rates.USD).toFixed(4)} USD</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Miktar</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Miktar girin"
                className="w-full px-3 py-2 rounded-lg focus:outline-none transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                data-testid="currency-amount-input"
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Para Birimi</label>
              <div className="flex gap-2">
                {['EUR', 'USD', 'TRY'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className="flex-1 px-3 py-2 rounded-lg font-medium transition-colors"
                    style={{
                      background: selectedCurrency === curr ? 'var(--accent)' : 'var(--chip-bg)',
                      color: selectedCurrency === curr ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCurrency !== curr) {
                        e.target.style.background = 'rgba(0, 120, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCurrency !== curr) {
                        e.target.style.background = 'var(--chip-bg)';
                      }
                    }}
                    data-testid={`currency-select-${curr.toLowerCase()}`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {amount && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Çevrilmiş Tutarlar</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-secondary)' }}>EUR</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }} data-testid="converted-eur">{converted.EUR}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-secondary)' }}>USD</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }} data-testid="converted-usd">{converted.USD}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-secondary)' }}>TRY</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }} data-testid="converted-try">{converted.TRY}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverter;