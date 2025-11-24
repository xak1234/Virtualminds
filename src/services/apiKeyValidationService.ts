/**
 * Service for validating API keys in real-time
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

class ApiKeyValidationService {
  private static instance: ApiKeyValidationService;
  private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {}

  public static getInstance(): ApiKeyValidationService {
    if (!ApiKeyValidationService.instance) {
      ApiKeyValidationService.instance = new ApiKeyValidationService();
    }
    return ApiKeyValidationService.instance;
  }

  /**
   * Validate OpenAI API key
   */
  public async validateOpenAiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: 'API key is required' };
    }

    if (!apiKey.startsWith('sk-')) {
      return { isValid: false, error: 'OpenAI API key must start with "sk-"' };
    }

    // Check cache first
    const cached = this.getFromCache(apiKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const result = response.ok 
        ? { isValid: true }
        : { isValid: false, error: `Invalid API key (${response.status})` };

      this.setCache(apiKey, result);
      return result;
    } catch (error) {
      const result = { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
      return result;
    }
  }

  /**
   * Validate Google Gemini API key
   */
  public async validateGeminiKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: 'API key is required' };
    }

    // Check cache first
    const cached = this.getFromCache(apiKey);
    if (cached) return cached;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const result = response.ok 
        ? { isValid: true }
        : { isValid: false, error: `Invalid API key (${response.status})` };

      this.setCache(apiKey, result);
      return result;
    } catch (error) {
      const result = { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
      return result;
    }
  }

  /**
   * Validate ElevenLabs API key
   */
  public async validateElevenLabsKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: 'API key is required' };
    }

    // Check cache first
    const cached = this.getFromCache(apiKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const result = response.ok 
        ? { isValid: true }
        : { isValid: false, error: `Invalid API key (${response.status})` };

      this.setCache(apiKey, result);
      return result;
    } catch (error) {
      const result = { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
      return result;
    }
  }

  /**
   * Validate Azure Cognitive Services API key
   */
  public async validateAzureKey(apiKey: string, region: string = 'eastus'): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: 'API key is required' };
    }

    // Check cache first
    const cacheKey = `${apiKey}-${region}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Test with a simple TTS request to validate the key
      const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
      method: 'GET',
      headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const result = response.ok 
        ? { isValid: true }
        : { isValid: false, error: `Invalid API key (${response.status})` };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      const result = { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
      return result;
    }
  }

  /**
   * Validate Claude API key (Anthropic)
   */
  public async validateClaudeKey(apiKey: string): Promise<ValidationResult> {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: 'API key is required' };
    }

    if (!apiKey.startsWith('sk-ant-')) {
      return { isValid: false, error: 'Claude API key must start with "sk-ant-"' };
    }

    // Check cache first
    const cached = this.getFromCache(apiKey);
    if (cached) return cached;

    try {
      // Test with a simple completion request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const result = response.ok 
        ? { isValid: true }
        : { isValid: false, error: `Invalid API key (${response.status})` };

      this.setCache(apiKey, result);
      return result;
    } catch (error) {
      const result = { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
      return result;
    }
  }

  /**
   * Get validation result from cache if still valid
   */
  private getFromCache(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    return null;
  }

  /**
   * Store validation result in cache
   */
  private setCache(key: string, result: ValidationResult): void {
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
  }
}

export const apiKeyValidationService = ApiKeyValidationService.getInstance();

/**
 * Validate all available API keys and report status via callback
 * NOTE: This function is deprecated and no longer called automatically.
 * API keys are now managed locally via UI Settings only.
 * Kept for potential manual validation feature in the future.
 */
export async function validateAllKeys(
  messageCallback: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  messageCallback('ℹ️ API keys are managed locally via Settings UI only', 'info');
  messageCallback('ℹ️ No automatic validation performed', 'info');
}