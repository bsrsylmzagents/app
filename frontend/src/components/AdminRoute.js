import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const company = JSON.parse(localStorage.getItem('company') || '{}');
  
  const isAdmin = user.role === 'admin' || (user.is_admin && company.code === '1000');
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default AdminRoute;







