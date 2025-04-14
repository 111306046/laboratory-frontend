import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
        <Route path="/login" element={<Login />} />
>>>>>>> Stashed changes
=======
        <Route path="/login" element={<Login />} />
>>>>>>> Stashed changes
      </Routes>
    </BrowserRouter>
  );
}

export default App;
