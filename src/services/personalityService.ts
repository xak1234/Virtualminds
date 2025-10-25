import type { Personality } from '../types';
import { PERSONALITIES_STORAGE_KEY } from '../constants';

export const getPersonalities = (): Personality[] => {
  try {
    const data = localStorage.getItem(PERSONALITIES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse personalities from localStorage", error);
    return [];
  }
};

export const savePersonalities = (personalities: Personality[]): void => {
  try {
    const data = JSON.stringify(personalities);
    localStorage.setItem(PERSONALITIES_STORAGE_KEY, data);
  } catch (error) {
    console.error("Failed to save personalities to localStorage", error);
  }
};