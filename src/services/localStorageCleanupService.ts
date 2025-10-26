/**
 * localStorage Cleanup Service
 * Manages localStorage quota and prevents QuotaExceededError
 */

interface StorageItem {
  key: string;
  size: number;
  lastAccessed: number;
  priority: 'critical' | 'important' | 'normal' | 'low';
}

const STORAGE_PRIORITIES: Record<string, 'critical' | 'important' | 'normal' | 'low'> = {
  // Critical - never delete (only essential settings)
  'cmf_last_logged_in_user': 'critical',
  'cmf_theme': 'critical',
  'experimental-settings': 'critical',
  'cmf_global_tts_enabled': 'critical',
  // API Keys - NEVER DELETE
  'cmf_gemini_api_key': 'critical',
  'cmf_openai_chat_api_key': 'critical',
  'cmf_elevenlabs_api_key': 'critical',
  'cmf_openai_tts_api_key': 'critical',
  'cmf_gemini_tts_api_key': 'critical',
  
  // Important - delete only if necessary (can be recreated)
  'cmf_voice_id_registry': 'important',
  'cmf_personality_slots': 'important',
  
  // Normal - can be cleaned up (moved large items here for more aggressive cleanup)
  'cmf_users': 'normal', // Moved from important - can be large, needs aggressive cleanup
  'criminal_minds_user_profiles': 'normal', // Moved from important - can be large, needs aggressive cleanup
  'cmf_cli_history': 'normal',
  'cmf_api_usage_log': 'normal',
  'cmf_session_histories': 'normal',
  
  // Low priority - delete first
  'cmf_debug_events': 'low',
  'cmf_gang_events': 'low',
  'cmf_poverty_events': 'low',
  'cmf_conversation_log': 'low'
};

class LocalStorageCleanupService {
  private static instance: LocalStorageCleanupService;
  private lastCleanup = 0;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB (more conservative estimate)
  private readonly CLEANUP_THRESHOLD = 0.70; // Clean when 70% full (more aggressive)

  public static getInstance(): LocalStorageCleanupService {
    if (!LocalStorageCleanupService.instance) {
      LocalStorageCleanupService.instance = new LocalStorageCleanupService();
    }
    return LocalStorageCleanupService.instance;
  }

  /**
   * Get the approximate size of localStorage in bytes
   */
  private getStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key) || '';
        total += key.length + value.length;
      }
    }
    return total * 2; // UTF-16 encoding (2 bytes per character)
  }

  /**
   * Get all storage items with metadata
   */
  private getStorageItems(): StorageItem[] {
    const items: StorageItem[] = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key) || '';
        const size = (key.length + value.length) * 2;
        const priority = STORAGE_PRIORITIES[key] || 'normal';
        
        // Try to get last accessed time from item metadata
        let lastAccessed = Date.now();
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && parsed.lastUpdated) {
            lastAccessed = new Date(parsed.lastUpdated).getTime();
          } else if (parsed && typeof parsed === 'object' && parsed.timestamp) {
            lastAccessed = new Date(parsed.timestamp).getTime();
          }
        } catch {
          // Not JSON or no timestamp, use current time
        }
        
        items.push({ key, size, lastAccessed, priority });
      }
    }
    
    return items;
  }

  /**
   * Emergency cleanup - removes almost everything except critical data
   */
  public performEmergencyCleanup(): boolean {
    console.log('[CLEANUP] EMERGENCY: Performing aggressive cleanup to free maximum space...');
    
    let totalFreed = 0;
    const criticalKeys = [
      'cmf_gemini_api_key',
      'cmf_openai_api_key', 
      'cmf_elevenlabs_api_key',
      'cmf_claude_api_key',
      'cmf_gemini_tts_api_key',
      'cmf_openai_tts_api_key',
      'cmf_api_provider',
      'cmf_current_user'
    ];
    
    // Remove ALL non-critical data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !criticalKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length * 2;
          localStorage.removeItem(key);
          totalFreed += size;
          console.log(`[CLEANUP] EMERGENCY: Removed ${key}: freed ${(size / 1024).toFixed(1)}KB`);
        }
      } catch (error) {
        console.warn(`[CLEANUP] EMERGENCY: Failed to remove ${key}:`, error);
      }
    });
    
    console.log(`[CLEANUP] EMERGENCY: Total freed: ${(totalFreed / 1024).toFixed(1)}KB`);
    return totalFreed > 0;
  }

  /**
   * Clean up localStorage by removing low-priority and old items
   */
  private performCleanup(targetReduction: number): number {
    const items = this.getStorageItems();
    let freedSpace = 0;
    
    // Sort by priority (low first) then by age (oldest first)
    const priorityOrder = { 'low': 0, 'normal': 1, 'important': 2, 'critical': 3 };
    items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.lastAccessed - b.lastAccessed;
    });
    
    console.log('[CLEANUP] Starting localStorage cleanup, target reduction:', (targetReduction / 1024).toFixed(1), 'KB');
    
    for (const item of items) {
      if (freedSpace >= targetReduction) break;
      if (item.priority === 'critical') continue;
      
      try {
        // Special handling for array-based logs - trim instead of delete
        if (item.key.includes('_log') || item.key.includes('_history') || item.key.includes('_events')) {
          const trimmed = this.trimArrayStorage(item.key);
          if (trimmed > 0) {
            freedSpace += trimmed;
            console.log(`[CLEANUP] Trimmed ${item.key}: freed ${(trimmed / 1024).toFixed(1)}KB`);
          }
        } else if (item.priority === 'low') {
          localStorage.removeItem(item.key);
          freedSpace += item.size;
          console.log(`[CLEANUP] Removed ${item.key}: freed ${(item.size / 1024).toFixed(1)}KB`);
        } else if (item.priority === 'normal') {
          // More aggressive cleanup for normal priority items
          // Special handling for large user data items - trim first, then delete if needed
          if (item.key === 'criminal_minds_user_profiles') {
            const trimmed = this.trimUserProfiles(item.key);
            if (trimmed > 0) {
              freedSpace += trimmed;
              console.log(`[CLEANUP] Trimmed user profiles: freed ${(trimmed / 1024).toFixed(1)}KB`);
            }
            // If still not enough space, remove entirely
            if (freedSpace < targetReduction * 0.7) {
              localStorage.removeItem(item.key);
              freedSpace += item.size - trimmed;
              console.log(`[CLEANUP] Removed ${item.key}: freed additional ${((item.size - trimmed) / 1024).toFixed(1)}KB`);
            }
          } else if (item.key === 'cmf_users') {
            const trimmed = this.trimUserData(item.key);
            if (trimmed > 0) {
              freedSpace += trimmed;
              console.log(`[CLEANUP] Trimmed user data: freed ${(trimmed / 1024).toFixed(1)}KB`);
            }
            // If still not enough space, remove entirely
            if (freedSpace < targetReduction * 0.7) {
              localStorage.removeItem(item.key);
              freedSpace += item.size - trimmed;
              console.log(`[CLEANUP] Removed ${item.key}: freed additional ${((item.size - trimmed) / 1024).toFixed(1)}KB`);
            }
          } else {
            // For other normal priority items, just remove them
            localStorage.removeItem(item.key);
            freedSpace += item.size;
            console.log(`[CLEANUP] Removed ${item.key}: freed ${(item.size / 1024).toFixed(1)}KB`);
          }
        } else if (item.priority === 'important' && freedSpace < targetReduction * 0.3) {
          // Only trim important items if we're really desperate for space
          localStorage.removeItem(item.key);
          freedSpace += item.size;
          console.log(`[CLEANUP] Removed important item ${item.key}: freed ${(item.size / 1024).toFixed(1)}KB`);
        }
      } catch (error) {
        console.warn(`[CLEANUP] Failed to clean ${item.key}:`, error);
      }
    }
    
    console.log(`[CLEANUP] Cleanup complete. Total freed: ${(freedSpace / 1024).toFixed(1)}KB`);
    return freedSpace;
  }

  /**
   * Trim array-based storage items (logs, histories, events)
   */
  private trimArrayStorage(key: string): number {
    try {
      const value = localStorage.getItem(key);
      if (!value) return 0;
      
      const originalSize = value.length * 2;
      const parsed = JSON.parse(value);
      
      if (Array.isArray(parsed)) {
        // Keep only the most recent 10% of items (more aggressive)
        const keepCount = Math.max(5, Math.floor(parsed.length * 0.10));
        const trimmed = parsed.slice(-keepCount);
        
        localStorage.setItem(key, JSON.stringify(trimmed));
        const newSize = JSON.stringify(trimmed).length * 2;
        
        return originalSize - newSize;
      }
    } catch (error) {
      console.warn(`[CLEANUP] Failed to trim ${key}:`, error);
    }
    
    return 0;
  }

  /**
   * Trim user profiles by removing personality data backups
   */
  private trimUserProfiles(key: string): number {
    try {
      const value = localStorage.getItem(key);
      if (!value) return 0;
      
      const originalSize = value.length * 2;
      const profiles = JSON.parse(value);
      
      // Remove personalityData backups to save space
      for (const username in profiles) {
        if (profiles[username].personalityData) {
          delete profiles[username].personalityData;
        }
      }
      
      const trimmedData = JSON.stringify(profiles);
      localStorage.setItem(key, trimmedData);
      const newSize = trimmedData.length * 2;
      
      return originalSize - newSize;
    } catch (error) {
      console.warn(`[CLEANUP] Failed to trim user profiles:`, error);
    }
    
    return 0;
  }

  /**
   * Trim user data by removing old session data
   */
  private trimUserData(key: string): number {
    try {
      const value = localStorage.getItem(key);
      if (!value) return 0;
      
      const originalSize = value.length * 2;
      const users = JSON.parse(value);
      
      // Keep only essential user data, remove large session histories
      for (const username in users) {
        const user = users[username];
        // Keep only the most recent 5 sessions
        if (user.sessionHistories && Array.isArray(user.sessionHistories)) {
          user.sessionHistories = user.sessionHistories.slice(-5);
        }
        // Remove conversation logs if they exist
        if (user.conversationLog) {
          delete user.conversationLog;
        }
        // Remove debug data if it exists
        if (user.debugData) {
          delete user.debugData;
        }
      }
      
      const trimmedData = JSON.stringify(users);
      localStorage.setItem(key, trimmedData);
      const newSize = trimmedData.length * 2;
      
      return originalSize - newSize;
    } catch (error) {
      console.warn(`[CLEANUP] Failed to trim user data:`, error);
    }
    
    return 0;
  }

  /**
   * Safe localStorage setItem with automatic cleanup
   */
  public safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[CLEANUP] localStorage quota exceeded, attempting cleanup...');
        
        // Calculate how much space we need
        const neededSpace = (key.length + value.length) * 2;
        const currentSize = this.getStorageSize();
        const targetReduction = Math.max(neededSpace * 3, currentSize * 0.4); // Free at least 40% or triple what we need
        
        const freedSpace = this.performCleanup(targetReduction);
        
        if (freedSpace > neededSpace) {
          try {
            localStorage.setItem(key, value);
            console.log(`[CLEANUP] Successfully saved ${key} after cleanup`);
            return true;
          } catch (retryError) {
            console.error(`[CLEANUP] Failed to save ${key} even after cleanup:`, retryError);
          }
        } else {
          console.error(`[CLEANUP] Insufficient space freed (${freedSpace} < ${neededSpace}) for ${key}`);
          
          // Try emergency cleanup as last resort
          console.warn('[CLEANUP] Attempting emergency cleanup...');
          if (this.performEmergencyCleanup()) {
            try {
              localStorage.setItem(key, value);
              console.log(`[CLEANUP] Successfully saved ${key} after emergency cleanup`);
              return true;
            } catch (emergencyError) {
              console.error(`[CLEANUP] Failed to save ${key} even after emergency cleanup:`, emergencyError);
            }
          }
        }
      } else {
        console.error(`[CLEANUP] localStorage error for ${key}:`, error);
      }
    }
    
    return false;
  }

  /**
   * Check if cleanup is needed and perform it
   */
  public checkAndCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;
    
    const currentSize = this.getStorageSize();
    const usageRatio = currentSize / this.MAX_STORAGE_SIZE;
    
    if (usageRatio > this.CLEANUP_THRESHOLD) {
      console.log(`[CLEANUP] Storage usage: ${(usageRatio * 100).toFixed(1)}% (${(currentSize / 1024).toFixed(1)}KB)`);
      const targetReduction = currentSize * 0.3; // Free 30%
      this.performCleanup(targetReduction);
    }
    
    this.lastCleanup = now;
  }

  /**
   * Get storage usage statistics
   */
  public getStorageStats(): { size: number; maxSize: number; usage: number; items: number } {
    const size = this.getStorageSize();
    const items = Object.keys(localStorage).length;
    
    return {
      size,
      maxSize: this.MAX_STORAGE_SIZE,
      usage: size / this.MAX_STORAGE_SIZE,
      items
    };
  }
}

export const localStorageCleanup = LocalStorageCleanupService.getInstance();
