/**
 * Service for fetching API keys from the Render server
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
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  // Prefer current origin in production so frontend/backend stay in sync when deployed together.
  // Fallback to env override or the known Render URL.
  private readonly RENDER_SERVER_URL = (
    typeof window !== 'undefined' && window.location?.origin
  ) || (import.meta as any)?.env?.VITE_RENDER_SERVER_URL
    || 'https://criminaminds2.onrender.com';
  private readonly IS_DEVELOPMENT = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  private constructor() {}

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Fetch API keys from local file (development) or Render server (production)
   */
  public async fetchApiKeys(): Promise<ApiKeyResponse> {
    try {
      // Check if we have valid cached keys
      if (this.cachedKeys && this.isCacheValid()) {
        return {
          success: true,
          keys: this.cachedKeys
        };
      }

      let data: ApiKeys;

      if (this.IS_DEVELOPMENT) {
        // In development, fetch from local JSON file
        console.log('Development mode: Loading API keys from local file...');
        const response = await fetch('/api-keys.json', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout for local file
        });

        if (!response.ok) {
          throw new Error(`Failed to load local API keys file: ${response.status}`);
        }

        data = await response.json();
        console.log('API keys loaded from local file');
      } else {
        // In production, fetch from Render server
        console.log('Production mode: Loading API keys from server...');
        const response = await fetch(`${this.RENDER_SERVER_URL}/api/keys`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
        console.log('API keys loaded from server');
      }
      
      // Cache the keys
      this.cachedKeys = data;
      this.cacheTimestamp = Date.now();

      return {
        success: true,
        keys: data
      };
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      
      // Return cached keys if available, even if expired
      if (this.cachedKeys) {
        console.warn('Using cached API keys due to fetch failure');
        return {
          success: true,
          keys: this.cachedKeys
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a specific API key
   */
  public async getApiKey(keyType: keyof ApiKeys): Promise<string | null> {
    // 1) Respect locally saved override (Master Control Panel) first
    const override = this.getLocalOverride(keyType);
    console.log(`[API KEY DEBUG] ${keyType} - localStorage override:`, {
      hasOverride: !!override,
      overrideLength: override?.length || 0,
      overridePreview: override ? `${override.substring(0, 10)}...${override.substring(override.length - 4)}` : 'null'
    });
    
    if (override && override.trim() !== '') {
      console.log(`[API KEY DEBUG] Using localStorage override for ${keyType}`);
      return override;
    }

    // 2) Otherwise, fetch from server/local file
    const result = await this.fetchApiKeys();
    if (result.success && result.keys) {
      const fileKey = result.keys[keyType] || null;
      console.log(`[API KEY DEBUG] ${keyType} - file key:`, {
        hasFileKey: !!fileKey,
        fileKeyLength: fileKey?.length || 0,
        fileKeyPreview: fileKey ? `${fileKey.substring(0, 10)}...${fileKey.substring(fileKey.length - 4)}` : 'null'
      });
      return fileKey;
    }

    // 3) Nothing available
    console.log(`[API KEY DEBUG] No ${keyType} available from any source`);
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
   * Get cached keys without fetching from server
   */
  public getCachedKeys(): ApiKeys | null {
    return this.isCacheValid() ? this.cachedKeys : null;
  }
}

export const apiKeyService = ApiKeyService.getInstance();
