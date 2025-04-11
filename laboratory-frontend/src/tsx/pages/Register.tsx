import { useState } from 'react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = () => {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username]) return alert('使用者已存在');
    users[username] = { password };
    localStorage.setItem('users', JSON.stringify(users));
    alert('註冊成功');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/80 p-8 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-center">註冊帳號</h2>
        <input
          type="text"
          placeholder="帳號"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-2 border border-gray-300 rounded"
        />
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded"
        />
        <button
          onClick={handleRegister}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          註冊
        </button>
      </div>
    </div>
  );
};

export default Register;
