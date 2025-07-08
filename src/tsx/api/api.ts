import axios from 'axios';

const API_BASE = 'http://13.211.240.55/api';

// 建立 axios instance
const api = axios.create({
  baseURL: API_BASE,
});

// 自動帶入 access_token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// API 封裝
export const login = (account: string, password: string) =>
  api.post('/login', { account, password });

export const createUser = (data: {
  account: string;
  password: string;
  func_permissions: string[];
  company: string;
}) => api.post('/createUser', data);

export const modifyPermissions = (data: {
  account: string;
  func_permissions: string[];
}) => api.post('/modifyPermissions', data);

export const getUsers = () => api.get('/getUsers');

export const createLab = (data: {
  name: string;
  description: string;
  sensors: Array<{
    name: string;
    description: string;
    company: string;
    lab: string;
  }>;
  company: string;
}) => api.post('/createLab', data);

export const modifyLab = (data: {
  id: string;
  name: string;
  description: string;
  sensors: Array<{
    name: string;
    description: string;
    company: string;
    lab: string;
  }>;
  company: string;
}) => api.post('/modifyLab', data);

export const getLabs = () => api.get('/getLabs');

export const getDataRecords = (queryParams: string) => api.get(`/data-records?${queryParams}`); 