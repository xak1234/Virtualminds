
import { GoogleGenAI, Content, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { ModelConfig, ChatMessage } from '../types';
import { MessageAuthor } from '../types';
import { estimateTokenCount, logApiUsage } from './costTrackingService';
import { apiKeyService } from './apiKeyService';

// Initialize with fallback to environment variable
let ai: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

export const clearGeminiCache = (): void => {
  console.log('[GEMINI DEBUG] Clearing cached client and API key');
  ai = null;
  cachedApiKey = null;
};

const initializeGemini = async (): Promise<GoogleGenAI> => {
  // Get the current API key
  const currentApiKey = await apiKeyService.getApiKey('geminiApiKey');
  
  // If we have a cached client but the API key has changed, clear the cache
  if (ai && cachedApiKey && cachedApiKey !== currentApiKey) {
    console.log('[GEMINI DEBUG] API key changed, clearing cache');
    clearGeminiCache();
  }
  
  if (ai && cachedApiKey === currentApiKey) {
    return ai;
  }

  // Use the current API key we already fetched
  let apiKey = currentApiKey;
  
  // DEBUG: Log what key we're actually using
  console.log('[GEMINI DEBUG] API key source and value:', {
    keyLength: apiKey?.length || 0,
    keyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'null',
    isPlaceholder: apiKey === 'your-gemini-api-key-here' || apiKey === 'REPLACE_WITH_YOUR_ACTUAL_GEMINI_API_KEY'
  });
  
  // Fallback to environment variable if server key is not available
  if (!apiKey && process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
    console.log("Using environment variable for Gemini API key");
  }

  if (!apiKey) {
    throw new Error("Gemini API key not set. Please configure it in Settings (⚙️) → API Keys → Gemini API Key");
  }

  // Cache the API key and create the client
  cachedApiKey = apiKey;
  ai = new GoogleGenAI({ apiKey });
  return ai;
};

// Completely disable all safety settings for unrestricted content generation
// Set all harm categories to BLOCK_NONE for educational/research purposes
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export interface GeminiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export const generateResponse = async (
  model: string,
  systemInstruction: string,
  chatHistory: ChatMessage[],
  prompt: string,
  config: ModelConfig
): Promise<GeminiResponse> => {
  try {
    // Initialize Gemini with API key from server
    const geminiClient = await initializeGemini();
    
    const contents: Content[] = chatHistory.map(message => ({
        role: message.author === MessageAuthor.USER ? 'user' : 'model',
        parts: [{ text: `[${new Date(message.timestamp).toLocaleString()}] ${message.text}` }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    // Use explicit safety settings to disable all content filtering
    const response = await geminiClient.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        ...config,
        // Explicitly disable all safety filters for educational content
        safetySettings,
      },
    });

    // Calculate input tokens (system instruction + chat history + current prompt)
    const inputText = systemInstruction + 
      chatHistory.map(m => m.text).join(' ') + 
      prompt;
    const inputTokens = estimateTokenCount(inputText);
    
    // Calculate output tokens
    const outputTokens = estimateTokenCount(response.text);

    // Log successful request
    logApiUsage('google', 'chat', inputTokens, outputTokens, 'success', model);

    return {
      text: response.text,
      inputTokens,
      outputTokens,
    };
  } catch (error) {
    console.error("Error generating response from Gemini:", error);
    let errorMessage = "An unknown error occurred while contacting the AI.";

    // Calculate input tokens for error logging
    const inputText = systemInstruction + 
      chatHistory.map(m => m.text).join(' ') + 
      prompt;
    const inputTokens = estimateTokenCount(inputText);

    if (error instanceof Error && error.message) {
        // Check for API key related errors
        if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('401')) {
            errorMessage = "Gemini API Key Error: Invalid or expired API key. Please check your API key in settings.";
            // Clear the cached client to force re-initialization
            clearGeminiCache();
        } else {
            try {
                // The API sometimes returns a JSON string in the error message
                const errorData = JSON.parse(error.message);
                if (errorData.error) {
                    if (errorData.error.status === 'RESOURCE_EXHAUSTED') {
                        errorMessage = "AI Quota Error: You have exceeded your current Gemini API quota. Please check your plan and billing details on the Google AI Studio website.";
                    } else if (errorData.error.message && errorData.error.message.includes('safety')) {
                        // Provide transparent error without suggesting topic avoidance
                        errorMessage = `API Safety Filter Triggered: ${errorData.error.message}. Note: Safety filters are disabled in configuration but may still trigger at API level. This is an API limitation, not an application restriction.`;
                    } else {
                        errorMessage = `Gemini API Error: ${errorData.error.message || 'An unknown API error occurred.'}`;
                    }
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            } catch (e) {
                // Check for safety-related errors in the raw message
                if (error.message.toLowerCase().includes('safety') || 
                    error.message.toLowerCase().includes('blocked') ||
                    error.message.toLowerCase().includes('harmful')) {
                    errorMessage = `API Safety Filter Triggered: ${error.message}. Note: This is an API-level limitation, not an application restriction. All safety settings are disabled in the configuration.`;
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            }
        }
    }

    // Log failed request
    logApiUsage('google', 'chat', inputTokens, 0, 'error', model, errorMessage);

    return {
      text: errorMessage,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
};