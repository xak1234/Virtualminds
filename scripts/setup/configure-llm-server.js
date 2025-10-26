#!/usr/bin/env node

/**
 * LLM Server Configuration Script
 * 
 * This script helps configure the LLM server URL for the Criminal Minds Framework.
 * It updates the api-keys.json file with the correct LLM server address.
 * 
 * Usage:
 *   node scripts/setup/configure-llm-server.js [URL]
 * 
 * Examples:
 *   node scripts/setup/configure-llm-server.js http://127.0.0.1:1234
 *   node scripts/setup/configure-llm-server.js http://localhost:1234
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function getProjectRoot() {
  // Go up two directories from scripts/setup/
  return path.resolve(__dirname, '..', '..');
}

function normalizeUrl(url) {
  // Remove trailing slash and ensure it has /v1 endpoint
  url = url.replace(/\/$/, '');
  if (!url.endsWith('/v1')) {
    url += '/v1';
  }
  return url;
}

function updateApiKeysFile(llmServerUrl) {
  const projectRoot = getProjectRoot();
  const apiKeysPath = path.join(projectRoot, 'config', 'api-keys.json');
  const apiKeysExamplePath = path.join(projectRoot, 'config', 'api-keys.example.json');
  
  try {
    let apiKeysData;
    
    // Try to read existing api-keys.json
    if (fs.existsSync(apiKeysPath)) {
      logInfo('Found existing api-keys.json file');
      const content = fs.readFileSync(apiKeysPath, 'utf8');
      apiKeysData = JSON.parse(content);
    } else {
      // Create from example file
      logInfo('Creating api-keys.json from example file');
      if (!fs.existsSync(apiKeysExamplePath)) {
        throw new Error('api-keys.example.json not found');
      }
      const exampleContent = fs.readFileSync(apiKeysExamplePath, 'utf8');
      apiKeysData = JSON.parse(exampleContent);
    }
    
    // Update the LM Studio URL
    const oldUrl = apiKeysData.lmStudioBaseUrl || 'not set';
    apiKeysData.lmStudioBaseUrl = llmServerUrl;
    
    // Write back to api-keys.json
    fs.writeFileSync(apiKeysPath, JSON.stringify(apiKeysData, null, 2));
    
    logSuccess(`Updated LLM server URL in api-keys.json`);
    logInfo(`Old URL: ${oldUrl}`);
    logInfo(`New URL: ${llmServerUrl}`);
    
    return true;
  } catch (error) {
    logError(`Failed to update api-keys.json: ${error.message}`);
    return false;
  }
}

function createEnvFile(llmServerUrl) {
  const projectRoot = getProjectRoot();
  const envPath = path.join(projectRoot, '.env.local');
  
  try {
    let envContent = '';
    
    // Read existing .env.local if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      logInfo('Found existing .env.local file');
    }
    
    // Update or add the LM Studio URL
    const envVar = 'VITE_LM_STUDIO_BASE_URL';
    const envLine = `${envVar}=${llmServerUrl}`;
    
    if (envContent.includes(envVar)) {
      // Replace existing line
      envContent = envContent.replace(
        new RegExp(`^${envVar}=.*$`, 'm'),
        envLine
      );
    } else {
      // Add new line
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `# LLM Server Configuration\n${envLine}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    logSuccess('Updated .env.local file');
    
    return true;
  } catch (error) {
    logError(`Failed to update .env.local: ${error.message}`);
    return false;
  }
}

async function testConnection(url) {
  logInfo('Testing connection to LLM server...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${url}/models`, {
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
      logSuccess(`Connection successful! Found ${data.data.length} model(s)`);
      data.data.forEach((model, index) => {
        logInfo(`  ${index + 1}. ${model.id}`);
      });
      return true;
    } else {
      logWarning('Connection successful but unexpected response format');
      return true;
    }
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    logWarning('Please ensure:');
    logWarning('1. LM Studio is running');
    logWarning('2. A model is loaded');
    logWarning('3. The server is accessible at the specified URL');
    return false;
  }
}

async function main() {
  log('🔧 LLM Server Configuration', colors.bright);
  log('============================', colors.bright);
  
  // Get URL from command line argument or prompt
  let llmServerUrl = process.argv[2];
  
  if (!llmServerUrl) {
    logError('Please provide the LLM server URL as an argument');
    logInfo('Usage: node scripts/setup/configure-llm-server.js <URL>');
    logInfo('Examples:');
    logInfo('  node scripts/setup/configure-llm-server.js http://127.0.0.1:1234');
    logInfo('  node scripts/setup/configure-llm-server.js http://localhost:1234');
    process.exit(1);
  }
  
  // Normalize the URL
  llmServerUrl = normalizeUrl(llmServerUrl);
  logInfo(`Configuring LLM server: ${llmServerUrl}`);
  
  // Update configuration files
  const apiKeysUpdated = updateApiKeysFile(llmServerUrl);
  const envUpdated = createEnvFile(llmServerUrl);
  
  if (!apiKeysUpdated || !envUpdated) {
    logError('Configuration update failed');
    process.exit(1);
  }
  
  // Test the connection
  log('\n🧪 Testing Connection', colors.cyan);
  const connectionWorking = await testConnection(llmServerUrl);
  
  // Summary
  log('\n📋 Configuration Summary', colors.cyan);
  log('========================', colors.cyan);
  logInfo(`LLM Server URL: ${llmServerUrl}`);
  logInfo(`Configuration files updated: ${apiKeysUpdated && envUpdated ? 'Yes' : 'No'}`);
  logInfo(`Connection test: ${connectionWorking ? 'Passed' : 'Failed'}`);
  
  if (apiKeysUpdated && envUpdated) {
    logSuccess('Configuration completed successfully!');
    logInfo('Next steps:');
    logInfo('1. Restart your development server if it\'s running');
    logInfo('2. Test the integration using: npm run dev');
    logInfo('3. Or run the test suite: node scripts/testing/test-lm-studio-integration.js');
  } else {
    logError('Configuration incomplete. Please check the errors above.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the configuration
main().catch(error => {
  logError(`Configuration failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});


