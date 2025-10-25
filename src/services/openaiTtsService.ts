
import { apiKeyService } from './apiKeyService';
import { logApiUsage } from './costTrackingService';

const API_URL = 'https://api.openai.com/v1/audio/speech';

export const generateSpeech = async (
  apiKey: string | null,
  voiceName: string,
  text: string,
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[OPENAI TTS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  // Try to get API key from server if not provided
  let finalApiKey = apiKey;
  if (!finalApiKey) {
    finalApiKey = await apiKeyService.getApiKey('openaiTtsApiKey');
  }

  if (!finalApiKey) {
    throw new Error("OpenAI API key is not set for TTS. Please configure it in settings or ensure it's available on the server.");
  }
  if (!voiceName) {
    throw new Error("OpenAI Voice Name is not set for this personality.");
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${finalApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voiceName, // e.g., 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || `OpenAI TTS API Error: ${response.statusText}`;
    
    // Log failed TTS request
    logApiUsage('openai', 'tts', 0, 0, 'error', 'tts-1', errorMessage, text.length);
    
    throw new Error(errorMessage);
  }

  // Log successful TTS request
  logApiUsage('openai', 'tts', 0, 0, 'success', 'tts-1', undefined, text.length);

  return response.blob();
};
