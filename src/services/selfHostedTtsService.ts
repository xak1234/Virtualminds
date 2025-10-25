/**
 * Self-Hosted TTS Service using Coqui XTTS-v2
 * 
 * This service connects to a self-hosted Coqui XTTS API server for voice cloning.
 * 
 * Benefits:
 * - Near-zero cost (after setup)
 * - No API limits
 * - Full control over voices
 * - Privacy - no data sent to third parties
 * 
 * Setup: See SELF-HOSTED-TTS-SETUP.md for installation instructions
 */

export interface SelfHostedTtsOptions {
  voiceName?: string; // Name of the cloned voice to use (e.g., "tony_blair", "jimmy_savile")
  language?: string; // Language code (e.g., "en", "es", "fr")
  speed?: number; // Speed multiplier (0.5 - 2.0)
}

// Default API endpoint - can be overridden in settings
const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * Generate speech using self-hosted Coqui XTTS server
 */
export const generateSpeech = async (
  apiUrl: string | null,
  voiceName: string,
  text: string,
  options?: SelfHostedTtsOptions
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[SELF-HOSTED TTS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  const finalApiUrl = apiUrl || DEFAULT_API_URL;
  
  if (!voiceName) {
    throw new Error("Voice name is required for self-hosted TTS.");
  }

  console.log(`[SELF-HOSTED TTS] Requesting speech for voice: ${voiceName}`);

  try {
    const response = await fetch(`${finalApiUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voiceName,
        language: options?.language || 'en',
        speed: options?.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Self-Hosted TTS API Error: ${response.statusText}`);
    }

    // Check if response is JSON (error) or audio blob
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error from TTS server');
    }

    return response.blob();
  } catch (error) {
    console.error('[SELF-HOSTED TTS] Error:', error);
    throw error;
  }
};

/**
 * Check if the self-hosted TTS server is available
 */
export const checkServerStatus = async (apiUrl: string | null): Promise<boolean> => {
  const finalApiUrl = apiUrl || DEFAULT_API_URL;
  
  try {
    const response = await fetch(`${finalApiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('[SELF-HOSTED TTS] Server not available:', error);
    return false;
  }
};

/**
 * Get list of available cloned voices from the server
 */
export const listVoices = async (apiUrl: string | null): Promise<string[]> => {
  const finalApiUrl = apiUrl || DEFAULT_API_URL;
  
  try {
    const response = await fetch(`${finalApiUrl}/voices`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('[SELF-HOSTED TTS] Error fetching voices:', error);
    return [];
  }
};

// Voice name mappings - maps personality names to voice file names (without extension)
export const VOICE_NAME_MAPPINGS: Record<string, string[]> = {
  'andrew': ['prince_andrew', 'prince andrew', 'andrew', 'duke of york'],
  'jimmy': ['jimmy_savile', 'jimmy savile', 'jimmy', 'jim savile', 'savile'],
  'katey': ['katie_price', 'katie price', 'katie', 'katey', 'kp', 'jordan'],
  'shann': ['karen_shannon', 'karen shannon', 'karen', 'shannon', 'shann'],
  'tony': ['tony_blair', 'tony blair', 'tony', 'blair', 'prime minister blair'],
  'yorkshire': ['yorkshire_rip', 'yorkshire ripper', 'yorkshire', 'rip', 'peter sutcliffe'],
};

/**
 * Find the best matching voice for a personality
 * Uses fuzzy matching to find the closest voice name
 */
export const findBestVoiceMatch = (
  personalityName: string,
  availableVoices: string[]
): string | null => {
  if (!personalityName || availableVoices.length === 0) {
    return null;
  }

  const nameLower = personalityName.toLowerCase().trim();
  
  // First, try exact match with available voices
  if (availableVoices.includes(nameLower)) {
    return nameLower;
  }

  // Try to find mapping
  for (const [voiceFile, aliases] of Object.entries(VOICE_NAME_MAPPINGS)) {
    // Check if voice file exists in available voices
    if (!availableVoices.includes(voiceFile)) {
      continue;
    }

    // Check if personality name matches any alias
    for (const alias of aliases) {
      if (nameLower.includes(alias) || alias.includes(nameLower)) {
        console.log(`[SELF-HOSTED TTS] Matched "${personalityName}" to voice "${voiceFile}" via alias "${alias}"`);
        return voiceFile;
      }
    }
  }

  // Fuzzy match: check if any voice name is contained in personality name
  for (const voice of availableVoices) {
    if (nameLower.includes(voice) || voice.includes(nameLower)) {
      console.log(`[SELF-HOSTED TTS] Fuzzy matched "${personalityName}" to voice "${voice}"`);
      return voice;
    }
  }

  console.warn(`[SELF-HOSTED TTS] No voice match found for "${personalityName}"`);
  return null;
};

/**
 * Get voice for personality (legacy - kept for backward compatibility)
 */
export const getVoiceForPersonality = async (
  personalityName: string,
  apiUrl: string | null
): Promise<string | null> => {
  const availableVoices = await listVoices(apiUrl);
  return findBestVoiceMatch(personalityName, availableVoices);
};

