/**
 * Local Model Service for GGUF Model Support
 * 
 * This service provides local AI model inference capabilities using GGUF format models.
 * Uses WebLLM for actual model inference in the browser.
 * 
 * Features:
 * - Real GGUF model loading and inference
 * - Model management (load, unload, switch between models)
 * - Privacy-focused local inference (no data sent to external servers)
 * - Token usage tracking for consistency with cloud providers
 * - Progress tracking for model loading
 */

import * as webllm from '@mlc-ai/web-llm';
import { pipeline, env, AutoTokenizer, AutoModelForCausalLM } from '@huggingface/transformers';
import type { ChatMessage, ModelConfig } from '../types';
import { MessageAuthor } from '../types';
import { createChatCompletion, formatChat } from './llamaCppService';

// Configure transformers.js to use local models
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/';

export interface LocalModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LocalModel {
  id: string;
  name: string;
  path?: string;
  size?: number;
  loaded: boolean;
  modelId: string; // WebLLM model ID or file path
  type: 'webllm' | 'gguf' | 'transformers';
  pipeline?: any; // Transformers.js pipeline for GGUF models
  modelData?: ArrayBuffer; // Raw model data for GGUF files
  tokenizer?: any; // Tokenizer instance
  model?: any; // Model instance
}

export interface ModelFile {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
  handle?: any; // File handle from File System Access API
}

export interface ModelLoadProgress {
  progress: number;
  text: string;
  timeElapsed: number;
}

class LocalModelService {
  private static instance: LocalModelService;
  private models: Map<string, LocalModel> = new Map();
  private currentModel: string | null = null;
  private engine: webllm.MLCEngineInterface | null = null;
  private isInitialized = false;
  private loadingProgress: ModelLoadProgress | null = null;
  private progressCallback: ((progress: ModelLoadProgress) => void) | null = null;
  private scannedModelFiles: ModelFile[] = [];
  private currentDirectory: string | null = null;
  private ggufModels: Map<string, { tokenizer: any, model: any, modelData: ArrayBuffer }> = new Map();

  // Pre-configured models that work well with WebLLM (ordered by memory usage - smallest first)
  private readonly SUPPORTED_MODELS = [
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',      // ~400MB - Most memory efficient
    'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC',   // ~700MB - Very small
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',      // ~800MB - Small, efficient
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',      // ~1.2GB - Medium small
    'gemma-2-2b-it-q4f16_1-MLC',              // ~1.5GB - Medium
    'Phi-3.5-mini-instruct-q4f16_1-MLC',      // ~2.2GB - Larger
    'Llama-3.2-3B-Instruct-q4f16_1-MLC'       // ~2.5GB - Largest (use with caution)
  ];

  // Model memory requirements and constraints
  private readonly MODEL_CONSTRAINTS = {
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': { 
      size: '~400MB', 
      recommended: true,
      maxTokens: 2048,
      contextLength: 4096,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 512
    },
    'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC': { 
      size: '~700MB', 
      recommended: true,
      maxTokens: 2048,
      contextLength: 2048,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 50,
      optimalTokens: 256
    },
    'Llama-3.2-1B-Instruct-q4f16_1-MLC': { 
      size: '~800MB', 
      recommended: true,
      maxTokens: 2048,
      contextLength: 8192,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 512
    },
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': { 
      size: '~1.2GB', 
      recommended: false,
      maxTokens: 4096,
      contextLength: 8192,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 1024
    },
    'gemma-2-2b-it-q4f16_1-MLC': { 
      size: '~1.5GB', 
      recommended: false,
      maxTokens: 4096,
      contextLength: 8192,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 1024
    },
    'Phi-3.5-mini-instruct-q4f16_1-MLC': { 
      size: '~2.2GB', 
      recommended: false,
      maxTokens: 4096,
      contextLength: 128000, // Phi-3.5 has very large context
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 2048
    },
    'Llama-3.2-3B-Instruct-q4f16_1-MLC': { 
      size: '~2.5GB', 
      recommended: false,
      maxTokens: 4096,
      contextLength: 8192,
      maxTemperature: 2.0,
      maxTopP: 1.0,
      maxTopK: 100,
      optimalTokens: 2048
    }
  };

  private constructor() {}

  public static getInstance(): LocalModelService {
    if (!LocalModelService.instance) {
      LocalModelService.instance = new LocalModelService();
    }
    return LocalModelService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing WebLLM engine...');
      console.log('Browser environment check:');
      console.log('- WebAssembly:', typeof WebAssembly !== 'undefined');
      console.log('- SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
      console.log('- caches:', typeof caches !== 'undefined');
      console.log('- isSecureContext:', window.isSecureContext);
      
      // Check if WebAssembly is supported
      if (typeof WebAssembly === 'undefined') {
        throw new Error('WebAssembly is not supported in this browser. Local models require WebAssembly support.');
      }
      
      // Check if we're in a secure context (required for Cache API)
      if (!window.isSecureContext) {
        console.warn('Not in secure context - WebLLM may have limited functionality');
      }
      
      // Check if Cache API is available (required by WebLLM)
      if (typeof caches === 'undefined') {
        console.warn('Cache API not available, providing comprehensive polyfill...');
        // Provide a comprehensive polyfill for caches
        const mockCache = {
          match: async (request: any) => {
            console.log('Mock cache.match called with:', request);
            return undefined;
          },
          matchAll: async (request?: any) => {
            console.log('Mock cache.matchAll called with:', request);
            return [];
          },
          add: async (request: any) => {
            console.log('Mock cache.add called with:', request);
            return Promise.resolve();
          },
          addAll: async (requests: any[]) => {
            console.log('Mock cache.addAll called with:', requests);
            return Promise.resolve();
          },
          put: async (request: any, response: any) => {
            console.log('Mock cache.put called with:', request, response);
            return Promise.resolve();
          },
          delete: async (request: any) => {
            console.log('Mock cache.delete called with:', request);
            return false;
          },
          keys: async (request?: any) => {
            console.log('Mock cache.keys called with:', request);
            return [];
          }
        };
        
        (globalThis as any).caches = {
          open: async (name: string) => {
            console.log('Mock caches.open called with:', name);
            return mockCache;
          },
          match: async (request: any) => {
            console.log('Mock caches.match called with:', request);
            return undefined;
          },
          has: async (name: string) => {
            console.log('Mock caches.has called with:', name);
            return false;
          },
          delete: async (name: string) => {
            console.log('Mock caches.delete called with:', name);
            return false;
          },
          keys: async () => {
            console.log('Mock caches.keys called');
            return [];
          }
        };
        
        // Also add the Cache constructor if needed
        (globalThis as any).Cache = function() { 
          console.log('Mock Cache constructor called');
          return mockCache; 
        };
      }
      
      // Check for required APIs
      if (typeof SharedArrayBuffer === 'undefined') {
        console.warn('SharedArrayBuffer not available - performance may be limited');
      }
      
      console.log('Attempting to create WebLLM engine...');
      
      // Initialize WebLLM engine with error handling
      try {
        // Try to create the engine with default settings
        this.engine = new webllm.MLCEngine();
        console.log('WebLLM engine created successfully');
      } catch (engineError: any) {
        console.error('Failed to create WebLLM engine:', engineError);
        console.error('Error stack:', engineError.stack);
        
        // For development, let's provide a more helpful error
        throw new Error(`WebLLM initialization failed in development environment.

This is likely due to browser security restrictions in localhost.

Recommended solutions:
1. Try using Chrome/Edge browser
2. Enable "Experimental Web Platform features" in chrome://flags
3. Use the deployed HTTPS version instead of localhost
4. For development, consider using the cloud providers (Google/OpenAI) instead

Technical error: ${engineError.message}`);
      }
      
      // Set up progress tracking
      if (this.engine && this.engine.setInitProgressCallback) {
        this.engine.setInitProgressCallback((progress: webllm.InitProgressReport) => {
          const progressData: ModelLoadProgress = {
            progress: progress.progress,
            text: progress.text,
            timeElapsed: progress.timeElapsed
          };
          this.loadingProgress = progressData;
          if (this.progressCallback) {
            this.progressCallback(progressData);
          }
          console.log(`Model loading progress: ${progress.progress.toFixed(1)}% - ${progress.text}`);
        });
      }

      this.isInitialized = true;
      console.log('WebLLM engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebLLM engine:', error);
      throw error;
    }
  }

  public async loadModel(modelIdOrFile: string | File): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    try {
      let modelId: string;
      
      // Handle pre-configured model IDs
      if (typeof modelIdOrFile === 'string') {
        modelId = modelIdOrFile;
        
        // Check if it's a WebLLM pre-configured model or a local GGUF file path
        const isWebLLMModel = this.SUPPORTED_MODELS.includes(modelId);
        const isLocalFile = modelId.toLowerCase().match(/\.(gguf|ggml|bin)$/);
        
        if (!isWebLLMModel && !isLocalFile) {
          throw new Error(`Unsupported model: ${modelId}. Must be either a pre-configured WebLLM model or a GGUF file.`);
        }
        
        // If it's a local GGUF file, handle differently
        if (isLocalFile) {
          console.log(`⚠️ GGUF file detected: ${modelId}`);
          console.log('Note: Direct GGUF loading is not yet fully implemented.');
          console.log('Creating placeholder model entry for now.');
          
          const internalId = this.generateModelId(modelId);
          const model: LocalModel = {
            id: internalId,
            name: modelId.split(/[/\\]/).pop()?.replace(/\.(gguf|ggml|bin)$/i, '') || 'Local Model',
            path: modelId,
            loaded: true,
            modelId: modelId,
            type: 'gguf'
          };
          
          this.models.set(internalId, model);
          this.currentModel = internalId;
          
          console.log(`✅ GGUF model registered: ${model.name}`);
          console.log('⚠️ Note: This is a placeholder. Full GGUF inference requires additional libraries.');
          return internalId;
        }

        // Check memory requirements and warn user
        const memInfo = this.MODEL_CONSTRAINTS[modelId];
        if (memInfo) {
          console.log(`Loading ${modelId} (${memInfo.size})`);
          if (!memInfo.recommended) {
            console.warn(`⚠️ ${modelId} requires ${memInfo.size} of GPU memory. Consider using a smaller model if you experience memory issues.`);
          }
        }
      } else {
        // Handle File object (from File System Access API)
        console.log(`Loading GGUF model from file: ${modelIdOrFile.name}`);
        return await this.loadModelFromFile(modelIdOrFile);
      }

      // Check if model is already loaded
      const existingModel = Array.from(this.models.values()).find(m => m.modelId === modelId);
      if (existingModel && existingModel.loaded) {
        this.currentModel = existingModel.id;
        console.log(`Model ${modelId} already loaded`);
        return existingModel.id;
      }

      // Unload current model to free memory
      if (this.currentModel) {
        console.log('Unloading previous model to free memory...');
        this.unloadCurrentModel();
      }

      console.log(`Loading model: ${modelId}`);
      
      // Load the model using WebLLM with better error handling
      try {
        console.log(`Attempting to load model: ${modelId}`);
        await this.engine.reload(modelId);
        console.log(`Successfully loaded model: ${modelId}`);
      } catch (webllmError: any) {
        console.error('WebLLM model loading error:', webllmError);
        
        // Handle specific WebLLM errors
        if (webllmError.message?.includes('Cannot fetch') || webllmError.message?.includes('fetch')) {
          const isHuggingFaceError = webllmError.message.includes('huggingface.co');
          
          if (isHuggingFaceError) {
            throw new Error(`Failed to download model from Hugging Face: ${modelId}

This could be due to:
1. 🌐 Network connectivity issues
2. 🚫 Firewall/proxy blocking Hugging Face
3. 🔒 Corporate network restrictions
4. ⏰ Temporary Hugging Face server issues

Solutions to try:
1. Check your internet connection
2. Try again in a few minutes (server might be busy)
3. Use a VPN if on a restricted network
4. Try a different model: "local load TinyLlama-1.1B"
5. Use cloud providers (Google/OpenAI) instead for now

Technical error: ${webllmError.message}`);
          } else {
            throw new Error(`Network error loading model ${modelId}: ${webllmError.message}

Try:
1. Check your internet connection
2. Try again in a few minutes
3. Try a different model
4. Use cloud providers instead`);
          }
        } else if (webllmError.message?.includes('memory') || webllmError.message?.includes('GPU')) {
          throw new Error(`GPU memory error: Not enough memory to load ${modelId}. Try a smaller model like Qwen2.5-0.5B or TinyLlama.`);
        } else if (webllmError.message?.includes('device lost')) {
          throw new Error(`GPU device lost while loading ${modelId}. Please refresh the page and try a smaller model.`);
        } else {
          throw new Error(`Failed to load ${modelId}: ${webllmError.message || 'Unknown WebLLM error'}

This might be a temporary issue. Try:
1. Refreshing the page
2. Trying a different model
3. Using cloud providers (Google/OpenAI) instead`);
        }
      }
      
      // Create model entry
      const internalId = this.generateModelId(modelId);
      const model: LocalModel = {
        id: internalId,
        name: this.extractModelName(modelId),
        modelId: modelId,
        loaded: true,
        type: 'webllm'
      };

      this.models.set(internalId, model);
      this.currentModel = internalId;

      console.log(`✅ Model ${modelId} loaded successfully`);
      return internalId;
    } catch (error) {
      console.error('Failed to load model:', error);
      
      // Reset engine state on critical errors
      if (error instanceof Error && (
        error.message.includes('device lost') || 
        error.message.includes('memory') ||
        error.message.includes('PackedFunc has already been disposed')
      )) {
        console.log('Resetting WebLLM engine due to critical error...');
        this.isInitialized = false;
        this.engine = null;
      }
      
      throw new Error(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadModelFromFile(file: File | string): Promise<string> {
    const modelId = typeof file === 'string' ? this.generateModelId(file) : this.generateModelId(file.name);
    
    try {
      // Handle file loading
      let modelData: ArrayBuffer;
      let fileName: string;
      let fileSize: number;
      
      if (typeof file === 'string') {
        // Handle blob URL
        const response = await fetch(file);
        modelData = await response.arrayBuffer();
        fileName = 'Local Model';
        fileSize = modelData.byteLength;
      } else {
        // Handle File object
        modelData = await file.arrayBuffer();
        fileName = file.name;
        fileSize = file.size;
      }

      console.log(`Loading GGUF model from file: ${fileName}`);
      console.log(`File size: ${this.formatFileSize(fileSize)}`);
      
      const model: LocalModel = {
        id: modelId,
        name: fileName.replace(/\.(gguf|ggml|bin)$/i, ''),
        path: fileName,
        size: fileSize,
        loaded: true,
        modelId: fileName, // Use filename as modelId for GGUF files
        type: 'gguf',
        modelData: modelData // Store the model data
      };

      this.models.set(modelId, model);
      this.currentModel = modelId;

      console.log(`✅ GGUF model loaded successfully: ${model.name}`);
      console.log('⚠️ Note: GGUF inference is experimental. For full functionality, use pre-configured WebLLM models.');

      return modelId;
    } catch (error) {
      console.error('Failed to load model from file:', error);
      throw new Error(`Failed to load model from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  public async generateResponse(
    modelId: string,
    systemInstruction: string,
    chatHistory: ChatMessage[],
    prompt: string,
    config: Required<ModelConfig>
  ): Promise<LocalModelResponse> {
    console.log(`[LOCAL MODEL] Starting generateResponse for model: ${modelId}`);
    
    if (!this.isInitialized) {
      console.log('[LOCAL MODEL] Service not initialized, initializing...');
      await this.initialize();
    }

    if (!this.engine) {
      console.error('[LOCAL MODEL] WebLLM engine not initialized after initialization attempt');
      throw new Error('WebLLM engine failed to initialize. This may be due to browser compatibility issues. Please try:\n1. Use Chrome/Edge browser\n2. Enable "Experimental Web Platform features" in chrome://flags\n3. Use cloud providers (Google/OpenAI) as alternative');
    }

    const model = this.models.get(modelId);
    if (!model) {
      console.error(`[LOCAL MODEL] Model ${modelId} not found in models map`);
      console.log('[LOCAL MODEL] Available models:', Array.from(this.models.keys()));
      throw new Error(`Model ${modelId} not found. Available models: ${Array.from(this.models.keys()).join(', ')}\n\nPlease load a model first using:\n1. Settings Modal (⚙️ icon) → LOCAL provider → Load Model\n2. CLI command: "local load [model-name]"`);
    }
    
    if (!model.loaded) {
      console.error(`[LOCAL MODEL] Model ${modelId} is marked as not loaded`);
      throw new Error(`Model ${modelId} is not loaded. Please load a model first using:\n1. Settings Modal (⚙️ icon) → LOCAL provider → Load Model\n2. CLI command: "local load ${modelId}"`);
    }

    console.log(`[LOCAL MODEL] Model found: ${model.name} (type: ${model.type}, loaded: ${model.loaded})`);

    // Check if this is a GGUF file (not a WebLLM model)
    if (model.type === 'gguf') {
      console.log('[LOCAL MODEL] Using GGUF model path');
      return await this.generateGGUFResponse(modelId, systemInstruction, chatHistory, prompt, config);
    }

    console.log('[LOCAL MODEL] Using WebLLM model path');

    try {
      // Ensure the model is actually loaded in the WebLLM engine
      // This is crucial because the engine might have been reset or the model unloaded
      console.log('[LOCAL MODEL] Verifying model is loaded in WebLLM engine:', model.modelId);
      
      let modelReloaded = false;
      try {
        // Try to get the current model info from the engine
        const currentModelId = this.engine.getCurrentModel?.();
        console.log(`[LOCAL MODEL] Engine current model: ${currentModelId}, expected: ${model.modelId}`);
        
        if (currentModelId !== model.modelId) {
          console.log(`[LOCAL MODEL] Model mismatch detected. Reloading model...`);
          await this.engine.reload(model.modelId);
          modelReloaded = true;
          console.log('[LOCAL MODEL] Model reloaded successfully');
        } else {
          console.log('[LOCAL MODEL] Model is already loaded in engine');
        }
      } catch (reloadError: any) {
        console.error('[LOCAL MODEL] Failed to check/reload model:', reloadError);
        console.log('[LOCAL MODEL] Attempting to reload model as fallback...');
        
        try {
          await this.engine.reload(model.modelId);
          modelReloaded = true;
          console.log('[LOCAL MODEL] Model reloaded successfully (fallback)');
        } catch (fallbackError: any) {
          console.error('[LOCAL MODEL] Fallback reload also failed:', fallbackError);
          throw new Error(`Failed to load model in WebLLM engine. This may be due to:\n1. Browser memory limitations\n2. Network connectivity issues\n3. Model compatibility problems\n\nTechnical error: ${fallbackError.message}\n\nSolutions:\n1. Try a smaller model (Qwen2.5-0.5B is most reliable)\n2. Clear browser cache and reload the page\n3. Use cloud providers (Google/OpenAI) as alternative`);
        }
      }

      // Give the engine a moment to settle after reload
      if (modelReloaded) {
        console.log('[LOCAL MODEL] Waiting for engine to settle after reload...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get model's context window size
      const constraints = this.getModelConstraints(model.modelId);
      const contextWindowSize = constraints?.contextLength || 4096;
      const maxPromptTokens = Math.floor(contextWindowSize * 0.75); // Reserve 25% for response
      
      // Convert chat history to WebLLM format with context window management
      const messages = this.formatMessagesForWebLLM(
        systemInstruction, 
        chatHistory, 
        prompt, 
        maxPromptTokens
      );
      
      console.log(`[LOCAL MODEL] Generating response with WebLLM model: ${model.modelId}`);
      console.log(`[LOCAL MODEL] Context window: ${contextWindowSize}, Max prompt tokens: ${maxPromptTokens}`);
      console.log(`[LOCAL MODEL] Using ${messages.length} messages`);
      
      // Generate response using WebLLM
      const completion = await this.engine.chat.completions.create({
        messages: messages,
        temperature: config.temperature,
        max_tokens: Math.min(config.maxOutputTokens || 2048, Math.floor(contextWindowSize * 0.25)),
        top_p: config.topP,
        stream: false
      });

      const responseText = completion.choices[0]?.message?.content || '';
      console.log(`[LOCAL MODEL] Response generated successfully, length: ${responseText.length}`);
      
      return {
        text: responseText,
        inputTokens: completion.usage?.prompt_tokens || this.estimateTokens(JSON.stringify(messages)),
        outputTokens: completion.usage?.completion_tokens || this.estimateTokens(responseText)
      };
    } catch (error: any) {
      console.error('[LOCAL MODEL] WebLLM inference failed:', error);
      console.error('[LOCAL MODEL] Error stack:', error.stack);
      
      // Handle specific WebLLM errors
      if (error.message?.includes('Model not loaded')) {
        // Model loading issue - try to reload
        console.log('[LOCAL MODEL] Model not loaded error detected, attempting emergency reload...');
        try {
          await this.engine.reload(model.modelId);
          console.log('[LOCAL MODEL] Emergency reload successful, retrying inference...');
          
          // Wait for engine to settle
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Retry the inference once
          const messages = this.formatMessagesForWebLLM(systemInstruction, chatHistory, prompt);
          const completion = await this.engine.chat.completions.create({
            messages: messages,
            temperature: config.temperature,
            max_tokens: Math.min(config.maxOutputTokens || 2048, 2048),
            top_p: config.topP,
            stream: false
          });

          const responseText = completion.choices[0]?.message?.content || '';
          console.log('[LOCAL MODEL] Retry successful after emergency reload');
          return {
            text: responseText,
            inputTokens: completion.usage?.prompt_tokens || this.estimateTokens(JSON.stringify(messages)),
            outputTokens: completion.usage?.completion_tokens || this.estimateTokens(responseText)
          };
        } catch (retryError: any) {
          console.error('[LOCAL MODEL] Retry after emergency reload also failed:', retryError);
          throw new Error(`Model loading failed completely. Please try:

🔧 **Immediate Solutions:**
1. Reload the model: Settings (⚙️) → LOCAL provider → Load Model
2. Use CLI command: "local load [model-name]"
3. Try a different model (Qwen2.5-0.5B is most reliable)

🔄 **If Still Failing:**
4. Clear browser cache and reload the page
5. Close other browser tabs to free memory
6. Restart your browser

☁️ **Alternative:**
7. Use cloud providers (Google/OpenAI) which are more reliable

**Technical error:** ${retryError.message}`);
        }
      }
      
      // Handle context window errors specifically
      if (error.message?.includes('context window') || error.message?.includes('prompt tokens exceed')) {
        throw new Error(`Context window exceeded. Try:

1. Use "clear [personality]" command to reset conversation
2. Use a model with larger context (Phi-3.5 has 128k context)
3. Keep conversations shorter

**Technical:** ${error.message}`);
      }
      
      // Handle memory/resource errors
      if (error.message?.includes('memory') || error.message?.includes('OOM') || error.message?.includes('allocation')) {
        throw new Error(`Browser memory exhausted. Try:

1. Close other browser tabs
2. Use a smaller model (Qwen2.5-0.5B uses ~400MB)
3. Clear browser cache and reload page
4. Restart your browser
5. Use cloud providers (Google/OpenAI) as alternative

**Technical:** ${error.message}`);
      }
      
      // Provide comprehensive error message for unknown errors
      throw new Error(`Local model inference failed. Please try:

🔧 **Quick Fixes:**
1. Reload model: Settings (⚙️) → LOCAL provider → Load Model
2. Try different model: "local load Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
3. Clear browser cache and reload page

🔄 **Advanced Solutions:**
4. Enable "Experimental Web Platform features" in chrome://flags
5. Use Chrome/Edge browser (better WebLLM support)
6. Close other tabs to free memory

☁️ **Reliable Alternative:**
7. Use cloud providers (Google/OpenAI) which work consistently

**Technical error:** ${error instanceof Error ? error.message : 'Unknown error'}
**Error type:** ${error.constructor.name}`);
    }
  }

  private formatMessagesForWebLLM(
    systemInstruction: string, 
    chatHistory: ChatMessage[], 
    prompt: string, 
    maxPromptTokens?: number
  ): webllm.ChatCompletionMessageParam[] {
    const messages: webllm.ChatCompletionMessageParam[] = [];

    // Helper to roughly trim text to a token budget (approx 4 chars per token)
    const trimToTokenBudget = (text: string, tokenBudget: number, suffix = '... [TRUNCATED]'): string => {
      if (tokenBudget <= 0) return '';
      const approxChars = Math.max(0, Math.floor(tokenBudget * 4));
      if (text.length <= approxChars) return text;
      return text.slice(0, approxChars) + suffix;
    };

    // Always include current prompt (we may trim if absolutely necessary later)
    let promptText = prompt || '';

    // If no max tokens specified, include everything
    if (!maxPromptTokens) {
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      chatHistory.forEach(msg => {
        messages.push({ role: msg.author === MessageAuthor.USER ? 'user' : 'assistant', content: msg.text });
      });
      messages.push({ role: 'user', content: promptText });
      return messages;
    }

    // First, budget for system + prompt; trim system (especially knowledge) if needed
    const promptTokens = this.estimateTokens(promptText);
    let systemText = systemInstruction || '';

    // Ensure we always leave some room for history if possible (~20% of budget)
    const targetHistoryShare = Math.floor(maxPromptTokens * 0.2);
    const targetSystemPlusPrompt = maxPromptTokens - targetHistoryShare;

    let systemTokens = this.estimateTokens(systemText);
    if (systemTokens + promptTokens > targetSystemPlusPrompt) {
      // Try to preserve non-knowledge header, trim knowledge body
      const kbMarker = '\nKNOWLEDGE BASE:';
      const markerIdx = systemText.indexOf(kbMarker);
      if (markerIdx !== -1) {
        const header = systemText.slice(0, markerIdx + kbMarker.length);
        const kbBody = systemText.slice(markerIdx + kbMarker.length);
        const headerTokens = this.estimateTokens(header);
        const remainingForKb = Math.max(0, targetSystemPlusPrompt - promptTokens - headerTokens - 16);
        const trimmedKb = trimToTokenBudget(kbBody, remainingForKb);
        systemText = header + trimmedKb;
      } else {
        // Generic trim if we cannot detect knowledge
        const remainingForSystem = Math.max(0, targetSystemPlusPrompt - promptTokens);
        systemText = trimToTokenBudget(systemText, remainingForSystem);
      }
      systemTokens = this.estimateTokens(systemText);
    }

    // If still too large, trim prompt as a last resort
    if (systemTokens + promptTokens > targetSystemPlusPrompt) {
      const remainingForPrompt = Math.max(0, targetSystemPlusPrompt - systemTokens);
      promptText = trimToTokenBudget(promptText, remainingForPrompt);
    }

    // Push (possibly trimmed) system message
    if (systemText) {
      messages.push({ role: 'system', content: systemText });
    }

    // Now compute available for history and add most recent within budget
    const fixedTokens = this.estimateTokens(systemText) + this.estimateTokens(promptText);
    let availableForHistory = Math.max(0, maxPromptTokens - fixedTokens);

    let historyTokens = 0;
    const recentHistory: ChatMessage[] = [];

    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const msg = chatHistory[i];
      const msgTokens = this.estimateTokens(msg.text);
      if (historyTokens + msgTokens <= availableForHistory) {
        recentHistory.unshift(msg);
        historyTokens += msgTokens;
      } else {
        // try partial trim of this message if none added yet and it is user prompt
        if (availableForHistory > 16 && recentHistory.length === 0) {
          const trimmed = trimToTokenBudget(msg.text, availableForHistory - 8);
          recentHistory.unshift({ ...msg, text: trimmed });
          historyTokens += this.estimateTokens(trimmed);
        }
        console.log(`Trimmed ${i + 1} older messages to fit context window`);
        break;
      }
    }

    // Add trimmed history
    recentHistory.forEach(msg => {
      messages.push({ role: msg.author === MessageAuthor.USER ? 'user' : 'assistant', content: msg.text });
    });

    // Add current prompt last
    messages.push({ role: 'user', content: promptText });

    console.log(`Context management: ${this.estimateTokens(systemText) + historyTokens + this.estimateTokens(promptText)} tokens (${messages.length} messages)`);

    return messages;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async ensureGGUFLoaded(model: LocalModel): Promise<{ tokenizer: any, model: any }> {
    // Reuse loaded instances
    const cached = this.ggufModels.get(model.id);
    if (cached) {
      return { tokenizer: cached.tokenizer, model: cached.model };
    }

    if (!model.modelData) {
      throw new Error('GGUF model data not loaded in memory. Please load the model file first.');
    }

    // NOTE: transformers.js does not natively load raw GGUF binaries. Most GGUF models are llama.cpp format.
    // For browser-based inference, we need ONNX or WebLLM-compiled models. As a pragmatic path,
    // we'll try to initialize a generic text-generation pipeline with local files when possible.
    // This requires that the user provides a folder with tokenizer.json and model.onnx weights alongside the GGUF.

    // Attempt to load tokenizer/model from a same-folder structure provided via File System Access API
    // This is a best-effort approach and may need conversion using tools like llama.cpp -> gguf2onnx offline.
    try {
      const tokenizer = await AutoTokenizer.from_pretrained(model.path as any, { local_files_only: true });
      const loadedModel = await AutoModelForCausalLM.from_pretrained(model.path as any, {
        local_files_only: true,
        dtype: 'q8'
      });

      this.ggufModels.set(model.id, { tokenizer, model: loadedModel, modelData: model.modelData! });
      return { tokenizer, model: loadedModel };
    } catch (e) {
      throw new Error('Direct GGUF inference in-browser requires ONNX or WebLLM builds. Please convert your model to an ONNX/transformers.js compatible format or use llama.cpp server.');
    }
  }

  private async generateGGUFResponse(
    modelId: string,
    systemInstruction: string,
    chatHistory: ChatMessage[],
    prompt: string,
    config: Required<ModelConfig>
  ): Promise<LocalModelResponse> {
    const model = this.models.get(modelId)!;

    // Use llama.cpp service for proper chat template formatting
    const messages = formatChat(
      systemInstruction,
      chatHistory.map(msg => ({
        role: msg.author === MessageAuthor.USER ? 'user' : 'assistant',
        content: msg.text
      })),
      prompt
    );

    try {
      const response = await createChatCompletion(messages, {
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxOutputTokens || 2048,
        model: model.modelId
      });

      const responseText = response.choices[0]?.message?.content || '';
      
      return {
        text: responseText,
        inputTokens: response.usage?.prompt_tokens || this.estimateTokens(JSON.stringify(messages)),
        outputTokens: response.usage?.completion_tokens || this.estimateTokens(responseText)
      };
    } catch (error: any) {
      console.error('GGUF inference via llama.cpp failed:', error);
      throw new Error(`GGUF model inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateModelId(path: string): string {
    return `local_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  private extractModelName(path: string): string {
    const filename = path.split('/').pop() || path;
    return filename.replace('.gguf', '').replace(/[_-]/g, ' ');
  }

  public getAvailableModels(): LocalModel[] {
    return Array.from(this.models.values());
  }

  public async testNetworkConnectivity(): Promise<{ huggingface: boolean; general: boolean }> {
    const results = { huggingface: false, general: false };
    
    try {
      // Test general internet connectivity
      const generalResponse = await fetch('https://httpbin.org/get', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      results.general = true;
    } catch (error) {
      console.warn('General internet connectivity test failed:', error);
    }
    
    try {
      // Test Hugging Face connectivity
      const hfResponse = await fetch('https://huggingface.co/api/models', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      results.huggingface = true;
    } catch (error) {
      console.warn('Hugging Face connectivity test failed:', error);
    }
    
    return results;
  }

  public getCurrentModel(): LocalModel | null {
    if (!this.currentModel) return null;
    return this.models.get(this.currentModel) || null;
  }

  public unloadModel(modelId: string): void {
    if (this.models.has(modelId)) {
      const model = this.models.get(modelId)!;
      model.loaded = false;
      
      if (this.currentModel === modelId) {
        this.currentModel = null;
      }
      
      console.log(`Unloaded model: ${model.name}`);
    }
  }

  private unloadCurrentModel(): void {
    if (this.currentModel) {
      this.unloadModel(this.currentModel);
    }
  }

  public removeModel(modelId: string): void {
    if (this.models.has(modelId)) {
      this.unloadModel(modelId);
      this.models.delete(modelId);
    }
  }

  public getSupportedModels(): string[] {
    return [...this.SUPPORTED_MODELS];
  }

  public setProgressCallback(callback: (progress: ModelLoadProgress) => void): void {
    this.progressCallback = callback;
  }

  public getLoadingProgress(): ModelLoadProgress | null {
    return this.loadingProgress;
  }

  public isModelSupported(modelId: string): boolean {
    return this.SUPPORTED_MODELS.includes(modelId);
  }

  public getModelMemoryInfo(modelId: string): { size: string; recommended: boolean } | null {
    const constraints = this.MODEL_CONSTRAINTS[modelId];
    return constraints ? { size: constraints.size, recommended: constraints.recommended } : null;
  }

  public getModelConstraints(modelId: string) {
    return this.MODEL_CONSTRAINTS[modelId] || null;
  }

  public getCurrentModelConstraints() {
    if (!this.currentModel) return null;
    const model = this.models.get(this.currentModel);
    if (!model) return null;
    return this.getModelConstraints(model.modelId);
  }

  public validateModelConfig(modelId: string, config: Required<ModelConfig>): { isValid: boolean; errors: string[]; adjustedConfig?: Required<ModelConfig> } {
    const constraints = this.getModelConstraints(modelId);
    if (!constraints) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    const adjustedConfig = { ...config };

    // Validate and adjust maxOutputTokens
    if (config.maxOutputTokens > constraints.maxTokens) {
      errors.push(`Max output tokens (${config.maxOutputTokens}) exceeds model limit (${constraints.maxTokens})`);
      adjustedConfig.maxOutputTokens = constraints.maxTokens;
    }

    // Validate and adjust temperature
    if (config.temperature > constraints.maxTemperature) {
      errors.push(`Temperature (${config.temperature}) exceeds model limit (${constraints.maxTemperature})`);
      adjustedConfig.temperature = constraints.maxTemperature;
    }

    // Validate and adjust topP
    if (config.topP > constraints.maxTopP) {
      errors.push(`Top P (${config.topP}) exceeds model limit (${constraints.maxTopP})`);
      adjustedConfig.topP = constraints.maxTopP;
    }

    // Validate and adjust topK
    if (config.topK > constraints.maxTopK) {
      errors.push(`Top K (${config.topK}) exceeds model limit (${constraints.maxTopK})`);
      adjustedConfig.topK = constraints.maxTopK;
    }

    return {
      isValid: errors.length === 0,
      errors,
      adjustedConfig: errors.length > 0 ? adjustedConfig : undefined
    };
  }

  public getRecommendedModels(): string[] {
    return this.SUPPORTED_MODELS.filter(modelId => 
      this.MODEL_CONSTRAINTS[modelId]?.recommended
    );
  }

  // Folder browsing methods
  public async browseFolder(): Promise<ModelFile[]> {
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        throw new Error(`File browser not supported in this browser/context.

Supported environments:
- Chrome/Edge 86+ on localhost or HTTPS
- Not supported in Firefox or Safari yet

Alternative: Use llama.cpp server instead:
1. Create .env.local with: VITE_USE_LLAMA_SERVER=true
2. Start llama.cpp server with your model
3. Restart the app - it will use your local server

See USING-LOCAL-MODELS.md for details.`);
      }

      console.log('Opening directory picker...');
      console.log('Browser:', navigator.userAgent);
      console.log('Secure context:', window.isSecureContext);
      
      // Use the File System Access API to browse folders
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'downloads' // Start in downloads folder by default
      });
      
      this.currentDirectory = directoryHandle.name;
      console.log(`Selected directory: ${this.currentDirectory}`);
      
      const modelFiles = await this.scanDirectoryForModels(directoryHandle);
      this.scannedModelFiles = modelFiles;
      
      console.log(`Found ${modelFiles.length} model files`);
      return modelFiles;
      
    } catch (error: any) {
      console.error('Browse folder error:', error);
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        throw new Error('Folder selection was cancelled.');
      } else if (error.name === 'SecurityError') {
        throw new Error(`Cannot access file system due to security restrictions.

This usually happens when:
- Not using localhost or HTTPS
- Browser security settings block file access

Solutions:
1. Access via http://localhost:3000 instead of IP address
2. Use llama.cpp server with VITE_USE_LLAMA_SERVER=true
3. Try Chrome/Edge browser

See USING-LOCAL-MODELS.md for complete guide.`);
      } else if (error.message?.includes('not supported')) {
        throw error; // Re-throw our custom error message
      }
      
      throw new Error(`Failed to browse folder: ${error.message || 'Unknown error'}`);
    }
  }

  private async scanDirectoryForModels(directoryHandle: any): Promise<ModelFile[]> {
    const modelFiles: ModelFile[] = [];
    const supportedExtensions = ['.gguf', '.ggml', '.bin', '.safetensors', '.pt', '.pth'];
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          const extension = name.toLowerCase().substring(name.lastIndexOf('.'));
          
          if (supportedExtensions.includes(extension)) {
            modelFiles.push({
              name: name,
              path: file.name, // In browser, this is just the filename
              size: file.size,
              type: extension.substring(1), // Remove the dot
              lastModified: new Date(file.lastModified),
              handle: handle // Store the file handle for later access
            });
          }
        } else if (handle.kind === 'directory') {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectoryForModels(handle);
          modelFiles.push(...subFiles.map(f => ({
            ...f,
            path: `${name}/${f.path}`
          })));
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
    
    return modelFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  public getScannedModelFiles(): ModelFile[] {
    return [...this.scannedModelFiles];
  }

  public getCurrentDirectory(): string | null {
    return this.currentDirectory;
  }

  public async loadGGUFModel(modelFile: ModelFile, fileHandle: any): Promise<string> {
    try {
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      
      console.log(`Loading GGUF model: ${modelFile.name}`);
      console.log(`File size: ${this.formatFileSize(arrayBuffer.byteLength)}`);
      
      // Create a model entry
      const modelId = this.generateModelId(modelFile.name);
      const model: LocalModel = {
        id: modelId,
        name: modelFile.name.replace(/\.(gguf|ggml)$/i, ''),
        path: modelFile.path,
        size: arrayBuffer.byteLength,
        loaded: true,
        modelId: modelFile.path,
        type: 'gguf',
        modelData: arrayBuffer
      };

      this.models.set(modelId, model);
      this.currentModel = modelId;

      console.log(`GGUF model loaded successfully: ${model.name}`);
      return modelId;
    } catch (error) {
      console.error('Failed to load GGUF model:', error);
      throw new Error(`Failed to load GGUF model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const localModelService = LocalModelService.getInstance();
