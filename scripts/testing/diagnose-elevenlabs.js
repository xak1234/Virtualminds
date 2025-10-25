// ElevenLabs TTS Diagnostic Script
// Run this in browser console to check ElevenLabs configuration

console.log('=== ElevenLabs TTS Diagnostic ===');

// Check current TTS provider
const currentProvider = localStorage.getItem('cmf_tts_provider');
console.log('1. Current TTS Provider:', currentProvider);

// Check if ElevenLabs is selected
if (currentProvider !== 'elevenlabs') {
    console.log('❌ TTS Provider is not set to ElevenLabs');
    console.log('💡 Fix: Go to Settings → TTS → Select "ElevenLabs"');
} else {
    console.log('✅ TTS Provider is correctly set to ElevenLabs');
}

// Check API key sources
const localStorageKey = localStorage.getItem('cmf_elevenlabs_api_key');
console.log('2. ElevenLabs API Key in localStorage:', localStorageKey ? 'SET' : 'NOT SET');

// Check global TTS setting
const globalTts = localStorage.getItem('cmf_global_tts_enabled');
console.log('3. Global TTS Enabled:', globalTts);

// Check personalities and voice IDs
const personalities = JSON.parse(localStorage.getItem('cmf_personalities') || '[]');
console.log('4. Total Personalities:', personalities.length);

const withVoices = personalities.filter(p => p.config?.voiceId && p.config.voiceId.trim() !== '');
console.log('5. Personalities with Voice IDs:', withVoices.length);

withVoices.forEach(p => {
    console.log(`   - ${p.name}: ${p.config.voiceId}`);
});

// Test ElevenLabs API directly
async function testElevenLabsAPI() {
    const apiKey = localStorageKey || '4b67041177f634cc065c86a2941a6a4f01fa459afa202357c4d5a8361ef88032';
    
    if (!apiKey) {
        console.log('❌ No API key available for testing');
        return;
    }
    
    console.log('6. Testing ElevenLabs API...');
    
    try {
        // Test voices endpoint
        const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': apiKey,
            },
        });
        
        if (voicesResponse.ok) {
            const voicesData = await voicesResponse.json();
            console.log('✅ Voices API working! Available voices:', voicesData.voices?.length || 0);
            
            // Test TTS with first available voice
            if (voicesData.voices && voicesData.voices.length > 0) {
                const testVoiceId = voicesData.voices[0].voice_id;
                console.log(`7. Testing TTS with voice: ${voicesData.voices[0].name} (${testVoiceId})`);
                
                const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${testVoiceId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        text: 'Hello, this is a test of ElevenLabs text-to-speech.',
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                        output_format: 'mp3_44100_128'
                    }),
                });
                
                if (ttsResponse.ok) {
                    const audioBlob = await ttsResponse.blob();
                    console.log('✅ TTS API working! Audio size:', audioBlob.size, 'bytes');
                    
                    // Try to play the audio
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    
                    try {
                        await audio.play();
                        console.log('✅ Audio playback successful!');
                    } catch (playError) {
                        console.log('❌ Audio playback failed:', playError.message);
                        console.log('💡 This might be due to browser autoplay policy');
                    }
                } else {
                    const errorText = await ttsResponse.text();
                    console.log('❌ TTS API failed:', ttsResponse.status, errorText);
                }
            }
        } else {
            const errorText = await voicesResponse.text();
            console.log('❌ Voices API failed:', voicesResponse.status, errorText);
        }
    } catch (error) {
        console.log('❌ API test failed:', error.message);
    }
}

// Run API test
testElevenLabsAPI();

console.log('=== Diagnostic Complete ===');
console.log('If ElevenLabs is not working:');
console.log('1. Ensure TTS Provider is set to "ElevenLabs" in Settings');
console.log('2. Check that Global TTS is enabled (speaker icon in header)');
console.log('3. Verify personalities have voice IDs assigned (run "AV" command)');
console.log('4. Check browser console for TTS errors during conversations');
