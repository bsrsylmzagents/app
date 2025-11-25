import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Admin route'ları sadece super_admin için (sistem admin paneli)
  // owner ve admin rolleri kendi şirketlerini yönetir, tüm müşterileri göremez
  const isCorporateUser = user.role === 'corporate_user' || user.role === 'cari';
  const isSuperAdmin = user.role === 'super_admin' && !isCorporateUser;
  
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default AdminRoute;








