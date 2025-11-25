import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, DollarSign, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useConfirmDialog from '../../hooks/useConfirmDialog';

const SettingsCurrencyRates = () => {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();
  
  // Sistem kurları state'leri
  const [systemRates, setSystemRates] = useState({ EUR: 0, USD: 0, TRY: 1.0 });
  const [systemLocked, setSystemLocked] = useState(false);
  const [systemLastUpdated, setSystemLastUpdated] = useState(null);
  const [systemSource, setSystemSource] = useState('manual');
  
  // Header çevirici kurları state'leri
  const [headerRates, setHeaderRates] = useState({ EUR: 0, USD: 0, TRY: 1.0 });
  const [headerLocked, setHeaderLocked] = useState(false);
  const [headerLastUpdated, setHeaderLastUpdated] = useState(null);
  const [headerSource, setHeaderSource] = useState('manual');
  
  // Ortak state'ler
  const [tcmbRates, setTcmbRates] = useState({ EUR: 0, USD: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('system');

  useEffect(() => {
    fetchSystemRates();
    fetchHeaderRates();
  }, []);

  const fetchSystemRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates`);
      const data = response.data;
      setSystemRates(data.rates || { EUR: 35.0, USD: 34.0, TRY: 1.0 });
      setSystemLocked(data.locked || false);
      setSystemLastUpdated(data.last_updated);
      setSystemSource(data.source || 'manual');
    } catch (error) {
      console.error('Sistem kurları getirilemedi:', error);
      toast.error('Sistem kurları getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchHeaderRates = async () => {
    try {
      const response = await axios.get(`${API}/currency/rates/header`);
      const data = response.data;
      setHeaderRates(data.rates || { EUR: 35.0, USD: 34.0, TRY: 1.0 });
      setHeaderLocked(data.locked || false);
      setHeaderLastUpdated(data.last_updated);
      setHeaderSource(data.source || 'manual');
    } catch (error) {
      console.error('Header kurları getirilemedi:', error);
      toast.error('Header kurları getirilemedi');
    }
  };

  const fetchTCMBRates = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API}/currency/rates/tcmb`);
      const data = response.data;
      if (data.success && data.rates) {
        setTcmbRates({
          EUR: data.rates.EUR || 0,
          USD: data.rates.USD || 0
        });
        toast.success('Merkez Bankası kurları getirildi');
      } else {
        toast.error('Merkez Bankası kurları alınamadı');
      }
    } catch (error) {
      console.error('TCMB kurları getirilemedi:', error);
      toast.error('Merkez Bankası kurları alınamadı');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSystemLock = async () => {
    const newLocked = !systemLocked;
    try {
      await axios.put(`${API}/currency/rates`, {
        rates: systemRates,
        locked: newLocked,
        source: systemSource
      });
      setSystemLocked(newLocked);
      toast.success(newLocked ? 'Sistem kurları sabitlendi' : 'Sabitleme kaldırıldı');
      fetchSystemRates();
    } catch (error) {
      console.error('Sabitleme hatası:', error);
      toast.error('Sabitleme işlemi başarısız');
    }
  };

  const handleHeaderLock = async () => {
    const newLocked = !headerLocked;
    try {
      await axios.put(`${API}/currency/rates/header`, {
        rates: headerRates,
        locked: newLocked,
        source: headerSource
      });
      setHeaderLocked(newLocked);
      toast.success(newLocked ? 'Header kurları sabitlendi' : 'Sabitleme kaldırıldı');
      fetchHeaderRates();
    } catch (error) {
      console.error('Sabitleme hatası:', error);
      toast.error('Sabitleme işlemi başarısız');
    }
  };

  const handleSystemRefresh = async () => {
    if (tcmbRates.EUR === 0 || tcmbRates.USD === 0) {
      toast.error('Önce Merkez Bankası kurlarını getirin');
      return;
    }

    const confirmed = await confirm({
      title: "Sistem Kurlarını Yenile",
      message: (
        <>
          <p className="mb-2">Sistem kurları Merkez Bankası kurları ile eşitlenecektir.</p>
          <div className="bg-[#2D2F33] rounded-lg p-3 mt-3">
            <p className="text-sm text-[#A5A5A5] mb-2">Yeni Kurlar:</p>
            <div className="space-y-1">
              <p className="text-sm text-white">EUR: {tcmbRates.EUR?.toFixed(4)} TL</p>
              <p className="text-sm text-white">USD: {tcmbRates.USD?.toFixed(4)} TL</p>
            </div>
          </div>
          <p className="text-xs text-orange-400 mt-3">
            ⚠️ Bu işlem rezervasyonlar, gelir/gider ve diğer sistem işlemlerinde kullanılan kurları etkileyecektir.
          </p>
        </>
      ),
      confirmText: "Güncelle",
      cancelText: "Vazgeç",
      variant: "warning"
    });

    if (!confirmed) return;

    try {
      await axios.post(`${API}/currency/rates/refresh`);
      toast.success('Sistem kurları Merkez Bankası kurları ile güncellendi. Tüm sistemde geçerli olacak.');
      fetchSystemRates();
      // Diğer componentlerin kurları yeniden yüklemesi için bir event dispatch et
      window.dispatchEvent(new CustomEvent('currencyRatesUpdated', { detail: { type: 'system' } }));
    } catch (error) {
      console.error('Kur yenileme hatası:', error);
      toast.error('Kur yenileme başarısız');
    }
  };

  const handleHeaderRefresh = async () => {
    if (tcmbRates.EUR === 0 || tcmbRates.USD === 0) {
      toast.error('Önce Merkez Bankası kurlarını getirin');
      return;
    }

    const confirmed = await confirm({
      title: "Döviz Çevirici Kurlarını Yenile",
      message: (
        <>
          <p className="mb-2">Döviz çevirici kurları Merkez Bankası kurları ile eşitlenecektir.</p>
          <div className="bg-[#2D2F33] rounded-lg p-3 mt-3">
            <p className="text-sm text-[#A5A5A5] mb-2">Yeni Kurlar:</p>
            <div className="space-y-1">
              <p className="text-sm text-white">EUR: {tcmbRates.EUR?.toFixed(4)} TL</p>
              <p className="text-sm text-white">USD: {tcmbRates.USD?.toFixed(4)} TL</p>
            </div>
          </div>
          <p className="text-xs text-orange-400 mt-3">
            ⚠️ Bu işlem sadece döviz çeviricisini etkileyecektir.
          </p>
        </>
      ),
      confirmText: "Güncelle",
      cancelText: "Vazgeç",
      variant: "warning"
    });

    if (!confirmed) return;

    try {
      await axios.post(`${API}/currency/rates/header/refresh`);
      toast.success('Döviz çevirici kurları Merkez Bankası kurları ile güncellendi');
      fetchHeaderRates();
      // Diğer componentlerin kurları yeniden yüklemesi için bir event dispatch et
      window.dispatchEvent(new CustomEvent('currencyRatesUpdated', { detail: { type: 'header' } }));
    } catch (error) {
      console.error('Kur yenileme hatası:', error);
      toast.error('Kur yenileme başarısız');
    }
  };

  const renderCurrencyCard = (currency, rate, rates, setRates, locked, isSystem) => {
    const currencyName = currency === 'EUR' ? 'Euro' : currency === 'USD' ? 'ABD Doları' : 'Türk Lirası';
    
    return (
      <div key={currency} className="bg-[#1E1E1E] border border-[#2D2F33] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-[#A5A5A5]">{currency} ({currencyName})</p>
              {locked && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Sabitlendi</span>
              )}
            </div>
            {currency === 'TRY' ? (
              <>
                <p className="text-2xl font-bold text-white">1.00 TL</p>
                <p className="text-xs text-[#A5A5A5] mt-1">Ana para birimi</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rate}
                    onChange={(e) => {
                      if (!locked) {
                        setRates({ ...rates, [currency]: parseFloat(e.target.value) || 0 });
                      }
                    }}
                    disabled={locked}
                    className="w-32 bg-[#25272A] border-[#2D2F33] text-white"
                    step="0.0001"
                    min="0"
                  />
                  <span className="text-sm text-[#A5A5A5]">TL</span>
                </div>
                <p className="text-xs text-[#A5A5A5] mt-1">1 {currency} = {rate.toFixed(4)} TL</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#3EA6FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-currency-rates-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="text-[#A5A5A5] hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Döviz Kur Yönetimi</h1>
          <p className="text-[#A5A5A5]">Sistem kurları ve header çevirici kurları yönetimi</p>
        </div>
      </div>

      {/* Ana Para Birimi Bilgisi */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-4">
        <div className="flex items-center gap-2 text-[#A5A5A5]">
          <DollarSign size={16} />
          <span className="text-sm">Ana para birimi: <span className="text-white font-semibold">TRY (Türk Lirası)</span></span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#1E1E1E] border border-[#2D2F33]">
          <TabsTrigger value="system" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            Sistem Kurları
          </TabsTrigger>
          <TabsTrigger value="header" className="data-[state=active]:bg-[#3EA6FF] data-[state=active]:text-white">
            Döviz Çevirici
          </TabsTrigger>
        </TabsList>

        {/* Sistem Kurları Tab */}
        <TabsContent value="system" className="space-y-6 mt-6">
          {/* Sistem Kurları Bilgisi */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5]">
              Sistem kurları rezervasyonlar, gelir/gider ve diğer sistem işlemlerinde kullanılır.
            </p>
            {systemLastUpdated && (
              <p className="text-xs text-[#A5A5A5] mt-2">
                Son güncelleme: {systemLastUpdated} • Kaynak: {systemSource === 'TCMB' ? 'Merkez Bankası' : 'Manuel'}
              </p>
            )}
          </div>

          {/* Sistem Kurları */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Sistem Döviz Kurları</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#A5A5A5]">Kurları Sabitle</span>
                <Switch
                  checked={systemLocked}
                  onCheckedChange={handleSystemLock}
                />
              </div>
            </div>

            <div className="space-y-4">
              {renderCurrencyCard('TRY', 1.0, systemRates, setSystemRates, systemLocked, true)}
              {renderCurrencyCard('EUR', systemRates.EUR, systemRates, setSystemRates, systemLocked, true)}
              {renderCurrencyCard('USD', systemRates.USD, systemRates, setSystemRates, systemLocked, true)}
            </div>

            {!systemLocked && (
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    try {
                      await axios.put(`${API}/currency/rates`, {
                        rates: systemRates,
                        source: 'manual'
                      });
                      toast.success('Sistem kurları güncellendi. Tüm sistemde geçerli olacak.');
                      fetchSystemRates();
                      // Diğer componentlerin kurları yeniden yüklemesi için bir event dispatch et
                      window.dispatchEvent(new CustomEvent('currencyRatesUpdated', { detail: { type: 'system' } }));
                    } catch (error) {
                      toast.error('Kur güncelleme başarısız');
                    }
                  }}
                  className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                >
                  <Save size={16} className="mr-2" />
                  Değişiklikleri Kaydet
                </Button>
              </div>
            )}
          </div>

          {/* TCMB Önizleme - Sistem */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Merkez Bankası Kurları</h2>
            
            <div className="space-y-4 mb-6">
              <Button
                onClick={fetchTCMBRates}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {refreshing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} className="mr-2" />
                    Merkez Bankası Kurlarını Getir
                  </>
                )}
              </Button>

              {(tcmbRates.EUR > 0 || tcmbRates.USD > 0) && (
                <div className="bg-[#1E1E1E] border border-[#2D2F33] rounded-lg p-4">
                  <p className="text-sm text-[#A5A5A5] mb-3">TCMB Kurları (Önizleme):</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">EUR:</span>
                      <span className="text-sm font-semibold text-white">{tcmbRates.EUR.toFixed(4)} TL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">USD:</span>
                      <span className="text-sm font-semibold text-white">{tcmbRates.USD.toFixed(4)} TL</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleSystemRefresh}
                    className="w-full mt-4 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Sistem Kurlarını Yenile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Header Çevirici Tab */}
        <TabsContent value="header" className="space-y-6 mt-6">
          {/* Header Kurları Bilgisi */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-4">
            <p className="text-sm text-[#A5A5A5]">
              Döviz çevirici kurları sadece header'daki döviz çevirici aracında kullanılır.
            </p>
            {headerLastUpdated && (
              <p className="text-xs text-[#A5A5A5] mt-2">
                Son güncelleme: {headerLastUpdated} • Kaynak: {headerSource === 'TCMB' ? 'Merkez Bankası' : 'Manuel'}
              </p>
            )}
          </div>

          {/* Header Kurları */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Döviz Çevirici Kurları</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#A5A5A5]">Kurları Sabitle</span>
                <Switch
                  checked={headerLocked}
                  onCheckedChange={handleHeaderLock}
                />
              </div>
            </div>

            <div className="space-y-4">
              {renderCurrencyCard('TRY', 1.0, headerRates, setHeaderRates, headerLocked, false)}
              {renderCurrencyCard('EUR', headerRates.EUR, headerRates, setHeaderRates, headerLocked, false)}
              {renderCurrencyCard('USD', headerRates.USD, headerRates, setHeaderRates, headerLocked, false)}
            </div>

            {!headerLocked && (
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    try {
                      await axios.put(`${API}/currency/rates/header`, {
                        rates: headerRates,
                        source: 'manual'
                      });
                      toast.success('Döviz çevirici kurları güncellendi');
                      fetchHeaderRates();
                      // Diğer componentlerin kurları yeniden yüklemesi için bir event dispatch et
                      window.dispatchEvent(new CustomEvent('currencyRatesUpdated', { detail: { type: 'header' } }));
                    } catch (error) {
                      toast.error('Kur güncelleme başarısız');
                    }
                  }}
                  className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                >
                  <Save size={16} className="mr-2" />
                  Değişiklikleri Kaydet
                </Button>
              </div>
            )}
          </div>

          {/* TCMB Önizleme - Header */}
          <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Merkez Bankası Kurları</h2>
            
            <div className="space-y-4 mb-6">
              <Button
                onClick={fetchTCMBRates}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {refreshing ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} className="mr-2" />
                    Merkez Bankası Kurlarını Getir
                  </>
                )}
              </Button>

              {(tcmbRates.EUR > 0 || tcmbRates.USD > 0) && (
                <div className="bg-[#1E1E1E] border border-[#2D2F33] rounded-lg p-4">
                  <p className="text-sm text-[#A5A5A5] mb-3">TCMB Kurları (Önizleme):</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">EUR:</span>
                      <span className="text-sm font-semibold text-white">{tcmbRates.EUR.toFixed(4)} TL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">USD:</span>
                      <span className="text-sm font-semibold text-white">{tcmbRates.USD.toFixed(4)} TL</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleHeaderRefresh}
                    className="w-full mt-4 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Döviz Çevirici Kurlarını Yenile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {dialog}
    </div>
  );
};

export default SettingsCurrencyRates;