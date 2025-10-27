import React, { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, AVAILABLE_BACKGROUNDS } from '../constants';
import type { ApiProvider, ModelConfig, TtsConfig, Personality, ExperimentalSettings } from '../types';
import { ApiProvider as ApiProviderEnum, TtsProvider } from '../types';
import { localModelService, type ModelFile } from '../services/localModelService';
import { voiceIdRegistry } from '../services/voiceIdRegistryService';
import { listVoices, type ElevenLabsVoice } from '../services/elevenlabsService';
import * as selfHostedTtsService from '../services/selfHostedTtsService';
import { ExperimentalSettingsPanel } from './ExperimentalSettingsPanel';
import { ApiKeyInput } from './ApiKeyInput';
import { gangService } from '../services/gangService';
import { povertyService } from '../services/povertyService';
import { cigaretteService } from '../services/cigaretteService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiProvider: ApiProvider;
  onApiProviderChange: (provider: ApiProvider) => void;
  openAiApiKey: string;
  onOpenAiApiKeyChange: (key: string) => void;
  currentModel: string;
  onModelChange: (model: string) => void;
  modelConfig: Required<ModelConfig>;
  onModelConfigChange: (config: Required<ModelConfig>) => void;
  ttsConfig: TtsConfig;
  onTtsConfigChange: (config: Partial<TtsConfig>) => void;
  localModels: string[];
  onLocalModelLoad: (fileOrModel: string | File) => void;
  exportPath: string;
  onExportPathChange: (path: string) => void;
  geminiApiKey?: string;
  onGeminiApiKeyChange?: (key: string) => void;
  // UI colors
  chatInputColor: string;
  onChatInputColorChange: (color: string) => void;
  chatAiColor: string;
  onChatAiColorChange: (color: string) => void;
  chatWindowBgColor: string;
  onChatWindowBgColorChange: (color: string) => void;
  // Display
  chatWindowAlpha: number; // 0.0 - 1.0 transparency for chat window background
  onChatWindowAlphaChange: (alpha: number) => void;
  chatMessageAlpha: number; // 0.0 - 1.0 transparency for chat message bubbles
  onChatMessageAlphaChange: (alpha: number) => void;
  // CLI Colors
  cliFontColor: string;
  onCliFontColorChange: (color: string) => void;
  cliBgColor: string;
  onCliBgColorChange: (color: string) => void;
  onResetThemeColors: () => void;
  // Desktop background
  desktopBackground: string;
  onDesktopBackgroundChange: (background: string) => void;
  // Personality panel colors
  personalityPanelBgColor: string;
  onPersonalityPanelBgColorChange: (color: string) => void;
  personalityPanelBorderColor: string;
  onPersonalityPanelBorderColorChange: (color: string) => void;
  personalityPanelFontColor: string;
  onPersonalityPanelFontColorChange: (color: string) => void;
  // Star field background
  starFieldEnabled: boolean;
  onStarFieldEnabledChange: (enabled: boolean) => void;
  starFieldCount: number; // 0.5 - 2.0
  onStarFieldCountChange: (count: number) => void;
  starFieldSpeed: number; // 0.5 - 3.0
  onStarFieldSpeedChange: (speed: number) => void;
  shootingStarsEnabled: boolean;
  onShootingStarsEnabledChange: (enabled: boolean) => void;
  // Personalities for central voice mapping
  personalities: Personality[];
  // Experimental settings
  experimentalSettings: ExperimentalSettings;
  onExperimentalSettingsChange: (settings: ExperimentalSettings) => void;
  // Initial tab to open
  initialTab?: 'ai' | 'tts' | 'theme' | 'environment' | 'experimental' | 'about';
}


export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, apiProvider, onApiProviderChange, openAiApiKey, onOpenAiApiKeyChange, 
    currentModel, onModelChange, modelConfig, onModelConfigChange,
    ttsConfig, onTtsConfigChange, localModels, onLocalModelLoad,
    exportPath, onExportPathChange, geminiApiKey, onGeminiApiKeyChange,
    chatInputColor, onChatInputColorChange, chatAiColor, onChatAiColorChange,
    chatWindowBgColor, onChatWindowBgColorChange,
    chatWindowAlpha, onChatWindowAlphaChange,
    chatMessageAlpha, onChatMessageAlphaChange,
    cliFontColor, onCliFontColorChange,
    cliBgColor, onCliBgColorChange,
    onResetThemeColors,
    desktopBackground,
    onDesktopBackgroundChange,
    personalityPanelBgColor,
    onPersonalityPanelBgColorChange,
    personalityPanelBorderColor,
    onPersonalityPanelBorderColorChange,
    personalityPanelFontColor,
    onPersonalityPanelFontColorChange,
    starFieldEnabled,
    onStarFieldEnabledChange,
    starFieldCount,
    onStarFieldCountChange,
    starFieldSpeed,
    onStarFieldSpeedChange,
    shootingStarsEnabled,
    onShootingStarsEnabledChange,
    personalities,
    experimentalSettings,
    onExperimentalSettingsChange,
    initialTab = 'ai'
}) => {
  // Global model parameters are configured per personality; suppress unused props
  void modelConfig; void onModelConfigChange;
  
  // Self-Hosted TTS voice detection
  const [detectedVoices, setDetectedVoices] = useState<string[]>([]);
  const [voiceRegistry, setVoiceRegistry] = useState<Record<string, string>>({});
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);

  // Fetch available voices when Self-Hosted TTS is selected
  useEffect(() => {
    if (ttsConfig?.provider === TtsProvider.SELF_HOSTED && isOpen) {
      loadAvailableVoices();
      loadVoiceRegistry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsConfig?.provider, isOpen]);

  const loadAvailableVoices = async () => {
    setIsLoadingVoices(true);
    setVoiceLoadError(null);
    try {
      const apiUrl = localStorage.getItem('self_hosted_tts_url') || ttsConfig?.selfHostedUrl || null;
      const voices = await selfHostedTtsService.listVoices(apiUrl);
      setDetectedVoices(voices);
      if (voices.length === 0) {
        setVoiceLoadError('No voices detected. Add WAV files to voces/ folder and restart server.');
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoiceLoadError('Failed to connect to TTS server. Is it running?');
      setDetectedVoices([]);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadVoiceRegistry = () => {
    const registry = voiceIdRegistry.getAll();
    setVoiceRegistry(registry);
  };

  const clearElevenLabsVoiceIds = () => {
    const registry = voiceIdRegistry.getAll();
    let cleared = 0;
    
    // Clear any voice IDs that look like ElevenLabs IDs (long alphanumeric strings)
    for (const [personalityId, voiceId] of Object.entries(registry)) {
      if (voiceId.length > 15 && /^[a-zA-Z0-9]+$/.test(voiceId)) {
        voiceIdRegistry.removeVoiceId(personalityId);
        cleared++;
      }
    }
    
    loadVoiceRegistry();
    alert(`Cleared ${cleared} ElevenLabs voice ID${cleared !== 1 ? 's' : ''} from registry. Personalities will auto-match to your self-hosted voices on next use.`);
  };
  
  // Helper to mark user settings changes and trigger immediate save
  const handleUserSettingsChange = (newSettings: any) => {
    try {
      // Mark that user is actively changing settings
      (window as any).userSettingsChangeInProgress = true;
      
      // Validate the settings before applying
      if (!newSettings || typeof newSettings !== 'object') {
        console.error('[SETTINGS] Invalid settings object, skipping update');
        return;
      }
      
      // Apply the change
      onExperimentalSettingsChange(newSettings);
      
      // Clear any existing timeout to extend the protection period
      if ((window as any).userSettingsTimeout) {
        clearTimeout((window as any).userSettingsTimeout);
      }
      
      // Set a new timeout with extended delay for gang sliders
      (window as any).userSettingsTimeout = setTimeout(() => {
        (window as any).userSettingsChangeInProgress = false;
        (window as any).userSettingsTimeout = null;
      }, 5000); // Extended to 5 seconds for better protection during rapid slider changes
    } catch (error) {
      console.error('[SETTINGS] Error in handleUserSettingsChange:', error);
      (window as any).userSettingsChangeInProgress = false;
    }
  };
  // Cleanup timeout when modal closes
  useEffect(() => {
    return () => {
      if ((window as any).userSettingsTimeout) {
        clearTimeout((window as any).userSettingsTimeout);
        (window as any).userSettingsTimeout = null;
        (window as any).userSettingsChangeInProgress = false;
      }
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'ai' | 'tts' | 'theme' | 'environment' | 'experimental' | 'about'>(initialTab);
  const [environmentSubTab, setEnvironmentSubTab] = useState<'gangs' | 'poverty'>('gangs');
  const [scannedModels, setScannedModels] = useState<ModelFile[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedModelFile, setSelectedModelFile] = useState<ModelFile | null>(null);
 
  // Voice mapping state (centralized)
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[] | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceMap, setVoiceMap] = useState<{ [id: string]: string }>(() => voiceIdRegistry.getAll());

  // Update active tab when initialTab changes (when modal reopens with different tab)
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Predefined color swatches for simple selection
  const SWATCH_COLORS = ['#ff0000', '#ffffff', '#000000', '#0000ff', '#00ff00'];
 
  if (!isOpen) return null;
 
 
  const handleBrowseFolder = async () => {
    try {
      setIsScanning(true);
      const modelFiles = await localModelService.browseFolder();
      setScannedModels(modelFiles);
      setCurrentDirectory(localModelService.getCurrentDirectory());
    } catch (error) {
      console.error('Failed to browse folder:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoadSelectedModel = async (modelFile: ModelFile) => {
    try {
      setSelectedModelFile(modelFile);
      
      if (!modelFile.handle) {
        throw new Error('File handle not available. Please browse the folder again.');
      }
      
      // Get the actual file from the handle immediately to avoid permission issues
      const file = await modelFile.handle.getFile();
      
      // Create a new File object with the data to avoid handle permission issues
      const fileData = await file.arrayBuffer();
      const newFile = new File([fileData], file.name, { type: file.type });
      
      // Pass the File object to load the model
      await onLocalModelLoad(newFile);
      setSelectedModelFile(null);
      onClose(); // Close the settings modal after loading
    } catch (error) {
      console.error('Failed to load model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('permission') || errorMessage.includes('NotReadableError')) {
        console.error(`File access permission lost. Please browse the folder again and try loading the model immediately after selection.`);
      } else {
        console.error(`Failed to load model: ${errorMessage}`);
      }
      setSelectedModelFile(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" 
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not on child elements
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-light-panel dark:bg-base-800 bg-opacity-75 rounded-lg shadow-xl w-full max-w-lg border border-light-border dark:border-base-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-light-border dark:border-base-700">
          <h2 className="text-2xl font-bold text-light-text dark:text-gray-100 text-center">Virtual Control</h2>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'ai' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              AI Settings
            </button>
            <button
              onClick={() => setActiveTab('tts')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'tts' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              Text to Speech
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'theme' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab('environment')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'environment' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              🌍 Environment
            </button>
            <button
              onClick={() => setActiveTab('experimental')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'experimental' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              Experimental
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'about' ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200'
              }`}
            >
              About
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          {activeTab === 'ai' && (
            <>
              {/* API Provider Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">AI Model Settings</h3>
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">API Provider</label>
              <div className="flex gap-2">
                {(Object.values(ApiProviderEnum) as ApiProvider[]).map(provider => (
                  <button
                    key={provider}
                    onClick={() => onApiProviderChange(provider)}
                    className={`flex-1 capitalize p-2 rounded-md text-sm font-semibold transition-colors ${
                      apiProvider === provider ? 'bg-primary text-white' : 'bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600'
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            {apiProvider === ApiProviderEnum.GOOGLE && (
              <ApiKeyInput
                id="gemini-key"
                label="Google Gemini API Key"
                value={geminiApiKey || ''}
                onChange={(value) => onGeminiApiKeyChange?.(value)}
                placeholder="Enter your Google Gemini API key"
                keyType="gemini"
                helpText="If empty, will fallback to server-provided key or GEMINI_API_KEY environment variable."
              />
            )}

            {apiProvider === ApiProviderEnum.OPENAI && (
              <ApiKeyInput
                id="openai-key"
                label="OpenAI API Key (for Chat)"
                value={openAiApiKey}
                onChange={(value) => onOpenAiApiKeyChange(value)}
                placeholder="sk-..."
                keyType="openai"
                helpText="If empty, will fallback to server-provided key or OPENAI_API_KEY environment variable."
              />
            )}

            <div>
              <label htmlFor="model-select" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                Active AI Model
              </label>
              {apiProvider === ApiProviderEnum.LOCAL ? (
                <div className="space-y-4">
                  {/* Pre-configured models section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-light-text dark:text-gray-200">
                      Pre-configured WebLLM Models
                    </label>
                    <select
                      id="local-model-select"
                      value={currentModel}
                      onChange={(e) => {
                        const selectedModel = e.target.value;
                        onModelChange(selectedModel);
                        if (selectedModel && selectedModel !== currentModel) {
                          onLocalModelLoad(selectedModel as any);
                        }
                      }}
                      className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a pre-configured model...</option>
                {AVAILABLE_MODELS[apiProvider].map((model) => {
                  const memInfo = localModelService.getModelMemoryInfo(model);
                  const displayName = model.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
                  const recommended = memInfo?.recommended ? ' ⭐' : '';
                  return (
                    <option key={model} value={model}>
                      {displayName} {memInfo ? `(${memInfo.size})` : ''}{recommended}
                    </option>
                  );
                })}
                    </select>
                    <p className="text-xs text-gray-500">
                      Models will be downloaded and cached automatically. ⭐ = Recommended.
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-light-border dark:border-base-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-light-panel dark:bg-base-800 text-gray-500">OR</span>
                    </div>
                  </div>

                  {/* Local folder browser section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-light-text dark:text-gray-200">
                      Browse Local GGUF Model Folder
                    </label>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Recommended:</strong> Use llama.cpp server for local models
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                        <strong>Quick Setup:</strong>
                      </p>
                      <ol className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-decimal space-y-1">
                        <li>Create <code className="bg-black/10 px-1 rounded">.env.local</code> with:<br/>
                        <code className="bg-black/10 px-1 rounded text-[10px]">VITE_USE_LLAMA_SERVER=true</code></li>
                        <li>Start server: <code className="bg-black/10 px-1 rounded text-[10px]">./server -m model.gguf --port 8080</code></li>
                        <li>Restart app: <code className="bg-black/10 px-1 rounded text-[10px]">npm run dev</code></li>
                      </ol>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                        <strong>File Browser Requirements:</strong>
                      </p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-disc">
                        <li>Chrome/Edge 86+ only</li>
                        <li>Must use <code className="bg-black/10 px-1 rounded">localhost:3000</code> (not IP address)</li>
                        <li>Not supported in Firefox/Safari</li>
                      </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleBrowseFolder}
                        disabled={isScanning}
                        className="flex-1 bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Requires Chrome/Edge on localhost"
                      >
                        {isScanning ? '🔍 Scanning Folder...' : '📁 Browse Local GGUF Folder (Advanced)'}
                      </button>

                      {/* Fallback: direct file upload for browsers without directory picker */}
                      <label className="flex-1 cursor-pointer bg-light-border dark:bg-base-700 hover:bg-black/10 dark:hover:bg-base-600 text-light-text dark:text-gray-200 font-medium py-2 px-4 rounded-md text-center">
                        ⬆️ Upload GGUF File (Fallback)
                        <input
                          type="file"
                          accept=".gguf,.ggml,.bin,.safetensors,.pt,.pth"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              await onLocalModelLoad(f);
                              onClose();
                            } catch (err) {
                              console.error(`Failed to load model:`, err);
                            } finally {
                              // reset input so choosing same file again will trigger
                              e.currentTarget.value = '';
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {currentDirectory && (
                      <div className="p-3 bg-light-bg dark:bg-base-700 rounded-md">
                        <p className="text-xs text-gray-500 mb-2">
                          📂 Current folder: <span className="font-medium">{currentDirectory}</span>
                        </p>
                        
                        {scannedModels.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <p className="text-sm font-medium text-light-text dark:text-gray-200">
                              Found {scannedModels.length} model file(s):
                            </p>
                            {scannedModels.map((modelFile, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-white dark:bg-base-800 rounded border border-light-border dark:border-base-600 hover:border-primary cursor-pointer"
                                onClick={() => handleLoadSelectedModel(modelFile)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-light-text dark:text-gray-200 truncate">
                                    {modelFile.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(modelFile.size)} • {modelFile.type.toUpperCase()}
                                  </p>
                                </div>
                                <button
                                  className="ml-2 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLoadSelectedModel(modelFile);
                                  }}
                                >
                                  Load
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            No GGUF model files found in this folder.
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Browse to a folder containing model files (.gguf, .ggml, .bin, .safetensors).
                    </p>
                  </div>
                </div>
              ) : (
                <select
                  id="model-select"
                  value={currentModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AVAILABLE_MODELS[apiProvider].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          
                <div className="space-y-2 pt-4 border-t border-light-border dark:border-base-700">
                  <p className="text-sm text-gray-500">
                    Model parameters (temperature, top-p, top-k, max tokens) are configured per personality in their settings.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tts' && (
            <>
              {/* TTS Settings */}
              <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Text-to-Speech Configuration</h3>
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">TTS Provider</label>
                    <select
                      value={ttsConfig?.provider || TtsProvider.BROWSER}
                      onChange={(e) => {
                        console.log('TTS Provider selected:', e.target.value); // Debug log
                        onTtsConfigChange({ provider: e.target.value as TtsProvider });
                      }}
                      className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={TtsProvider.BROWSER}>Browser (Basic)</option>
                      <option value={TtsProvider.ELEVENLABS}>ElevenLabs (High Quality + Emotions)</option>
                      <option value={TtsProvider.AZURE}>Azure (Premium + Full Emotions)</option>
                      <option value={TtsProvider.PLAYHT}>PlayHT (Ultra-Realistic + Emotions)</option>
                      <option value={TtsProvider.OPENAI}>OpenAI (High Quality)</option>
                      <option value={TtsProvider.GEMINI}>Gemini (Google Cloud TTS)</option>
                      <option value={TtsProvider.SELF_HOSTED}>Self-Hosted (Voice Cloning - FREE!)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 <strong>Recommended for Emotions:</strong> Azure or PlayHT offer the most advanced emotion control.
                      <strong>For Cost Savings:</strong> Self-Hosted offers voice cloning at near-zero cost!
                    </p>
                  </div>

                  {ttsConfig?.provider === TtsProvider.ELEVENLABS && (
                    <ApiKeyInput
                      id="eleven-key"
                      label="ElevenLabs API Key"
                      value={ttsConfig?.elevenLabsApiKey || ''}
                      onChange={(value) => onTtsConfigChange({ elevenLabsApiKey: value })}
                      placeholder="Enter your ElevenLabs API Key"
                      keyType="elevenlabs"
                      helpText="If empty, will fallback to server-provided key."
                    />
                  )}

                  {/* Central Voice ID Registry - Show for ElevenLabs, PlayHT, and Azure */}
                  {(ttsConfig?.provider === TtsProvider.ELEVENLABS || 
                    ttsConfig?.provider === TtsProvider.PLAYHT ||
                    ttsConfig?.provider === TtsProvider.AZURE) && (
                      <div className="mt-6 p-3 rounded-md border border-light-border dark:border-base-600 bg-white/60 dark:bg-base-800/60">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md font-semibold text-light-text dark:text-gray-200">
                            Voice IDs (Central Registry) - {
                              ttsConfig?.provider === TtsProvider.ELEVENLABS ? 'ElevenLabs' :
                              ttsConfig?.provider === TtsProvider.PLAYHT ? 'PlayHT' :
                              ttsConfig?.provider === TtsProvider.AZURE ? 'Azure' : 'Provider'
                            }
                          </h4>
                          <div className="flex gap-2">
                            {ttsConfig?.provider === TtsProvider.ELEVENLABS && (
                              <button
                                onClick={async () => {
                                  try {
                                    setLoadingVoices(true);
                                    const voices = await listVoices(ttsConfig?.elevenLabsApiKey || undefined);
                                    setAvailableVoices(voices);
                                  } catch (e) {
                                    console.error(`Failed to fetch voices:`, e);
                                  } finally {
                                    setLoadingVoices(false);
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-primary text-white rounded disabled:opacity-50"
                                disabled={loadingVoices}
                                title="Fetch voices from ElevenLabs"
                              >{loadingVoices ? 'Fetching...' : 'Fetch Voices'}</button>
                            )}
                            <button
                              onClick={() => {
                                // Auto-proceed: Clear voice mappings without confirmation
                                voiceIdRegistry.clearAll();
                                setVoiceMap({});
                              }}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                            >Clear All</button>
                            <button
                              onClick={() => {
                                const data = voiceIdRegistry.export();
                                navigator.clipboard.writeText(data).then(() => console.log('Voice mappings exported to clipboard'));
                              }}
                              className="px-2 py-1 text-xs bg-light-border dark:bg-base-700 rounded"
                            >Export</button>
                            <button
                              onClick={async () => {
                                const json = prompt('Paste voice ID mapping JSON');
                                if (!json) return;
                                try {
                                  voiceIdRegistry.import(json);
                                  setVoiceMap(voiceIdRegistry.getAll());
                                  console.log('Voice mapping imported successfully.');
                                } catch (e) {
                                  console.error(`Voice mapping import failed:`, e);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-light-border dark:bg-base-700 rounded"
                            >Import</button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {ttsConfig?.provider === TtsProvider.ELEVENLABS && 'Assign ElevenLabs voice IDs per personality here.'}
                          {ttsConfig?.provider === TtsProvider.PLAYHT && 'Assign PlayHT voice IDs (s3://... format or simple names) per personality here.'}
                          {ttsConfig?.provider === TtsProvider.AZURE && 'Assign Azure Neural voice names (e.g., en-US-AriaNeural) per personality here.'}
                          {' '}This registry overrides any per-personality voice ID fields.
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {personalities.length === 0 ? (
                            <p className="text-xs text-gray-500">No personalities loaded.</p>
                          ) : personalities.map(p => {
                            const current = voiceMap[p.id] || '';
                            // Provider-specific placeholders
                            const placeholder = 
                              ttsConfig?.provider === TtsProvider.ELEVENLABS ? 'Voice ID (21m00Tcm4TlvDq8ikWAM)' :
                              ttsConfig?.provider === TtsProvider.PLAYHT ? 's3://voice-cloning-zero-shot/.../manifest.json' :
                              ttsConfig?.provider === TtsProvider.AZURE ? 'en-US-AriaNeural' : 'Voice ID';
                            
                            return (
                              <div key={p.id} className="flex items-center gap-2">
                                <div className="w-40 truncate text-sm text-light-text dark:text-gray-200" title={p.name}>{p.name}</div>
                                {availableVoices && ttsConfig?.provider === TtsProvider.ELEVENLABS ? (
                                  <select
                                    value={current}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      voiceIdRegistry.setVoiceId(p.id, id);
                                      setVoiceMap(prev => ({ ...prev, [p.id]: id }));
                                    }}
                                    className="flex-1 bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded px-2 py-1 text-sm"
                                  >
                                    <option value="">— Select a voice —</option>
                                    {availableVoices.map(v => (
                                      <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.voice_id})</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={placeholder}
                                    value={current}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      voiceIdRegistry.setVoiceId(p.id, id);
                                      setVoiceMap(prev => ({ ...prev, [p.id]: id }));
                                    }}
                                    className="flex-1 bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded px-2 py-1 text-sm"
                                  />
                                )}
                                <button
                                  onClick={() => {
                                    voiceIdRegistry.removeVoiceId(p.id);
                                    setVoiceMap(prev => { const c = { ...prev }; delete c[p.id]; return c; });
                                  }}
                                  className="px-2 py-1 text-xs bg-light-border dark:bg-base-700 rounded"
                                  title="Remove mapping"
                                >Remove</button>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Provider-specific help */}
                        {ttsConfig?.provider === TtsProvider.PLAYHT && (
                          <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-xs">
                            <p className="font-semibold text-purple-800 dark:text-purple-200 mb-1">PlayHT Voice ID Format:</p>
                            <code className="text-[10px] bg-black/10 dark:bg-white/10 px-1 rounded">
                              s3://voice-cloning-zero-shot/[id]/[name]/manifest.json
                            </code>
                            <p className="mt-2 text-purple-700 dark:text-purple-300">
                              Find your cloned voice IDs at: <a href="https://play.ht/studio/voices" target="_blank" className="underline">play.ht/studio/voices</a>
                            </p>
                            <p className="mt-1 text-purple-700 dark:text-purple-300">
                              Or use stock voices: <code className="bg-black/10 px-1">jennifer</code>, <code className="bg-black/10 px-1">larry</code>, <code className="bg-black/10 px-1">melissa</code>
                            </p>
                          </div>
                        )}
                        
                        {ttsConfig?.provider === TtsProvider.AZURE && (
                          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Azure Voice Name Examples:</p>
                            <div className="space-y-1 text-blue-700 dark:text-blue-300">
                              <div><code className="bg-black/10 px-1">en-US-AriaNeural</code> - US Female (emotions)</div>
                              <div><code className="bg-black/10 px-1">en-US-GuyNeural</code> - US Male (emotions)</div>
                              <div><code className="bg-black/10 px-1">en-GB-SoniaNeural</code> - UK Female (emotions)</div>
                              <div><code className="bg-black/10 px-1">en-GB-RyanNeural</code> - UK Male (emotions)</div>
                            </div>
                            <p className="mt-2 text-blue-700 dark:text-blue-300">
                              Full list: <a href="https://learn.microsoft.com/azure/ai-services/speech-service/language-support" target="_blank" className="underline">Azure Voice Gallery</a>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  {ttsConfig?.provider === TtsProvider.OPENAI && (
                    <div>
                      <ApiKeyInput
                        id="openai-tts-key"
                        label="OpenAI API Key (for TTS)"
                        value={ttsConfig?.openaiApiKey || ''}
                        onChange={(value) => onTtsConfigChange({ openaiApiKey: value })}
                        placeholder="Enter your OpenAI API Key"
                        keyType="openai"
                        helpText="If empty, will fallback to server-provided key or OPENAI_TTS_API_KEY environment variable."
                      />
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        <strong>Note:</strong> TTS requires credits in your OpenAI account. If you get "no access to model tts-1" errors, add credits to your OpenAI account.
                      </p>
                    </div>
                  )}

                  {ttsConfig?.provider === TtsProvider.GEMINI && (
                    <ApiKeyInput
                      id="gemini-tts-key"
                      label="Google Cloud TTS API Key"
                      value={ttsConfig?.geminiApiKey || ''}
                      onChange={(value) => onTtsConfigChange({ geminiApiKey: value })}
                      placeholder="Enter your Google Cloud API Key"
                      keyType="gemini"
                      helpText="If empty, will fallback to server-provided key."
                    />
                  )}

                  {ttsConfig?.provider === TtsProvider.AZURE && (
                    <div>
                      <ApiKeyInput
                        id="azure-key"
                        label="Azure Cognitive Services API Key"
                        value={ttsConfig?.azureApiKey || ''}
                        onChange={(value) => onTtsConfigChange({ azureApiKey: value })}
                        placeholder="Enter your Azure Speech API Key"
                        keyType="azure"
                        helpText="Azure Speech Services subscription key. If empty, will fallback to server-provided key."
                      />
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        <strong>✨ Azure Benefits:</strong> Full SSML emotion support (happy, sad, angry, excited, fearful, etc.)
                        with intensity control. Highest quality emotional speech.
                      </p>
                    </div>
                  )}

                  {ttsConfig?.provider === TtsProvider.PLAYHT && (
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                        <p className="text-xs text-purple-800 dark:text-purple-200 font-semibold mb-2">
                          📚 Setup Guide:
                        </p>
                        <ol className="text-xs text-purple-700 dark:text-purple-300 space-y-1 ml-4 list-decimal">
                          <li>Get credentials at: <a href="https://play.ht/studio/api-access" target="_blank" className="underline">play.ht/studio/api-access</a></li>
                          <li>Find cloned voices at: <a href="https://play.ht/studio/voices" target="_blank" className="underline">play.ht/studio/voices</a></li>
                          <li>Copy the voice ID (s3://... format)</li>
                          <li>Paste below and in Voice Registry</li>
                        </ol>
                      </div>
                      
                      <div>
                        <label htmlFor="playht-key" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                          PlayHT API Key (Secret Key)
                        </label>
                        <input
                          id="playht-key"
                          type="password"
                          value={ttsConfig?.playhtApiKey || ''}
                          onChange={(e) => onTtsConfigChange({ playhtApiKey: e.target.value })}
                          placeholder="Enter your PlayHT Secret Key from API Access page"
                          className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="playht-user" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                          PlayHT User ID
                        </label>
                        <input
                          id="playht-user"
                          type="text"
                          value={ttsConfig?.playhtUserId || ''}
                          onChange={(e) => onTtsConfigChange({ playhtUserId: e.target.value })}
                          placeholder="Enter your PlayHT User ID from API Access page"
                          className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Both API Key and User ID are required. Get them from the API Access page.
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        <strong>🎭 PlayHT Benefits:</strong> Ultra-realistic voices with PlayDialog engine (fastest).
                        Emotion conveyed through dynamic temperature and speed modulation. Supports instant voice cloning.
                      </p>
                    </div>
                  )}

                  {ttsConfig?.provider === TtsProvider.SELF_HOSTED && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <h4 className="font-semibold text-sm mb-1 text-green-800 dark:text-green-200">
                          🎤 Self-Hosted Voice Cloning (Coqui XTTS-v2)
                        </h4>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Run your own voice cloning server! Near-zero cost, unlimited usage, complete privacy.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="self-hosted-url" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                          API URL
                        </label>
                        <input
                          id="self-hosted-url"
                          type="text"
                          value={ttsConfig?.selfHostedUrl || 'http://localhost:8000'}
                          onChange={(e) => {
                            onTtsConfigChange({ selfHostedUrl: e.target.value });
                            localStorage.setItem('self_hosted_tts_url', e.target.value);
                          }}
                          placeholder="http://localhost:8000 or http://your-server:8000"
                          className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          <strong>📋 Setup Required:</strong> See <code className="bg-black/10 dark:bg-white/10 px-1 rounded">SELF-HOSTED-TTS-SETUP.md</code> for installation instructions.
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          To start the server: <code className="bg-black/10 dark:bg-white/10 px-1 rounded">python scripts/coqui-xtts-server.py</code>
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          <strong>💰 Cost Savings:</strong>
                        </p>
                        <ul className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-1 list-disc list-inside">
                          <li>ElevenLabs: ~£600/month → Self-Hosted: £0-30/month</li>
                          <li>Savings: Up to £7,000/year!</li>
                          <li>Unlimited usage, no API limits</li>
                          <li>Complete privacy - data stays on your machine</li>
                        </ul>
                      </div>

                      {/* Voice Detection & Registry */}
                      <div className="space-y-3">
                        {/* Detected Voices */}
                        <div 
                          className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              🎤 Detected Voices from Server
                            </p>
                            <button
                              onClick={() => {
                                loadAvailableVoices();
                                loadVoiceRegistry();
                              }}
                              disabled={isLoadingVoices}
                              className="text-[10px] px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingVoices ? '⟳ Loading...' : '🔄 Refresh'}
                            </button>
                          </div>
                          
                          {isLoadingVoices && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              Loading voices from server...
                            </p>
                          )}
                          
                          {voiceLoadError && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              ⚠️ {voiceLoadError}
                            </p>
                          )}
                          
                          {!isLoadingVoices && !voiceLoadError && detectedVoices.length > 0 && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                <strong>{detectedVoices.length} voice{detectedVoices.length !== 1 ? 's' : ''} available:</strong>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {detectedVoices.map(voice => (
                                  <span key={voice} className="text-[10px] px-2 py-1 bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded">
                                    {voice}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Voice Registry Mappings */}
                        <div 
                          className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                              📋 Voice Registry - Personality Mappings
                            </p>
                            {Object.keys(voiceRegistry).length > 0 && (
                              <button
                                onClick={clearElevenLabsVoiceIds}
                                className="text-[10px] px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                                title="Clear old ElevenLabs voice IDs"
                              >
                                🗑️ Clear Old IDs
                              </button>
                            )}
                          </div>
                          
                          {Object.keys(voiceRegistry).length === 0 ? (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              No voices mapped yet. Start chatting with a personality to auto-map!
                            </p>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {Object.entries(voiceRegistry).map(([personalityId, voiceId]) => {
                                const personality = personalities?.find(p => p.id === personalityId);
                                const personalityName = personality?.name || personalityId.substring(0, 20);
                                const isElevenLabsId = voiceId.length > 15 && /^[a-zA-Z0-9]+$/.test(voiceId);
                                return (
                                  <div key={personalityId} className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                                    isElevenLabsId 
                                      ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700' 
                                      : 'bg-green-100 dark:bg-green-800/30'
                                  }`}>
                                    <span className={`font-medium truncate flex-1 ${
                                      isElevenLabsId 
                                        ? 'text-orange-800 dark:text-orange-300' 
                                        : 'text-green-800 dark:text-green-300'
                                    }`}>
                                      {personalityName}
                                    </span>
                                    <span className={`mx-2 ${
                                      isElevenLabsId 
                                        ? 'text-orange-600 dark:text-orange-400' 
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>→</span>
                                    <span className={`font-mono ${
                                      isElevenLabsId 
                                        ? 'text-orange-700 dark:text-orange-200 text-[8px]' 
                                        : 'text-green-700 dark:text-green-200'
                                    }`}>
                                      {isElevenLabsId ? `⚠️ ${voiceId.substring(0, 10)}...` : voiceId}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                            💡 Mappings are saved automatically when a personality uses TTS for the first time.
                          </p>
                        </div>

                        {/* Auto-Matching Guide */}
                        <div 
                          className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                            🔄 Auto-Matching Rules
                          </p>
                          <ul className="text-[10px] text-purple-600 dark:text-purple-400 space-y-1">
                            <li>• <strong>andrew</strong> → Prince Andrew, Duke of York</li>
                            <li>• <strong>jimmy</strong> → Jimmy Savile, Jim Savile</li>
                            <li>• <strong>katey</strong> → Katie Price, KP, Jordan</li>
                            <li>• <strong>shann</strong> → Karen Shannon, Shannon</li>
                            <li>• <strong>tony</strong> → Tony Blair, Blair</li>
                            <li>• <strong>yorkshire</strong> → Yorkshire Ripper, Peter Sutcliffe</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Global Emotion Controls */}
                  {(ttsConfig?.provider === TtsProvider.ELEVENLABS || 
                    ttsConfig?.provider === TtsProvider.AZURE || 
                    ttsConfig?.provider === TtsProvider.PLAYHT) && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <h4 className="font-semibold text-sm mb-3 text-blue-800 dark:text-blue-200">
                        🎭 Global Emotion Controls
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                            Default Emotion
                          </label>
                          <select
                            value={ttsConfig?.defaultEmotion || 'neutral'}
                            onChange={(e) => onTtsConfigChange({ defaultEmotion: e.target.value as any })}
                            className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded px-2 py-1 text-sm"
                          >
                            <option value="neutral">Neutral</option>
                            <option value="happy">Happy / Cheerful</option>
                            <option value="sad">Sad / Melancholic</option>
                            <option value="angry">Angry / Aggressive</option>
                            <option value="excited">Excited / Enthusiastic</option>
                            <option value="fearful">Fearful / Anxious</option>
                            <option value="surprised">Surprised</option>
                            <option value="disgusted">Disgusted / Unfriendly</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            This emotion applies to all personalities by default. Override per-personality in their individual settings.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                            Emotion Intensity: {((ttsConfig?.emotionIntensity ?? 0.7) * 100).toFixed(0)}%
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={ttsConfig?.emotionIntensity ?? 0.7}
                            onChange={(e) => onTtsConfigChange({ emotionIntensity: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            0% = subtle emotion, 100% = maximum emotional expression
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </>
          )}

          {activeTab === 'theme' && (
            <>
              {/* UI Colors */}
              <div className="px-6 pb-2 space-y-4">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Chat Colors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Input text color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onChatInputColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${chatInputColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set input text color to ${c}`}
                          title={`Set input text color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">AI response text color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onChatAiColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${chatAiColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set AI response text color to ${c}`}
                          title={`Set AI response text color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Chat window background color</label>
                  <div className="flex items-center gap-2">
                    {SWATCH_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onChatWindowBgColorChange(c)}
                        className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${chatWindowBgColor === c ? 'ring-2 ring-primary' : ''}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Set chat window background color to ${c}`}
                        title={`Set chat window background color to ${c}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={chatWindowBgColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(chatWindowBgColor) ? chatWindowBgColor : '#ffffff'}
                      onChange={(e) => onChatWindowBgColorChange(e.target.value)}
                      className="w-10 h-10 p-0 border border-light-border dark:border-base-600 rounded-md cursor-pointer"
                      aria-label="Choose a custom chat window background color"
                      title="Choose a custom chat window background color"
                    />
                  </div>
                </div>
              </div>

              {/* Chat Window Transparency */}
              <div className="px-6 pb-2 space-y-3">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Chat Transparency</h3>
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                    Window background transparency: <span className="font-mono">{Math.round((1 - chatWindowAlpha) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={1 - chatWindowAlpha}
                    onChange={(e) => onChatWindowAlphaChange(1 - parseFloat(e.target.value))}
                    className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
                    aria-label="Window background transparency"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
                    Message bubble transparency: <span className="font-mono">{Math.round((1 - chatMessageAlpha) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={1 - chatMessageAlpha}
                    onChange={(e) => onChatMessageAlphaChange(1 - parseFloat(e.target.value))}
                    className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
                    aria-label="Message bubble transparency"
                  />
                </div>
              </div>

              {/* CLI Colors */}
              <div className="px-6 pb-2 space-y-4">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">CLI Colors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">CLI font color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onCliFontColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${cliFontColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set CLI font color to ${c}`}
                          title={`Set CLI font color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">CLI background color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onCliBgColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${cliBgColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set CLI background color to ${c}`}
                          title={`Set CLI background color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Star Field Background */}
              <div className="px-6 pb-2 space-y-3">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Background Effects</h3>
                
                {/* Star Field Toggle */}
                <div className="flex items-center justify-between p-4 bg-light-panel dark:bg-base-800 rounded-lg border border-light-border dark:border-base-600">
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-gray-200 mb-1">
                      Grok Star Field
                    </label>
                    <p className="text-xs text-light-text-secondary dark:text-gray-400">
                      Animated star field with twinkling stars, nebulae, and parallax effect
                    </p>
                  </div>
                  <button
                    onClick={() => onStarFieldEnabledChange(!starFieldEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      starFieldEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label="Toggle star field background"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        starFieldEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Star Field Settings (shown when enabled) */}
                {starFieldEnabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                    {/* Star Count */}
                    <div className="p-3 bg-light-panel dark:bg-base-800/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-light-text dark:text-gray-200">
                          Star Density
                        </label>
                        <span className="text-xs text-light-text-secondary dark:text-gray-400 font-mono">
                          {(starFieldCount * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={starFieldCount}
                        onChange={(e) => onStarFieldCountChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-light-text-secondary dark:text-gray-500 mt-1">
                        <span>Fewer stars</span>
                        <span>More stars</span>
                      </div>
                    </div>

                    {/* Star Speed */}
                    <div className="p-3 bg-light-panel dark:bg-base-800/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-light-text dark:text-gray-200">
                          Star Speed
                        </label>
                        <span className="text-xs text-light-text-secondary dark:text-gray-400 font-mono">
                          {(starFieldSpeed * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={starFieldSpeed}
                        onChange={(e) => onStarFieldSpeedChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-light-text-secondary dark:text-gray-500 mt-1">
                        <span>Slower</span>
                        <span>Faster</span>
                      </div>
                    </div>

                    {/* Shooting Stars */}
                    <div className="flex items-center justify-between p-3 bg-light-panel dark:bg-base-800/50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-light-text dark:text-gray-200 mb-1">
                          Shooting Stars
                        </label>
                        <p className="text-xs text-light-text-secondary dark:text-gray-400">
                          Add occasional shooting stars streaking across the sky
                        </p>
                      </div>
                      <button
                        onClick={() => onShootingStarsEnabledChange(!shootingStarsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          shootingStarsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        aria-label="Toggle shooting stars"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            shootingStarsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Background Selection */}
              <div className="px-6 pb-2 space-y-3">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Desktop Background</h3>
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Select Background Image</label>
                  <select
                    value={desktopBackground}
                    onChange={(e) => onDesktopBackgroundChange(e.target.value)}
                    className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {AVAILABLE_BACKGROUNDS.map((bg) => (
                      <option key={bg.file} value={bg.file}>
                        {bg.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-light-text-secondary dark:text-gray-400 mt-1">
                    Choose from available background images for the desktop area
                  </p>
                </div>
              </div>

              {/* Personality Panel Colors */}
              <div className="px-6 pb-2 space-y-4">
                <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">Personality Panel Colors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Panel background color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onPersonalityPanelBgColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${personalityPanelBgColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set personality panel background color to ${c}`}
                          title={`Set personality panel background color to ${c}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={personalityPanelBgColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(personalityPanelBgColor) ? personalityPanelBgColor : '#ffffff'}
                        onChange={(e) => onPersonalityPanelBgColorChange(e.target.value)}
                        className="w-10 h-10 p-0 border border-light-border dark:border-base-600 rounded-md cursor-pointer"
                        aria-label="Choose a custom personality panel background color"
                        title="Choose a custom personality panel background color"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Panel border color</label>
                    <div className="flex items-center gap-2">
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onPersonalityPanelBorderColorChange(c)}
                          className={`w-8 h-8 rounded-md border border-light-border dark:border-base-600 hover:ring-2 hover:ring-primary transition-shadow ${personalityPanelBorderColor === c ? 'ring-2 ring-primary' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Set personality panel border color to ${c}`}
                          title={`Set personality panel border color to ${c}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={personalityPanelBorderColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(personalityPanelBorderColor) ? personalityPanelBorderColor : '#ffffff'}
                        onChange={(e) => onPersonalityPanelBorderColorChange(e.target.value)}
                        className="w-10 h-10 p-0 border border-light-border dark:border-base-600 rounded-md cursor-pointer"
                        aria-label="Choose a custom personality panel border color"
                        title="Choose a custom personality panel border color"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-light-text-secondary dark:text-gray-400">
                  Customize the appearance of the left personality panel frame and borders
                </p>
              </div>

              {/* Reset Colors */}
              <div className="px-6 pb-2 flex justify-end">
                <button
                  onClick={onResetThemeColors}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  title="Reset all theme settings: colors, background, star field, and transparency to defaults"
                >
                  Reset All Theme Settings
                </button>
              </div>
            </>
          )}

          {activeTab === 'environment' && (
            <>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-light-text dark:text-gray-100">🌍 Environment Settings</h2>
                <p className="text-sm text-light-text-secondary dark:text-gray-400">Configure prison gangs and poverty simulation systems</p>
                
                {/* Environment subsection tabs */}
                <div className="flex gap-2 border-b border-light-border dark:border-base-600">
                  <button
                    onClick={() => setEnvironmentSubTab('gangs')}
                    className={`px-4 py-2 font-semibold transition-colors ${
                      environmentSubTab === 'gangs' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200'
                    }`}
                  >
                    🔒 Prison Gangs
                  </button>
                  <button
                    onClick={() => setEnvironmentSubTab('poverty')}
                    className={`px-4 py-2 font-semibold transition-colors ${
                      environmentSubTab === 'poverty' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200'
                    }`}
                  >
                    💸 Poverty Simulation
                  </button>
                </div>

                {/* Gangs Subsection */}
                {environmentSubTab === 'gangs' && (
                  <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-bold text-light-text dark:text-gray-200 mb-2">🔒 Prison Gangs Simulation</h3>
                  <p className="text-sm text-light-text-secondary dark:text-gray-400 mb-4">
                    Simulate a prison environment with gang dynamics, violence, territory wars, and loyalty systems
                  </p>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-start gap-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                  <input
                    type="checkbox"
                    checked={experimentalSettings.gangsEnabled}
                    onChange={(e) => {
                      const v = e.target.checked;
                      if (v) {
                            // Attempting to enable Gangs
                        if (experimentalSettings.povertyEnabled) {
                          // Poverty is active - cannot enable Gangs
                          alert('⚠️ Poverty Simulation is currently active.\n\nYou must DISABLE Poverty Simulation first before starting Prison Gangs.\n\nClick the Poverty tab and toggle OFF to stop the simulation.');
                          return;
                        }
                        
                        const hasExistingGangs = experimentalSettings.gangsConfig && 
                          Object.keys(experimentalSettings.gangsConfig.gangs || {}).length > 0;
                        
                        if (hasExistingGangs) {
                          onExperimentalSettingsChange({ 
                            ...experimentalSettings, 
                                gangsEnabled: true
                          });
                        } else {
                          let currentConfig = experimentalSettings.gangsConfig 
                            ? { ...experimentalSettings.gangsConfig } 
                            : gangService.getDefaultConfig();
                          
                          const initializedConfig = gangService.initializeGangs(currentConfig);
                          
                          onExperimentalSettingsChange({ 
                            ...experimentalSettings, 
                            gangsEnabled: true,
                                gangsConfig: initializedConfig
                          });
                        }
                      } else {
                            // Disabling Gangs
                        onExperimentalSettingsChange({ 
                          ...experimentalSettings, 
                          gangsEnabled: false
                        });
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label className="text-light-text dark:text-gray-300 cursor-pointer font-semibold">
                      Enable Prison Gangs Simulation
                    </label>
                    <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">
                      Activate the complete prison gang system with territory control, violence, recruitment, and death mechanics
                    </p>
                  </div>
                </div>

                    {experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig && (
                    <div className="space-y-4 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                      <h4 className="font-semibold text-sm text-primary">Prison Environment Parameters</h4>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-light-text dark:text-gray-300 text-sm">Number of Gangs</label>
                          <span className="text-primary font-mono text-xs">{Math.round(experimentalSettings.gangsConfig.numberOfGangs)}</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={6}
                          step={1}
                          value={experimentalSettings.gangsConfig.numberOfGangs}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const newNumberOfGangs = Math.round(v);
                            
                            if (newNumberOfGangs !== experimentalSettings.gangsConfig.numberOfGangs) {
                              const newConfig = { 
                                ...experimentalSettings.gangsConfig, 
                                numberOfGangs: newNumberOfGangs 
                              };
                              const reinitializedConfig = gangService.initializeGangs(newConfig);
                              handleUserSettingsChange({ ...experimentalSettings, gangsConfig: reinitializedConfig });
                            }
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Number of competing gangs in the prison</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-light-text dark:text-gray-300 text-sm">Prison Environment Intensity</label>
                          <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.prisonEnvironmentIntensity.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={experimentalSettings.gangsConfig.prisonEnvironmentIntensity}
                          onChange={(e) => {
                            const intensity = parseFloat(e.target.value);
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: gangService.applyEnvironmentParameters(
                                experimentalSettings.gangsConfig,
                                { prisonEnvironmentIntensity: intensity }
                              )
                            });
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">0 = minimum security, 1 = maximum security hell</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-light-text dark:text-gray-300 text-sm">Violence Frequency</label>
                          <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.violenceFrequency.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={experimentalSettings.gangsConfig.violenceFrequency}
                          onChange={(e) => {
                            const violence = parseFloat(e.target.value);
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: gangService.applyEnvironmentParameters(
                                experimentalSettings.gangsConfig,
                                { violenceFrequency: violence }
                              )
                            });
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">0 = peaceful, 1 = constant violence</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-light-text dark:text-gray-300 text-sm">Loyalty Decay Rate</label>
                          <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.loyaltyDecayRate.toFixed(3)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.1}
                          step={0.005}
                          value={experimentalSettings.gangsConfig.loyaltyDecayRate}
                          onChange={(e) => {
                            const decay = parseFloat(e.target.value);
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: gangService.applyEnvironmentParameters(
                                experimentalSettings.gangsConfig,
                                { loyaltyDecayRate: decay }
                              )
                            });
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How fast loyalty decreases without reinforcement</p>
                      </div>
                    </div>
                    )}

                    {experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig && (
                    <div className="space-y-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                      <h4 className="font-semibold text-sm text-primary">Gang Features</h4>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.recruitmentEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                recruitmentEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Recruitment</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.territoryWarEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                territoryWarEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Territory Wars</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.independentPersonalitiesAllowed}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                independentPersonalitiesAllowed: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Allow Independent Personalities</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.solitaryConfinementEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                solitaryConfinementEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Solitary Confinement</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.deathEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                deathEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Death Mechanics</label>
                      </div>

                      {experimentalSettings.gangsConfig.deathEnabled && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Death Probability</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.gangsConfig.deathProbability * 100).toFixed(1)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={experimentalSettings.gangsConfig.deathProbability}
                            onChange={(e) => {
                              const probability = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                gangsConfig: {
                                  ...experimentalSettings.gangsConfig,
                                  deathProbability: probability
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Chance that violence results in death</p>
                        </div>
                      )}
                    </div>
                    )}

                    {experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig && (
                    <div className="space-y-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                      <h4 className="font-semibold text-sm text-primary">⚰️ Death Settings</h4>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.deathEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                deathEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm font-semibold">Enable Death Mechanics</label>
                      </div>

                      {experimentalSettings.gangsConfig.deathEnabled && (
                        <>
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-xs text-red-700 dark:text-red-300">
                              <strong>⚠️ WARNING:</strong> This enables permanent death of gang members during extreme violence. Members can be killed and removed from the system.
                            </p>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-light-text dark:text-gray-300 text-sm">Death Probability</label>
                              <span className="text-primary font-mono text-xs">{(experimentalSettings.gangsConfig.deathProbability * 100).toFixed(1)}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={experimentalSettings.gangsConfig.deathProbability}
                              onChange={(e) => {
                                const probability = parseFloat(e.target.value);
                                handleUserSettingsChange({
                                  ...experimentalSettings,
                                  gangsConfig: {
                                    ...experimentalSettings.gangsConfig,
                                    deathProbability: probability
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">0% = very rare, 100% = almost guaranteed from violence</p>
                          </div>

                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs">
                            <p className="text-blue-700 dark:text-blue-300">
                              <strong>💡 Death Factors:</strong>
                            </p>
                            <ul className="text-blue-600 dark:text-blue-400 mt-1 ml-2 space-y-1 list-disc list-inside text-xs">
                              <li>Weapons multiply death chance 3-4x</li>
                              <li>High violence stats increase chance</li>
                              <li>Death risk modifier (1.0-3.0x)</li>
                              <li>Gang leaders have higher risk</li>
                              <li>Gang collapses when only leader remains</li>
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                    )}

                    {experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig && (
                    <div className="space-y-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                      <h4 className="font-semibold text-sm text-primary">Weapons System</h4>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.weaponsEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                weaponsEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Weapons</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.guardBriberyEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                guardBriberyEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Guard Bribery</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.weaponStealingEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                weaponStealingEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Weapon Stealing</label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.weaponCraftingEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                weaponCraftingEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Weapon Crafting</label>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-light-text dark:text-gray-300 text-sm">Rival Hostility Multiplier</label>
                          <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.rivalHostilityMultiplier.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={experimentalSettings.gangsConfig.rivalHostilityMultiplier}
                          onChange={(e) => {
                            const multiplier = parseFloat(e.target.value);
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                rivalHostilityMultiplier: multiplier
                              }
                            });
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Violence and abuse multiplier toward rival gangs</p>
                      </div>
                    </div>
                    )}

                    {experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig && (
                    <div className="space-y-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                      <h4 className="font-semibold text-sm text-primary">Drug Economy System</h4>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={experimentalSettings.gangsConfig.drugEconomyEnabled}
                          onChange={(e) => {
                            handleUserSettingsChange({
                              ...experimentalSettings,
                              gangsConfig: {
                                ...experimentalSettings.gangsConfig,
                                drugEconomyEnabled: e.target.checked
                              }
                            });
                          }}
                        />
                        <label className="text-light-text dark:text-gray-300 text-sm">Enable Drug Economy</label>
                      </div>

                      {experimentalSettings.gangsConfig.drugEconomyEnabled && (
                        <>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-light-text dark:text-gray-300 text-sm">Drug Smuggling Frequency</label>
                              <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.drugSmugglingFrequency.toFixed(2)}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={experimentalSettings.gangsConfig.drugSmugglingFrequency}
                              onChange={(e) => {
                                const frequency = parseFloat(e.target.value);
                                handleUserSettingsChange({
                                  ...experimentalSettings,
                                  gangsConfig: {
                                    ...experimentalSettings.gangsConfig,
                                    drugSmugglingFrequency: frequency
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How often drugs are smuggled in</p>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-light-text dark:text-gray-300 text-sm">Drug Dealing Frequency</label>
                              <span className="text-primary font-mono text-xs">{experimentalSettings.gangsConfig.drugDealingFrequency.toFixed(2)}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={experimentalSettings.gangsConfig.drugDealingFrequency}
                              onChange={(e) => {
                                const frequency = parseFloat(e.target.value);
                                handleUserSettingsChange({
                                  ...experimentalSettings,
                                  gangsConfig: {
                                    ...experimentalSettings.gangsConfig,
                                    drugDealingFrequency: frequency
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How often deals happen</p>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-light-text dark:text-gray-300 text-sm">Drug Detection Risk</label>
                              <span className="text-primary font-mono text-xs">{(experimentalSettings.gangsConfig.drugDetectionRisk * 100).toFixed(1)}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={experimentalSettings.gangsConfig.drugDetectionRisk}
                              onChange={(e) => {
                                const risk = parseFloat(e.target.value);
                                handleUserSettingsChange({
                                  ...experimentalSettings,
                                  gangsConfig: {
                                    ...experimentalSettings.gangsConfig,
                                    drugDetectionRisk: risk
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Chance of getting caught with drugs</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={experimentalSettings.gangsConfig.itemStealingEnabled}
                              onChange={(e) => {
                                handleUserSettingsChange({
                                  ...experimentalSettings,
                                  gangsConfig: {
                                    ...experimentalSettings.gangsConfig,
                                    itemStealingEnabled: e.target.checked
                                  }
                                });
                              }}
                            />
                            <label className="text-light-text dark:text-gray-300 text-sm">Enable Item Stealing</label>
                          </div>
                        </>
                      )}
                    </div>
                    )}
                      </div>
                )}

                {/* Poverty Subsection */}
                {environmentSubTab === 'poverty' && (
                  <div className="space-y-4 mt-4">
                      <div>
                      <h3 className="text-lg font-bold text-light-text dark:text-gray-200 mb-2">💸 Poverty Simulation</h3>
                      <p className="text-sm text-light-text-secondary dark:text-gray-400 mb-4">
                        Model the social, psychological, and economic pressures of chronic poverty with welfare systems, employment challenges, and health crises.
                        </p>
                      </div>

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-start gap-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                        <input
                          type="checkbox"
                        checked={experimentalSettings.povertyEnabled}
                          onChange={(e) => {
                            const v = e.target.checked;
                          if (v) {
                            // Attempting to enable Poverty
                            if (experimentalSettings.gangsEnabled) {
                              // Gangs is active - cannot enable Poverty
                              alert('⚠️ Prison Gangs Simulation is currently active.\n\nYou must DISABLE Prison Gangs first before starting Poverty Simulation.\n\nClick the Gangs tab and toggle OFF to stop the simulation.');
                              return;
                            }
                            
                            const config = povertyService.getDefaultConfig();
                            onExperimentalSettingsChange({ 
                              ...experimentalSettings, 
                              povertyEnabled: true,
                              povertyConfig: config
                            });
                          } else {
                            // Disabling Poverty
                            onExperimentalSettingsChange({ 
                                  ...experimentalSettings, 
                              povertyEnabled: false,
                              povertyConfig: experimentalSettings.povertyConfig
                            });
                          }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                        <label className="text-light-text dark:text-gray-300 cursor-pointer font-semibold">
                          Enable Poverty Simulation
                          </label>
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">
                          Activate poverty system with welfare bureaucracy, employment, housing crises, and psychological stress
                          </p>
                        </div>
                      </div>

                    {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                          💡 Social Simulation Feature
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          This feature realistically models chronic poverty including welfare systems, employment challenges, housing insecurity, 
                          addiction risks, and psychological impact. Includes time-of-day risk factors and community support mechanics.
                        </p>
                      </div>
                    )}

                    {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && (
                      <div className="space-y-4 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                        <h4 className="font-semibold text-sm text-primary">Economic Parameters</h4>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Simulation Intensity</label>
                            <span className="text-primary font-mono text-xs">{experimentalSettings.povertyConfig.simulationIntensity.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={experimentalSettings.povertyConfig.simulationIntensity}
                            onChange={(e) => {
                              const intensity = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  simulationIntensity: intensity
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">0 = mild hardship, 1 = extreme poverty conditions</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Base Welfare Amount (£/week)</label>
                            <span className="text-primary font-mono text-xs">£{experimentalSettings.povertyConfig.baseWelfareAmount}</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            step={5}
                            value={experimentalSettings.povertyConfig.baseWelfareAmount}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  baseWelfareAmount: amount
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Weekly DWP benefit amount</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">PIP Base Amount (£/month)</label>
                            <span className="text-primary font-mono text-xs">£{experimentalSettings.povertyConfig.pipBaseAmount}</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={80}
                            step={5}
                            value={experimentalSettings.povertyConfig.pipBaseAmount}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  pipBaseAmount: amount
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Monthly Personal Independence Payment</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Job Finding Rate</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.povertyConfig.jobFindRate * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.05}
                            value={experimentalSettings.povertyConfig.jobFindRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  jobFindRate: rate
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Probability of finding temporary work</p>
                        </div>
                      </div>
                    )}

                    {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && (
                      <div className="space-y-4 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                        <h4 className="font-semibold text-sm text-primary">Psychological & Health Parameters</h4>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Stress Accumulation Rate</label>
                            <span className="text-primary font-mono text-xs">{experimentalSettings.povertyConfig.stressAccumulationRate.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.2}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.stressAccumulationRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  stressAccumulationRate: rate
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How fast psychological stress increases</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Mental Health Decline Rate</label>
                            <span className="text-primary font-mono text-xs">{experimentalSettings.povertyConfig.mentalHealthDeclineRate.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.1}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.mentalHealthDeclineRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  mentalHealthDeclineRate: rate
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Rate of psychological stability decline</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Alcohol Addiction Rate</label>
                            <span className="text-primary font-mono text-xs">{experimentalSettings.povertyConfig.alcoholAddictionRate.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.1}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.alcoholAddictionRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  alcoholAddictionRate: rate
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Addiction progression rate under stress</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Recovery Rate</label>
                            <span className="text-primary font-mono text-xs">{experimentalSettings.povertyConfig.recoveryRate.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.1}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.recoveryRate}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  recoveryRate: rate
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How fast people recover with support</p>
                        </div>
                      </div>
                    )}

                    {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && (
                      <div className="space-y-4 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                        <h4 className="font-semibold text-sm text-primary">Risk & Safety Parameters</h4>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Base Assault Risk</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.povertyConfig.assaultRiskBase * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.3}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.assaultRiskBase}
                            onChange={(e) => {
                              const risk = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  assaultRiskBase: risk
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Base probability of physical assault</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Harassment Frequency</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.povertyConfig.harassmentFrequency * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.5}
                            step={0.05}
                            value={experimentalSettings.povertyConfig.harassmentFrequency}
                            onChange={(e) => {
                              const frequency = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  harassmentFrequency: frequency
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How often harassment occurs</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Police Visit Frequency</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.povertyConfig.policeVisitFrequency * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.2}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.policeVisitFrequency}
                            onChange={(e) => {
                              const frequency = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  policeVisitFrequency: frequency
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How often police check up on individuals</p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-light-text dark:text-gray-300 text-sm">Eviction Frequency</label>
                            <span className="text-primary font-mono text-xs">{(experimentalSettings.povertyConfig.evictionFrequency * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.1}
                            step={0.01}
                            value={experimentalSettings.povertyConfig.evictionFrequency}
                            onChange={(e) => {
                              const frequency = parseFloat(e.target.value);
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  evictionFrequency: frequency
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">How often evictions occur</p>
                        </div>
                      </div>
                    )}

                    {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && (
                      <div className="space-y-3 p-4 bg-black/5 dark:bg-base-900 rounded-lg border border-light-border dark:border-base-700">
                        <h4 className="font-semibold text-sm text-primary">System Features</h4>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={experimentalSettings.povertyConfig.housingCrisisEnabled}
                            onChange={(e) => {
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  housingCrisisEnabled: e.target.checked
                                }
                              });
                            }}
                          />
                          <label className="text-light-text dark:text-gray-300 text-sm">Housing Crisis System</label>
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 ml-6">Enable evictions and housing instability</p>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={experimentalSettings.povertyConfig.timeOfDayFactor}
                            onChange={(e) => {
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  timeOfDayFactor: e.target.checked
                                }
                              });
                            }}
                          />
                          <label className="text-light-text dark:text-gray-300 text-sm">Time-of-Day Risk Factors</label>
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 ml-6">Different risks by time of day (night more dangerous)</p>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={experimentalSettings.povertyConfig.familySupportEnabled}
                            onChange={(e) => {
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  familySupportEnabled: e.target.checked
                                }
                              });
                            }}
                          />
                          <label className="text-light-text dark:text-gray-300 text-sm">Family Support System</label>
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 ml-6">Enable family and community support networks</p>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={experimentalSettings.povertyConfig.safePlacesAvailable}
                            onChange={(e) => {
                              handleUserSettingsChange({
                                ...experimentalSettings,
                                povertyConfig: {
                                  ...experimentalSettings.povertyConfig,
                                  safePlacesAvailable: e.target.checked
                                }
                              });
                            }}
                          />
                          <label className="text-light-text dark:text-gray-300 text-sm">Safe Places Available</label>
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 ml-6">Enable safe spaces and protective environments</p>
                      </div>
                    )}

                    {experimentalSettings.povertyEnabled && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>ℹ️ Environment Exclusivity:</strong> Poverty Simulation is active. Prison Gangs mode has been disabled. Only one environment can be active at a time.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'experimental' && (
            <ExperimentalSettingsPanel
              settings={experimentalSettings}
              onUpdate={onExperimentalSettingsChange}
              activePersonalities={personalities}
            />
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-light-text dark:text-gray-100 mb-2">Virtual Minds Framework</h3>
                <p className="text-lg font-semibold text-primary mb-4">Version 24</p>
              </div>

              <div className="space-y-4">
                <div className="bg-light-bg dark:bg-base-900 p-4 rounded-md border border-light-border dark:border-base-700">
                  <h4 className="text-md font-semibold text-light-text dark:text-gray-200 mb-2">About the Framework</h4>
                  <p className="text-sm text-light-text-secondary dark:text-gray-400 leading-relaxed">
                    Virtual Minds Framework is an advanced AI personality simulation platform that enables the creation, 
                    management, and simulation of complex AI personalities with autonomous conversations, dynamic social 
                    interactions, and voice synthesis capabilities. The framework supports unlimited psychological testing, 
                    behavioral analysis, and interactive scenario simulations.
                  </p>
                </div>

                <div className="bg-light-bg dark:bg-base-900 p-4 rounded-md border border-light-border dark:border-base-700">
                  <h4 className="text-md font-semibold text-light-text dark:text-gray-200 mb-2">Developer Information</h4>
                  <p className="text-sm text-light-text-secondary dark:text-gray-400">
                    <span className="font-mono text-primary">franks-apps.com</span>
                  </p>
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => {
                      alert('Checking for updates...\n\nNo updates available at this time.\n\nYou are running the latest version (V24).');
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors font-semibold"
                  >
                    🔍 Search for Updates
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 bg-light-bg dark:bg-base-900 border-t border-light-border dark:border-base-700 flex justify-center rounded-b-lg mt-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};






