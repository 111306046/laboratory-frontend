const SUPER_USER_ACCOUNT = 'yezyez';

export const isSuperUserAccount = (userId?: string | null): boolean => userId === SUPER_USER_ACCOUNT;

export const getUserAllowNotify = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('user_allow_notify') === 'true';
};

export const setUserAllowNotify = (value: boolean): void => {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem('user_allow_notify', 'true');
  } else {
    localStorage.removeItem('user_allow_notify');
  }
};

export const canAccessAlertFeature = (permissions: string[] = [], userId?: string | null): boolean => {
  if (isSuperUserAccount(userId)) return true;
  if (!getUserAllowNotify()) return false;
  return permissions.includes('set_thresholds') || permissions.includes('modify_notification');
};
