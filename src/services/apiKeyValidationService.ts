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
 * This function is used for startup validation in App.tsx
 */
export async function validateAllKeys(
  messageCallback: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  const { apiKeyService } = await import('./apiKeyService');
  
  messageCallback('🔑 Validating API keys...', 'info');
  
  try {
    // Get all available API keys
    const result = await apiKeyService.fetchApiKeys();
    if (!result.success || !result.keys) {
      messageCallback('❌ Failed to fetch API keys from server', 'error');
      return;
    }
    
    const keys = result.keys;
    let validCount = 0;
    let totalCount = 0;
    
    // Validate OpenAI key
    if (keys.openaiApiKey) {
      totalCount++;
      const validation = await apiKeyValidationService.validateOpenAiKey(keys.openaiApiKey);
      if (validation.isValid) {
        validCount++;
        messageCallback('✅ OpenAI API key is valid', 'success');
      } else {
        messageCallback(`❌ OpenAI API key is invalid: ${validation.error}`, 'error');
      }
    }
    
    // Validate Gemini key
    if (keys.geminiApiKey) {
      totalCount++;
      const validation = await apiKeyValidationService.validateGeminiKey(keys.geminiApiKey);
      if (validation.isValid) {
        validCount++;
        messageCallback('✅ Google Gemini API key is valid', 'success');
      } else {
        messageCallback(`❌ Google Gemini API key is invalid: ${validation.error}`, 'error');
      }
    }
    
    // Validate ElevenLabs key
    if (keys.elevenlabsApiKey) {
      totalCount++;
      const validation = await apiKeyValidationService.validateElevenLabsKey(keys.elevenlabsApiKey);
      if (validation.isValid) {
        validCount++;
        messageCallback('✅ ElevenLabs API key is valid', 'success');
      } else {
        messageCallback(`❌ ElevenLabs API key is invalid: ${validation.error}`, 'error');
      }
    }
    
    // Validate Claude key
    if (keys.claudeApiKey) {
      totalCount++;
      const validation = await apiKeyValidationService.validateClaudeKey(keys.claudeApiKey);
      if (validation.isValid) {
        validCount++;
        messageCallback('✅ Claude API key is valid', 'success');
      } else {
        messageCallback(`❌ Claude API key is invalid: ${validation.error}`, 'error');
      }
    }
    
    // Validate Azure key (if available)
    if (keys.azureApiKey) {
      totalCount++;
      const validation = await apiKeyValidationService.validateAzureKey(keys.azureApiKey);
      if (validation.isValid) {
        validCount++;
        messageCallback('✅ Azure API key is valid', 'success');
      } else {
        messageCallback(`❌ Azure API key is invalid: ${validation.error}`, 'error');
      }
    }
    
    // Summary message
    if (totalCount === 0) {
      messageCallback('ℹ️ No API keys found to validate', 'info');
    } else {
      messageCallback(`🔑 API Key validation complete: ${validCount}/${totalCount} keys valid`, 
        validCount === totalCount ? 'success' : 'info');
    }
    
  } catch (error) {
    messageCallback(`❌ API key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  }
}