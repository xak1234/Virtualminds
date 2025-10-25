// Debug script to diagnose ElevenLabs TTS issues
// Run this in the browser console to check TTS configuration

console.log('=== ElevenLabs TTS Debug ===');

// Check localStorage settings
const ttsProvider = localStorage.getItem('cmf_tts_provider');
const elevenLabsApiKey = localStorage.getItem('cmf_elevenlabs_api_key');
const globalTtsEnabled = localStorage.getItem('cmf_global_tts_enabled');

console.log('TTS Provider:', ttsProvider);
console.log('ElevenLabs API Key:', elevenLabsApiKey ? 'Set (length: ' + elevenLabsApiKey.length + ')' : 'NOT SET');
console.log('Global TTS Enabled:', globalTtsEnabled);

// Check if we have personalities with voice IDs
const personalities = JSON.parse(localStorage.getItem('cmf_personalities') || '[]');
console.log('Total Personalities:', personalities.length);

const personalitiesWithVoices = personalities.filter(p => p.config?.voiceId && p.config.voiceId.trim() !== '');
console.log('Personalities with Voice IDs:', personalitiesWithVoices.length);

personalitiesWithVoices.forEach(p => {
  console.log(`- ${p.name}: ${p.config.voiceId}`);
});

// Check if audio element exists
const audioElement = document.getElementById('cmf-audio');
console.log('Audio Element:', audioElement ? 'Found' : 'NOT FOUND');

// Check Web Audio API support
const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
console.log('Web Audio API Support:', hasAudioContext);

// Test ElevenLabs API connectivity
if (elevenLabsApiKey) {
  console.log('Testing ElevenLabs API...');
  fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': elevenLabsApiKey,
    },
  })
  .then(response => {
    console.log('ElevenLabs API Response Status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(text => {
        console.error('ElevenLabs API Error:', text);
        throw new Error(`API Error: ${response.status} - ${text}`);
      });
    }
  })
  .then(data => {
    console.log('Available Voices:', data.voices?.length || 0);
    if (data.voices && data.voices.length > 0) {
      console.log('Sample voices:', data.voices.slice(0, 3).map(v => `${v.name} (${v.voice_id})`));
    }
  })
  .catch(error => {
    console.error('ElevenLabs API Test Failed:', error);
  });
} else {
  console.log('Skipping API test - no API key');
}

// Check browser autoplay policy
console.log('Browser Autoplay Policy Test:');
const testAudio = new Audio();
testAudio.volume = 0;
testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
testAudio.play()
  .then(() => {
    console.log('✅ Autoplay allowed');
    testAudio.pause();
  })
  .catch(error => {
    console.log('❌ Autoplay blocked:', error.message);
    console.log('💡 User interaction required for audio playback');
  });

console.log('=== Debug Complete ===');
console.log('If ElevenLabs TTS is not working, check:');
console.log('1. TTS Provider is set to "elevenlabs"');
console.log('2. ElevenLabs API key is valid and has credits');
console.log('3. Personalities have valid voice IDs assigned');
console.log('4. Global TTS is enabled');
console.log('5. Browser allows autoplay (click anywhere if blocked)');
