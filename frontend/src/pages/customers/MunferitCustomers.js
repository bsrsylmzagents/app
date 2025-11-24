import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import { Edit, Search } from 'lucide-react';
import CustomerDetailDialog from '../../components/CustomerDetailDialog';

const MunferitCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const params = {};
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await axios.get(`${API}/munferit-customers`, { params });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailDialogOpen(true);
  };

  const handleSaveCustomerDetails = async (details) => {
    if (!selectedCustomer) return;
    
    try {
      await axios.put(`${API}/munferit-customers/${selectedCustomer.id}`, details);
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
        <h1 className="text-3xl font-bold text-white mb-2">Münferit Müşteriler</h1>
        <p className="text-[#A5A5A5]">Münferit müşteri kayıtları ve yönetimi</p>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-5" />
        <input
          type="text"
          placeholder="Müşteri ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF] transition-colors"
        />
      </div>

      {/* Müşteriler Tablosu - Desktop View */}
      <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full hidden md:table">
            <thead className="bg-[#2D2F33] border-b border-[#2D2F33]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Müşteri Adı</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Telefon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Uyruk</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">TC/Pasaport</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Doğum Tarihi</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Toplam Satış</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Son Satış</th>
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
                  <td className="px-6 py-4 text-sm text-[#3EA6FF] font-semibold">{customer.total_sales || 0}</td>
                  <td className="px-6 py-4 text-sm text-[#A5A5A5]">
                    {customer.last_sale_date ? new Date(customer.last_sale_date).toLocaleDateString('tr-TR') : '-'}
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
                  : 'Henüz münferit müşteri bulunmamaktadır'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid md:hidden gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl">
            <p className="text-[#A5A5A5]">
              {searchQuery 
                ? 'Arama kriterlerinize uygun müşteri bulunamadı' 
                : 'Henüz münferit müşteri bulunmamaktadır'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{customer.customer_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <span>📞</span>
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(customer)}
                  className="p-2 hover:bg-[#3EA6FF]/20 rounded-lg transition-colors flex-shrink-0"
                  title="Düzenle"
                >
                  <Edit size={18} className="text-[#3EA6FF]" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {customer.email && (
                  <div>
                    <p className="text-[#A5A5A5] text-xs mb-1">Email</p>
                    <p className="text-white">{customer.email}</p>
                  </div>
                )}
                {customer.nationality && (
                  <div>
                    <p className="text-[#A5A5A5] text-xs mb-1">Uyruk</p>
                    <p className="text-white">{customer.nationality}</p>
                  </div>
                )}
                {customer.id_number && (
                  <div>
                    <p className="text-[#A5A5A5] text-xs mb-1">TC/Pasaport</p>
                    <p className="text-white">{customer.id_number}</p>
                  </div>
                )}
                {customer.birth_date && (
                  <div>
                    <p className="text-[#A5A5A5] text-xs mb-1">Doğum Tarihi</p>
                    <p className="text-white">
                      {new Date(customer.birth_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[#A5A5A5] text-xs mb-1">Toplam Satış</p>
                  <p className="text-[#3EA6FF] font-semibold">{customer.total_sales || 0}</p>
                </div>
                {customer.last_sale_date && (
                  <div>
                    <p className="text-[#A5A5A5] text-xs mb-1">Son Satış</p>
                    <p className="text-white">
                      {new Date(customer.last_sale_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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

export default MunferitCustomers;
