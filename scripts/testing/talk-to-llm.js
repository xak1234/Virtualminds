#!/usr/bin/env node

/**
 * Direct LLM Chat Interface
 * 
 * This script provides a simple command-line interface to chat with your LLM server.
 * 
 * Usage:
 *   node scripts/testing/talk-to-llm.js
 *   node scripts/testing/talk-to-llm.js "Your message here"
 */

import readline from 'readline';

// Configuration
const LLM_SERVER_URL = process.env.VITE_LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1';

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

// Chat history
let chatHistory = [];

async function getAvailableModels() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${LLM_SERVER_URL}/models`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    log(`❌ Failed to get models: ${error.message}`, colors.red);
    return [];
  }
}

async function sendMessage(message, model) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Build messages array
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Be concise and helpful in your responses.'
      },
      ...chatHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch(`${LLM_SERVER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;
      
      // Add to chat history
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: aiResponse });
      
      // Keep history manageable (last 10 exchanges)
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
      }
      
      return aiResponse;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    return null;
  }
}

async function interactiveChat() {
  log('🤖 LLM Chat Interface', colors.bright);
  log('=====================', colors.bright);
  log(`Connected to: ${LLM_SERVER_URL}`, colors.cyan);
  
  // Get available models
  log('\n🔍 Getting available models...', colors.yellow);
  const models = await getAvailableModels();
  
  if (models.length === 0) {
    log('❌ No models available. Please ensure your LLM server is running with a model loaded.', colors.red);
    process.exit(1);
  }
  
  const selectedModel = models[0].id;
  log(`✅ Using model: ${selectedModel}`, colors.green);
  
  if (models.length > 1) {
    log(`📋 Other available models:`, colors.blue);
    models.slice(1).forEach((model, index) => {
      log(`   ${index + 2}. ${model.id}`, colors.blue);
    });
  }
  
  log('\n💬 Start chatting! (Type "exit" to quit, "clear" to clear history)', colors.cyan);
  log('─'.repeat(60), colors.cyan);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('\n👤 You: ', async (input) => {
      const message = input.trim();
      
      if (message.toLowerCase() === 'exit') {
        log('\n👋 Goodbye!', colors.yellow);
        rl.close();
        return;
      }
      
      if (message.toLowerCase() === 'clear') {
        chatHistory = [];
        log('🧹 Chat history cleared!', colors.yellow);
        askQuestion();
        return;
      }
      
      if (!message) {
        askQuestion();
        return;
      }
      
      log('🤖 AI: ', colors.green);
      process.stdout.write('   '); // Indent AI response
      
      const response = await sendMessage(message, selectedModel);
      
      if (response) {
        // Print response with word wrapping
        const words = response.split(' ');
        let line = '';
        const maxWidth = 70;
        
        for (const word of words) {
          if ((line + word).length > maxWidth) {
            console.log(line);
            line = '   ' + word + ' '; // Indent continuation lines
          } else {
            line += word + ' ';
          }
        }
        if (line.trim()) {
          console.log(line);
        }
      }
      
      askQuestion();
    });
  };

  askQuestion();
}

async function singleMessage(message) {
  log('🤖 LLM Single Message', colors.bright);
  log('====================', colors.bright);
  log(`Connected to: ${LLM_SERVER_URL}`, colors.cyan);
  
  // Get available models
  const models = await getAvailableModels();
  
  if (models.length === 0) {
    log('❌ No models available. Please ensure your LLM server is running with a model loaded.', colors.red);
    process.exit(1);
  }
  
  const selectedModel = models[0].id;
  log(`✅ Using model: ${selectedModel}`, colors.green);
  
  log(`\n👤 You: ${message}`, colors.blue);
  log('🤖 AI: ', colors.green);
  
  const response = await sendMessage(message, selectedModel);
  
  if (response) {
    console.log(`   ${response}`);
  }
}

async function main() {
  const message = process.argv[2];
  
  if (message) {
    // Single message mode
    await singleMessage(message);
  } else {
    // Interactive chat mode
    await interactiveChat();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, colors.red);
  process.exit(1);
});

// Run the chat interface
main().catch(error => {
  log(`❌ Chat failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});


