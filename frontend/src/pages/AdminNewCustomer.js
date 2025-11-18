import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminNewCustomer = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    package_start_date: '',
    package_end_date: '',
    owner_username: '',
    address: '',
    tax_office: '',
    tax_number: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/customers`, formData);
      setCreatedCustomer(response.data);
      toast.success('Müşteri başarıyla oluşturuldu!');
      
      // 2 saniye sonra müşteriler listesine yönlendir
      setTimeout(() => {
        navigate('/admin/customers');
      }, 2000);
    } catch (error) {
      console.error('Create customer error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok');
        navigate('/');
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Müşteri oluşturulamadı';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (createdCustomer) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#25272A] border-[#2D2F33]">
          <CardHeader>
            <CardTitle className="text-white text-green-400">✓ Müşteri Başarıyla Oluşturuldu!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#2D2F33] p-4 rounded-lg space-y-3">
              <div>
                <Label className="text-gray-400">Firma Kodu:</Label>
                <p className="text-white font-mono text-lg">{createdCustomer.company.company_code}</p>
              </div>
              <div>
                <Label className="text-gray-400">Firma Adı:</Label>
                <p className="text-white">{createdCustomer.company.company_name}</p>
              </div>
              <div>
                <Label className="text-gray-400">Adres:</Label>
                <p className="text-white">{createdCustomer.company.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Vergi Dairesi:</Label>
                  <p className="text-white">{createdCustomer.company.tax_office}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Vergi Numarası:</Label>
                  <p className="text-white">{createdCustomer.company.tax_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Telefon:</Label>
                  <p className="text-white">{createdCustomer.company.phone}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Email:</Label>
                  <p className="text-white">{createdCustomer.company.email}</p>
                </div>
              </div>
              <div className="border-t border-[#2D2F33] pt-3 mt-3">
                <div>
                  <Label className="text-gray-400">Kullanıcı Adı:</Label>
                  <p className="text-white">{createdCustomer.owner.username}</p>
                </div>
                <div className="mt-2">
                  <Label className="text-gray-400">Şifre:</Label>
                  <p className="text-white font-mono bg-[#0a0e1a] p-2 rounded">{createdCustomer.owner.password}</p>
                  <p className="text-xs text-gray-500 mt-1">Bu şifreyi müşteriye iletiniz</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/admin/customers')} className="btn-primary">
                Müşteriler Listesine Dön
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedCustomer(null);
                  setFormData({
                    company_name: '',
                    package_start_date: '',
                    package_end_date: '',
                    owner_username: '',
                    address: '',
                    tax_office: '',
                    tax_number: '',
                    phone: '',
                    email: ''
                  });
                }}
              >
                Yeni Müşteri Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Yeni Müşteri Oluştur</h1>
        <Button variant="outline" onClick={() => navigate('/admin/customers')}>
          Geri Dön
        </Button>
      </div>

      <Card className="bg-[#0f1419]/80 border-[#14b8dc]/20">
        <CardHeader>
          <CardTitle className="text-white">Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company_name" className="text-gray-300">
                Firma Adı *
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="package_start_date" className="text-gray-300">
                  Paket Başlangıç Tarihi *
                </Label>
                <Input
                  id="package_start_date"
                  type="date"
                  value={formData.package_start_date}
                  onChange={(e) => setFormData({ ...formData, package_start_date: e.target.value })}
                  className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="package_end_date" className="text-gray-300">
                  Paket Bitiş Tarihi *
                </Label>
                <Input
                  id="package_end_date"
                  type="date"
                  value={formData.package_end_date}
                  onChange={(e) => setFormData({ ...formData, package_end_date: e.target.value })}
                  className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="owner_username" className="text-gray-300">
                Owner Kullanıcı Adı *
              </Label>
              <Input
                id="owner_username"
                value={formData.owner_username}
                onChange={(e) => setFormData({ ...formData, owner_username: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                placeholder="Kullanıcı adı (şifre de aynı olacak)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Şifre otomatik olarak kullanıcı adı ile aynı olacaktır
              </p>
            </div>

            <div className="border-t border-[#14b8dc]/20 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Firma İletişim Bilgileri</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-gray-300">
                    Adres *
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    placeholder="Tam adres"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tax_office" className="text-gray-300">
                      Vergi Dairesi *
                    </Label>
                    <Input
                      id="tax_office"
                      value={formData.tax_office}
                      onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      placeholder="Vergi dairesi adı"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_number" className="text-gray-300">
                      Vergi Numarası *
                    </Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      placeholder="Vergi numarası"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">
                      Telefon Numarası *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      placeholder="0XXX XXX XX XX"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">
                      Email Adresi *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Oluşturuluyor...' : 'Müşteri Oluştur'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/customers')}>
                İptal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNewCustomer;

