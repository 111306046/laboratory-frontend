import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasPermission, getUserPermissions, PermissionLevel } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const userPermissions = getUserPermissions();
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasPermission(userPermissions, requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute; 