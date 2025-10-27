import { TtsProvider, TtsEmotion } from '../types';
import * as elevenlabsService from './elevenlabsService';
import * as openaiTtsService from './openaiTtsService';
import * as geminiTtsService from './geminiTtsService';
import * as azureTtsService from './azureTtsService';
import * as selfHostedTtsService from './selfHostedTtsService';
import { filterForSpeech } from './textFilterService';
import { voiceIdRegistry } from './voiceIdRegistryService';

let audio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

// -------- Browser TTS helpers for better voice & prosody --------
const waitForVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      const existing = synth.getVoices();
      if (existing && existing.length > 0) {
        resolve(existing);
        return;
      }
      const handler = () => {
        const voices = synth.getVoices();
        if (voices && voices.length > 0) {
          synth.removeEventListener('voiceschanged', handler);
          resolve(voices);
        }
      };
      synth.addEventListener('voiceschanged', handler);
      // Fallback timeout
      setTimeout(() => {
        try { synth.removeEventListener('voiceschanged', handler); } catch {}
        resolve(synth.getVoices());
      }, 1500);
    } catch {
      resolve([]);
    }
  });
};

const detectAccentFromPersonality = (options?: SpeakOptions): 'en-US' | 'en-GB' | 'en-AU' | 'en-IN' => {
  if (!options?.personality) return 'en-US';
  
  const text = `${options.personality.name}\n${options.personality.prompt}\n${options.personality.knowledge}`.toLowerCase();
  
  // British indicators - prioritize British voices for British characters
  if (/(\buk\b|british|england|london|oxford|manchester|yorkshire|birmingham|liverpool|glasgow|edinburgh|wales|scotland|northern ireland|cornwall|devon|surrey|essex|kent|sussex|norfolk|suffolk)/.test(text)) {
    return 'en-GB';
  }
  
  // Australian indicators
  if (/(australi|aussie|sydney|melbourne|brisbane|perth|adelaide|darwin|canberra|queensland|victoria|tasmania)/.test(text)) {
    return 'en-AU';
  }
  
  // Indian indicators  
  if (/(india|indian|mumbai|delhi|bangalore|kolkata|chennai|hyderabad|pune|ahmedabad|hindi|punjabi|tamil|bengali)/.test(text)) {
    return 'en-IN';
  }
  
  // Check for specific British names/personalities
  const britishNames = ['tony blair', 'keir starmer', 'yorkshire ripper', 'lucy letby', 'jill dando', 'jimmy savile', 'rose west', 'karen matthews', 'huntley', 'prince andrew'];
  if (britishNames.some(name => text.includes(name))) {
    return 'en-GB';
  }
  
  return 'en-US'; // Default fallback
};

const pickPreferredVoice = (
  voices: SpeechSynthesisVoice[],
  preferredLangs: string[] = ['en-US', 'en-GB'],
  preferredGender?: 'male' | 'female'
): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;

  const lower = (s?: string) => (s || '').toLowerCase();
  const langPref = preferredLangs.map(l => l.toLowerCase());

  const genderHints = {
    female: ['female', 'woman', 'girl', 'fem', 'jenny', 'aria', 'emma', 'samantha', 'victoria', 'moira', 'karen', 'tessa', 'olivia', 'alloy', 'sara', 'sara (natural)'],
    male: ['male', 'man', 'boy', 'masc', 'guy', 'alex', 'daniel', 'christopher', 'matthew', 'benjamin', 'davis', 'michael', 'john']
  } as const;

  const qualityKeywords = ['natural', 'neural', 'wavenet', 'studio'];
  const microsoftHints = ['microsoft', 'online'];
  const googleHints = ['google'];
  const appleHints = ['samantha', 'victoria', 'moira', 'karen', 'tessa', 'alex', 'daniel'];

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = lower(v.name);
    const lang = lower(v.lang);
    let score = 0;

    // Language priority - stronger weighting for exact matches
    const exactLangMatch = langPref.find(l => lang === l);
    if (exactLangMatch) {
      score += 10; // Higher priority for exact matches
    } else if (langPref.some(l => lang?.startsWith(l))) {
      score += 5;
    }

    // British voice indicators - boost score for British voices
    const britishIndicators = ['uk', 'gb', 'british', 'england', 'scottish', 'welsh', 'irish', 'northern'];
    if (britishIndicators.some(indicator => name.includes(indicator) || lang.includes(indicator))) {
      score += 8;
    }

    // High-quality TTS indicators
    if (qualityKeywords.some(k => name.includes(k))) score += 6;

    // Vendor hints
    if (microsoftHints.some(k => name.includes(k))) score += 4; // Edge voices
    if (googleHints.some(k => name.includes(k))) score += 3;    // Chrome voices
    if (appleHints.some(k => name.includes(k))) score += 2;     // Safari/macOS voices

    // Default/system-preferred flag
    if ((v as any).default) score += 1;

    // Gender heuristic
    if (preferredGender) {
      const arr = preferredGender === 'female' ? genderHints.female : genderHints.male;
      if (arr.some(k => name.includes(k))) score += 3;
    }

    // Penalty for clearly American voices when British is preferred
    if (langPref[0] === 'en-gb' && (name.includes('american') || name.includes('usa') || name.includes('united states'))) {
      score -= 5;
    }

    return score;
  };

  // Pre-filter by language when possible
  const pool = ((): SpeechSynthesisVoice[] => {
    const langMatches = voices.filter(v => langPref.some(l => lower(v.lang).startsWith(l)));
    if (langMatches.length > 0) return langMatches;
    return voices;
  })();

  // Rank by score, then by name stability for determinism
  const ranked = [...pool].sort((a, b) => {
    const da = scoreVoice(a);
    const db = scoreVoice(b);
    if (db !== da) return db - da;
    return lower(a.name).localeCompare(lower(b.name));
  });

  const best = ranked[0] || pool[0] || voices[0] || null;
  return best;
};

const splitIntoSentences = (text: string): string[] => {
  const parts: string[] = [];
  let buffer = '';
  for (const ch of text) {
    buffer += ch;
    if (/[.!?]/.test(ch)) {
      parts.push(buffer.trim());
      buffer = '';
    }
  }
  if (buffer.trim().length > 0) parts.push(buffer.trim());
  // Merge very short fragments with the next one for better flow
  const merged: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.length < 10 && i + 1 < parts.length) {
      merged.push(`${p} ${parts[i + 1]}`.trim());
      i++;
    } else {
      merged.push(p);
    }
  }
  return merged.length > 0 ? merged : [text];
};

// Enhanced segmentation for more natural browser speech
interface SpeechSegment {
  text: string;
  pauseMs: number; // pause after this segment
  endChar: string | null; // '.', '!', '?', ',', ';', ':', '—', or null
}

const normalizeTextForSpeech = (text: string): string => {
  if (!text) return '';
  // Normalize unicode quotes/dashes and collapse whitespace
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2015]/g, '—') // em dash
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\.\.\s*/g, ' … ') // ellipsis as single token
    .trim();
};

const isAbbreviationEnding = (buffer: string): boolean => {
  // Common English abbreviations to avoid splitting at period
  const abbrev = [
    'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'st.', 'vs.', 'etc.',
    'i.e.', 'e.g.', 'no.', 'fig.', 'al.', 'u.s.', 'u.k.', 'a.m.', 'p.m.'
  ];
  const lower = buffer.toLowerCase().trim();
  return abbrev.some(a => lower.endsWith(a));
};

const segmentTextForSpeech = (raw: string): SpeechSegment[] => {
  const text = normalizeTextForSpeech(raw);
  const segments: SpeechSegment[] = [];
  let buf = '';

  const pushSeg = (pauseMs: number, endChar: string | null) => {
    const t = buf.trim();
    if (t.length > 0) {
      segments.push({ text: t, pauseMs, endChar });
    }
    buf = '';
  };

  const majorPause = (ch: string) => {
    switch (ch) {
      case '?': return 320 + Math.round(Math.random() * 120); // 320-440ms
      case '!': return 280 + Math.round(Math.random() * 100); // 280-380ms
      case '.': return 260 + Math.round(Math.random() * 100); // 260-360ms
      default: return 240 + Math.round(Math.random() * 80);
    }
  };
  const minorPause = (ch: string) => {
    switch (ch) {
      case ',': return 140 + Math.round(Math.random() * 60); // 140-200ms
      case ';': return 170 + Math.round(Math.random() * 70); // 170-240ms
      case ':': return 180 + Math.round(Math.random() * 80); // 180-260ms
      case '—': return 200 + Math.round(Math.random() * 90); // 200-290ms
      default: return 150 + Math.round(Math.random() * 60);
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;

    // Handle ellipsis as a major pause
    if (ch === '.' && text.slice(i, i + 3) === '...') {
      buf = buf.slice(0, -1); // remove the current period as we'll handle the whole ellipsis
      pushSeg(300 + Math.round(Math.random() * 120), '.');
      i += 2; // skip the remaining two dots
      continue;
    }

    if ('\n' === ch) {
      pushSeg(280 + Math.round(Math.random() * 100), '.');
      continue;
    }

    if (ch === '.' || ch === '!' || ch === '?') {
      // Avoid splitting on abbreviations like "Dr." or "U.S."
      if (isAbbreviationEnding(buf)) {
        continue;
      }
      pushSeg(majorPause(ch), ch);
      continue;
    }

    if (ch === ',' || ch === ';' || ch === ':' || ch === '—') {
      // Soft split for long clauses to allow micro-pauses
      const tooLong = buf.length > 80;
      if (tooLong) {
        pushSeg(minorPause(ch), ch);
      }
      continue;
    }
  }
  // Flush remainder
  if (buf.trim().length > 0) pushSeg(180 + Math.round(Math.random() * 80), null);

  // Post-process: split very long segments at nearest space (~180-220 chars)
  const maxLen = 200;
  const finalSegs: SpeechSegment[] = [];
  for (const s of segments) {
    if (s.text.length <= maxLen) { finalSegs.push(s); continue; }
    let start = 0;
    while (start < s.text.length) {
      let end = Math.min(start + maxLen, s.text.length);
      if (end < s.text.length) {
        const lastSpace = s.text.lastIndexOf(' ', end);
        if (lastSpace > start + 30) end = lastSpace; // avoid tiny tails
      }
      finalSegs.push({ text: s.text.slice(start, end).trim(), pauseMs: 160, endChar: null });
      start = end;
    }
  }

  // Merge extremely short fragments with next segment
  const merged: SpeechSegment[] = [];
  for (let i = 0; i < finalSegs.length; i++) {
    const cur = finalSegs[i];
    if (cur.text.length < 12 && i + 1 < finalSegs.length) {
      const nxt = finalSegs[i + 1];
      merged.push({ text: `${cur.text} ${nxt.text}`.trim(), pauseMs: nxt.pauseMs, endChar: nxt.endChar });
      i++;
    } else {
      merged.push(cur);
    }
  }

  return merged;
};

// Web Audio API integration for spectrum visualization
let audioCtx: (AudioContext | null) = null;
let analyser: (AnalyserNode | null) = null;
let sourceNode: (MediaElementAudioSourceNode | null) = null;

type TtsAudioEvent = { type: 'start' | 'stop'; analyser?: AnalyserNode | null; audioElement?: HTMLAudioElement | null; provider: TtsProvider; speakerId?: string };
const audioListeners = new Set<(e: TtsAudioEvent) => void>();

export const addTtsAudioListener = (fn: (e: TtsAudioEvent) => void) => { audioListeners.add(fn); };
export const removeTtsAudioListener = (fn: (e: TtsAudioEvent) => void) => { audioListeners.delete(fn); };

const notifyStart = (provider: TtsProvider, el: HTMLAudioElement | null, speakerId?: string) => {
  audioListeners.forEach(fn => fn({ type: 'start', analyser, audioElement: el, provider, speakerId }));
};
const notifyStop = (provider: TtsProvider | undefined, speakerId?: string) => {
  audioListeners.forEach(fn => fn({ type: 'stop', analyser: null, audioElement: audio, provider: provider ?? TtsProvider.BROWSER, speakerId }));
};

const ensureAnalyserForElement = (el: HTMLAudioElement) => {
  try {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return; // Web Audio not available
    if (!audioCtx || (audioCtx as any).state === 'closed') {
      audioCtx = new AC();
    }
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // small for UI badge
      analyser.smoothingTimeConstant = 0.7;
    }
    if (!sourceNode || sourceNode.mediaElement !== el) {
      // Disconnect old source if present
      try { sourceNode && sourceNode.disconnect(); } catch {}
      sourceNode = audioCtx.createMediaElementSource(el);
      // Route the source to analyser (for spectrum visualization) AND to destination (for actual audio output)
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
  } catch (e) {
    // Fail silently - visualization is optional
    console.warn('Audio analyser setup failed', e);
  }
};

const getAudioElement = () => {
  if (!audio) {
    audio = new Audio();
    try {
      // Expose for debugging and ensure present in DOM so it can be inspected/controlled
      audio.id = 'cmf-audio';
      (audio.style as any).display = 'none';
      if (typeof document !== 'undefined' && document.body && !document.getElementById('cmf-audio')) {
        document.body.appendChild(audio);
      }
      (window as any).__cmfAudio = audio; // debug handle
    } catch {}
    audio.addEventListener('ended', () => { isSpeaking = false; notifyStop(undefined); });
    audio.addEventListener('pause', () => { isSpeaking = false; notifyStop(undefined); });
  }
  return audio;
};

interface SpeakConfig {
    voiceId?: string;
    additionalVoiceIds?: string[];
    googleTtsOptions?: {
      voiceName?: string;
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      effectsProfileId?: string[];
      audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
    };
    elevenLabsApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    azureApiKey?: string;
    rate?: number; // Playback rate for Browser TTS only (0.5 - 2.0)
    // Emotion controls
    emotion?: TtsEmotion;
    emotionIntensity?: number; // 0.0 to 1.0
    // ElevenLabs advanced controls
    elevenLabsStability?: number;
    elevenLabsSimilarityBoost?: number;
    elevenLabsStyle?: number;
    elevenLabsSpeakerBoost?: boolean;
    elevenLabsModel?: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_turbo_v2' | 'eleven_monolingual_v1';
}

interface SpeakOptions {
  naturalPause?: boolean;
  fadeIn?: boolean;
  speakerId?: string;
  preferredGender?: 'male' | 'female';
  personality?: { id: string; name: string; prompt?: string; knowledge?: string };
  playbackRate?: number; // HTMLAudioElement playback rate (OpenAI/Gemini audio)
  volumeMultiplier?: number; // 0.0 - 1.5 (clamped) applied to element volume
}

interface PendingSpeechRequest {
  text: string;
  provider: TtsProvider;
  config: SpeakConfig;
  onError?: (message: string) => void;
  options?: SpeakOptions;
  startTime?: number; // Timestamp when this request started processing
}

const speechQueue: PendingSpeechRequest[] = [];
let currentlyPlayingRequest: PendingSpeechRequest | null = null;

const processNextSpeech = async (): Promise<void> => {
  if (isSpeaking) return;
  
  // Check if global TTS is enabled before processing queue
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    // Global TTS is disabled - clear the queue and don't process
    speechQueue.length = 0;
    return;
  }
  
  const next = speechQueue.shift();
  if (!next) {
    currentlyPlayingRequest = null;
    return;
  }
  // Set the start time when we begin processing this request
  next.startTime = Date.now();
  currentlyPlayingRequest = next;
  await playSpeechRequest(next);
};

const safeProcessNextSpeech = () => {
  if (speechQueue.length === 0) return;
  processNextSpeech().catch(err => console.warn('Failed to process TTS queue', err));
};

const finalizeSpeech = (provider: TtsProvider | undefined, speakerId?: string) => {
  isSpeaking = false;
  currentlyPlayingRequest = null;
  notifyStop(provider, speakerId);
  safeProcessNextSpeech();
};

const playAudioBlob = async (
  blob: Blob,
  providerUsed: TtsProvider,
  options: SpeakOptions | undefined,
  onError?: (message: string) => void
): Promise<void> => {
  // Validate blob before proceeding
  if (!blob || blob.size === 0) {
    const errorMsg = `Received empty or invalid audio blob from ${providerUsed}`;
    console.error('[TTS]', errorMsg, { blobSize: blob?.size, blobType: blob?.type });
    onError?.(errorMsg);
    finalizeSpeech(providerUsed, options?.speakerId);
    return;
  }

  // Validate blob is actually audio (ElevenLabs sometimes returns error JSON instead)
  if (providerUsed === TtsProvider.ELEVENLABS && (!blob.type || !blob.type.startsWith('audio/'))) {
    console.error('[TTS] Invalid blob type from ElevenLabs:', blob.type, 'Size:', blob.size);
    
    // Try to read the content to see if it's an error message
    try {
      const text = await blob.slice(0, 500).text();
      console.error('[TTS] Response preview:', text.substring(0, 200));
      
      if (text.includes('error') || text.includes('message') || text.includes('detail')) {
        const errorMsg = 'ElevenLabs API error - please check your API key, quota, and voice ID';
        onError?.(errorMsg);
        finalizeSpeech(providerUsed, options?.speakerId);
        return;
      }
    } catch (e) {
      console.error('[TTS] Could not read blob content:', e);
    }
    
    // Still try to play it, but warn
    console.warn('[TTS] Non-audio blob from ElevenLabs, attempting playback anyway');
  }

  // Log blob info for debugging
  try {
    console.log('[TTS] Playing audio blob:', { 
      provider: providerUsed, 
      size: blob.size, 
      type: blob.type,
      speakerId: options?.speakerId 
    });
  } catch {}

  const audioElement = getAudioElement();
  
  // CRITICAL: Stop and clear any existing audio to prevent "interrupted by new load request" errors
  try {
    audioElement.pause();
    audioElement.currentTime = 0; // Reset playback position
    
    // Revoke any existing blob URL to prevent memory leaks
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    
    audioElement.src = '';
    audioElement.load(); // Reset the element
  } catch (e) {
    console.warn('[TTS] Failed to reset audio element:', e);
  }
  
  // Increased delay to ensure the previous audio is fully cleared and prevent race conditions
  // This helps prevent the "first few words repetition" issue
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Create audio URL with multiple fallback methods
  let audioUrl: string;
  
  // Detect Firefox and use data URL by default to avoid blob URL security issues
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  
  try {
    if (isFirefox) {
      // Firefox has issues with blob URLs for audio - use data URL directly
      console.log('[TTS] Firefox detected - using data URL for better compatibility');
      throw new Error('Using data URL for Firefox compatibility');
    }
    
    // Method 1: Try blob URL (fastest) for non-Firefox browsers
    if (providerUsed === TtsProvider.ELEVENLABS) {
      // Create a new blob with explicit audio/mpeg type to ensure browser compatibility
      const audioBlob = new Blob([blob], { type: 'audio/mpeg' });
      audioUrl = URL.createObjectURL(audioBlob);
    } else {
      // For other providers, preserve original type or default to audio/mpeg
      const blobType = blob.type || 'audio/mpeg';
      const audioBlob = new Blob([blob], { type: blobType });
      audioUrl = URL.createObjectURL(audioBlob);
    }
    
    // Validate the URL was created successfully
    if (!audioUrl || audioUrl === 'blob:' || audioUrl.trim() === '') {
      throw new Error('Blob URL creation failed - empty or invalid URL');
    }
    
    // Additional validation for blob URLs - check for proper blob URL format
    if (!audioUrl.startsWith('blob:http') && !audioUrl.startsWith('blob:https')) {
      throw new Error(`Invalid blob URL format: ${audioUrl}`);
    }
    
    console.log('[TTS] Created blob URL:', audioUrl.substring(0, 50) + '...');
  } catch (urlError) {
    console.warn('[TTS] Blob URL failed, trying data URL fallback:', urlError);
    
    // Method 2: Fallback to data URL (slower but more compatible)
    try {
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader failed'));
      });
      
      reader.readAsDataURL(blob);
      audioUrl = await dataUrlPromise;
      
      console.log('[TTS] Created data URL fallback');
    } catch (dataUrlError) {
      console.error('[TTS] Both blob URL and data URL failed:', dataUrlError);
      onError?.('Audio format not supported by browser - try switching to Browser TTS');
      finalizeSpeech(providerUsed, options?.speakerId);
      return;
    }
  }

  audioElement.muted = false;
  const targetVolume = Math.min(1.0, Math.max(0.0, (options?.volumeMultiplier ?? 1.0)));
  audioElement.volume = options?.fadeIn ? Math.max(0.02, targetVolume * 0.1) : targetVolume;
  if (typeof options?.playbackRate === 'number' && options.playbackRate > 0) {
    try { audioElement.playbackRate = Math.min(2.0, Math.max(0.5, options.playbackRate * globalTtsSpeed)); } catch {}
  } else {
    try { audioElement.playbackRate = globalTtsSpeed; } catch {}
  }
  
  let finished = false;
  const cleanup = () => {
    audioElement.removeEventListener('ended', onEnd);
    audioElement.removeEventListener('pause', onPause);
    audioElement.removeEventListener('error', onErrorEvt);
    audioElement.removeEventListener('canplaythrough', onCanPlayThrough);
    audioElement.removeEventListener('loadeddata', onLoadedData);
    try { URL.revokeObjectURL(audioUrl); } catch {}
  };

  const finalize = () => {
    if (finished) return;
    finished = true;
    cleanup();
    finalizeSpeech(providerUsed, options?.speakerId);
  };

  const onEnd = () => finalize();
  const onPause = () => finalize();
  const onErrorEvt = () => {
    const code = (audioElement as any)?.error?.code;
    const errorMessage = (audioElement as any)?.error?.message || 'Unknown error';
    
    // Error code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - usually means format issue or CORS
    let userMessage = `Audio playback error`;
    if (code === 4) {
      userMessage = `ElevenLabs audio format issue - falling back to browser TTS`;
      console.error('[TTS] Media format error - likely API key issue or rate limit:', { 
        code, 
        errorMessage, 
        blobSize: blob.size, 
        blobType: blob.type,
        provider: providerUsed 
      });
      
      // Auto-fallback to browser TTS for ElevenLabs failures
      if (providerUsed === TtsProvider.ELEVENLABS) {
        console.log('[TTS] ElevenLabs playback failed - this may be due to browser security or API issues');
        console.log('[TTS] Consider switching to Browser TTS in settings for reliable audio playback');
        cleanup();
        finalize();
        return;
      }
    } else {
      console.error('[TTS] Audio element error:', { code, errorMessage, blobSize: blob.size, blobType: blob.type });
    }
    
    cleanup();
    onError?.(userMessage);
    finalize();
  };

  // Wait for audio to be ready before playing
  let loadResolve: (() => void) | null = null;
  let loadReject: ((err: any) => void) | null = null;
  const loadPromise = new Promise<void>((resolve, reject) => {
    loadResolve = resolve;
    loadReject = reject;
  });

  const onCanPlayThrough = () => {
    if (loadResolve) loadResolve();
  };

  const onLoadedData = () => {
    if (loadResolve) loadResolve();
  };

  audioElement.addEventListener('ended', onEnd);
  audioElement.addEventListener('pause', onPause);
  audioElement.addEventListener('error', onErrorEvt);
  audioElement.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
  audioElement.addEventListener('loadeddata', onLoadedData, { once: true });

  // Set up a timeout for loading
  const loadTimeout = setTimeout(() => {
    if (loadReject) {
      loadReject(new Error('Audio loading timeout'));
    }
  }, 10000); // 10 second timeout

  // Now set the source - this will trigger loading
  if (!audioUrl || audioUrl.trim() === '') {
    console.error('[TTS] Empty audioUrl, cannot set src');
    onError?.('Failed to create audio URL');
    finalizeSpeech(providerUsed, options?.speakerId);
    return;
  }
  
  audioElement.src = audioUrl;
  audioElement.load(); // Explicitly trigger load

  try {
    // Wait for audio to be ready
    await loadPromise;
    clearTimeout(loadTimeout);

    ensureAnalyserForElement(audioElement);
    try { await (audioCtx && (audioCtx as any).resume ? (audioCtx as any).resume() : Promise.resolve()); } catch {}
    notifyStart(providerUsed, audioElement, options?.speakerId);

    // Now it's safe to play
    await audioElement.play();
  } catch (playErr: any) {
    clearTimeout(loadTimeout);
    const errorMsg = `Playback failed: ${playErr?.message || playErr}. This is often due to browser autoplay policies. Click anywhere in the app and try again.`;
    console.warn('[TTS] Playback error:', errorMsg);
    onError?.(errorMsg);
    cleanup();
    // ALWAYS finalize to advance the queue - don't let errors block the queue
    finalizeSpeech(providerUsed, options?.speakerId);
    throw playErr;
  }

  if (options?.fadeIn) {
    const fadeSteps = 20;
    const fadeInterval = 50;
    for (let i = 1; i <= fadeSteps; i++) {
      setTimeout(() => {
        if (audioElement && !audioElement.paused) {
          const v = Math.min(targetVolume, (i / fadeSteps) * targetVolume);
          audioElement.volume = v;
        }
      }, i * fadeInterval);
    }
  }
};

const playSpeechRequest = async ({ text, provider, config, onError, options }: PendingSpeechRequest): Promise<void> => {
    // CRITICAL: Double-check global TTS is still enabled before playing
    const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
    if (globalTtsEnabled === 'false') {
      console.log('[TTS] Aborting playback - global TTS is disabled');
      finalizeSpeech(provider, options?.speakerId);
      return;
    }

    isSpeaking = true;

    if (options?.naturalPause) {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
      
      // Check again after pause
      const stillEnabled = localStorage.getItem('cmf_global_tts_enabled');
      if (stillEnabled === 'false') {
        console.log('[TTS] Aborting after pause - global TTS was disabled');
        finalizeSpeech(provider, options?.speakerId);
        return;
      }
    }

    const filteredText = filterForSpeech(text);
    try { console.log('[TTS] Request', { provider, textLen: filteredText.length, speakerId: options?.speakerId }); } catch {}
    
    // Track the originally requested provider to only show errors for that provider
    const originalProvider = provider;

    if (!filteredText.trim()) {
        console.log("[TTS] No first-person speech content found for TTS");
        finalizeSpeech(provider, options?.speakerId);
        return;
    }

    try {
        switch (provider) {
case TtsProvider.ELEVENLABS:
                {
                    const registryVoiceId = options?.speakerId ? voiceIdRegistry.getVoiceId(options.speakerId) : null;
                    const effectiveVoiceId = registryVoiceId || config.voiceId;
                    try { console.log('[TTS] ELEVENLABS voice selection', { registryVoiceId, configVoiceId: config.voiceId, effectiveVoiceId, emotion: config.emotion }); } catch {}
                    if (effectiveVoiceId) {
                    try {
                        // Build ElevenLabs options with emotion mapping
                        const elevenLabsOptions: elevenlabsService.ElevenLabsOptions = {
                          stability: config.elevenLabsStability,
                          similarityBoost: config.elevenLabsSimilarityBoost,
                          style: config.elevenLabsStyle,
                          useSpeakerBoost: config.elevenLabsSpeakerBoost,
                          model: config.elevenLabsModel || 'eleven_turbo_v2_5',
                        };
                        
                        // Map emotion to style parameter for expressiveness
                        if (config.emotion && config.emotion !== 'neutral') {
                          const emotionIntensity = config.emotionIntensity ?? 0.7;
                          elevenLabsOptions.style = emotionIntensity; // Higher style = more expressive
                          console.log(`[TTS] ElevenLabs emotion: ${config.emotion} (style: ${emotionIntensity})`);
                        }
                        
                        const audioBlob = await elevenlabsService.generateSpeech(config.elevenLabsApiKey || null, effectiveVoiceId, filteredText, elevenLabsOptions);
                        if (!audioBlob || audioBlob.size === 0) {
                          throw new Error('Received empty audio from ElevenLabs. Check voiceId and API key.');
                        }
                        await playAudioBlob(audioBlob, provider, options, onError);
                        return;
                    } catch (error) {
                        console.warn("ElevenLabs TTS error:", error);

                        // Check if error is related to invalid voice ID (404 or voice not found)
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        const isVoiceNotFound = errorMessage.includes('404') || 
                                               errorMessage.toLowerCase().includes('voice') && 
                                               (errorMessage.toLowerCase().includes('not found') || 
                                                errorMessage.toLowerCase().includes('was not found'));
                        
                        // If voice ID is invalid, try with a random valid ElevenLabs voice
                        if (isVoiceNotFound) {
                          console.log("Invalid voice ID detected, attempting with random ElevenLabs voice...");
                          try {
                            const voices = await elevenlabsService.listVoices(config.elevenLabsApiKey || undefined);
                            if (voices && voices.length > 0) {
                              const randomVoice = elevenlabsService.getRandomVoice(voices);
                              if (randomVoice) {
                                console.log(`[TTS] Using random ElevenLabs voice: ${randomVoice.name} (${randomVoice.voice_id})`);
                                const audioBlob = await elevenlabsService.generateSpeech(
                                  config.elevenLabsApiKey || null, 
                                  randomVoice.voice_id, 
                                  filteredText, 
                                  elevenLabsOptions
                                );
                                if (audioBlob && audioBlob.size > 0) {
                                  await playAudioBlob(audioBlob, provider, options, onError);
                                  console.log(`Successfully used random ElevenLabs voice: ${randomVoice.name}`);
                                  return;
                                }
                              }
                            }
                          } catch (randomVoiceError) {
                            console.warn("Random ElevenLabs voice also failed:", randomVoiceError);
                          }
                        }

                        // Try Gemini TTS as fallback
                        console.log("Attempting fallback to Gemini TTS...");
                        try {
                            const isGoogleVoiceName = (v?: string) => !!v && /[a-z]{2}-[A-Z]{2}-.+(Wavenet|Standard)-[A-Z]/.test(v);
                            let geminiVoice = config.googleTtsOptions?.voiceName || config.voiceId;
                            if (!isGoogleVoiceName(geminiVoice) && Array.isArray(config.additionalVoiceIds)) {
                              const candidate = config.additionalVoiceIds.find(isGoogleVoiceName);
                              if (candidate) geminiVoice = candidate;
                            }
                            if (!isGoogleVoiceName(geminiVoice)) {
                              geminiVoice = geminiTtsService.findBestVoiceMatch(config.voiceId || 'Default');
                            }

                            const audioBlob = await geminiTtsService.generateSpeech(
                              null,
                              geminiVoice,
                              filteredText,
                              {
                                speakingRate: config.googleTtsOptions?.speakingRate,
                                pitch: config.googleTtsOptions?.pitch,
                                volumeGainDb: config.googleTtsOptions?.volumeGainDb,
                                effectsProfileId: config.googleTtsOptions?.effectsProfileId,
                                audioEncoding: config.googleTtsOptions?.audioEncoding,
                              }
                            );

                            if (audioBlob && audioBlob.size > 0) {
                              await playAudioBlob(audioBlob, TtsProvider.GEMINI, options, onError);
                              console.log("Successfully fell back to Gemini TTS");
                              return;
                            }
                          } catch (fallbackError) {
                            console.warn("Gemini TTS fallback also failed:", fallbackError);
                          }

                        const message = error instanceof Error ? error.message : String(error);
                        // Only show error to user if ElevenLabs was the originally requested provider
                        if (originalProvider === TtsProvider.ELEVENLABS) {
                          onError?.(message);
                        }
                        finalizeSpeech(provider, options?.speakerId);
                    }
                } else {
                    console.warn("ElevenLabs TTS requires Voice ID.");
                    const who = options?.speakerId ? ` for speaker ${options.speakerId}` : '';
                    // Only show error to user if ElevenLabs was the originally requested provider
                    if (originalProvider === TtsProvider.ELEVENLABS) {
                      onError?.(`ElevenLabs Voice ID is not set${who}. Configure it in Settings → Text-to-Speech → Voice IDs.`);
                    }
                    finalizeSpeech(provider, options?.speakerId);
                }
                break;
                }
            case TtsProvider.OPENAI:
                {
                  // Enhanced OpenAI voice selection with all 6 available voices
                  const suggestOpenAiVoice = (): string => {
                    // All available OpenAI TTS voices with characteristics
                    const OPENAI_VOICES = {
                      'alloy': { gender: 'neutral', tone: 'balanced', accent: 'american' },
                      'echo': { gender: 'male', tone: 'deep', accent: 'american' },
                      'fable': { gender: 'male', tone: 'british', accent: 'british' },
                      'nova': { gender: 'female', tone: 'warm', accent: 'american' },
                      'onyx': { gender: 'male', tone: 'deep', accent: 'american' },
                      'shimmer': { gender: 'female', tone: 'bright', accent: 'american' }
                    };
                    
                    // Create personality-based hash for consistent voice assignment
                    const getPersonalityHash = (seed: string): number => {
                      let hash = 0;
                      for (let i = 0; i < seed.length; i++) {
                        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                        hash |= 0;
                      }
                      return Math.abs(hash);
                    };
                    
                    const seed = options?.personality?.id || options?.personality?.name || 'default';
                    const personalityText = options?.personality ? 
                      `${options.personality.name} ${options.personality.prompt || ''} ${options.personality.knowledge || ''}`.toLowerCase() : '';
                    
                    // Score voices based on personality characteristics
                    const scoreVoice = (voiceName: string, voiceData: typeof OPENAI_VOICES[keyof typeof OPENAI_VOICES]): number => {
                      let score = 1; // Base score
                      
                      // Gender matching
                      if (options?.preferredGender) {
                        if (options.preferredGender === 'female' && voiceData.gender === 'female') score += 10;
                        if (options.preferredGender === 'male' && voiceData.gender === 'male') score += 10;
                        if (voiceData.gender === 'neutral') score += 5; // Neutral works for anyone
                      }
                      
                      // Accent matching for British characters
                      if (personalityText.includes('british') || personalityText.includes('england') || 
                          personalityText.includes('london') || personalityText.includes('uk') ||
                          personalityText.includes('tony blair') || personalityText.includes('keir starmer') ||
                          personalityText.includes('lucy letby') || personalityText.includes('jill dando')) {
                        if (voiceData.accent === 'british') score += 15;
                        if (voiceData.accent === 'american') score -= 5; // Penalize American for British characters
                      }
                      
                      // Personality-specific voice assignments for better variety
                      const personalityName = options?.personality?.name?.toLowerCase() || '';
                      
                      // Specific character voice preferences
                      if (personalityName.includes('tony blair') && voiceName === 'fable') score += 20;
                      if (personalityName.includes('lucy letby') && voiceName === 'nova') score += 20;
                      if (personalityName.includes('jill dando') && voiceName === 'shimmer') score += 20;
                      if (personalityName.includes('keir starmer') && voiceName === 'echo') score += 20;
                      
                      // Distribute remaining personalities across voices for variety
                      const hash = getPersonalityHash(seed);
                      const voiceIndex = Object.keys(OPENAI_VOICES).indexOf(voiceName);
                      if ((hash % 6) === voiceIndex) score += 8; // Boost score for hash-matched voice
                      
                      return score;
                    };
                    
                    // Score all voices and pick the best one
                    const voiceScores = Object.entries(OPENAI_VOICES).map(([voiceName, voiceData]) => ({
                      voice: voiceName,
                      score: scoreVoice(voiceName, voiceData),
                      data: voiceData
                    })).sort((a, b) => b.score - a.score);
                    
                    const selectedVoice = voiceScores[0].voice;
                    
                    // Log voice selection for debugging
                    try {
                      console.log(`[OpenAI TTS] Selected voice "${selectedVoice}" for ${options?.personality?.name || 'unknown'} (score: ${voiceScores[0].score})`);
                    } catch {}
                    
                    return selectedVoice;
                  };

                  const chosenVoice = config.voiceId || suggestOpenAiVoice();
                  try {
                    const audioBlob = await openaiTtsService.generateSpeech(config.openaiApiKey || null, chosenVoice, filteredText);
                    if (!audioBlob || audioBlob.size === 0) {
                      throw new Error('Received empty audio from OpenAI TTS. Check voice name and API key.');
                    }
                    await playAudioBlob(audioBlob, provider, options, onError);
                    return;
                  } catch (firstError) {
                    // Fallback to 'alloy' if chosen voice failed
                    if (chosenVoice !== 'alloy') {
                      try {
                        const audioBlob = await openaiTtsService.generateSpeech(config.openaiApiKey || null, 'alloy', filteredText);
                        if (!audioBlob || audioBlob.size === 0) {
                          throw new Error('Received empty audio from OpenAI TTS (alloy)');
                        }
                        await playAudioBlob(audioBlob, provider, options, onError);
                        return;
                      } catch (secondError) {
                        console.warn('OpenAI TTS fallback to alloy failed:', secondError);
                        // Only show error if OpenAI was originally requested
                        if (originalProvider === TtsProvider.OPENAI) {
                          onError?.(secondError instanceof Error ? secondError.message : String(secondError));
                        }
                        finalizeSpeech(provider, options?.speakerId);
                        break;
                      }
                    } else {
                      console.warn('OpenAI TTS error:', firstError);
                      // Only show error if OpenAI was originally requested
                      if (originalProvider === TtsProvider.OPENAI) {
                        onError?.(firstError instanceof Error ? firstError.message : String(firstError));
                      }
                      finalizeSpeech(provider, options?.speakerId);
                      break;
                    }
                  }
                }
                break;
            case TtsProvider.AZURE:
                {
                    try {
                        if (!config.azureApiKey) {
                            throw new Error('Azure API key not configured. Go to Settings → Text to Speech → Azure API Key.');
                        }
                        
                        // Use smart voice selector if no voice is manually configured
                        const selectedVoice = config.voiceId || azureTtsService.selectAzureVoice(options?.personality);
                        
                        console.log(`[TTS] Using Azure TTS - Voice: ${selectedVoice}, Emotion: ${config.emotion || 'neutral'}`);
                        const audioBlob = await azureTtsService.generateSpeech(
                          config.azureApiKey || null,
                          filteredText,
                          {
                            voice: selectedVoice,
                            emotion: config.emotion,
                            emotionIntensity: config.emotionIntensity,
                            rate: config.rate,
                          }
                        );
                        await playAudioBlob(audioBlob, provider, options, onError);
                        return;
                    } catch (error) {
                        console.warn("Azure TTS error:", error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        // Only show error if Azure was originally requested
                        if (originalProvider === TtsProvider.AZURE) {
                          onError?.(errorMessage);
                        }
                        finalizeSpeech(provider, options?.speakerId);
                        // Fallback to browser TTS
                        console.log('[TTS] Falling back to Browser TTS');
                    }
                }
                break;


            case TtsProvider.GEMINI:
                {
                    // Pick the best voice for Google TTS: prefer a Google-style voice name from config.voiceId or additionalVoiceIds
                    const isGoogleVoiceName = (v?: string) => !!v && /[a-z]{2}-[A-Z]{2}-.+(Wavenet|Standard)-[A-Z]/.test(v);
                    let googleVoice = config.googleTtsOptions?.voiceName || config.voiceId;
                    const extras = config.additionalVoiceIds;
                    if (!isGoogleVoiceName(googleVoice) && Array.isArray(extras)) {
                      const candidate = extras.find(isGoogleVoiceName);
                      if (candidate) googleVoice = candidate;
                    }
                    if (!isGoogleVoiceName(googleVoice)) {
                      // fallback to heuristic if none provided
                      googleVoice = 'en-US-Wavenet-A';
                    }

                    try {
                        const audioBlob = await geminiTtsService.generateSpeech(
                          config.geminiApiKey || null,
                          googleVoice,
                          filteredText,
                          {
                            speakingRate: config.googleTtsOptions?.speakingRate,
                            pitch: config.googleTtsOptions?.pitch,
                            volumeGainDb: config.googleTtsOptions?.volumeGainDb,
                            effectsProfileId: config.googleTtsOptions?.effectsProfileId,
                            audioEncoding: config.googleTtsOptions?.audioEncoding,
                          }
                        );
                        if (!audioBlob || audioBlob.size === 0) {
                          throw new Error('Received empty audio from Google Cloud TTS. Check voice name and API key.');
                        }
                        await playAudioBlob(audioBlob, provider, options, onError);
                        return;
                    } catch (error) {
                        console.warn("Google Cloud TTS error:", error);
                        // Only show error if Gemini was originally requested
                        if (originalProvider === TtsProvider.GEMINI) {
                          onError?.(error instanceof Error ? error.message : String(error));
                        }
                        finalizeSpeech(provider, options?.speakerId);
                    }
                }
                break;
            
            case TtsProvider.SELF_HOSTED:
                {
                    try {
                        // Get API URL from config (localStorage or default)
                        const apiUrl = localStorage.getItem('self_hosted_tts_url') || config.selfHostedUrl || null;
                        
                        // Get voice name from personality or config
                        let voiceName = config.voiceId;
                        
                        // Check if the saved voice ID is an ElevenLabs ID (long alphanumeric string)
                        // ElevenLabs IDs are typically 20+ characters, self-hosted are short like "tony", "andrew"
                        const isElevenLabsId = voiceName && voiceName.length > 15 && /^[a-zA-Z0-9]+$/.test(voiceName);
                        
                        if (isElevenLabsId) {
                            console.log(`[TTS] Detected ElevenLabs voice ID "${voiceName}" - clearing for self-hosted TTS`);
                            voiceName = null;
                            // Clear the invalid voice ID from registry
                            if (options?.personality?.id) {
                                voiceIdRegistry.removeVoiceId(options.personality.id);
                            }
                        }
                        
                        // If no voice ID configured, try to automatically match personality name to available voices
                        if (!voiceName && options?.personality?.name) {
                            console.log(`[TTS] No voice ID configured, attempting auto-match for: ${options.personality.name}`);
                            voiceName = await selfHostedTtsService.getVoiceForPersonality(options.personality.name, apiUrl);
                            
                            if (voiceName) {
                                console.log(`[TTS] Auto-matched "${options.personality.name}" to voice "${voiceName}"`);
                                // Save the matched voice for future use
                                if (options.personality.id) {
                                    voiceIdRegistry.setVoiceId(options.personality.id, voiceName);
                                }
                            }
                        }
                        
                        if (!voiceName) {
                            throw new Error(`Self-Hosted TTS: No voice found for "${options?.personality?.name || 'this personality'}". Available voices: ${(await selfHostedTtsService.listVoices(apiUrl)).join(', ') || 'none'}`);
                        }
                        
                        console.log(`[TTS] Using Self-Hosted TTS - Voice: ${voiceName}, API: ${apiUrl || 'http://localhost:8000'}`);
                        
                        const audioBlob = await selfHostedTtsService.generateSpeech(
                          apiUrl,
                          voiceName,
                          filteredText,
                          {
                            language: 'en',
                            speed: config.rate || 1.0,
                          }
                        );
                        
                        if (!audioBlob || audioBlob.size === 0) {
                          throw new Error('Received empty audio from Self-Hosted TTS server.');
                        }
                        
                        await playAudioBlob(audioBlob, provider, options, onError);
                        return;
                    } catch (error) {
                        console.warn("Self-Hosted TTS error:", error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        // Only show error if Self-Hosted was originally requested
                        if (originalProvider === TtsProvider.SELF_HOSTED) {
                          onError?.(errorMessage);
                        }
                        finalizeSpeech(provider, options?.speakerId);
                        
                        // Fallback to Azure TTS if available
                        if (config.azureApiKey) {
                            console.log('[TTS] Falling back to Azure TTS');
                            try {
                                const selectedVoice = config.voiceId || azureTtsService.selectAzureVoice(options?.personality);
                                const audioBlob = await azureTtsService.generateSpeech(
                                    config.azureApiKey || null,
                                    filteredText,
                                    {
                                        voice: selectedVoice,
                                        emotion: config.emotion,
                                        emotionIntensity: config.emotionIntensity,
                                        rate: config.rate,
                                    }
                                );
                                await playAudioBlob(audioBlob, TtsProvider.AZURE, options, onError);
                                return;
                            } catch (fallbackError) {
                                console.warn('[TTS] Azure fallback also failed:', fallbackError);
                            }
                        }
                        
                        // Final fallback to browser TTS
                        console.log('[TTS] Falling back to Browser TTS');
                    }
                }
                break;
            
            case TtsProvider.BROWSER:
            default:
                if ('speechSynthesis' in window) {
                    const synth = window.speechSynthesis;
                    const baseRate = Math.max(0.5, Math.min((config.rate ?? 1.0) * globalTtsSpeed, 2.0));
                    const segments = segmentTextForSpeech(filteredText);

                    // Load voices and pick a good one based on personality accent
                    let voice: SpeechSynthesisVoice | null = null;
                    try {
                      const voices = await waitForVoices();
                      const detectedAccent = detectAccentFromPersonality(options);
                      
                      // Prioritize detected accent, fallback to others
                      const preferredLangs = detectedAccent === 'en-GB' 
                        ? ['en-GB', 'en-AU', 'en-IN'] // Avoid American for British characters
                        : detectedAccent === 'en-AU'
                        ? ['en-AU', 'en-GB', 'en-US']
                        : detectedAccent === 'en-IN'
                        ? ['en-IN', 'en-GB', 'en-US']
                        : ['en-US', 'en-GB']; // Default American preference
                      
                      voice = pickPreferredVoice(voices, preferredLangs, options?.preferredGender, options?.speakerId);
                      
                      // Log voice selection for debugging
                      if (voice && options?.speakerId) {
                        const personality = options.personality;
                        try {
                          console.log(`[TTS] Voice selected for ${personality?.name || 'unknown'}: ${voice.name} (${voice.lang}) - Detected accent: ${detectedAccent}`);
                        } catch {}
                      }
                    } catch {
                      voice = null;
                    }

                    // Start notification (no analyser for browser TTS)
                    notifyStart(TtsProvider.BROWSER, null, options?.speakerId);

                    let index = 0;
                    const speakNext = () => {
                      if (!isSpeaking) return; // cancelled
                      if (index >= segments.length) {
                        finalizeSpeech(TtsProvider.BROWSER, options?.speakerId);
                        return;
                      }
                      const seg = segments[index++];
                      const u = new SpeechSynthesisUtterance(seg.text);
                      currentUtterance = u;
                      u.lang = voice?.lang || 'en-US';
                      if (voice) u.voice = voice;

                      // Prosody adjustments based on segment type
                      const end = seg.endChar;
                      const pitchJitter = (Math.random() * 0.04) - 0.02; // professional: subtle pitch variation
                      const rateJitter = (Math.random() * 0.04) - 0.02;  // professional: subtle rate variation
                      let basePitch = options?.preferredGender === 'female' ? 1.04 : options?.preferredGender === 'male' ? 0.98 : 1.0;
                      let rate = baseRate;
                      if (end === '?') { basePitch += 0.08; rate += 0.03; }
                      if (end === '!') { basePitch += 0.04; rate += 0.04; }

                      u.pitch = Math.min(2, Math.max(0.5, basePitch + pitchJitter));
                      u.rate = Math.min(2.0, Math.max(0.5, rate + rateJitter));
                      u.volume = 1.0;
                      u.onerror = (e: any) => {
                        // Only show error if Browser TTS was originally requested
                        if (originalProvider === TtsProvider.BROWSER) {
                          onError?.(`Browser TTS error: ${e?.error || 'unknown'}`);
                        }
                        finalizeSpeech(TtsProvider.BROWSER, options?.speakerId);
                      };
                      u.onend = () => {
                        // Natural pause between segments based on punctuation strength
                        const pause = Math.max(80, Math.round(seg.pauseMs * (0.85 + Math.random() * 0.3)));
                        setTimeout(speakNext, pause);
                      };
                      try {
                        synth.speak(u);
                      } catch (speakErr: any) {
                        // Only show error if Browser TTS was originally requested
                        if (originalProvider === TtsProvider.BROWSER) {
                          onError?.(`Browser TTS failed: ${speakErr?.message || speakErr}`);
                        }
                        finalizeSpeech(TtsProvider.BROWSER, options?.speakerId);
                      }
                    };

                    // Optionally natural pause before starting
                    if (options?.naturalPause) {
                      await new Promise(res => setTimeout(res, 250 + Math.random() * 250));
                    }

                    // Kick off the chain
                    speakNext();
                } else {
                    console.warn("Text-to-Speech is not supported in this browser.");
                    // Only show error if Browser TTS was originally requested
                    if (originalProvider === TtsProvider.BROWSER) {
                      onError?.("Text-to-Speech is not supported in this browser.");
                    }
                    finalizeSpeech(provider, options?.speakerId);
                }
                break;
        }
    } catch (error) {
        console.error(`TTS Error for provider ${provider}:`, error);
        // Only show error if this provider was originally requested
        if (provider === originalProvider) {
          onError?.(error instanceof Error ? error.message : String(error));
        }
        finalizeSpeech(provider, options?.speakerId);
    }
};

// VIP personalities that require ElevenLabs (custom cloned voices)
const VIP_PERSONALITIES_FOR_ELEVENLABS = [
  'huntley',
  'jimmy savile',
  'jimmy sav',
  'prince andrew',
  'idi amin',
  'katie price',
  'trump',
  'donald trump',
  'keir starmer',
  'keir',
  'tony blair',
  'blair'
];

// Smart TTS provider router - uses ElevenLabs only for VIPs, cheaper options for others
const selectOptimalProvider = (
  requestedProvider: TtsProvider,
  personalityName?: string,
  hasElevenLabsVoiceId?: boolean
): TtsProvider => {
  // ALWAYS respect user's explicit provider choice for these:
  // - Self-Hosted: User wants to use their own TTS server
  // - OpenAI TTS: User configured OpenAI specifically  
  // - Gemini TTS: User configured Gemini specifically
  // - Azure: User configured Azure specifically
  // - Browser: User wants browser TTS
  if (requestedProvider !== TtsProvider.ELEVENLABS) {
    console.log(`[TTS Router] Using explicitly selected provider: ${requestedProvider}`);
    return requestedProvider; // Respect user's choice!
  }
  
  // Only apply smart routing if ElevenLabs was requested (to save costs)
  if (!personalityName) return requestedProvider;
  
  const nameLower = personalityName.toLowerCase();
  
  // Check if this is a VIP personality
  const isVIP = VIP_PERSONALITIES_FOR_ELEVENLABS.some(vip => nameLower.includes(vip));
  
  if (isVIP) {
    // VIP with ElevenLabs requested and has voice ID - use it
    if (hasElevenLabsVoiceId) {
      console.log(`[TTS Router] 🎭 VIP with ElevenLabs voice: "${personalityName}"`);
      return TtsProvider.ELEVENLABS;
    }
    // VIP but no voice ID - use requested provider
    return requestedProvider;
  } else {
    // Non-VIP requesting ElevenLabs
    // Only route to Azure if user wants cost savings AND has Azure configured
    // Otherwise, just use ElevenLabs for everyone
    console.log(`[TTS Router] Non-VIP: "${personalityName}" → Using ElevenLabs (cost optimization disabled)`);
    return requestedProvider; // Use ElevenLabs for everyone
  }
};

export const speak = async (
  text: string,
  provider: TtsProvider,
  config: SpeakConfig,
  onError?: (message: string) => void,
  options?: SpeakOptions
) => {
  if (!text || !text.trim()) {
    return;
  }

  // CRITICAL: Check if global TTS is enabled before adding to queue
  const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');
  if (globalTtsEnabled === 'false') {
    console.log('[TTS] Skipping speak request - global TTS is disabled');
    return;
  }
  
  // DEBUG: Log all TTS requests to help track conversation restart issues
  console.log(`[TTS DEBUG] New speak request from ${options?.speakerId || 'unknown'}:`, {
    textPreview: text.substring(0, 50) + '...',
    provider,
    currentlySpeaking: currentlyPlayingRequest?.options?.speakerId,
    queueLength: speechQueue.length,
    timestamp: new Date().toISOString()
  });
  
  // SMART ROUTING: Use ElevenLabs only for VIP personalities
  const hasVoiceId = !!(config.voiceId || (options?.speakerId && voiceIdRegistry.getVoiceId(options.speakerId)));
  const optimalProvider = selectOptimalProvider(provider, options?.personality?.name, hasVoiceId);
  
  // Override provider if routing suggests a better option
  if (optimalProvider !== provider) {
    provider = optimalProvider;
  }

  // INTELLIGENT INTERRUPTION: Only interrupt if the new message is significantly different
  // and enough time has passed to avoid conversation restart loops
  const speakerId = options?.speakerId;
  
  if (speakerId) {
    // Check if this speaker is currently playing
    const isCurrentlySpeaking = currentlyPlayingRequest?.options?.speakerId === speakerId;
    
    // Check if this speaker has items in queue
    const hasQueuedItems = speechQueue.some(item => item.options?.speakerId === speakerId);
    
    if (isCurrentlySpeaking || hasQueuedItems) {
      // Get the current/queued text for comparison
      const currentText = currentlyPlayingRequest?.text || '';
      const queuedTexts = speechQueue
        .filter(item => item.options?.speakerId === speakerId)
        .map(item => item.text);
      
      // Check if the new text is significantly different (not just a continuation or restart)
      const normalizedNewText = text.trim().toLowerCase();
      const normalizedCurrentText = currentText.trim().toLowerCase();
      
      // Calculate text similarity (simple approach)
      const isSignificantlyDifferent = 
        normalizedNewText.length > 10 && // Must be substantial text
        !normalizedCurrentText.includes(normalizedNewText.substring(0, 20)) && // Not a prefix of current
        !normalizedNewText.includes(normalizedCurrentText.substring(0, 20)) && // Current not a prefix of new
        !queuedTexts.some(queuedText => {
          const normalizedQueued = queuedText.trim().toLowerCase();
          return normalizedQueued.includes(normalizedNewText.substring(0, 20)) ||
                 normalizedNewText.includes(normalizedQueued.substring(0, 20));
        });
      
      // Check if enough time has passed since the current speech started (minimum 2 seconds for ElevenLabs)
      const currentSpeechStartTime = currentlyPlayingRequest?.startTime || 0;
      const timeSinceStart = Date.now() - currentSpeechStartTime;
      const minSpeakingTime = provider === TtsProvider.ELEVENLABS ? 2000 : 1000; // Longer grace period for ElevenLabs
      
      const shouldInterrupt = isSignificantlyDifferent && timeSinceStart > minSpeakingTime;
      
      if (shouldInterrupt) {
        console.log(`[TTS] Speaker ${speakerId} interruption approved - significantly different content after ${timeSinceStart}ms`, {
          currentlySpeaking: isCurrentlySpeaking,
          queuedCount: speechQueue.filter(item => item.options?.speakerId === speakerId).length,
          newText: text.substring(0, 50) + '...',
          currentText: currentText.substring(0, 50) + '...',
          timeSinceStart
        });
        
        // Remove all queued items from this speaker
        const filteredQueue = speechQueue.filter(item => item.options?.speakerId !== speakerId);
        const removedCount = speechQueue.length - filteredQueue.length;
        speechQueue.length = 0;
        speechQueue.push(...filteredQueue);
        
        if (removedCount > 0) {
          console.log(`[TTS] Removed ${removedCount} queued item(s) from speaker ${speakerId}`);
        }
        
        // If currently speaking, cancel immediately (this will trigger the next speech)
        if (isCurrentlySpeaking && isSpeaking) {
          console.log(`[TTS] Canceling current speech from ${speakerId} to play new message`);
          await cancelCurrentAudio(false); // Don't fade out - interrupt immediately
          
          // Add a small delay after cancellation to prevent audio overlap
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } else {
        console.log(`[TTS] Speaker ${speakerId} interruption blocked - preventing conversation restart`, {
          isSignificantlyDifferent,
          timeSinceStart,
          minSpeakingTime,
          newText: text.substring(0, 30) + '...',
          currentText: currentText.substring(0, 30) + '...'
        });
        
        // Don't add to queue if it's likely a restart - just ignore this request
        return;
      }
    }
  }
  
  const normalizedText = text.trim().toLowerCase();
  
  // Check for exact duplicates, overlaps, or prefix matches (only in remaining queue)
  const isDuplicateOrOverlap = speechQueue.some(item => {
    if (item.options?.speakerId !== speakerId || item.provider !== provider) {
      return false;
    }
    
    const queuedText = item.text.trim().toLowerCase();
    
    // Exact duplicate
    if (item.text === text) {
      return true;
    }
    
    // Check if new text is a prefix of queued text or vice versa
    // (e.g., "Hello, I think..." vs "Hello, I think we should...")
    // Also check for similar beginnings (first 10 words) to catch repetitions
    const queuedWords = queuedText.split(' ').slice(0, 10);
    const newWords = normalizedText.split(' ').slice(0, 10);
    const minWords = Math.min(queuedWords.length, newWords.length);
    
    if (queuedText.startsWith(normalizedText) || normalizedText.startsWith(queuedText)) {
      console.log('[TTS] Detected prefix/overlap:', {
        queued: queuedText.substring(0, 50) + '...',
        new: normalizedText.substring(0, 50) + '...',
        speakerId
      });
      return true;
    }
    
    // Check if first 5+ words are identical (catches repetition of beginnings)
    if (minWords >= 5) {
      const matchingWords = queuedWords.slice(0, minWords).join(' ');
      const newMatchingWords = newWords.slice(0, minWords).join(' ');
      if (matchingWords === newMatchingWords) {
        console.log('[TTS] Detected similar beginning (first words match):', {
          queued: queuedText.substring(0, 50) + '...',
          new: normalizedText.substring(0, 50) + '...',
          matchingWords: matchingWords,
          speakerId
        });
        return true;
      }
    }
    
    // Check for substantial overlap (80% similarity at the start)
    const minLength = Math.min(queuedText.length, normalizedText.length);
    if (minLength > 20) { // Only check for longer texts
      const overlapThreshold = Math.floor(minLength * 0.8);
      const queuedStart = queuedText.substring(0, overlapThreshold);
      const newStart = normalizedText.substring(0, overlapThreshold);
      
      if (queuedStart === newStart) {
        console.log('[TTS] Detected substantial overlap (80% match):', {
          queued: queuedText.substring(0, 50) + '...',
          new: normalizedText.substring(0, 50) + '...',
          speakerId
        });
        return true;
      }
    }
    
    return false;
  });

  if (isDuplicateOrOverlap) {
    console.log('[TTS] Skipping duplicate/overlapping request:', { 
      text: text.substring(0, 50) + '...', 
      speakerId,
      provider 
    });
    return;
  }

  speechQueue.push({ text, provider, config, onError, options });
  processNextSpeech().catch(err => console.warn('Failed to start TTS playback', err));
};

// Internal cancel that doesn't clear the queue (for speaker interruption)
const cancelCurrentAudio = async (fadeOut: boolean = false) => {
  isSpeaking = false;
  
  if (fadeOut && audio && !audio.paused) {
    const currentVolume = audio.volume;
    const fadeSteps = 10;
    const fadeInterval = 30;
    
    for (let i = fadeSteps; i >= 0; i--) {
      setTimeout(() => {
        if (audio && !audio.paused) {
          audio.volume = (currentVolume * i) / fadeSteps;
          if (i === 0) {
            audio.pause();
            audio.src = '';
            audio.volume = currentVolume;
            notifyStop(undefined);
          }
        }
      }, (fadeSteps - i) * fadeInterval);
    }
  } else {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (audio && !audio.paused) {
      audio.pause();
      audio.src = '';
    }
    notifyStop(undefined);
  }
};

export const cancel = async (fadeOut: boolean = false) => {
  // CRITICAL: Immediately clear queue and stop speaking flag to prevent new processing
  speechQueue.length = 0;
  await cancelCurrentAudio(fadeOut);
  console.log('[TTS] Cancel called - all TTS stopped, queue cleared');
};

export const isCurrentlySpeaking = (): boolean => {
  return isSpeaking || 
         ('speechSynthesis' in window && window.speechSynthesis.speaking) ||
         (audio && !audio.paused);
};

// Global TTS speed control
let globalTtsSpeed = 1.0;

export const setGlobalTtsSpeed = (speed: number) => {
  globalTtsSpeed = Math.min(2.0, Math.max(0.5, speed));
  
  // Apply to currently playing audio immediately
  const audioElement = getAudioElement();
  if (audioElement && !audioElement.paused) {
    try {
      audioElement.playbackRate = globalTtsSpeed;
    } catch (e) {
      console.warn('Failed to update playback rate:', e);
    }
  }
  
  // Apply to current browser speech synthesis if active
  if ('speechSynthesis' in window && window.speechSynthesis.speaking && currentUtterance) {
    try {
      // For browser TTS, we need to cancel and restart with new rate
      // This is a limitation of the Web Speech API
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Failed to update speech synthesis rate:', e);
    }
  }
};

export const getGlobalTtsSpeed = (): number => globalTtsSpeed;

export const waitForSpeechToComplete = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkSpeaking = () => {
      if (!isCurrentlySpeaking()) {
        resolve();
      } else {
        setTimeout(checkSpeaking, 100); // Check every 100ms
      }
    };
    checkSpeaking();
  });
};
