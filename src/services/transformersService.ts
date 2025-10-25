/**
 * Transformers.js Service - More Efficient Alternative to WebLLM
 * 
 * This service provides local AI model inference using Transformers.js
 * which is more reliable and efficient than WebLLM for browser environments.
 * 
 * Features:
 * - No Cache API dependency (works in all browsers)
 * - Better network error handling
 * - WebGPU acceleration support
 * - Smaller ONNX models
 * - Offline capability
 */

import { pipeline, env } from '@huggingface/transformers';
import type { ChatMessage, ModelConfig } from '../types';
import { MessageAuthor } from '../types';

// Configure Transformers.js environment
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/';

export interface TransformersResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TransformersModel {
  id: string;
  name: string;
  modelId: string;
  task: string;
  size: string;
  loaded: boolean;
  pipeline?: any;
  device: 'cpu' | 'webgpu';
}

class TransformersService {
  private static instance: TransformersService;
  private models: Map<string, TransformersModel> = new Map();
  private currentModel: string | null = null;
  private isWebGPUAvailable = false;

  // Efficient models optimized for browser use
  private readonly SUPPORTED_MODELS = [
    {
      id: 'distilbert-base-uncased-finetuned-sst-2-english',
      name: 'DistilBERT Sentiment',
      task: 'sentiment-analysis',
      size: '~67MB',
      recommended: true,
      description: 'Fast sentiment analysis'
    },
    {
      id: 'Xenova/LaMini-Flan-T5-248M',
      name: 'LaMini T5 248M',
      task: 'text2text-generation',
      size: '~95MB',
      recommended: true,
      description: 'Small text generation model'
    },
    {
      id: 'Xenova/distilgpt2',
      name: 'DistilGPT2',
      task: 'text-generation',
      size: '~82MB',
      recommended: true,
      description: 'Lightweight text generation'
    },
    {
      id: 'microsoft/DialoGPT-small',
      name: 'DialoGPT Small',
      task: 'conversational',
      size: '~117MB',
      recommended: true,
      description: 'Conversational AI model'
    },
    {
      id: 'Xenova/gpt2',
      name: 'GPT-2',
      task: 'text-generation',
      size: '~124MB',
      recommended: false,
      description: 'Standard GPT-2 model'
    }
  ];

  private constructor() {
    this.checkWebGPUSupport();
  }

  public static getInstance(): TransformersService {
    if (!TransformersService.instance) {
      TransformersService.instance = new TransformersService();
    }
    return TransformersService.instance;
  }

  private async checkWebGPUSupport(): Promise<void> {
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        this.isWebGPUAvailable = !!adapter;
        console.log('WebGPU support:', this.isWebGPUAvailable ? 'Available' : 'Not available');
      }
    } catch (error) {
      console.log('WebGPU check failed:', error);
      this.isWebGPUAvailable = false;
    }
  }

  public async loadModel(modelId: string): Promise<string> {
    try {
      const modelInfo = this.SUPPORTED_MODELS.find(m => m.id === modelId);
      if (!modelInfo) {
        throw new Error(`Model ${modelId} not found in supported models`);
      }

      console.log(`Loading Transformers.js model: ${modelInfo.name} (${modelInfo.size})`);

      // Determine device (WebGPU if available, otherwise CPU)
      const device = this.isWebGPUAvailable ? 'webgpu' : 'cpu';
      console.log(`Using device: ${device}`);

      // Create pipeline with error handling
      const modelPipeline = await pipeline(modelInfo.task as any, modelId, {
        device: device,
        // Add progress callback if supported
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading ${progress.name}: ${progress.progress}%`);
          } else if (progress.status === 'loading') {
            console.log(`Loading ${progress.name}...`);
          }
        }
      });

      // Create model entry
      const internalId = this.generateModelId(modelId);
      const model: TransformersModel = {
        id: internalId,
        name: modelInfo.name,
        modelId: modelId,
        task: modelInfo.task,
        size: modelInfo.size,
        loaded: true,
        pipeline: modelPipeline,
        device: device as 'cpu' | 'webgpu'
      };

      this.models.set(internalId, model);
      this.currentModel = internalId;

      console.log(`✅ Transformers.js model loaded: ${model.name} on ${device}`);
      return internalId;

    } catch (error) {
      console.error('Failed to load Transformers.js model:', error);
      
      // Provide helpful error messages
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(`Failed to download model ${modelId}. 

This could be due to:
1. Network connectivity issues
2. Model not available on Hugging Face Hub
3. Firewall/proxy restrictions

Try:
1. Check your internet connection
2. Try a different model
3. Wait a few minutes and retry`);
      }
      
      throw new Error(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateResponse(
    modelId: string,
    systemInstruction: string,
    chatHistory: ChatMessage[],
    prompt: string,
    config: Required<ModelConfig>
  ): Promise<TransformersResponse> {
    const model = this.models.get(modelId);
    if (!model || !model.loaded || !model.pipeline) {
      throw new Error(`Model ${modelId} is not loaded`);
    }

    try {
      // Format the conversation for the model
      const conversationText = this.formatConversation(systemInstruction, chatHistory, prompt);
      
      let responseText = '';
      let inputTokens = this.estimateTokens(conversationText);
      let outputTokens = 0;

      // Generate response based on model task
      switch (model.task) {
        case 'text-generation':
        case 'text2text-generation':
          const generationResult = await model.pipeline(conversationText, {
            max_new_tokens: config.maxOutputTokens || 256,
            temperature: config.temperature || 0.8,
            do_sample: true,
            top_p: config.topP || 0.9,
            repetition_penalty: 1.2  // Higher penalty to reduce repetition
          });
          
          if (Array.isArray(generationResult)) {
            responseText = generationResult[0]?.generated_text || '';
          } else {
            responseText = generationResult.generated_text || '';
          }
          
          // Remove the input text from response if it's included
          if (responseText.startsWith(conversationText)) {
            responseText = responseText.substring(conversationText.length).trim();
          }
          break;

        case 'conversational':
          const conversationResult = await model.pipeline(conversationText);
          responseText = conversationResult.generated_text || '';
          break;

        default:
          throw new Error(`Task ${model.task} not supported for text generation`);
      }

      outputTokens = this.estimateTokens(responseText);

      return {
        text: responseText,
        inputTokens,
        outputTokens
      };

    } catch (error) {
      console.error('Transformers.js inference failed:', error);
      throw new Error(`Model inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatConversation(systemInstruction: string, chatHistory: ChatMessage[], prompt: string): string {
    let conversation = '';
    
    if (systemInstruction) {
      conversation += `System: ${systemInstruction}\n\n`;
    }

    // Add chat history
    chatHistory.forEach(msg => {
      const role = msg.author === MessageAuthor.USER ? 'User' : 'Assistant';
      conversation += `${role}: ${msg.text}\n`;
    });

    // Add current prompt
    conversation += `User: ${prompt}\nAssistant:`;

    return conversation;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private generateModelId(modelId: string): string {
    return `transformers_${modelId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  public getSupportedModels(): typeof this.SUPPORTED_MODELS {
    return [...this.SUPPORTED_MODELS];
  }

  public getRecommendedModels(): typeof this.SUPPORTED_MODELS {
    return this.SUPPORTED_MODELS.filter(model => model.recommended);
  }

  public getAvailableModels(): TransformersModel[] {
    return Array.from(this.models.values());
  }

  public getCurrentModel(): TransformersModel | null {
    if (!this.currentModel) return null;
    return this.models.get(this.currentModel) || null;
  }

  public unloadModel(modelId: string): void {
    if (this.models.has(modelId)) {
      const model = this.models.get(modelId)!;
      model.loaded = false;
      model.pipeline = null;
      
      if (this.currentModel === modelId) {
        this.currentModel = null;
      }
      
      console.log(`Unloaded model: ${model.name}`);
    }
  }

  public removeModel(modelId: string): void {
    if (this.models.has(modelId)) {
      this.unloadModel(modelId);
      this.models.delete(modelId);
    }
  }

  public isWebGPUSupported(): boolean {
    return this.isWebGPUAvailable;
  }

  public async testConnectivity(): Promise<{ huggingface: boolean; general: boolean }> {
    const results = { huggingface: false, general: false };
    
    try {
      // Test general connectivity
      const response = await fetch('https://httpbin.org/get', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      results.general = true;
    } catch (error) {
      console.warn('General connectivity test failed:', error);
    }
    
    try {
      // Test Hugging Face Hub connectivity
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
}

export const transformersService = TransformersService.getInstance();
