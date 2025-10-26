
import type { UserData } from '../types';
import { LOCAL_STORAGE_KEY } from '../constants';
import { localStorageCleanup } from './localStorageCleanupService';

export const getUsers = (): Record<string, UserData> => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Failed to parse user data from localStorage", error);
    return {};
  }
};

export const saveUsers = (users: Record<string, UserData>): void => {
  const data = JSON.stringify(users);
  const saved = localStorageCleanup.safeSetItem(LOCAL_STORAGE_KEY, data);
  
  if (!saved) {
    // Only log occasionally to avoid flooding console
    if (Math.random() < 0.1) { // 10% chance to log
      console.warn("localStorage quota exceeded - user data cannot be saved. Please clear some browser data.");
    }
  }
};
