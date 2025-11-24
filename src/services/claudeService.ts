import type { ModelConfig, ChatMessage } from '../types';
import { MessageAuthor } from '../types';
import { apiKeyService } from './apiKeyService';
import { logApiUsage, estimateTokenCount } from './costTrackingService';
import { generateResponse as lmStudioGenerateResponse, getAvailableModels as getLMStudioModels, testConnection } from './lmStudioService';

// Claude model fallback order - now using LM Studio models
// These will be retrieved from localStorage or LM Studio configuration
const MODEL_FALLBACK_ORDER = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022', 
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

// Cache for available models to avoid repeated API calls
let availableModelsCache: string[] | null = null;
let modelsCacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ClaudeMessage interface removed - now using LM Studio service

export const getAvailableModels = async (apiKey?: string): Promise<string[]> => {
  // Check cache first
  if (availableModelsCache && Date.now() < modelsCacheExpiry) {
    return availableModelsCache;
  }

  try {
    // Try to get models from LM Studio server
    const lmStudioModels = await getLMStudioModels();
    if (lmStudioModels.length > 0) {
      availableModelsCache = lmStudioModels;
      modelsCacheExpiry = Date.now() + CACHE_DURATION;
      return availableModelsCache;
    }
  } catch (error) {
    console.warn('Failed to fetch models from LM Studio, using fallback models:', error);
  }

  // Fallback to predefined models if LM Studio is not available
  availableModelsCache = MODEL_FALLBACK_ORDER;
  modelsCacheExpiry = Date.now() + CACHE_DURATION;

  return availableModelsCache;
};

export const findFallbackModel = async (requestedModel: string, apiKey?: string): Promise<string> => {
  const availableModels = await getAvailableModels(apiKey);
  
  // If requested model is available, use it
  if (availableModels.includes(requestedModel)) {
    return requestedModel;
  }

  // Find the best available fallback
  for (const fallbackModel of MODEL_FALLBACK_ORDER) {
    if (availableModels.includes(fallbackModel)) {
      console.log(`Model ${requestedModel} not available, falling back to ${fallbackModel}`);
      return fallbackModel;
    }
  }

  // If no fallback found, return the first available model
  return availableModels[0] || 'claude-3-5-sonnet-20241022';
};

export const generateResponse = async (
  model: string,
  apiKey: string | null,
  systemInstruction: string,
  chatHistory: ChatMessage[],
  prompt: string,
  config: ModelConfig
) => {
  try {
    // Test LM Studio connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return "Error: Cannot connect to LM Studio server. Please ensure LM Studio is running with a model loaded. Check the LM Studio server configuration in settings.";
    }

    // Check if the requested model is available and get fallback if needed
    const actualModel = await findFallbackModel(model, apiKey);

    // Use LM Studio service to generate response
    const response = await lmStudioGenerateResponse(
      actualModel,
      null, // LM Studio doesn't need API key
      systemInstruction,
      chatHistory,
      prompt,
      config
    );

    return response;
  } catch (error) {
    console.error("Error generating response from Claude via LM Studio:", error);
    
    // Calculate input tokens for error logging
    const inputText = systemInstruction + chatHistory.map(m => m.text).join(' ') + prompt;
    const inputTokens = estimateTokenCount(inputText);
    
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`;
      // Log failed request
      logApiUsage('claude', 'chat', inputTokens, 0, 'error', model, error.message);
      return errorMessage;
    }
    
    errorMessage = "An unknown error occurred while contacting the LM Studio server.";
    logApiUsage('claude', 'chat', inputTokens, 0, 'error', model, errorMessage);
    return errorMessage;
  }
};
