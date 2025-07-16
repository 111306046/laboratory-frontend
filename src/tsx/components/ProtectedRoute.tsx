import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 檢查是否有 token
  const token = localStorage.getItem('token');
  
  // 如果沒有 token，重定向到登入頁面
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // 如果有 token，渲染子組件
  return <>{children}</>;
};

export default ProtectedRoute; 