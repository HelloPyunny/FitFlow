/**
 * User-specific localStorage utilities
 * Keys are prefixed with user ID to separate data per user
 */

export const getUserStorageKey = (userId: string, key: string): string => {
  return `smartfit.${key}.${userId}`;
};

export const setUserData = <T>(userId: string, key: string, data: T): void => {
  if (!userId) return;
  try {
    const storageKey = getUserStorageKey(userId, key);
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} for user ${userId}:`, error);
  }
};

export const getUserData = <T>(userId: string, key: string): T | null => {
  if (!userId) return null;
  try {
    const storageKey = getUserStorageKey(userId, key);
    const item = localStorage.getItem(storageKey);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to load ${key} for user ${userId}:`, error);
    return null;
  }
};

export const removeUserData = (userId: string, key: string): void => {
  if (!userId) return;
  try {
    const storageKey = getUserStorageKey(userId, key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Failed to remove ${key} for user ${userId}:`, error);
  }
};

export const clearUserData = (userId: string): void => {
  if (!userId) return;
  try {
    const keys = Object.keys(localStorage);
    const prefix = `smartfit.`;
    keys.forEach((key) => {
      if (key.startsWith(prefix) && key.endsWith(`.${userId}`)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error(`Failed to clear data for user ${userId}:`, error);
  }
};
