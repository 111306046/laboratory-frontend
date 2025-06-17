// 權限等級定義
export const PermissionLevel = {
  SUPERUSER: 'superuser',
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// 權限等級順序（從高到低）
const permissionOrder = [
  PermissionLevel.SUPERUSER,
  PermissionLevel.ADMIN,
  PermissionLevel.USER,
  PermissionLevel.VIEWER,
];

// 檢查用戶是否具有所需權限
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  console.log('Checking permissions:', {
    userPermissions,
    requiredPermission,
    isSuperuser: userPermissions.includes(PermissionLevel.SUPERUSER)
  });

  if (!userPermissions || userPermissions.length === 0) {
    console.log('No permissions found');
    return false;
  }
  
  // 如果用戶是 superuser，擁有所有權限
  if (userPermissions.includes(PermissionLevel.SUPERUSER)) {
    console.log('User is superuser, granting access');
    return true;
  }
  
  // 獲取用戶最高權限等級
  const userHighestPermission = userPermissions.reduce((highest, current) => {
    const currentIndex = permissionOrder.indexOf(current as any);
    const highestIndex = permissionOrder.indexOf(highest as any);
    return currentIndex < highestIndex ? current : highest;
  }, PermissionLevel.VIEWER);
  
  // 獲取所需權限等級
  const requiredIndex = permissionOrder.indexOf(requiredPermission as any);
  const userIndex = permissionOrder.indexOf(userHighestPermission as any);
  
  console.log('Permission check result:', {
    userHighestPermission,
    requiredPermission,
    userIndex,
    requiredIndex,
    hasPermission: userIndex <= requiredIndex
  });
  
  return userIndex <= requiredIndex;
};

// 獲取用戶權限
export const getUserPermissions = (): string[] => {
  const permissions = localStorage.getItem('permissions');
  const parsedPermissions = permissions ? JSON.parse(permissions) : [];
  console.log('Getting user permissions:', parsedPermissions);
  return parsedPermissions;
};

// 設置用戶權限
export const setUserPermissions = (permissions: string[]): void => {
  console.log('Setting user permissions:', permissions);
  localStorage.setItem('permissions', JSON.stringify(permissions));
};

// 清除用戶權限
export const clearUserPermissions = (): void => {
  console.log('Clearing user permissions');
  localStorage.removeItem('permissions');
}; 