import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Datarecords from './pages/Data-records';
import Layout from './components/Layout';
import AddUser from './pages/PU-adduser'
import LaboratoryManagement from './pages/PU-LaborataryMnagement';
import ProtectedRoute from './components/ProtectedRoute';
import Alert from './pages/Alert';
import StaticChart from './pages/StaticChart'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/data-records" element={<ProtectedRoute><Layout><Datarecords /></Layout></ProtectedRoute>} />
        <Route path="/alert" element={<ProtectedRoute><Layout><Alert /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/PU-addusers" element={<ProtectedRoute><Layout><AddUser /></Layout></ProtectedRoute>} />
        <Route path="/PU-laboratarymnagement" element={<ProtectedRoute><Layout><LaboratoryManagement /></Layout></ProtectedRoute>} />        
        <Route path="/static-chart" element={<ProtectedRoute><Layout><StaticChart /></Layout></ProtectedRoute>} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
