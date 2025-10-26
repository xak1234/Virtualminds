import type { ApiUsageStats } from '../types';
import type { ApiProvider } from '../types';
import { localStorageCleanup } from './localStorageCleanupService';

// API pricing (as of late 2024/early 2025)
// These rates are estimates and should be updated based on current pricing
const GEMINI_PRICING = {
  INPUT_TOKENS_PER_MILLION: 0.35,  // $0.35 per million input tokens
  OUTPUT_TOKENS_PER_MILLION: 1.05, // $1.05 per million output tokens
};

// OpenAI pricing (approximate for GPT-4o)
const OPENAI_PRICING = {
  'gpt-4o': {
    INPUT_TOKENS_PER_MILLION: 2.50,  // $2.50 per million input tokens
    OUTPUT_TOKENS_PER_MILLION: 10.00, // $10.00 per million output tokens
  },
  'gpt-4o-mini': {
    INPUT_TOKENS_PER_MILLION: 0.15,  // $0.15 per million input tokens
    OUTPUT_TOKENS_PER_MILLION: 0.60,  // $0.60 per million output tokens
  },
  'gpt-4-turbo': {
    INPUT_TOKENS_PER_MILLION: 10.00,
    OUTPUT_TOKENS_PER_MILLION: 30.00,
  },
  'gpt-4': {
    INPUT_TOKENS_PER_MILLION: 30.00,
    OUTPUT_TOKENS_PER_MILLION: 60.00,
  },
  'gpt-3.5-turbo': {
    INPUT_TOKENS_PER_MILLION: 0.50,
    OUTPUT_TOKENS_PER_MILLION: 1.50,
  },
  'default': { // Fallback
    INPUT_TOKENS_PER_MILLION: 2.50,
    OUTPUT_TOKENS_PER_MILLION: 10.00,
  }
};

// Claude pricing
const CLAUDE_PRICING = {
  'claude-3-5-sonnet-20241022': {
    INPUT_TOKENS_PER_MILLION: 3.00,
    OUTPUT_TOKENS_PER_MILLION: 15.00,
  },
  'claude-3-5-haiku-20241022': {
    INPUT_TOKENS_PER_MILLION: 0.80,
    OUTPUT_TOKENS_PER_MILLION: 4.00,
  },
  'claude-3-opus-20240229': {
    INPUT_TOKENS_PER_MILLION: 15.00,
    OUTPUT_TOKENS_PER_MILLION: 75.00,
  },
  'default': {
    INPUT_TOKENS_PER_MILLION: 3.00,
    OUTPUT_TOKENS_PER_MILLION: 15.00,
  }
};

// TTS pricing (approximate per character/request)
const TTS_PRICING = {
  'elevenlabs': {
    CHARACTERS_PER_DOLLAR: 10000, // Rough estimate
  },
  'openai': {
    CHARACTERS_PER_DOLLAR: 166667, // $6 per million characters
  },
  'azure': {
    CHARACTERS_PER_DOLLAR: 200000, // $5 per million characters
  },
  'google': {
    CHARACTERS_PER_DOLLAR: 250000, // $4 per million characters
  },
  'default': {
    CHARACTERS_PER_DOLLAR: 10000,
  }
};

export interface ApiUsageEntry {
  id: string;
  timestamp: string;
  provider: string;
  model?: string;
  service: 'chat' | 'tts';
  inputTokens: number;
  outputTokens: number;
  cost: number;
  status: 'success' | 'error';
  details?: string;
  characterCount?: number; // For TTS
}

/**
 * Estimates token count for text (rough approximation)
 * Real implementation would use the actual tokenizer
 */
export const estimateTokenCount = (text: string): number => {
  if (!text || text.length === 0) return 0;
  // Rough estimate: ~4 characters per token for English text
  // This is a simplification - actual tokenization varies
  return Math.ceil(text.length / 4);
};

/**
 * Calculates the cost for an API request
 */
export const calculateRequestCost = (inputTokens: number, outputTokens: number, provider?: ApiProvider | string, model?: string): number => {
  if (provider === 'openai') {
    // Find pricing for specific OpenAI model
    const modelKey = (model && model in OPENAI_PRICING) ? model as keyof typeof OPENAI_PRICING : 'default';
    const pricing = OPENAI_PRICING[modelKey];
    const inputCost = (inputTokens / 1_000_000) * pricing.INPUT_TOKENS_PER_MILLION;
    const outputCost = (outputTokens / 1_000_000) * pricing.OUTPUT_TOKENS_PER_MILLION;
    return inputCost + outputCost;
  }
  
  if (provider === 'claude') {
    const modelKey = (model && model in CLAUDE_PRICING) ? model as keyof typeof CLAUDE_PRICING : 'default';
    const pricing = CLAUDE_PRICING[modelKey];
    const inputCost = (inputTokens / 1_000_000) * pricing.INPUT_TOKENS_PER_MILLION;
    const outputCost = (outputTokens / 1_000_000) * pricing.OUTPUT_TOKENS_PER_MILLION;
    return inputCost + outputCost;
  }
  
  // Default to Gemini pricing for Google and unspecified providers
  const inputCost = (inputTokens / 1_000_000) * GEMINI_PRICING.INPUT_TOKENS_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * GEMINI_PRICING.OUTPUT_TOKENS_PER_MILLION;
  return inputCost + outputCost;
};

/**
 * Calculates the cost for a TTS request
 */
export const calculateTtsCost = (characterCount: number, provider?: string): number => {
  const providerKey = (provider && provider in TTS_PRICING) ? provider as keyof typeof TTS_PRICING : 'default';
  const pricing = TTS_PRICING[providerKey];
  return characterCount / pricing.CHARACTERS_PER_DOLLAR;
};

/**
 * Updates API usage statistics
 */
export const updateApiUsage = (
  currentStats: ApiUsageStats | undefined,
  inputTokens: number,
  outputTokens: number,
  provider?: ApiProvider | string,
  model?: string
): ApiUsageStats => {
  const requestCost = calculateRequestCost(inputTokens, outputTokens, provider, model);
  
  if (!currentStats) {
    return {
      totalRequests: 1,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      estimatedCost: requestCost,
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    totalRequests: currentStats.totalRequests + 1,
    totalInputTokens: currentStats.totalInputTokens + inputTokens,
    totalOutputTokens: currentStats.totalOutputTokens + outputTokens,
    estimatedCost: currentStats.estimatedCost + requestCost,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Logs API usage to localStorage for the debug window
 */
export const logApiUsage = (
  provider: string,
  service: 'chat' | 'tts',
  inputTokens: number,
  outputTokens: number,
  status: 'success' | 'error',
  model?: string,
  details?: string,
  characterCount?: number
): void => {
  try {
    const cost = service === 'tts' && characterCount 
      ? calculateTtsCost(characterCount, provider)
      : calculateRequestCost(inputTokens, outputTokens, provider, model);

    const entry: ApiUsageEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      provider,
      model,
      service,
      inputTokens,
      outputTokens,
      cost,
      status,
      details,
      characterCount,
    };

    const existing = localStorage.getItem('cmf_api_usage_log');
    const log: ApiUsageEntry[] = existing ? JSON.parse(existing) : [];
    
    // Keep only the last 500 entries to prevent storage overflow (reduced from 1000)
    log.push(entry);
    if (log.length > 500) {
      log.splice(0, log.length - 500);
    }

    const saved = localStorageCleanup.safeSetItem('cmf_api_usage_log', JSON.stringify(log));
    if (!saved) {
      // Only log occasionally to avoid flooding console
      if (Math.random() < 0.1) { // 10% chance to log
        console.warn('localStorage quota exceeded - API usage logging disabled. Please clear browser data.');
      }
    }
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
};

/**
 * Formats cost for display
 */
export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
};

/**
 * Formats token count for display
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
};