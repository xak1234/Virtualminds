
import type { UserData } from '../types';
import { LOCAL_STORAGE_KEY } from '../constants';

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
  try {
    const data = JSON.stringify(users);
    localStorage.setItem(LOCAL_STORAGE_KEY, data);
  } catch (error) {
    // Suppress repeated quota exceeded errors to reduce console spam
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // Only log occasionally to avoid flooding console
      if (Math.random() < 0.1) {
        console.warn("localStorage quota exceeded - user data cannot be saved. Please clear some browser data.");
      }
    } else {
      console.error("Failed to save user data to localStorage", error);
    }
  }
};
