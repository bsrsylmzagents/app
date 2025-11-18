import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';

const AdminEditCustomer = () => {
  const { company_id } = useParams();
  const [formData, setFormData] = useState({
    company_name: '',
    package_start_date: '',
    package_end_date: '',
    owner_username: '',
    owner_full_name: '',
    address: '',
    tax_office: '',
    tax_number: '',
    phone: '',
    email: '',
    modules_enabled: {
      tour: true,
      hotel: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [resetPassword, setResetPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomer();
  }, [company_id]);

  const fetchCustomer = async () => {
    try {
      setFetching(true);
      const response = await axios.get(`${API}/admin/customers/${company_id}`);
      const customer = response.data;
      
      setFormData({
        company_name: customer.company_name || '',
        package_start_date: customer.package_start_date || '',
        package_end_date: customer.package_end_date || '',
        owner_username: customer.owner?.username || '',
        owner_full_name: customer.owner?.full_name || '',
        address: customer.address || '',
        tax_office: customer.tax_office || '',
        tax_number: customer.tax_number || '',
        phone: customer.phone || '',
        email: customer.email || '',
        modules_enabled: customer.modules_enabled || { tour: true, hotel: false }
      });
    } catch (error) {
      console.error('Fetch customer error:', error);
      toast.error(error.response?.data?.detail || 'Müşteri bilgileri yüklenemedi');
      if (error.response?.status === 404) {
        navigate('/admin/customers');
      }
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        company_name: formData.company_name,
        package_start_date: formData.package_start_date,
        package_end_date: formData.package_end_date,
        address: formData.address,
        tax_office: formData.tax_office,
        tax_number: formData.tax_number,
        phone: formData.phone,
        email: formData.email,
        owner_username: formData.owner_username,
        owner_full_name: formData.owner_full_name,
        modules_enabled: formData.modules_enabled
      };

      if (resetPassword) {
        updateData.reset_password = true;
      }

      await axios.put(`${API}/admin/customers/${company_id}`, updateData);
      toast.success('Müşteri başarıyla güncellendi!');
      navigate('/admin/customers');
    } catch (error) {
      console.error('Update customer error:', error);
      toast.error(error.response?.data?.detail || 'Müşteri güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-8 text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/customers')}
            className="text-[#14b8dc] hover:text-[#14b8dc]"
          >
            <ArrowLeft size={20} className="mr-2" />
            Geri
          </Button>
          <h1 className="text-3xl font-bold text-white">Müşteri Düzenle</h1>
        </div>
      </div>

      <Card className="bg-[#25272A] border-[#2D2F33]">
        <CardHeader>
          <CardTitle className="text-white">Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="package_start_date" className="text-gray-300">
                  Paket Başlangıç Tarihi
                </Label>
                <Input
                  id="package_start_date"
                  type="date"
                  value={formData.package_start_date}
                  onChange={(e) => setFormData({ ...formData, package_start_date: e.target.value })}
                  className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                />
              </div>

              <div>
                <Label htmlFor="package_end_date" className="text-gray-300">
                  Paket Bitiş Tarihi
                </Label>
                <Input
                  id="package_end_date"
                  type="date"
                  value={formData.package_end_date}
                  onChange={(e) => setFormData({ ...formData, package_end_date: e.target.value })}
                  className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                />
              </div>
            </div>

            <div className="border-t border-[#14b8dc]/20 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Firma İletişim Bilgileri</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-gray-300">Adres *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tax_office" className="text-gray-300">Vergi Dairesi *</Label>
                    <Input
                      id="tax_office"
                      value={formData.tax_office}
                      onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_number" className="text-gray-300">Vergi Numarası *</Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">Telefon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#14b8dc]/20 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Owner Kullanıcı Bilgileri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="owner_username" className="text-gray-300">
                    Kullanıcı Adı *
                  </Label>
                  <Input
                    id="owner_username"
                    value={formData.owner_username}
                    onChange={(e) => setFormData({ ...formData, owner_username: e.target.value })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="owner_full_name" className="text-gray-300">
                    Tam Adı
                  </Label>
                  <Input
                    id="owner_full_name"
                    value={formData.owner_full_name}
                    onChange={(e) => setFormData({ ...formData, owner_full_name: e.target.value })}
                    className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetPassword}
                    onChange={(e) => setResetPassword(e.target.checked)}
                    className="w-4 h-4 text-[#14b8dc] bg-[#1a1f2e] border-[#14b8dc]/30 rounded focus:ring-[#14b8dc]"
                  />
                  <span className="text-gray-300">
                    Şifreyi sıfırla (kullanıcı adı ile aynı olacak)
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-[#14b8dc]/20 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Modül Yönetimi</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.modules_enabled.tour || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      modules_enabled: {
                        ...formData.modules_enabled,
                        tour: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-[#14b8dc] bg-[#1a1f2e] border-[#14b8dc]/30 rounded focus:ring-[#14b8dc]"
                  />
                  <span className="text-gray-300">Tur Yönetimi Modülü</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.modules_enabled.hotel || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      modules_enabled: {
                        ...formData.modules_enabled,
                        hotel: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-[#14b8dc] bg-[#1a1f2e] border-[#14b8dc]/30 rounded focus:ring-[#14b8dc]"
                  />
                  <span className="text-gray-300">Otel Yönetimi Modülü</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="btn-primary">
                <Save size={16} className="mr-2" />
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
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

export default AdminEditCustomer;

