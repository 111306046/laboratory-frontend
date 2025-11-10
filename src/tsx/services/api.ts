// API 服務文件 - 處理所有後端 API 調用

// API 基礎配置
// 開發環境使用代理避免 CORS 問題，生產環境使用完整 URL
const API_BASE_URL = import.meta.env.DEV 
  ? '/api'  // 通過 Vite 代理（vite.config.ts 中已配置）
  : 'https://trochanteral-noncollusive-eunice.ngrok-free.dev/api';
const WS_BASE_URL = 'wss://trochanteral-noncollusive-eunice.ngrok-free.dev/ws';

// 資料介面定義
export interface RecentDataParams {
  company_lab: string;
  machine: string;
  number: number;
}

export interface SearchDataParams {
  company_lab: string;
  machine: string;
  start: string; // YYYY-MM-DD HH:MM:SS
  end: string;   // YYYY-MM-DD HH:MM:SS
  // 可選：要求後端以指定格式回傳
  format?: 'json' | 'excel';
}

// 原始 API 響應介面
export interface RawSensorData {
  _id: string;
  timestamp: string;
  machine: string;
  values: {
    temperature: number;
    humidity: number;
    pm25: number;
    pm10: number;
    pm25_average: number;
    pm10_average: number;
    co2: number;
    tvoc: number;
  };
}

// 處理後的感測器資料介面
export interface SensorData {
  timestamp: string;
  machine: string;
  temperatu: number;  // 溫度
  humidity: number;   // 濕度
  pm25: number;       // PM2.5
  pm10: number;       // PM10
  pm25_ave: number;   // PM2.5 平均值
  pm10_ave: number;   // PM10 平均值
  co2: number;        // 二氧化碳
  tvoc: number;       // 總揮發性有機化合物
  // 為了向後相容，保留一些舊欄位
  temperature?: number;
  status?: 'normal' | 'warning' | 'critical';
}

// 資料轉換函數：將原始 API 響應轉換為處理後的格式
export function transformRawSensorData(rawData: RawSensorData): SensorData {
  return {
    timestamp: rawData.timestamp,
    machine: rawData.machine,
    temperatu: rawData.values.temperature,
    humidity: rawData.values.humidity,
    pm25: rawData.values.pm25,
    pm10: rawData.values.pm10,
    pm25_ave: rawData.values.pm25_average,
    pm10_ave: rawData.values.pm10_average,
    co2: rawData.values.co2,
    tvoc: rawData.values.tvoc,
    // 向後相容
    temperature: rawData.values.temperature,
    status: 'normal' // 可以根據數值計算狀態
  };
}

export interface LabInfo {
  id: string;
  name: string;
  company: string;
  description: string;
  sensors: Array<{
    name: string;
    description: string;
    company: string;
    lab: string;
  }>;
}

export interface UserInfo {
  account: string;
  password?: string;
  func_permissions: string[];
  company: string;
  company_lab?: string;
  lab?: string | string[]; // 實驗室，可以是單個字符串或字符串陣列（支援多個實驗室）
}

// Refresh token 響應介面
interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string; // 新的 refresh_token（token rotation）
}

// Refresh token 相關的全局變數（避免並發刷新）
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Refresh token API 函數
async function refreshAccessToken(): Promise<string | null> {
  // 如果正在刷新，返回現有的 Promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    return null;
  }

  // 設置刷新標誌
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        // 添加 credentials 以處理 CORS
        credentials: 'omit', // 不使用 credentials，避免 CORS 問題
      });

      // 檢查是否為 CORS 錯誤
      if (response.status === 0 || response.type === 'opaque') {
        console.error('❌ CORS 錯誤：後端 /api/refresh 端點未正確配置 CORS');
        console.error('請確認後端已配置以下 CORS 設置：');
        console.error('  - Access-Control-Allow-Origin: * 或包含前端域名');
        console.error('  - Access-Control-Allow-Methods: POST');
        console.error('  - Access-Control-Allow-Headers: Content-Type');
        // 清除認證資訊
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_account');
        localStorage.removeItem('user_permissions');
        return null;
      }

      if (!response.ok) {
        // 嘗試讀取錯誤詳情
        let errorDetail = '';
        let errorData: any = null;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
              errorDetail = errorData.detail || errorData.message || errorText;
              // 處理 FastAPI 的 detail 格式（可能是字符串或數組）
              if (Array.isArray(errorData.detail)) {
                errorDetail = errorData.detail.map((e: any) => 
                  `${e.loc?.join('.')}: ${e.msg}`
                ).join(', ');
              } else if (typeof errorData.detail === 'string') {
                errorDetail = errorData.detail;
              }
            } catch {
              errorDetail = errorText;
            }
          }
        } catch (e) {
          // 無法讀取錯誤詳情
        }

        console.error(`❌ 刷新 token 失敗: ${response.status} ${response.statusText}`);
        if (errorDetail) {
          console.error('錯誤詳情:', errorDetail);
        }
        
        // 特別處理 401 錯誤
        if (response.status === 401) {
          console.error('🔍 401 Unauthorized 錯誤分析：');
          console.error('可能的原因：');
          console.error('  1. refresh_token 無效或已過期');
          console.error('  2. refresh_token 格式不正確');
          console.error('  3. 後端驗證邏輯失敗');
          console.error('');
          console.error('調試信息：');
          const storedRefreshToken = localStorage.getItem('refresh_token');
          if (storedRefreshToken) {
            console.error('  - localStorage 中有 refresh_token:', storedRefreshToken.substring(0, 20) + '...');
            // 嘗試解析 JWT（如果可能）
            try {
              const parts = storedRefreshToken.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.error('  - refresh_token 內容:', {
                  account: payload.account || '未知',
                  exp: payload.exp ? new Date(payload.exp * 1000).toLocaleString('zh-TW') : '未知',
                  isExpired: payload.exp ? Date.now() > payload.exp * 1000 : '未知'
                });
              }
            } catch (e) {
              console.error('  - 無法解析 refresh_token（可能不是 JWT 格式）');
            }
          } else {
            console.error('  - localStorage 中沒有 refresh_token');
          }
          console.error('  - 發送的請求體:', JSON.stringify({ refresh_token: '***' }));
        }
        
        // 刷新失敗，清除所有認證資訊
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_account');
        localStorage.removeItem('user_permissions');
        return null;
      }

      const data: RefreshTokenResponse = await response.json();
      
      // 驗證響應數據
      if (!data.access_token || !data.refresh_token) {
        console.error('❌ 刷新響應格式錯誤：缺少 access_token 或 refresh_token');
        return null;
      }
      
      // 保存新的 tokens
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      return data.access_token;
    } catch (error) {
      // 區分不同類型的錯誤
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ 網絡錯誤或 CORS 錯誤：無法連接到後端');
        console.error('請確認：');
        console.error('  1. 後端服務是否運行');
        console.error('  2. /api/refresh 端點是否正確配置 CORS');
      } else {
        console.error('❌ 刷新 token 時發生錯誤:', error);
      }
      
      // 清除認證資訊
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_account');
      localStorage.removeItem('user_permissions');
      return null;
    } finally {
      // 重置刷新標誌
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// 通用 API 調用函數
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // 如果是刷新 token 的請求，跳過自動刷新邏輯
  const isRefreshEndpoint = endpoint === '/refresh';
  
  let token = localStorage.getItem('token');
  
  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // 跳過 ngrok 的瀏覽器警告頁面
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  // 如果是 401 錯誤且不是刷新請求，嘗試自動刷新 token
  if (response.status === 401 && !isRefreshEndpoint) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // 使用新 token 重試原請求
      token = newToken;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });
    }
    // 如果刷新失敗，繼續執行錯誤處理邏輯
  }

  if (!response.ok) {
    let errorMessage = `請求失敗 (狀態碼: ${response.status})`;
    let hasDetailedError = false;
    
    // 嘗試讀取錯誤響應的詳細信息
    try {
      let errorText: string;
      try {
        // 先嘗試克隆響應
        errorText = await response.clone().text();
      } catch {
        // 如果克隆失敗，直接讀取（可能已經被讀取過，但對於錯誤響應通常可以再讀一次）
        errorText = await response.text();
      }
      
      if (errorText && !errorText.trim().startsWith('<!DOCTYPE')) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            // FastAPI 錯誤格式
            if (Array.isArray(errorJson.detail)) {
              errorMessage = errorJson.detail.map((e: any) => 
                `${e.loc?.join('.')}: ${e.msg}`
              ).join(', ') || errorMessage;
              hasDetailedError = errorJson.detail.length > 0;
            } else if (typeof errorJson.detail === 'string') {
              errorMessage = errorJson.detail;
              hasDetailedError = true;
            } else {
              errorMessage = JSON.stringify(errorJson.detail);
              hasDetailedError = true;
            }
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
            hasDetailedError = true;
          }
        } catch {
          // 如果不是 JSON，使用原始文本的前 200 字符
          if (errorText.length < 200) {
            errorMessage = errorText;
            hasDetailedError = true;
          }
        }
      }
    } catch {
      // 如果無法讀取錯誤信息，使用默認消息
    }
    
    // 根據狀態碼設置默認錯誤消息（僅當沒有詳細錯誤信息時）
    if (!hasDetailedError) {
      if (response.status === 502) {
        errorMessage = "服務器暫時無法連接，請稍後再試";
      } else if (response.status === 404) {
        errorMessage = "API 端點不存在";
      } else if (response.status === 500) {
        errorMessage = "服務器內部錯誤";
      } else if (response.status === 401) {
        errorMessage = "未授權，請重新登入";
        // 只有在刷新 token 也失敗或沒有 refresh_token 時才清除認證資訊
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken || isRefreshEndpoint) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_account');
            localStorage.removeItem('user_permissions');
          }
        }
      } else if (response.status === 403) {
        errorMessage = "權限不足，無法執行此操作";
      } else if (response.status === 422) {
        errorMessage = `請求參數驗證失敗: ${errorMessage}`;
      }
    } else {
      // 如果有詳細錯誤信息，但狀態碼是 403，確保顯示權限相關的提示
      if (response.status === 403 && (errorMessage.includes('Not authenticated') || errorMessage === `請求失敗 (狀態碼: ${response.status})`)) {
        errorMessage = "權限不足，無法執行此操作";
      }
      // 401 時清除認證資訊（如果刷新也失敗）
      if (response.status === 401 && typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken || isRefreshEndpoint) {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_account');
          localStorage.removeItem('user_permissions');
        }
      }
    }
    
    throw new Error(errorMessage);
  }

  // 檢查響應內容類型
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/xml')) {
    // 處理 XML 響應
    const xmlText = await response.text();
    return parseXMLToJSON(xmlText) as T;
  } else if (contentType && (
    contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || // .xlsx
    contentType.includes('application/vnd.ms-excel') || // .xls
    contentType.includes('application/octet-stream') ||
    contentType.includes('application/zip')
  )) {
    // 處理 Excel 檔案響應
    const blob = await response.blob();
    return {
      type: 'excel',
      blob: blob,
      filename: getFilenameFromResponse(response) || 'data.xlsx'
    } as T;
  } else {
    // 處理 JSON 響應
    try {
      const text = await response.text();
      
      // 檢查是否為 HTML 響應（可能是 ngrok 警告頁面或其他錯誤頁面）
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
        console.error('API 返回了 HTML 頁面而非 JSON:', text.substring(0, 200));
        throw new Error('API 返回了 HTML 頁面，請檢查 API 端點是否正確或服務器是否正常運行');
      }
      
      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        console.error('API 響應不是有效的 JSON:', text.substring(0, 100));
        throw new Error(`API 響應格式錯誤: ${text.substring(0, 50)}...`);
      }
    } catch (error) {
      // 如果讀取失敗
      if (error instanceof Error && (error.message.includes('API 響應格式錯誤') || error.message.includes('API 返回了 HTML'))) {
        throw error;
      }
      throw new Error(`API 響應格式錯誤，無法解析為 JSON 或文本`);
    }
  }
}

// 從響應中提取檔案名稱
function getFilenameFromResponse(response: Response): string | null {
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].replace(/['"]/g, '');
    }
  }
  return null;
}

// XML 解析函數
function parseXMLToJSON(xmlText: string): any {
  try {
    // 簡單的 XML 解析 - 可以根據實際 XML 結構調整
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // 檢查解析錯誤
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML 解析錯誤');
    }
    
    // 將 XML 轉換為 JSON 格式
    return xmlToJson(xmlDoc.documentElement);
  } catch (error) {
    console.error('XML 解析失敗:', error);
    throw new Error('資料格式錯誤');
  }
}

// XML 轉 JSON 的遞歸函數
function xmlToJson(xml: Element): any {
  const result: any = {};
  
  // 處理屬性
  if (xml.attributes.length > 0) {
    result['@attributes'] = {};
    for (let i = 0; i < xml.attributes.length; i++) {
      const attr = xml.attributes[i];
      result['@attributes'][attr.name] = attr.value;
    }
  }
  
  // 處理子節點
  if (xml.children.length === 0) {
    // 葉節點
    return xml.textContent || '';
  } else {
    // 有子節點
    for (let i = 0; i < xml.children.length; i++) {
      const child = xml.children[i];
      const childName = child.nodeName;
      
      if (result[childName]) {
        // 如果已經存在同名節點，轉換為數組
        if (!Array.isArray(result[childName])) {
          result[childName] = [result[childName]];
        }
        result[childName].push(xmlToJson(child));
      } else {
        result[childName] = xmlToJson(child);
      }
    }
  }
  
  return result;
}

// API 函數

// 1. 獲取最近資料
export async function getRecentData(params: RecentDataParams): Promise<SensorData[]> {
  const queryParams = new URLSearchParams({
    company_lab: params.company_lab,
    machine: params.machine,
    number: params.number.toString()
  });
  
  const rawData = await apiCall<RawSensorData[]>(`/getRecentData?${queryParams}`);
  
  // 轉換原始資料為處理後的格式
  return rawData.map(transformRawSensorData);
}

// 2. 搜尋資料
export async function searchData(params: SearchDataParams): Promise<SensorData[] | ExcelResponse> {
  // 將所有查詢參數做 URL 安全編碼，避免空白與特殊字元造成解析問題
  const queryParts = [
    `company_lab=${encodeURIComponent(params.company_lab)}`,
    `machine=${encodeURIComponent(params.machine)}`,
    `start=${encodeURIComponent(params.start)}`,
    `end=${encodeURIComponent(params.end)}`
  ];
  if (params.format) {
    queryParts.push(`format=${encodeURIComponent(params.format)}`);
  } else {
    // 預設期望 JSON
    queryParts.push('format=json');
  }
  const query = queryParts.join('&');
  
  const result = await apiCall<RawSensorData[] | ExcelResponse>(`/searchData?${query}`);
  
  // 檢查是否為 Excel 響應
  if (result && typeof result === 'object' && 'type' in result && result.type === 'excel') {
    return result as ExcelResponse;
  }
  
  // 轉換原始資料為處理後的格式
  const rawData = result as RawSensorData[];
  return rawData.map(transformRawSensorData);
}

// Excel 響應介面
export interface ExcelResponse {
  type: 'excel';
  blob: Blob;
  filename: string;
}

// 解析 Excel Blob 為 SensorData 陣列（需要 xlsx 套件）
export async function parseExcelToSensorData(excel: ExcelResponse): Promise<SensorData[]> {
  try {
    // 一律使用 CDN 版本，避免本地模組解析問題
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 使用 ESM CDN 並告知 Vite 忽略預打包
    const XLSX: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
    const arrayBuffer = await excel.blob.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    return rows.map((row) => {
      const toNum = (v: any): number => {
        const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
        return Number.isFinite(n) ? Number(n) : 0;
      };

      // 相容不同欄位命名
      const temperature = row.temperatu ?? row.temperature ?? row.temp ?? 0;
      const pm25Ave = row.pm25_ave ?? row.pm25_average ?? row.pm25Avg ?? 0;
      const pm10Ave = row.pm10_ave ?? row.pm10_average ?? row.pm10Avg ?? 0;

      const data: SensorData = {
        timestamp: String(row.timestamp ?? row.time ?? ''),
        machine: String(row.machine ?? ''),
        temperatu: toNum(temperature),
        humidity: toNum(row.humidity),
        pm25: toNum(row.pm25),
        pm10: toNum(row.pm10),
        pm25_ave: toNum(pm25Ave),
        pm10_ave: toNum(pm10Ave),
        co2: toNum(row.co2),
        tvoc: toNum(row.tvoc),
        temperature: toNum(temperature),
        status: 'normal'
      };
      return data;
    });
  } catch (err) {
    console.error('Excel-to-JSON 解析失敗:', err);
    throw new Error('Excel 檔案解析失敗，請改為下載 Excel');
  }
}

// 下載 Excel 檔案
export function downloadExcelFile(excelResponse: ExcelResponse): void {
  const url = window.URL.createObjectURL(excelResponse.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = excelResponse.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// 3. 登入
export interface LoginResponse {
  access_token: string;
  refresh_token?: string; // 刷新令牌，用於刷新 access_token
  func_permissions?: string[];
  company?: string;
}

export async function login(account: string, password: string): Promise<LoginResponse> {
  return apiCall<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ account, password })
  });
}

// 4. 獲取用戶列表
export async function getUsers(): Promise<UserInfo[]> {
  return apiCall<UserInfo[]>('/getUsers');
}

// 5. 創建用戶
export async function createUser(userData: Omit<UserInfo, 'account'> & { account: string }): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/createUser', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

// 6. 修改用戶權限
export async function modifyPermissions(account: string, func_permissions: string[]): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/modifyPermissions', {
    method: 'POST',
    body: JSON.stringify({ account, func_permissions })
  });
}

// 7. 獲取實驗室列表
export async function getLabs(): Promise<LabInfo[]> {
  return apiCall<LabInfo[]>('/getLabs');
}

// 8. 創建實驗室
export async function createLab(labData: Omit<LabInfo, 'id'>): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/createLab', {
    method: 'POST',
    body: JSON.stringify(labData)
  });
}

// 9. 修改實驗室
export async function modifyLab(labData: LabInfo): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/modifyLab', {
    method: 'POST',
    body: JSON.stringify(labData)
  });
}

// 10. 刪除實驗室
export interface DeleteLabRequest {
  id: string;
  company: string;
}

export async function deleteLab(payload: DeleteLabRequest): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/deleteLab', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// WebSocket 連接管理
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: Map<string, Function[]> = new Map();
  private lastSensor?: string; // 儲存最後使用的 sensor 參數
  private lastCompanyLab?: string; // 儲存最後使用的 companyLab
  private lastToken?: string; // 儲存最後使用的 token

  connect(token: string, companyLab: string = 'nccu_lab', sensor?: string): void {
    // 儲存參數以便重連時使用
    this.lastToken = token;
    this.lastCompanyLab = companyLab;
    if (sensor) {
      this.lastSensor = sensor;
    }

    // 如果已有連接且狀態為 OPEN，且參數相同，則不重新連接
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 檢查參數是否相同，如果相同則不需要重連
      if (this.lastCompanyLab === companyLab && this.lastSensor === sensor) {
        return;
      }
    }

    // 如果已有連接，先關閉
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 對 companyLab 進行處理（確保格式正確，但保留原有的下划線和大小寫）
    // 只移除空格和其他無效字符，保留下划線、字母、數字、連字符
    const safeCompanyLab = companyLab.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');

    // 構建 WebSocket URL
    // 注意：WebSocket URL 的路徑部分不需要 encodeURIComponent，只有查詢參數需要
    let wsUrl = `${WS_BASE_URL}/${safeCompanyLab}?token=${encodeURIComponent(token)}`;
    if (sensor) {
      wsUrl += `&sensor=${encodeURIComponent(sensor)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('創建 WebSocket 連接失敗:', error);
      this.emit('error', error);
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 驗證數據格式，確保必要字段存在
        if (!data || typeof data !== 'object') {
          return;
        }
        
        this.emit('data', data);
      } catch (error) {
        console.error('WebSocket 數據解析錯誤:', error);
        this.emit('error', error);
      }
    };

    this.ws.onclose = async (event) => {
      this.emit('disconnected', event);
      
      // 自動重連（只有在異常關閉時才重連，正常關閉不重連）
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        
        // 重連前嘗試獲取最新的 token（可能已刷新）
        const currentToken = localStorage.getItem('token') || this.lastToken || token;
        const currentCompanyLab = this.lastCompanyLab || companyLab;
        const currentSensor = this.lastSensor;
        
        setTimeout(() => {
          this.connect(currentToken, currentCompanyLab, currentSensor);
        }, this.reconnectInterval);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('WebSocket 重連次數已達上限');
      }
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 事件監聽器
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 創建 WebSocket 服務實例
export const wsService = new WebSocketService();

// 工具函數
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function parseDateTime(dateTimeStr: string): Date {
  // 解析 YYYY-MM-DD HH:MM:SS 格式
  const [datePart, timePart] = dateTimeStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

// 10. 產生 LINE 綁定碼
export interface GenerateBindingCodeResponse {
  status?: string;
  binding_code?: string;
  message: string;
}

export async function generateBindingCode(): Promise<GenerateBindingCodeResponse> {
  return apiCall<GenerateBindingCodeResponse>('/generate_binding_code', {
    method: 'POST'
  });
}

// 11. 刪除門檻（thresholds）
export interface DeleteThresholdsRequest {
  company: string;
  lab: string;
  sensor: string;
}

export interface DeleteThresholdsResponse {
  message: string;
}

export async function deleteThresholds(payload: DeleteThresholdsRequest): Promise<DeleteThresholdsResponse> {
  // 後端 API 使用 DELETE 方法
  return apiCall<DeleteThresholdsResponse>('/deleteThresholds', {
    method: 'DELETE',
    body: JSON.stringify(payload)
  });
}

// 12. 取得/設定門檻值
export interface ThresholdItem {
  company: string;
  lab: string;
  sensor: string; // 機器類型（如 "aq"），而不是具體的感測器類型
  min?: number | null;
  max?: number | null;
  enabled?: boolean;
  // 後端可能以 threshold 子文件儲存上下限與啟用狀態
  // threshold 可以是單個感測器的閾值，也可以是包含所有感測器閾值的對象
  threshold?: {
    min?: number | null;
    max?: number | null;
    enabled?: boolean;
  } | {
    // 包含所有感測器的閾值，鍵是感測器類型（如 "temperature", "humidity"）
    [sensorType: string]: {
      min?: number | null;
      max?: number | null;
      enabled?: boolean;
    } | undefined;
  };
}

export interface GetThresholdsParams {
  company: string;
  lab: string;
}

export async function getThresholds(params: GetThresholdsParams): Promise<ThresholdItem[]> {
  // 嘗試 POST JSON（某些後端 schema 以 body 驗證），失敗再回退 GET 查詢
  try {
    return await apiCall<ThresholdItem[]>(`/getThresholds`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  } catch (e) {
    const query = new URLSearchParams({ company: params.company, lab: params.lab }).toString();
    return apiCall<ThresholdItem[]>(`/getThresholds?${query}`);
  }
}

// 取得單一感測器的門檻值（部分後端要求必帶 sensor）
export interface GetThresholdBySensorParams {
  company: string;
  lab: string;
  sensor: string;
}

export async function getThresholdBySensor(params: GetThresholdBySensorParams): Promise<ThresholdItem | null> {
  // 以 GET + query 為唯一方式，避免後端 405
  // 注意：params.sensor 應該是機器類型（如 "aq"），而不是具體的感測器類型
  const query = new URLSearchParams({ company: params.company, lab: params.lab, sensor: params.sensor }).toString();
  try {
    const result = await apiCall<any>(`/getThresholds?${query}`);
    // 後端可能返回 {"message":"無資料"} 表示沒有數據
    if (result && typeof result === 'object') {
      if ('message' in result && result.message === '無資料') {
        return null; // 沒有數據
      }
      // 後端返回格式：{"company": company,"lab":lab,"sensor":sensor,"threshold":threshold_in_db["threshold"]}
      // threshold 裡面包含所有感測器的閾值，例如：{"threshold": {"temperature": {"min": 20, "max": 30, "enabled": true}, "humidity": {...}}}
      if ('threshold' in result) {
        // 直接返回整個 threshold 對象，包含所有感測器的閾值
        return {
          company: result.company || params.company,
          lab: result.lab || params.lab,
          sensor: result.sensor || params.sensor,
          threshold: result.threshold // 整個 threshold 對象，包含所有感測器的閾值
        } as ThresholdItem;
      }
    }
    if (Array.isArray(result)) return result[0] ?? null;
    return result as ThresholdItem | null;
  } catch (error: any) {
    // 如果是 404 或無資料的錯誤，返回 null
    if (error?.message?.includes('無資料') || error?.message?.includes('查無')) {
      return null;
    }
    throw error;
  }
}

// 前端更新格式轉換：後端期望 body 內含與 sensor 同名的物件
export type ThresholdUpdate = {
  company: string;
  lab: string;
  sensor: string; // 機器類型，應該是 "aq"
  sensorType?: string; // 要設置的感測器類型（如 "temperature", "humidity" 等），如果未提供則使用 sensor 參數
  min?: number | null;
  max?: number | null;
  enabled?: boolean;
};

export async function setThresholds(
  item: ThresholdUpdate, 
  currentThresholds?: Record<string, any> | null
): Promise<{ message: string }> {
  const { company, lab, sensor, sensorType, min, max, enabled } = item;
  
  // 驗證必要字段
  if (!sensor) {
    throw new Error('sensor 字段是必需的（機器類型，如 "aq"）');
  }
  if (!company) {
    throw new Error('company 字段是必需的');
  }
  if (!lab) {
    throw new Error('lab 字段是必需的');
  }
  
  // 確定要設置的感測器類型
  const targetSensorType = sensorType || sensor;
  
  // 確保 min 和 max 是有效數字或 null
  const validMin = (typeof min === 'number' && !isNaN(min)) ? min : null;
  const validMax = (typeof max === 'number' && !isNaN(max)) ? max : null;
  
  // 構建感測器配置物件（後端期望每個感測器都是 Optional[dict]）
  const sensorConfig: Record<string, unknown> = {};
  if (validMin !== null) {
    sensorConfig.min = validMin;
  }
  if (validMax !== null) {
    sensorConfig.max = validMax;
  }
  if (typeof enabled === 'boolean') {
    sensorConfig.enabled = enabled;
  }
  
  // 驗證 targetSensorType 值
  if (!targetSensorType || typeof targetSensorType !== 'string') {
    console.error('❌ 感測器類型字段無效:', targetSensorType);
    throw new Error(`感測器類型字段無效: ${targetSensorType}`);
  }
  
  // 後端的 threshold_data 模型要求所有感測器欄位都存在
  // 每個感測器都是 Optional[dict] 格式
  const allSensors = ['temperature','humidity','pm25','pm10','pm25_average','pm10_average','co2','tvoc'];
  
  // 驗證 targetSensorType 是否在允許的感測器列表中
  if (!allSensors.includes(targetSensorType)) {
    throw new Error(`不支持的感測器類型: ${targetSensorType}`);
  }
  
  // 後端期望的格式：threshold_data
  // 所有感測器字段都是 Optional[dict]，sensor/company/lab 在頂層
  // 注意：sensor 字段必須在頂層，值是機器類型（如 "aq"）
  const payload: Record<string, unknown> = {
    company,
    lab,
    sensor, // sensor 字段必須在頂層，值是機器類型（如 "aq"）
  };
  
  // 添加所有感測器字段（每個都是 Optional[dict]）
  // 如果提供了 currentThresholds，則保留其他感測器的值；否則設為 null
  allSensors.forEach((key) => {
    if (key === targetSensorType) {
      // 目標感測器使用新的配置物件（dict 格式）
      payload[key] = Object.keys(sensorConfig).length > 0 ? sensorConfig : null;
    } else {
      // 其他感測器：如果有 currentThresholds 且該感測器存在，保留原值；否則設為 null
      if (currentThresholds && typeof currentThresholds === 'object' && key in currentThresholds) {
        const existingValue = currentThresholds[key];
        // 如果現有值是有效對象，保留它；否則設為 null
        if (existingValue && typeof existingValue === 'object' && existingValue !== null) {
          payload[key] = existingValue;
        } else {
          payload[key] = null;
        }
      } else {
        payload[key] = null;
      }
    }
  });
  
  // 最終驗證：確保 sensor 字段存在
  if (!('sensor' in payload) || !payload.sensor) {
    console.error('❌ payload 缺少 sensor 字段！', payload);
    throw new Error('payload 必須包含 sensor 字段');
  }
  
  return apiCall<{ message: string }>(`/setThresholds`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 13. 管理公司（新增/修改 extra_auth）
export interface ManageCompanyRequest {
  company: string;
  extra_auth: boolean;
  IP: string;
}

export async function manageCompany(payload: ManageCompanyRequest): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/manageCompany`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 14. 獲取公司列表
export interface CompanyInfo {
  company: string;
  extra_auth?: boolean;
}

// 後端目前只返回字符串陣列，需要修改後端以返回完整物件陣列
export async function getCompany(): Promise<string[]> {
  return apiCall<string[]>('/getCompany');
}

// 15. 刪除公司
export interface DeleteCompanyRequest {
  company: string;
  extra_auth?: boolean;
  IP?: string;
}

export async function deleteCompany(payload: DeleteCompanyRequest): Promise<{ message: string }> {
  // 後端需要 extra_auth 和 IP 字段，即使刪除時也必須提供
  // 使用默認值或可選參數
  const requestPayload = {
    company: payload.company,
    extra_auth: payload.extra_auth ?? false,
    IP: payload.IP ?? ''
  };
  
  return apiCall<{ message: string }>('/deleteCompany', {
    method: 'POST',
    body: JSON.stringify(requestPayload)
  });
}

// 16. 登出
export interface LogoutRequest {
  refresh_token: string;
}

export async function logout(refreshToken: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

// 17. 刪除用戶
export interface DeleteUserRequest {
  account: string;
}

export async function deleteUser(payload: DeleteUserRequest): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/deleteUser', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 18. 機器控制
export interface MachineControlRequest {
  company: string;
  machine: string;
}

export async function machineOn(payload: MachineControlRequest): Promise<any> {
  return apiCall<any>('/machineOn', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function machineOff(payload: MachineControlRequest): Promise<any> {
  return apiCall<any>('/machineOff', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}