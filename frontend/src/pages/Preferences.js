import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Loader2, Calendar, 
  LayoutDashboard, Table, Volume2, VolumeX, 
  Sidebar, SidebarClose, Home, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatDate } from '../utils/dateFormatter';
import { useTheme } from '../contexts/ThemeContext';
import { Monitor, Contrast, Moon } from 'lucide-react';

const Preferences = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { contrast, setContrastLevel } = useTheme();
  
  // All preference states
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [tableDensity, setTableDensity] = useState('comfortable');
  const [startPage, setStartPage] = useState('/dashboard');
  const [currencyDisplay, setCurrencyDisplay] = useState('TRY');
  const [soundEffects, setSoundEffects] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Example date for preview
  const exampleDate = '2025-01-31';

  useEffect(() => {
    // Load user preferences
    const loadPreferences = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const prefs = user?.preferences || {};
          setDateFormat(prefs.dateFormat || 'DD/MM/YYYY');
          setTableDensity(prefs.tableDensity || 'comfortable');
          setStartPage(prefs.startPage || '/dashboard');
          setCurrencyDisplay(prefs.currencyDisplay || 'TRY');
          setSoundEffects(prefs.soundEffects !== undefined ? prefs.soundEffects : true);
          setSidebarCollapsed(prefs.sidebarCollapsed || false);
          
          // Set contrast level if available
          if (prefs.darkContrast && ['classic', 'soft', 'medium', 'high'].includes(prefs.darkContrast)) {
            setContrastLevel(prefs.darkContrast);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/users/me/preferences`, {
        dateFormat,
        darkContrast: contrast, // Save contrast level
        tableDensity,
        startPage,
        currencyDisplay,
        soundEffects,
        sidebarCollapsed
      });

      if (response.data && response.data.user) {
        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Tercihler başarıyla kaydedildi!');
        
        // Refresh the page to apply changes globally
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Tercihler kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: '31/01/2025 (DD/MM/YYYY)', example: '31/01/2025' },
    { value: 'DD.MM.YYYY', label: '31.01.2025 (DD.MM.YYYY)', example: '31.01.2025' },
    { value: 'MM/DD/YYYY', label: '01/31/2025 (MM/DD/YYYY) - US Style', example: '01/31/2025' },
    { value: 'YYYY-MM-DD', label: '2025-01-31 (YYYY-MM-DD) - ISO Style', example: '2025-01-31' },
  ];

  const startPageOptions = [
    { value: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: '/calendar', label: 'Takvim', icon: Calendar },
    { value: '/customers', label: 'Müşteriler', icon: Home },
    { value: '/reservations/new', label: 'Yeni Rezervasyon', icon: Home },
    { value: '/reservations', label: 'Rezervasyonlar', icon: Home },
  ];

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
            className="text-foreground hover:bg-elevated"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Tercihler</h1>
          <p className="text-muted-foreground">Kontrast seviyesi, tarih formatı ve daha fazlası</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Date Format Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-[#A5A5A5]" />
            <h2 className="text-xl font-semibold text-foreground">Tarih Formatı</h2>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateFormat" className="text-foreground">
              Tarih Formatı Seçin
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Tüm tablolar, grafikler ve tarih gösterimleri bu formata göre güncellenecektir.
            </p>
            
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger 
                id="dateFormat"
                className="w-full bg-[#1E1F22] border-[#2D2F33] text-white"
              >
                <SelectValue placeholder="Tarih formatı seçin" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                {dateFormatOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-foreground hover:bg-elevated focus:bg-elevated"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-input border border-border rounded-lg">
            <p className="text-sm text-[#A5A5A5] mb-2">Önizleme:</p>
            <p className="text-lg font-semibold text-white">
              {formatDate(exampleDate, dateFormat)}
            </p>
            <p className="text-xs text-[#A5A5A5] mt-1">
              Orijinal: {exampleDate}
            </p>
          </div>
        </div>

        {/* Table Density Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Table className="h-5 w-5 text-[#A5A5A5]" />
            <h2 className="text-xl font-semibold text-white">Tablo Yoğunluğu</h2>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white">Tablo Görünümü</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Tablolardaki satırlar arası boşluğu ayarlayın.
            </p>
            
            <RadioGroup value={tableDensity} onValueChange={setTableDensity}>
              <div className="flex items-center space-x-2 p-3 bg-input border border-border rounded-lg">
                <RadioGroupItem value="comfortable" id="comfortable" className="text-white" />
                <Label htmlFor="comfortable" className="text-foreground cursor-pointer flex-1">
                  Rahat (Comfortable) - Daha fazla boşluk
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-input border border-border rounded-lg">
                <RadioGroupItem value="compact" id="compact" className="text-white" />
                <Label htmlFor="compact" className="text-white cursor-pointer flex-1">
                  Kompakt (Compact) - Daha az boşluk, daha fazla içerik
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Start Page Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-5 w-5 text-[#A5A5A5]" />
            <h2 className="text-xl font-semibold text-white">Başlangıç Sayfası</h2>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="startPage" className="text-white">
              Giriş Yaptıktan Sonra Açılacak Sayfa
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Giriş yaptıktan sonra hangi sayfaya yönlendirileceğinizi seçin.
            </p>
            
            <Select value={startPage} onValueChange={setStartPage}>
              <SelectTrigger 
                id="startPage"
                className="w-full bg-[#1E1F22] border-[#2D2F33] text-white"
              >
                <SelectValue placeholder="Başlangıç sayfası seçin" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                {startPageOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-foreground hover:bg-elevated focus:bg-elevated"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Currency Display Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-[#A5A5A5]" />
            <h2 className="text-xl font-semibold text-white">Varsayılan Para Birimi</h2>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currencyDisplay" className="text-white">
              Varsayılan Para Birimi
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Varsayılan olarak gösterilecek para birimini seçin.
            </p>
            
            <Select value={currencyDisplay} onValueChange={setCurrencyDisplay}>
              <SelectTrigger 
                id="currencyDisplay"
                className="w-full bg-[#1E1F22] border-[#2D2F33] text-white"
              >
                <SelectValue placeholder="Para birimi seçin" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                <SelectItem value="TRY" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  TRY - Türk Lirası
                </SelectItem>
                <SelectItem value="USD" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  USD - US Dollar
                </SelectItem>
                <SelectItem value="EUR" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  EUR - Euro
                </SelectItem>
                <SelectItem value="GBP" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  GBP - British Pound
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sound Effects Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {soundEffects ? (
              <Volume2 className="h-5 w-5 text-[#A5A5A5]" />
            ) : (
              <VolumeX className="h-5 w-5 text-[#A5A5A5]" />
            )}
            <h2 className="text-xl font-semibold text-white">Ses Efektleri</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="soundEffects" className="text-white">
                Ses Efektlerini Etkinleştir
              </Label>
              <p className="text-sm text-[#A5A5A5]">
                Bildirimler ve işlemler için ses efektlerini açın/kapatın.
              </p>
            </div>
            <Switch
              id="soundEffects"
              checked={soundEffects}
              onCheckedChange={setSoundEffects}
            />
          </div>
        </div>

        {/* Dark Contrast Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Contrast className="h-5 w-5 text-[#A5A5A5]" />
            <h2 className="text-xl font-semibold text-foreground">Karanlık Mod Yoğunluğu</h2>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="darkContrast" className="text-foreground">
              Kontrast Seviyesi
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Uygulamanın karanlık mod yoğunluğunu ayarlayın. Değişiklik anında uygulanır.
            </p>
            
            <Select value={contrast} onValueChange={(value) => {
              setContrastLevel(value);
              // Also update in preferences immediately
              try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                  const user = JSON.parse(userStr);
                  const updatedUser = {
                    ...user,
                    preferences: {
                      ...user.preferences,
                      darkContrast: value
                    }
                  };
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                }
              } catch (error) {
                console.error('Error updating contrast:', error);
              }
            }}>
              <SelectTrigger 
                id="darkContrast"
                className="w-full bg-input border-border text-foreground"
              >
                <SelectValue placeholder="Kontrast seviyesi seçin" />
              </SelectTrigger>
              <SelectContent className="bg-input border-border">
                <SelectItem value="classic" className="text-foreground hover:bg-elevated focus:bg-elevated">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Klasik (Classic)</div>
                      <div className="text-xs text-muted-foreground">Orijinal Slate / Mavi Tonlu Karanlık</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="soft" className="text-foreground hover:bg-elevated focus:bg-elevated">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Yumuşak (Soft)</div>
                      <div className="text-xs text-muted-foreground">Göz Yormayan Mavi Tonlu Gri</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  <div className="flex items-center gap-2">
                    <Contrast className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Dengeli (Medium)</div>
                      <div className="text-xs text-[#A5A5A5]">Nötr Koyu Gri</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="high" className="text-white hover:bg-[#2D2F33] focus:bg-[#2D2F33]">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Simsiyah (OLED)</div>
                      <div className="text-xs text-[#A5A5A5]">Tam Siyah - Yüksek Kontrast</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sidebar Default Section */}
        <div className="bg-card backdrop-blur-xl border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {sidebarCollapsed ? (
              <SidebarClose className="h-5 w-5 text-[#A5A5A5]" />
            ) : (
              <Sidebar className="h-5 w-5 text-[#A5A5A5]" />
            )}
            <h2 className="text-xl font-semibold text-white">Yan Menü Varsayılanı</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sidebarCollapsed" className="text-white">
                Yan Menüyü Varsayılan Olarak Daralt
              </Label>
              <p className="text-sm text-[#A5A5A5]">
                Yan menünün varsayılan olarak daraltılmış durumda açılmasını sağlar.
              </p>
            </div>
            <Switch
              id="sidebarCollapsed"
              checked={sidebarCollapsed}
              onCheckedChange={setSidebarCollapsed}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="border-border text-foreground hover:bg-elevated"
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
