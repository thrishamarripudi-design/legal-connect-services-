import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, token } = useSelector((state) => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'ADMIN' ? '/admin' : user.role === 'PROVIDER' ? '/provider' : '/citizen';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
