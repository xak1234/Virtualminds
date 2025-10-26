#!/usr/bin/env node

/**
 * LM Studio Integration Test
 * 
 * This script tests the LM Studio integration for Claude AI service.
 * It verifies that the LM Studio server is accessible and can generate responses.
 * 
 * Usage:
 *   node scripts/testing/test-lm-studio-integration.js
 * 
 * Prerequisites:
 *   - LM Studio running with a model loaded
 *   - LM Studio server accessible at configured URL (default: http://localhost:1234)
 */

import fetch from 'node-fetch';

// Configuration
const LM_STUDIO_BASE_URL = process.env.VITE_LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1';
const TEST_TIMEOUT = 30000; // 30 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testConnection() {
  log('\n🔗 Testing LM Studio Connection...', colors.cyan);
  logInfo(`Base URL: ${LM_STUDIO_BASE_URL}`);
  
  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logSuccess('Connection successful');
    return data;
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    return null;
  }
}

async function testModelsEndpoint() {
  log('\n📋 Testing Models Endpoint...', colors.cyan);
  
  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      logSuccess(`Found ${data.data.length} model(s)`);
      data.data.forEach((model, index) => {
        logInfo(`  ${index + 1}. ${model.id} (${model.owned_by || 'unknown'})`);
      });
      return data.data;
    } else {
      logWarning('Unexpected response format from models endpoint');
      console.log('Response:', JSON.stringify(data, null, 2));
      return [];
    }
  } catch (error) {
    logError(`Models endpoint failed: ${error.message}`);
    return null;
  }
}

async function testChatCompletion(models) {
  log('\n💬 Testing Chat Completion...', colors.cyan);
  
  if (!models || models.length === 0) {
    logError('No models available for testing');
    return false;
  }

  const testModel = models[0].id;
  logInfo(`Using model: ${testModel}`);

  const testMessages = [
    {
      role: 'system',
      content: 'You are a helpful assistant. Respond briefly and clearly.'
    },
    {
      role: 'user',
      content: 'Hello! Can you tell me what 2+2 equals?'
    }
  ];

  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: testModel,
        messages: testMessages,
        max_tokens: 100,
        temperature: 0.7
      }),
      timeout: TEST_TIMEOUT
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const responseText = data.choices[0].message.content;
      logSuccess('Chat completion successful');
      logInfo(`Response: "${responseText.trim()}"`);
      
      if (data.usage) {
        logInfo(`Token usage: ${data.usage.prompt_tokens} input, ${data.usage.completion_tokens} output`);
      }
      
      return true;
    } else {
      logWarning('Unexpected response format from chat completion');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    logError(`Chat completion failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('🧪 LM Studio Integration Test Suite', colors.bright);
  log('=====================================', colors.bright);
  
  let allTestsPassed = true;

  // Test 1: Connection
  const connectionData = await testConnection();
  if (!connectionData) {
    allTestsPassed = false;
    logError('\nConnection test failed. Please ensure:');
    logError('1. LM Studio is running');
    logError('2. A model is loaded in LM Studio');
    logError('3. The server is accessible at the configured URL');
    logError(`4. URL is correct: ${LM_STUDIO_BASE_URL}`);
    return;
  }

  // Test 2: Models endpoint
  const models = await testModelsEndpoint();
  if (!models) {
    allTestsPassed = false;
  } else if (models.length === 0) {
    logWarning('No models loaded in LM Studio');
    allTestsPassed = false;
  }

  // Test 3: Chat completion (only if models are available)
  if (models && models.length > 0) {
    const chatSuccess = await testChatCompletion(models);
    if (!chatSuccess) {
      allTestsPassed = false;
    }
  }

  // Summary
  log('\n📊 Test Summary', colors.cyan);
  log('===============', colors.cyan);
  
  if (allTestsPassed) {
    logSuccess('All tests passed! LM Studio integration is working correctly.');
    logInfo('You can now use Claude AI with LM Studio models.');
  } else {
    logError('Some tests failed. Please check the errors above.');
    logInfo('Common solutions:');
    logInfo('1. Ensure LM Studio is running and has a model loaded');
    logInfo('2. Check that the server URL is correct');
    logInfo('3. Verify no firewall is blocking the connection');
    logInfo('4. Try restarting LM Studio');
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
