import type { UserData, Personality } from '../types';
import * as userService from './userService';
import * as personalityService from './personalityService';

export interface UserProfile {
  username: string;
  loadedPersonalities: string[];
  lastLogin: string;
  personalityData: Personality[]; // Full personality data for backup
}

const USER_PROFILES_STORAGE_KEY = 'criminal_minds_user_profiles';

export const saveUserProfile = (username: string, loadedPersonalities: Personality[]): void => {
  try {
    // Get existing profiles
    const profiles = getUserProfiles();
    
    // Create/update profile for this user
    const profile: UserProfile = {
      username,
      loadedPersonalities: loadedPersonalities.map(p => p.id),
      lastLogin: new Date().toISOString(),
      personalityData: loadedPersonalities // Store full personality data as backup
    };
    
    profiles[username] = profile;
    
    // Save to localStorage
    localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    
    // Also update the user data with loaded personalities
    const users = userService.getUsers();
    if (users[username]) {
      users[username].loadedPersonalities = loadedPersonalities.map(p => p.id);
      users[username].lastLogin = new Date().toISOString();
      userService.saveUsers(users);
    }
    
    console.log(`Saved profile for ${username} with ${loadedPersonalities.length} personalities`);
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
};

export const getUserProfiles = (): Record<string, UserProfile> => {
  try {
    const data = localStorage.getItem(USER_PROFILES_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load user profiles:', error);
    return {};
  }
};

export const loadUserProfile = (username: string): Personality[] => {
  try {
    const profiles = getUserProfiles();
    const profile = profiles[username];
    
    if (!profile) {
      console.log(`No profile found for user: ${username}`);
      return [];
    }
    
    console.log(`Loading profile for ${username} with ${profile.loadedPersonalities.length} personalities`);
    
    // First try to load from the stored personality data
    if (profile.personalityData && profile.personalityData.length > 0) {
      return profile.personalityData;
    }
    
    // Fallback: try to find personalities by ID from the main personality storage
    const allPersonalities = personalityService.getPersonalities();
    const loadedPersonalities = profile.loadedPersonalities
      .map(id => allPersonalities.find(p => p.id === id))
      .filter((p): p is Personality => p !== undefined);
    
    return loadedPersonalities;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return [];
  }
};

export const getUserProfileSummary = (username: string): { personalityCount: number; lastLogin: string | null } => {
  try {
    const profiles = getUserProfiles();
    const profile = profiles[username];
    
    if (!profile) {
      return { personalityCount: 0, lastLogin: null };
    }
    
    return {
      personalityCount: profile.loadedPersonalities.length,
      lastLogin: profile.lastLogin
    };
  } catch (error) {
    console.error('Failed to get user profile summary:', error);
    return { personalityCount: 0, lastLogin: null };
  }
};

export const deleteUserProfile = (username: string): void => {
  try {
    const profiles = getUserProfiles();
    delete profiles[username];
    localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    console.log(`Deleted profile for user: ${username}`);
  } catch (error) {
    console.error('Failed to delete user profile:', error);
  }
};

export const exportUserProfile = (username: string): string | null => {
  try {
    const profiles = getUserProfiles();
    const profile = profiles[username];
    
    if (!profile) {
      return null;
    }
    
    return JSON.stringify(profile, null, 2);
  } catch (error) {
    console.error('Failed to export user profile:', error);
    return null;
  }
};

export const importUserProfile = (profileData: string): boolean => {
  try {
    const profile: UserProfile = JSON.parse(profileData);
    
    // Validate profile structure
    if (!profile.username || !Array.isArray(profile.loadedPersonalities)) {
      throw new Error('Invalid profile format');
    }
    
    const profiles = getUserProfiles();
    profiles[profile.username] = profile;
    localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    
    console.log(`Imported profile for user: ${profile.username}`);
    return true;
  } catch (error) {
    console.error('Failed to import user profile:', error);
    return false;
  }
};

export const listUserProfiles = (): Array<{ username: string; personalityCount: number; lastLogin: string }> => {
  try {
    const profiles = getUserProfiles();
    return Object.values(profiles).map(profile => ({
      username: profile.username,
      personalityCount: profile.loadedPersonalities.length,
      lastLogin: profile.lastLogin
    }));
  } catch (error) {
    console.error('Failed to list user profiles:', error);
    return [];
  }
};
