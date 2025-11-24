/**
 * Service for managing API keys from localStorage
 */

export interface ApiKeys {
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  elevenlabsApiKey?: string;
  openaiTtsApiKey?: string;
  geminiTtsApiKey?: string;
  azureApiKey?: string;
}

export interface ApiKeyResponse {
  success: boolean;
  keys?: ApiKeys;
  error?: string;
}

import { OPENAI_TTS_API_KEY_STORAGE_KEY, ELEVENLABS_API_KEY_STORAGE_KEY, OPENAI_CHAT_API_KEY_STORAGE_KEY, GEMINI_API_KEY_STORAGE_KEY, GEMINI_TTS_API_KEY_STORAGE_KEY } from '../constants';

class ApiKeyService {
  private static instance: ApiKeyService;
  private cachedKeys: ApiKeys | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = Infinity; // Cache never expires

  private constructor() {}

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Get API keys from localStorage only
   * All keys must be set via the Settings UI
   */
  public async fetchApiKeys(): Promise<ApiKeyResponse> {
    console.log('[API KEY DEBUG] Using localStorage keys - set via Settings UI');
    return {
      success: true,
      keys: {
        geminiApiKey: '',
        openaiApiKey: '',
        claudeApiKey: '',
        elevenlabsApiKey: '',
        openaiTtsApiKey: '',
        geminiTtsApiKey: '',
        lmStudioBaseUrl: 'http://127.0.0.1:1234/v1'
      }
    };
  }

  /**
   * Get a specific API key
   */
  public async getApiKey(keyType: keyof ApiKeys): Promise<string | null> {
    // Only use localStorage (UI-set keys) - no file-based keys
    const uiKey = this.getLocalOverride(keyType);
    console.log(`[API KEY DEBUG] ${keyType} - UI localStorage key:`, {
      hasKey: !!uiKey,
      keyLength: uiKey?.length || 0,
      keyPreview: uiKey ? `${uiKey.substring(0, 10)}...${uiKey.substring(uiKey.length - 4)}` : 'null'
    });
    
    if (uiKey && uiKey.trim() !== '') {
      console.log(`[API KEY DEBUG] Using UI-set key for ${keyType}`);
      return uiKey;
    }

    // No key available - user must set it via UI
    console.log(`[API KEY DEBUG] No ${keyType} available - user must set it via Settings UI`);
    return null;
  }

  /**
   * Check if cached keys are still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Get a locally stored override for a specific API key, set via Settings UI
   */
  private getLocalOverride(keyType: keyof ApiKeys): string | null {
    if (typeof window === 'undefined') return null;
    try {
      switch (keyType) {
        case 'openaiApiKey':
          return localStorage.getItem(OPENAI_CHAT_API_KEY_STORAGE_KEY) || null;
        case 'geminiApiKey':
          return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || null;
        case 'openaiTtsApiKey':
          return localStorage.getItem(OPENAI_TTS_API_KEY_STORAGE_KEY) || null;
        case 'elevenlabsApiKey':
          return localStorage.getItem(ELEVENLABS_API_KEY_STORAGE_KEY) || null;
        case 'geminiTtsApiKey':
          return localStorage.getItem(GEMINI_TTS_API_KEY_STORAGE_KEY) || null;
        default:
          return null;
      }
    } catch (e) {
      console.warn('Unable to read local API key override', e);
      return null;
    }
  }

  /**
   * Clear the cache (useful for forcing refresh)
   */
  public clearCache(): void {
    this.cachedKeys = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Force refresh API keys from source (bypass cache)
   */
  public async forceRefresh(): Promise<ApiKeyResponse> {
    console.log('[API KEY DEBUG] Force refreshing API keys...');
    this.clearCache();
    return this.fetchApiKeys();
  }

  /**
   * Get cached keys from memory
   */
  public getCachedKeys(): ApiKeys | null {
    return this.isCacheValid() ? this.cachedKeys : null;
  }
}

export const apiKeyService = ApiKeyService.getInstance();
