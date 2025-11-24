import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Shield, Smartphone, CheckCircle, XCircle, Download, Copy, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Security = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorStatus, setTwoFactorStatus] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [showRecoveryCodesInput, setShowRecoveryCodesInput] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  
  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data.user);
      setTwoFactorStatus(response.data.user?.is_two_factor_enabled || false);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenemedi:', error);
      toast.error('Kullanıcı bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate2FA = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/2fa/generate`);
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
      toast.success('2FA secret oluşturuldu. Lütfen QR kodu tarayın ve doğrulama kodunu girin.');
    } catch (error) {
      console.error('2FA secret oluşturulamadı:', error);
      const errorMessage = error.response?.data?.detail || '2FA secret oluşturulamadı';
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error('2FA secret oluşturulamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu girin');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/2fa/verify`, {
        code: verificationCode
      });
      
      setRecoveryCodes(response.data.recovery_codes);
      setShowRecoveryCodes(true);
      setTwoFactorStatus(true);
      setQrCode(null);
      setSecret(null);
      setVerificationCode('');
      toast.success('2FA başarıyla etkinleştirildi!');
      await fetchUserInfo();
    } catch (error) {
      console.error('2FA doğrulama hatası:', error);
      const errorMessage = error.response?.data?.detail || 'Doğrulama kodu geçersiz';
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error('Doğrulama kodu geçersiz');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Lütfen şifrenizi girin');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/auth/2fa/disable`, {
        password: disablePassword
      });
      
      setTwoFactorStatus(false);
      setDisablePassword('');
      setShowDisablePassword(false);
      setRecoveryCodes([]);
      setShowRecoveryCodes(false);
      toast.success('2FA başarıyla devre dışı bırakıldı');
      await fetchUserInfo();
    } catch (error) {
      console.error('2FA devre dışı bırakma hatası:', error);
      const errorMessage = error.response?.data?.detail || '2FA devre dışı bırakılamadı';
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error('Şifre hatalı veya işlem başarısız');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Kurtarma kodları kopyalandı');
  };

  const downloadRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Kurtarma kodları indirildi');
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordFormData.old_password || !passwordFormData.new_password || !passwordFormData.confirm_password) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (passwordFormData.new_password !== passwordFormData.confirm_password) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordFormData.new_password.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    // If 2FA is enabled, show 2FA dialog first
    if (twoFactorStatus) {
      setShow2FADialog(true);
      return;
    }

    // If 2FA is not enabled, proceed with password change
    await submitPasswordChange();
  };

  const submitPasswordChange = async () => {
    try {
      setLoading(true);
      const payload = {
        old_password: passwordFormData.old_password,
        new_password: passwordFormData.new_password
      };

      // Add 2FA code if provided
      if (twoFactorCode) {
        payload.two_factor_code = twoFactorCode;
      }

      const url = `${API}/auth/change-password`;
      console.log('Şifre değiştirme isteği:', url, payload);
      
      const response = await axios.put(url, payload);
      console.log('Şifre değiştirme yanıtı:', response);
      
      toast.success('Şifre başarıyla değiştirildi');
      setShowChangePassword(false);
      setPasswordFormData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
      setTwoFactorCode('');
      setShow2FADialog(false);
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      console.error('Hata detayları:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      let errorMessage = 'Şifre değiştirilemedi';
      
      if (error.response) {
        // 404 Not Found hatası
        if (error.response.status === 404) {
          errorMessage = 'Endpoint bulunamadı. Lütfen backend servisinin çalıştığından emin olun.';
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.';
      }
      
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error('Şifre değiştirilemedi');
      }
      
      // If 2FA code is required, show dialog
      if (error.response?.status === 400 && (errorMessage.includes('2FA code') || errorMessage.includes('2FA'))) {
        setShow2FADialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu girin');
      return;
    }

    await submitPasswordChange();
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Güvenlik Ayarları</h1>
          <p className="text-gray-400 mt-2">Hesap güvenliğinizi yönetin</p>
        </div>
      </div>

      {/* Change Password Section */}
      <Card className="bg-[#1a1f2e] border-[#2D2F33]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-[#3EA6FF]" />
            <div>
              <CardTitle className="text-white">Şifre Değiştir</CardTitle>
              <CardDescription className="text-gray-400">
                Hesap şifrenizi güncelleyin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!showChangePassword ? (
            <Button
              onClick={() => setShowChangePassword(true)}
              className="w-full bg-[#3EA6FF] hover:bg-[#3EA6FF]/80 text-white"
            >
              <Lock className="h-4 w-4 mr-2" />
              Şifre Değiştir
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Mevcut Şifre</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.old ? "text" : "password"}
                    value={passwordFormData.old_password}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, old_password: e.target.value })}
                    placeholder="Mevcut şifrenizi girin"
                    className="bg-[#1a1f2e] border-[#2D2F33] text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Yeni Şifre</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordFormData.new_password}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, new_password: e.target.value })}
                    placeholder="Yeni şifrenizi girin (min 6 karakter)"
                    className="bg-[#1a1f2e] border-[#2D2F33] text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Yeni Şifre Tekrar</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordFormData.confirm_password}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, confirm_password: e.target.value })}
                    placeholder="Yeni şifrenizi tekrar girin"
                    className="bg-[#1a1f2e] border-[#2D2F33] text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 bg-[#3EA6FF] hover:bg-[#3EA6FF]/80 text-white"
                >
                  Şifreyi Değiştir
                </Button>
                <Button
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordFormData({
                      old_password: '',
                      new_password: '',
                      confirm_password: ''
                    });
                    setTwoFactorCode('');
                  }}
                  variant="outline"
                  className="border-[#2D2F33] text-gray-400 hover:text-white"
                >
                  İptal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card className="bg-[#1a1f2e] border-[#2D2F33]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#3EA6FF]" />
            <div>
              <CardTitle className="text-white">İki Faktörlü Kimlik Doğrulama (2FA)</CardTitle>
              <CardDescription className="text-gray-400">
                Hesabınızı ekstra bir güvenlik katmanı ile koruyun
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-[#25272A] border border-[#2D2F33]">
            <div className="flex items-center gap-3">
              {twoFactorStatus ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">2FA Etkin</p>
                    <p className="text-sm text-gray-400">Hesabınız iki faktörlü kimlik doğrulama ile korunuyor</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">2FA Devre Dışı</p>
                    <p className="text-sm text-gray-400">Hesabınızı daha güvenli hale getirin</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enable 2FA */}
          {!twoFactorStatus && (
            <div className="space-y-4">
              {!qrCode ? (
                <Button
                  onClick={handleGenerate2FA}
                  disabled={loading}
                  className="w-full bg-[#3EA6FF] hover:bg-[#3EA6FF]/80 text-white"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  2FA'yı Etkinleştir
                </Button>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-blue-500/10 border-blue-500/30">
                    <AlertDescription className="text-blue-200">
                      <strong>Adım 1:</strong> QR kodu Google Authenticator veya benzeri bir uygulamayla tarayın
                    </AlertDescription>
                  </Alert>

                  {/* QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                  </div>

                  {/* Manual Entry */}
                  {secret && (
                    <div className="p-4 bg-[#25272A] rounded-lg border border-[#2D2F33]">
                      <p className="text-sm text-gray-400 mb-2">QR kod tarayamıyorsanız, bu kodu manuel olarak girin:</p>
                      <code className="text-white font-mono text-sm break-all">{secret}</code>
                    </div>
                  )}

                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription className="text-yellow-200">
                      <strong>Adım 2:</strong> Uygulamadan aldığınız 6 haneli kodu girin
                    </AlertDescription>
                  </Alert>

                  {/* Verification Code Input */}
                  <div className="space-y-2">
                    <Label className="text-white">Doğrulama Kodu</Label>
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="bg-[#25272A] border-[#2D2F33] text-white text-center text-2xl tracking-widest"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerify2FA}
                      disabled={loading || verificationCode.length !== 6}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Doğrula ve Etkinleştir
                    </Button>
                    <Button
                      onClick={() => {
                        setQrCode(null);
                        setSecret(null);
                        setVerificationCode('');
                      }}
                      variant="outline"
                      className="border-[#2D2F33] text-gray-400 hover:text-white"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disable 2FA */}
          {twoFactorStatus && (
            <div className="space-y-4">
              {!showDisablePassword ? (
                <Button
                  onClick={() => setShowDisablePassword(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  2FA'yı Devre Dışı Bırak
                </Button>
              ) : (
                <div className="space-y-4 p-4 bg-[#25272A] rounded-lg border border-red-500/30">
                  <Alert className="bg-red-500/10 border-red-500/30">
                    <AlertDescription className="text-red-200">
                      <strong>Uyarı:</strong> 2FA'yı devre dışı bırakmak hesabınızı daha az güvenli hale getirir.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label className="text-white">Şifrenizi Girin (Onay için)</Label>
                    <div className="relative">
                      <Input
                        type={showDisablePassword ? "password" : "text"}
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Şifreniz"
                        className="bg-[#1a1f2e] border-[#2D2F33] text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDisablePassword(!showDisablePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showDisablePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleDisable2FA}
                      disabled={loading || !disablePassword}
                      variant="destructive"
                      className="flex-1"
                    >
                      Devre Dışı Bırak
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDisablePassword(false);
                        setDisablePassword('');
                      }}
                      variant="outline"
                      className="border-[#2D2F33] text-gray-400 hover:text-white"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              )}

              {/* Recovery Codes */}
              {showRecoveryCodes && recoveryCodes.length > 0 && (
                <div className="space-y-4 p-4 bg-[#25272A] rounded-lg border border-yellow-500/30">
                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertDescription className="text-yellow-200">
                      <strong>Önemli:</strong> Bu kurtarma kodlarını güvenli bir yerde saklayın. 
                      Telefonunuzu kaybederseniz bu kodlarla giriş yapabilirsiniz. 
                      Bu kodlar sadece bir kez gösterilecektir!
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-2 p-4 bg-[#1a1f2e] rounded-lg">
                    {recoveryCodes.map((code, index) => (
                      <code key={index} className="text-white font-mono text-sm p-2 bg-[#25272A] rounded">
                        {code}
                      </code>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={copyRecoveryCodes}
                      variant="outline"
                      className="flex-1 border-[#2D2F33] text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Kopyala
                    </Button>
                    <Button
                      onClick={downloadRecoveryCodes}
                      variant="outline"
                      className="flex-1 border-[#2D2F33] text-gray-400 hover:text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                    <Button
                      onClick={() => setShowRecoveryCodes(false)}
                      variant="outline"
                      className="border-[#2D2F33] text-gray-400 hover:text-white"
                    >
                      Kapat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA Verification Dialog for Password Change */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="bg-[#1a1f2e] border-[#2D2F33] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">2FA Doğrulama</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertDescription className="text-blue-200">
                Şifre değiştirmek için 2FA doğrulama kodunuzu girin
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-white">Doğrulama Kodu</Label>
              <Input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="bg-[#25272A] border-[#2D2F33] text-white text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-400">
                Google Authenticator veya benzeri uygulamadan aldığınız 6 haneli kodu girin
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handle2FAVerify}
                disabled={loading || twoFactorCode.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Doğrula ve Şifreyi Değiştir
              </Button>
              <Button
                onClick={() => {
                  setShow2FADialog(false);
                  setTwoFactorCode('');
                }}
                variant="outline"
                className="border-[#2D2F33] text-gray-400 hover:text-white"
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Security;
