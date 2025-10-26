/// <reference types="vite/client" />
// LM Studio (OpenAI-compatible) service client
// Calls a local LM Studio server via the OpenAI API schema
// Default LM Studio server runs at http://localhost:1234/v1

import type { ModelConfig, ChatMessage } from '../types';
import { MessageAuthor } from '../types';
import { logApiUsage, estimateTokenCount } from './costTrackingService';

export interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LMStudioConfig {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  model?: string;
}

export interface LMStudioResponseChoice {
  index: number;
  message: { role: 'assistant'; content: string };
  finish_reason?: string;
}

export interface LMStudioChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LMStudioResponseChoice[];
  usage?: { 
    prompt_tokens?: number; 
    completion_tokens?: number; 
    total_tokens?: number; 
  };
}

export interface LMStudioModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface LMStudioModelsResponse {
  object: string;
  data: LMStudioModel[];
}

// Get base URL from localStorage, environment, or default to custom LLM server
const getBaseUrl = (): string => {
  // First check localStorage for user-saved URL
  try {
    const savedUrl = localStorage.getItem('cmf_lm_studio_url');
    if (savedUrl) {
      // Ensure it has the /v1 suffix if not already present
      const cleanUrl = savedUrl.replace(/\/$/, '');
      return cleanUrl.endsWith('/v1') ? cleanUrl : `${cleanUrl}/v1`;
    }
  } catch (error) {
    console.warn('Failed to read LM Studio URL from localStorage:', error);
  }
  
  // Fallback to environment variable
  const envUrl = import.meta.env.VITE_LM_STUDIO_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  // Default URL
  return 'http://127.0.0.1:1234/v1';
};

async function post<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LM Studio server error ${res.status}: ${text}`);
  }
  
  return res.json() as Promise<T>;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LM Studio server error ${res.status}: ${text}`);
  }
  
  return res.json() as Promise<T>;
}

export async function createChatCompletion(
  messages: LMStudioMessage[],
  config: LMStudioConfig = {},
  signal?: AbortSignal
): Promise<LMStudioChatCompletion> {
  return post<LMStudioChatCompletion>('/chat/completions', {
    messages,
    temperature: config.temperature ?? 0.7,
    top_p: config.top_p ?? 0.95,
    max_tokens: config.max_tokens ?? 512,
    stream: config.stream ?? false,
    model: config.model,
  }, signal);
}

export async function getAvailableModels(signal?: AbortSignal): Promise<string[]> {
  try {
    const response = await get<LMStudioModelsResponse>('/models', signal);
    return response.data.map(model => model.id);
  } catch (error) {
    console.error('Failed to fetch models from LM Studio:', error);
    // Return empty array if models endpoint fails
    return [];
  }
}

export async function testConnection(signal?: AbortSignal): Promise<boolean> {
  try {
    await get<LMStudioModelsResponse>('/models', signal);
    return true;
  } catch (error) {
    console.error('LM Studio connection test failed:', error);
    return false;
  }
}

export function formatChat(
  systemInstruction: string | undefined, 
  history: { role: 'user' | 'assistant'; content: string }[], 
  prompt: string
): LMStudioMessage[] {
  const messages: LMStudioMessage[] = [];
  
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  
  for (const m of history) {
    messages.push(m);
  }
  
  messages.push({ role: 'user', content: prompt });
  return messages;
}

export const generateResponse = async (
  model: string,
  apiKey: string | null, // Not used for local LM Studio, but kept for compatibility
  systemInstruction: string,
  chatHistory: ChatMessage[],
  prompt: string,
  config: ModelConfig
) => {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return "Error: Cannot connect to LM Studio server. Please ensure LM Studio is running at " + getBaseUrl() + " with a model loaded.";
    }

    // Get available models
    const availableModels = await getAvailableModels();
    let selectedModel = model;
    
    // If requested model is not available, use the first available model
    if (availableModels.length === 0) {
      return "Error: No models are loaded in LM Studio. Please load a model in LM Studio first.";
    }
    
    if (!availableModels.includes(model) && availableModels.length > 0) {
      selectedModel = availableModels[0];
      console.log(`Model ${model} not available in LM Studio, using ${selectedModel}`);
    }

    // Convert chat history to LM Studio format
    const messages = formatChat(
      systemInstruction,
      chatHistory.map(msg => ({
        role: msg.author === MessageAuthor.USER ? 'user' : 'assistant',
        content: msg.text
      })),
      prompt
    );

    // Generate response using LM Studio
    const completion = await createChatCompletion(messages, {
      temperature: config.temperature || 0.7,
      top_p: config.topP || 0.95,
      max_tokens: config.maxOutputTokens || 2048,
      model: selectedModel
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Calculate token usage for logging
    const inputText = systemInstruction + chatHistory.map(m => m.text).join(' ') + prompt;
    const inputTokens = completion.usage?.prompt_tokens || estimateTokenCount(inputText);
    const outputTokens = completion.usage?.completion_tokens || estimateTokenCount(responseText);
    
    // Log successful request
    logApiUsage('lm-studio', 'chat', inputTokens, outputTokens, 'success', selectedModel);
    
    return responseText;
  } catch (error) {
    console.error("Error generating response from LM Studio:", error);
    
    // Calculate input tokens for error logging
    const inputText = systemInstruction + chatHistory.map(m => m.text).join(' ') + prompt;
    const inputTokens = estimateTokenCount(inputText);
    
    let errorMessage = '';
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = `Error: Cannot connect to LM Studio server at ${getBaseUrl()}. Please ensure:
1. LM Studio is running
2. A model is loaded in LM Studio
3. The server is accessible at ${getBaseUrl()}
4. Check VITE_LM_STUDIO_BASE_URL environment variable if using custom URL

Technical error: ${error.message}`;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      // Log failed request
      logApiUsage('lm-studio', 'chat', inputTokens, 0, 'error', model, error.message);
      return errorMessage;
    }
    
    errorMessage = "An unknown error occurred while contacting the LM Studio server.";
    logApiUsage('lm-studio', 'chat', inputTokens, 0, 'error', model, errorMessage);
    return errorMessage;
  }
};

// Export a function to get the current base URL for debugging
export const getCurrentBaseUrl = (): string => {
  return getBaseUrl();
};

// Function to save LM Studio URL to localStorage
export const saveLmStudioUrl = (url: string): void => {
  try {
    // Validate and format the URL
    let formattedUrl = url.trim();
    
    // Add http:// if no protocol specified
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}`;
    }
    
    // Remove trailing slash and /v1 suffix for storage (we'll add /v1 when using it)
    formattedUrl = formattedUrl.replace(/\/$/, '').replace(/\/v1$/, '');
    
    localStorage.setItem('cmf_lm_studio_url', formattedUrl);
  } catch (error) {
    console.error('Failed to save LM Studio URL to localStorage:', error);
    throw new Error('Failed to save LM Studio URL');
  }
};

// Function to get the saved LM Studio URL (without /v1 suffix for display)
export const getSavedLmStudioUrl = (): string | null => {
  try {
    return localStorage.getItem('cmf_lm_studio_url');
  } catch (error) {
    console.warn('Failed to read LM Studio URL from localStorage:', error);
    return null;
  }
};
