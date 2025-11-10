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
  CHANGE_PASSWORD: 'change_password',
  MODIFY_NOTIFICATION: 'modify_notification',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// 後端允許的權限列表 - 完全匹配後端 func_auth 和 extra_func_auth
// func_auth: ["create_user","modify_user","get_users","modify_lab","get_labs","view_data","change_password"]
// extra_func_auth: ["set_thresholds","modify_notification"]
// 注意：control_machine 已移除，不再使用
export const ALLOWED_PERMISSIONS: Permission[] = [
  'create_user',
  'modify_user', 
  'get_users',
  'modify_lab',
  'get_labs',
  'view_data',
  'change_password',
  'set_thresholds',
  'modify_notification',
] as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.CREATE_USER]: '創建用戶',
  [PERMISSIONS.MODIFY_USER]: '修改用戶',
  [PERMISSIONS.GET_USERS]: '查看用戶列表',
  [PERMISSIONS.MODIFY_LAB]: '修改實驗室',
  [PERMISSIONS.GET_LABS]: '查看實驗室',
  [PERMISSIONS.VIEW_DATA]: '查看數據',
  [PERMISSIONS.SET_THRESHOLDS]: '設置警報閾值',
  [PERMISSIONS.CHANGE_PASSWORD]: '修改密碼',
  [PERMISSIONS.MODIFY_NOTIFICATION]: '修改通知',
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
// 如果公司沒有 extra_auth，則排除 extra_func_auth 相關權限（set_thresholds, modify_notification）
export const getPermissionOptions = (companyExtraAuth?: boolean) => {
  const result = ALLOWED_PERMISSIONS
    .filter(permission => {
      // 如果公司明確沒有 extra_auth（嚴格等於 false），排除 extra_func_auth 權限
      // extra_func_auth: ["set_thresholds","modify_notification"]
      if (companyExtraAuth === false) {
        if (permission === 'set_thresholds' || permission === 'modify_notification') {
          return false;
        }
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