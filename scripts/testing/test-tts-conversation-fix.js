/**
 * Test script to verify the TTS conversation restart fix
 * 
 * This script helps test that conversations don't restart after 2 words
 * when using ElevenLabs TTS by simulating rapid conversation triggers.
 * 
 * Usage: Run this in the browser console while the app is running
 */

// Test function to simulate rapid TTS requests from the same speaker
function testTTSInterruptionFix() {
  console.log('🧪 Testing TTS conversation restart fix...');
  
  // Mock speaker ID and text variations
  const speakerId = 'test-speaker-123';
  const texts = [
    "Hello there, how are you doing today?",
    "I was just thinking about our conversation earlier.",
    "You know what, I have something important to tell you.",
    "Actually, let me start over with a different topic."
  ];
  
  // Simulate rapid-fire TTS requests (this would previously cause restarts)
  texts.forEach((text, index) => {
    setTimeout(() => {
      console.log(`📢 Triggering TTS request ${index + 1}:`, text.substring(0, 30) + '...');
      
      // This would normally be called by the conversation system
      // We're simulating what happens when multiple requests come in quickly
      if (window.ttsService && window.ttsService.speak) {
        window.ttsService.speak(
          text,
          'elevenlabs', // TtsProvider.ELEVENLABS
          {
            elevenLabsApiKey: 'test-key',
            voiceId: 'test-voice-id',
            elevenLabsStability: 0.5,
            elevenLabsSimilarityBoost: 0.75
          },
          (error) => console.error('TTS Error:', error),
          {
            speakerId: speakerId,
            personality: { id: speakerId, name: 'Test Speaker' }
          }
        );
      } else {
        console.warn('TTS service not available - make sure the app is running');
      }
    }, index * 500); // 500ms apart - faster than normal conversation timing
  });
  
  console.log('✅ Test requests sent. Check console for TTS DEBUG logs to see if interruptions are properly blocked.');
  console.log('Expected behavior: Only the first request should play, subsequent requests should be blocked as "conversation restart prevention"');
}

// Test function to verify the timing logic
function testTimingLogic() {
  console.log('⏱️ Testing timing logic...');
  
  const speakerId = 'timing-test-speaker';
  const firstText = "This is the first message that should play completely.";
  const secondText = "This is a second message that should be blocked initially.";
  const thirdText = "This third message should be allowed after enough time passes.";
  
  // First request
  if (window.ttsService && window.ttsService.speak) {
    console.log('📢 Sending first TTS request...');
    window.ttsService.speak(
      firstText,
      'elevenlabs',
      { elevenLabsApiKey: 'test-key', voiceId: 'test-voice-id' },
      null,
      { speakerId: speakerId, personality: { id: speakerId, name: 'Timing Test' } }
    );
    
    // Second request immediately (should be blocked)
    setTimeout(() => {
      console.log('📢 Sending second TTS request (should be blocked)...');
      window.ttsService.speak(
        secondText,
        'elevenlabs',
        { elevenLabsApiKey: 'test-key', voiceId: 'test-voice-id' },
        null,
        { speakerId: speakerId, personality: { id: speakerId, name: 'Timing Test' } }
      );
    }, 100);
    
    // Third request after delay (should be allowed)
    setTimeout(() => {
      console.log('📢 Sending third TTS request (should be allowed after timing threshold)...');
      window.ttsService.speak(
        thirdText,
        'elevenlabs',
        { elevenLabsApiKey: 'test-key', voiceId: 'test-voice-id' },
        null,
        { speakerId: speakerId, personality: { id: speakerId, name: 'Timing Test' } }
      );
    }, 3000); // 3 seconds - should exceed the minSpeakingTime threshold
  }
}

// Export functions for console use
window.testTTSFix = {
  testInterruption: testTTSInterruptionFix,
  testTiming: testTimingLogic,
  
  // Helper to check current TTS state
  checkState: () => {
    if (window.ttsService) {
      console.log('🔍 Current TTS State:', {
        isCurrentlySpeaking: window.ttsService.isCurrentlySpeaking(),
        // Note: Internal queue state is not exposed, but we can see it in debug logs
      });
    }
  }
};

console.log('🧪 TTS Test Functions Loaded!');
console.log('Run these in console:');
console.log('  testTTSFix.testInterruption() - Test rapid requests');
console.log('  testTTSFix.testTiming() - Test timing logic');
console.log('  testTTSFix.checkState() - Check current state');
