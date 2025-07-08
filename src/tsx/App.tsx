import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Datarecords from './pages/data-records';
import Layout from './components/layout';
import AddUser from './pages/PU-adduser'
import LaboratoryManagement from './pages/PU-LaborataryMnagement';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/data-records" element={<Layout><Datarecords /></Layout>} />
        <Route path="/dashboard" element={<Layout><Home /></Layout>} />
        <Route path="/PU-addusers" element={<Layout><AddUser /></Layout>} />
        <Route path="/PU-laboratarymnagement" element={<Layout><LaboratoryManagement /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
