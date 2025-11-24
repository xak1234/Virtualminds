import { apiKeyService } from './apiKeyService';
import type { TtsEmotion } from '../types';
import { logApiUsage } from './costTrackingService';

// Azure Cognitive Services TTS
// Requires: Azure subscription key and region

export interface AzureTtsOptions {
  voice?: string; // e.g., 'en-US-JennyNeural'
  emotion?: TtsEmotion;
  emotionIntensity?: number; // 0.0 to 1.0
  rate?: number; // 0.5 to 2.0
  pitch?: number; // -50% to +50%
}

const EMOTION_TO_AZURE_STYLE: Record<TtsEmotion, string> = {
  neutral: 'neutral',
  happy: 'cheerful',
  sad: 'sad',
  angry: 'angry',
  excited: 'excited',
  fearful: 'fearful',
  surprised: 'shouting', // Azure doesn't have surprised, use excited
  disgusted: 'unfriendly',
};

export const generateSpeech = async (
  apiKey: string | null,
  text: string,
  options?: AzureTtsOptions
): Promise<Blob> => {
  // CRITICAL: Check if global TTS is enabled before making ANY API calls
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[AZURE TTS] Aborting generateSpeech - global TTS is disabled');
    throw new Error('Global TTS is disabled - no API call will be made');
  }

  let finalApiKey = apiKey;
  if (!finalApiKey) {
    try {
      finalApiKey = await apiKeyService.getApiKey('azureApiKey');
    } catch (error) {
      console.warn('Failed to get Azure API key from localStorage:', error);
      finalApiKey = null;
    }
  }

  if (!finalApiKey) {
    throw new Error("Azure API key is not set. Please configure it in Settings → Text to Speech → Azure API Key.");
  }

  // Azure requires region - try to get from localStorage or default to northeurope
  // You can change this to your Azure Speech Service region: uksouth, westeurope, westus2, etc.
  const region = localStorage.getItem('azure_tts_region') || 'northeurope';
  const voice = options?.voice || 'en-GB-LibbyNeural'; // Default to young British female
  const emotion = options?.emotion || 'neutral';
  const intensity = options?.emotionIntensity ?? 1.0;
  const rate = options?.rate ?? 1.0;
  const pitch = options?.pitch ?? 0;

  // Build SSML with emotion support
  const azureStyle = EMOTION_TO_AZURE_STYLE[emotion];
  const styleDegree = intensity.toFixed(2); // 0.01 to 2.00 for Azure
  
  // Escape XML special characters properly
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Build SSML - use simple format to avoid 400 errors
  // The voice parameter is now set by the smart selector in ttsService.ts
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}">${escapedText}</voice></speak>`;

  console.log('[AZURE TTS] Request:', { region, voice, emotion, ssmlLength: ssml.length });

  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': finalApiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'CriminalMindsFramework'
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AZURE TTS] Full Error Details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      region: region,
      voice: voice,
      ssml: ssml.substring(0, 200) + '...',
      endpoint: `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
    });
    
    // If 400 error and voice might not be supported, try fallback voices
    if (response.status === 400) {
      console.warn(`[AZURE TTS] Voice ${voice} may not be available in region ${region}. Trying fallback...`);
      
      // Try with a guaranteed-available voice
      const fallbackVoices = ['en-GB-RyanNeural', 'en-GB-SoniaNeural', 'en-US-JennyNeural', 'en-US-GuyNeural'];
      
      for (const fallbackVoice of fallbackVoices) {
        if (fallbackVoice === voice) continue; // Don't retry the same voice
        
        try {
          console.log(`[AZURE TTS] Trying fallback voice: ${fallbackVoice}`);
          const fallbackSsml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${fallbackVoice}">${escapedText}</voice></speak>`;
          
          const fallbackResponse = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': finalApiKey,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
              'User-Agent': 'CriminalMindsFramework'
            },
            body: fallbackSsml,
          });
          
          if (fallbackResponse.ok) {
            console.log(`[AZURE TTS] Success with fallback voice: ${fallbackVoice}`);
            // Log successful TTS request with fallback voice
            logApiUsage('azure', 'tts', 0, 0, 'success', 'azure-tts', undefined, text.length);
            return fallbackResponse.blob();
          }
        } catch (fallbackError) {
          console.warn(`[AZURE TTS] Fallback voice ${fallbackVoice} also failed:`, fallbackError);
        }
      }
    }
    
    // Log failed TTS request
    logApiUsage('azure', 'tts', 0, 0, 'error', 'azure-tts', `Azure TTS Error ${response.status}: ${errorText || response.statusText}. Voice: ${voice}, Region: ${region}`, text.length);
    
    throw new Error(`Azure TTS Error ${response.status}: ${errorText || response.statusText}. Voice: ${voice}, Region: ${region}`);
  }

  // Log successful TTS request
  logApiUsage('azure', 'tts', 0, 0, 'success', 'azure-tts', undefined, text.length);

  return response.blob();
};

// Available neural voices with emotion support and characteristics
// Only including voices confirmed to work in most Azure regions including North Europe
export const AZURE_VOICES = [
  // British Voices (Core voices - widely available)
  { name: 'en-GB-SoniaNeural', gender: 'Female', age: 'adult', accent: 'British', emotions: true, description: 'Clear, professional British female' },
  { name: 'en-GB-RyanNeural', gender: 'Male', age: 'adult', accent: 'British', emotions: true, description: 'Deep, authoritative British male' },
  { name: 'en-GB-LibbyNeural', gender: 'Female', age: 'young', accent: 'British', emotions: false, description: 'Young British female' },
  
  // American Voices (Core voices - widely available)
  { name: 'en-US-JennyNeural', gender: 'Female', age: 'adult', accent: 'American', emotions: true, description: 'Friendly American female' },
  { name: 'en-US-GuyNeural', gender: 'Male', age: 'adult', accent: 'American', emotions: true, description: 'Professional American male' },
  { name: 'en-US-AriaNeural', gender: 'Female', age: 'adult', accent: 'American', emotions: true, description: 'Warm American female' },
];

// Smart voice selector based on personality characteristics
export const selectAzureVoice = (personality?: {
  name?: string;
  prompt?: string;
  knowledge?: string;
  gender?: 'male' | 'female';
}): string => {
  if (!personality) return 'en-GB-LibbyNeural'; // Default young British female
  
  const text = `${personality.name || ''} ${personality.prompt || ''} ${personality.knowledge || ''}`.toLowerCase();
  
  // Detect gender from text or explicit gender field
  let preferredGender: 'Male' | 'Female' = 'Female';
  const maleIndicators = ['he', 'him', 'his', 'man', 'male', 'boy', 'mr', 'sir', 'gentleman', 'father', 'son', 'brother', 'king', 'prince'];
  const femaleIndicators = ['she', 'her', 'hers', 'woman', 'female', 'girl', 'mrs', 'ms', 'miss', 'lady', 'mother', 'daughter', 'sister', 'queen', 'princess'];
  
  const maleCount = maleIndicators.filter(word => text.includes(word)).length;
  const femaleCount = femaleIndicators.filter(word => text.includes(word)).length;
  
  if (personality.gender) {
    preferredGender = personality.gender === 'male' ? 'Male' : 'Female';
  } else if (maleCount > femaleCount) {
    preferredGender = 'Male';
  }
  
  // Detect age
  let preferredAge: 'child' | 'young' | 'adult' = 'adult';
  if (text.includes('child') || text.includes('kid') || text.includes('young boy') || text.includes('young girl')) {
    preferredAge = 'child';
  } else if (text.includes('teenager') || text.includes('teen') || text.includes('youth') || text.includes('adolescent')) {
    preferredAge = 'young';
  } else if (text.includes('old') || text.includes('elderly') || text.includes('aged') || text.includes('senior')) {
    preferredAge = 'adult'; // Use mature adult voices
  }
  
  // Detect accent - prioritize British
  let preferredAccent: 'British' | 'American' | 'Australian' = 'British';
  if (text.includes('american') || text.includes('usa') || text.includes('united states') || text.includes('new york') || text.includes('california')) {
    preferredAccent = 'American';
  } else if (text.includes('australian') || text.includes('aussie') || text.includes('sydney') || text.includes('melbourne')) {
    preferredAccent = 'Australian';
  }
  // Default to British for UK-related terms or no clear indicator
  
  // Score voices based on preferences
  const scoreVoice = (voice: typeof AZURE_VOICES[0]): number => {
    let score = 0;
    
    // Gender match
    if (voice.gender === preferredGender) score += 10;
    
    // Age match
    if (voice.age === preferredAge) score += 8;
    
    // Accent match (highest priority for British)
    if (voice.accent === preferredAccent) score += 15;
    
    // Emotion support is a bonus
    if (voice.emotions) score += 3;
    
    // Personality-specific assignments for better variety
    const personalityName = personality.name?.toLowerCase() || '';
    // Male personalities get Ryan (deep British male)
    if ((personalityName.includes('tony blair') || personalityName.includes('keir starmer') || 
         personalityName.includes('jimmy savile') || personalityName.includes('prince andrew') || 
         personalityName.includes('yorkshire ripper')) && voice.name === 'en-GB-RyanNeural') score += 20;
    // Female personalities get Sonia (professional British female)
    if ((personalityName.includes('lucy letby') || personalityName.includes('jill dando') || 
         personalityName.includes('rose west')) && voice.name === 'en-GB-SoniaNeural') score += 20;
    
    return score;
  };
  
  // Sort voices by score
  const sortedVoices = [...AZURE_VOICES].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  
  // Return best match
  const selectedVoice = sortedVoices[0];
  console.log(`[Azure TTS] Selected voice for ${personality.name}: ${selectedVoice.name} (${selectedVoice.description})`);
  
  return selectedVoice.name;
};

