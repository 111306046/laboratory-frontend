import React from 'react';
// 權限管理工具 - 基於後端驗證邏輯

export const PERMISSIONS = {
  CREATE_USER: 'create_user',
  MODIFY_USER: 'modify_user',
  GET_USERS: 'get_users',
  MODIFY_LAB: 'modify_lab',
  GET_LABS: 'get_labs',
  VIEW_DATA: 'view_data',
  SET_THRESHOLDS: 'set_thresholds',
  CONTROL_MACHINE: 'control_machine',
  CHANGE_PASSWORD: 'change_password',
  SUPERUSER: 'superuser',
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
  'set_thresholds',
  'control_machine',
  'change_password',
  'superuser',
] as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.CREATE_USER]: '創建用戶',
  [PERMISSIONS.MODIFY_USER]: '修改用戶',
  [PERMISSIONS.GET_USERS]: '查看用戶列表',
  [PERMISSIONS.MODIFY_LAB]: '修改實驗室',
  [PERMISSIONS.GET_LABS]: '查看實驗室',
  [PERMISSIONS.VIEW_DATA]: '查看數據',
  [PERMISSIONS.SET_THRESHOLDS]: '設置警報閾值',
  [PERMISSIONS.CONTROL_MACHINE]: '控制機器',
  [PERMISSIONS.CHANGE_PASSWORD]: '修改密碼',
  [PERMISSIONS.SUPERUSER]: '超級使用者',
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

// 獲取所有允許的權限選項（排除 superuser，因為它不能手動分配）
// 如果公司沒有 extra_auth，則排除 set_thresholds 和 allow_notify 相關權限
export const getPermissionOptions = (companyExtraAuth?: boolean) => {
  const result = ALLOWED_PERMISSIONS
    .filter(permission => {
      // 排除 superuser
      if (permission === 'superuser') return false;
      
      // 如果公司明確沒有 extra_auth（嚴格等於 false），排除 set_thresholds
      // 如果 companyExtraAuth 為 true、undefined 或其他值，則包含 set_thresholds
      if (companyExtraAuth === false && permission === 'set_thresholds') {
        return false;
      }
      return true;
    })
    .map(permission => ({
      value: permission,
      label: PERMISSION_LABELS[permission]
    }));
  return result;
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