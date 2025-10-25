# Using Local GGUF Models

This guide explains how to use your **locally stored GGUF models** with the Criminal Minds Framework **without needing internet connectivity**.

## Overview

The app supports two approaches for local models:

1. **WebLLM** (Browser-based, requires internet to download models)
2. **llama.cpp Server** (True local inference with your GGUF files) ✅ **Recommended**

## Option 1: llama.cpp Server (Recommended for Local GGUF Models)

This is the best option if you already have GGUF models downloaded locally.

### Step 1: Get llama.cpp

Download llama.cpp from: https://github.com/ggerganov/llama.cpp/releases

Or build from source:
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
```

### Step 2: Start the Server

Start the llama.cpp server with your model:

```bash
# Basic usage
./server -m /path/to/your/model.gguf --port 8080

# With more options
./server -m /path/to/your/model.gguf \
  --port 8080 \
  --host 127.0.0.1 \
  --ctx-size 2048 \
  --threads 4
```

**Example with a specific model:**
```bash
./server -m ./models/llama-2-7b-chat.Q4_K_M.gguf --port 8080 --ctx-size 4096
```

### Step 3: Configure the App

Create or edit `.env.local` in your project root:

```env
VITE_USE_LLAMA_SERVER=true
VITE_LLAMA_BASE_URL=http://127.0.0.1:8080
```

### Step 4: Use in the App

1. Start your app: `npm run dev`
2. Open Settings (⚙️ icon)
3. Select **LOCAL** as API Provider
4. The app will automatically use your llama.cpp server
5. Chat with personalities - all inference happens locally!

## Option 2: WebLLM (Browser-based)

WebLLM runs models directly in the browser but requires downloading models from Hugging Face.

### Models Available:
- Qwen2.5-0.5B (~400MB) - Smallest
- TinyLlama-1.1B (~700MB) - Recommended
- Llama-3.2-1B (~800MB) - Better quality

### Usage:
1. Ensure you have internet connection
2. Select **LOCAL** provider in Settings
3. Choose a pre-configured model from dropdown
4. Wait for download (first time only)
5. Models are cached for future use

## Troubleshooting

### "Cannot fetch" or "No local model loaded" errors

**Problem:** Trying to use WebLLM without internet or with network restrictions.

**Solution:**
1. Use llama.cpp server instead (see Option 1)
2. Set `VITE_USE_LLAMA_SERVER=true` in `.env.local`
3. Start llama.cpp server with your local model
4. Restart the app

### llama.cpp server not connecting

**Check:**
1. Server is running: `curl http://localhost:8080/health`
2. Port 8080 is not blocked by firewall
3. `.env.local` has correct `VITE_LLAMA_BASE_URL`
4. Restart the dev server after changing `.env.local`

### Model runs slowly

**Tips:**
1. Use quantized models (Q4_K_M, Q5_K_M)
2. Increase thread count: `--threads 8`
3. Use GPU acceleration if available
4. Reduce context size: `--ctx-size 2048`

## Recommended Local Models

Good GGUF models for local inference:

- **Llama 2 7B Chat** (Q4_K_M) - ~4GB
- **Mistral 7B Instruct** (Q4_K_M) - ~4GB  
- **TinyLlama 1.1B** (Q4_K_M) - ~700MB (fastest)
- **Phi-2** (Q4_K_M) - ~1.6GB (good quality/size)

Download from: https://huggingface.co/models?library=gguf

## Environment Variables Reference

```env
# Enable llama.cpp server mode (set to 'true' to use local GGUF models)
VITE_USE_LLAMA_SERVER=true

# llama.cpp server URL (default: http://127.0.0.1:8080)
VITE_LLAMA_BASE_URL=http://127.0.0.1:8080

# API Keys (optional, for cloud providers)
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

## CLI Commands

Test your setup with these commands:

```bash
# Test connectivity to llama.cpp server
local test

# List available WebLLM models
local list

# Check current configuration
api provider
```

## Summary

✅ **For true offline usage with your GGUF models:** Use llama.cpp server
✅ **For browser-only inference:** Use WebLLM (requires internet for first download)
✅ **Best performance:** llama.cpp server with GPU
✅ **Most convenient:** WebLLM with small models (TinyLlama)

Choose the approach that fits your use case!
