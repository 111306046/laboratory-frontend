// 測試 Refresh Token 機制的工具函數
// 可以在瀏覽器 Console 中使用這些函數進行測試

/**
 * 檢查當前的 token 狀態
 */
export function checkTokenStatus() {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  console.log('=== Token 狀態檢查 ===');
  console.log('Access Token:', token ? `${token.substring(0, 20)}...` : '無');
  console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : '無');
  
  if (token) {
    try {
      // 嘗試解析 JWT（簡單解析，不驗證簽名）
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Access Token 過期時間:', new Date(payload.exp * 1000).toLocaleString('zh-TW'));
      console.log('Access Token 是否過期:', Date.now() > payload.exp * 1000 ? '是' : '否');
    } catch (e) {
      console.log('無法解析 Access Token');
    }
  }
  
  if (refreshToken) {
    try {
      const payload = JSON.parse(atob(refreshToken.split('.')[1]));
      console.log('Refresh Token 過期時間:', new Date(payload.exp * 1000).toLocaleString('zh-TW'));
      console.log('Refresh Token 是否過期:', Date.now() > payload.exp * 1000 ? '是' : '否');
    } catch (e) {
      console.log('無法解析 Refresh Token');
    }
  }
  
  return { token, refreshToken };
}

/**
 * 清除 access_token 來測試自動刷新
 */
export function simulateTokenExpiry() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('⚠️ 沒有 access_token 可清除');
    return;
  }
  
  localStorage.removeItem('token');
  console.log('✅ 已清除 access_token');
  console.log('現在執行任何需要認證的操作，應該會自動觸發 token 刷新');
  console.log('請觀察 Console 中的日誌：');
  console.log('  - "收到 401 錯誤，嘗試刷新 token..."');
  console.log('  - "成功刷新 access_token" 或 "刷新 token 失敗"');
}

/**
 * 手動測試刷新 token
 */
export async function testRefreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    console.error('❌ 沒有 refresh_token，請先登入');
    return;
  }
  
  console.log('🔄 開始測試刷新 token...');
  
  try {
    const response = await fetch('https://trochanteral-noncollusive-eunice.ngrok-free.dev/api/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 刷新失敗:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ 刷新成功！');
    console.log('新的 access_token:', data.access_token ? `${data.access_token.substring(0, 20)}...` : '無');
    console.log('新的 refresh_token:', data.refresh_token ? `${data.refresh_token.substring(0, 20)}...` : '無');
    
    // 檢查是否已保存到 localStorage
    const savedToken = localStorage.getItem('token');
    const savedRefreshToken = localStorage.getItem('refresh_token');
    console.log('✅ localStorage 已更新:', {
      token: savedToken ? '是' : '否',
      refresh_token: savedRefreshToken ? '是' : '否'
    });
  } catch (error) {
    console.error('❌ 刷新時發生錯誤:', error);
  }
}

/**
 * 測試自動刷新機制（清除 token 後發起 API 請求）
 */
export async function testAutoRefresh() {
  console.log('🧪 測試自動刷新機制...');
  
  // 1. 保存原始 token
  const originalToken = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!originalToken || !refreshToken) {
    console.error('❌ 沒有 token 或 refresh_token，請先登入');
    return;
  }
  
  console.log('1️⃣ 清除 access_token...');
  localStorage.removeItem('token');
  
  console.log('2️⃣ 發起需要認證的 API 請求（應該會觸發自動刷新）...');
  
  try {
    // 使用 apiCall（需要從 api.ts 導入，這裡僅作示例）
    // 在實際使用時，可以訪問任何需要認證的頁面或執行 API 調用
    const response = await fetch('https://trochanteral-noncollusive-eunice.ngrok-free.dev/api/getUsers', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'ngrok-skip-browser-warning': 'true',
      }
    });
    
    console.log('3️⃣ API 請求響應:', response.status);
    
    if (response.ok) {
      console.log('✅ 自動刷新成功！API 請求成功');
    } else {
      console.error('❌ API 請求失敗:', response.status);
    }
    
    // 恢復原始 token（可選）
    if (originalToken) {
      localStorage.setItem('token', originalToken);
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

// 在瀏覽器中可以使用：
// import { checkTokenStatus, simulateTokenExpiry, testRefreshToken } from './utils/testRefreshToken';
// 然後在 Console 中執行：
// checkTokenStatus()
// simulateTokenExpiry()
// testRefreshToken()

