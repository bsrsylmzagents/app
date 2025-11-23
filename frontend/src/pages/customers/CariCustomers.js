import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Edit, Search, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CustomerDetailDialog from '../../components/CustomerDetailDialog';

const CariCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [cariAccounts, setCariAccounts] = useState([]);
  const [selectedCariId, setSelectedCariId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchCariAccounts();
  }, []);

  useEffect(() => {
    if (selectedCariId) {
      fetchCustomers();
    } else {
      setCustomers([]);
    }
  }, [selectedCariId]);

  const fetchCariAccounts = async () => {
    try {
      const response = await axios.get(`${API}/cari-accounts`);
      // Münferit hariç cari hesapları filtrele
      const filtered = response.data.filter(c => !c.is_munferit && c.name !== "Münferit");
      setCariAccounts(filtered);
    } catch (error) {
      console.error('Cari hesaplar yüklenemedi');
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = { cari_id: selectedCariId };
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await axios.get(`${API}/cari-customers`, { params });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailDialogOpen(true);
  };

  const handleSaveCustomerDetails = async (details) => {
    if (!selectedCustomer) return;
    
    try {
      await axios.put(`${API}/cari-customers/${selectedCustomer.id}`, details);
      toast.success('Müşteri güncellendi');
      setCustomerDetailDialogOpen(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast.error('Müşteri güncellenemedi');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.customer_name?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.nationality?.toLowerCase().includes(query) ||
      customer.id_number?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Cari Müşteriler</h1>
        <p className="text-[#A5A5A5]">Cari hesap müşterileri ve yönetimi</p>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2 text-white">Cari Firma Seçin</label>
          <select
            value={selectedCariId}
            onChange={(e) => setSelectedCariId(e.target.value)}
            className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
          >
            <option value="">Cari firma seçin</option>
            {cariAccounts.map(cari => (
              <option key={cari.id} value={cari.id}>{cari.name}</option>
            ))}
          </select>
        </div>
        {selectedCariId && (
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
            <input
              type="text"
              placeholder="Müşteri ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF]"
            />
          </div>
        )}
      </div>

      {/* Müşteriler Tablosu */}
      {selectedCariId ? (
        <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri Adı</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Telefon</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Uyruk</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">TC/Pasaport</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Doğum Tarihi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam Rezervasyon</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Son Rezervasyon</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2F33]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#2D2F33]">
                    <td className="px-6 py-4 text-sm text-white font-medium">{customer.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">{customer.nationality || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">{customer.id_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">
                      {customer.birth_date ? new Date(customer.birth_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#3EA6FF] font-semibold">{customer.total_reservations || 0}</td>
                    <td className="px-6 py-4 text-sm text-[#A5A5A5]">
                      {customer.last_reservation_date ? new Date(customer.last_reservation_date).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={18} className="text-[#3EA6FF]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#A5A5A5]">
                  {searchQuery 
                    ? 'Arama kriterlerinize uygun müşteri bulunamadı' 
                    : 'Bu cari firmaya ait müşteri bulunmamaktadır'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-lg p-6">
          <p className="text-[#A5A5A5] text-center py-8">
            Lütfen bir cari firma seçin
          </p>
        </div>
      )}

      {/* Müşteri Detay Dialog */}
      {selectedCustomer && (
        <CustomerDetailDialog
          open={customerDetailDialogOpen}
          onOpenChange={(open) => {
            setCustomerDetailDialogOpen(open);
            if (!open) {
              setSelectedCustomer(null);
            }
          }}
          customerName={selectedCustomer.customer_name}
          initialData={selectedCustomer}
          onSave={handleSaveCustomerDetails}
        />
      )}
    </div>
  );
};

export default CariCustomers;
