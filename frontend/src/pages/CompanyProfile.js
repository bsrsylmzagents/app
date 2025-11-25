import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, AlertCircle, Building2, Globe, Share2, CreditCard, Upload, X, Image as ImageIcon, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';

const CompanyProfile = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [logoPreview, setLogoPreview] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  // Form data - sadece değiştirilebilir alanlar
  const [formData, setFormData] = useState({
    website: '',
    social_media: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: ''
    },
    bank_info: {
      bank_name: '',
      account_name: '',
      iban: '',
      account_number: ''
    }
  });

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/company/profile`);
      setCompany(response.data);
      
      // Form data'yı doldur
      setFormData({
        website: response.data.website || '',
        social_media: response.data.social_media || {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        },
        bank_info: response.data.bank_info || {
          bank_name: '',
          account_name: '',
          iban: '',
          account_number: ''
        }
      });
      
      // Logo preview'ı ayarla
      if (response.data.logo) {
        setLogoPreview(response.data.logo);
      } else {
        setLogoPreview(null);
      }
    } catch (error) {
      console.error('Fetch company profile error:', error);
      toast.error('Firma bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API}/company/profile`, formData);
      toast.success('Firma bilgileri başarıyla güncellendi!');
      fetchCompanyProfile(); // Yeniden yükle
    } catch (error) {
      console.error('Update company profile error:', error);
      toast.error(error.response?.data?.detail || 'Firma bilgileri güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipini kontrol et
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Geçersiz dosya tipi. PNG, JPG, JPEG, GIF, SVG veya WEBP formatında olmalıdır.');
      return;
    }

    // Dosya boyutunu kontrol et (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu çok büyük. Maksimum 5MB olmalıdır.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/company/logo`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Logo başarıyla yüklendi!');
      setLogoPreview(response.data.logo);
      
      // Company bilgisini güncelle
      await fetchCompanyProfile();
      
      // localStorage'daki company bilgisini de güncelle
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      userInfo.company_logo = response.data.logo;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error(error.response?.data?.detail || 'Logo yüklenemedi');
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Input'u temizle
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Logoyu silmek istediğinize emin misiniz?')) return;

    try {
      await axios.delete(`${API}/company/logo`);
      toast.success('Logo başarıyla silindi!');
      setLogoPreview(null);
      
      // Company bilgisini güncelle
      await fetchCompanyProfile();
      
      // localStorage'daki company bilgisini de güncelle
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      userInfo.company_logo = null;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } catch (error) {
      console.error('Logo delete error:', error);
      toast.error(error.response?.data?.detail || 'Logo silinemedi');
    }
  };

  const copyToClipboard = async (text, linkType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkType);
      toast.success('Link panoya kopyalandı!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Link kopyalanamadı');
    }
  };

  const getFullUrl = (path) => {
    return `${window.location.origin}${path}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Yükleniyor...</div>;
  }

  if (!company) {
    return <div className="text-center py-8 text-red-400">Firma bilgileri bulunamadı</div>;
  }

  // Admin tarafından girilen alanlar (readonly)
  const readonlyFields = [
    { label: 'Firma Adı', value: company.company_name },
    { label: 'Firma Kodu', value: company.company_code },
    { label: 'Adres', value: company.address },
    { label: 'Vergi Dairesi', value: company.tax_office },
    { label: 'Vergi Numarası', value: company.tax_number },
    { label: 'Telefon', value: company.phone },
    { label: 'Email', value: company.email },
    { label: 'Paket Başlangıç', value: company.package_start_date ? new Date(company.package_start_date).toLocaleDateString('tr-TR') : '-' },
    { label: 'Paket Bitiş', value: company.package_end_date ? new Date(company.package_end_date).toLocaleDateString('tr-TR') : '-' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Firma Profili</h1>
      </div>

      <Alert className="bg-yellow-500/10 border-yellow-500/30">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-200">
          Admin tarafından girilen bilgileri değiştirmek için lütfen bizimle iletişime geçin.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-[#1a1f2e]">
          <TabsTrigger value="general" className="data-[state=active]:bg-[#14b8dc]/20">
            <Building2 size={16} className="mr-2" />
            Genel Bilgiler
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-[#14b8dc]/20">
            <Share2 size={16} className="mr-2" />
            Sosyal Medya
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-[#14b8dc]/20">
            <CreditCard size={16} className="mr-2" />
            Banka Bilgileri
          </TabsTrigger>
          <TabsTrigger value="website" className="data-[state=active]:bg-[#14b8dc]/20">
            <Globe size={16} className="mr-2" />
            Web Sitesi
          </TabsTrigger>
          <TabsTrigger value="links" className="data-[state=active]:bg-[#14b8dc]/20">
            <Link2 size={16} className="mr-2" />
            Portal & Bağlantılar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="bg-[#25272A] border-[#2D2F33]">
            <CardHeader>
              <CardTitle className="text-white">Genel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Logo Yükleme Bölümü */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Firma Logosu</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Company Logo" 
                          className="w-32 h-32 object-contain border border-[#2D2F33] rounded-lg bg-[#1a1f2e] p-2"
                        />
                        <button
                          onClick={handleDeleteLogo}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                          title="Logoyu Sil"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-[#2D2F33] rounded-lg bg-[#1a1f2e] flex items-center justify-center">
                        <ImageIcon size={32} className="text-[#A5A5A5]" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                        <label htmlFor="logo-upload" className="inline-block cursor-pointer">
                          <div className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <Upload size={16} />
                            {uploadingLogo ? 'Yükleniyor...' : logoPreview ? 'Logoyu Değiştir' : 'Logo Yükle'}
                          </div>
                        </label>
                        <p className="text-xs text-[#A5A5A5]">
                          PNG, JPG, JPEG, GIF, SVG veya WEBP formatında, maksimum 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#2D2F33] pt-4">
                  <h3 className="text-white font-semibold mb-4">Firma Bilgileri</h3>
                  <div className="space-y-4">
                    {readonlyFields.map((field, index) => (
                      <div key={index}>
                        <Label className="text-gray-400">{field.label}</Label>
                        <Input
                          value={field.value || '-'}
                          disabled
                          className="bg-[#1a1f2e]/50 border-[#14b8dc]/10 text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <Card className="bg-[#25272A] border-[#2D2F33]">
            <CardHeader>
              <CardTitle className="text-white">Sosyal Medya Profilleri</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="facebook" className="text-gray-300">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.social_media.facebook}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, facebook: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div>
                  <Label htmlFor="instagram" className="text-gray-300">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.social_media.instagram}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, instagram: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div>
                  <Label htmlFor="twitter" className="text-gray-300">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.social_media.twitter}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, twitter: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="https://twitter.com/..."
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin" className="text-gray-300">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={formData.social_media.linkedin}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, linkedin: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="https://linkedin.com/..."
                  />
                </div>

                <Button type="submit" disabled={saving} className="btn-primary">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          <Card className="bg-[#25272A] border-[#2D2F33]">
            <CardHeader>
              <CardTitle className="text-white">Banka Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="bank_name" className="text-gray-300">Banka Adı</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_info.bank_name}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info, bank_name: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="Banka adı"
                  />
                </div>

                <div>
                  <Label htmlFor="account_name" className="text-gray-300">Hesap Sahibi</Label>
                  <Input
                    id="account_name"
                    value={formData.bank_info.account_name}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info, account_name: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="Hesap sahibi adı"
                  />
                </div>

                <div>
                  <Label htmlFor="iban" className="text-gray-300">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.bank_info.iban}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info, iban: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                  />
                </div>

                <div>
                  <Label htmlFor="account_number" className="text-gray-300">Hesap Numarası</Label>
                  <Input
                    id="account_number"
                    value={formData.bank_info.account_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info, account_number: e.target.value }
                    })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="Hesap numarası"
                  />
                </div>

                <Button type="submit" disabled={saving} className="btn-primary">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="website" className="mt-6">
          <Card className="bg-[#25272A] border-[#2D2F33]">
            <CardHeader>
              <CardTitle className="text-white">Web Sitesi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="website" className="text-gray-300">Web Sitesi URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="https://www.example.com"
                  />
                </div>

                <Button type="submit" disabled={saving} className="btn-primary">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <Card className="bg-[#25272A] border-[#2D2F33]">
            <CardHeader>
              <CardTitle className="text-white">Portal & Bağlantılar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Firma Kodu */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Firma Kodu (Agency Slug)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={company.company_code || '-'}
                      disabled
                      className="bg-[#1a1f2e]/50 border-[#14b8dc]/10 text-gray-400 cursor-not-allowed font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(company.company_code, 'code')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                    >
                      {copiedLink === 'code' ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    Bu kod portal ve rezervasyon linklerinde kullanılır
                  </p>
                </div>

                {/* Portal Login Link */}
                <div>
                  <Label className="text-gray-300 mb-2 block flex items-center gap-2">
                    <Link2 size={16} />
                    B2B Paneli Giriş Linki
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={company.company_code ? getFullUrl(`/portal/${company.company_code}/login`) : '-'}
                      readOnly
                      className="bg-[#2D2F33] border-[#2D2F33] text-white font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getFullUrl(`/portal/${company.company_code}/login`), 'portal-login')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      {copiedLink === 'portal-login' ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/portal/${company.company_code}/login`, '_blank')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      <ExternalLink size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    Kurumsal müşterileriniz (B2B) bu link ile giriş yapabilir
                  </p>
                </div>

                {/* Portal Dashboard Link */}
                <div>
                  <Label className="text-gray-300 mb-2 block flex items-center gap-2">
                    <Link2 size={16} />
                    B2B Paneli Dashboard Linki
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={company.company_code ? getFullUrl(`/portal/${company.company_code}/dashboard`) : '-'}
                      readOnly
                      className="bg-[#2D2F33] border-[#2D2F33] text-white font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getFullUrl(`/portal/${company.company_code}/dashboard`), 'portal-dashboard')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      {copiedLink === 'portal-dashboard' ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/portal/${company.company_code}/dashboard`, '_blank')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      <ExternalLink size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    B2B müşterilerin giriş yaptıktan sonra yönlendirileceği sayfa
                  </p>
                </div>

                {/* Public Booking Link */}
                <div>
                  <Label className="text-gray-300 mb-2 block flex items-center gap-2">
                    <Link2 size={16} />
                    B2C Rezervasyon Linki
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={company.company_code ? getFullUrl(`/booking/${company.company_code}`) : '-'}
                      readOnly
                      className="bg-[#2D2F33] border-[#2D2F33] text-white font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getFullUrl(`/booking/${company.company_code}`), 'public-booking')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      {copiedLink === 'public-booking' ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/booking/${company.company_code}`, '_blank')}
                      className="border-[#2D2F33] hover:bg-[#2D2F33]"
                      disabled={!company.company_code}
                    >
                      <ExternalLink size={16} />
                    </Button>
                  </div>
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    Turistlerin (B2C) giriş yapmadan rezervasyon yapabileceği sayfa
                  </p>
                </div>

                {/* Info Alert */}
                <Alert className="bg-blue-500/10 border-blue-500/30">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-200">
                    Bu linkleri müşterilerinizle paylaşabilirsiniz. B2B Paneli linklerini sadece kurumsal müşterilerinize (B2B) verin.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyProfile;
