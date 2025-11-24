
import type { ModelConfig, ChatMessage } from '../types';
import { MessageAuthor } from '../types';
import { apiKeyService } from './apiKeyService';
import { logApiUsage, estimateTokenCount } from './costTrackingService';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODELS_URL = 'https://api.openai.com/v1/models';

// OpenAI API key can be provided via parameter or retrieved from localStorage

// Model fallback order - from most capable to most basic
const MODEL_FALLBACK_ORDER = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo'
];

// Cache for available models to avoid repeated API calls
let availableModelsCache: string[] | null = null;
let modelsCacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAiModelsResponse {
  object: string;
  data: OpenAiModel[];
}

export const getAvailableModels = async (apiKey?: string): Promise<string[]> => {
  // Check cache first
  if (availableModelsCache && Date.now() < modelsCacheExpiry) {
    return availableModelsCache;
  }

  let finalApiKey = apiKey;
  if (!finalApiKey) {
    finalApiKey = await apiKeyService.getApiKey('openaiApiKey');
  }
  
  if (!finalApiKey && process.env.OPENAI_API_KEY) {
    finalApiKey = process.env.OPENAI_API_KEY;
  }

  if (!finalApiKey) {
    console.warn('No OpenAI API key available for model checking');
    return MODEL_FALLBACK_ORDER; // Return default models if no API key
  }

  try {
    const response = await fetch(MODELS_URL, {
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenAiModelsResponse = await response.json();
    
    // Filter for chat completion models and sort by our preference
    const chatModels = data.data
      .filter(model => model.id.includes('gpt'))
      .map(model => model.id)
      .filter(modelId => MODEL_FALLBACK_ORDER.includes(modelId))
      .sort((a, b) => MODEL_FALLBACK_ORDER.indexOf(a) - MODEL_FALLBACK_ORDER.indexOf(b));

    // Cache the results
    availableModelsCache = chatModels.length > 0 ? chatModels : MODEL_FALLBACK_ORDER;
    modelsCacheExpiry = Date.now() + CACHE_DURATION;

    return availableModelsCache;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    // Return default models on error
    return MODEL_FALLBACK_ORDER;
  }
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
  return availableModels[0] || 'gpt-3.5-turbo';
};

export interface OpenAiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export const generateResponse = async (
  model: string,
  apiKey: string | null,
  systemInstruction: string,
  chatHistory: ChatMessage[],
  prompt: string,
  config: ModelConfig
): Promise<OpenAiResponse> => {
  // If no API key provided, try to get it from the server
  let finalApiKey = apiKey;
  if (!finalApiKey) {
    finalApiKey = await apiKeyService.getApiKey('openaiApiKey');
  }
  
  // Fallback to environment variable
  if (!finalApiKey && process.env.OPENAI_API_KEY) {
    finalApiKey = process.env.OPENAI_API_KEY;
  }

  if (!finalApiKey) {
    throw new Error("OpenAI API key is not set. Please configure it in the settings or ensure it's available on the server.");
  }

  // Check if the requested model is available and get fallback if needed
  const actualModel = await findFallbackModel(model, finalApiKey);

  const messages: OpenAiMessage[] = [
    { role: 'system', content: systemInstruction },
    ...chatHistory.map(message => ({
      role: message.author === MessageAuthor.USER ? 'user' : 'assistant',
      content: `[${new Date(message.timestamp).toLocaleString()}] ${message.text}`,
    } as OpenAiMessage)),
    { role: 'user', content: prompt },
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: messages,
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxOutputTokens,
        // Note: OpenAI chat completions API doesn't have a direct 'top_k' parameter.
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
      
      // Log failed request
      const estimatedInputTokens = messages.reduce((acc, msg) => acc + estimateTokenCount(msg.content), 0);
      logApiUsage('openai', 'chat', estimatedInputTokens, 0, 'error', actualModel, errorMessage);
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "No response from AI.";
    
    // Extract token usage from OpenAI response
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    
    // Log successful request
    logApiUsage('openai', 'chat', inputTokens, outputTokens, 'success', actualModel);
    
    return {
      text,
      inputTokens,
      outputTokens
    };
  } catch (error) {
    console.error("Error generating response from OpenAI:", error);
    if (error instanceof Error) {
      // Log error if not already logged
      const estimatedInputTokens = messages.reduce((acc, msg) => acc + estimateTokenCount(msg.content), 0);
      logApiUsage('openai', 'chat', estimatedInputTokens, 0, 'error', actualModel, error.message);
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while contacting the OpenAI API.");
  }
};
