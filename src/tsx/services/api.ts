// API 服務文件 - 處理所有後端 API 調用

// API 基礎配置
const API_BASE_URL = 'http://13.211.240.55/api';
const WS_BASE_URL = 'ws://13.211.240.55/ws';

// 數據介面定義
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

// 處理後的傳感器數據介面
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
  // 為了向後兼容，保留一些舊欄位
  temperature?: number;
  status?: 'normal' | 'warning' | 'critical';
}

// 數據轉換函數：將原始 API 響應轉換為處理後的格式
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
    // 向後兼容
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
}

// 通用 API 調用函數
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `請求失敗 (狀態碼: ${response.status})`;
    
    if (response.status === 502) {
      errorMessage = "服務器暫時無法連接，請稍後再試";
    } else if (response.status === 404) {
      errorMessage = "API 端點不存在";
    } else if (response.status === 500) {
      errorMessage = "服務器內部錯誤";
    } else if (response.status === 401) {
      errorMessage = "未授權，請重新登入";
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
    // 處理 Excel 文件響應
    const blob = await response.blob();
    return {
      type: 'excel',
      blob: blob,
      filename: getFilenameFromResponse(response) || 'data.xlsx'
    } as T;
  } else {
    // 處理 JSON 響應
    try {
      return await response.json();
    } catch (error) {
      // 如果不是有效的 JSON，先克隆響應再讀取文本
      const clonedResponse = response.clone();
      try {
        const text = await clonedResponse.text();
        console.error('API 響應不是有效的 JSON:', text.substring(0, 100));
        throw new Error(`API 響應格式錯誤: ${text.substring(0, 50)}...`);
      } catch (textError) {
        throw new Error(`API 響應格式錯誤，無法解析為 JSON 或文本`);
      }
    }
  }
}

// 從響應中提取文件名
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
    throw new Error('數據格式錯誤');
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

// 1. 獲取最近數據
export async function getRecentData(params: RecentDataParams): Promise<SensorData[]> {
  const queryParams = new URLSearchParams({
    company_lab: params.company_lab,
    machine: params.machine,
    number: params.number.toString()
  });
  
  const rawData = await apiCall<RawSensorData[]>(`/getRecentData?${queryParams}`);
  
  // 轉換原始數據為處理後的格式
  return rawData.map(transformRawSensorData);
}

// 2. 搜索數據
export async function searchData(params: SearchDataParams): Promise<SensorData[] | ExcelResponse> {
  // 後端希望空格為實際空格而非 %20，因此僅編碼非時間欄位
  const query = `company_lab=${encodeURIComponent(params.company_lab)}&machine=${encodeURIComponent(params.machine)}&start=${params.start}&end=${params.end}`;
  // 調試輸出：觀察實際查詢參數（可於生產環境移除）
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.debug('[searchData] query', {
      company_lab: params.company_lab,
      machine: params.machine,
      start: params.start,
      end: params.end,
      url: `/searchData?${query}`
    });
  }
  
  const result = await apiCall<RawSensorData[] | ExcelResponse>(`/searchData?${query}`);
  
  // 檢查是否為 Excel 響應
  if (result && typeof result === 'object' && 'type' in result && result.type === 'excel') {
    return result as ExcelResponse;
  }
  
  // 轉換原始數據為處理後的格式
  const rawData = result as RawSensorData[];
  return rawData.map(transformRawSensorData);
}

// Excel 響應介面
export interface ExcelResponse {
  type: 'excel';
  blob: Blob;
  filename: string;
}

// 下載 Excel 文件
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
export async function login(account: string, password: string): Promise<{ access_token: string }> {
  return apiCall<{ access_token: string }>('/login', {
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

// WebSocket 連接管理
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string, companyLab: string = 'nccu_lab'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // 嘗試不同的 WebSocket URL 格式
    const wsUrl = `${WS_BASE_URL}/${companyLab}?token=${token}`;
    console.log('嘗試連接 WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket 連接成功');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('data', data);
      } catch (error) {
        console.error('WebSocket 數據解析錯誤:', error);
        this.emit('error', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket 連接關閉:', event.code, event.reason);
      console.log('關閉代碼說明:', this.getCloseCodeDescription(event.code));
      this.emit('disconnected', event);
      
      // 自動重連
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`嘗試重連 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
          this.connect(token, companyLab);
        }, this.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 錯誤:', error);
      console.error('WebSocket URL:', wsUrl);
      console.error('Token 長度:', token.length);
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

  private getCloseCodeDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
      1000: '正常關閉',
      1001: '端點離開',
      1002: '協議錯誤',
      1003: '不支持的數據類型',
      1006: '異常關閉',
      1007: '數據格式錯誤',
      1008: '策略違反',
      1009: '消息太大',
      1010: '缺少擴展',
      1011: '服務器錯誤',
      1015: 'TLS 握手失敗'
    };
    return descriptions[code] || `未知錯誤代碼: ${code}`;
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
