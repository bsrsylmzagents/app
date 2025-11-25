import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { RefreshCw, Search, Mail, Phone, Building2, User, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminDemoRequests = () => {
  const [demoRequests, setDemoRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const fetchDemoRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await axios.get(`${API}/super-admin/demo-requests`, { params });
      console.log('Demo requests response:', response.data);
      const requestsData = response.data || [];
      setDemoRequests(requestsData);
      setFilteredRequests(requestsData);
      if (requestsData.length === 0) {
        console.warn('No demo requests found.');
      }
    } catch (error) {
      console.error('Fetch demo requests error:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok. Super admin olarak giriş yapmalısınız.');
        navigate('/');
      } else if (error.response?.status === 401) {
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın');
        navigate('/login');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error('Backend bağlantısı yapılamadı! Backend\'in çalıştığından emin olun.');
      } else {
        let errorMessage = 'Demo talepleri yüklenemedi';
        const detail = error.response?.data?.detail;
        
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          const firstError = detail[0];
          errorMessage = typeof firstError === 'string' 
            ? firstError 
            : firstError?.msg || 'Demo talepleri yüklenemedi';
        } else if (detail && typeof detail === 'object') {
          errorMessage = detail.msg || detail.message || 'Demo talepleri yüklenemedi';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
      setDemoRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoRequests();
  }, [statusFilter]);

  useEffect(() => {
    let filtered = demoRequests;

    // Arama filtresi
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const companyName = (request.company_name || '').toLowerCase();
        const contactName = (request.contact_name || '').toLowerCase();
        const email = (request.email || '').toLowerCase();
        const phone = (request.phone || '').toLowerCase();
        
        return companyName.includes(query) ||
               contactName.includes(query) ||
               email.includes(query) ||
               phone.includes(query);
      });
    }

    setFilteredRequests(filtered);
  }, [searchQuery, demoRequests]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'contacted':
        return <CheckCircle size={16} className="text-blue-400" />;
      case 'converted':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'contacted':
        return 'İletişime Geçildi';
      case 'converted':
        return 'Dönüştürüldü';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-[#A5A5A5]">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Demo Talepleri</h1>
        <div className="flex gap-2">
          <Button 
            onClick={fetchDemoRequests} 
            variant="outline"
            disabled={loading}
            className="border-[#2D2F33] text-[#3EA6FF] hover:bg-[#3EA6FF]/10"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      <Card className="bg-[#25272A] border-[#2D2F33]">
        <CardHeader>
          <CardTitle className="text-white">Demo Talep Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Arama ve Filtre Alanı */}
          <div className="mb-4 flex gap-4 flex-wrap">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5A5A5] size-4" />
              <input
                type="text"
                placeholder="Firma ismi, İletişim adı, Mail veya Telefon ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#3EA6FF]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-[#2D2F33] border-[#2D2F33] text-white">
                <SelectValue placeholder="Durum Filtresi" />
              </SelectTrigger>
              <SelectContent className="bg-[#25272A] border-[#2D2F33]">
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Beklemede</SelectItem>
                <SelectItem value="contacted">İletişime Geçildi</SelectItem>
                <SelectItem value="converted">Dönüştürüldü</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-300">Firma Adı</TableHead>
                <TableHead className="text-gray-300">İletişim Kişisi</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Telefon</TableHead>
                <TableHead className="text-gray-300">Durum</TableHead>
                <TableHead className="text-gray-300">Talep Tarihi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#A5A5A5] py-8">
                    {demoRequests.length === 0 ? 'Henüz demo talebi bulunmuyor' : 'Arama sonucu bulunamadı'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id || request._id}>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-[#3EA6FF]" />
                        {request.company_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-[#A5A5A5]" />
                        {request.contact_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#A5A5A5]">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-[#A5A5A5]" />
                        {request.email || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#A5A5A5]">
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-[#A5A5A5]" />
                        {request.phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status || 'pending')}
                        <span className="text-white">{getStatusLabel(request.status || 'pending')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#A5A5A5]">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#A5A5A5]" />
                        {formatDate(request.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDemoRequests;

