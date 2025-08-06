import React from 'react';
// 權限管理工具 - 基於後端驗證邏輯

export const PERMISSIONS = {
  CREATE_USER: 'create_user',
  MODIFY_USER: 'modify_user',
  GET_USERS: 'get_users',
  MODIFY_LAB: 'modify_lab',
  GET_LABS: 'get_labs',
  VIEW_DATA: 'view_data',
  CONTROL_MACHINE: 'control_machine',
  CHANGE_PASSWORD: 'change_password'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// 後端允許的權限列表 - 完全匹配用戶提供的 auth 數組
export const ALLOWED_PERMISSIONS: Permission[] = [
  'create_user',
  'modify_user', 
  'get_users',
  'modify_lab',
  'get_labs',
  'view_data',
  'control_machine',
  'change_password'
] as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.CREATE_USER]: '創建用戶',
  [PERMISSIONS.MODIFY_USER]: '修改用戶',
  [PERMISSIONS.GET_USERS]: '查看用戶列表',
  [PERMISSIONS.MODIFY_LAB]: '修改實驗室',
  [PERMISSIONS.GET_LABS]: '查看實驗室',
  [PERMISSIONS.VIEW_DATA]: '查看數據',
  [PERMISSIONS.CONTROL_MACHINE]: '控制機器',
  [PERMISSIONS.CHANGE_PASSWORD]: '修改密碼'
};

// 驗證權限是否在允許列表中
export const validatePermissions = (permissions: string[]): Permission[] => {
  return permissions.filter(permission => 
    ALLOWED_PERMISSIONS.includes(permission as Permission)
  ) as Permission[];
};

// 檢查權限是否有效
export const isValidPermission = (permission: string): boolean => {
  return ALLOWED_PERMISSIONS.includes(permission as Permission);
};

// 獲取所有允許的權限選項
export const getPermissionOptions = () => {
  return ALLOWED_PERMISSIONS.map(permission => ({
    value: permission,
    label: PERMISSION_LABELS[permission]
  }));
};

// 測試函數 - 驗證權限系統
export const testPermissionSystem = () => {
  console.log('=== 權限系統測試 ===');
  console.log('允許的權限:', ALLOWED_PERMISSIONS);
  
  // 測試有效權限
  const validPermissions = ['create_user', 'view_data', 'change_password'];
  console.log('有效權限測試:', validPermissions);
  console.log('驗證結果:', validatePermissions(validPermissions));
  
  // 測試無效權限
  const invalidPermissions = ['create_user', 'invalid_permission', 'view_data'];
  console.log('無效權限測試:', invalidPermissions);
  console.log('驗證結果:', validatePermissions(invalidPermissions));
  
  // 測試權限選項
  console.log('權限選項:', getPermissionOptions());
}; 

// 權限判斷工具
export function hasPermission(userPermissions: Permission[], required: Permission | Permission[]) {
  if (Array.isArray(required)) {
    return required.some(p => userPermissions.includes(p));
  }
  return userPermissions.includes(required);
}

// 權限元件
type PermissionGateProps = {
  permissions: Permission[];
  required: Permission | Permission[];
  children: React.ReactNode;
};

export const PermissionGate: React.FC<PermissionGateProps> = ({ permissions, required, children }) => {
  return hasPermission(permissions, required) ? (<>{children}</>) : null;
}; 