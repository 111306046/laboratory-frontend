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
import MachineControl from './pages/MachineControl';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/data-records" element={<ProtectedRoute requiredPermission="view_data"><Layout><DataRecords /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/PU-addusers" element={<ProtectedRoute><Layout><AddUser /></Layout></ProtectedRoute>} />
        <Route path="/PU-laboratarymnagement" element={<ProtectedRoute><Layout><LaboratoryManagement /></Layout></ProtectedRoute>} />        
        <Route path="/alert" element={<ProtectedRoute requiredPermission="view_alerts"><Layout><Alert /></Layout></ProtectedRoute>} />
        <Route path="/manage-company" element={<ProtectedRoute><Layout><ManageCompany /></Layout></ProtectedRoute>} />
        <Route path="/managecompany" element={<ProtectedRoute><Layout><ManageCompany /></Layout></ProtectedRoute>} />
        <Route path="/static-chart" element={<ProtectedRoute><Layout><StaticChart /></Layout></ProtectedRoute>} />
        <Route path="/machine-control" element={<ProtectedRoute requiredPermission="control_machine"><Layout><MachineControl /></Layout></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
