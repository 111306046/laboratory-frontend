import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import DataRecords from './pages/Data-records';
import Layout from './components/Layout';
import AddUser from './pages/PU-adduser';
import LaboratoryManagement from './pages/PU-LaborataryMnagement';
import ProtectedRoute from './components/ProtectedRoute';
import Alert from './pages/Alert';
import StaticChart from './pages/StaticChart';
import ManageCompany from './pages/ManageCompany';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute requiredPermission="view_data"><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/data-records" element={<ProtectedRoute requiredPermission="view_data"><Layout><DataRecords /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requiredPermission="view_data"><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/PU-addusers" element={<ProtectedRoute requiredPermission="get_users"><Layout><AddUser /></Layout></ProtectedRoute>} />
        <Route path="/PU-laboratarymnagement" element={<ProtectedRoute requiredPermission="get_labs"><Layout><LaboratoryManagement /></Layout></ProtectedRoute>} />        
        <Route path="/alert" element={<ProtectedRoute requiredPermission="set_thresholds"><Layout><Alert /></Layout></ProtectedRoute>} />
        <Route path="/manage-company" element={<ProtectedRoute requiredPermission="superuser"><Layout><ManageCompany /></Layout></ProtectedRoute>} />
        <Route path="/static-chart" element={<ProtectedRoute requiredPermission="view_data"><Layout><StaticChart /></Layout></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
