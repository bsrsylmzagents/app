import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronRight, CheckSquare, Square, LayoutGrid, Table2, Mail, Phone, Calendar, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { parseISO, differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';

const PERMISSION_GROUPS = {
  reservation: {
    name: 'Rezervasyon Yönetimi',
    permissions: {
      create: 'Rezervasyon oluşturabilir',
      edit: 'Rezervasyon düzenleyebilir',
      delete: 'Rezervasyon silebilir',
      see_price: 'Rezervasyon fiyatını görebilir',
      edit_price: 'Fiyatı değiştirebilir',
      see_customer_info: 'Müşteri bilgilerini görebilir',
      change_currency: 'Döviz tipini değiştirebilir',
      change_atv_count: 'ATV sayısını değiştirebilir',
      discount: 'İndirim verebilir',
      notes: 'Rezervasyon notlarını görebilir/düzenleyebilir'
    }
  },
  customer: {
    name: 'Müşteri Yönetimi',
    permissions: {
      view: 'Müşteri listesini görebilir',
      create: 'Yeni müşteri ekleyebilir',
      edit: 'Müşteri bilgisi güncelleyebilir',
      delete: 'Müşteri silebilir',
      phone_view: 'Müşteri telefonunu görebilir',
      email_view: 'Müşteri email görebilir'
    }
  },
  cari: {
    name: 'Cari Hesap Yönetimi',
    permissions: {
      view: 'Cari firmasını görebilir',
      balance_view: 'Borç / alacak toplamını görebilir',
      transactions_view: 'Cari hareketleri (borç/alacak) görebilir',
      add_transaction: 'Borç/alacak hareketi ekleyebilir',
      edit_transaction: 'Hareketi düzenleyebilir',
      delete_transaction: 'Hareket silebilir',
      see_sensitive_notes: 'Cari hesap özel notlarını görebilir'
    }
  },
  atv: {
    name: 'ATV / Operasyon Yönetimi',
    permissions: {
      view: 'ATV operasyon ekranını görebilir',
      start_end_ride: 'ATV tur başlatma / bitirme',
      edit_damage: 'Zarar / hasar kaydı ekleyebilir',
      edit_count: 'ATV adet değiştirebilir'
    }
  },
  finance: {
    name: 'Finans / Gelir - Gider',
    permissions: {
      view_revenue: 'Gelirleri görebilir',
      view_expenses: 'Giderleri görebilir',
      kasa_view: 'Kasa hareketlerini görebilir',
      kasa_edit: 'Kasa hareketi ekleme/düzenleme/silme',
      see_costs: 'Maliyet bilgilerini görebilir'
    }
  },
  reports: {
    name: 'Raporlar',
    permissions: {
      view_all_reports: 'Tüm rapor ekranına erişim',
      revenue_report: 'Günlük - Aylık gelir raporu',
      reservation_report: 'Rezervasyon raporu',
      customer_report: 'Müşteri analiz raporu',
      atv_report: 'ATV kullanım raporu',
      debt_credit_report: 'Cari borç/alacak raporu (çok hassas!)'
    }
  },
  settings: {
    name: 'Sistem Ayarları',
    permissions: {
      view: 'Ayarları görebilir',
      tur_types: 'Tur tiplerini yönetebilir',
      payment_types: 'Ödeme yöntemlerini yönetebilir',
      staff_management: 'Personel yönetimi yapabilir',
      app_settings: 'Global sistem ayarları'
    }
  },
  dashboard: {
    name: 'Dashboard / Genel Görünüm',
    permissions: {
      view: 'Dashboard erişimi',
      see_statistics: 'İstatistik kutularını görebilir',
      see_finance_cards: 'Finans kartlarını görebilir (günlük gelir vb.)'
    }
  }
};

const getDefaultPermissions = () => {
  const defaultPerms = {};
  Object.keys(PERMISSION_GROUPS).forEach(module => {
    defaultPerms[module] = {};
    Object.keys(PERMISSION_GROUPS[module].permissions).forEach(action => {
      defaultPerms[module][action] = false;
    });
  });
  return defaultPerms;
};

const StaffManagement = () => {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();
  
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [statistics, setStatistics] = useState({
    total_active: 0,
    total_inactive: 0,
    total_staff: 0,
    web_panel_active: 0,
    role_stats: []
  });
  const [selectedRole, setSelectedRole] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [viewMode, setViewMode] = useState('cards');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    tc_no: '',
    birth_date: '',
    gender: null,
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    employee_id: '',
    role_id: null,
    hire_date: '',
    termination_date: '',
    is_active: true,
    gross_salary: '',
    net_salary: '',
    salary_currency: 'TRY',
    advance_limit: '',
    salary_payment_day: null,
    languages: [],
    skills: [],
    education_level: null,
    education_field: '',
    driving_license_class: '',
    driving_license_no: '',
    driving_license_expiry: '',
    // Web Panel
    web_panel_active: false,
    username: '',
    password: '',
    is_admin: false,
    permissions: getDefaultPermissions(),
    // Diğer
    notes: '',
    avatar_url: ''
  });
  
  const [languageInput, setLanguageInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDetailDialogOpen, setStaffDetailDialogOpen] = useState(false);
  const [staffDetail, setStaffDetail] = useState(null);
  const [paySalaryDialogOpen, setPaySalaryDialogOpen] = useState(false);
  const [addAdvanceDialogOpen, setAddAdvanceDialogOpen] = useState(false);
  const [addOvertimeDialogOpen, setAddOvertimeDialogOpen] = useState(false);
  const [addLeaveDialogOpen, setAddLeaveDialogOpen] = useState(false);
  const [paySalaryFormData, setPaySalaryFormData] = useState({
    amount: '',
    currency: 'TRY',
    payment_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [advanceFormData, setAdvanceFormData] = useState({
    amount: '',
    currency: 'TRY',
    payment_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [overtimeFormData, setOvertimeFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    hourly_rate: '',
    currency: 'TRY',
    description: ''
  });
  const [leaveFormData, setLeaveFormData] = useState({
    leave_type: 'annual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_paid: false,
    description: ''
  });

  // Permission kontrolü kaldırıldı - tüm roller personel yönetimine erişebilir

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [staff]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedRole !== 'all') params.role_id = selectedRole;
      if (statusFilter === 'active') params.is_active = true;
      else if (statusFilter === 'inactive') params.is_active = false;
      
      // Use new /staff endpoint for admin-only staff management
      const response = await axios.get(`${API}/staff`, { params });
      setStaff(response.data);
    } catch (error) {
      console.error('Personeller yüklenemedi:', error);
      // 403 hatası = yetki yok, settings'e yönlendir
      if (error.response?.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        navigate('/settings');
        return;
      }
      toast.error('Personeller yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API}/staff-roles`);
      setRoles(response.data);
    } catch (error) {
      console.error('Roller yüklenemedi:', error);
      // 403 hatası = yetki yok, settings'e yönlendir
      if (error.response?.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        navigate('/settings');
        return;
      }
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/users/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
      // 403 hatası = yetki yok, settings'e yönlendir
      if (error.response?.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        navigate('/settings');
        return;
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, statusFilter]);

  const handleOpenDialog = (person = null) => {
    if (person) {
      setEditingStaff(person);
      setFormData({
        full_name: person.full_name || '',
        email: person.email || '',
        phone: person.phone || '',
        address: person.address || '',
        tc_no: person.tc_no || '',
        birth_date: person.birth_date || '',
        gender: person.gender || null,
        nationality: person.nationality || '',
        emergency_contact_name: person.emergency_contact_name || '',
        emergency_contact_phone: person.emergency_contact_phone || '',
        employee_id: person.employee_id || '',
        role_id: person.role_id || null,
        hire_date: person.hire_date || '',
        termination_date: person.termination_date || '',
        is_active: person.is_active !== undefined ? person.is_active : true,
        gross_salary: person.gross_salary || '',
        net_salary: person.net_salary || '',
        salary_currency: person.salary_currency || 'TRY',
        advance_limit: person.advance_limit || '',
        salary_payment_day: person.salary_payment_day || null,
        languages: person.languages || [],
        skills: person.skills || [],
        education_level: person.education_level || null,
        education_field: person.education_field || '',
        driving_license_class: person.driving_license_class || '',
        driving_license_no: person.driving_license_no || '',
        driving_license_expiry: person.driving_license_expiry || '',
        web_panel_active: person.web_panel_active === true,
        username: person.username || '',
        password: '',
        // is_admin is not editable - staff members always have role='user'
        permissions: person.permissions || getDefaultPermissions(),
        notes: person.notes || '',
        avatar_url: person.avatar_url || ''
      });
    } else {
      setEditingStaff(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      tc_no: '',
      birth_date: '',
      gender: null,
      nationality: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      employee_id: '',
      role_id: null,
      hire_date: '',
      termination_date: '',
      is_active: true,
      gross_salary: '',
      net_salary: '',
      salary_currency: 'TRY',
      advance_limit: '',
      salary_payment_day: null,
      languages: [],
      skills: [],
      education_level: null,
      education_field: '',
      driving_license_class: '',
      driving_license_no: '',
      driving_license_expiry: '',
      web_panel_active: false,
      username: '',
      password: '',
      is_admin: false,
      permissions: getDefaultPermissions(),
      notes: '',
      avatar_url: ''
    });
    setLanguageInput('');
    setSkillInput('');
  };

  const handleOpenStaffDetail = async (staff) => {
    setSelectedStaff(staff);
    setStaffDetailDialogOpen(true);
    await fetchStaffDetail(staff.id);
  };

  const fetchStaffDetail = async (userId) => {
    try {
      const response = await axios.get(`${API}/users/${userId}/detail`);
      setStaffDetail(response.data);
    } catch (error) {
      toast.error('Personel detayları yüklenemedi');
    }
  };

  const handlePaySalary = async () => {
    if (!paySalaryFormData.amount || parseFloat(paySalaryFormData.amount) <= 0) {
      toast.error('Maaş tutarı 0\'dan büyük olmalıdır');
      return;
    }
    
    try {
      await axios.post(`${API}/users/${selectedStaff.id}/pay-salary`, paySalaryFormData);
      toast.success('Maaş ödendi');
      setPaySalaryDialogOpen(false);
      setPaySalaryFormData({
        amount: '',
        currency: selectedStaff?.salary_currency || 'TRY',
        payment_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      await fetchStaffDetail(selectedStaff.id);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Maaş ödenemedi');
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceFormData.amount || parseFloat(advanceFormData.amount) <= 0) {
      toast.error('Avans tutarı 0\'dan büyük olmalıdır');
      return;
    }
    
    try {
      await axios.post(`${API}/users/${selectedStaff.id}/add-advance`, advanceFormData);
      toast.success('Avans eklendi');
      setAddAdvanceDialogOpen(false);
      setAdvanceFormData({
        amount: '',
        currency: selectedStaff?.salary_currency || 'TRY',
        payment_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      await fetchStaffDetail(selectedStaff.id);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Avans eklenemedi');
    }
  };

  const handleAddOvertime = async () => {
    if (!overtimeFormData.hours || parseFloat(overtimeFormData.hours) <= 0) {
      toast.error('Fazla mesai saati 0\'dan büyük olmalıdır');
      return;
    }
    
    try {
      const payload = {
        ...overtimeFormData,
        hours: parseFloat(overtimeFormData.hours),
        hourly_rate: overtimeFormData.hourly_rate ? parseFloat(overtimeFormData.hourly_rate) : null
      };
      await axios.post(`${API}/users/${selectedStaff.id}/overtime`, payload);
      toast.success('Fazla mesai eklendi');
      setAddOvertimeDialogOpen(false);
      setOvertimeFormData({
        date: new Date().toISOString().split('T')[0],
        hours: '',
        hourly_rate: '',
        currency: selectedStaff?.salary_currency || 'TRY',
        description: ''
      });
      await fetchStaffDetail(selectedStaff.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fazla mesai eklenemedi');
    }
  };

  const handleAddLeave = async () => {
    if (!leaveFormData.start_date || !leaveFormData.end_date) {
      toast.error('Başlangıç ve bitiş tarihi gerekli');
      return;
    }
    
    try {
      await axios.post(`${API}/users/${selectedStaff.id}/leaves`, leaveFormData);
      toast.success('İzin eklendi');
      setAddLeaveDialogOpen(false);
      setLeaveFormData({
        leave_type: 'annual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        is_paid: false,
        description: ''
      });
      await fetchStaffDetail(selectedStaff.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İzin eklenemedi');
    }
  };

  const handlePayOvertime = async (overtimeId) => {
    try {
      await axios.put(`${API}/users/${selectedStaff.id}/overtime/${overtimeId}/pay`, {
        payment_date: new Date().toISOString().split('T')[0]
      });
      toast.success('Fazla mesai ödemesi yapıldı');
      await fetchStaffDetail(selectedStaff.id);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Fazla mesai ödemesi yapılamadı');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name) {
      toast.error('Ad Soyad zorunludur');
      return;
    }

    if (formData.web_panel_active) {
      if (!formData.username) {
        toast.error('Web panel aktifse kullanıcı adı zorunludur');
        return;
      }
      if (!editingStaff && !formData.password) {
        toast.error('Web panel aktifse şifre zorunludur');
        return;
      }
    }

    try {
      const payload = { ...formData };
      
      // Convert empty strings to null for optional fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      
      // Convert numbers
      if (payload.gross_salary) payload.gross_salary = parseFloat(payload.gross_salary);
      if (payload.net_salary) payload.net_salary = parseFloat(payload.net_salary);
      if (payload.advance_limit) payload.advance_limit = parseFloat(payload.advance_limit);
      if (payload.salary_payment_day) payload.salary_payment_day = parseInt(payload.salary_payment_day);
      
      // Remove password if empty (for updates)
      if (editingStaff && !payload.password) {
        delete payload.password;
      }
      
      // Remove is_admin - staff members always have role='user' (enforced by backend)
      delete payload.is_admin;

      if (editingStaff) {
        // Use new /staff endpoint for admin-only staff management
        await axios.put(`${API}/staff/${editingStaff.id}`, payload);
        toast.success('Personel güncellendi');
      } else {
        // Use new /staff endpoint for admin-only staff management
        await axios.post(`${API}/staff`, payload);
        toast.success('Personel oluşturuldu');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      console.error('Personel kaydedilemedi:', error);
      toast.error(error.response?.data?.detail || 'Personel kaydedilemedi');
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = await confirm({
      title: "Personeli Sil",
      message: "Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      variant: "danger"
    });

    if (!confirmed) return;

    try {
      // Use new /staff endpoint for admin-only staff management
      await axios.delete(`${API}/staff/${userId}`);
      toast.success('Personel silindi');
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      console.error('Personel silinemedi:', error);
      toast.error(error.response?.data?.detail || 'Personel silinemedi');
    }
  };

  const handleToggleActive = async (userId) => {
    const user = staff.find(s => s.id === userId);
    const action = user?.is_active ? 'pasif' : 'aktif';
    
    const confirmed = await confirm({
      title: `Personeli ${action === 'pasif' ? 'Pasif' : 'Aktif'} Yap`,
      message: `Bu personeli ${action} yapmak istediğinize emin misiniz? ${
        action === 'pasif' 
          ? 'Personel web panele erişemeyecek ve işten ayrılma tarihi kaydedilecektir.'
          : 'Personel aktif personel olarak işaretlenecektir.'
      }`,
      variant: action === 'pasif' ? 'warning' : 'info'
    });
    
    if (!confirmed) return;
    
    try {
      await axios.put(`${API}/users/${userId}/toggle-active`);
      toast.success(`Personel ${action} yapıldı`);
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData({
        ...formData,
        languages: [...formData.languages, languageInput.trim()]
      });
      setLanguageInput('');
    }
  };

  const removeLanguage = (lang) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter(l => l !== lang)
    });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };

  // Ehliyet Uyarıları
  const getDrivingLicenseWarning = (person) => {
    if (!person.driving_license_expiry) return null;
    
    try {
      const expiry = parseISO(person.driving_license_expiry);
      const today = new Date();
      const daysLeft = differenceInDays(expiry, today);
      
      if (daysLeft < 0) {
        return { status: 'expired', message: 'Süresi dolmuş', color: 'red' };
      } else if (daysLeft <= 30) {
        return { status: 'warning', message: `${daysLeft} gün kaldı`, color: 'orange' };
      } else if (daysLeft <= 90) {
        return { status: 'info', message: `${daysLeft} gün kaldı`, color: 'yellow' };
      }
    } catch (e) {
      return null;
    }
    
    return null;
  };

  const toggleGroup = (module) => {
    setExpandedGroups(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const toggleAllInGroup = (module, value) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      const modulePerms = { ...newPermissions[module] };
      Object.keys(modulePerms).forEach(action => {
        modulePerms[action] = value;
      });
      newPermissions[module] = modulePerms;
      return { ...prev, permissions: newPermissions };
    });
  };

  const togglePermission = (module, action) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions };
      const modulePerms = { ...newPermissions[module] };
      modulePerms[action] = !modulePerms[action];
      newPermissions[module] = modulePerms;
      return { ...prev, permissions: newPermissions };
    });
  };

  const getPermissionValue = (module, action) => {
    return formData.permissions[module]?.[action] || false;
  };

  const isGroupAllSelected = (module) => {
    const modulePerms = formData.permissions[module] || {};
    const actions = Object.keys(PERMISSION_GROUPS[module].permissions);
    return actions.length > 0 && actions.every(action => modulePerms[action] === true);
  };

  const isGroupPartiallySelected = (module) => {
    const modulePerms = formData.permissions[module] || {};
    const actions = Object.keys(PERMISSION_GROUPS[module].permissions);
    const selectedCount = actions.filter(action => modulePerms[action] === true).length;
    return selectedCount > 0 && selectedCount < actions.length;
  };

  // Filtered Staff
  const filteredStaff = staff;

  return (
    <div className="space-y-6" data-testid="staff-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Personel Yönetimi</h1>
          <p className="text-[#A5A5A5]">Personel bilgilerini ve yetkilerini yönetin</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
        >
          <Plus size={20} className="mr-2" />
          Yeni Personel
        </Button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
          <div className="text-[#A5A5A5] text-xs mb-1">Toplam Personel</div>
          <div className="text-2xl font-bold text-white">{statistics.total_staff}</div>
        </div>
        
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
          <div className="text-green-400 text-xs mb-1">Aktif Personel</div>
          <div className="text-2xl font-bold text-green-400">{statistics.total_active}</div>
        </div>
        
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <div className="text-red-400 text-xs mb-1">Pasif Personel</div>
          <div className="text-2xl font-bold text-red-400">{statistics.total_inactive}</div>
        </div>
        
        <div className="bg-[#3EA6FF]/20 border border-[#3EA6FF]/50 rounded-xl p-4">
          <div className="text-[#3EA6FF] text-xs mb-1">Web Panel Aktif</div>
          <div className="text-2xl font-bold text-[#3EA6FF]">{statistics.web_panel_active}</div>
        </div>
        
        {statistics.role_stats.slice(0, 2).map((stat) => (
          <div key={stat.role_id || 'uncategorized'} className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
            <div className="text-[#A5A5A5] text-xs mb-1 truncate">{stat.role_name}</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: stat.role_color }}
              />
              <div className="text-2xl font-bold text-white">{stat.total_count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtreler ve Görünüm */}
      <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2 text-white">Rol</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white"
            >
              <option value="all">Tüm Roller</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2 text-white">Durum</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2F33] border border-[#2D2F33] rounded-lg text-white"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              onClick={() => setViewMode('cards')}
              className={viewMode === 'cards' ? 'bg-[#3EA6FF]' : ''}
            >
              <LayoutGrid size={16} className="mr-2" />
              Kart Görünümü
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-[#3EA6FF]' : ''}
            >
              <Table2 size={16} className="mr-2" />
              Tablo Görünümü
            </Button>
          </div>
        </div>
      </div>

      {/* Kart Görünümü */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center text-[#A5A5A5] py-8">Yükleniyor...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="col-span-full text-center text-[#A5A5A5] py-8">Henüz personel eklenmemiş</div>
          ) : (
            filteredStaff.map((person) => {
              const role = roles.find(r => r.id === person.role_id);
              const roleColor = role?.color || '#3EA6FF';
              const licenseWarning = getDrivingLicenseWarning(person);
              
              return (
                <div
                  key={person.id}
                  className={`bg-[#25272A] border rounded-xl p-6 hover:border-[#3EA6FF]/50 transition-all ${
                    person.is_active 
                      ? 'border-[#2D2F33]' 
                      : 'border-red-500/50 opacity-60'
                  }`}
                >
                  {/* Kart Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: roleColor }}
                      >
                        {person.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{person.full_name}</h3>
                        {role && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: roleColor + '40' }}
                          >
                            {role.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      person.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {person.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  
                  {/* Maaş Bilgileri */}
                  {(person.gross_salary || person.net_salary || person.advance_limit) && (
                    <div className="space-y-2 mb-4 pb-4 border-b border-[#2D2F33]">
                      {person.gross_salary && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A5A5A5]">Brüt Maaş:</span>
                          <span className="text-white font-semibold">
                            {person.gross_salary.toFixed(2)} {person.salary_currency || 'TRY'}
                          </span>
                        </div>
                      )}
                      {person.net_salary && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A5A5A5]">Net Maaş:</span>
                          <span className="text-white font-semibold">
                            {person.net_salary.toFixed(2)} {person.salary_currency || 'TRY'}
                          </span>
                        </div>
                      )}
                      {person.advance_limit && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A5A5A5]">Avans Limiti:</span>
                          <span className="text-[#3EA6FF] font-semibold">
                            {person.advance_limit.toFixed(2)} {person.salary_currency || 'TRY'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* İletişim Bilgileri */}
                  {(person.email || person.phone) && (
                    <div className="space-y-2 mb-4 pb-4 border-b border-[#2D2F33]">
                      {person.email && (
                        <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                          <Mail size={14} />
                          <span className="truncate">{person.email}</span>
                        </div>
                      )}
                      {person.phone && (
                        <div className="flex items-center gap-2 text-sm text-[#A5A5A5]">
                          <Phone size={14} />
                          <span>{person.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Ehliyet Uyarısı */}
                  {licenseWarning && (
                    <div className={`mb-4 p-2 rounded-lg text-xs ${
                      licenseWarning.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                      licenseWarning.status === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      <AlertTriangle size={14} className="inline mr-1" />
                      Ehliyet: {licenseWarning.message}
                    </div>
                  )}
                  
                  {/* Web Panel Durumu */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-[#A5A5A5]">Web Panel:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      person.web_panel_active
                        ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]'
                        : 'bg-[#2D2F33] text-[#A5A5A5]'
                    }`}>
                      {person.web_panel_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  
                  {/* İşlem Butonları */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleOpenStaffDetail(person)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#3EA6FF] text-[#3EA6FF] hover:bg-[#3EA6FF]/20"
                    >
                      Detay
                    </Button>
                    <Button
                      onClick={() => handleOpenDialog(person)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                    >
                      <Edit size={16} className="mr-2" />
                      Düzenle
                    </Button>
                    <Button
                      onClick={() => handleToggleActive(person.id)}
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${
                        person.is_active
                          ? 'border-red-500/50 text-red-400 hover:bg-red-500/20'
                          : 'border-green-500/50 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {person.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tablo Görünümü - Mevcut tablo yapısını koruyoruz ama genişletiyoruz */}
      {viewMode === 'table' && (
        <div className="bg-[#25272A] backdrop-blur-xl border border-[#2D2F33] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2D2F33]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Ad Soyad</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Rol</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Durum</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Maaş</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">İletişim</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Web Panel</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2F33]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-[#A5A5A5]">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-[#A5A5A5]">
                      Henüz personel eklenmemiş
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((person) => {
                    const role = roles.find(r => r.id === person.role_id);
                    const permissionCount = Object.values(person.permissions || {}).reduce((sum, module) => {
                      return sum + Object.values(module).filter(v => v === true).length;
                    }, 0);
                    
                    return (
                      <tr key={person.id} className="hover:bg-[#2D2F33]">
                        <td className="px-6 py-4 text-white text-sm font-medium">{person.full_name}</td>
                        <td className="px-6 py-4">
                          {role ? (
                            <span 
                              className="px-2 py-1 rounded-full text-xs text-white"
                              style={{ backgroundColor: role.color + '40' }}
                            >
                              {role.name}
                            </span>
                          ) : (
                            <span className="text-[#A5A5A5] text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            person.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {person.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                          {person.net_salary ? (
                            <span>{person.net_salary.toFixed(2)} {person.salary_currency || 'TRY'}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#A5A5A5] text-sm">
                          <div className="space-y-1">
                            {person.email && <div className="flex items-center gap-1"><Mail size={12} /> {person.email}</div>}
                            {person.phone && <div className="flex items-center gap-1"><Phone size={12} /> {person.phone}</div>}
                            {!person.email && !person.phone && <span>-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            person.web_panel_active
                              ? 'bg-[#3EA6FF]/20 text-[#3EA6FF]'
                              : 'bg-[#2D2F33] text-[#A5A5A5]'
                          }`}>
                            {person.web_panel_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleOpenStaffDetail(person)}
                              size="sm"
                              variant="ghost"
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                              title="Detay"
                            >
                              Detay
                            </Button>
                            <Button
                              onClick={() => handleOpenDialog(person)}
                              size="sm"
                              variant="ghost"
                              className="text-[#3EA6FF] hover:text-[#2B8FE6]"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              onClick={() => handleToggleActive(person.id)}
                              size="sm"
                              variant="ghost"
                              className={person.is_active ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}
                            >
                              {person.is_active ? 'Pasif' : 'Aktif'}
                            </Button>
                            <Button
                              onClick={() => handleDelete(person.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Personel Formu - Sekme Yapısı */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
          setEditingStaff(null);
        }
      }}>
        <DialogContent className="max-w-5xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingStaff ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-8 mb-4">
                <TabsTrigger value="personal">Kişisel</TabsTrigger>
                <TabsTrigger value="contact">İletişim</TabsTrigger>
                <TabsTrigger value="work">İş</TabsTrigger>
                <TabsTrigger value="salary">Maaş</TabsTrigger>
                <TabsTrigger value="education">Eğitim</TabsTrigger>
                <TabsTrigger value="license">Ehliyet</TabsTrigger>
                <TabsTrigger value="web">Web Panel</TabsTrigger>
                <TabsTrigger value="other">Diğer</TabsTrigger>
              </TabsList>

              {/* Kişisel Bilgiler Tab */}
              <TabsContent value="personal" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Kişisel Bilgiler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name" className="text-white">Ad Soyad *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-white">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-white">Adres</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tc_no" className="text-white">TC Kimlik No</Label>
                    <Input
                      id="tc_no"
                      value={formData.tc_no}
                      onChange={(e) => setFormData({ ...formData, tc_no: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date" className="text-white">Doğum Tarihi</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-white">Cinsiyet</Label>
                    <Select value={formData.gender || undefined} onValueChange={(value) => setFormData({ ...formData, gender: value || null })}>
                      <SelectTrigger className="bg-[#1E1E1E] border-[#2D2F33] text-white">
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Erkek</SelectItem>
                        <SelectItem value="Female">Kadın</SelectItem>
                        <SelectItem value="Other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nationality" className="text-white">Uyruk</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* İletişim Tab */}
              <TabsContent value="contact" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Acil Durum İletişim Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name" className="text-white">Acil Durum İletişim Kişisi</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone" className="text-white">Acil Durum Telefonu</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* İş Bilgileri Tab */}
              <TabsContent value="work" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">İş Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_id" className="text-white">Personel No</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role_id" className="text-white">Rol</Label>
                    <Select value={formData.role_id || undefined} onValueChange={(value) => setFormData({ ...formData, role_id: value || null })}>
                      <SelectTrigger className="bg-[#1E1E1E] border-[#2D2F33] text-white">
                        <SelectValue placeholder="Rol seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hire_date" className="text-white">İşe Giriş Tarihi</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="termination_date" className="text-white">İşten Ayrılma Tarihi</Label>
                    <Input
                      id="termination_date"
                      type="date"
                      value={formData.termination_date}
                      onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active" className="text-white cursor-pointer">
                      Aktif Personel
                    </Label>
                  </div>
                </div>
              </TabsContent>

              {/* Maaş Bilgileri Tab */}
              <TabsContent value="salary" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Maaş Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gross_salary" className="text-white">Brüt Maaş</Label>
                    <Input
                      id="gross_salary"
                      type="number"
                      step="0.01"
                      value={formData.gross_salary}
                      onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="net_salary" className="text-white">Net Maaş</Label>
                    <Input
                      id="net_salary"
                      type="number"
                      step="0.01"
                      value={formData.net_salary}
                      onChange={(e) => setFormData({ ...formData, net_salary: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_currency" className="text-white">Para Birimi</Label>
                    <Select value={formData.salary_currency} onValueChange={(value) => setFormData({ ...formData, salary_currency: value })}>
                      <SelectTrigger className="bg-[#1E1E1E] border-[#2D2F33] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="advance_limit" className="text-white">Avans Limiti</Label>
                    <Input
                      id="advance_limit"
                      type="number"
                      step="0.01"
                      value={formData.advance_limit}
                      onChange={(e) => setFormData({ ...formData, advance_limit: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary_payment_day" className="text-white">Maaş Ödeme Günü</Label>
                    <Select 
                      value={formData.salary_payment_day ? formData.salary_payment_day.toString() : undefined} 
                      onValueChange={(value) => setFormData({ ...formData, salary_payment_day: value ? parseInt(value) : null })}
                    >
                      <SelectTrigger className="bg-[#1E1E1E] border-[#2D2F33] text-white">
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>Ayın {day}. Günü</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#A5A5A5] mt-1">Her ayın bu günü gelince personel otomatik olarak alacaklı duruma düşer</p>
                  </div>
                </div>
              </TabsContent>

              {/* Eğitim ve Yetenekler Tab */}
              <TabsContent value="education" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Eğitim ve Yetenekler</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Bildiği Diller</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLanguage();
                          }
                        }}
                        className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                        placeholder="Dil ekle (Enter)"
                      />
                      <Button type="button" onClick={addLanguage} variant="outline" className="border-[#2D2F33] text-white">
                        Ekle
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 bg-[#3EA6FF]/20 text-[#3EA6FF] rounded-full text-sm flex items-center gap-2">
                          {lang}
                          <XCircle size={14} className="cursor-pointer" onClick={() => removeLanguage(lang)} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-white">Yetenekler</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                        placeholder="Yetenek ekle (Enter)"
                      />
                      <Button type="button" onClick={addSkill} variant="outline" className="border-[#2D2F33] text-white">
                        Ekle
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-[#3EA6FF]/20 text-[#3EA6FF] rounded-full text-sm flex items-center gap-2">
                          {skill}
                          <XCircle size={14} className="cursor-pointer" onClick={() => removeSkill(skill)} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="education_level" className="text-white">Eğitim Seviyesi</Label>
                      <Select value={formData.education_level || undefined} onValueChange={(value) => setFormData({ ...formData, education_level: value || null })}>
                        <SelectTrigger className="bg-[#1E1E1E] border-[#2D2F33] text-white">
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="İlkokul">İlkokul</SelectItem>
                          <SelectItem value="Ortaokul">Ortaokul</SelectItem>
                          <SelectItem value="Lise">Lise</SelectItem>
                          <SelectItem value="Üniversite">Üniversite</SelectItem>
                          <SelectItem value="Yüksek Lisans">Yüksek Lisans</SelectItem>
                          <SelectItem value="Doktora">Doktora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="education_field" className="text-white">Eğitim Alanı</Label>
                      <Input
                        id="education_field"
                        value={formData.education_field}
                        onChange={(e) => setFormData({ ...formData, education_field: e.target.value })}
                        className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                        placeholder="Örn: Bilgisayar Mühendisliği"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Ehliyet Tab */}
              <TabsContent value="license" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Ehliyet Bilgileri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="driving_license_class" className="text-white">Ehliyet Sınıfı</Label>
                    <Input
                      id="driving_license_class"
                      value={formData.driving_license_class}
                      onChange={(e) => setFormData({ ...formData, driving_license_class: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                      placeholder="B, C, D, vb."
                    />
                  </div>
                  <div>
                    <Label htmlFor="driving_license_no" className="text-white">Ehliyet No</Label>
                    <Input
                      id="driving_license_no"
                      value={formData.driving_license_no}
                      onChange={(e) => setFormData({ ...formData, driving_license_no: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="driving_license_expiry" className="text-white">Ehliyet Bitiş Tarihi</Label>
                    <Input
                      id="driving_license_expiry"
                      type="date"
                      value={formData.driving_license_expiry}
                      onChange={(e) => setFormData({ ...formData, driving_license_expiry: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Web Panel ve Yetkiler Tab */}
              <TabsContent value="web" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#2D2F33]">
                    <Switch
                      id="web_panel_active"
                      checked={formData.web_panel_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, web_panel_active: checked })}
                    />
                    <Label htmlFor="web_panel_active" className="text-white cursor-pointer text-lg font-semibold">
                      Web Panel Erişimi Aktif
                    </Label>
                  </div>

                  {formData.web_panel_active && (
                    <>
                      <div className="grid grid-cols-2 gap-4 bg-[#2D2F33]/30 p-4 rounded-lg">
                        <div>
                          <Label htmlFor="username" className="text-white">Kullanıcı Adı *</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={!!editingStaff}
                            className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                            required={formData.web_panel_active}
                          />
                        </div>
                        <div>
                          <Label htmlFor="password" className="text-white">
                            {editingStaff ? 'Şifre (Değiştirmek için doldurun)' : 'Şifre *'}
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                            required={formData.web_panel_active && !editingStaff}
                          />
                        </div>
                      </div>

                      {/* Admin Yetkisi removed - Staff members always have role='user' */}
                      {/* Admins cannot create other admins - this is enforced by the backend */}

                      {/* Yetki Grupları */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Yetki Grupları</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-[#2D2F33] rounded-lg p-4">
                          {Object.entries(PERMISSION_GROUPS).map(([module, group]) => (
                            <Collapsible
                              key={module}
                              open={expandedGroups[module]}
                              onOpenChange={() => toggleGroup(module)}
                            >
                              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-[#2D2F33] rounded-lg hover:bg-[#3D3F43] transition-colors">
                                <div className="flex items-center gap-3">
                                  {expandedGroups[module] ? (
                                    <ChevronDown size={20} className="text-[#A5A5A5]" />
                                  ) : (
                                    <ChevronRight size={20} className="text-[#A5A5A5]" />
                                  )}
                                  <span className="text-white font-medium">{group.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isGroupAllSelected(module) ? (
                                    <CheckSquare
                                      size={18}
                                      className="text-[#3EA6FF] cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAllInGroup(module, false);
                                      }}
                                    />
                                  ) : isGroupPartiallySelected(module) ? (
                                    <Square
                                      size={18}
                                      className="text-[#3EA6FF] cursor-pointer border-2 border-[#3EA6FF]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAllInGroup(module, true);
                                      }}
                                    />
                                  ) : (
                                    <Square
                                      size={18}
                                      className="text-[#A5A5A5] cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAllInGroup(module, true);
                                      }}
                                    />
                                  )}
                                  <span className="text-xs text-[#A5A5A5]">
                                    Tümünü {isGroupAllSelected(module) ? 'Kaldır' : 'Seç'}
                                  </span>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 space-y-2 pl-8">
                                  {Object.entries(group.permissions).map(([action, label]) => (
                                    <div key={action} className="flex items-center gap-3 py-2">
                                      <Switch
                                        id={`${module}-${action}`}
                                        checked={getPermissionValue(module, action)}
                                        onCheckedChange={() => togglePermission(module, action)}
                                      />
                                      <Label
                                        htmlFor={`${module}-${action}`}
                                        className="text-sm text-[#A5A5A5] cursor-pointer"
                                      >
                                        {label}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Diğer Tab */}
              <TabsContent value="other" className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#2D2F33] pb-2">Diğer Bilgiler</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes" className="text-white">Notlar</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1E1E1E] border border-[#2D2F33] rounded-lg text-white focus:border-[#3EA6FF]"
                      rows="4"
                      placeholder="Personel hakkında notlar..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatar_url" className="text-white">Profil Fotoğrafı URL</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="bg-[#1E1E1E] border-[#2D2F33] text-white"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Form Butonları */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#2D2F33]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                  setEditingStaff(null);
                }}
                className="text-white hover:bg-[#2D2F33]"
              >
                <X size={16} className="mr-2" />
                İptal
              </Button>
              <Button
                type="submit"
                className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                <Save size={16} className="mr-2" />
                {editingStaff ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Personel Detay Dialog */}
      <Dialog open={staffDetailDialogOpen} onOpenChange={(open) => {
        setStaffDetailDialogOpen(open);
        if (!open) {
          setSelectedStaff(null);
          setStaffDetail(null);
        }
      }}>
        <DialogContent className="max-w-4xl bg-[#25272A] border-[#2D2F33] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{selectedStaff?.full_name} - Detaylar</span>
              <Button
                onClick={() => {
                  setStaffDetailDialogOpen(false);
                  handleOpenDialog(selectedStaff);
                }}
                variant="outline"
                size="sm"
                className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
              >
                <Edit size={16} className="mr-2" />
                Düzenle
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {staffDetail && (
            <div className="space-y-6 mt-4">
              {/* Özet Kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Güncel Bakiye */}
                <div className={`bg-[#25272A] border rounded-xl p-4 ${
                  (staffDetail.current_balance || 0) < 0 
                    ? 'border-orange-500/50 bg-orange-500/10' 
                    : (staffDetail.current_balance || 0) > 0
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-[#2D2F33]'
                }`}>
                  <div className="text-[#A5A5A5] text-xs mb-1">Güncel Bakiye</div>
                  <div className={`text-2xl font-bold ${
                    (staffDetail.current_balance || 0) < 0 
                      ? 'text-orange-400' 
                      : (staffDetail.current_balance || 0) > 0
                      ? 'text-red-400'
                      : 'text-white'
                  }`}>
                    {Math.abs(staffDetail.current_balance || 0).toFixed(2)} {staffDetail.current_balance_currency || 'TRY'}
                  </div>
                  {(staffDetail.current_balance || 0) < 0 && (
                    <div className="text-xs text-orange-400 mt-1">Personel alacaklı</div>
                  )}
                  {(staffDetail.current_balance || 0) > 0 && (
                    <div className="text-xs text-red-400 mt-1">Personel borçlu</div>
                  )}
                </div>
                
                {/* Maaş */}
                <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
                  <div className="text-[#A5A5A5] text-xs mb-1">Net Maaş</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedStaff?.net_salary?.toFixed(2) || '0.00'} {selectedStaff?.salary_currency || 'TRY'}
                  </div>
                </div>
                
                {/* Ödenmemiş Fazla Mesai */}
                <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
                  <div className="text-[#A5A5A5] text-xs mb-1">Ödenmemiş Fazla Mesai</div>
                  <div className="text-2xl font-bold text-[#3EA6FF]">
                    {staffDetail.unpaid_overtime_hours?.toFixed(1) || '0.0'} saat
                  </div>
                </div>
                
                {/* Bu Yıl İzin */}
                <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl p-4">
                  <div className="text-[#A5A5A5] text-xs mb-1">Bu Yıl Kullanılan İzin</div>
                  <div className="text-2xl font-bold text-green-400">
                    {staffDetail.used_leave_days?.toFixed(1) || '0.0'} gün
                  </div>
                </div>
              </div>
              
              {/* Maaş Günü Uyarısı */}
              {staffDetail.is_salary_due && (
                <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-orange-400" />
                    <div>
                      <p className="text-orange-400 font-semibold">Maaş Ödeme Zamanı</p>
                      <p className="text-orange-300 text-sm">Bu personelin maaşı ödenmeyi bekliyor.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setPaySalaryFormData({
                        amount: selectedStaff?.net_salary?.toString() || '',
                        currency: selectedStaff?.salary_currency || 'TRY',
                        payment_date: new Date().toISOString().split('T')[0],
                        description: `Maaş ödemesi - ${format(new Date(), 'MMMM yyyy', { locale: tr })}`
                      });
                      setPaySalaryDialogOpen(true);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Maaşı Öde
                  </Button>
                </div>
              )}
              
              {/* İşlem Butonları */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setPaySalaryFormData({
                      amount: selectedStaff?.net_salary?.toString() || '',
                      currency: selectedStaff?.salary_currency || 'TRY',
                      payment_date: new Date().toISOString().split('T')[0],
                      description: ''
                    });
                    setPaySalaryDialogOpen(true);
                  }}
                  className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
                >
                  Maaşı Öde
                </Button>
                <Button
                  onClick={() => {
                    setAdvanceFormData({
                      amount: '',
                      currency: selectedStaff?.salary_currency || 'TRY',
                      payment_date: new Date().toISOString().split('T')[0],
                      description: ''
                    });
                    setAddAdvanceDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                >
                  Avans Ekle
                </Button>
                <Button
                  onClick={() => {
                    setOvertimeFormData({
                      date: new Date().toISOString().split('T')[0],
                      hours: '',
                      hourly_rate: selectedStaff?.net_salary ? (selectedStaff.net_salary / 160).toFixed(2) : '',
                      currency: selectedStaff?.salary_currency || 'TRY',
                      description: ''
                    });
                    setAddOvertimeDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                >
                  Fazla Mesai Ekle
                </Button>
                <Button
                  onClick={() => {
                    setLeaveFormData({
                      leave_type: 'annual',
                      start_date: new Date().toISOString().split('T')[0],
                      end_date: new Date().toISOString().split('T')[0],
                      is_paid: false,
                      description: ''
                    });
                    setAddLeaveDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-[#2D2F33] text-white hover:bg-[#2D2F33]"
                >
                  İzin Ekle
                </Button>
              </div>
              
              {/* Maaş İşlem Geçmişi */}
              <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#2D2F33]">
                  <h3 className="text-lg font-semibold text-white">Maaş İşlem Geçmişi</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#2D2F33]">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">İşlem Tipi</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2F33]">
                      {staffDetail.salary_transactions?.length > 0 ? (
                        staffDetail.salary_transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-sm text-white">{transaction.payment_date}</td>
                            <td className="px-4 py-3 text-sm text-[#A5A5A5]">
                              {transaction.transaction_type === 'salary_payment' && 'Maaş Ödemesi'}
                              {transaction.transaction_type === 'advance_payment' && 'Avans'}
                              {transaction.transaction_type === 'overtime_payment' && 'Fazla Mesai'}
                              {transaction.transaction_type === 'deduction' && 'Kesinti'}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-semibold ${
                              transaction.transaction_type === 'salary_payment' || transaction.transaction_type === 'overtime_payment'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              {transaction.amount.toFixed(2)} {transaction.currency}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#A5A5A5]">{transaction.description || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-[#A5A5A5]">Henüz işlem kaydı yok</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Fazla Mesai Listesi */}
              {staffDetail.overtime_records && staffDetail.overtime_records.length > 0 && (
                <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#2D2F33]">
                    <h3 className="text-lg font-semibold text-white">Fazla Mesai Kayıtları</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2D2F33]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tarih</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Saat</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-white">Tutar</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Durum</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-white">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D2F33]">
                        {staffDetail.overtime_records.map((overtime) => (
                          <tr key={overtime.id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-sm text-white">{overtime.date}</td>
                            <td className="px-4 py-3 text-sm text-[#A5A5A5]">{overtime.hours} saat</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-white">
                              {overtime.amount?.toFixed(2) || '-'} {overtime.currency}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {overtime.is_paid ? (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ödendi</span>
                              ) : (
                                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs">Ödenmedi</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!overtime.is_paid && (
                                <Button
                                  onClick={() => handlePayOvertime(overtime.id)}
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-400 hover:bg-green-500/20"
                                >
                                  Öde
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* İzin Listesi */}
              {staffDetail.leave_records && staffDetail.leave_records.length > 0 && (
                <div className="bg-[#25272A] border border-[#2D2F33] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#2D2F33]">
                    <h3 className="text-lg font-semibold text-white">İzin Kayıtları</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2D2F33]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Başlangıç</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Bitiş</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Gün</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Tip</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-white">Ücretli</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D2F33]">
                        {staffDetail.leave_records.map((leave) => (
                          <tr key={leave.id} className="hover:bg-[#2D2F33]">
                            <td className="px-4 py-3 text-sm text-white">{leave.start_date}</td>
                            <td className="px-4 py-3 text-sm text-white">{leave.end_date}</td>
                            <td className="px-4 py-3 text-sm text-[#A5A5A5]">{leave.days} gün</td>
                            <td className="px-4 py-3 text-sm text-[#A5A5A5]">
                              {leave.leave_type === 'annual' && 'Yıllık İzin'}
                              {leave.leave_type === 'sick' && 'Hastalık'}
                              {leave.leave_type === 'unpaid' && 'Ücretsiz İzin'}
                              {leave.leave_type === 'maternity' && 'Doğum İzni'}
                              {leave.leave_type === 'other' && 'Diğer'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {leave.is_paid ? (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Evet</span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">Hayır</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Maaş Ödeme Dialog */}
      <Dialog open={paySalaryDialogOpen} onOpenChange={setPaySalaryDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Maaş Öde</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handlePaySalary();
          }} className="space-y-4 mt-4">
            <div>
              <Label className="text-white">Tutar *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paySalaryFormData.amount}
                onChange={(e) => setPaySalaryFormData({ ...paySalaryFormData, amount: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Para Birimi</Label>
              <Select
                value={paySalaryFormData.currency}
                onValueChange={(value) => setPaySalaryFormData({ ...paySalaryFormData, currency: value })}
              >
                <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Ödeme Tarihi</Label>
              <Input
                type="date"
                value={paySalaryFormData.payment_date}
                onChange={(e) => setPaySalaryFormData({ ...paySalaryFormData, payment_date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Açıklama</Label>
              <Input
                value={paySalaryFormData.description}
                onChange={(e) => setPaySalaryFormData({ ...paySalaryFormData, description: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                placeholder="Maaş ödemesi açıklaması..."
              />
            </div>
            <p className="text-xs text-orange-400">
              ⚠️ Maaş ödendiğinde personel bakiyesi sıfırlanacak ve cari hesaba eklenecektir.
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaySalaryDialogOpen(false)}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                Öde
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avans Ekle Dialog */}
      <Dialog open={addAdvanceDialogOpen} onOpenChange={setAddAdvanceDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Avans Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddAdvance();
          }} className="space-y-4 mt-4">
            <div>
              <Label className="text-white">Tutar *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={advanceFormData.amount}
                onChange={(e) => setAdvanceFormData({ ...advanceFormData, amount: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Para Birimi</Label>
              <Select
                value={advanceFormData.currency}
                onValueChange={(value) => setAdvanceFormData({ ...advanceFormData, currency: value })}
              >
                <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Ödeme Tarihi</Label>
              <Input
                type="date"
                value={advanceFormData.payment_date}
                onChange={(e) => setAdvanceFormData({ ...advanceFormData, payment_date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
              />
            </div>
            <div>
              <Label className="text-white">Açıklama</Label>
              <Input
                value={advanceFormData.description}
                onChange={(e) => setAdvanceFormData({ ...advanceFormData, description: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                placeholder="Avans açıklaması..."
              />
            </div>
            {selectedStaff?.advance_limit && (
              <p className="text-xs text-orange-400">
                ⚠️ Avans limiti: {selectedStaff.advance_limit} {selectedStaff.salary_currency || 'TRY'}
              </p>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddAdvanceDialogOpen(false)}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                Ekle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fazla Mesai Ekle Dialog */}
      <Dialog open={addOvertimeDialogOpen} onOpenChange={setAddOvertimeDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Fazla Mesai Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddOvertime();
          }} className="space-y-4 mt-4">
            <div>
              <Label className="text-white">Tarih *</Label>
              <Input
                type="date"
                value={overtimeFormData.date}
                onChange={(e) => setOvertimeFormData({ ...overtimeFormData, date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Saat *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={overtimeFormData.hours}
                onChange={(e) => setOvertimeFormData({ ...overtimeFormData, hours: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Saatlik Ücret</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overtimeFormData.hourly_rate}
                onChange={(e) => setOvertimeFormData({ ...overtimeFormData, hourly_rate: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                placeholder="Boş bırakılırsa otomatik hesaplanır"
              />
            </div>
            <div>
              <Label className="text-white">Para Birimi</Label>
              <Select
                value={overtimeFormData.currency}
                onValueChange={(value) => setOvertimeFormData({ ...overtimeFormData, currency: value })}
              >
                <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Açıklama</Label>
              <Input
                value={overtimeFormData.description}
                onChange={(e) => setOvertimeFormData({ ...overtimeFormData, description: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                placeholder="Fazla mesai açıklaması..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOvertimeDialogOpen(false)}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                Ekle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* İzin Ekle Dialog */}
      <Dialog open={addLeaveDialogOpen} onOpenChange={setAddLeaveDialogOpen}>
        <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">İzin Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddLeave();
          }} className="space-y-4 mt-4">
            <div>
              <Label className="text-white">İzin Tipi</Label>
              <Select
                value={leaveFormData.leave_type}
                onValueChange={(value) => setLeaveFormData({ ...leaveFormData, leave_type: value })}
              >
                <SelectTrigger className="bg-[#2D2F33] border-[#2D2F33] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Yıllık İzin</SelectItem>
                  <SelectItem value="sick">Hastalık</SelectItem>
                  <SelectItem value="unpaid">Ücretsiz İzin</SelectItem>
                  <SelectItem value="maternity">Doğum İzni</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Başlangıç Tarihi *</Label>
              <Input
                type="date"
                value={leaveFormData.start_date}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Bitiş Tarihi *</Label>
              <Input
                type="date"
                value={leaveFormData.end_date}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_paid"
                checked={leaveFormData.is_paid}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, is_paid: e.target.checked })}
                className="w-4 h-4 text-[#3EA6FF] bg-[#2D2F33] border-[#2D2F33] rounded"
              />
              <Label htmlFor="is_paid" className="text-white cursor-pointer">Ücretli İzin</Label>
            </div>
            <div>
              <Label className="text-white">Açıklama</Label>
              <Input
                value={leaveFormData.description}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, description: e.target.value })}
                className="bg-[#2D2F33] border-[#2D2F33] text-white"
                placeholder="İzin açıklaması..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddLeaveDialogOpen(false)}
                className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
              >
                Ekle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
};

export default StaffManagement;