import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import UserManagement from './pages/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { PermissionLevel } from './utils/auth';
import Home from './pages/Home';
import DataRecords from './pages/Data-records';
import AddUser from './pages/PU-adduser';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Home />} />
          
          {/* 用戶管理頁面 - 需要 superuser 或 admin 權限 */}
          <Route
            path="user-management"
            element={
              <ProtectedRoute requiredPermission={PermissionLevel.ADMIN}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          
          <Route path="data-records" element={<DataRecords />} />
          <Route path="PU-addusers" element={<AddUser />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
