# API Keys Setup for Local Development

This document explains how to set up API keys for local testing of the Criminal Minds Framework.

## 🔧 Setup Instructions

### 1. Create Your Local API Keys File

Copy the example file and add your real API keys:

```bash
cp api-keys.example.json api-keys.json
```

### 2. Edit the API Keys File

Open `api-keys.json` and replace the placeholder values with your actual API keys:

```json
{
  "geminiApiKey": "your-actual-gemini-api-key-here",
  "openaiApiKey": "your-actual-openai-api-key-here",
  "claudeApiKey": "your-actual-claude-api-key-here",
  "elevenlabsApiKey": "your-actual-elevenlabs-api-key-here",
  "openaiTtsApiKey": "your-actual-openai-tts-api-key-here",
  "geminiTtsApiKey": "your-actual-google-cloud-tts-api-key-here",
  "lmStudioBaseUrl": "http://localhost:1234/v1"
}
```

### 3. Configure LM Studio (Optional)

If you want to use LM Studio for Claude AI integration instead of the cloud API:

1. **Install and Start LM Studio:**
   - Download LM Studio from [lmstudio.ai](https://lmstudio.ai/)
   - Load a model (e.g., Llama 2, Code Llama, or any compatible model)
   - Start the local server (usually runs on `http://localhost:1234`)

2. **Update Configuration:**
   - Set `lmStudioBaseUrl` in your `api-keys.json` to your LM Studio server URL
   - Default is `http://127.0.0.1:1234/v1` (local LLM server)
   - You can also set the environment variable `VITE_LM_STUDIO_BASE_URL`

3. **Environment Variable (Alternative):**
   ```bash
   # Create .env.local file for custom LLM server
   echo "VITE_LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1" > .env.local
   
   # Or for localhost LM Studio
   echo "VITE_LM_STUDIO_BASE_URL=http://localhost:1234/v1" > .env.local
   ```

### 4. Verify Git Ignore

The `api-keys.json` file is already added to `.gitignore`, so it will never be committed to version control.

## 🚀 How It Works

### API Key Management
- API keys are stored in browser localStorage only
- All keys must be entered via the Settings UI in the application
- Keys are never stored in files or on any server
- Each user manages their own API keys locally

## 🧪 Testing

### Test the Setup
1. Start the application: `npm run dev`
2. Open Settings panel
3. Enter your API keys in the appropriate fields

### Verify in Application
1. Start the development server: `npm run dev`
2. Open browser console
3. Look for: `"Development mode: Loading API keys from local file..."`
4. Should see: `"API keys loaded from local file"`

## 🔒 Security Notes

- ✅ `api-keys.json` is in `.gitignore` - will never be committed
- ✅ `api-keys.example.json` contains only placeholder values
- ✅ Production uses server endpoint, not local files
- ⚠️ Never commit real API keys to any repository
- ⚠️ Keep your local `api-keys.json` file secure

## 🛠️ Troubleshooting

### "Failed to load local API keys file"
- Ensure `api-keys.json` exists in the project root
- Check that the JSON is valid (use a JSON validator)
- Make sure the dev server is running

### "API keys not working"
- Verify your API keys are correct and active
- Check the browser console for error messages
- Ensure the keys have the correct permissions

### Cache Issues
- API keys are cached for 5 minutes
- Restart the dev server to clear cache
- Or use the "Clear Cache" button in the test page

## 📝 File Structure

```
project-root/
├── api-keys.json          # Your local API keys (gitignored)
├── api-keys.example.json  # Example template
├── .gitignore            # Excludes api-keys.json
└── services/
    └── apiKeyService.ts   # Handles loading logic
```
