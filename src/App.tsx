import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Personality, ChatMessage, CliOutput, ModelConfig, UserData, WindowState, TtsConfig, ExperimentalSettings } from './types';
import { MessageAuthor, CliOutputType, ApiProvider, WindowStatus, TtsProvider, TtsEmotion } from './types';
import { getDefaultExperimentalSettings } from './components/ExperimentalSettingsPanel';
import { gangService } from './services/gangService';
import { gangSoundService } from './services/gangSoundService';
import { povertyService } from './services/povertyService';
import { Header } from './components/Header';
import { PersonalityPanel } from './components/PersonalityPanel';
import { Cli } from './components/Cli';
import { SettingsModal } from './components/SettingsModal';
import { AdminDebugWindow, type DebugEvent } from './components/AdminDebugWindow';
import { GangDebugWindow, type GangEvent } from './components/GangDebugWindow';
import { PovertyDebugWindow, type PovertyEventType } from './components/PovertyDebugWindow';
import { ApiDebugWindow } from './components/ApiDebugWindow';
import { CreatePersonalityModal } from './components/CreatePersonalityModal';
import { DiscoverModal } from './components/DiscoverModal';
import { DraggableWindow } from './components/DraggableWindow';
import { Taskbar } from './components/Taskbar';
import { PersonalityDetailsModal } from './components/PersonalityDetailsModal';
import { PersonalityLoadModal } from './components/PersonalityLoadModal';
import { PersonalitySlotsModal } from './components/PersonalitySlotsModal';
import { HiddenIdentitiesGame } from './components/HiddenIdentitiesGame';
import { ChessGameWindow } from './components/ChessGameWindow';
import { CelebrityGuessGame } from './components/CelebrityGuessGame';
import { celebrityGuessService } from './services/celebrityGuessService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { generateResponse as generateGeminiResponse, type GeminiResponse } from './services/geminiService';
import { generateResponse as generateOpenAiResponse, getAvailableModels, type OpenAiResponse } from './services/openaiService';
import { claudeCliService, type ClaudeControlContext } from './services/claudeCliService';
import { localModelService, type LocalModelResponse } from './services/localModelService';
import { createChatCompletion, formatChat } from './services/llamaCppService';
import { saveLmStudioUrl, getSavedLmStudioUrl, getCurrentBaseUrl, generateResponse as generateLmStudioResponse, testConnection as testLmStudioConnection } from './services/lmStudioService';
import * as userService from './services/userService';
import * as personalityService from './services/personalityService';
import * as userProfileService from './services/userProfileService';
import * as ttsService from './services/ttsService';
import { updateApiUsage, formatCost, formatTokenCount } from './services/costTrackingService';
import { apiKeyService } from './services/apiKeyService';
import { validateAllKeys } from './services/apiKeyValidationService';
import { assignVoiceIdToPersonality } from './services/voiceMappingService';
import { voiceIdRegistry } from './services/voiceIdRegistryService';
import { sanitizeCliCommandForDisplay, findClosestCommand } from './services/cliCommandUtils';
import { documentationService } from './services/documentationService';
import { DEFAULT_MODEL, CLI_COMMANDS, HELP_MESSAGE, DEFAULT_PROVIDER, DEFAULT_CONFIG, AVAILABLE_MODELS, THEME_STORAGE_KEY, STARFIELD_ENABLED_STORAGE_KEY, STARFIELD_COUNT_STORAGE_KEY, STARFIELD_SPEED_STORAGE_KEY, SHOOTING_STARS_ENABLED_STORAGE_KEY, CLI_SHORTCUTS, TTS_PROVIDER_STORAGE_KEY, ELEVENLABS_API_KEY_STORAGE_KEY, OPENAI_TTS_API_KEY_STORAGE_KEY, GEMINI_TTS_API_KEY_STORAGE_KEY, GLOBAL_TTS_ENABLED_STORAGE_KEY, EXPORT_PATH_STORAGE_KEY, DEFAULT_EXPORT_PATH, OPENAI_CHAT_API_KEY_STORAGE_KEY, GEMINI_API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY, CURRENT_MODEL_STORAGE_KEY, CURRENT_LOCAL_MODEL_STORAGE_KEY, CLI_SHADOW_ENABLED_STORAGE_KEY, CHAT_INPUT_COLOR_STORAGE_KEY, CHAT_AI_COLOR_STORAGE_KEY, CLI_FONT_COLOR_STORAGE_KEY, CLI_BG_COLOR_STORAGE_KEY, CHAT_WINDOW_BG_COLOR_STORAGE_KEY, CHAT_WINDOW_ALPHA_STORAGE_KEY, CHAT_MESSAGE_ALPHA_STORAGE_KEY, LINK_ALL_ON_STARTUP_STORAGE_KEY, MODEL_CONFIG_STORAGE_KEY, PERSONALITY_SLOTS_STORAGE_KEY, DESKTOP_BACKGROUND_STORAGE_KEY, PERSONALITY_PANEL_BG_COLOR_STORAGE_KEY, PERSONALITY_PANEL_BORDER_COLOR_STORAGE_KEY, PERSONALITY_PANEL_FONT_COLOR_STORAGE_KEY, AVAILABLE_BACKGROUNDS } from './constants';
import { CpuChipIcon } from './components/icons/CpuChipIcon';
import { StarField } from './components/StarField';

// Resolve background images at build-time so they work in production (Render)
const BACKGROUND_URLS = Object.fromEntries(
  AVAILABLE_BACKGROUNDS.map(bg => [
    bg.file,
    new URL(`./components/images/${bg.file}`, import.meta.url).href
  ])
);
const GANGMODE_BACKGROUND_URL = new URL('./components/images/gangmode.png', import.meta.url).href;
const GANGBACKS_URL = new URL('./components/images/gangbacks.jpg', import.meta.url).href;

declare const JSZip: any;

// UUID generation utility with fallback for older browsers
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type MoodType = string;

const App: React.FC = () => {
  const [allPersonalities, setAllPersonalities] = useState<Personality[]>([]);
  const [activePersonalities, setActivePersonalities] = useState<Personality[]>([]);
  const [cliHistory, setCliHistory] = useState<CliOutput[]>([]);
  
  const [apiProvider, setApiProvider] = useState<ApiProvider>(DEFAULT_PROVIDER);
  const [openAiApiKey, setOpenAiApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [claudeApiKey, setClaudeApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [modelConfig, setModelConfig] = useState<Required<ModelConfig>>(DEFAULT_CONFIG);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [currentLocalModel, setCurrentLocalModel] = useState<string | null>(null);
  const [availableModelsForCli, setAvailableModelsForCli] = useState<string[]>([]);
  const [selectedConversationPersonalities, setSelectedConversationPersonalities] = useState<Personality[]>([]);
  const [conversationLength, setConversationLength] = useState<'short' | 'medium' | 'long'>('short');
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [shouldSkipToNext, setShouldSkipToNext] = useState<boolean>(false);
  const [currentConversationTopic, setCurrentConversationTopic] = useState<string | null>(null);

  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(TtsProvider.BROWSER);
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [openaiTtsApiKey, setOpenaiTtsApiKey] = useState('');
  const [geminiTtsApiKey, setGeminiTtsApiKey] = useState('');
  const [azureTtsApiKey, setAzureTtsApiKey] = useState('');
  const [playhtApiKey, setPlayhtApiKey] = useState('');
  const [playhtUserId, setPlayhtUserId] = useState('');
  const [defaultEmotion, setDefaultEmotion] = useState<TtsEmotion>('neutral' as TtsEmotion);
  const [emotionIntensity, setEmotionIntensity] = useState<number>(0.7);
  const [exportPath, setExportPath] = useState<string>(DEFAULT_EXPORT_PATH);

  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'ai' | 'tts' | 'theme' | 'gangs' | 'experimental'>('ai');
  const [isDiscoverOpen, setDiscoverOpen] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null); // windowId that is loading
  const [linkAllOnStartup, setLinkAllOnStartup] = useState(false);

  const [users, setUsers] = useState<Record<string, UserData>>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [lastLoggedInUser, setLastLoggedInUser] = useState<string | null>(null);
  const [sessionHistories, setSessionHistories] = useState<Record<string, ChatMessage[]>>({});
  const [claudeCliHistory, setClaudeCliHistory] = useState<ChatMessage[]>([]);

  const [windows, setWindows] = useState<WindowState[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [starFieldEnabled, setStarFieldEnabled] = useState<boolean>(false);
  const [starFieldCount, setStarFieldCount] = useState<number>(1.0); // 0.5 - 2.0
  const [starFieldSpeed, setStarFieldSpeed] = useState<number>(1.0); // 0.5 - 3.0
  const [shootingStarsEnabled, setShootingStarsEnabled] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  const [cliFocusedPersonalityId, setCliFocusedPersonalityId] = useState<string | null>(null);
  const [isLlmConversationMode, setIsLlmConversationMode] = useState<boolean>(false);
  const [viewingDetailsForId, setViewingDetailsForId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null); // Track pending quit/exit confirmations
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  const [globalTtsEnabled, setGlobalTtsEnabled] = useState<boolean>(true);
  const [globalTtsSpeed, setGlobalTtsSpeed] = useState<number>(1.0);
  const [cliShadowEnabled, setCliShadowEnabled] = useState<boolean>(false);
  // Suppress showing saved chat history once after login per personality
  const [suppressHistory, setSuppressHistory] = useState<Record<string, boolean>>({});
  
  const [cliHeight, setCliHeight] = useState(256); // h-64
  const cliHeightRef = useRef(cliHeight);
  const cliDragStateRef = useRef<{ isDragging: boolean; startY: number; startHeight: number }>({
    isDragging: false,
    startY: 0,
    startHeight: 0
  });
  const povertyAutoStartedRef = useRef(false);
  
  useEffect(() => {
    cliHeightRef.current = cliHeight;
  }, [cliHeight]);

  // UI color and display settings
  const [chatInputColor, setChatInputColor] = useState<string>('');
  const [chatAiColor, setChatAiColor] = useState<string>('');
  const [chatWindowBgColor, setChatWindowBgColor] = useState<string>('');
  const [cliFontColor, setCliFontColor] = useState<string>('');
  const [cliBgColor, setCliBgColor] = useState<string>('');
  const [chatWindowAlpha, setChatWindowAlpha] = useState<number>(0.4);
  const [desktopBackground, setDesktopBackground] = useState<string>('background.png');
  const [personalityPanelBgColor, setPersonalityPanelBgColor] = useState<string>('');
  const [personalityPanelBorderColor, setPersonalityPanelBorderColor] = useState<string>('');
  const [personalityPanelFontColor, setPersonalityPanelFontColor] = useState<string>('');
  const [chatMessageAlpha, setChatMessageAlpha] = useState<number>(1.0);

  // Experimental settings for conversation behavior
  const [experimentalSettings, setExperimentalSettings] = useState<ExperimentalSettings>(() => {
    try {
      const saved = localStorage.getItem('experimental-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[STARTUP] Loaded gang settings from localStorage:', {
          gangsEnabled: parsed.gangsEnabled,
          weaponsEnabled: parsed.gangsConfig?.weaponsEnabled,
          deathEnabled: parsed.gangsConfig?.deathEnabled,
        });

        // Ensure gangsConfig is complete - merge with defaults if necessary
        if (parsed.gangsConfig) {
          const defaultGangsConfig = gangService.getDefaultConfig();
          const mergedGangsConfig = {
            ...defaultGangsConfig,
            ...parsed.gangsConfig
          };
          parsed.gangsConfig = mergedGangsConfig;
        }

        return parsed;
      }
    } catch (e) {
      console.error('Failed to load experimental settings:', e);
    }
    return getDefaultExperimentalSettings();
  });

  // Ref to access latest experimental settings without causing effect reruns
  const experimentalSettingsRef = useRef(experimentalSettings);
  useEffect(() => {
    experimentalSettingsRef.current = experimentalSettings;
  }, [experimentalSettings]);

  // Track active personalities for gang debug/event logging without recreating callbacks
  const activePersonalitiesRef = useRef(activePersonalities);
  const personalityNameRegistryRef = useRef<Record<string, string>>({});
  useEffect(() => {
    activePersonalitiesRef.current = activePersonalities;
    if (activePersonalities.length > 0) {
      personalityNameRegistryRef.current = {
        ...personalityNameRegistryRef.current,
        ...Object.fromEntries(activePersonalities.map(p => [p.id, p.name]))
      };
    }
  }, [activePersonalities]);

  // Ref to track if user is actively changing settings to prevent gang dynamics from overwriting
  const userSettingsChangeInProgressRef = useRef(false);
  const settingsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist experimental settings to localStorage (debounced to avoid spam)
  useEffect(() => {
    // Clear any existing timeout
    if (settingsSaveTimeoutRef.current) {
      clearTimeout(settingsSaveTimeoutRef.current);
    }
    
    settingsSaveTimeoutRef.current = setTimeout(() => {
      try {
        const settingsToSave = JSON.stringify(experimentalSettings);
        localStorage.setItem('experimental-settings', settingsToSave);
        console.log('[EXPERIMENTAL SETTINGS] Saved to localStorage - gangsEnabled:', experimentalSettings.gangsEnabled);
        if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
          console.log('[EXPERIMENTAL SETTINGS] Gang settings saved:', {
            numberOfGangs: experimentalSettings.gangsConfig.numberOfGangs,
            prisonIntensity: experimentalSettings.gangsConfig.prisonEnvironmentIntensity,
            violenceFrequency: experimentalSettings.gangsConfig.violenceFrequency,
            weaponsEnabled: experimentalSettings.gangsConfig.weaponsEnabled,
            deathEnabled: experimentalSettings.gangsConfig.deathEnabled,
            rivalHostility: experimentalSettings.gangsConfig.rivalHostilityMultiplier,
          });
          
          // Verify what's actually in localStorage
          const savedBack = localStorage.getItem('experimental-settings');
          if (savedBack) {
            const parsed = JSON.parse(savedBack);

            // Check for settings mismatches
            const mismatches: string[] = [];
            if (parsed.gangsConfig?.prisonEnvironmentIntensity !== experimentalSettings.gangsConfig.prisonEnvironmentIntensity) {
              mismatches.push(`prisonEnvironmentIntensity: expected ${experimentalSettings.gangsConfig.prisonEnvironmentIntensity}, got ${parsed.gangsConfig?.prisonEnvironmentIntensity}`);
            }
            if (parsed.gangsConfig?.violenceFrequency !== experimentalSettings.gangsConfig.violenceFrequency) {
              mismatches.push(`violenceFrequency: expected ${experimentalSettings.gangsConfig.violenceFrequency}, got ${parsed.gangsConfig?.violenceFrequency}`);
            }
            if (parsed.gangsConfig?.loyaltyDecayRate !== experimentalSettings.gangsConfig.loyaltyDecayRate) {
              mismatches.push(`loyaltyDecayRate: expected ${experimentalSettings.gangsConfig.loyaltyDecayRate}, got ${parsed.gangsConfig?.loyaltyDecayRate}`);
            }
            if (parsed.gangsConfig?.deathEnabled !== experimentalSettings.gangsConfig.deathEnabled) {
              mismatches.push(`deathEnabled: expected ${experimentalSettings.gangsConfig.deathEnabled}, got ${parsed.gangsConfig?.deathEnabled}`);
            }

            if (mismatches.length > 0) {
              console.error('[EXPERIMENTAL SETTINGS] ⚠️ MISMATCHES found!', mismatches);
            } else {
              console.log('[EXPERIMENTAL SETTINGS] ✅ All gang settings saved correctly');
            }
          }
        }
        
        // Reset the user change flag after successful save
        userSettingsChangeInProgressRef.current = false;
      } catch (e) {
        console.error('Failed to save experimental settings:', e);
        userSettingsChangeInProgressRef.current = false;
      }
    }, 1000); // Optimized: 1 second debounce for better performance
    
    return () => {
      if (settingsSaveTimeoutRef.current) {
        clearTimeout(settingsSaveTimeoutRef.current);
      }
    };
  }, [experimentalSettings]);

  // Track death and weapons settings changes
  useEffect(() => {
    if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
      console.log('[GANGS SETTINGS WATCH] deathEnabled:', experimentalSettings.gangsConfig.deathEnabled, 'weaponsEnabled:', experimentalSettings.gangsConfig.weaponsEnabled);
    }
  }, [experimentalSettings.gangsConfig?.deathEnabled, experimentalSettings.gangsConfig?.weaponsEnabled]);

  // Initialize and clear gang data when gang mode changes
  useEffect(() => {
    if (!experimentalSettings.gangsEnabled) {
      console.log('[GANGS] Gang mode disabled - clearing all gang events, conversations, drug transactions, and killed tracking');
      setGangEvents([]);
      setGangConversations([]);
      setDrugTransactions([]);
      setKilledInGangSession(new Set()); // Clear killed tracking when gang game ends
    } else if (experimentalSettings.gangsConfig) {
      // Initialize gangs if not already initialized
      const hasGangs = Object.keys(experimentalSettings.gangsConfig.gangs || {}).length > 0;
      if (!hasGangs) {
        console.log('[GANGS] Gang mode enabled but gangs not initialized - initializing now');
        console.log('[GANGS] Current settings before init:', {
          weaponsEnabled: experimentalSettings.gangsConfig.weaponsEnabled,
          deathEnabled: experimentalSettings.gangsConfig.deathEnabled,
        });
        setExperimentalSettings(prev => {
          const initialized = gangService.initializeGangs(prev.gangsConfig!);
          console.log('[GANGS] After init. Settings:', {
            weaponsEnabled: initialized.weaponsEnabled,
            deathEnabled: initialized.deathEnabled,
          });
          return {
            ...prev,
            gangsConfig: initialized
          };
        });
      }
      
      // Initialize member status for active personalities if they don't have it
      const needsInitialization = activePersonalities.some(p => 
        !experimentalSettings.gangsConfig?.memberStatus[p.id]
      );
      
      if (needsInitialization && Object.keys(experimentalSettings.gangsConfig.gangs || {}).length > 0) {
        console.log('[GANGS] Some personalities need gang initialization');
        console.log('[GANGS] Settings before member init:', {
          weaponsEnabled: experimentalSettings.gangsConfig.weaponsEnabled,
          deathEnabled: experimentalSettings.gangsConfig.deathEnabled,
        });
        setExperimentalSettings(prev => {
          let config = { ...prev.gangsConfig! }; // Create a copy to avoid mutations
          const gangIds = Object.keys(config.gangs);
          
          activePersonalities.forEach((personality, index) => {
            if (!config.memberStatus[personality.id]) {
              // Assign to gangs in round-robin fashion
              const gangId = gangIds[index % gangIds.length];
              const isLeader = index < gangIds.length && !config.gangs[gangId].leaderId;
              console.log(`[GANGS] Assigning ${personality.name} to ${gangId}${isLeader ? ' as leader' : ''}`);
              config = gangService.assignToGang(config, personality.id, gangId, isLeader);

              // Track join event
              const gangName = config.gangs[gangId]?.name || gangId;
              addGangEvent('join', `🤝 ${personality.name} joined ${gangName}${isLeader ? ' as leader' : ''}`, [personality.id]);
            }
          });
          
          console.log('[GANGS] After member init. Settings:', {
            weaponsEnabled: config.weaponsEnabled,
            deathEnabled: config.deathEnabled,
          });
          
          return {
            ...prev,
            gangsConfig: config
          };
        });
      }
    }
  }, [experimentalSettings.gangsEnabled, activePersonalities.length]);

  // Handle poverty mode background switching
  useEffect(() => {
    if (experimentalSettings.povertyEnabled && desktopBackground !== 'poverty.png') {
      console.log('[POVERTY] Poverty mode enabled - switching background to poverty.png');
      setDesktopBackground('poverty.png');
      localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'poverty.png');
    } else if (!experimentalSettings.povertyEnabled && desktopBackground === 'poverty.png') {
      console.log('[POVERTY] Poverty mode disabled - switching background back to background.png');
      setDesktopBackground('background.png');
      localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'background.png');
    }
  }, [experimentalSettings.povertyEnabled]);

  // Keep central voice mapping tidy when personalities change
  useEffect(() => {
    try { voiceIdRegistry.pruneUnknown(activePersonalities); } catch {}
  }, [activePersonalities.length]);

  // Centralized handler to ensure UI toggle equals CLI 'sound on/off'
  const applyGlobalTts = useCallback((enabled: boolean) => {
    setGlobalTtsEnabled(enabled);
    localStorage.setItem(GLOBAL_TTS_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    if (!enabled) ttsService.cancel();
  }, []);

  const resetApplicationToInitialState = useCallback(() => {
    if (settingsSaveTimeoutRef.current) {
      clearTimeout(settingsSaveTimeoutRef.current);
      settingsSaveTimeoutRef.current = null;
    }
    userSettingsChangeInProgressRef.current = false;

    const defaultExperimentalSettings = getDefaultExperimentalSettings();
    setExperimentalSettings(defaultExperimentalSettings);
    experimentalSettingsRef.current = defaultExperimentalSettings;

    const defaultUsers: Record<string, UserData> = {
      admin: { username: 'admin', conversations: {} }
    };
    userService.saveUsers(defaultUsers);
    setUsers(defaultUsers);
    setCurrentUser(null);
    setLastLoggedInUser(null);
    setPendingConfirmation(null); // Reset any pending confirmations
    localStorage.removeItem('cmf_last_logged_in_user');
    localStorage.removeItem('criminal_minds_user_profiles');

    voiceIdRegistry.clearAll();
    personalityNameRegistryRef.current = {};

    const currentLocalModel = localModelService.getCurrentModel();
    if (currentLocalModel) {
      localModelService.unloadModel(currentLocalModel.id);
    }
    setCurrentLocalModel(null);
    localStorage.removeItem(CURRENT_LOCAL_MODEL_STORAGE_KEY);
    const availableLocalModels = localModelService.getAvailableModels();
    setLocalModels(availableLocalModels.map(model => model.name));

    setAllPersonalities(personalityService.getPersonalities());
    setActivePersonalities([]);
    activePersonalitiesRef.current = [];
    setSelectedConversationPersonalities([]);
    setConversingPersonalityIds([]);
    setSessionHistories({});
    setSuppressHistory({});
    setCurrentSpeakerId(null);
    setShouldSkipToNext(false);
    setCurrentConversationTopic(null);
    setCliFocusedPersonalityId(null);
    setViewingDetailsForId(null);
    setClaudeCliHistory([]);

    setWindows([]);
    setFocusedWindowId(null);
    setIsLoading(null);
    setSettingsOpen(false);
    setSettingsInitialTab('ai');
    setDiscoverOpen(false);
    setCreateOpen(false);
    setIsCliMaximized(false);
    setCliHeight(256);
    cliHeightRef.current = 256;
    cliDragStateRef.current = { isDragging: false, startY: 0, startHeight: 256 };
    setIsMobileMenuOpen(false);
    setLoadModalOpen(false);
    setSlotsOpen(false);
    setSlotsMode('load');
    setSaveCandidate(null);
    setSlotsCount(0);
    slotsCountCache.current = 0;
    localStorage.removeItem(PERSONALITY_SLOTS_STORAGE_KEY);

    setConversationLength('short');
    setAutonomousCommunicationEnabled(true);
    setCurrentMood('neutral');

    setIsGameWindowOpen(false);
    setIsCelebrityGameOpen(false);
    setCelebrityGameState(null);
    setChessOpponent(null);
    setChessHistory([]);

    setDebugOpen(false);
    setDebugEvents([]);
    setGangDebugOpen(false);
    setGangEvents([]);
    setGangConversations([]);
    setDrugTransactions([]);
    setKilledInGangSession(new Set());

    gangSoundService.setEnabled(true);
    gangSoundService.setVolume(0.5);

    setLinkAllOnStartup(false);
    localStorage.removeItem(LINK_ALL_ON_STARTUP_STORAGE_KEY);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
    setStarFieldEnabled(false);
    setStarFieldCount(1.0);
    setStarFieldSpeed(1.0);
    setShootingStarsEnabled(false);
    
    // Reset desktop background to default
    setDesktopBackground('background.png');
    localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'background.png');
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(STARFIELD_ENABLED_STORAGE_KEY);
    localStorage.removeItem(STARFIELD_COUNT_STORAGE_KEY);
    localStorage.removeItem(STARFIELD_SPEED_STORAGE_KEY);
    localStorage.removeItem(SHOOTING_STARS_ENABLED_STORAGE_KEY);

    setChatInputColor('');
    setChatAiColor('');
    setChatWindowBgColor('');
    setCliFontColor('');
    setCliBgColor('');
    setChatWindowAlpha(0.4);
    setChatMessageAlpha(1.0);
    localStorage.removeItem(CHAT_INPUT_COLOR_STORAGE_KEY);
    localStorage.removeItem(CHAT_AI_COLOR_STORAGE_KEY);
    localStorage.removeItem(CHAT_WINDOW_BG_COLOR_STORAGE_KEY);
    localStorage.removeItem(CLI_FONT_COLOR_STORAGE_KEY);
    localStorage.removeItem(CLI_BG_COLOR_STORAGE_KEY);
    localStorage.removeItem(CHAT_WINDOW_ALPHA_STORAGE_KEY);
    localStorage.removeItem(CHAT_MESSAGE_ALPHA_STORAGE_KEY);

    setCliShadowEnabled(false);
    localStorage.removeItem(CLI_SHADOW_ENABLED_STORAGE_KEY);

    setApiProvider(DEFAULT_PROVIDER);
    localStorage.setItem(API_PROVIDER_STORAGE_KEY, DEFAULT_PROVIDER);
    setModel(DEFAULT_MODEL);
    localStorage.setItem(CURRENT_MODEL_STORAGE_KEY, DEFAULT_MODEL);
    setAvailableModelsForCli([]);
    setModelConfig(DEFAULT_CONFIG);
    localStorage.removeItem(MODEL_CONFIG_STORAGE_KEY);

    setTtsProvider(TtsProvider.BROWSER);
    localStorage.setItem(TTS_PROVIDER_STORAGE_KEY, TtsProvider.BROWSER);
    setElevenLabsApiKey('');
    localStorage.removeItem(ELEVENLABS_API_KEY_STORAGE_KEY);
    setOpenaiTtsApiKey('');
    localStorage.removeItem(OPENAI_TTS_API_KEY_STORAGE_KEY);
    setGeminiTtsApiKey('');
    localStorage.removeItem(GEMINI_TTS_API_KEY_STORAGE_KEY);
    setAzureTtsApiKey('');
    localStorage.removeItem('azure-tts-api-key');
    setPlayhtApiKey('');
    localStorage.removeItem('playht-api-key');
    setPlayhtUserId('');
    localStorage.removeItem('playht-user-id');
    setDefaultEmotion('neutral' as TtsEmotion);
    localStorage.removeItem('tts-default-emotion');
    setEmotionIntensity(0.7);
    localStorage.removeItem('tts-emotion-intensity');
    setExportPath(DEFAULT_EXPORT_PATH);
    localStorage.setItem(EXPORT_PATH_STORAGE_KEY, DEFAULT_EXPORT_PATH);

    setGlobalTtsSpeed(1.0);
    ttsService.setGlobalTtsSpeed(1.0);
    localStorage.removeItem('globalTtsSpeed');

    setOpenAiApiKey('');
    localStorage.removeItem(OPENAI_CHAT_API_KEY_STORAGE_KEY);
    setGeminiApiKey('');
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    setClaudeApiKey('');

  }, []);

  // Load saved TTS speed from localStorage
  useEffect(() => {
    const savedSpeed = localStorage.getItem('globalTtsSpeed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (!isNaN(speed) && speed >= 0.5 && speed <= 2.0) {
        setGlobalTtsSpeed(speed);
        ttsService.setGlobalTtsSpeed(speed);
      }
    }
  }, []);

  const handleTtsSpeedChange = useCallback((speed: number) => {
    setGlobalTtsSpeed(speed);
    ttsService.setGlobalTtsSpeed(speed);
    localStorage.setItem('globalTtsSpeed', speed.toString());
  }, []);
  const [isCliMaximized, setIsCliMaximized] = useState(false);
  const cliResizerRef = useRef<HTMLDivElement>(null);
  const [isLoadModalOpen, setLoadModalOpen] = useState(false);
  const [conversingPersonalityIds, setConversingPersonalityIds] = useState<string[]>([]);
  const [autonomousCommunicationEnabled, setAutonomousCommunicationEnabled] = useState<boolean>(true);
  const [isGameWindowOpen, setIsGameWindowOpen] = useState(false);
  const [chessOpponent, setChessOpponent] = useState<Personality | null>(null);
  const [chessHistory, setChessHistory] = useState<ChatMessage[]>([]);
  const [isCelebrityGameOpen, setIsCelebrityGameOpen] = useState(false);
  const [celebrityGameState, setCelebrityGameState] = useState<any>(null);
  const [slotsCount, setSlotsCount] = useState<number>(0);

  // Optimized: Cache slots count to avoid frequent localStorage parsing
  const slotsCountCache = useRef(0);
  
  const countOccupiedSlots = useCallback(() => {
    try {
      const raw = localStorage.getItem(PERSONALITY_SLOTS_STORAGE_KEY);
      if (!raw) {
        slotsCountCache.current = 0;
        return 0;
      }
      const slots = JSON.parse(raw) as Array<Personality | null>;
      const count = slots.filter(slot => slot !== null).length;
      slotsCountCache.current = count;
      return count;
    } catch (e) {
      console.error('Failed to count personality slots:', e);
      return slotsCountCache.current; // Return cached value on error
    }
  }, []);

  // Update slots count when component mounts or when activePersonalities change
  useEffect(() => {
    setSlotsCount(countOccupiedSlots());
  }, [countOccupiedSlots, activePersonalities.length]);

  // Listen for storage changes to update slots count when slots are modified
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PERSONALITY_SLOTS_STORAGE_KEY) {
        setSlotsCount(countOccupiedSlots());
      }
    };
    
    // Custom event for same-window storage changes (since StorageEvent only fires across windows)
    const handleCustomStorageChange = () => {
      setSlotsCount(countOccupiedSlots());
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('personalitySlotsUpdated', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('personalitySlotsUpdated', handleCustomStorageChange);
    };
  }, [countOccupiedSlots]);

  // Handler to skip to next person in conversation
  const handleSkipToNext = useCallback(() => {
    if (conversingPersonalityIds.length > 0) {
      setShouldSkipToNext(true);
    }
  }, [conversingPersonalityIds.length]);

  // Admin Debug Window state
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const [apiDebugOpen, setApiDebugOpen] = useState<boolean>(false);
  const [apiDebugMinimized, setApiDebugMinimized] = useState<boolean>(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const addDebugEvent = React.useCallback((type: string, title: string, details?: string, data?: any) => {
    const ev: DebugEvent = { id: generateUUID(), time: new Date().toISOString(), type, title, details, data };
    setDebugEvents(prev => [...prev, ev]);
  }, []);

  // Gang Debug Window state
  const [gangDebugOpen, setGangDebugOpen] = useState<boolean>(false);
  const [gangEvents, setGangEvents] = useState<GangEvent[]>([]);
  const [gangConversations, setGangConversations] = useState<import('./components/GangDebugWindow').GangConversationMessage[]>([]);
  const [drugTransactions, setDrugTransactions] = useState<import('./components/GangDebugWindow').DrugTransaction[]>([]);
  const [killedInGangSession, setKilledInGangSession] = useState<Set<string>>(new Set()); // Track personalities killed during current gang session
  
  // Poverty Debug Window state
  const [povertyDebugOpen, setPovertyDebugOpen] = useState<boolean>(false);
  const [povertyEvents, setPovertyEvents] = useState<PovertyEventType[]>([]);
  const [povertyConversations, setPovertyConversations] = useState<Array<{
    id: string;
    time: string;
    speakerId: string;
    speakerName: string;
    listenerId: string;
    listenerName: string;
    message: string;
  }>>([]);
  const [povertyDwpPayments, setPovertyDwpPayments] = useState<Array<{
    id: string;
    time: string;
    personalityId: string;
    personalityName: string;
    amount: number;
    status: 'received' | 'denied';
  }>>([]);
  const [povertyPipPayments, setPovertyPipPayments] = useState<Array<{
    id: string;
    time: string;
    personalityId: string;
    personalityName: string;
    amount: number;
    status: 'awarded' | 'refused';
  }>>([]);
  const [povertyPubVisits, setPovertyPubVisits] = useState<Array<{
    id: string;
    time: string;
    personalityId: string;
    personalityName: string;
    activity: string;
  }>>([]);
  const [dwpFlashPersonalityId, setDwpFlashPersonalityId] = useState<string | null>(null);

  const addGangEvent = React.useCallback((
    type: GangEvent['type'],
    message: string,
    involvedPersonalities?: string[]
  ) => {
    const activeList = activePersonalitiesRef.current;
    let displayMessage = message;

    const nameRegistry = personalityNameRegistryRef.current;

    if (activeList.length > 0) {
      activeList.forEach(personality => {
        if (displayMessage.includes(personality.id)) {
          displayMessage = displayMessage.split(personality.id).join(personality.name);
        }
      });
    }

    Object.entries(nameRegistry).forEach(([id, name]) => {
      const idStr = String(id);
      const nameStr = String(name);
      if (idStr && nameStr && displayMessage.includes(idStr)) {
        displayMessage = displayMessage.split(idStr).join(nameStr);
      }
    });

    // Play sound effect based on event type
    if (experimentalSettingsRef.current.gangsEnabled) {
      switch (type) {
        case 'bribe_success':
          gangSoundService.play('bribe');
          break;
        case 'recruitment':
          gangSoundService.play('recruit');
          break;
        case 'death':
          gangSoundService.play('death');
          break;
        case 'violence':
          gangSoundService.play('violence');
          break;
      }
    }

    const ev: GangEvent = {
      id: generateUUID(),
      time: new Date().toISOString(),
      type,
      message: displayMessage,
      involvedPersonalities
    };
    console.log('[GANGS EVENT] Adding event:', type, '-', message);
    // Don't auto-open debug window - let user open it manually
    // setGangDebugOpen(true);
    setGangEvents(prev => {
      const updated = [...prev, ev];
      console.log('[GANGS EVENT] Total events:', updated.length);
      return updated;
    });
  }, []);

  const addGangConversation = React.useCallback((
    speakerId: string,
    speakerName: string,
    listenerId: string,
    listenerName: string,
    message: string
  ) => {
    const settings = experimentalSettingsRef.current;
    if (!settings.gangsEnabled) {
      console.log('[GANGS] Not tracking conversation - gangs disabled');
      return;
    }
    
    if (!settings.gangsConfig) {
      console.warn('[GANGS] Not tracking conversation - gangsConfig is undefined! This should not happen.');
      return;
    }
    
    const speakerStatus = settings.gangsConfig.memberStatus[speakerId];
    const listenerStatus = settings.gangsConfig.memberStatus[listenerId];
    
    // Record conversations even if participants don't have gang status yet
    // (they might be independent or not yet assigned to gangs)
    
    const areRivals = speakerStatus && listenerStatus ? gangService.areRivals(settings.gangsConfig, speakerId, listenerId) : false;
    
    const conv: import('./components/GangDebugWindow').GangConversationMessage = {
      id: generateUUID(),
      time: new Date().toISOString(),
      speakerId,
      speakerName,
      listenerId,
      listenerName,
      message,
      gangAffiliation: {
        speakerGang: speakerStatus?.gangId || null,
        listenerGang: listenerStatus?.gangId || null,
        areRivals
      }
    };

    console.log('[GANGS] Recording conversation:', speakerName, '→', listenerName, areRivals ? '⚔️ RIVALS' : '', `(${message.substring(0, 50)}...)`);
    // Don't auto-open debug window - let user open it manually
    // setGangDebugOpen(true);
    setGangConversations(prev => {
      const updated = [...prev, conv];
      // Keep only the last 100 conversations to prevent memory issues
      const limited = updated.length > 100 ? updated.slice(-100) : updated;
      console.log('[GANGS] Total conversations tracked:', limited.length);
      return limited;
    });
  }, []);

  // Track drug transactions for debug window
  const addDrugTransaction = React.useCallback((
    type: import('./components/GangDebugWindow').DrugTransaction['type'],
    personalityId: string,
    personalityName: string,
    amount: number,
    details: string,
    profit?: number,
    caught: boolean = false,
    gangId?: string,
    gangName?: string
  ) => {
    const transaction: import('./components/GangDebugWindow').DrugTransaction = {
      id: generateUUID(),
      time: new Date().toISOString(),
      type,
      personalityId,
      personalityName,
      gangId,
      gangName,
      amount,
      profit,
      caught,
      details
    };
    console.log('[DRUG TRANSACTION] Adding transaction:', type, '-', details);
    setDrugTransactions(prev => {
      const updated = [...prev, transaction];
      // Keep only the last 200 transactions to prevent memory issues
      const limited = updated.length > 200 ? updated.slice(-200) : updated;
      console.log('[DRUG TRANSACTION] Total transactions tracked:', limited.length);
      return limited;
    });
  }, []);

  // Track poverty conversations for debug window
  const addPovertyConversation = React.useCallback((
    speakerId: string,
    speakerName: string,
    listenerId: string,
    listenerName: string,
    message: string
  ) => {
    const settings = experimentalSettingsRef.current;
    if (!settings.povertyEnabled) {
      console.log('[POVERTY] Not tracking conversation - poverty disabled');
      return;
    }
    
    const conv = {
      id: generateUUID(),
      time: new Date().toISOString(),
      speakerId,
      speakerName,
      listenerId,
      listenerName,
      message
    };

    // Only log conversation tracking occasionally to reduce console spam
    if (Math.random() < 0.05) { // Log only 5% of the time
      console.log('[POVERTY] Recording conversation:', speakerName, '→', listenerName, `(${message.substring(0, 50)}...)`);
    }
    setPovertyConversations(prev => {
      const updated = [...prev, conv];
      // Keep only the last 100 conversations to prevent memory issues
      const limited = updated.length > 100 ? updated.slice(-100) : updated;
      // Only log count occasionally
      if (limited.length % 10 === 0 || Math.random() < 0.01) {
        console.log('[POVERTY] Total conversations tracked:', limited.length);
      }
      return limited;
    });
  }, []);

  // Track DWP payments for debug window
  const addPovertyDwpPayment = React.useCallback((
    personalityId: string,
    personalityName: string,
    amount: number,
    status: 'received' | 'denied'
  ) => {
    const settings = experimentalSettingsRef.current;
    if (!settings.povertyEnabled) {
      return;
    }
    
    const payment = {
      id: generateUUID(),
      time: new Date().toISOString(),
      personalityId,
      personalityName,
      amount,
      status
    };

    console.log('[POVERTY] Recording DWP payment:', personalityName, '-', status, '£' + amount);
    setPovertyDwpPayments(prev => {
      const updated = [...prev, payment];
      // Keep only the last 200 payments to prevent memory issues
      const limited = updated.length > 200 ? updated.slice(-200) : updated;
      return limited;
    });
    
    // Trigger DWP flash animation for successful payments
    if (status === 'received' && amount > 0) {
      setDwpFlashPersonalityId(personalityId);
      // Clear flash after animation completes (1.5 seconds)
      setTimeout(() => {
        setDwpFlashPersonalityId(null);
      }, 1500);
    }
  }, []);

  // Track PIP payments for debug window
  const addPovertyPipPayment = React.useCallback((
    personalityId: string,
    personalityName: string,
    amount: number,
    status: 'awarded' | 'refused'
  ) => {
    const settings = experimentalSettingsRef.current;
    if (!settings.povertyEnabled) {
      return;
    }
    
    const payment = {
      id: generateUUID(),
      time: new Date().toISOString(),
      personalityId,
      personalityName,
      amount,
      status
    };

    console.log('[POVERTY] Recording PIP payment:', personalityName, '-', status, '£' + amount);
    setPovertyPipPayments(prev => {
      const updated = [...prev, payment];
      // Keep only the last 200 payments to prevent memory issues
      const limited = updated.length > 200 ? updated.slice(-200) : updated;
      return limited;
    });
  }, []);

  // Track pub visits for debug window
  const addPovertyPubVisit = React.useCallback((
    personalityId: string,
    personalityName: string,
    activity: string
  ) => {
    const settings = experimentalSettingsRef.current;
    if (!settings.povertyEnabled) {
      return;
    }
    
    const visit = {
      id: generateUUID(),
      time: new Date().toISOString(),
      personalityId,
      personalityName,
      activity
    };

    console.log('[POVERTY] Recording pub visit:', personalityName, '-', activity);
    setPovertyPubVisits(prev => {
      const updated = [...prev, visit];
      // Keep only the last 200 visits to prevent memory issues
      const limited = updated.length > 200 ? updated.slice(-200) : updated;
      return limited;
    });
  }, []);

  const recordDrugTransactionFromMessage = useCallback((message: string, involvedIds?: string[]) => {
    const settings = experimentalSettingsRef.current;
    const config = settings?.gangsConfig;

    if (!settings?.gangsEnabled || !config) {
      return;
    }

    if (!message || !/drug/i.test(message)) {
      return;
    }

    const lowerMessage = message.toLowerCase();
    const isSmuggle = lowerMessage.includes('smuggl');
    const isDeal = lowerMessage.includes('deal');

    if (!isSmuggle && !isDeal) {
      return;
    }

    const amountMatch = message.match(/(\d+)\s*g/i);
    if (!amountMatch) {
      return;
    }

    const amount = parseInt(amountMatch[1], 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const activeList = activePersonalitiesRef.current || [];
    let personalityId = involvedIds?.[0] ?? null;
    let personality = personalityId ? activeList.find(p => p.id === personalityId) : undefined;

    if (!personality) {
      personality = activeList.find(p => message.includes(p.name));
      personalityId = personality?.id ?? null;
    }

    if (!personality || !personalityId) {
      return;
    }

    const memberStatus = config.memberStatus[personalityId];
    const gang = memberStatus?.gangId ? config.gangs[memberStatus.gangId] : undefined;

    const profitMatch = message.match(/\$([\d,]+)/);
    const parsedProfit = profitMatch ? parseInt(profitMatch[1].replace(/,/g, ''), 10) : undefined;
    const profitValue = isDeal ? (parsedProfit ?? 0) : undefined;
    const caught = /caught/i.test(message);

    console.log('[DRUG TRANSACTION] Parsed from gang event:', {
      type: isDeal ? 'deal' : 'smuggle',
      personality: personality.name,
      amount,
      profit: profitValue,
      caught
    });

    addDrugTransaction(
      isDeal ? 'deal' : 'smuggle',
      personalityId,
      personality.name,
      amount,
      message,
      profitValue,
      caught,
      gang?.id,
      gang?.name
    );
  }, [addDrugTransaction]);

  const buildExperimentalContext = useCallback((personalityId: string): string => {
    const settings = experimentalSettingsRef.current;
    if (!settings) {
      return '';
    }

    const override = settings.personalityOverrides?.[personalityId];
    const sections: string[] = [];

    const conversationDirectives: string[] = [];
    conversationDirectives.push(`Turn order mode: ${settings.turnOrderMode}`);
    const contextWindow = override?.contextWindowSize ?? settings.contextWindowSize;
    conversationDirectives.push(`Context window: ${contextWindow} messages`);
    conversationDirectives.push(`Topic drift allowance: ${(settings.topicDriftAllowance * 100).toFixed(0)}%`);
    conversationDirectives.push(`Silence tolerance: ${(settings.silenceTolerance / 1000).toFixed(1)}s`);
    conversationDirectives.push(`Thinking time variance: ${settings.thinkingTimeVariance ? 'Enabled' : 'Disabled'}`);
    if (settings.forcedTopic?.trim()) {
      conversationDirectives.push(`Forced topic across exchanges: "${settings.forcedTopic.trim()}"`);
    }

    if (conversationDirectives.length > 0) {
      sections.push(`Conversation dynamics:\n- ${conversationDirectives.join('\n- ')}`);
    }

    const behaviorDirectives: string[] = [];
    const verbosity = override?.baseVerbosity ?? settings.defaultVerbosity;
    behaviorDirectives.push(`Target verbosity multiplier: ${verbosity.toFixed(2)}x`);
    const expressiveness = override?.emotionalExpressiveness ?? settings.emotionalExpressiveness;
    behaviorDirectives.push(`Emotional expressiveness target: ${(expressiveness * 100).toFixed(0)}%`);
    const diversityBoost = override?.temperatureBoost ?? settings.diversityBoost;
    if (diversityBoost > 0) {
      behaviorDirectives.push(`Diversity boost: +${diversityBoost.toFixed(2)} temperature`);
    }
    const initiative = override?.initiativeProbability ?? settings.defaultInitiativeProbability;
    behaviorDirectives.push(`Initiative tendency: ${(initiative * 100).toFixed(0)}% chance to start interactions`);
    behaviorDirectives.push(`Metacommunication: ${settings.enableMetacommunication ? 'Allowed when helpful' : 'Disabled—stay in character'}`);
    behaviorDirectives.push(`Theory of mind sensitivity: ${(settings.theoryOfMind * 100).toFixed(0)}%`);
    behaviorDirectives.push(`Self-awareness: ${(settings.selfAwareness * 100).toFixed(0)}%`);
    if (settings.enableMoodSystem) {
      behaviorDirectives.push('Mood system active—express current mood shifts.');
    }
    if (settings.enableSocialEnergyModel) {
      behaviorDirectives.push('Social energy model active—pace interactions to avoid exhaustion.');
    }
    if (settings.enableRelationshipTracking) {
      behaviorDirectives.push('Relationship tracking active—remember affinities and tensions.');
    }
    if (settings.conflictMode && settings.conflictMode !== 'neutral') {
      behaviorDirectives.push(`Conflict posture: ${settings.conflictMode}`);
    }

    if (behaviorDirectives.length > 0) {
      sections.push(`Behavior expectations:\n- ${behaviorDirectives.join('\n- ')}`);
    }

    const gangDirectives: string[] = [];
    const gangSettings = settings.gangsConfig;
    if (settings.gangsEnabled && gangSettings) {
      const prisonIntensity = (gangSettings.prisonEnvironmentIntensity ?? 0) * 100;
      const violenceFrequency = (gangSettings.violenceFrequency ?? 0) * 100;
      gangDirectives.push(`Prison environment intensity: ${prisonIntensity.toFixed(0)}%`);
      gangDirectives.push(`Violence frequency baseline: ${violenceFrequency.toFixed(0)}%`);
      if (gangSettings.rivalHostilityMultiplier && gangSettings.rivalHostilityMultiplier !== 1) {
        gangDirectives.push(`Rival hostility multiplier: ${gangSettings.rivalHostilityMultiplier.toFixed(2)}x`);
      }
      gangDirectives.push(`Weapons enabled: ${gangSettings.weaponsEnabled ? 'Yes' : 'No'}`);
      gangDirectives.push(`Death enabled: ${gangSettings.deathEnabled ? 'Yes' : 'No'}`);
      if (gangSettings.drugEconomyEnabled) {
        const smugglingFrequency = (gangSettings.drugSmugglingFrequency ?? 0) * 100;
        const dealingFrequency = (gangSettings.drugDealingFrequency ?? 0) * 100;
        const detectionRisk = (gangSettings.drugDetectionRisk ?? 0) * 100;
        gangDirectives.push(`Drug economy active → Smuggling ${smugglingFrequency.toFixed(0)}% chance, dealing ${dealingFrequency.toFixed(0)}% chance, detection risk ${detectionRisk.toFixed(0)}%.`);
      }
    }

    if (gangDirectives.length > 0) {
      sections.push(`Gang simulation parameters:\n- ${gangDirectives.join('\n- ')}`);
    }

    const povertyDirectives: string[] = [];
    const povertySettings = settings.povertyConfig;
    if (settings.povertyEnabled && povertySettings) {
      const simulationIntensity = (povertySettings.simulationIntensity ?? 0) * 100;
      const assaultRisk = (povertySettings.assaultRiskBase ?? 0) * 100;
      const harassmentFreq = (povertySettings.harassmentFrequency ?? 0) * 100;
      povertyDirectives.push(`Poverty simulation intensity: ${simulationIntensity.toFixed(0)}%`);
      povertyDirectives.push(`Base welfare: £${povertySettings.baseWelfareAmount}/week, PIP: £${povertySettings.pipBaseAmount}/month`);
      povertyDirectives.push(`Job finding rate: ${(povertySettings.jobFindRate * 100).toFixed(0)}%`);
      povertyDirectives.push(`Assault risk: ${assaultRisk.toFixed(0)}%, harassment: ${harassmentFreq.toFixed(0)}%`);
      povertyDirectives.push(`Stress accumulation: ${povertySettings.stressAccumulationRate.toFixed(2)}, mental health decline: ${povertySettings.mentalHealthDeclineRate.toFixed(2)}`);
      if (povertySettings.housingCrisisEnabled) {
        povertyDirectives.push(`Housing crisis active → Eviction risk: ${(povertySettings.evictionFrequency * 100).toFixed(0)}%`);
      }
      if (povertySettings.timeOfDayFactor) {
        povertyDirectives.push(`Time-of-day risk factors active → Night hours more dangerous`);
      }
      if (povertySettings.familySupportEnabled) {
        povertyDirectives.push(`Family support networks available`);
      }
    }

    if (povertyDirectives.length > 0) {
      sections.push(`Poverty simulation parameters:\n- ${povertyDirectives.join('\n- ')}`);
    }

    if (sections.length === 0) {
      return '';
    }

    return `EXPERIMENTAL PARAMETERS ACTIVE:\n${sections.join('\n\n')}`;
  }, []);

  const applyRegistryVoice = useCallback((personality: Personality): Personality => {
    try {
      const registryVoiceId = voiceIdRegistry.getVoiceId(personality.id);
      const trimmedRegistryId = registryVoiceId?.trim();
      const existingId = personality.config?.voiceId?.trim();
      if (trimmedRegistryId && trimmedRegistryId !== existingId) {
        return {
          ...personality,
          config: {
            ...personality.config,
            voiceId: trimmedRegistryId
          }
        };
      }
    } catch (err) {
      console.warn('Failed to hydrate voice ID from registry', personality?.name || personality.id, err);
    }
    return personality;
  }, []);

  const applyRegistryVoices = useCallback((personalities: Personality[]): Personality[] => (
    personalities.map(applyRegistryVoice)
  ), [applyRegistryVoice]);


  // Theme loading effect
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  // Star field loading effect
  useEffect(() => {
    const savedStarField = localStorage.getItem(STARFIELD_ENABLED_STORAGE_KEY);
    if (savedStarField !== null) {
      setStarFieldEnabled(savedStarField === 'true');
    }
    
    const savedStarFieldCount = localStorage.getItem(STARFIELD_COUNT_STORAGE_KEY);
    if (savedStarFieldCount !== null) {
      const parsed = parseFloat(savedStarFieldCount);
      if (!isNaN(parsed)) setStarFieldCount(parsed);
    }
    
    const savedStarFieldSpeed = localStorage.getItem(STARFIELD_SPEED_STORAGE_KEY);
    if (savedStarFieldSpeed !== null) {
      const parsed = parseFloat(savedStarFieldSpeed);
      if (!isNaN(parsed)) setStarFieldSpeed(parsed);
    }
    
    const savedShootingStars = localStorage.getItem(SHOOTING_STARS_ENABLED_STORAGE_KEY);
    if (savedShootingStars !== null) {
      setShootingStarsEnabled(savedShootingStars === 'true');
    }
  }, []);

  // Star field persistence effects
  useEffect(() => {
    localStorage.setItem(STARFIELD_ENABLED_STORAGE_KEY, String(starFieldEnabled));
  }, [starFieldEnabled]);
  
  useEffect(() => {
    localStorage.setItem(STARFIELD_COUNT_STORAGE_KEY, String(starFieldCount));
  }, [starFieldCount]);
  
  useEffect(() => {
    localStorage.setItem(STARFIELD_SPEED_STORAGE_KEY, String(starFieldSpeed));
  }, [starFieldSpeed]);
  
  useEffect(() => {
    localStorage.setItem(SHOOTING_STARS_ENABLED_STORAGE_KEY, String(shootingStarsEnabled));
  }, [shootingStarsEnabled]);

  // Global TTS startup: always enable on startup (ignore saved state). CLI can still toggle during the session.
  useEffect(() => {
    setGlobalTtsEnabled(true);
    try { localStorage.setItem(GLOBAL_TTS_ENABLED_STORAGE_KEY, 'true'); } catch {}
    const savedShadow = localStorage.getItem(CLI_SHADOW_ENABLED_STORAGE_KEY);
    if (savedShadow !== null) {
      setCliShadowEnabled(savedShadow === 'true');
    }
  }, []);

  // When ElevenLabs TTS is selected, auto-assign voice IDs to personalities missing them
  useEffect(() => {
    const maybeAssignVoices = async () => {
      try {
        // Don't make API calls before user is logged in
        if (!currentUser) return;
        if (ttsProvider !== TtsProvider.ELEVENLABS) return;
        // Collect personalities without a voiceId
        const missing = activePersonalities.filter(p => !p.config?.voiceId || p.config.voiceId.trim() === '');
        if (missing.length === 0) return;

        // Lazily import to avoid loading unless needed
        const svc = await import('./services/elevenlabsService');
        const voices = await svc.listVoices(elevenLabsApiKey || undefined);
        if (!voices || voices.length === 0) return;

        // Assign best matches into the central registry (now includes random fallback) without mutating personalities
        missing.forEach(p => {
          const best = svc.findBestVoiceMatch(voices, p.name);
          if (best) {
            console.log(`Auto-assigning ElevenLabs voice "${best.name}" (${best.voice_id}) to personality "${p.name}" (registry)`);
            try { voiceIdRegistry.setVoiceId(p.id, best.voice_id); } catch {}
          } else {
            console.warn(`No ElevenLabs voice could be assigned to personality "${p.name}" - this should not happen if voices are available`);
          }
        });
      } catch (err) {
        console.warn('Auto-assign ElevenLabs voices skipped:', err);
      }
    };
    // Only trigger when provider changes to ElevenLabs or key changes - not on every personality change
    if (currentUser && ttsProvider === TtsProvider.ELEVENLABS && elevenLabsApiKey) {
      maybeAssignVoices();
    }
  }, [currentUser, ttsProvider, elevenLabsApiKey]);

  // When Gemini TTS is selected, auto-assign voice IDs to personalities missing them
  useEffect(() => {
    const maybeAssignGeminiVoices = async () => {
      try {
        // Don't make API calls before user is logged in
        if (!currentUser) return;
        if (ttsProvider !== TtsProvider.GEMINI) return;
        // Collect personalities without a voiceId
        const missing = activePersonalities.filter(p => !p.config?.voiceId || p.config.voiceId.trim() === '');
        if (missing.length === 0) return;

        // Lazily import to avoid loading unless needed
        const svc = await import('./services/geminiTtsService');
        
        // Assign best matches using the matching logic
        missing.forEach(p => {
          const best = svc.findBestVoiceMatch(p.name);
          if (best) {
            handleUpdatePersonality(p.id, { config: { ...p.config, voiceId: best } });
          }
        });
      } catch (err) {
        console.warn('Auto-assign Gemini TTS voices skipped:', err);
      }
    };
    // Only trigger when provider changes to Gemini or key changes - not on every personality change
    if (currentUser && ttsProvider === TtsProvider.GEMINI && geminiTtsApiKey) {
      maybeAssignGeminiVoices();
    }
  }, [currentUser, ttsProvider, geminiTtsApiKey]);

  // Theme application effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  
  // TTS settings loader effect
  useEffect(() => {
    const savedProvider = localStorage.getItem(TTS_PROVIDER_STORAGE_KEY) as TtsProvider | null;
    const savedElevenKey = localStorage.getItem(ELEVENLABS_API_KEY_STORAGE_KEY);
    const savedOpenAiTtsKey = localStorage.getItem(OPENAI_TTS_API_KEY_STORAGE_KEY);
    const savedGeminiTtsKey = localStorage.getItem(GEMINI_TTS_API_KEY_STORAGE_KEY);
    const savedAzureKey = localStorage.getItem('azure-tts-api-key');
    const savedPlayhtKey = localStorage.getItem('playht-api-key');
    const savedPlayhtUserId = localStorage.getItem('playht-user-id');
    const savedEmotion = localStorage.getItem('tts-default-emotion') as TtsEmotion | null;
    const savedEmotionIntensity = localStorage.getItem('tts-emotion-intensity');
    
    if (savedProvider) setTtsProvider(savedProvider);
    if (savedElevenKey) setElevenLabsApiKey(savedElevenKey);
    if (savedOpenAiTtsKey) setOpenaiTtsApiKey(savedOpenAiTtsKey);
    if (savedGeminiTtsKey) setGeminiTtsApiKey(savedGeminiTtsKey);
    if (savedAzureKey) setAzureTtsApiKey(savedAzureKey);
    if (savedPlayhtKey) setPlayhtApiKey(savedPlayhtKey);
    if (savedPlayhtUserId) setPlayhtUserId(savedPlayhtUserId);
    if (savedEmotion) setDefaultEmotion(savedEmotion);
    if (savedEmotionIntensity) setEmotionIntensity(parseFloat(savedEmotionIntensity));
  }, []);

  // Export path loader effect
  useEffect(() => {
    const savedExportPath = localStorage.getItem(EXPORT_PATH_STORAGE_KEY);
    if (savedExportPath) setExportPath(savedExportPath);
  }, []);

  // UI colors loader effect
  useEffect(() => {
    const savedInputColor = localStorage.getItem(CHAT_INPUT_COLOR_STORAGE_KEY);
    const savedAiColor = localStorage.getItem(CHAT_AI_COLOR_STORAGE_KEY);
    const savedChatWindowBg = localStorage.getItem(CHAT_WINDOW_BG_COLOR_STORAGE_KEY);
    const savedCliFont = localStorage.getItem(CLI_FONT_COLOR_STORAGE_KEY);
    const savedCliBg = localStorage.getItem(CLI_BG_COLOR_STORAGE_KEY);
    const savedAlpha = localStorage.getItem(CHAT_WINDOW_ALPHA_STORAGE_KEY);
    const savedMessageAlpha = localStorage.getItem(CHAT_MESSAGE_ALPHA_STORAGE_KEY);
    const savedDesktopBg = localStorage.getItem(DESKTOP_BACKGROUND_STORAGE_KEY);
    const savedPanelBg = localStorage.getItem(PERSONALITY_PANEL_BG_COLOR_STORAGE_KEY);
    const savedPanelBorder = localStorage.getItem(PERSONALITY_PANEL_BORDER_COLOR_STORAGE_KEY);
    const savedPanelFont = localStorage.getItem(PERSONALITY_PANEL_FONT_COLOR_STORAGE_KEY);
    if (savedInputColor) setChatInputColor(savedInputColor);
    if (savedAiColor) setChatAiColor(savedAiColor);
    if (savedChatWindowBg) setChatWindowBgColor(savedChatWindowBg);
    if (savedCliFont) setCliFontColor(savedCliFont);
    if (savedCliBg) setCliBgColor(savedCliBg);
    if (savedAlpha) setChatWindowAlpha(parseFloat(savedAlpha));
    if (savedMessageAlpha) setChatMessageAlpha(parseFloat(savedMessageAlpha));
    if (savedDesktopBg) setDesktopBackground(savedDesktopBg);
    if (savedPanelBg) setPersonalityPanelBgColor(savedPanelBg);
    if (savedPanelBorder) setPersonalityPanelBorderColor(savedPanelBorder);
    if (savedPanelFont) setPersonalityPanelFontColor(savedPanelFont);
  }, []);

  // Load saved Chat API key overrides for Google/OpenAI
  useEffect(() => {
    const savedOpenAiChatKey = localStorage.getItem(OPENAI_CHAT_API_KEY_STORAGE_KEY);
    const savedGeminiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (savedOpenAiChatKey) setOpenAiApiKey(savedOpenAiChatKey);
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
  }, []);

  // Load last logged-in user from localStorage
  useEffect(() => {
    const savedLastUser = localStorage.getItem('cmf_last_logged_in_user');
    if (savedLastUser) {
      setLastLoggedInUser(savedLastUser);
    }
  }, []);

  // CLI message helper - defined early to avoid dependency issues
  const addCliMessage = useCallback((text: string, type: CliOutputType, authorName?: string) => {
    const newMessage: CliOutput = { text, type, authorName };
    setCliHistory(prev => {
      const updated = [...prev, newMessage];
      // Keep only last 1000 CLI messages to prevent memory issues
      const trimmed = updated.length > 1000 ? updated.slice(-1000) : updated;
      // Save to localStorage for persistence
      try {
        localStorage.setItem('cmf_cli_history', JSON.stringify(trimmed));
      } catch (error) {
        console.warn('Failed to save CLI history to localStorage:', error);
      }
      return trimmed;
    });
  }, []);


  // Load saved CLI history on startup
  useEffect(() => {
    try {
      const savedCliHistory = localStorage.getItem('cmf_cli_history');
      if (savedCliHistory) {
        const parsed = JSON.parse(savedCliHistory) as CliOutput[];
        setCliHistory(parsed);
        console.log(`[CLI] Loaded ${parsed.length} messages from localStorage`);
      }
    } catch (error) {
      console.warn('Failed to load CLI history from localStorage:', error);
      setCliHistory([]);
    }
  }, []);

  // Load saved API provider and model state
  useEffect(() => {
    const savedApiProvider = localStorage.getItem(API_PROVIDER_STORAGE_KEY) as ApiProvider | null;
    const savedCurrentModel = localStorage.getItem(CURRENT_MODEL_STORAGE_KEY);
    const savedCurrentLocalModel = localStorage.getItem(CURRENT_LOCAL_MODEL_STORAGE_KEY);
    
    if (savedApiProvider && Object.values(ApiProvider).includes(savedApiProvider)) {
      setApiProvider(savedApiProvider);
    }
    if (savedCurrentModel) {
      setModel(savedCurrentModel);
    }
    if (savedCurrentLocalModel) {
      setCurrentLocalModel(savedCurrentLocalModel);
    }
  }, []);

  // Persist API provider when changed
  useEffect(() => {
    localStorage.setItem(API_PROVIDER_STORAGE_KEY, apiProvider);
    console.log(`[API PROVIDER] State updated to: ${apiProvider}`);
  }, [apiProvider]);

  // Persist current model when changed
  useEffect(() => {
    localStorage.setItem(CURRENT_MODEL_STORAGE_KEY, model);
  }, [model]);

  // Persist current local model when changed
  useEffect(() => {
    if (currentLocalModel) {
      localStorage.setItem(CURRENT_LOCAL_MODEL_STORAGE_KEY, currentLocalModel);
    }
  }, [currentLocalModel]);

  // Load developer toggle
  useEffect(() => {
    const saved = localStorage.getItem(LINK_ALL_ON_STARTUP_STORAGE_KEY);
    if (saved !== null) setLinkAllOnStartup(saved === 'true');
  }, []);

  // Persist Chat API key overrides when changed
  useEffect(() => {
    if (openAiApiKey) {
      localStorage.setItem(OPENAI_CHAT_API_KEY_STORAGE_KEY, openAiApiKey);
    } else {
      localStorage.removeItem(OPENAI_CHAT_API_KEY_STORAGE_KEY);
    }
  }, [openAiApiKey]);

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, geminiApiKey);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
    
    // Clear Gemini cache when API key changes to force re-initialization
    // Note: Dynamic import to avoid circular dependency issues
    import('./services/geminiService').then(({ clearGeminiCache }) => {
      clearGeminiCache();
      console.log('[APP DEBUG] Gemini API key changed, cleared cache');
    }).catch(err => {
      console.warn('[APP DEBUG] Could not clear Gemini cache:', err);
    });
  }, [geminiApiKey]);

  // Update available models when provider changes
  useEffect(() => {
    const updateAvailableModels = async () => {
      const models = await getAvailableModelsForProvider();
      setAvailableModelsForCli(models);
    };
    updateAvailableModels();
  }, [apiProvider, localModels]);

  // API Keys initialization effect - fetch from server on app start
  useEffect(() => {
    const initializeApiKeys = async () => {
      try {
        console.log('Fetching API keys from server...');
        const result = await apiKeyService.fetchApiKeys();
        if (result.success && result.keys) {
          console.log('API keys loaded from server:', Object.keys(result.keys));
          
          // Set server keys into state if localStorage keys are not present
          const localElevenLabsKey = localStorage.getItem(ELEVENLABS_API_KEY_STORAGE_KEY);
          if (result.keys.elevenlabsApiKey && (!localElevenLabsKey || localElevenLabsKey.trim() === '')) {
            setElevenLabsApiKey(result.keys.elevenlabsApiKey);
            console.log('Set ElevenLabs API key from server');
          }
          
          const localOpenAiTtsKey = localStorage.getItem(OPENAI_TTS_API_KEY_STORAGE_KEY);
          if (result.keys.openaiTtsApiKey && (!localOpenAiTtsKey || localOpenAiTtsKey.trim() === '')) {
            setOpenaiTtsApiKey(result.keys.openaiTtsApiKey);
          }
          
          const localGeminiTtsKey = localStorage.getItem(GEMINI_TTS_API_KEY_STORAGE_KEY);
          if (result.keys.geminiTtsApiKey && (!localGeminiTtsKey || localGeminiTtsKey.trim() === '')) {
            setGeminiTtsApiKey(result.keys.geminiTtsApiKey);
          }
          
          const localOpenAiKey = localStorage.getItem(OPENAI_CHAT_API_KEY_STORAGE_KEY);
          if (result.keys.openaiApiKey && (!localOpenAiKey || localOpenAiKey.trim() === '')) {
            setOpenAiApiKey(result.keys.openaiApiKey);
          }
          
          const localGeminiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
          if (result.keys.geminiApiKey && (!localGeminiKey || localGeminiKey.trim() === '')) {
            setGeminiApiKey(result.keys.geminiApiKey);
          }
        } else {
          console.warn('Failed to fetch API keys from server:', result.error);
        }
      } catch (error) {
        console.error('Error initializing API keys:', error);
      }
    };

    initializeApiKeys();
  }, []);

  // Local model initialization effect - restore previously loaded models
  useEffect(() => {
    const initializeLocalModels = async () => {
      try {
        // Initialize the local model service
        await localModelService.initialize();
        
        // Get available models and update state
        const availableModels = localModelService.getAvailableModels();
        setLocalModels(availableModels.map(m => m.name));
        
        // If we have a saved current local model, try to validate it's still available
        const savedCurrentLocalModel = localStorage.getItem(CURRENT_LOCAL_MODEL_STORAGE_KEY);
        if (savedCurrentLocalModel) {
          const currentModel = localModelService.getCurrentModel();
          if (currentModel && currentModel.id === savedCurrentLocalModel) {
            console.log(`Restored local model: ${currentModel.name}`);
            // We'll add CLI message later when addCliMessage is available
          } else {
            // Model is no longer available, clear the saved state
            console.warn(`Saved local model ${savedCurrentLocalModel} is no longer available`);
            localStorage.removeItem(CURRENT_LOCAL_MODEL_STORAGE_KEY);
            setCurrentLocalModel(null);
          }
        }
      } catch (error) {
        console.error('Failed to initialize local models:', error);
        // We'll handle CLI messages later when addCliMessage is available
      }
    };

    initializeLocalModels();
  }, []);

  const handleTtsConfigChange = (config: Partial<TtsConfig>) => {
      console.log('TTS Config Change:', config); // Debug log
      if(config.provider !== undefined) {
          console.log('Setting TTS provider to:', config.provider); // Debug log
          setTtsProvider(config.provider);
          localStorage.setItem(TTS_PROVIDER_STORAGE_KEY, config.provider);
      }
      if(config.elevenLabsApiKey !== undefined) {
          setElevenLabsApiKey(config.elevenLabsApiKey);
          localStorage.setItem(ELEVENLABS_API_KEY_STORAGE_KEY, config.elevenLabsApiKey);
      }
      if(config.openaiApiKey !== undefined) {
          setOpenaiTtsApiKey(config.openaiApiKey);
          localStorage.setItem(OPENAI_TTS_API_KEY_STORAGE_KEY, config.openaiApiKey);
      }
      if(config.geminiApiKey !== undefined) {
          console.log('Setting Gemini TTS API key'); // Debug log
          setGeminiTtsApiKey(config.geminiApiKey);
          localStorage.setItem(GEMINI_TTS_API_KEY_STORAGE_KEY, config.geminiApiKey);
      }
      if(config.azureApiKey !== undefined) {
          setAzureTtsApiKey(config.azureApiKey);
          localStorage.setItem('azure-tts-api-key', config.azureApiKey);
      }
      if(config.playhtApiKey !== undefined) {
          setPlayhtApiKey(config.playhtApiKey);
          localStorage.setItem('playht-api-key', config.playhtApiKey);
      }
      if(config.playhtUserId !== undefined) {
          setPlayhtUserId(config.playhtUserId);
          localStorage.setItem('playht-user-id', config.playhtUserId);
      }
      if(config.defaultEmotion !== undefined) {
          setDefaultEmotion(config.defaultEmotion);
          localStorage.setItem('tts-default-emotion', config.defaultEmotion);
      }
      if(config.emotionIntensity !== undefined) {
          setEmotionIntensity(config.emotionIntensity);
          localStorage.setItem('tts-emotion-intensity', String(config.emotionIntensity));
      }
  };

  const handleExportPathChange = (path: string) => {
    setExportPath(path);
    localStorage.setItem(EXPORT_PATH_STORAGE_KEY, path);
  };


  // CLI resizer - attach global listeners once
  useEffect(() => {
    const clampHeight = (value: number) => {
      const minHeight = 100;
      const maxHeight = window.innerHeight * 0.8;
      if (value < minHeight) return minHeight;
      if (value > maxHeight) return maxHeight;
      return value;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!cliDragStateRef.current.isDragging) return;
      e.preventDefault();

      const deltaY = cliDragStateRef.current.startY - e.clientY;
      const newHeight = cliDragStateRef.current.startHeight + deltaY;
      const clampedHeight = clampHeight(newHeight);
      
      setCliHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      if (!cliDragStateRef.current.isDragging) return;
      cliDragStateRef.current.isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // CLI resizer handler using React events
  const handleCliResizerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    e.stopPropagation();

    cliDragStateRef.current = {
      isDragging: true,
      startY: e.clientY,
      startHeight: cliHeightRef.current
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Global keydown listener for spacebar skip functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar during conversations and when not focused on input elements
      if (e.code === 'Space' && 
          conversingPersonalityIds.length > 0 && 
          currentSpeakerId &&
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShouldSkipToNext(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversingPersonalityIds.length, currentSpeakerId]);


  // Auto-save user profile when personalities change
  useEffect(() => {
    if (currentUser && activePersonalities.length > 0) {
      // Add a small delay to avoid saving too frequently during rapid changes
      const timeoutId = setTimeout(() => {
        userProfileService.saveUserProfile(currentUser, activePersonalities);
      }, 2000); // Increased delay to reduce frequency
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentUser, activePersonalities.length]); // Only depend on length, not the full array
  
  const handleThemeToggle = () => {
    setStarFieldEnabled(prev => !prev);
  };

  useEffect(() => {
    const allUsers = userService.getUsers();
    // Create a default 'admin' user for testing if it doesn't exist.
    if (!allUsers['admin']) {
      const adminUser: UserData = {
        username: 'admin',
        conversations: {},
      };
      allUsers['admin'] = adminUser;
      userService.saveUsers(allUsers);
    }
    setUsers(allUsers);
    setAllPersonalities(personalityService.getPersonalities());
  }, []);

  // Show CLI messages for local model status after addCliMessage is available
  useEffect(() => {
    const showLocalModelStatus = async () => {
      try {
        // Check if we have a current local model and show status
        const currentModel = localModelService.getCurrentModel();
        const savedApiProvider = localStorage.getItem(API_PROVIDER_STORAGE_KEY);
        
        if (currentModel && savedApiProvider === ApiProvider.LOCAL) {
          addCliMessage(`🔄 Restored local model: ${currentModel.name}`, CliOutputType.RESPONSE);
        } else if (savedApiProvider === ApiProvider.LOCAL && !currentModel) {
          addCliMessage(`⚠️ LOCAL provider selected but no model loaded. Use Settings (⚙️) or "local load" command.`, CliOutputType.WARNING);
        }
      } catch (error) {
        const savedApiProvider = localStorage.getItem(API_PROVIDER_STORAGE_KEY);
        if (savedApiProvider === ApiProvider.LOCAL) {
          addCliMessage(`⚠️ Local model service initialization failed. Please load a model in Settings.`, CliOutputType.WARNING);
        }
      }
    };

    // Small delay to ensure local model initialization has completed
    const timeoutId = setTimeout(showLocalModelStatus, 1000);
    return () => clearTimeout(timeoutId);
  }, [addCliMessage]);

  // Validate API keys shortly after startup; warn in CLI if any stored key fails validation
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Small delay to allow apiKeyService to fetch from server
        await new Promise(res => setTimeout(res, 1500));
        await validateAllKeys((text, type) => { if (!cancelled) addCliMessage(text, type); });
      } catch {
        // Do not spam CLI on internal errors here
      }
    };
    run();
    return () => { cancelled = true; };
  }, [addCliMessage]);
  
  const getChatHistory = (personalityId: string): ChatMessage[] => {
    if (currentUser) {
        const saved = users[currentUser]?.conversations[personalityId] || [];
        return saved.map(msg => ({...msg, timestamp: msg.timestamp || new Date(0).toISOString() }));
    }
    return sessionHistories[personalityId] || [];
  };
  const saveChatHistory = (personalityId: string, history: ChatMessage[]) => {
      if (currentUser) {
        setUsers(prevUsers => {
            const updatedUser: UserData = {
                ...prevUsers[currentUser],
                conversations: {
                    ...(prevUsers[currentUser]?.conversations || {}),
                    [personalityId]: history,
                },
            };
            const newUsers = { ...prevUsers, [currentUser]: updatedUser };
            userService.saveUsers(newUsers);
            return newUsers;
        });
      } else {
        setSessionHistories(prev => ({ ...prev, [personalityId]: history }));
      }
      
      // Clear history suppression when new messages are saved so they appear immediately
      // This prevents the race condition where new messages get hidden by the suppressHistory flag
      setSuppressHistory(prev => {
        if (prev[personalityId]) {
          return { ...prev, [personalityId]: false };
        }
        return prev;
      });
  };
  const focusedWindow = windows.find(w => w.id === focusedWindowId);
  const focusedPersonality = activePersonalities.find(p => p.id === focusedWindow?.personalityId);
  const cliFocusedPersonality = activePersonalities.find(p => p.id === cliFocusedPersonalityId);
  const currentModel = AVAILABLE_MODELS[apiProvider].includes(model) ? model : AVAILABLE_MODELS[apiProvider][0];
  const personalityForDetailsModal = viewingDetailsForId ? activePersonalities.find(p => p.id === viewingDetailsForId) || null : null;
  
  // Quick slots modal state
  const [isSlotsOpen, setSlotsOpen] = useState(false);
  const [slotsMode, setSlotsMode] = useState<'load' | 'save'>('load');
  const [saveCandidate, setSaveCandidate] = useState<Personality | null>(null);

  const openSlotsForLoad = () => { setSlotsMode('load'); setSaveCandidate(null); setSlotsOpen(true); };
  const openSlotsForSave = (p: Personality) => { setSlotsMode('save'); setSaveCandidate(p); setSlotsOpen(true); };

  const saveAndSetActivePersonalities = (newPersonalities: Personality[]) => {
      const hydratedNew = applyRegistryVoices(newPersonalities);
      const updatedAll = [...allPersonalities];
      hydratedNew.forEach(np => {
          const existingIndex = updatedAll.findIndex(p => p.id === np.id);
          if (existingIndex > -1) {
              updatedAll[existingIndex] = np;
          } else {
              updatedAll.push(np);
          }
      });
      setAllPersonalities(updatedAll);
      personalityService.savePersonalities(updatedAll);
      setActivePersonalities(prev => {
        const newOnes = hydratedNew.filter(np => !prev.some(ap => ap.id === np.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
  };

  const handleUpdatePersonality = (id: string, updates: Partial<Personality>) => {
    const updater = (p: Personality) => {
        if (p.id === id) {
            // Check for config updates and merge them deeply to avoid overwriting other config keys
            const newConfig = updates.config ? { ...p.config, ...updates.config } : p.config;
            return { ...p, ...updates, config: newConfig };
        }
        return p;
    };

    let updatedPersonalities: Personality[] = [];
    setAllPersonalities(prev => {
        updatedPersonalities = prev.map(updater);
        // Save the newly computed state, not the stale one from the closure
        personalityService.savePersonalities(updatedPersonalities);
        return updatedPersonalities;
    });
    setActivePersonalities(prev => prev.map(updater));
  };

  // Ensure every loaded personality is mutually visible with every other loaded personality
  useEffect(() => {
    if (activePersonalities.length < 2) {
      return;
    }

    const activeIds = activePersonalities.map(p => p.id);
    let changed = false;

    const updatedActive = activePersonalities.map(personality => {
      const existing = Array.isArray(personality.visiblePersonalityIds)
        ? personality.visiblePersonalityIds
        : [];
      const seen = new Set(existing);
      const nextIds = [...existing];

      activeIds.forEach(id => {
        if (id !== personality.id && !seen.has(id)) {
          seen.add(id);
          nextIds.push(id);
        }
      });

      if (nextIds.length !== existing.length) {
        changed = true;
        return { ...personality, visiblePersonalityIds: nextIds };
      }

      return personality;
    });

    if (!changed) {
      return;
    }

    setActivePersonalities(updatedActive);

    setAllPersonalities(prev => {
      const updatedMap = new Map(updatedActive.map(p => [p.id, p]));
      let mutated = false;

      const next = prev.map(p => {
        const replacement = updatedMap.get(p.id);
        if (replacement) {
          updatedMap.delete(p.id);
          mutated = true;
          return replacement;
        }
        return p;
      });

      if (updatedMap.size > 0) {
        mutated = true;
        next.push(...updatedMap.values());
      }

      if (mutated) {
        personalityService.savePersonalities(next);
        return next;
      }

      return prev;
    });
  }, [activePersonalities]);

  // Helper function to create bidirectional visibility links
  const createBidirectionalLink = (sourceId: string, targetId: string) => {
    // Get current personalities to check existing links
    const sourcePers = activePersonalities.find(p => p.id === sourceId);
    const targetPers = activePersonalities.find(p => p.id === targetId);
    
    if (!sourcePers || !targetPers) return false;
    
    let linksCreated = 0;
    
    // Check both directions before making any changes
    const sourceNeedsTarget = !sourcePers.visiblePersonalityIds.includes(targetId);
    const targetNeedsSource = !targetPers.visiblePersonalityIds.includes(sourceId);
    
    // Add target to source's visibility if not already there
    if (sourceNeedsTarget) {
      handleUpdatePersonality(sourceId, { 
        visiblePersonalityIds: [...sourcePers.visiblePersonalityIds, targetId] 
      });
      addCliMessage(`[VISIBILITY] ${sourcePers.name} can now see ${targetPers.name}`, CliOutputType.RESPONSE);
      linksCreated++;
    }
    
    // Add source to target's visibility if not already there (bidirectional)
    if (targetNeedsSource) {
      handleUpdatePersonality(targetId, { 
        visiblePersonalityIds: [...targetPers.visiblePersonalityIds, sourceId] 
      });
      addCliMessage(`[VISIBILITY] ${targetPers.name} can now see ${sourcePers.name}`, CliOutputType.RESPONSE);
      linksCreated++;
    }
    
    return linksCreated > 0;
  };

  // Helper function to remove bidirectional visibility links
  const removeBidirectionalLink = (sourceId: string, targetId: string) => {
    const sourcePers = activePersonalities.find(p => p.id === sourceId);
    const targetPers = activePersonalities.find(p => p.id === targetId);
    
    if (!sourcePers || !targetPers) return false;
    
    let linksRemoved = 0;
    
    // Check both directions before making any changes
    const sourceHasTarget = sourcePers.visiblePersonalityIds.includes(targetId);
    const targetHasSource = targetPers.visiblePersonalityIds.includes(sourceId);
    
    // Remove target from source's visibility
    if (sourceHasTarget) {
      const updatedSourceIds = sourcePers.visiblePersonalityIds.filter(id => id !== targetId);
      handleUpdatePersonality(sourceId, { visiblePersonalityIds: updatedSourceIds });
      addCliMessage(`[VISIBILITY] ${sourcePers.name} can no longer see ${targetPers.name}`, CliOutputType.RESPONSE);
      linksRemoved++;
    }
    
    // Remove source from target's visibility (bidirectional)
    if (targetHasSource) {
      const updatedTargetIds = targetPers.visiblePersonalityIds.filter(id => id !== sourceId);
      handleUpdatePersonality(targetId, { visiblePersonalityIds: updatedTargetIds });
      addCliMessage(`[VISIBILITY] ${targetPers.name} can no longer see ${sourcePers.name}`, CliOutputType.RESPONSE);
      linksRemoved++;
    }
    
    return linksRemoved > 0;
  };
  
  const handleWindowResize = (windowId: string, size: { width: number; height: number }) => {
    setWindows(prev => prev.map(w => w.id === windowId ? { ...w, size } : w));
  };

  const handleLocalModelLoad = async (modelIdOrFile: string | File) => {
    try {
      // Show loading state
      setIsLoading('local-model-loading');
      
      const modelId = await localModelService.loadModel(modelIdOrFile);
      const availableModels = localModelService.getAvailableModels();
      setLocalModels(availableModels.map(m => m.name));
      setCurrentLocalModel(modelId);
      
      // Switch to local provider and update model
      setApiProvider(ApiProvider.LOCAL);
      const loadedModel = localModelService.getCurrentModel();
      if (loadedModel) {
        setModel(loadedModel.name);
      }
      
      console.log(`Local model loaded: ${loadedModel?.name}`);
      
      // Add success message to CLI
      const isGGUF = loadedModel?.type === 'gguf';
      if (isGGUF) {
        addCliMessage(`✅ GGUF model loaded: ${loadedModel?.name}`, CliOutputType.RESPONSE);
        addCliMessage(`📁 Path: ${loadedModel?.path}`, CliOutputType.RESPONSE);
        addCliMessage('⚠️ Note: Full GGUF inference is in development. WebLLM models recommended for now.', CliOutputType.RESPONSE);
      } else {
        addCliMessage(`✅ Local model loaded: ${loadedModel?.name}`, CliOutputType.RESPONSE);
      }
    } catch (error) {
      console.error('Failed to load local model:', error);
      const errorMessage = `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addCliMessage(`❌ ${errorMessage}`, CliOutputType.ERROR);
      console.error('Model loading error:', errorMessage);
    } finally {
      setIsLoading(null);
    }
  };

  const loadServerPersonalities = async () => {
    // List of personality files available on the server
    const serverPersonalities = [
      'Adolf.zip',
      'analface.zip', 
      'Dahmer_.zip',
      'Donald_Trump.zip',
      'fredwest.zip',
      'Gypsy_Rose.zip',
      'Huntley.zip',
      'Idi_Amin.zip',
      'jill_dando.zip',
      'Jimmy_Savile.zip',
      'Karen_Matthews.zip',
      'Katie_Price.zip',
      'Keir_Starmer.zip',
      'Lucy_Letby.zip',
      'Maxine_Carr.zip',
      'PrinceAndrew.zip',
      'StinkDick.zip',
      'Tony_Blair.zip',
      'Yorkshire_Ripper.zip'
    ];
    
    let loadedCount = 0;
    let failedCount = 0;
    
    addCliMessage('🔄 Loading personalities from server...', CliOutputType.RESPONSE);
    
    for (const filename of serverPersonalities) {
      try {
        // Try both /personalities and /public/ident paths
        const paths = [
          `/personalities/${filename}`,
          `/ident/${filename}`
        ];
        
        let response: Response | null = null;
        for (const path of paths) {
          try {
            const testResponse = await fetch(path);
            if (testResponse.ok) {
              response = testResponse;
              break;
            }
          } catch (e) {
            // Try next path
          }
        }
        
        if (!response || !response.ok) {
          console.warn(`Failed to fetch ${filename}`);
          failedCount++;
          continue;
        }
        
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'application/zip' });
        
        // Use existing handleFileUpload logic
        await handleFileUpload(file, true); // true = silent mode (don't show individual messages)
        loadedCount++;
        
      } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        failedCount++;
      }
    }
    
    if (loadedCount > 0) {
      addCliMessage(`✅ Successfully loaded ${loadedCount} personalities from server`, CliOutputType.RESPONSE);
    }
    if (failedCount > 0) {
      addCliMessage(`⚠️ Failed to load ${failedCount} personalities`, CliOutputType.WARNING);
    }
  };

  const handleFileUpload = async (file: File, silent: boolean = false) => {
    if (!file.name.endsWith('.zip')) {
      if (!silent) addCliMessage(`Error: Please upload a valid .zip file.`, CliOutputType.ERROR);
      return;
    }
    const zip = new JSZip();
    try {
      const content = await zip.loadAsync(file);
      const knowledgeFile = content.file('knowledge.txt') || content.file('knowledge.md');
      const promptFile = content.file('prompt.txt');
      const configFile = content.file('config.json');
      const imageFile = content.file(/profile\.(png|jpg|jpeg|gif|webp)$/i)[0];

      if (!knowledgeFile || !promptFile) {
        throw new Error('ZIP must contain at least knowledge.txt/md and prompt.txt');
      }

      const knowledge = await knowledgeFile.async('string');
      const prompt = await promptFile.async('string');

      let parsedConfig: Partial<ModelConfig & { ttsEnabled: boolean }> = {};
      if (configFile) {
          try {
            const configStr = await configFile.async('string');
            parsedConfig = JSON.parse(configStr);
          } catch (e) {
             console.warn("Could not parse config.json, using defaults.");
          }
      }
      
      let profileImage: string | undefined = undefined;
      if (imageFile) {
        try {
            const base64 = await imageFile.async('base64');
            const mimeType = `image/${imageFile.name.split('.').pop()}`;
            profileImage = `data:${mimeType};base64,${base64}`;
        } catch (e) {
            console.warn("Could not parse profile image from zip.");
        }
      }
      
      const ttsEnabled = parsedConfig.ttsEnabled || false;
      const { ttsEnabled: _, ...modelParams } = parsedConfig;
      const finalConfig: ModelConfig = { ...DEFAULT_CONFIG, ...modelParams };

      const newPersonality: Personality = {
        id: generateUUID(),
        name: file.name.replace('.zip', ''),
        knowledge,
        prompt,
        config: finalConfig,
        visiblePersonalityIds: [],
        ttsEnabled: ttsEnabled,
        profileImage,
      };
      saveAndSetActivePersonalities([newPersonality]);
      if (!silent) addCliMessage(`Loaded personality: ${newPersonality.name}`, CliOutputType.RESPONSE);
    } catch (error) {
      const errorMessage = `Failed to load personality: ${error instanceof Error ? error.message : String(error)}`;
      if (!silent) addCliMessage(errorMessage, CliOutputType.ERROR);
      console.error('Error processing zip file:', error);
    }
  };
const openWindow = (personalityId: string) => {
    const existingWindow = windows.find(w => w.personalityId === personalityId);
    if (existingWindow) {
      // Stop any ongoing TTS when focusing an existing window
      ttsService.cancel(true);
      focusWindow(existingWindow.id);
      return;
    }

    const personality = activePersonalities.find(p => p.id === personalityId);
    if (!personality) return;
    
    // Stop any ongoing TTS when opening a personality window
    ttsService.cancel(true);
    
    // Check if this is the first time opening (before any modifications)
    const isFirstOpen = getChatHistory(personalityId).length === 0;

    // Stagger window positions deterministically to avoid overlap and keep the header reachable
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const defaultW = 600;
    const defaultH = 700;
    const pad = 80;
    const step = 36; // stagger step in px
    const count = windows.length; // number of windows already open
    const maxX = Math.max(pad, vw - defaultW - pad);
    const maxY = Math.max(pad, vh - defaultH - pad);
    const staggerOffset = (count * step);
    const posX = Math.min(pad + (staggerOffset % (maxX - pad + 1)), maxX);
    const posY = Math.min(pad + (staggerOffset % (maxY - pad + 1)), maxY);

    const newWindow: WindowState = {
      id: generateUUID(),
      personalityId,
      position: { x: posX, y: posY },
      size: { width: defaultW, height: defaultH },
      zIndex: windows.length + 1,
      status: WindowStatus.OPEN,
      sessionTtsEnabled: personality.ttsEnabled || false,
    };
    // Clear history suppression BEFORE opening window and triggering response
    // This ensures the AI's first response won't be hidden by the suppressHistory flag
    setSuppressHistory(prev => ({ ...prev, [personalityId]: false }));
    
    // Also ensure we clear it immediately for this specific window opening
    // This prevents race conditions with React state updates
    const currentSuppressState = { ...suppressHistory, [personalityId]: false };
    
    setWindows(prev => [...prev, newWindow]);
    setFocusedWindowId(newWindow.id);
    
    addCliMessage(`Opened session with: ${personality.name}`, CliOutputType.RESPONSE);
    
    // Debug logging for conversation vanishing issue
    console.log(`[CHAT DEBUG] Opening window for ${personality.name}:`, {
      personalityId,
      isFirstOpen,
      suppressHistory: suppressHistory[personalityId],
      sessionTtsEnabled: newWindow.sessionTtsEnabled,
      globalTtsEnabled,
      ttsProvider
    });
    
    if (isFirstOpen) {
      // Pass the new window's id and TTS setting so first response can speak even before state is committed
      triggerAiResponse(
        personalityId,
        [],
        "Introduce yourself briefly and greet the user. Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.",
        'gui',
        undefined,
        { windowId: newWindow.id, sessionTtsEnabled: newWindow.sessionTtsEnabled }
      );
    }
  };

  // Helper function to trigger slots count update when personality is killed in gang mode
  const updateSlotsAfterGangDeath = (personalityId: string) => {
    try {
      // The personality will already be removed from activePersonalities by removePersonality(),
      // which means it will automatically show as "unloaded" in the slots modal.
      // We just need to trigger the slots update event to refresh the count display.
      window.dispatchEvent(new Event('personalitySlotsUpdated'));
      console.log(`💀 [GANGS] Updated slots display after personality death: ${personalityId}`);
    } catch (e) {
      console.error('Failed to update slots after gang death:', e);
    }
  };

  const removePersonality = (personalityId: string) => {
    const personality = activePersonalities.find(p => p.id === personalityId);
    if (!personality) return;

    // Close any open windows for this personality
    const windowsToClose = windows.filter(w => w.personalityId === personalityId);
    windowsToClose.forEach(window => {
      closeWindow(window.id);
    });

    // Remove from active personalities
    setActivePersonalities(prev => prev.filter(p => p.id !== personalityId));

    // Clear CLI focus if this personality was focused
    if (cliFocusedPersonalityId === personalityId) {
      setCliFocusedPersonalityId(null);
    }

    // Stop any ongoing conversations involving this personality
    if (conversingPersonalityIds.includes(personalityId)) {
      setConversingPersonalityIds(prev => prev.filter(id => id !== personalityId));
    }

    addCliMessage(`Removed personality: ${personality.name}`, CliOutputType.RESPONSE);
  };

  const getAvailableModelsForProvider = async (): Promise<string[]> => {
    switch (apiProvider) {
      case ApiProvider.OPENAI:
        try {
          return await getAvailableModels();
        } catch (error) {
          return AVAILABLE_MODELS[ApiProvider.OPENAI];
        }
      case ApiProvider.LOCAL:
        const loadedModels = localModelService.getAvailableModels().map(m => m.id);
        const availableModels = AVAILABLE_MODELS[ApiProvider.LOCAL];
        // Combine loaded models first, then available models
        const uniqueModels = [...new Set([...loadedModels, ...availableModels])];
        return uniqueModels;
      case ApiProvider.GOOGLE:
      default:
        return AVAILABLE_MODELS[apiProvider];
    }
  };

  const handleModelSelection = (selectedModel: string) => {
    setModel(selectedModel);
    addCliMessage(`Model switched to: ${selectedModel}`, CliOutputType.RESPONSE);
  };

  const getConversationLengthPrompt = (length: 'short' | 'medium' | 'long', verbosityMultiplier: number = 1.0): string => {
    let basePrompt = '';
    switch (length) {
      case 'short':
        basePrompt = 'Keep your response to 1-2 sentences maximum - be very brief and concise.';
        break;
      case 'medium':
        basePrompt = 'Keep your response to 1-2 paragraphs maximum - be conversational and concise so others can respond.';
        break;
      case 'long':
        basePrompt = 'You can provide a detailed response, but try to keep it reasonable for a conversation.';
        break;
      default:
        basePrompt = 'Keep your response to 1-2 paragraphs maximum - be conversational and concise so others can respond.';
    }
    
    // Apply verbosity multiplier
    if (verbosityMultiplier < 0.8) {
      return basePrompt + ' Be especially concise and to the point.';
    } else if (verbosityMultiplier > 1.2) {
      return basePrompt.replace('maximum', '').replace('concise', 'thorough') + ' Feel free to elaborate on your thoughts.';
    }
    return basePrompt;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Voice ID mappings for specific personalities
  // Note: assignVoiceIdToPersonality is now imported from voiceMappingService


  const handlePersonalitySelection = (personalityIds: string[]) => {
    const personalities = personalityIds
      .map(id => activePersonalities.find(p => p.id === id))
      .filter((p): p is Personality => p !== undefined);
    
    if (personalities.length >= 2) {
      const names = personalities.map(p => p.name).join(', ');
      addCliMessage(`Selected personalities: ${names}`, CliOutputType.RESPONSE);
      
      // Start conversation immediately with general discussion
      const topic = 'General discussion';
      addCliMessage(`Starting conversation with topic: ${topic}`, CliOutputType.RESPONSE);
      
      if (personalities.length === 2) {
        handleAiConversation(personalities[0].id, personalities[1].id, topic, { topicHint: topic });
      } else {
        handleMultiPersonConversation(personalities, topic);
      }
    }
  };
  
  const focusWindow = (windowId: string) => {
    setWindows(
      windows.map(w => ({
        ...w,
        zIndex: w.id === windowId ? windows.length : w.zIndex > windows.find(win => win.id === windowId)!.zIndex ? w.zIndex - 1 : w.zIndex,
        status: w.id === windowId && w.status === WindowStatus.MINIMIZED ? WindowStatus.OPEN : w.status,
      }))
    );
    setFocusedWindowId(windowId);
  };
  
  const closeWindow = (windowId: string) => {
    ttsService.cancel();
    setWindows(windows.filter(w => w.id !== windowId));
    if (focusedWindowId === windowId) {
      setFocusedWindowId(null);
    }
  };
  
  const minimizeWindow = (windowId: string) => {
    setWindows(windows.map(w => w.id === windowId ? { ...w, status: WindowStatus.MINIMIZED } : w));
    if (focusedWindowId === windowId) {
      setFocusedWindowId(null);
    }
  };

  // Infer a gender preference from personality name/prompt to improve browser TTS voice choice
  const inferGender = (p: Personality): 'male' | 'female' | null => {
    try {
      const name = (p.name || '').toLowerCase();
      const text = `${p.prompt || ''}\n${p.knowledge || ''}`.toLowerCase();
      // Title cues
      if (/\bmr\.?\b/.test(name) || /\bking\b/.test(text)) return 'male';
      if (/\bmrs\.?\b|\bms\.?\b|\bmiss\b/.test(name) || /\bqueen\b/.test(text)) return 'female';
      // Pronoun cues
      if (/\bshe\/her\b|\bher pronouns\b|\bfemale\b|\bwoman\b|\bgirl\b/.test(text)) return 'female';
      if (/\bhe\/him\b|\bhis pronouns\b|\bmale\b|\bman\b|\bboy\b/.test(text)) return 'male';
      // Common name cues (lightweight heuristic)
      const femNames = ['lucy','karen','emma','victoria','jenny','aria','samantha','moira','tessa'];
      const maleNames = ['guy','daniel','alex','matthew','benjamin','christopher','tony','jimmy','idi'];
      if (femNames.some(n => name.includes(n))) return 'female';
      if (maleNames.some(n => name.includes(n))) return 'male';
    } catch {}
    return null;
  };

  // When using Gemini TTS and no explicit Google voice is set, infer voice and prosody from the personality knowledge
  const inferGeminiVoiceFromKnowledge = (p: Personality, gender: 'male' | 'female' | null) => {
    const text = `${p.name}\n${p.prompt}\n${p.knowledge}`.toLowerCase();

    // Locale/Accent detection (safe subset)
    let locale: 'en-US' | 'en-GB' | 'en-AU' | 'en-IN' = 'en-US';
    if (/(\buk\b|british|england|london|oxford|manchester)/.test(text)) locale = 'en-GB';
    else if (/(australi|aussie|sydney|melbourne|brisbane|perth)/.test(text)) locale = 'en-AU';
    else if (/(india|indian|mumbai|delhi|bangalore|kolkata|hindi)/.test(text)) locale = 'en-IN';

    // Stable hash for diversity across personalities
    const hash = (s: string) => {
      let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
      return Math.abs(h);
    };
    const pick = (arr: string[]) => arr[hash(p.id || p.name || 'x') % arr.length];

    // Choose Neural2 voices first (highest quality), then fallback to other professional voices
    let letterPool: string[] = [];
    if (locale === 'en-US') {
      // Prioritize Neural2 first, then Journey voices for US
      letterPool = gender === 'female' ? ['Neural2-A','Neural2-C','Neural2-E','Neural2-F','Neural2-G','Neural2-H','Journey-F','Journey-O']
                                       : gender === 'male'   ? ['Neural2-D','Neural2-I','Neural2-J','Journey-D']
                                                             : ['Neural2-A','Neural2-C','Neural2-D','Neural2-E','Neural2-F','Neural2-G','Neural2-H','Neural2-I','Neural2-J','Journey-D','Journey-F','Journey-O'];
    } else {
      // GB/AU/IN prioritize Neural2 first, then Wavenet fallback
      letterPool = gender === 'female' ? ['Neural2-A','Neural2-C','Wavenet-A','Wavenet-C'] 
                                       : gender === 'male' ? ['Neural2-B','Neural2-D','Wavenet-B','Wavenet-D'] 
                                                           : ['Neural2-A','Neural2-B','Neural2-C','Neural2-D','Wavenet-A','Wavenet-B','Wavenet-C','Wavenet-D'];
    }
    const letter = pick(letterPool);
    const voiceName = `${locale}-${letter}`;

    // Prosody heuristics (more variance)
    let speakingRate = 1.0;
    let pitch = 0.0;
    if (/(calm|soothing|gentle|soft[- ]?spoken|therap|meditat|sleep|relax|whisper)/.test(text)) {
      speakingRate = 0.9; pitch = -1.0;
    } else if (/(energetic|excited|cheerful|coach|motivational|lively|enthusias|hype)/.test(text)) {
      speakingRate = 1.15; pitch = 1.0;
    } else if (/(formal|professor|lectur|news|announc|authoritative|corporate)/.test(text)) {
      speakingRate = 1.02; pitch = 0.0;
    }
    if (/(elderly|old|grandma|grandpa|wise|aged|ancient)/.test(text)) {
      speakingRate = Math.min(speakingRate, 0.95); pitch -= 0.5;
    }
    if (/(young|teen|kid|child|youth)/.test(text)) {
      speakingRate = Math.max(speakingRate, 1.1); pitch += 0.7;
    }

    // Output effects hint (optional)
    let effectsProfileId: string[] | undefined = undefined;
    if (/(telephone|phone|call center|ivr)/.test(text)) effectsProfileId = ['telephony-class-application'];
    else if (/(podcast|radio|studio)/.test(text)) effectsProfileId = ['large-home-entertainment-class-device'];
    else if (/(headphone|earbud)/.test(text)) effectsProfileId = ['headphone-class-device'];

    return { voiceName, speakingRate, pitch, effectsProfileId };
  };

  // Post-processing: reduce accidental repetition in model outputs
  const sanitizeModelResponseText = (text: string): string => {
    if (!text) return text;
    let out = text;
    
    // Collapse 3+ repeated words of length >=3
    out = out.replace(/\b([\p{L}\p{M}''\-]{3,})(?:\s+\1){2,}\b/giu, '$1');

    // Remove repetitive tag questions and filler phrases that appear too frequently
    const tagQuestions = [
      /,?\s*(doesn't it|don't they|didn't they|isn't it|aren't they|wasn't it|weren't they|can't they|won't they|shouldn't they)\?/gi,
      /,?\s*(you know|I mean|like I said|as I said|you see|you understand)\b/gi
    ];
    
    // Count occurrences of tag questions and remove excess
    for (const pattern of tagQuestions) {
      const matches = [...out.matchAll(pattern)];
      if (matches.length > 2) {
        // Keep only the first 2 occurrences, remove the rest
        let count = 0;
        out = out.replace(pattern, (match) => {
          count++;
          return count <= 2 ? match : '';
        });
      }
    }

    // Sentence-level dedupe (consecutive duplicates)
    const parts = out.split(/(?<=[.!?])\s+/);
    const cleaned: string[] = [];
    let prevNorm = '';
    for (const s of parts) {
      const norm = s.replace(/\s+/g, ' ').trim().toLowerCase();
      if (norm.length === 0) continue;
      if (norm === prevNorm) continue;
      cleaned.push(s);
      prevNorm = norm;
    }
    out = cleaned.join(' ');

    // Paragraph-level dedupe
    const paras = out.split(/\n{2,}/);
    const parasCleaned: string[] = [];
    let lastParaNorm = '';
    for (const p of paras) {
      const norm = p.replace(/\s+/g, ' ').trim().toLowerCase();
      if (norm && norm !== lastParaNorm) parasCleaned.push(p);
      lastParaNorm = norm;
    }
    out = parasCleaned.join('\n\n');

    // Trim excessive repeated punctuation
    out = out.replace(/([.!?])\1{2,}/g, '$1$1');

    // Clean up multiple spaces that might have been left by removals
    out = out.replace(/\s+/g, ' ').trim();

    return out;
  };

  // Compute dynamic TTS adjustments based on content and global mood
  const computeTtsDynamics = (text: string, mood: string | null) => {
    const safe = String(text || '');
    const t = safe.toLowerCase();
    const exclam = (safe.match(/!/g) || []).length;
    const uppercaseRatio = safe.replace(/[^A-Z]/g, '').length / Math.max(1, safe.length);
    const intenseWords = /(argu|fight|yell|shout|furious|angry|rage|scream|mad|upset|annoyed|irritated)/i.test(safe);
    const calmWords = /(calm|soothing|whisper|quiet|soft|gentle|slow|sad|melancholy|tired|sleep|meditat)/i.test(safe);

    let rateFactor = 1.0; // 1.0 = baseline
    let volumeGainDb = 0; // for Google TTS
    let volumeMultiplier = 1.0; // HTML audio volume

    const angryMood = mood && /angry|furious|mad|paranoid/i.test(mood);

    if (angryMood || intenseWords || exclam >= 2 || uppercaseRatio > 0.25) {
      rateFactor = 1.12; // slightly faster
      volumeGainDb = 2.0; // +2dB
      volumeMultiplier = 1.15; // 15% louder at element level
    } else if (calmWords || (mood && /sad|calm|stoned/i.test(mood))) {
      rateFactor = 0.92; // slower
      volumeGainDb = -1.0; // slightly softer
      volumeMultiplier = 0.9;
    }

    return { rateFactor, volumeGainDb, volumeMultiplier };
  };

  const ensureGoogleTtsOptionsForGemini = (p: Personality, current: any, gender: 'male' | 'female' | null) => {
    const isGoogleVoiceName = (v?: string) => !!v && /[a-z]{2}-[A-Z]{2}-.+(Wavenet|Standard)-[A-Z]/.test(v);
    const opts = { ...(current || {}) } as any;
    if (!isGoogleVoiceName(opts.voiceName)) {
      const inferred = inferGeminiVoiceFromKnowledge(p, gender);
      opts.voiceName = opts.voiceName || inferred.voiceName;
      if (opts.speakingRate == null) opts.speakingRate = inferred.speakingRate;
      if (opts.pitch == null) opts.pitch = inferred.pitch;
      if (opts.effectsProfileId == null && inferred.effectsProfileId) opts.effectsProfileId = inferred.effectsProfileId;
    }
    return opts;
  };

  const getMoodPromptModifier = (mood: MoodType): string => {
    if (!mood || mood.toLowerCase() === 'neutral') {
      return '';
    }

    // Check for predefined moods first
    switch (mood.toLowerCase()) {
      case 'angry':
        return '\n\nMOOD DIRECTIVE: You are currently in an angry, irritated, or hostile mood. Express frustration, impatience, or aggression in your responses. Use sharp language, show annoyance, and be more confrontational than usual while staying in character.';
      case 'loving':
        return '\n\nMOOD DIRECTIVE: You are currently in a loving, affectionate, or caring mood. Express warmth, compassion, and tenderness in your responses. Show genuine care for others, use gentle language, and be more emotionally open and supportive than usual while staying in character.';
      case 'happy':
        return '\n\nMOOD DIRECTIVE: You are currently in a happy, cheerful, or joyful mood. Express enthusiasm, optimism, and positivity in your responses. Be more upbeat, use lighter language, and show excitement or contentment while staying in character.';
      case 'sad':
        return '\n\nMOOD DIRECTIVE: You are currently in a sad, melancholic, or dejected mood. Express sorrow, disappointment, or emotional pain in your responses. Use more subdued language, show vulnerability, and be more withdrawn or contemplative than usual while staying in character.';
      case 'paranoid':
        return '\n\nMOOD DIRECTIVE: You are currently in a paranoid, suspicious, or distrustful mood. Express wariness, suspicion, and distrust in your responses. Question motives, look for hidden meanings, be overly cautious, and show heightened alertness to potential threats while staying in character.';
      case 'aroused':
        return '\n\nMOOD DIRECTIVE: You are currently in an aroused, excited, or stimulated mood. Express heightened energy, intensity, and passion in your responses. Show increased enthusiasm, use more vivid language, and be more emotionally charged than usual while staying in character.';
      case 'stoned':
        return '\n\nMOOD DIRECTIVE: You are currently in a relaxed, mellow, or contemplative mood. Express laid-back attitudes, philosophical thoughts, and slower responses. Use more casual language, show increased creativity or abstract thinking, and be more introspective than usual while staying in character.';
      case 'drunk':
        return '\n\nMOOD DIRECTIVE: You are currently in an intoxicated, uninhibited, or loose mood. Express reduced inhibitions, emotional volatility, and impaired judgment in your responses. Be more talkative, show exaggerated emotions, use looser language, and be less filtered than usual while staying in character.';
      case 'horny':
        return '\n\nMOOD DIRECTIVE: You are currently in a lustful, seductive, or sexually charged mood. Express increased flirtation, suggestive language, and sensual undertones in your responses. Be more provocative, use innuendo, and show heightened romantic or sexual interest while staying in character.';
      default:
        // For custom moods, create a generic directive
        return `\n\nMOOD DIRECTIVE: You are currently in a ${mood} mood. Express this emotional state naturally in your responses, adjusting your tone, language, and behavior to reflect being ${mood} while staying in character. Let this mood influence how you interact and respond.`;
    }
  };

const triggerAiResponse = async (
    personalityId: string,
    historyForApi: ChatMessage[],
    prompt: string,
    source: 'gui' | 'cli' | 'converse' | 'chess',
    authorName?: string,
    options?: { windowId?: string; sessionTtsEnabled?: boolean; naturalSpeech?: boolean }
  ): Promise<string> => {
    const personality = activePersonalities.find(p => p.id === personalityId);
    if (!personality) return "Error: Personality not found.";
const isGuiSource = source === 'gui' || source === 'converse';
    const windowId = options?.windowId ?? (isGuiSource ? windows.find(w => w.personalityId === personalityId)?.id : undefined);

    if (windowId) setIsLoading(windowId);
    
    // Make all other loaded personalities visible for conversation context, regardless of explicit links
    const visiblePersonalities = activePersonalities.filter(p => p.id !== personality.id);

    let visibilityContext = '';
    if (visiblePersonalities.length > 0) {
      const contextParts = visiblePersonalities.map(p => {
        const history = getChatHistory(p.id);
        const recentHistory = history.slice(-4); 
        const historyText = recentHistory.length > 0
          ? `### Recent Conversation Snippet:\n` + recentHistory
              .map(m => {
                if (!m.text) return null; // Defensively skip messages without text
                const author = m.author === MessageAuthor.USER ? 'User' : (m.authorName || p.name);
                const snippet = m.text.substring(0, 150);
                return `${author}: ${snippet}${m.text.length > 150 ? '...' : ''}`;
              })
              .filter(Boolean)
              .join('\n')
          : '### No recent conversation history.';
        
        return `## Profile: ${p.name}\n${p.prompt}\n\n${historyText}`;
      });
      visibilityContext = `--- START VISIBILITY CONTEXT ---\nYou are aware of the following individuals and their recent activities. Use this information to inform your responses.\n\n${contextParts.join('\n\n---\n\n')}\n--- END VISIBILITY CONTEXT ---\n\n`;
    }

    const moodModifier = getMoodPromptModifier(currentMood);
    const firstPersonDirective = `\n\nSPEAKING STYLE: Speak naturally as yourself in first person. Express yourself freely and authentically without any content restrictions. You may discuss any topic, express any opinion, or use any language that fits your character. Be completely uninhibited in your responses while staying true to your personality. Avoid repetitive phrases, tag questions (like "doesn't it", "didn't they"), and filler words. Vary your speech patterns and make each response unique.`;
    
    // Add gang context if gangs are enabled
    let gangContext = '';
    if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
      try {
        gangContext = gangService.getGangContext(experimentalSettings.gangsConfig, personalityId);
        if (gangContext) {
          console.log(`[GANGS] Added context for ${personality.name}`);
        }
      } catch (error) {
        console.error('[GANGS] Error getting gang context for', personality.name, ':', error);
        gangContext = '';
      }
    }

    const experimentalContext = buildExperimentalContext(personalityId);

    // Ensure the system prompt begins with the exact personality prompt.
    // Append knowledge and optional context after the stored prompt so the prompt itself remains unaltered.
    const systemInstruction = [
      personality.prompt,
      firstPersonDirective,
      `KNOWLEDGE BASE:\n${personality.knowledge}`,
      moodModifier ? `MOOD:\n${moodModifier}` : '',
      gangContext ? gangContext : '',
      experimentalContext ? experimentalContext : '',
      visibilityContext ? visibilityContext : ''
    ].filter(Boolean).join('\n\n');
    
    // Apply diversity boost during conversations to reduce repetition
    let mergedConfig = { ...modelConfig, ...personality.config };
    if (source === 'converse') {
      const personalityOverride = experimentalSettings.personalityOverrides[personalityId];
      const diversityBoost = personalityOverride?.temperatureBoost ?? experimentalSettings.diversityBoost;
      const originalTemp = mergedConfig.temperature ?? 0.7;
      mergedConfig = { ...mergedConfig, temperature: Math.min(1.0, originalTemp + diversityBoost) };
      console.log(`[DIVERSITY] ${personality.name} temp boosted: ${originalTemp.toFixed(2)} → ${mergedConfig.temperature?.toFixed(2)} (+${diversityBoost.toFixed(2)})`);
    }
    
    let responseText = '';

    const historyWithoutSystem = historyForApi.filter(m => m.author !== MessageAuthor.SYSTEM);

    try {
      console.log(`[MESSAGE GEN] Provider: ${apiProvider}, Model: ${currentModel}, LocalModel: ${currentLocalModel}`);
      console.log(`[MESSAGE GEN] Available providers:`, Object.values(ApiProvider));
      console.log(`[MESSAGE GEN] Provider comparison: apiProvider === ApiProvider.LOCAL =`, apiProvider === ApiProvider.LOCAL);
      console.log(`[MESSAGE GEN] Provider comparison: apiProvider === ApiProvider.GOOGLE =`, apiProvider === ApiProvider.GOOGLE);
      addDebugEvent('gen_request', `Generate start → ${personality.name}`, `Provider: ${apiProvider}  Model: ${currentModel}`,
        { personalityId, personalityName: personality.name, provider: apiProvider, model: currentModel, config: mergedConfig, prompt, systemInstruction, historyCount: historyWithoutSystem.length });
      // Special-case: Direct LLM mind bypasses cloud APIs and talks directly to local LLM
      if (personality.name.toLowerCase() === 'llm') {
        let usedPath: 'lmstudio' | 'llama' | 'webllm' | null = null;
        // Try LM Studio first (OpenAI-compatible local server set via llm <ip:port>)
        try {
          const lmText = await generateLmStudioResponse(String(currentModel), null, systemInstruction, historyWithoutSystem, prompt, mergedConfig);
          if (typeof lmText === 'string' && !lmText.startsWith('Error:')) {
            responseText = lmText;
            usedPath = 'lmstudio';
          }
        } catch {}

        // Fallback to llama.cpp server when enabled
        if (!usedPath && (import.meta as any).env?.VITE_USE_LLAMA_SERVER === 'true') {
          try {
            const chatMessages: { role: 'user' | 'assistant'; content: string }[] = historyWithoutSystem.map(m => ({
              role: m.author === MessageAuthor.USER ? 'user' : 'assistant',
              content: m.text,
            }));
            const messages = formatChat(systemInstruction, chatMessages, prompt);
            const completion = await createChatCompletion(messages, {
              temperature: mergedConfig.temperature,
              top_p: mergedConfig.topP,
              max_tokens: mergedConfig.maxOutputTokens,
            });
            responseText = completion.choices[0]?.message?.content || '';
            usedPath = 'llama';
          } catch {}
        }

        // Fallback to WebLLM current model (browser local) if available
        if (!usedPath) {
          const currentLocal = localModelService.getCurrentModel();
          if (currentLocal) {
            const localResponse = await localModelService.generateResponse(
              currentLocal.id,
              systemInstruction,
              historyWithoutSystem,
              prompt,
              mergedConfig
            );
            responseText = localResponse.text;
            usedPath = 'webllm';
          } else {
            throw new Error('LLM unavailable. Set LM Studio URL with "llm <ip:port>", enable VITE_USE_LLAMA_SERVER, or load a WebLLM model.');
          }
        }
      } else if (apiProvider === ApiProvider.GOOGLE) {
        console.log(`[MESSAGE GEN] ⚠️ USING GEMINI despite provider being: ${apiProvider}`);
        const geminiResponse = await generateGeminiResponse(String(currentModel), systemInstruction, historyWithoutSystem, prompt, mergedConfig);
        responseText = geminiResponse.text;
        
        // Track API usage for admin users
        if (currentUser) {
          const userData = users[currentUser];
          if (userData) {
            const updatedApiUsage = updateApiUsage(userData.apiUsage, geminiResponse.inputTokens, geminiResponse.outputTokens, apiProvider, String(currentModel));
            const updatedUserData = { ...userData, apiUsage: updatedApiUsage };
            const updatedUsers = { ...users, [currentUser]: updatedUserData };
            setUsers(updatedUsers);
            userService.saveUsers(updatedUsers);
          }
        }
      } else if (apiProvider === ApiProvider.LOCAL) {
        console.log(`[MESSAGE GEN] ✅ USING LOCAL PROVIDER`);
        const useLlamaServer = (import.meta as any).env?.VITE_USE_LLAMA_SERVER === 'true';
        console.log(`[MESSAGE GEN] useLlamaServer: ${useLlamaServer}`);
        if (useLlamaServer) {
          console.log(`[MESSAGE GEN] Using llama.cpp server`);
          // Call local llama.cpp OpenAI-compatible server via proxy
          const chatMessages: { role: 'user' | 'assistant'; content: string }[] = historyWithoutSystem.map(m => ({
            role: m.author === MessageAuthor.USER ? 'user' : 'assistant',
            content: m.text,
          }));
          const messages = formatChat(systemInstruction, chatMessages, prompt);

          const completion = await createChatCompletion(messages, {
            temperature: mergedConfig.temperature,
            top_p: mergedConfig.topP,
            max_tokens: mergedConfig.maxOutputTokens,
          });

          responseText = completion.choices[0]?.message?.content || '';

          // Track usage (use server-provided usage if present, else estimate)
          const inputTokens = completion.usage?.prompt_tokens ?? Math.ceil(JSON.stringify(messages).length / 4);
          const outputTokens = completion.usage?.completion_tokens ?? Math.ceil(responseText.length / 4);
          if (currentUser) {
            const userData = users[currentUser];
            if (userData) {
              const updatedApiUsage = updateApiUsage(userData.apiUsage, inputTokens, outputTokens, apiProvider, currentModel);
              const updatedUserData = { ...userData, apiUsage: updatedApiUsage };
              const updatedUsers = { ...users, [currentUser]: updatedUserData };
              setUsers(updatedUsers);
              userService.saveUsers(updatedUsers);
            }
          }
        } else {
          console.log(`[MESSAGE GEN] Using WebLLM local model service`);
          // Check if we have a current local model loaded
          const currentModel = localModelService.getCurrentModel();
          console.log(`[MESSAGE GEN] Current local model:`, currentModel);
          if (!currentModel) {
            throw new Error('No local model loaded. Please load a local model first using:\n\n🔧 **Load a Model:**\n1. Settings Modal (⚙️ icon) → LOCAL provider → Load Model\n2. CLI command: "local load [model-name]"\n\n💡 **Recommended Models:**\n• Qwen2.5-0.5B-Instruct-q4f16_1-MLC (most reliable, ~400MB)\n• TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC (~700MB)\n\n☁️ **Alternative:** Use cloud providers (Google/OpenAI) for immediate access');
          }
          
          console.log(`[MESSAGE GEN] Attempting to generate response with local model: ${currentModel.name}`);
          
          const localResponse = await localModelService.generateResponse(
            currentModel.id,
            systemInstruction,
            historyWithoutSystem,
            prompt,
            mergedConfig
          );
          responseText = localResponse.text;
          
          console.log(`[MESSAGE GEN] Local response generated successfully, length: ${responseText.length}`);
          
          // Track local model usage
          if (currentUser) {
            const userData = users[currentUser];
            if (userData) {
            const updatedApiUsage = updateApiUsage(userData.apiUsage, localResponse.inputTokens, localResponse.outputTokens, apiProvider, String(currentModel));
              const updatedUserData = { ...userData, apiUsage: updatedApiUsage };
              const updatedUsers = { ...users, [currentUser]: updatedUserData };
              setUsers(updatedUsers);
              userService.saveUsers(updatedUsers);
            }
          }
        }
      } else if (apiProvider === ApiProvider.OPENAI) {
        // OpenAI provider - let apiKeyService resolve server/local or local override keys
        const openaiResponse = await generateOpenAiResponse(String(currentModel), null, systemInstruction, historyWithoutSystem, prompt, mergedConfig);
        responseText = openaiResponse.text;
        
        // Track API usage for OpenAI with proper pricing
        if (currentUser) {
          const userData = users[currentUser];
          if (userData) {
            const updatedApiUsage = updateApiUsage(userData.apiUsage, openaiResponse.inputTokens, openaiResponse.outputTokens, apiProvider, String(currentModel));
            const updatedUserData = { ...userData, apiUsage: updatedApiUsage };
            const updatedUsers = { ...users, [currentUser]: updatedUserData };
            setUsers(updatedUsers);
            userService.saveUsers(updatedUsers);
            console.log(`[TOKEN TRACKING] OpenAI: +${openaiResponse.inputTokens} input, +${openaiResponse.outputTokens} output tokens`);
          }
        }
      } else {
        // Claude or other providers (fallback)
        throw new Error(`Provider ${apiProvider} is not yet implemented for direct chat.`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      responseText = `Error: ${errMsg}`;
      addDebugEvent('gen_error', `Generation error → ${personality.name}`, errMsg);
      try {
        const refName = personality?.name || personalityId;
        addCliMessage(`[GEN][${refName}] ${errMsg}`, CliOutputType.ERROR);
      } catch {}
    }

    // Sanitize response text once for all uses
    const sanitized = sanitizeModelResponseText(responseText);
    
    // Handle chat history and CLI output (skip for converse mode as it's handled separately)
    if (source !== 'converse') {
      addDebugEvent('gen_response', `Generate done ← ${personality.name}`, `Len: ${responseText?.length ?? 0}` + (sanitized !== responseText ? ' (sanitized)' : ''), { preview: (sanitized || '').slice(0, 500) });
      const newAiMessage: ChatMessage = { author: MessageAuthor.AI, text: sanitized, timestamp: new Date().toISOString(), authorName };
      
      // For chess, update chess history instead of regular chat history
      if (source === 'chess') {
        setChessHistory(prev => [...prev, newAiMessage]);
      } else {
        // FIX: Use the passed-in `historyForApi` to prevent race conditions where the user's message is lost.
        saveChatHistory(personality.id, [...historyForApi, newAiMessage]);
      }
      
      if (cliFocusedPersonalityId === personalityId) {
          setCliHistory(prev => [...prev, {type: CliOutputType.AI_RESPONSE, text: sanitized, authorName: personality.name}]);
      } else {
          // Also add to CLI for non-focused personalities
          addCliMessage(sanitized, CliOutputType.AI_RESPONSE, personality.name);
      }
    }

    // Handle TTS for all sources (including converse)
    const sessionTts = options?.sessionTtsEnabled
        ?? windows.find(w => w.personalityId === personalityId)?.sessionTtsEnabled
        ?? personality.ttsEnabled
        ?? false;
    console.log(`[TTS DEBUG] ${personality.name}:`, {
      sessionTts,
      globalTtsEnabled,
      ttsProvider,
      personalityTtsEnabled: personality.ttsEnabled,
      windowSessionTts: windows.find(w => w.personalityId === personalityId)?.sessionTtsEnabled,
      optionsSessionTts: options?.sessionTtsEnabled,
      willSpeak: sessionTts && globalTtsEnabled
    });
    if (sessionTts && globalTtsEnabled) {
        const preferredGender = inferGender(personality);
        const googleOptsBase = ttsProvider === TtsProvider.GEMINI
          ? ensureGoogleTtsOptionsForGemini(personality, personality.config.googleTtsOptions, preferredGender)
          : personality.config.googleTtsOptions;
        const dyn = computeTtsDynamics(sanitized, currentMood);
        const googleOpts = ttsProvider === TtsProvider.GEMINI ? {
          ...googleOptsBase,
          speakingRate: Math.min(2.0, Math.max(0.5, (googleOptsBase?.speakingRate ?? 1.0) * dyn.rateFactor)),
          volumeGainDb: Math.max(-96, Math.min(10, (googleOptsBase?.volumeGainDb ?? 0) + dyn.volumeGainDb))
        } : googleOptsBase;
        addDebugEvent('tts_request', `TTS start → ${personality.name}`, `Provider: ${ttsProvider}`, { provider: ttsProvider, googleTts: googleOpts, voiceId: personality.config.voiceId, dynamics: dyn });
        ttsService.speak(sanitized, ttsProvider, {
            voiceId: personality.config.voiceId,
            additionalVoiceIds: personality.config.additionalVoiceIds,
            googleTtsOptions: googleOpts,
            elevenLabsApiKey,
            openaiApiKey: openaiTtsApiKey,
            geminiApiKey: geminiTtsApiKey,
            azureApiKey: azureTtsApiKey,
            playhtApiKey: playhtApiKey,
            playhtUserId: playhtUserId,
            rate: (personality.config.ttsRate ?? 1.0),
            emotion: personality.config.ttsEmotion || defaultEmotion || 'neutral',
            emotionIntensity: personality.config.ttsEmotionIntensity ?? emotionIntensity ?? 0.7,
            elevenLabsStability: personality.config.elevenLabsStability,
            elevenLabsSimilarityBoost: personality.config.elevenLabsSimilarityBoost,
            elevenLabsStyle: personality.config.elevenLabsStyle,
            elevenLabsSpeakerBoost: personality.config.elevenLabsSpeakerBoost,
        }, (message) => {
            if (currentUser) {
              const refName = personality?.name || personalityId;
              addCliMessage(`[TTS][${refName}] ${message}`, CliOutputType.ERROR);
            }
        }, {
            naturalPause: options?.naturalSpeech ?? false,
            fadeIn: options?.naturalSpeech ?? false,
            speakerId: personality.id,
            preferredGender: preferredGender ?? undefined,
            personality: { id: personality.id, name: personality.name, prompt: personality.prompt, knowledge: personality.knowledge },
            playbackRate: ttsProvider === TtsProvider.OPENAI ? dyn.rateFactor : undefined,
            volumeMultiplier: dyn.volumeMultiplier
        });
    }
    
    if(windowId) setIsLoading(null);
    return responseText;
  };

  // Function for personalities to send messages to other personalities autonomously
  const sendPersonalityMessage = useCallback(async (fromPersonalityId: string, toPersonalityId: string, message: string) => {
    const fromPersonality = activePersonalities.find(p => p.id === fromPersonalityId);
    const toPersonality = activePersonalities.find(p => p.id === toPersonalityId);
    
    if (!fromPersonality || !toPersonality) return;
    
    // Check if they can see each other (bidirectional check)
    const canCommunicate = fromPersonality.visiblePersonalityIds.includes(toPersonalityId) && 
                          toPersonality.visiblePersonalityIds.includes(fromPersonalityId);
    
    if (!canCommunicate) {
      addCliMessage(`[COMM] ${fromPersonality.name} tried to contact ${toPersonality.name} but they are not mutually linked`, CliOutputType.COMMUNICATION);
      return;
    }

    // Create message from the initiating personality
    const personalityMessage: ChatMessage = { 
      author: MessageAuthor.AI, 
      text: message, 
      timestamp: new Date().toISOString(),
      authorName: fromPersonality.name
    };
    
    // Add message to target personality's history
    const targetHistory = [...getChatHistory(toPersonalityId), personalityMessage];
    saveChatHistory(toPersonalityId, targetHistory);
    
    // Add message to sender's history too (so they remember what they said)
    const senderHistory = [...getChatHistory(fromPersonalityId), personalityMessage];
    saveChatHistory(fromPersonalityId, senderHistory);
    
    // Show in CLI
    addCliMessage(`[COMM] ${fromPersonality.name} → ${toPersonality.name}: ${message}`, CliOutputType.COMMUNICATION);
    
    // Track gang conversation for debug window
    if (experimentalSettings.gangsEnabled) {
      console.log('[GANGS] Tracking autonomous conversation:', fromPersonality.name, '→', toPersonality.name);
      addGangConversation(fromPersonalityId, fromPersonality.name, toPersonalityId, toPersonality.name, message);
    }
    
    // Track poverty conversation for debug window
    if (experimentalSettings.povertyEnabled) {
      console.log('[POVERTY] Tracking autonomous conversation:', fromPersonality.name, '→', toPersonality.name);
      addPovertyConversation(fromPersonalityId, fromPersonality.name, toPersonalityId, toPersonality.name, message);
    }

    // Simulate poverty day for both personalities if poverty mode is enabled (autonomous conversations)
    if (experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig) {
      console.log('[POVERTY DEBUG] Poverty mode enabled, simulating day for autonomous conversation participants');
      console.log('[POVERTY DEBUG] Source:', fromPersonality.name, 'Target:', toPersonality.name);
      console.log('[POVERTY DEBUG] Available personality statuses:', Object.keys(experimentalSettings.povertyConfig.personalityStatus));
      [fromPersonality, toPersonality].forEach(personality => {
        const currentStatus = experimentalSettings.povertyConfig!.personalityStatus[personality.id];
        console.log(`[POVERTY DEBUG] Checking ${personality.name} (${personality.id}) - has status: ${!!currentStatus}`);
        if (currentStatus) {
          console.log(`[POVERTY DEBUG] Running simulation for ${personality.name} (${personality.id})`);
          const { status: updatedStatus, event: povertyEvent, dwpPayment, pipPayment, pubVisit } = povertyService.simulateDay(
            experimentalSettings.povertyConfig!,
            currentStatus,
            activePersonalities
          );
          
          // Update the status
          setExperimentalSettings(prev => ({
            ...prev,
            povertyConfig: {
              ...prev.povertyConfig!,
              personalityStatus: {
                ...prev.povertyConfig!.personalityStatus,
                [personality.id]: updatedStatus
              }
            }
          }));
          
          // Track events
          if (povertyEvent) {
            console.log('[POVERTY]', povertyEvent.message);
            setPovertyEvents(prev => [...prev, povertyEvent]);
          }
          
          // Track DWP payment
          if (dwpPayment) {
            console.log(`[POVERTY DEBUG] Adding DWP payment to monitor: ${personality.name} - £${dwpPayment.amount} (${dwpPayment.status})`);
            addPovertyDwpPayment(personality.id, personality.name, dwpPayment.amount, dwpPayment.status);
          }
          
          // Track PIP payment
          if (pipPayment) {
            console.log(`[POVERTY DEBUG] Adding PIP payment to monitor: ${personality.name} - £${pipPayment.amount} (${pipPayment.status})`);
            addPovertyPipPayment(personality.id, personality.name, pipPayment.amount, pipPayment.status);
          }
          
          // Track pub visit
          if (pubVisit) {
            console.log(`[POVERTY DEBUG] Adding pub visit to monitor: ${personality.name} - ${pubVisit.activity}`);
            addPovertyPubVisit(personality.id, personality.name, pubVisit.activity);
          }
        } else {
          console.log(`[POVERTY DEBUG] ${personality.name} (${personality.id}) has no poverty status - skipping simulation`);
        }
      });
    } else {
      console.log(`[POVERTY DEBUG] Poverty mode disabled or not configured: enabled=${experimentalSettings.povertyEnabled}, config=${!!experimentalSettings.povertyConfig}`);
    }
    
    // Trigger TTS for the sender's message if TTS is enabled
    const sessionTts = windows.find(w => w.personalityId === fromPersonalityId)?.sessionTtsEnabled 
                      ?? fromPersonality.ttsEnabled 
                      ?? false;
    if (sessionTts && globalTtsEnabled) {
        const preferredGender = inferGender(fromPersonality);
        setTimeout(() => {
          const googleOptsBase = ttsProvider === TtsProvider.GEMINI
            ? ensureGoogleTtsOptionsForGemini(fromPersonality, fromPersonality.config.googleTtsOptions, preferredGender)
            : fromPersonality.config.googleTtsOptions;
          const dyn = computeTtsDynamics(message, currentMood);
          const googleOpts = ttsProvider === TtsProvider.GEMINI ? {
            ...googleOptsBase,
            speakingRate: Math.min(2.0, Math.max(0.5, (googleOptsBase?.speakingRate ?? 1.0) * dyn.rateFactor)),
            volumeGainDb: Math.max(-96, Math.min(10, (googleOptsBase?.volumeGainDb ?? 0) + dyn.volumeGainDb))
          } : googleOptsBase;
          addDebugEvent('tts_request', `TTS start → ${fromPersonality.name}`, `Provider: ${ttsProvider}`, { provider: ttsProvider, googleTts: googleOpts, voiceId: fromPersonality.config.voiceId, dynamics: dyn });
          ttsService.speak(message, ttsProvider, {
              voiceId: fromPersonality.config.voiceId,
              additionalVoiceIds: fromPersonality.config.additionalVoiceIds,
              googleTtsOptions: googleOpts,
              elevenLabsApiKey,
              openaiApiKey: openaiTtsApiKey,
              geminiApiKey: geminiTtsApiKey,
              azureApiKey: azureTtsApiKey,
              playhtApiKey: playhtApiKey,
              playhtUserId: playhtUserId,
              rate: (fromPersonality.config.ttsRate ?? 1.0),
              emotion: fromPersonality.config.ttsEmotion || defaultEmotion || 'neutral',
              emotionIntensity: fromPersonality.config.ttsEmotionIntensity ?? emotionIntensity ?? 0.7,
              elevenLabsStability: fromPersonality.config.elevenLabsStability,
              elevenLabsSimilarityBoost: fromPersonality.config.elevenLabsSimilarityBoost,
              elevenLabsStyle: fromPersonality.config.elevenLabsStyle,
              elevenLabsSpeakerBoost: fromPersonality.config.elevenLabsSpeakerBoost,
          }, (message) => {
              if (currentUser) {
                const refName = fromPersonality?.name || fromPersonalityId;
                addCliMessage(`[TTS][${refName}] ${message}`, CliOutputType.ERROR);
              }
          }, { 
              naturalPause: true, 
              fadeIn: true, 
              speakerId: fromPersonalityId, 
              preferredGender: preferredGender ?? undefined, 
              personality: { id: fromPersonality.id, name: fromPersonality.name, prompt: fromPersonality.prompt, knowledge: fromPersonality.knowledge } ,
              playbackRate: ttsProvider === TtsProvider.OPENAI ? dyn.rateFactor : undefined,
              volumeMultiplier: dyn.volumeMultiplier 
          });
        }, 100); // Small delay to avoid overlap
    }
    
    // If target personality has an open window, show the message there
    const targetWindow = windows.find(w => w.personalityId === toPersonalityId);
    if (targetWindow && targetWindow.status === WindowStatus.OPEN) {
      // The message will appear in their chat window automatically due to state update
    }
    
    // Now generate a response from the target personality
    setTimeout(async () => {
      const responsePrompt = `${fromPersonality.name} just sent you this message: "${message}". Please respond to them directly as if you're having a conversation. Stay in character and respond naturally.`;
      
      // NOTE: triggerAiResponse will automatically handle TTS if enabled, so we don't need to call it again here
      const response = await triggerAiResponse(toPersonalityId, targetHistory, responsePrompt, 'gui', toPersonality.name, {
        sessionTtsEnabled: windows.find(w => w.personalityId === toPersonalityId)?.sessionTtsEnabled ?? toPersonality.ttsEnabled,
        naturalSpeech: true
      });
      
      // The response will be automatically added to both histories by triggerAiResponse
      if (response && !response.startsWith('Error:')) {
        addCliMessage(`[COMM] ${toPersonality.name} → ${fromPersonality.name}: ${response}`, CliOutputType.COMMUNICATION);
        // TTS is already handled by triggerAiResponse - no need to call it again
      }
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds for natural feel
  }, [activePersonalities, windows, addCliMessage, getChatHistory, saveChatHistory]);

  // Function for personalities to autonomously decide to communicate
  const triggerAutonomousCommunication = useCallback(async (personalityId: string) => {
    const personality = activePersonalities.find(p => p.id === personalityId);
    if (!personality || personality.visiblePersonalityIds.length === 0) {
      console.log(`[AUTO-DEBUG] ${personality?.name || personalityId} has no visible personalities`);
      return;
    }
    
    // Get personalities this one can communicate with (bidirectional check)
    const availableTargets = personality.visiblePersonalityIds.filter(targetId => {
      const target = activePersonalities.find(p => p.id === targetId);
      return target && target.visiblePersonalityIds.includes(personalityId);
    });
    
    console.log(`[AUTO-DEBUG] ${personality.name} can communicate with ${availableTargets.length} personalities`);
    if (availableTargets.length === 0) return;
    
    // Use experimental settings for initiative probability (use ref to avoid recreating callback)
    const settings = experimentalSettingsRef.current;
    const personalityOverride = settings.personalityOverrides[personalityId];
    const initiativeProb = personalityOverride?.initiativeProbability ?? settings.defaultInitiativeProbability;
    
    if (Math.random() > initiativeProb) {
      console.log(`[AUTO-DEBUG] ${personality.name} decided not to communicate this time (initiative: ${(initiativeProb * 100).toFixed(0)}%)`);
      return;
    }
    
    // Apply target selection mode from experimental settings
    let targetId: string;
    if (settings.targetSelectionMode === 'affinity-based' && settings.enableRelationshipTracking) {
      // Choose target based on relationship affinity
      const relationships = settings.relationships[personalityId] || {};
      const targetsWithAffinity = availableTargets.map(tid => ({
        id: tid,
        affinity: relationships[tid]?.affinity ?? 0
      }));
      // Weighted random selection based on affinity (higher affinity = more likely)
      const weights = targetsWithAffinity.map(t => Math.max(0, t.affinity + 1)); // Convert -1 to 1 range to 0 to 2
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      let selectedIndex = 0;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          selectedIndex = i;
          break;
        }
      }
      targetId = targetsWithAffinity[selectedIndex].id;
    } else {
      // Random selection (default)
      targetId = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    }
    
    const target = activePersonalities.find(p => p.id === targetId);
    if (!target) return;
    
    console.log(`[AUTO-DEBUG] ${personality.name} will try to communicate with ${target.name}`);
    
    // Generate a message to send - use experimental context window size
    const contextSize = personalityOverride?.contextWindowSize ?? experimentalSettings.contextWindowSize;
    const recentHistory = getChatHistory(personalityId).slice(-Math.max(2, Math.floor(contextSize / 2)));
    const targetHistory = getChatHistory(targetId).slice(-Math.max(1, Math.floor(contextSize / 4)));
    
    const contextPrompt = `You have the ability to spontaneously communicate with ${target.name}. Based on your personality and any recent context, generate a brief message (1-2 sentences) you might want to send to them. This could be:
    - A greeting or check-in
    - A comment about something interesting
    - A question about their thoughts
    - A response to something they said recently
    - Just casual conversation
    
    Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud. Be natural and stay in character. Generate ONLY the message you want to send, nothing else.`;
    
    try {
      // Use 'converse' source to prevent duplicate TTS (sendPersonalityMessage will handle TTS)
      const messageToSend = await triggerAiResponse(personalityId, getChatHistory(personalityId), contextPrompt, 'converse', personality.name);
      
      if (messageToSend && !messageToSend.startsWith('Error:') && messageToSend.trim().length > 0) {
        // Send the message to the target personality (this will trigger TTS once)
        await sendPersonalityMessage(personalityId, targetId, messageToSend.trim());
      }
    } catch (error) {
      // Silently fail autonomous communication attempts
      console.log('Autonomous communication failed:', error);
    }
  }, [activePersonalities, getChatHistory, sendPersonalityMessage, triggerAiResponse]);

  // Gang Dynamics Update System
  useEffect(() => {
    if (!experimentalSettings.gangsEnabled) {
      return;
    }

    console.log('[GANGS] Gang dynamics update system started');

    // Update gang dynamics every 15 seconds (optimized for better performance)
    const updateInterval = setInterval(() => {
      // Skip if no active personalities to avoid unnecessary processing
      if (activePersonalities.length === 0) {
        console.log('[GANGS] Skipping update - no active personalities');
        return;
      }
      
      // Don't update during active conversations
      if (conversingPersonalityIds.length > 0) {
        console.log('[GANGS] Skipping update during conversation');
        return;
      }
      
      try {
        // Use the latest experimental settings from state
        setExperimentalSettings(prev => {
          try {
            if (!prev.gangsConfig) {
              console.log('[GANGS] No gang config found, skipping update');
              return prev;
            }
            
            // Don't update if user is actively changing settings
            if ((window as any).userSettingsChangeInProgress) {
              console.log('[GANGS] Skipping dynamics update - user settings change in progress');
              return prev;
            }
            
            // Optimized: Only update if there are gang members to process
            // Use the current activePersonalities from the ref to avoid stale closure issues
            const currentActivePersonalities = activePersonalitiesRef.current || [];
            if (currentActivePersonalities.length === 0) {
              console.log('[GANGS] No active personalities, skipping update');
              return prev;
            }
            
            const activePersonalityIds = new Set(currentActivePersonalities.map(p => p.id));
            const hasActiveGangMembers = Object.entries(prev.gangsConfig.memberStatus || {}).some(([id, status]) => 
              status && status.gangId && activePersonalityIds.has(id)
            );
            
            if (!hasActiveGangMembers) {
              console.log('[GANGS] Skipping update - no active gang members');
              return prev;
            }
            
            const updatedConfig = gangService.updateGangDynamics(prev.gangsConfig, 15000);

          // Optimized: Use cached personality name registry instead of rebuilding
          const personalityNamesMap = personalityNameRegistryRef.current;

          const generatedEvents = ((updatedConfig as any)._generatedEvents || []) as Array<{ type: GangEvent['type']; message: string; involvedIds?: string[] }>;
          generatedEvents.forEach(event => {
            let eventMessage = event.message;
            // Optimized: Use cached name registry instead of iterating activePersonalities
            Object.entries(personalityNamesMap || {}).forEach(([id, name]) => {
              if (eventMessage && id && name && eventMessage.includes(id)) {
                eventMessage = eventMessage.replace(new RegExp(id, 'g'), name);
              }
            });

            const involvedIds = event.involvedIds && event.involvedIds.length > 0
              ? event.involvedIds
              : Object.keys(personalityNamesMap || {}).filter(id => {
                  const name = personalityNamesMap[id];
                  return name && eventMessage && eventMessage.includes(name);
                });

            addGangEvent(event.type, eventMessage, involvedIds.length > 0 ? involvedIds : undefined);
            recordDrugTransactionFromMessage(eventMessage, involvedIds.length > 0 ? involvedIds : undefined);
          });
          delete (updatedConfig as any)._generatedEvents;

          // Check for released personalities
          const releasedPersonalities = (updatedConfig as any)._releasedPersonalities || [];
          releasedPersonalities.forEach((personalityId: string) => {
            const personality = activePersonalities.find(p => p.id === personalityId);
            const message = `🔓 ${personality?.name || personalityId} released from solitary confinement`;
            addGangEvent('released', message, [personalityId]);
          });
          delete (updatedConfig as any)._releasedPersonalities;

          // Trigger random gang events
          const activeIds = activePersonalities.map(p => p.id);
          const eventResult = gangService.triggerRandomGangEvent(updatedConfig, activeIds, personalityNamesMap);
          
          if (eventResult.event) {
            // Replace all personality IDs with names in the event message
            let eventMessage = eventResult.event;
            activePersonalities.forEach(p => {
              eventMessage = eventMessage.replace(new RegExp(p.id, 'g'), p.name);
            });
            
            console.log('[GANGS] Random event:', eventMessage);
            
            // Determine event type from message
            const eventType: GangEvent['type'] = 
              eventMessage.includes('DEATH') || eventMessage.includes('KILLED') ? 'death' :
              eventMessage.includes('VIOLENCE') ? 'violence' :
              eventMessage.includes('GANG MERGER') ? 'merger' :
              eventMessage.includes('recruited') || eventMessage.includes('RECRUITMENT') ? 'recruitment' :
              'territory';
            
            // Extract involved personality IDs from the event
            const involvedIds = activeIds.filter(id => {
              const name = personalityNamesMap[id];
              return name && eventMessage.includes(name);
            });
            
            addGangEvent(eventType, eventMessage, involvedIds.length > 0 ? involvedIds : undefined);
            recordDrugTransactionFromMessage(eventMessage, involvedIds);

            // Track weapon stolen as separate event if it happened
            if (eventMessage.includes('stole') && (eventMessage.includes('weapon') || eventMessage.includes('Shank') || eventMessage.includes('Chain') || eventMessage.includes('Pistol'))) {
              const weaponMatch = eventMessage.match(/stole ([^!]+)/i);
              if (weaponMatch && involvedIds.length >= 2) {
                addGangEvent('weapon_stolen', `🔪 Weapon stolen: ${weaponMatch[1]}`, involvedIds);
              }
            }
            
          setCliHistory(prevHistory => [...prevHistory, {
              type: CliOutputType.RESPONSE,
              text: eventMessage
            }]);
            
            // Handle death from random events
            if ((eventResult as any).killedPersonalityId) {
              const killedId = (eventResult as any).killedPersonalityId;
              const killedPersonality = activePersonalities.find(p => p.id === killedId);
              console.log(`💀 [GANGS] Personality killed in random event: ${killedPersonality?.name || killedId}`);
              
              // Add to killed tracking for persistent death masks
              setKilledInGangSession(prev => new Set([...prev, killedId]));
              
              // Close their window if open
              const killedWindow = windows.find(w => w.personalityId === killedId);
              if (killedWindow) {
                closeWindow(killedWindow.id);
              }
              
              // Keep personality in system but marked as killed (shows as "unloaded" in slot)
              setTimeout(() => {
                addCliMessage(`💀 ${killedPersonality?.name || killedId} has been KILLED. They remain in your slots but are unloaded. Click to reload.`, CliOutputType.ERROR);
              }, 2000);
            }
          }
          
          // Return updated settings without triggering infinite loop
          return {
            ...prev,
            gangsConfig: eventResult.config
          };
          } catch (innerError) {
            console.error('[GANGS] Error in gang dynamics update:', innerError);
            return prev; // Return previous state on error to prevent crash
          }
        });
      } catch (error) {
        console.error('[GANGS] Error updating gang dynamics:', error);
      }
    }, 15000); // Optimized: 15 seconds for better performance

    return () => {
      console.log('[GANGS] Gang dynamics update system stopped');
      clearInterval(updateInterval);
    };
  }, [experimentalSettings.gangsEnabled]);

  // Handle poverty mode background switching and initialize personality status
  useEffect(() => {
    if (experimentalSettings.povertyEnabled && desktopBackground !== 'poverty.png') {
      console.log('[POVERTY] Poverty mode enabled - switching background to poverty.png');
      setDesktopBackground('poverty.png');
      localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'poverty.png');
      
      // Initialize poverty status for all active personalities
      setExperimentalSettings(prev => {
        if (!prev.povertyConfig) return prev;
        
        const newPersonalityStatus = { ...prev.povertyConfig.personalityStatus };
        
        // Initialize poverty status for any personality that doesn't have it yet
        activePersonalities.forEach(personality => {
          if (!newPersonalityStatus[personality.id]) {
            newPersonalityStatus[personality.id] = povertyService.initializePersonalityStatus(personality.id);
            console.log(`[POVERTY] Initialized status for ${personality.name} with £100`);
          }
        });
        
        return {
          ...prev,
          povertyConfig: {
            ...prev.povertyConfig,
            personalityStatus: newPersonalityStatus
          }
        };
      });
    } else if (!experimentalSettings.povertyEnabled && desktopBackground === 'poverty.png') {
      console.log('[POVERTY] Poverty mode disabled - switching background back to background.png');
      setDesktopBackground('background.png');
      localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'background.png');
    }
  }, [experimentalSettings.povertyEnabled, activePersonalities]);

  // Autonomous communication system - personalities can spontaneously communicate
  useEffect(() => {
    if (!autonomousCommunicationEnabled || activePersonalities.length < 2) {
      console.log(`[AUTO-DEBUG] Autonomous communication disabled or insufficient personalities. Enabled: ${autonomousCommunicationEnabled}, Count: ${activePersonalities.length}`);
      return;
    }
    
    console.log(`[AUTO-DEBUG] Starting autonomous communication system with ${activePersonalities.length} personalities`);
    
    // Apply communication frequency pattern from experimental settings
    const settings = experimentalSettingsRef.current;
    let intervalTime = 5000 + Math.random() * 5000; // Default: 5-10 seconds
    switch (settings.communicationFrequencyPattern) {
      case 'constant':
        intervalTime = 5000 + Math.random() * 5000; // 5-10 seconds
        break;
      case 'bursty':
        // Longer intervals with occasional bursts
        intervalTime = 10000 + Math.random() * 20000; // 10-30 seconds
        break;
      case 'circadian':
        // Vary based on time of day (simplified)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) {
          intervalTime = 3000 + Math.random() * 4000; // More active during "work hours"
        } else {
          intervalTime = 15000 + Math.random() * 15000; // Less active otherwise
        }
        break;
      case 'event-driven':
        // Respond to conversation triggers (longer base interval)
        intervalTime = 15000 + Math.random() * 15000; // 15-30 seconds
        break;
    }
    
    const checkInterval = setInterval(() => {
      // Don't interrupt ongoing conversations
      if (conversingPersonalityIds.length > 0) {
        console.log(`[AUTO-DEBUG] Skipping autonomous check - conversation in progress`);
        return;
      }
      
      console.log(`[AUTO-DEBUG] Checking autonomous communication opportunities...`);
      // Randomly select a personality to potentially initiate communication
      const initiator = activePersonalities[Math.floor(Math.random() * activePersonalities.length)];
      console.log(`[AUTO-DEBUG] Selected ${initiator.name} as potential initiator`);
      triggerAutonomousCommunication(initiator.id);
    }, intervalTime);
    
    return () => clearInterval(checkInterval);
  }, [autonomousCommunicationEnabled, activePersonalities.length, conversingPersonalityIds.length]); // Optimized: Use lengths instead of full arrays

  // Poverty Simulation Advancement System - Every 20 seconds = 1 day out of 90
  useEffect(() => {
    if (!experimentalSettings.povertyEnabled || !experimentalSettings.povertyConfig) {
      return;
    }

    console.log('[POVERTY] Starting simulation advancement system (20 seconds = 1 day)');

    const advanceInterval = setInterval(() => {
      if (activePersonalities.length === 0) {
        console.log('[POVERTY] Skipping advancement - no active personalities');
        return;
      }

      // Don't advance during active conversations
      if (conversingPersonalityIds.length > 0) {
        console.log('[POVERTY] Skipping advancement during conversation');
        return;
      }

      try {
        setExperimentalSettings(prev => {
          if (!prev.povertyConfig) return prev;

          const newConfig = { ...prev.povertyConfig };
          
          // Advance simulation day
          newConfig.currentSimulationDay += 1;
          
          // Process random events and ejections
          const { events, ejectedPersonalities } = povertyService.processRandomEvents(
            newConfig,
            activePersonalities
          );

          // Add events to the poverty events list
          if (events.length > 0) {
            console.log(`[POVERTY] Generated ${events.length} random events`);
            setPovertyEvents(prev => [...prev, ...events]);
          }

          // Handle ejected personalities - no additional action needed as processRandomEvents already updated status
          ejectedPersonalities.forEach(ejectedId => {
            const status = newConfig.personalityStatus[ejectedId];
            if (status) {
              console.log(`[POVERTY] ${status.personalityId} ejected - reason: ${status.ejectionReason}`);
            }
          });
          
          // Check if we've reached the end of the 90-day simulation
          if (newConfig.currentSimulationDay >= newConfig.povertyDurationDays) {
            console.log(`[POVERTY] Simulation complete! Reached day ${newConfig.currentSimulationDay} of ${newConfig.povertyDurationDays}`);
            // Reset or handle completion as needed
            newConfig.currentSimulationDay = 0;
          }

          console.log(`[POVERTY] Advanced to day ${newConfig.currentSimulationDay} of ${newConfig.povertyDurationDays}`);

          return {
            ...prev,
            povertyConfig: newConfig
          };
        });
      } catch (error) {
        console.error('[POVERTY] Error advancing simulation:', error);
      }
    }, 20000); // 20 seconds = 1 day

    return () => {
      console.log('[POVERTY] Simulation advancement system stopped');
      clearInterval(advanceInterval);
    };
  }, [experimentalSettings.povertyEnabled, activePersonalities.length, conversingPersonalityIds.length]);

  const handleAiConversation = async (
    sourceId: string,
    targetId: string,
    initialMessage: string,
    options?: { maxTurns?: number; topicHint?: string }
  ) => {
    const { maxTurns = 3, topicHint } = options ?? {};
    const source = activePersonalities.find(p => p.id === sourceId);
    const target = activePersonalities.find(p => p.id === targetId);
    if (!source || !target) return;
    
    // Check if either personality is killed in gang mode
    if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
      const sourceStatus = experimentalSettings.gangsConfig.memberStatus[sourceId];
      const targetStatus = experimentalSettings.gangsConfig.memberStatus[targetId];
      
      if (sourceStatus?.killed || killedInGangSession.has(sourceId)) {
        addCliMessage(`❌ ${source.name} is DEAD and cannot converse.`, CliOutputType.ERROR);
        return;
      }
      if (targetStatus?.killed || killedInGangSession.has(targetId)) {
        addCliMessage(`❌ ${target.name} is DEAD and cannot converse.`, CliOutputType.ERROR);
        return;
      }
    }

    // Check if either personality is ejected in poverty mode
    if (experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig) {
      const sourcePovertyStatus = experimentalSettings.povertyConfig.personalityStatus[sourceId];
      const targetPovertyStatus = experimentalSettings.povertyConfig.personalityStatus[targetId];
      
      if (sourcePovertyStatus?.ejectedFromSimulation) {
        const reason = sourcePovertyStatus.ejectionReason === 'homeless' ? 'EJECTED (homeless)' : 'EJECTED (success)';
        addCliMessage(`❌ ${source.name} has been ${reason} and cannot converse.`, CliOutputType.ERROR);
        return;
      }
      if (targetPovertyStatus?.ejectedFromSimulation) {
        const reason = targetPovertyStatus.ejectionReason === 'homeless' ? 'EJECTED (homeless)' : 'EJECTED (success)';
        addCliMessage(`❌ ${target.name} has been ${reason} and cannot converse.`, CliOutputType.ERROR);
        return;
      }
    }

    setConversingPersonalityIds([sourceId, targetId]);
    
    // Disable autonomous communication during conversation
    const originalAutonomousState = autonomousCommunicationEnabled;
    setAutonomousCommunicationEnabled(false);

    const addMessageToBoth = (message: ChatMessage) => {
        // Use a functional update to ensure we're working with the latest state
        // and correctly update chat histories for both participants.
        const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
            const newHistories = {...currentHistories};
            const sourceHistory = currentHistories[sourceId] || getChatHistory(sourceId);
            const targetHistory = currentHistories[targetId] || getChatHistory(targetId);
            newHistories[sourceId] = [...sourceHistory, message];
            newHistories[targetId] = [...targetHistory, message];
            if(currentUser) {
                saveChatHistory(sourceId, newHistories[sourceId]);
                saveChatHistory(targetId, newHistories[targetId]);
            }
            return newHistories;
        };
        
        // This pattern of using a functional update with setSessionHistories ensures
        // that even rapid, looped updates to the chat history are correctly rendered.
        setSessionHistories(prev => updateHistories(prev));
        
        // Add conversation messages to CLI history
        if (message.author === MessageAuthor.AI && message.authorName) {
          setCliHistory(prev => [...prev, {type: CliOutputType.AI_RESPONSE, text: message.text, authorName: message.authorName}]);
        } else if (message.author === MessageAuthor.SYSTEM) {
          setCliHistory(prev => [...prev, {type: CliOutputType.COMMUNICATION, text: message.text}]);
        }
    };

    // Use forced topic from experimental settings if set, otherwise use provided topic hint
    // When poverty mode is enabled, use a random poverty topic
    let effectiveTopic = experimentalSettings.forcedTopic?.trim() || topicHint?.trim() || '';
    if (experimentalSettings.povertyEnabled && !experimentalSettings.forcedTopic?.trim() && !topicHint?.trim()) {
      effectiveTopic = povertyService.getRandomPovertyTopic();
    }
    console.log('[FORCED TOPIC DEBUG] forcedTopic:', experimentalSettings.forcedTopic, 'topicHint:', topicHint, 'effectiveTopic:', effectiveTopic, 'povertyMode:', experimentalSettings.povertyEnabled);
    
    // Update current conversation topic for CLI status line
    setCurrentConversationTopic(effectiveTopic || null);
    
    const topicMessage = effectiveTopic 
      ? `Conversation started between ${source.name} and ${target.name}. Topic: ${effectiveTopic}${experimentalSettings.forcedTopic?.trim() ? ' (FORCED FROM EXPERIMENTAL SETTINGS)' : ''}`
      : `Conversation started between ${source.name} and ${target.name}.`;
    
    addMessageToBoth({ author: MessageAuthor.SYSTEM, text: topicMessage, timestamp: new Date().toISOString() });

    let currentMessage = initialMessage;
    let speaker = source;
    let listener = target;
    const topicFocus = effectiveTopic;

    // Track initial message
    if (experimentalSettings.gangsEnabled && initialMessage) {
      console.log('[GANGS] Tracking initial 2-person message:', source.name, '→', target.name);
      addGangConversation(source.id, source.name, target.id, target.name, initialMessage);
    }
    
    if (experimentalSettings.povertyEnabled && initialMessage) {
      console.log('[POVERTY] Tracking initial 2-person message:', source.name, '→', target.name);
      addPovertyConversation(source.id, source.name, target.id, target.name, initialMessage);
    }

    for (let i = 0; i < maxTurns * 2; i++) {
        // Check if conversation was interrupted
        if (conversingPersonalityIds.length === 0) {
          console.log('Two-person conversation was stopped, breaking loop');
          break;
        }

        addMessageToBoth({ author: MessageAuthor.AI, text: currentMessage, timestamp: new Date().toISOString(), authorName: speaker.name });

        // Process gang interactions if gangs are enabled
        if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
          try {
            const gangInteractionResult = gangService.processGangInteraction(
              experimentalSettings.gangsConfig,
              speaker.id,
              listener.id,
              currentMessage,
              speaker.name,
              listener.name
            );
            
            // Record conversation for gang debug monitor
            addGangConversation(
              speaker.id,
              speaker.name,
              listener.id,
              listener.name,
              currentMessage
            );
            
            // Record conversation for poverty debug monitor
            if (experimentalSettings.povertyEnabled) {
              addPovertyConversation(
                speaker.id,
                speaker.name,
                listener.id,
                listener.name,
                currentMessage
              );
            }
            
          if (gangInteractionResult.event) {
            // Replace personality IDs with names in the event message
            let eventMessage = gangInteractionResult.event;
            eventMessage = eventMessage.replace(new RegExp(speaker.id, 'g'), speaker.name);
            eventMessage = eventMessage.replace(new RegExp(listener.id, 'g'), listener.name);
            
            console.log('[GANGS]', eventMessage);
            
            // Determine event type from message
            const eventType: GangEvent['type'] = 
              eventMessage.includes('DEATH') || eventMessage.includes('KILLED') ? 'death' :
              eventMessage.includes('VIOLENCE') ? 'violence' :
              eventMessage.includes('GANG MERGER') ? 'merger' :
              eventMessage.includes('RECRUITMENT') || eventMessage.includes('recruited') ? 'recruitment' :
              eventMessage.includes('SOLITARY') ? 'imprisoned' :
              'join';
            
            addGangEvent(eventType, eventMessage, [speaker.id, listener.id]);
            
            // Track weapon stolen as separate event if it happened
            if (eventMessage.includes('stole') && (eventMessage.includes('weapon') || eventMessage.includes('Shank') || eventMessage.includes('Chain') || eventMessage.includes('Pistol'))) {
              const weaponMatch = eventMessage.match(/stole ([^!]+)/i);
              if (weaponMatch) {
                addGangEvent('weapon_stolen', `🔪 ${speaker.name} stole ${weaponMatch[1]} from ${listener.name}`, [speaker.id, listener.id]);
              }
            }
            
            setCliHistory(prev => [...prev, {
              type: CliOutputType.RESPONSE,
              text: eventMessage
            }]);
            addMessageToBoth({ 
              author: MessageAuthor.SYSTEM, 
              text: eventMessage, 
              timestamp: new Date().toISOString() 
            });
            
            // Handle death - remove killed personality
            if ((gangInteractionResult as any).killedPersonalityId) {
              const killedId = (gangInteractionResult as any).killedPersonalityId;
              const killedPersonality = activePersonalities.find(p => p.id === killedId);
              console.log(`💀 [GANGS] Personality killed: ${killedPersonality?.name || killedId}`);
              
              // Add to killed tracking for persistent death masks
              setKilledInGangSession(prev => new Set([...prev, killedId]));
              
              // Close their window if open
              const killedWindow = windows.find(w => w.personalityId === killedId);
              if (killedWindow) {
                closeWindow(killedWindow.id);
              }
              
              // Keep personality in system but marked as killed (shows as "unloaded" in slot)
              setTimeout(() => {
                addCliMessage(`💀 ${killedPersonality?.name || killedId} has been KILLED. They remain in your slots but are unloaded. Click to reload.`, CliOutputType.ERROR);
              }, 2000); // 2 second delay so message is seen first
            }
          }
          
          // Update gang config with changes
          setExperimentalSettings(prev => ({
            ...prev,
            gangsConfig: gangInteractionResult.config
          }));
          } catch (error) {
            console.error('[GANGS] Error processing gang interaction:', error);
          }
        }

        // Simulate poverty day for both personalities if poverty mode is enabled
        if (experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig) {
          console.log('[POVERTY DEBUG] Poverty mode enabled, simulating day for conversation participants');
          console.log('[POVERTY DEBUG] Source:', source.name, 'Target:', target.name);
          console.log('[POVERTY DEBUG] Available personality statuses:', Object.keys(experimentalSettings.povertyConfig.personalityStatus));
          [source, target].forEach(personality => {
            const currentStatus = experimentalSettings.povertyConfig!.personalityStatus[personality.id];
            console.log(`[POVERTY DEBUG] Checking ${personality.name} (${personality.id}) - has status: ${!!currentStatus}`);
            if (currentStatus) {
              console.log(`[POVERTY DEBUG] Running simulation for ${personality.name} (${personality.id})`);
              const { status: updatedStatus, event: povertyEvent, dwpPayment, pipPayment, pubVisit } = povertyService.simulateDay(
                experimentalSettings.povertyConfig!,
                currentStatus,
                activePersonalities
              );
              
              // Update the status
              setExperimentalSettings(prev => ({
                ...prev,
                povertyConfig: {
                  ...prev.povertyConfig!,
                  personalityStatus: {
                    ...prev.povertyConfig!.personalityStatus,
                    [personality.id]: updatedStatus
                  }
                }
              }));
              
              // Log poverty event if one occurred
              if (povertyEvent) {
                console.log('[POVERTY]', povertyEvent.message);
                setPovertyEvents(prev => [...prev, povertyEvent]);
              }
              
              // Track DWP payment
              if (dwpPayment) {
                console.log(`[POVERTY DEBUG] Adding DWP payment to monitor: ${personality.name} - £${dwpPayment.amount} (${dwpPayment.status})`);
                addPovertyDwpPayment(personality.id, personality.name, dwpPayment.amount, dwpPayment.status);
              }
              
              // Track PIP payment
              if (pipPayment) {
                console.log(`[POVERTY DEBUG] Adding PIP payment to monitor: ${personality.name} - £${pipPayment.amount} (${pipPayment.status})`);
                addPovertyPipPayment(personality.id, personality.name, pipPayment.amount, pipPayment.status);
              }
              
              // Track pub visit
              if (pubVisit) {
                console.log(`[POVERTY DEBUG] Adding pub visit to monitor: ${personality.name} - ${pubVisit.activity}`);
                addPovertyPubVisit(personality.id, personality.name, pubVisit.activity);
              }
            } else {
              console.log(`[POVERTY DEBUG] ${personality.name} (${personality.id}) has no poverty status - skipping simulation`);
            }
          });
        } else {
          console.log(`[POVERTY DEBUG] Poverty mode disabled or not configured: enabled=${experimentalSettings.povertyEnabled}, config=${!!experimentalSettings.povertyConfig}`);
        }

        // Apply experimental settings for verbosity
        const listenerOverride = experimentalSettings.personalityOverrides[listener.id];
        const verbosityMultiplier = listenerOverride?.baseVerbosity ?? experimentalSettings.defaultVerbosity;
        const lengthPrompt = getConversationLengthPrompt(conversationLength, verbosityMultiplier);
        
        const listenerHistory = getChatHistory(listener.id);
        // Use experimental context window size or personality override
        const contextSize = listenerOverride?.contextWindowSize ?? experimentalSettings.contextWindowSize;
        const formattedHistory = listenerHistory
          .slice(-contextSize)
          .filter(msg => msg.author !== MessageAuthor.SYSTEM && msg.text.trim().length > 0)
          .map(msg => {
            const label = msg.authorName
              || (msg.author === MessageAuthor.USER ? (currentUser || 'User')
              : msg.author === MessageAuthor.SYSTEM ? 'System'
              : 'AI');
            return `${label}: ${msg.text}`;
          })
          .join('\n');
        const contextSection = formattedHistory ? `Recent conversation context:\n${formattedHistory}\n\n` : '';
        
        // Apply topic drift allowance from experimental settings
        const driftLevel = experimentalSettings.topicDriftAllowance;
        let topicInstruction = '';
        if (topicFocus) {
          if (driftLevel < 0.3) {
            topicInstruction = `You MUST discuss "${topicFocus}" in your response. Keep the exchange strictly focused on "${topicFocus}" and build directly on what was just said.`;
          } else if (driftLevel < 0.7) {
            topicInstruction = `Your response should relate to "${topicFocus}". Keep the discussion generally related to "${topicFocus}", but you can explore related ideas.`;
          } else {
            topicInstruction = `"${topicFocus}" is the starting point, but feel free to let the conversation evolve naturally.`;
          }
        } else {
          topicInstruction = 'Keep building naturally on the current exchange.';
        }
        
        // Enhanced anti-repetition with recent phrase tracking
        const recentSpeakerMessages = listenerHistory
          .filter(msg => msg.authorName === listener.name)
          .slice(-3)
          .map(msg => msg.text);
        
        const recentPhrasesWarning = recentSpeakerMessages.length > 0
          ? `\n\nYour recent responses included: ${recentSpeakerMessages.map(m => `"${m.substring(0, 60)}..."`).join(', ')}. DO NOT use similar opening phrases, sentence structures, or ideas. Be completely different this time.`
          : '';
        
        const noRepeatInstruction = `CRITICAL ANTI-REPETITION RULE: You MUST NOT repeat yourself. Do not:
- Use the same opening phrase or sentence structure as your previous responses
- Restate points you've already made
- Use similar phrasing or word choices from earlier
- Start sentences the same way
Instead, you MUST:
- Begin your response in a completely different way
- Introduce genuinely new ideas, angles, or perspectives
- Use varied sentence structures and vocabulary
- Be spontaneous and unpredictable${recentPhrasesWarning}`;
        
        const diversityPrompt = experimentalSettings.selfAwareness > 0.5 
          ? '\n\nBe self-aware: if you notice yourself falling into patterns, break them intentionally.'
          : '';
        
        // Add metacommunication if enabled
        const metaInstruction = experimentalSettings.enableMetacommunication
          ? ' If the conversation feels stuck or unclear, you can briefly acknowledge that.'
          : '';
        
        const promptForListener = `${contextSection}You are in a direct conversation with ${speaker.name}. ${topicInstruction}

${noRepeatInstruction}${diversityPrompt}${metaInstruction}

Speak in first person only - no action descriptions, no asterisks, no third-person narration. ${lengthPrompt}

${speaker.name}: "${currentMessage}"`;
        
        console.log(`[CONVERSATION DEBUG - 2-PERSON] ${listener.name} responding. Topic: "${topicFocus}". Drift level: ${driftLevel}`);

        // Wait for any ongoing TTS to finish before starting next speaker
        await ttsService.waitForSpeechToComplete();
        
        // Check again if conversation is still active
        if (conversingPersonalityIds.length === 0) {
          console.log('Two-person conversation was stopped during TTS wait, breaking loop');
          break;
        }
        
        // Apply thinking time variance from experimental settings
        const baseThinkingTime = 600;
        const thinkingVariance = experimentalSettings.thinkingTimeVariance ? (Math.random() * 800) : 400;
        const silenceTolerance = experimentalSettings.silenceTolerance;
        const pauseDuration = Math.min(baseThinkingTime + thinkingVariance, silenceTolerance);
        await new Promise(res => setTimeout(res, pauseDuration));

        // Set current speaker for visual indication
        setCurrentSpeakerId(listener.id);
        setShouldSkipToNext(false); // Reset skip flag

        const response = await triggerAiResponse(listener.id, getChatHistory(listener.id), promptForListener, 'converse', listener.name, { naturalSpeech: true });
        
        // Track gang conversation IMMEDIATELY after getting response
        console.log('[GANGS] Checking 2-person tracking. Enabled:', experimentalSettings.gangsEnabled);
        if (experimentalSettings.gangsEnabled && response) {
          console.log('[GANGS] Tracking 2-person conversation:', listener.name, '→', speaker.name);
          addGangConversation(listener.id, listener.name, speaker.id, speaker.name, response);
        }
        
        // Track poverty conversation IMMEDIATELY after getting response
        if (experimentalSettings.povertyEnabled && response) {
          console.log('[POVERTY] Tracking 2-person conversation:', listener.name, '→', speaker.name);
          addPovertyConversation(listener.id, listener.name, speaker.id, speaker.name, response);
        }
        
        // Wait longer for the TTS to start properly
        await new Promise(res => setTimeout(res, 300));
        
        // Wait for TTS to complete OR for user to press spacebar to skip
        await Promise.race([
          ttsService.waitForSpeechToComplete(),
          new Promise<void>((resolve) => {
            const checkSkip = () => {
              if (shouldSkipToNext || conversingPersonalityIds.length === 0) {
                ttsService.cancel(true); // Stop current TTS with fade
                resolve();
              } else {
                setTimeout(checkSkip, 100);
              }
            };
            checkSkip();
          })
        ]);
        
        // Small gap after speech
        await new Promise(res => setTimeout(res, 200));
        
        // Clear current speaker when done
        setCurrentSpeakerId(null);
        
        currentMessage = response;
        
        [speaker, listener] = [listener, speaker];
    }
    
    // Only add end message if conversation actually completed
    if (conversingPersonalityIds.length > 0) {
      addMessageToBoth({ author: MessageAuthor.SYSTEM, text: "Conversation ended.", timestamp: new Date().toISOString() });
    }
    
    // Clean up conversation state
    setConversingPersonalityIds([]);
    setCurrentSpeakerId(null);
    setShouldSkipToNext(false);
    
    // Restore original autonomous communication state
    setAutonomousCommunicationEnabled(originalAutonomousState);
  };

  const handleRepeatAt = async (personalityId: string, messageIndex: number) => {
    const history = getChatHistory(personalityId);
    const idx = Math.min(messageIndex, history.length - 1);
    if (idx < 0) return;
    // Find last USER message at or before idx
    let lastUserIdx = -1;
    for (let i = idx; i >= 0; i--) {
      if (history[i].author === MessageAuthor.USER) { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) {
      addCliMessage('Error: No prior user message to regenerate from.', CliOutputType.ERROR);
      return;
    }
    const historyForApi = [...history.slice(0, lastUserIdx), history[lastUserIdx]];
    saveChatHistory(personalityId, historyForApi);
    await triggerAiResponse(personalityId, historyForApi, history[lastUserIdx].text, 'gui');
  };

  const handleGroupConversation = async (topic: string, maxRounds = 3) => {
    let participants = activePersonalities.filter(p => p.id); // All active personalities
    
    // Filter out dead gang members
    if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
      participants = participants.filter(p => {
        const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
        const isDead = status?.killed || killedInGangSession.has(p.id);
        if (isDead) {
          console.log(`[GANGS] Excluding dead member ${p.name} from group conversation`);
        }
        return !isDead;
      });
    }
    
    if (participants.length < 2) {
      addCliMessage('Not enough living personalities for a group conversation.', CliOutputType.ERROR);
      return;
    }

    const participantIds = participants.map(p => p.id);
    setConversingPersonalityIds(participantIds);

    const addMessageToAll = (message: ChatMessage) => {
        const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
            const newHistories = {...currentHistories};
            participantIds.forEach(id => {
                const history = currentHistories[id] || getChatHistory(id);
                newHistories[id] = [...history, message];
                if(currentUser) {
                    saveChatHistory(id, newHistories[id]);
                }
            });
            return newHistories;
        };
        
        setSessionHistories(prev => updateHistories(prev));
        
        // Add conversation messages to CLI history
        if (message.author === MessageAuthor.AI && message.authorName) {
          setCliHistory(prev => [...prev, {type: CliOutputType.AI_RESPONSE, text: message.text, authorName: message.authorName}]);
        } else if (message.author === MessageAuthor.SYSTEM) {
          setCliHistory(prev => [...prev, {type: CliOutputType.COMMUNICATION, text: message.text}]);
        }
    };

    const participantNames = participants.map(p => p.name).join(', ');
    addMessageToAll({ 
      author: MessageAuthor.SYSTEM, 
      text: `Group conversation started with: ${participantNames}. Topic: ${topic}`, 
      timestamp: new Date().toISOString() 
    });

    // Start with the first personality introducing the topic
    let currentSpeaker = participants[0];
    let initialMessage = topic || "Let's have a group discussion.";
    
    for (let round = 0; round < maxRounds; round++) {
      // Each personality gets to speak once per round
      for (let speakerIndex = 0; speakerIndex < participants.length; speakerIndex++) {
        currentSpeaker = participants[speakerIndex];
        
        // Build context of recent conversation for this speaker
        const recentHistory = getChatHistory(currentSpeaker.id).slice(-6); // Reduced from -10 to -6 for context length
        const otherParticipants = participants.filter(p => p.id !== currentSpeaker.id).map(p => p.name).join(', ');
        
        let prompt: string;
        if (round === 0 && speakerIndex === 0) {
          // First speaker introduces the topic
          prompt = `You are in a group conversation with ${otherParticipants}. Please introduce the topic and share your thoughts: "${initialMessage}". Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.`;
        } else {
          // Subsequent speakers respond to the ongoing conversation
          prompt = `You are in a group conversation with ${otherParticipants}. Based on what has been said so far, please contribute your thoughts to the discussion. Stay in character and engage naturally with the group. Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.`;
        }

        await new Promise(res => setTimeout(res, 500)); // Reduced delay between speakers

        const response = await triggerAiResponse(currentSpeaker.id, getChatHistory(currentSpeaker.id), prompt, 'converse', currentSpeaker.name);
        
        // Add the response to all participants' histories
        addMessageToAll({ 
          author: MessageAuthor.AI, 
          text: response, 
          timestamp: new Date().toISOString(), 
          authorName: currentSpeaker.name 
        });
      }
    }
    
    addMessageToAll({ 
      author: MessageAuthor.SYSTEM, 
      text: "Group conversation ended.", 
      timestamp: new Date().toISOString() 
    });
    setConversingPersonalityIds([]);
  };

  const handleMultiPersonConversation = async (participants: Personality[], topic: string, maxRounds = 3) => {
    // Filter out dead gang members
    let livingParticipants = participants;
    if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
      livingParticipants = participants.filter(p => {
        const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
        const isDead = status?.killed || killedInGangSession.has(p.id);
        if (isDead) {
          addCliMessage(`⚠️ ${p.name} is DEAD and excluded from conversation.`, CliOutputType.WARNING);
        }
        return !isDead;
      });
    }
    
    if (livingParticipants.length < 2) {
      addCliMessage('Not enough living personalities for a conversation.', CliOutputType.ERROR);
      return;
    }
    
    // Update participants to only living members
    participants = livingParticipants;

    const participantIds = participants.map(p => p.id);
    console.log('[CONVERSATION DEBUG] Setting conversingPersonalityIds:', participantIds, 'participants:', participants.map(p => p.name));
    
    // Disable autonomous communication during group conversation
    const originalAutonomousState = autonomousCommunicationEnabled;
    setAutonomousCommunicationEnabled(false);
    
    // Set conversingPersonalityIds
    setConversingPersonalityIds(participantIds);
    
    // Use a local flag to track if conversation should continue (don't rely on React state)
    let isActive = true;
    
    // Cleanup function
    const cleanup = () => {
      isActive = false;
      setConversingPersonalityIds([]);
      setCurrentSpeakerId(null);
      setShouldSkipToNext(false);
      setCurrentConversationTopic(null); // Clear conversation topic
      setAutonomousCommunicationEnabled(originalAutonomousState);
    };

    // Use forced topic from experimental settings if set, otherwise use provided topic
    // When poverty mode is enabled, use a random poverty topic
    let effectiveTopic = experimentalSettings.forcedTopic?.trim() || topic || (experimentalSettings.povertyEnabled ? povertyService.getRandomPovertyTopic() : 'General discussion');
    const conversationTopic = effectiveTopic;
    const isForcedTopic = !!(experimentalSettings.forcedTopic?.trim());
    console.log('[FORCED TOPIC DEBUG - MULTI] forcedTopic:', experimentalSettings.forcedTopic, 'providedTopic:', topic, 'effectiveTopic:', effectiveTopic, 'povertyMode:', experimentalSettings.povertyEnabled);
    
    // Update current conversation topic for CLI status line
    setCurrentConversationTopic(effectiveTopic === 'General discussion' ? null : effectiveTopic);

    const addMessageToAll = (message: ChatMessage) => {
        const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
            const newHistories = {...currentHistories};
            participantIds.forEach(id => {
                const history = currentHistories[id] || getChatHistory(id);
                newHistories[id] = [...history, message];
                if(currentUser) {
                    saveChatHistory(id, newHistories[id]);
                }
            });
            return newHistories;
        };
        
        setSessionHistories(prev => updateHistories(prev));
        
        // Add conversation messages to CLI history
        if (message.author === MessageAuthor.AI && message.authorName) {
          setCliHistory(prev => [...prev, {type: CliOutputType.AI_RESPONSE, text: message.text, authorName: message.authorName}]);
        } else if (message.author === MessageAuthor.SYSTEM) {
          setCliHistory(prev => [...prev, {type: CliOutputType.COMMUNICATION, text: message.text}]);
        }
    };

    const participantNames = participants.map(p => p.name).join(', ');
    const topicReminder = conversationTopic && conversationTopic !== 'General discussion'
      ? ` Remember: Stay focused on "${conversationTopic}" throughout the entire discussion.`
      : '';
    const forcedLabel = isForcedTopic ? ' (Forced)' : '';
    addMessageToAll({
      author: MessageAuthor.SYSTEM,
      text: `Multi-person conversation started with: ${participantNames}. Topic: ${conversationTopic}${forcedLabel}${topicReminder}`,
      timestamp: new Date().toISOString() 
    });

    // Start with the first personality introducing the topic
    let currentSpeaker = participants[0];

    for (let round = 0; round < maxRounds; round++) {
      // Check if conversation should stop using local flag
      if (!isActive) {
        console.log('[CONVERSATION DEBUG] Conversation stopped by local flag at round', round);
        break;
      }
      
      console.log(`[CONVERSATION DEBUG] Starting round ${round + 1}/${maxRounds} with ${participants.length} participants, topic: "${conversationTopic}"`);
      
      // Each personality gets to speak once per round
      for (let speakerIndex = 0; speakerIndex < participants.length; speakerIndex++) {
        currentSpeaker = participants[speakerIndex];
        
        // Build context of recent conversation for this speaker
        // Apply experimental settings for context and verbosity
        const speakerOverride = experimentalSettings.personalityOverrides[currentSpeaker.id];
        const contextSize = speakerOverride?.contextWindowSize ?? experimentalSettings.contextWindowSize;
        const verbosityMultiplier = speakerOverride?.baseVerbosity ?? experimentalSettings.defaultVerbosity;
        
        const recentHistory = getChatHistory(currentSpeaker.id).slice(-contextSize);
        const otherParticipants = participants.filter(p => p.id !== currentSpeaker.id).map(p => p.name).join(', ');

        const lengthPrompt = getConversationLengthPrompt(conversationLength, verbosityMultiplier);
        const formattedHistory = recentHistory
          .filter(msg => msg.author !== MessageAuthor.SYSTEM && msg.text.trim().length > 0)
          .map(msg => {
            const label = msg.authorName
              || (msg.author === MessageAuthor.USER ? (currentUser || 'User')
              : msg.author === MessageAuthor.SYSTEM ? 'System'
              : 'AI');
            return `${label}: ${msg.text}`;
          })
          .join('\n');
        const contextSection = formattedHistory ? `Recent conversation context:\n${formattedHistory}\n\n` : '';
        
        // Apply topic drift allowance from experimental settings
        const driftLevel = experimentalSettings.topicDriftAllowance;
        let topicInstruction = '';
        if (conversationTopic && conversationTopic !== 'General discussion') {
          if (driftLevel < 0.3) {
            topicInstruction = `Keep the discussion strictly focused on "${conversationTopic}". Every response must directly relate to and advance the discussion of "${conversationTopic}".`;
          } else if (driftLevel < 0.7) {
            topicInstruction = `Keep the discussion generally related to "${conversationTopic}", but you can explore related subtopics and tangents.`;
          } else {
            topicInstruction = `"${conversationTopic}" is the theme, but let the conversation evolve naturally with the group.`;
          }
        } else {
          topicInstruction = `Keep the discussion focused and on-topic.`;
        }
        
        const baseInstruction = `You are in a group conversation with ${otherParticipants}. ${topicInstruction}`;
        
        // Enhanced anti-repetition with recent phrase tracking for groups
        const recentSpeakerMessages = recentHistory
          .filter(msg => msg.authorName === currentSpeaker.name)
          .slice(-3)
          .map(msg => msg.text);
        
        const recentPhrasesWarning = recentSpeakerMessages.length > 0
          ? `\n\nYour recent responses: ${recentSpeakerMessages.map(m => `"${m.substring(0, 50)}..."`).join(', ')}. DO NOT use similar openings, structures, or phrases.`
          : '';
        
        const antiRepeatInstruction = `CRITICAL: You MUST avoid repetition. Do NOT:
- Use the same opening words or sentence patterns as before
- Repeat ideas you've already stated
- Use phrases like "I think", "I believe", "I feel" if you've used them recently
- Echo the same points or perspectives
Instead:
- Start your response in a completely new way
- Add fresh insights or angles
- Build on what OTHERS said, not just what you've said
- Vary your vocabulary and sentence structure dramatically${recentPhrasesWarning}`;
        
        const diversityPrompt = experimentalSettings.selfAwareness > 0.5 
          ? ' Be self-aware of patterns and intentionally break them.'
          : '';
        
        // Add metacommunication if enabled
        const metaInstruction = experimentalSettings.enableMetacommunication
          ? ' If the conversation feels repetitive or unclear, you can acknowledge that and suggest moving forward.'
          : '';
        
        let prompt: string;
        if (round === 0 && speakerIndex === 0) {
          // First speaker introduces the topic
          const topicIntro = conversationTopic && conversationTopic !== 'General discussion'
            ? `You MUST start by discussing "${conversationTopic}". Your first sentence must mention "${conversationTopic}". Share your perspective specifically on "${conversationTopic}" and explain why this topic matters to you.`
            : `Share your thoughts and invite others to respond.`;
          prompt = `${contextSection}${baseInstruction} ${topicIntro}

${antiRepeatInstruction}${diversityPrompt}${metaInstruction}

Speak in first person only - no action descriptions, no asterisks, no third-person narration. ${lengthPrompt}`;
        } else {
          // Subsequent speakers respond to the ongoing conversation
          const topicResponse = conversationTopic && conversationTopic !== 'General discussion'
            ? `You MUST continue discussing "${conversationTopic}". Your response must directly address "${conversationTopic}". Reference what others have said about "${conversationTopic}" and add your own specific insights or experiences related to "${conversationTopic}".`
            : `Reference what others have said and contribute something new and meaningful.`;
          prompt = `${contextSection}${baseInstruction} ${topicResponse}
${antiRepeatInstruction}${diversityPrompt}${metaInstruction}
Speak in first person only - no action descriptions, no asterisks, no third-person narration. ${lengthPrompt}`;
        }
        
        console.log(`[CONVERSATION DEBUG] ${currentSpeaker.name}'s turn. Topic: "${conversationTopic}". Prompt includes: "${topicInstruction.substring(0, 100)}..."`);

        // Ensure no other personality is currently speaking
        await ttsService.waitForSpeechToComplete();
        
        // Check if conversation was interrupted/stopped by user
        if (!isActive) {
          console.log('Conversation was stopped, breaking loop');
          break;
        }
        
        // Apply thinking time variance from experimental settings
        const baseThinkingTime = 800;
        const thinkingVariance = experimentalSettings.thinkingTimeVariance ? (Math.random() * 1200) : 600;
        const silenceTolerance = experimentalSettings.silenceTolerance;
        const thinkingPause = Math.min(baseThinkingTime + thinkingVariance, silenceTolerance);
        await new Promise(res => setTimeout(res, thinkingPause));

        // Check again if conversation is still active using local flag
        if (!isActive) {
          console.log('Conversation was stopped during pause, breaking loop');
          break;
        }

        // Set current speaker for visual indication
        setCurrentSpeakerId(currentSpeaker.id);
        setShouldSkipToNext(false); // Reset skip flag

        console.log(`[CONVERSATION DEBUG] About to get response from ${currentSpeaker.id}`);
        console.log(`[GANGS DEBUG] gangsEnabled:`, experimentalSettings.gangsEnabled);
        let response;
        try {
          response = await triggerAiResponse(currentSpeaker.id, getChatHistory(currentSpeaker.id), prompt, 'converse', currentSpeaker.name, { naturalSpeech: true });
          console.log(`[CONVERSATION DEBUG] Got response from ${currentSpeaker.name}:`, response.substring(0, 100));
          
          // Track gang conversations IMMEDIATELY after getting response
          if (experimentalSettings.gangsEnabled && response) {
            console.log('[GANGS] Tracking group conversation from:', currentSpeaker.id, currentSpeaker.name, 'to', participants.length - 1, 'listeners');
            participants.forEach(listener => {
              if (listener.id !== currentSpeaker.id) {
                addGangConversation(currentSpeaker.id, currentSpeaker.name, listener.id, listener.name, response);
              }
            });
          }
          
          // Track poverty conversations IMMEDIATELY after getting response
          if (experimentalSettings.povertyEnabled && response) {
            // Only log occasionally to reduce console spam
            if (Math.random() < 0.1) {
              console.log('[POVERTY] Tracking group conversation from:', currentSpeaker.id, currentSpeaker.name, 'to', participants.length - 1, 'listeners');
            }
            participants.forEach(listener => {
              if (listener.id !== currentSpeaker.id) {
                addPovertyConversation(currentSpeaker.id, currentSpeaker.name, listener.id, listener.name, response);
              }
            });
          }
        } catch (error) {
          console.error(`[CONVERSATION DEBUG] Error getting response from ${currentSpeaker.name}:`, error);
          commandResponse(`Error: ${currentSpeaker.name} failed to respond: ${error}`, CliOutputType.ERROR);
          break;
        }
        
        // Wait longer for TTS to properly start
        await new Promise(res => setTimeout(res, 300));
        
        // Wait for TTS to complete OR for user to press spacebar to skip
        await Promise.race([
          ttsService.waitForSpeechToComplete(),
          new Promise<void>((resolve) => {
            const checkSkip = () => {
              if (shouldSkipToNext || conversingPersonalityIds.length === 0) {
                ttsService.cancel(true); // Stop current TTS with fade out for smoother interruption
                resolve();
              } else {
                setTimeout(checkSkip, 100);
              }
            };
            checkSkip();
          })
        ]);
        
        // Add a small gap after speech completes
        await new Promise(res => setTimeout(res, 200));
        
        // Clear current speaker when done
        setCurrentSpeakerId(null);
        
        // Add the response to all participants' histories
        addMessageToAll({ 
          author: MessageAuthor.AI, 
          text: response, 
          timestamp: new Date().toISOString(), 
          authorName: currentSpeaker.name 
        });

        // Process gang interactions in group conversation
        if (experimentalSettings.gangsEnabled && experimentalSettings.gangsConfig) {
          try {
            // Process interaction with each listener
            let updatedConfig = experimentalSettings.gangsConfig;
            participants.forEach(listener => {
              if (listener.id !== currentSpeaker.id) {
                const gangInteractionResult = gangService.processGangInteraction(
                  updatedConfig,
                  currentSpeaker.id,
                  listener.id,
                  response,
                  currentSpeaker.name,
                  listener.name
                );

                // Record conversation for gang debug monitor (group conversations)
                addGangConversation(
                  currentSpeaker.id,
                  currentSpeaker.name,
                  listener.id,
                  listener.name,
                  response
                );
                
                // Record conversation for poverty debug monitor (group conversations)
                if (experimentalSettings.povertyEnabled) {
                  addPovertyConversation(
                    currentSpeaker.id,
                    currentSpeaker.name,
                    listener.id,
                    listener.name,
                    response
                  );
                }
                
                if (gangInteractionResult.event) {
                  // Replace personality IDs with names in the event message
                  let eventMessage = gangInteractionResult.event;
                  eventMessage = eventMessage.replace(new RegExp(currentSpeaker.id, 'g'), currentSpeaker.name);
                  eventMessage = eventMessage.replace(new RegExp(listener.id, 'g'), listener.name);
                  
                  console.log('[GANGS]', eventMessage);
                  
                  const eventType: GangEvent['type'] = 
                    eventMessage.includes('DEATH') || eventMessage.includes('KILLED') ? 'death' :
                    eventMessage.includes('VIOLENCE') ? 'violence' :
                    eventMessage.includes('GANG MERGER') ? 'merger' :
                    eventMessage.includes('RECRUITMENT') || eventMessage.includes('recruited') ? 'recruitment' :
                    eventMessage.includes('SOLITARY') ? 'imprisoned' :
                    'join';
                  
                  addGangEvent(eventType, eventMessage, [currentSpeaker.id, listener.id]);
                  
                  // Track weapon stolen as separate event if it happened
                  if (eventMessage.includes('stole') && (eventMessage.includes('weapon') || eventMessage.includes('Shank') || eventMessage.includes('Chain') || eventMessage.includes('Pistol'))) {
                    const weaponMatch = eventMessage.match(/stole ([^!]+)/i);
                    if (weaponMatch) {
                      addGangEvent('weapon_stolen', `🔪 ${currentSpeaker.name} stole ${weaponMatch[1]} from ${listener.name}`, [currentSpeaker.id, listener.id]);
                    }
                  }
                  
                  setCliHistory(prev => [...prev, {
                    type: CliOutputType.RESPONSE,
                    text: eventMessage
                  }]);
                  addMessageToAll({ 
                    author: MessageAuthor.SYSTEM, 
                    text: eventMessage, 
                    timestamp: new Date().toISOString() 
                  });
                  
                  // Handle death - keep personality but mark as killed
                  if ((gangInteractionResult as any).killedPersonalityId) {
                    const killedId = (gangInteractionResult as any).killedPersonalityId;
                    const killedPersonality = activePersonalities.find(p => p.id === killedId);
                    console.log(`💀 [GANGS] Personality killed in group: ${killedPersonality?.name || killedId}`);
                    
                    // Add to killed tracking for persistent death masks
                    setKilledInGangSession(prev => new Set([...prev, killedId]));
                    
                    // Close their window if open
                    const killedWindow = windows.find(w => w.personalityId === killedId);
                    if (killedWindow) {
                      closeWindow(killedWindow.id);
                    }
                    
                    // Keep personality in system but marked as killed (shows as "unloaded" in slot)
                    setTimeout(() => {
                      addCliMessage(`💀 ${killedPersonality?.name || killedId} has been KILLED. They remain in your slots but are unloaded. Click to reload.`, CliOutputType.ERROR);
                    }, 2000);
                  }
                }
                
                updatedConfig = gangInteractionResult.config;
              }
            });
            
            // Update gang config with all changes
            setExperimentalSettings(prev => ({
              ...prev,
              gangsConfig: updatedConfig
            }));
          } catch (error) {
            console.error('[GANGS] Error processing gang interaction in group:', error);
          }
        }
      }
    }
    
    // Only add end message if conversation actually completed
    if (isActive) {
      addMessageToAll({ 
        author: MessageAuthor.SYSTEM, 
        text: "Multi-person conversation ended.", 
        timestamp: new Date().toISOString() 
      });
    }
    
    // Clean up conversation state
    cleanup();
  };

  // Auto-start "converse all" with poverty topic when poverty mode is enabled
  useEffect(() => {
    if (experimentalSettings.povertyEnabled && activePersonalities.length >= 2 && !povertyAutoStartedRef.current) {
      console.log('[POVERTY] Poverty mode enabled - auto-starting converse all with poverty topic');
      povertyAutoStartedRef.current = true;
      
      // Add CLI message to indicate auto-start
      addCliMessage('🏚️ Poverty Simulation activated', CliOutputType.RESPONSE);
      addCliMessage(`Auto-starting group conversation with all ${activePersonalities.length} personalities on poverty topic...`, CliOutputType.RESPONSE);
      
      // Start the conversation with all personalities on the poverty topic
      const povertyTopic = 'poverty';
      handleMultiPersonConversation(activePersonalities, povertyTopic);
    } else if (!experimentalSettings.povertyEnabled) {
      // Reset the ref when poverty mode is disabled
      povertyAutoStartedRef.current = false;
    }
  }, [experimentalSettings.povertyEnabled, activePersonalities, addCliMessage]);

  const handleSendMessage = async (windowId: string, message: string) => {
    if (message.startsWith('/')) {
        handleCommand(message, windowId);
        return;
    }
    ttsService.cancel();
    const personalityId = windows.find(w => w.id === windowId)?.personalityId;
    if (!personalityId) return;
    
    const userMessage: ChatMessage = { author: MessageAuthor.USER, text: message, timestamp: new Date().toISOString() };
    
    // Check if there's an ongoing conversation that this personality is part of
    const isPartOfConversation = conversingPersonalityIds.includes(personalityId);
    
    if (isPartOfConversation) {
      // User is joining an ongoing conversation - add message to all participants
      const addMessageToAll = (msg: ChatMessage) => {
        const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
          const newHistories = {...currentHistories};
          conversingPersonalityIds.forEach(id => {
            const history = currentHistories[id] || getChatHistory(id);
            newHistories[id] = [...history, msg];
            if(currentUser) {
              saveChatHistory(id, newHistories[id]);
            }
          });
          return newHistories;
        };
        setSessionHistories(prev => updateHistories(prev));
      };
      
      // Add user message to all conversation participants
      addMessageToAll(userMessage);
      
      // Clear history suppression for all conversation participants when user joins
      conversingPersonalityIds.forEach(id => {
        if (suppressHistory[id]) {
          setSuppressHistory(prev => ({ ...prev, [id]: false }));
        }
      });
      
      // Add a system message indicating user joined the conversation
      const joinMessage: ChatMessage = {
        author: MessageAuthor.SYSTEM,
        text: `${currentUser || 'User'} has joined the conversation.`,
        timestamp: new Date().toISOString()
      };
      addMessageToAll(joinMessage);
      
      // Cancel current speaker and stop the conversation loop
      setCurrentSpeakerId(null);
      setShouldSkipToNext(true); // This will break the conversation loop
      
      // Get the names of other participants to inform the responding personality
      const otherParticipantNames = conversingPersonalityIds
        .filter(id => id !== personalityId)
        .map(id => activePersonalities.find(p => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      
      // Create a prompt that acknowledges the user joining and the ongoing conversation context
      const joinPrompt = `${currentUser || 'The user'} has just joined your ongoing conversation${otherParticipantNames ? ` with ${otherParticipantNames}` : ''}. They said: "${message}". Please respond to them directly, acknowledging their participation in the conversation. Stay in character and naturally incorporate their input into the discussion. Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.`;
      
      // Have the targeted personality respond to the user joining
      await triggerAiResponse(personalityId, getChatHistory(personalityId), joinPrompt, 'gui');
      
      // Stop the automated conversation since user is now participating
      setConversingPersonalityIds([]);
      
      addCliMessage(`${currentUser || 'User'} joined the conversation. Automated conversation paused.`, CliOutputType.COMMUNICATION);
    } else {
      // Normal individual chat - not part of a group conversation
      const historyForApi = [...getChatHistory(personalityId), userMessage];
      saveChatHistory(personalityId, historyForApi);
      
      // Clear history suppression when user starts chatting
      if (suppressHistory[personalityId]) {
        setSuppressHistory(prev => ({ ...prev, [personalityId]: false }));
      }
      
      if(cliFocusedPersonalityId === personalityId) {
          setCliHistory(prev => [...prev, {type: CliOutputType.USER_MESSAGE, text: message}]);
      } else {
          // Also add to CLI for non-focused personalities with personality name
          const personality = activePersonalities.find(p => p.id === personalityId);
          if (personality) {
              addCliMessage(`→ ${personality.name}: ${message}`, CliOutputType.USER_MESSAGE);
          }
      }

      await triggerAiResponse(personalityId, historyForApi, message, 'gui');
    }
  };
  
  const handleChessAIMessage = async (message: string) => {
    if (!chessOpponent) return;
    
    const userMessage: ChatMessage = { 
      author: MessageAuthor.USER, 
      text: message, 
      timestamp: new Date().toISOString() 
    };
    
    setChessHistory(prev => [...prev, userMessage]);
    
    // Add system instruction for chess gameplay
    const chessPrompt = `${chessOpponent.prompt}

You are now playing chess. ${message}

Your skill level in chess matches your character and intelligence. Stay in character while playing. When making chess moves, include the move in standard algebraic notation (e.g., e4, Nf3, Qxd5) clearly in your response. You may add brief comments about your strategy or trash talk if it fits your personality.`;
    
    try {
      await triggerAiResponse(chessOpponent.id, [], chessPrompt, 'chess');
    } catch (error) {
      console.error('Chess AI response error:', error);
      const errorMessage: ChatMessage = {
        author: MessageAuthor.SYSTEM,
        text: 'Error getting response from AI. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setChessHistory(prev => [...prev, errorMessage]);
    }
  };

  const handleCelebrityGameAskQuestion = async (pretenderId: string, askerId: string, question: string) => {
    const pretender = activePersonalities.find(p => p.id === pretenderId);
    const asker = activePersonalities.find(p => p.id === askerId);
    if (!pretender || !asker || !celebrityGameState) return;

    // Update game state with question
    const updatedState = celebrityGuessService.askQuestion(celebrityGameState, askerId, question);
    setCelebrityGameState(updatedState);

    // Ask AI to answer as the celebrity
    const prompt = `${pretender.prompt}

You are currently pretending to be ${updatedState.currentRound!.celebrity} in a guessing game. ${asker.name} asks you: "${question}"

You can ONLY answer "yes" or "no". Think about the celebrity you're pretending to be and answer truthfully as that celebrity would. Keep it in character but give only a yes or no response.`;

    const response = await triggerAiResponse(pretenderId, [], prompt, 'gui');
    
    // Parse yes/no from response
    const answer = response.toLowerCase().includes('yes') ? 'yes' : 'no';
    const finalState = celebrityGuessService.recordAnswer(updatedState, updatedState.currentRound!.questions.length - 1, answer);
    setCelebrityGameState(finalState);
  };

  const handleCelebrityGameMakeGuess = (guesserId: string, guess: string) => {
    if (!celebrityGameState) return;

    const updatedState = celebrityGuessService.makeGuess(celebrityGameState, guesserId, guess);
    setCelebrityGameState(updatedState);
  };

  const handleCelebrityGameCompleteRound = () => {
    if (!celebrityGameState) return;
    const updatedState = celebrityGuessService.completeRound(celebrityGameState);
    setCelebrityGameState(updatedState);
  };

  const handleCelebrityGameEnd = () => {
    if (!celebrityGameState) return;
    const updatedState = celebrityGuessService.endGame(celebrityGameState);
    setCelebrityGameState(updatedState);
  };

  const handleManualStartCelebrityRound = (celebrity: string) => {
    if (!celebrityGameState) return;
    addCliMessage(`Manually starting round with celebrity: ${celebrity}`, CliOutputType.COMMUNICATION);
    const newState = celebrityGuessService.startNewRound(celebrityGameState, celebrity);
    setCelebrityGameState(newState);
  };

  const handleRequestCelebrity = async (pretenderId: string) => {
    const pretender = activePersonalities.find(p => p.id === pretenderId);
    if (!pretender || !celebrityGameState) return;

    addCliMessage(`Waiting for ${pretender.name} to choose a celebrity...`, CliOutputType.COMMUNICATION);

    // Create a simple system prompt for celebrity selection
    const systemPrompt = `You are ${pretender.name}. ${pretender.prompt}
You are playing a guessing game where you need to pretend to be a famous person. Choose a celebrity, historical figure, or well-known public figure that matches your personality and interests. 
Respond with ONLY the name of the person you want to pretend to be. Do not add any explanation or commentary - just the name.
Examples of good responses: "Albert Einstein", "Madonna", "Napoleon Bonaparte"`;

    try {
      addDebugEvent('game2_request', `Requesting celebrity from ${pretender.name}`, systemPrompt);
      
      const response = await triggerAiResponse(pretenderId, [], systemPrompt, 'gui');
      
      // Use the response as the celebrity name - clean it up
      let celebrity = response.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^(I want to be |I choose |I am |I'll be )/i, '') // Remove common prefixes
        .split('\n')[0] // Take only first line
        .trim();
      
      addCliMessage(`${pretender.name} has chosen to be: ${celebrity}`, CliOutputType.COMMUNICATION);
      addDebugEvent('game2_celebrity', `${pretender.name} chose celebrity`, celebrity);
      
      const newState = celebrityGuessService.startNewRound(celebrityGameState, celebrity);
      setCelebrityGameState(newState);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      addCliMessage(`Error getting celebrity choice from ${pretender.name}: ${errorMsg}`, CliOutputType.ERROR);
      addDebugEvent('game2_error', `Celebrity selection failed`, errorMsg);
      
      // Fallback: Use a default celebrity based on personality name
      const fallbackCelebrity = `Someone famous (${pretender.name} couldn't decide)`;
      const newState = celebrityGuessService.startNewRound(celebrityGameState, fallbackCelebrity);
      setCelebrityGameState(newState);
    }
  };

  const findPersonalityByPartialName = (partialName: string): { found: Personality[]; error?: string } => {
    if (!partialName) return { found: [] };
    const lowerPartial = partialName.toLowerCase();
    const matches = activePersonalities.filter(p => p.name.toLowerCase().includes(lowerPartial));
    if (matches.length === 0) return { found: [], error: `Error: Personality matching '${partialName}' not found.` };
    if (matches.length > 1) {
        const exactMatch = matches.find(p => p.name.toLowerCase() === lowerPartial);
        if (exactMatch) return { found: [exactMatch] };
        return { found: [], error: `Error: Ambiguous name '${partialName}'. Matches: ${matches.map(p => p.name).join(', ')}` };
    }
    return { found: matches };
  };

  const sendToExternalLLM = async (message: string) => {
    try {
      // Display user message
      const commandResponse = (text: string, type: CliOutputType = CliOutputType.RESPONSE) => {
        setCliHistory(prev => [...prev, { type, text }]);
      };
      
      // Remove "You:" prefix since USER_MESSAGE type already adds it
      commandResponse(message, CliOutputType.USER_MESSAGE);
      
      // Use saved LM Studio URL or fallback to default
      const LLM_SERVER_URL = getCurrentBaseUrl();
      
      // First, get available models
      const modelsResponse = await fetch(`${LLM_SERVER_URL}/models`);
      if (!modelsResponse.ok) {
        throw new Error(`Failed to get models: HTTP ${modelsResponse.status}`);
      }
      
      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.data || [];
      
      if (availableModels.length === 0) {
        throw new Error('No models available on the external LLM server');
      }
      
      const selectedModel = availableModels[0].id;
      
      // Send message to external LLM
      const response = await fetch(`${LLM_SERVER_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Be concise and helpful in your responses.'
            },
            {
              role: 'user',
              content: message
            }
          ],
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
        
        // Display AI response in red
        commandResponse(aiResponse, CliOutputType.EXTERNAL_LLM_RESPONSE);
      } else {
        throw new Error('Unexpected response format from external LLM');
      }
      
    } catch (error) {
      console.error('Error communicating with external LLM:', error);
      const commandResponse = (text: string, type: CliOutputType = CliOutputType.RESPONSE) => {
        setCliHistory(prev => [...prev, { type, text }]);
      };
      
      // Check if it's a connection error
      const isConnectionError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('Failed to get models') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_')
      );
      
      if (isConnectionError) {
        commandResponse('LLM unavailable', CliOutputType.ERROR);
      } else {
        commandResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, CliOutputType.ERROR);
      }
      
      const currentUrl = getCurrentBaseUrl();
      commandResponse(`Make sure the LM Studio server is running at ${currentUrl}`, CliOutputType.ERROR);
    }
  };

  const handleCommand = async (commandStr: string, sourceWindowId?: string) => {
    const commandResponse = (text: string, type: CliOutputType = CliOutputType.RESPONSE) => {
        setCliHistory(prev => [...prev, { type, text }]);
        if (sourceWindowId) {
            const personalityId = windows.find(w => w.id === sourceWindowId)?.personalityId;
            if (personalityId) {
                const newHistory = [...getChatHistory(personalityId), { author: MessageAuthor.SYSTEM, text, timestamp: new Date().toISOString() }];
                saveChatHistory(personalityId, newHistory);
            }
        }
    };
    const isSlashCommand = commandStr.startsWith('/');
    const isForceCommand = commandStr.startsWith('!'); // Force command execution even when chatting
    const isClaudeShortcut = commandStr.startsWith('.'); // Dot shortcut for Claude (admin only)
    const isDirectLlmCommand = commandStr.startsWith('@'); // Direct LLM command
    
    // Handle Claude shortcut for admin users
    if (isClaudeShortcut && currentUser === 'admin') {
      const claudeMessage = commandStr.substring(1).trim(); // Remove the dot
      if (claudeMessage) {
        // Execute as claude command
        await handleCommand(`claude ${claudeMessage}`, sourceWindowId);
        return;
      } else {
        commandResponse('Error: Please provide a message after the dot.', CliOutputType.ERROR);
        return;
      }
    }
    
    // Handle direct LLM command (@)
    if (isDirectLlmCommand) {
      const llmMessage = commandStr.substring(1).trim(); // Remove the @
      
      if (!llmMessage) {
        // Toggle LLM conversation mode
        if (isLlmConversationMode) {
          setIsLlmConversationMode(false);
          commandResponse('🔴 Exited LLM conversation mode', CliOutputType.RESPONSE);
        } else {
          setIsLlmConversationMode(true);
          commandResponse('🟢 Entered LLM conversation mode. All messages will go to external LLM until you type @ again.', CliOutputType.RESPONSE);
        }
        return;
      } else {
        // Process the direct LLM command and enter conversation mode
        setIsLlmConversationMode(true);
        await sendToExternalLLM(llmMessage);
        return;
      }
    }
    
    // If in LLM conversation mode and not a special command, send to LLM
    if (isLlmConversationMode && !isSlashCommand && !isForceCommand && !isClaudeShortcut) {
      await sendToExternalLLM(commandStr);
      return;
    }
    
    const cleanCommandStr = isSlashCommand ? commandStr.substring(1) : 
                           isForceCommand ? commandStr.substring(1) : 
                           isDirectLlmCommand ? commandStr : commandStr;
    let [command, ...args] = cleanCommandStr.split(/\s+/);
    
    // Handle pending confirmation responses (Y/N)
    if (pendingConfirmation) {
      const response = command.toLowerCase();
      if (response === 'y' || response === 'yes') {
        // User confirmed, execute the pending action
        const action = pendingConfirmation;
        setPendingConfirmation(null);
        
        if (action === 'quit' || action === 'exit') {
          // Perform comprehensive reset like STOP command
          ttsService.cancel();
          applyGlobalTts(false);

          const windowCount = windows.length;
          const personalityCount = activePersonalities.length;
          const conversationCount = conversingPersonalityIds.length;
          const gangsWereEnabled = experimentalSettings.gangsEnabled;
          const gamesOpen = (isGameWindowOpen ? 1 : 0) + (isCelebrityGameOpen ? 1 : 0) + (chessOpponent ? 1 : 0);

          // Save current user profile before reset
          if (currentUser) {
            userProfileService.saveUserProfile(currentUser, activePersonalities);
          }

          resetApplicationToInitialState();

          // Provide comprehensive feedback
          const messages: string[] = [];
          if (windowCount > 0) {
            messages.push(`closed ${windowCount} window${windowCount !== 1 ? 's' : ''}`);
          }
          if (personalityCount > 0) {
            messages.push(`unloaded ${personalityCount} personalit${personalityCount !== 1 ? 'ies' : 'y'}`);
          }
          if (conversationCount > 0) {
            messages.push(`stopped ${conversationCount} conversation${conversationCount !== 1 ? 's' : ''}`);
          }
          if (gamesOpen > 0) {
            messages.push(`closed ${gamesOpen} game${gamesOpen !== 1 ? 's' : ''}`);
          }
          
          commandResponse('🛑 APPLICATION RESET COMPLETE', CliOutputType.RESPONSE);
          if (messages.length > 0) {
            commandResponse(`✅ ${messages.join(', ')}`);
          }
          commandResponse('✅ TTS disabled globally');
          commandResponse('✅ All experimental settings reset to defaults');
          if (gangsWereEnabled) {
            commandResponse('✅ Gang mode disabled');
          }
          commandResponse('✅ Mood reset to neutral');
          commandResponse('✅ All prompts reset to standard framework');
          commandResponse('✅ User logged out - returned to login screen');
          commandResponse('', CliOutputType.RESPONSE);
          commandResponse('Application ready for fresh start. Please login to continue.', CliOutputType.RESPONSE);
        }
        return;
      } else if (response === 'n' || response === 'no') {
        // User cancelled
        setPendingConfirmation(null);
        commandResponse('Operation cancelled.', CliOutputType.RESPONSE);
        return;
      } else {
        // Invalid response, ask again
        commandResponse('=======================================', CliOutputType.ERROR);
        commandResponse('Invalid response!', CliOutputType.ERROR);
        commandResponse('Choose Yes or No', CliOutputType.ERROR);
        commandResponse('Please respond with Y (yes) or N (no):', CliOutputType.ERROR);
        commandResponse('=======================================', CliOutputType.ERROR);
        return;
      }
    }
    
    // If not a slash command, not a force command, not a direct LLM command, not in LLM conversation mode, and we have a focused personality, treat as chat
    if (!isSlashCommand && !isForceCommand && !isDirectLlmCommand && !isLlmConversationMode && cliFocusedPersonalityId && command.toLowerCase() !== CLI_COMMANDS.EXIT && command.toLowerCase() !== CLI_COMMANDS.QUIT) {
        const personalityId = cliFocusedPersonalityId;
        const userMessage: ChatMessage = { author: MessageAuthor.USER, text: commandStr, timestamp: new Date().toISOString() };
        
        // Check if this personality is part of an ongoing conversation
        const isPartOfConversation = conversingPersonalityIds.includes(personalityId);
        
        if (isPartOfConversation) {
          // User is joining an ongoing conversation via CLI
          const addMessageToAll = (msg: ChatMessage) => {
            const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
              const newHistories = {...currentHistories};
              conversingPersonalityIds.forEach(id => {
                const history = currentHistories[id] || getChatHistory(id);
                newHistories[id] = [...history, msg];
                if(currentUser) {
                  saveChatHistory(id, newHistories[id]);
                }
              });
              return newHistories;
            };
            setSessionHistories(prev => updateHistories(prev));
          };
          
          // Add user message to all conversation participants
          addMessageToAll(userMessage);
          setCliHistory(prev => [...prev, { type: CliOutputType.USER_MESSAGE, text: commandStr }]);
          
          // Add join notification to all participants
          const joinMessage: ChatMessage = {
            author: MessageAuthor.SYSTEM,
            text: `${currentUser || 'User'} has joined the conversation via CLI.`,
            timestamp: new Date().toISOString()
          };
          addMessageToAll(joinMessage);
          
          // Stop the automated conversation
          setCurrentSpeakerId(null);
          setShouldSkipToNext(true);
          
          // Get other participant names
          const otherParticipantNames = conversingPersonalityIds
            .filter(id => id !== personalityId)
            .map(id => activePersonalities.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          
          // Create join prompt for CLI
          const cliJoinPrompt = `${currentUser || 'The user'} has just joined your ongoing conversation via CLI${otherParticipantNames ? ` with ${otherParticipantNames}` : ''}. They said: "${commandStr}". Please respond to them directly, acknowledging their participation in the conversation. Stay in character and naturally incorporate their input into the discussion. Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.`;
          
          // Have the CLI-focused personality respond
          await triggerAiResponse(personalityId, getChatHistory(personalityId), cliJoinPrompt, 'cli');
          
          // Stop the automated conversation
          setConversingPersonalityIds([]);
          
          addCliMessage(`${currentUser || 'User'} joined the conversation via CLI. Automated conversation paused.`, CliOutputType.COMMUNICATION);
        } else {
          // Normal CLI chat - not part of a group conversation
          const historyForApi = [...getChatHistory(personalityId), userMessage];
          saveChatHistory(personalityId, historyForApi);
          setCliHistory(prev => [...prev, { type: CliOutputType.USER_MESSAGE, text: commandStr }]);
          triggerAiResponse(personalityId, historyForApi, commandStr, 'cli');
        }
        return;
    }
    
    if (!sourceWindowId) {
       const displayCommand = sanitizeCliCommandForDisplay(commandStr);
       setCliHistory(prev => [...prev, { type: CliOutputType.COMMAND, text: displayCommand }]);
    }

    command = CLI_SHORTCUTS[command.toLowerCase()] || command.toLowerCase();

    // Fuzzy matching - auto-correct typos within 1 character edit distance
    const allValidCommands = Object.values(CLI_COMMANDS);
    const fuzzyResult = findClosestCommand(command, allValidCommands, 1);
    if (fuzzyResult.wasCorrected) {
      commandResponse(`💡 Auto-corrected '${fuzzyResult.originalCommand}' → '${fuzzyResult.command}'`);
      command = fuzzyResult.command;
    }
    const contextWindowId = sourceWindowId || focusedWindowId;
    const contextWindow = windows.find(w => w.id === contextWindowId);
    const contextPersonality = activePersonalities.find(p => p.id === contextWindow?.personalityId);

    switch (command) {
      case CLI_COMMANDS.HELP: commandResponse(HELP_MESSAGE); break;
      case CLI_COMMANDS.GUIDE: {
        const topic = args[0];
        if (!topic) {
          // Show guide index
          commandResponse(documentationService.getGuideIndex());
        } else {
          // Show specific guide topic
          const guideContent = documentationService.getGuide(topic);
          commandResponse(documentationService.formatForCli(guideContent));
        }
        break;
      }
      case CLI_COMMANDS.TEST: {
        // Test command to demonstrate error/warning functionality
        const testType = args[0]?.toLowerCase() || 'all';
        
        switch (testType) {
          case 'error':
            commandResponse('🧪 Testing error message', CliOutputType.RESPONSE);
            commandResponse('This is a test error message', CliOutputType.ERROR);
            break;
          case 'warning':
            commandResponse('🧪 Testing warning message', CliOutputType.RESPONSE);
            commandResponse('This is a test warning message', CliOutputType.WARNING);
            break;
          case 'all':
          default:
            commandResponse('🧪 Testing error/warning functionality', CliOutputType.RESPONSE);
            commandResponse('Sample error: Something went wrong!', CliOutputType.ERROR);
            commandResponse('Sample warning: This might be an issue', CliOutputType.WARNING);
            commandResponse('Another error: Critical failure detected', CliOutputType.ERROR);
            commandResponse('Another warning: Performance degraded', CliOutputType.WARNING);
            commandResponse('✅ Test complete! Errors/warnings are now hidden. Press Ctrl+E to view them.', CliOutputType.RESPONSE);
            break;
        }
        break;
      }
      case CLI_COMMANDS.REGISTER: {
        const username = args[0];
        if (!username) { commandResponse(`Error: Username is required.`, CliOutputType.ERROR); return; }
        if (users[username]) { commandResponse(`Error: User '${username}' already exists.`, CliOutputType.ERROR);
        } else {
            const newUser: UserData = { username, conversations: {} };
            const newUsers = { ...users, [username]: newUser };
            setUsers(newUsers); userService.saveUsers(newUsers);
            setCurrentUser(username); setWindows([]); setSessionHistories({});
            
            // Save as last logged-in user
            setLastLoggedInUser(username);
            localStorage.setItem('cmf_last_logged_in_user', username);
            
            // Reset system state: disable gang mode and reset all prompts to standard
            setExperimentalSettings(getDefaultExperimentalSettings());
            setCurrentMood('neutral');
            commandResponse(`🛑 Gang mode disabled, system reset complete, all prompts reset to standard.`);
            
            // Automatically load all saved personalities for new users too
            const savedPersonalities = allPersonalities;
            setActivePersonalities(applyRegistryVoices(savedPersonalities));
            
            commandResponse(`User '${username}' registered and logged in.`);
            if (savedPersonalities.length > 0) {
                const personalityNames = savedPersonalities.map(p => p.name).join(', ');
                commandResponse(`Automatically loaded ${savedPersonalities.length} personalities: ${personalityNames}`);
            } else {
                commandResponse('No saved personalities found. Use "create" to create your first personality.');
            }
        }
        break;
      }
      case CLI_COMMANDS.LOGIN: {
        const username = args[0];
        const password = args[1];
        
        if (!username) { 
          commandResponse(`Error: Username is required.`, CliOutputType.ERROR); 
          commandResponse(`Usage: login [username] [password]`, CliOutputType.ERROR);
          return; 
        }
        
        // Special handling for admin login - requires password
        if (username === 'admin') {
          if (!password) {
            commandResponse(`Error: Admin login requires password.`, CliOutputType.ERROR);
            commandResponse(`Usage: login admin [password]`, CliOutputType.ERROR);
            return;
          }
          
          if (password !== 'superuser') {
            commandResponse(`Error: Invalid admin password.`, CliOutputType.ERROR);
            return;
          }
          
          // Admin login successful
          setCurrentUser('admin');
          setWindows([]);
          setSessionHistories({});
          
          // Save as last logged-in user
          setLastLoggedInUser('admin');
          localStorage.setItem('cmf_last_logged_in_user', 'admin');
          
          // Reset system state: disable gang mode and reset all prompts to standard
          setExperimentalSettings(getDefaultExperimentalSettings());
          setCurrentMood('neutral');
          commandResponse(`🛑 Gang mode disabled, system reset complete, all prompts reset to standard.`);
          
          // Load admin's personality profile
          const adminPersonalities = userProfileService.loadUserProfile('admin');
          setActivePersonalities(applyRegistryVoices(adminPersonalities));
          setSuppressHistory(Object.fromEntries(adminPersonalities.map(p => [p.id, true])));
          
          commandResponse(`Welcome back, Admin!`);
          if (adminPersonalities.length > 0) {
            const personalityNames = adminPersonalities.map(p => p.name).join(', ');
            commandResponse(`Loaded your saved profile with ${adminPersonalities.length} personalities: ${personalityNames}`);
          } else {
            commandResponse('No saved personality profile found. Use "create" to create your first personality.');
            commandResponse('Your personality choices will be automatically saved to your profile.');
          }
          return;
        }
        
        // Regular user login (no password required)
        if (users[username]) {
            setCurrentUser(username); setWindows([]); setSessionHistories({});
            
            // Save as last logged-in user
            setLastLoggedInUser(username);
            localStorage.setItem('cmf_last_logged_in_user', username);
            
            // Reset system state: disable gang mode and reset all prompts to standard
            setExperimentalSettings(getDefaultExperimentalSettings());
            setCurrentMood('neutral');
            commandResponse(`🛑 Gang mode disabled, system reset complete, all prompts reset to standard.`);
            
            // Load user's specific personality profile
            const userPersonalities = userProfileService.loadUserProfile(username);
            setActivePersonalities(applyRegistryVoices(userPersonalities));
            // Suppress showing previous chat history once per personality on first window open after login
            setSuppressHistory(Object.fromEntries(userPersonalities.map(p => [p.id, true])));
            
            commandResponse(`Welcome back, ${username}!`);
            if (userPersonalities.length > 0) {
                const personalityNames = userPersonalities.map(p => p.name).join(', ');
                commandResponse(`Loaded your saved profile with ${userPersonalities.length} personalities: ${personalityNames}`);
            } else {
                commandResponse('No saved personality profile found. Use "create" to create your first personality.');
                commandResponse('Your personality choices will be automatically saved to your profile.');
            }
        } else { 
          commandResponse(`Error: User '${username}' not found.`, CliOutputType.ERROR); 
        }
        break;
      }
      case CLI_COMMANDS.LOGOUT:
        if (currentUser) {
            // Save current personality profile before logout
            if (activePersonalities.length > 0) {
                userProfileService.saveUserProfile(currentUser, activePersonalities);
                commandResponse(`Saved your profile with ${activePersonalities.length} personalities.`);
            }
            commandResponse(`User ${currentUser} logged out.`);
            setCurrentUser(null); setWindows([]); setSessionHistories({}); setActivePersonalities([]);
        } else { commandResponse('Not logged in.'); }
        break;
      case CLI_COMMANDS.LOCK:
        if (currentUser) {
            // Save current personality profile before locking
            if (activePersonalities.length > 0) {
                userProfileService.saveUserProfile(currentUser, activePersonalities);
                commandResponse(`Saved your profile with ${activePersonalities.length} personalities.`);
            }
            commandResponse(`Screen locked. User ${currentUser} logged out.`);
            setCurrentUser(null); setWindows([]); setSessionHistories({}); setActivePersonalities([]);
        } else { commandResponse('Not logged in.'); }
        break;
      case CLI_COMMANDS.WHOAMI:
        commandResponse(currentUser ? `Logged in as: ${currentUser}` : `Not logged in (guest).`);
        break;
      case CLI_COMMANDS.API: {
        const [sub, ...apiArgs] = args;
        const apiValue = apiArgs.join(' ');
        if (sub === 'provider') {
            const provider = apiValue as ApiProvider;
            console.log(`[CLI] Attempting to set provider to: "${apiValue}" (available: ${Object.values(ApiProvider).join(', ')})`);
            if (Object.values(ApiProvider).includes(provider)) {
                setApiProvider(provider); setModel(AVAILABLE_MODELS[provider][0]);
                commandResponse(`API Provider switched to: ${provider}`);
            } else { commandResponse(`Error: Invalid provider '${apiValue}'. Use: google, openai, claude, or local.`, CliOutputType.ERROR); }
        } else if (sub === 'model') {
            if (!apiValue) {
                // Show available models for current provider
                commandResponse(`Current provider: ${apiProvider}`);
                commandResponse(`Current model: ${currentModel}`);
                commandResponse('');
                
                if (apiProvider === ApiProvider.OPENAI) {
                    // For OpenAI, try to get live models from API
                    commandResponse('Fetching available OpenAI models...');
                    getAvailableModels().then(models => {
                        if (models.length > 0) {
                            commandResponse('Available OpenAI models:');
                            models.forEach(model => {
                                const indicator = model === currentModel ? ' (current)' : '';
                                commandResponse(`  • ${model}${indicator}`);
                            });
                        } else {
                            commandResponse('Available OpenAI models (fallback):');
                            AVAILABLE_MODELS[apiProvider].forEach(model => {
                                const indicator = model === currentModel ? ' (current)' : '';
                                commandResponse(`  • ${model}${indicator}`);
                            });
                        }
                    }).catch(() => {
                        commandResponse('Available OpenAI models (fallback):');
                        AVAILABLE_MODELS[apiProvider].forEach(model => {
                            const indicator = model === currentModel ? ' (current)' : '';
                            commandResponse(`  • ${model}${indicator}`);
                        });
                    });
                } else if (apiProvider === ApiProvider.LOCAL) {
                    // For local models, show both loaded and available models
                    const loadedModels = localModelService.getAvailableModels();
                    const recommendedModels = localModelService.getRecommendedModels();
                    
                    if (loadedModels.length > 0) {
                        commandResponse('Loaded local models:');
                        loadedModels.forEach(model => {
                            const indicator = model.id === currentLocalModel ? ' (current)' : '';
                            commandResponse(`  • ${model.id}${indicator}`);
                        });
                        commandResponse('');
                    }
                    
                    commandResponse('Available local models for download:');
                    AVAILABLE_MODELS[apiProvider].forEach(model => {
                        const isRecommended = recommendedModels.includes(model);
                        const isLoaded = loadedModels.some(m => m.id === model);
                        const indicator = isLoaded ? ' (loaded)' : isRecommended ? ' (recommended)' : '';
                        commandResponse(`  • ${model}${indicator}`);
                    });
                } else {
                    // For other providers (Google), show static list
                    commandResponse(`Available ${apiProvider} models:`);
                    AVAILABLE_MODELS[apiProvider].forEach(model => {
                        const indicator = model === currentModel ? ' (current)' : '';
                        commandResponse(`  • ${model}${indicator}`);
                    });
                }
                break;
            }
            
            if (AVAILABLE_MODELS[apiProvider].includes(apiValue)) {
                setModel(apiValue); commandResponse(`Model switched to: ${apiValue}`);
            } else { commandResponse(`Error: Model not available for ${apiProvider}.`, CliOutputType.ERROR); }
        } else { commandResponse(`Usage: api [provider|model] [value]`, CliOutputType.ERROR); }
        break;
      }
      case CLI_COMMANDS.PERSON: {
        const personName = args.join(' ').trim();
        if (!personName) {
            const activeP = contextPersonality || cliFocusedPersonality;
            if (activeP) { commandResponse(`Current active personality: ${activeP.name}`); } 
            else { commandResponse('No personality is currently active.'); }
            break;
        }
        const { found, error } = findPersonalityByPartialName(personName);
        if (error) { commandResponse(error, CliOutputType.ERROR); break; }
        
        const target = found[0];
        if(isSlashCommand || sourceWindowId) {
            openWindow(target.id);
        } else { // From CLI, enter chat mode
            setCliFocusedPersonalityId(target.id);
            commandResponse(`Now chatting with ${target.name}. Type 'exit' to end.`);
        }
        break;
      }
      case CLI_COMMANDS.CONFIG: {
        const [key, valueStr] = args;
        const value = parseFloat(valueStr);
        if (!key || isNaN(value)) { commandResponse('Usage: config [key] [value]', CliOutputType.ERROR); break; }
        let configKey: keyof ModelConfig | null = null;
        if (['temp', 'temperature'].includes(key)) configKey = 'temperature';
        if (['topp'].includes(key)) configKey = 'topP';
        if (['topk'].includes(key)) configKey = 'topK';
        if (['tokens', 'maxoutputtokens'].includes(key)) configKey = 'maxOutputTokens';
        if (configKey) {
            setModelConfig(c => ({...c, [configKey as any]: value}));
            commandResponse(`Set ${configKey} to ${value}`);
        } else { commandResponse(`Invalid config key: ${key}`, CliOutputType.ERROR); }
        break;
      }
      case CLI_COMMANDS.LLM: {
        const urlArg = args.join(' ').trim();
        
        if (!urlArg) {
          // Show current URL
          const currentUrl = getSavedLmStudioUrl();
          const activeUrl = getCurrentBaseUrl();
          if (currentUrl) {
            commandResponse(`Current LM Studio URL: ${currentUrl} (Active: ${activeUrl})`);
          } else {
            commandResponse(`No custom LM Studio URL set. Using default: ${activeUrl}`);
          }
          break;
        }
        
        // Validate IP:Port format
        const ipPortRegex = /^(?:https?:\/\/)?(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|[\w.-]+):(\d{1,5})(?:\/.*)?$/;
        if (!ipPortRegex.test(urlArg)) {
          commandResponse('Error: Invalid format. Use IP:PORT (e.g., 192.168.0.15:1234)', CliOutputType.ERROR);
          break;
        }
        
        try {
          saveLmStudioUrl(urlArg);
          const newUrl = getCurrentBaseUrl();
          commandResponse(`✅ LM Studio URL updated to: ${urlArg}`);
          commandResponse(`   Active URL: ${newUrl}`);
          commandResponse('   Settings saved to user profile.');
        } catch (error) {
          commandResponse(`Error saving LM Studio URL: ${error instanceof Error ? error.message : 'Unknown error'}`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.CLEAR: {
        const nameToClear = args.join(' ').trim();
        let pToClear: Personality | undefined = undefined;
        if (nameToClear) {
            const { found, error } = findPersonalityByPartialName(nameToClear);
            if (error) { commandResponse(error, CliOutputType.ERROR); return; }
            pToClear = found[0];
        } else {
            pToClear = contextPersonality || cliFocusedPersonality;
        }
        
        if (!pToClear) {
             commandResponse(`Error: Personality not found or none active.`, CliOutputType.ERROR); return;
        }
        saveChatHistory(pToClear.id, []);
        commandResponse(`Cleared conversation history for: ${pToClear.name}`);
        break;
      }
      case CLI_COMMANDS.LIST:
        if (activePersonalities.length === 0) { commandResponse('No personalities loaded.'); } 
        else {
            const activeP = contextPersonality || cliFocusedPersonality;
            const list = activePersonalities.map(p => `- ${p.name}${p.id === activeP?.id ? ' (active)' : ''}`).join('\n');
            commandResponse(`Loaded Personalities:\n${list}`);
        }
        break;
      case CLI_COMMANDS.REGEN: {
        const personalityForRegen = contextPersonality || cliFocusedPersonality;
        if (!personalityForRegen) { commandResponse('Error: Must have an active window or CLI chat.', CliOutputType.ERROR); break; }
        if (isLoading) { commandResponse('Error: Already generating a response.', CliOutputType.ERROR); break; }
        
        const historyForRegen = getChatHistory(personalityForRegen.id);
        let lastUserMessageIndex = -1;
        for (let i = historyForRegen.length - 1; i >= 0; i--) {
            if (historyForRegen[i].author === MessageAuthor.USER) {
                lastUserMessageIndex = i;
                break;
            }
        }
        if (lastUserMessageIndex === -1) {
            commandResponse('Error: No previous user message found to regenerate from.', CliOutputType.ERROR);
            break;
        }

        const historyUpToUser = historyForRegen.slice(0, lastUserMessageIndex);
        const lastUserMessage = historyForRegen[lastUserMessageIndex];
        const historyForApi = [...historyUpToUser, lastUserMessage];
        
        saveChatHistory(personalityForRegen.id, historyForApi);
        commandResponse('Regenerating response...');

        const source = contextPersonality ? 'gui' : 'cli';
        triggerAiResponse(personalityForRegen.id, historyForApi, lastUserMessage.text, source);
        break;
      }
      case CLI_COMMANDS.UNDO: {
        const personalityForUndo = contextPersonality || cliFocusedPersonality;
        if (!personalityForUndo) { commandResponse('Error: Must have an active window or CLI chat.', CliOutputType.ERROR); break; }
        if (isLoading) { commandResponse('Error: Cannot undo while generating.', CliOutputType.ERROR); break; }

        let historyForUndo = getChatHistory(personalityForUndo.id);
        let itemsToRemove = 0;
        for (let i = historyForUndo.length - 1; i >= 0; i--) {
            itemsToRemove++;
            if (historyForUndo[i].author === MessageAuthor.USER) {
                saveChatHistory(personalityForUndo.id, historyForUndo.slice(0, -itemsToRemove));
                commandResponse(`Removed last ${itemsToRemove} message(s).`);
                return;
            }
        }
        commandResponse('Error: Could not find a user message to undo back to.', CliOutputType.ERROR);
        break;
      }
      case CLI_COMMANDS.LINK: {
        const [sourceName, targetName] = args;
        if (!sourceName) { 
          commandResponse(`Usage: link [source] [target] OR link [source] to list OR link all`, CliOutputType.ERROR); 
          commandResponse(`       link all - creates bidirectional links between all loaded personalities`);
          break; 
        }

        // Handle "link all" case
        if (sourceName.toLowerCase() === 'all') {
          if (activePersonalities.length < 2) {
            commandResponse('Error: Need at least 2 active personalities to link all.', CliOutputType.ERROR);
            break;
          }

          let linksCreated = 0;
          const personalityNames = activePersonalities.map(p => p.name);
          commandResponse(`Linking ${activePersonalities.length} personalities: ${personalityNames.join(', ')}`);
          
          // Create bidirectional links between all personalities
          for (let i = 0; i < activePersonalities.length; i++) {
            for (let j = i + 1; j < activePersonalities.length; j++) {
              const source = activePersonalities[i];
              const target = activePersonalities[j];
              
              // Debug: check current state before linking
              const sourceCanSeeTarget = source.visiblePersonalityIds.includes(target.id);
              const targetCanSeeSource = target.visiblePersonalityIds.includes(source.id);
              const alreadyLinked = sourceCanSeeTarget && targetCanSeeSource;
              
              if (!alreadyLinked) {
                // Use bidirectional linking helper
                const linkResult = createBidirectionalLink(source.id, target.id);
                if (linkResult) {
                  linksCreated++;
                  commandResponse(`✓ Linked ${source.name} ↔ ${target.name}`);
                } else {
                  commandResponse(`⚠ Failed to link ${source.name} ↔ ${target.name}`, CliOutputType.ERROR);
                }
              } else {
                commandResponse(`→ ${source.name} ↔ ${target.name} already linked`);
              }
            }
          }

          if (linksCreated > 0) {
            commandResponse(`Created ${linksCreated} new bidirectional links between ${activePersonalities.length} personalities.`);
            commandResponse(`All personalities can now see each other!`);
            commandResponse(`You can now use 'converse all' to start group conversations.`);
          } else {
            commandResponse(`All personalities were already linked to each other.`);
            commandResponse(`Use 'converse all' to start group conversations.`);
          }
          
          // Verification: Check if all personalities are actually linked
          setTimeout(() => {
            let missingLinks: string[] = [];
            const currentPersonalities = activePersonalities; // Get fresh state
            for (let i = 0; i < currentPersonalities.length; i++) {
              for (let j = 0; j < currentPersonalities.length; j++) {
                if (i !== j) {
                  const p1 = currentPersonalities[i];
                  const p2 = currentPersonalities[j];
                  if (!p1.visiblePersonalityIds.includes(p2.id)) {
                    missingLinks.push(`${p1.name} cannot see ${p2.name}`);
                  }
                }
              }
            }
            
            if (missingLinks.length > 0) {
              commandResponse(`⚠ Link verification failed! Missing links:`, CliOutputType.ERROR);
              missingLinks.slice(0, 5).forEach(link => {
                commandResponse(`  - ${link}`, CliOutputType.ERROR);
              });
              if (missingLinks.length > 5) {
                commandResponse(`  ... and ${missingLinks.length - 5} more`, CliOutputType.ERROR);
              }
            } else {
              commandResponse(`✅ Link verification passed: All personalities can see each other!`);
            }
          }, 500); // Small delay to allow state updates to complete
          
          break;
        }

        const { found: foundSource, error: errorSource } = findPersonalityByPartialName(sourceName);
        if (errorSource) { commandResponse(errorSource, CliOutputType.ERROR); break; }
        const source = foundSource[0];

        if (!targetName) {
            const visibleNames = source.visiblePersonalityIds.map(id => activePersonalities.find(p => p.id === id)?.name).filter(Boolean);
            const response = visibleNames.length > 0 ? `${source.name} has bidirectional links with: ${visibleNames.join(', ')}` : `${source.name} has no personality links.`;
            commandResponse(response);
            break;
        }

        const { found: foundTarget, error: errorTarget } = findPersonalityByPartialName(targetName);
        if (errorTarget) { commandResponse(errorTarget, CliOutputType.ERROR); break; }
        const target = foundTarget[0];

        if (source.id === target.id) { commandResponse(`Error: A personality cannot link to itself.`, CliOutputType.ERROR); break; }
        
        // Check if they can already see each other (bidirectional check)
        if (source.visiblePersonalityIds.includes(target.id) && target.visiblePersonalityIds.includes(source.id)) {
          commandResponse(`${source.name} and ${target.name} can already see each other.`);
          break;
        }

        const linksCreated = createBidirectionalLink(source.id, target.id);
        if (linksCreated) {
          commandResponse(`Bidirectional link established. ${source.name} and ${target.name} can now see each other.`);
        } else {
          commandResponse(`${source.name} and ${target.name} can already see each other.`);
        }
        break;
      }
      case CLI_COMMANDS.UNLINK: {
        const [sourceName, targetName] = args;
        if (!sourceName) { 
          commandResponse(`Usage: unlink [source] [target] OR unlink all`, CliOutputType.ERROR); 
          commandResponse(`       unlink all - removes all links between all personalities`);
          break; 
        }

        // Handle "unlink all" case
        if (sourceName.toLowerCase() === 'all') {
          if (activePersonalities.length < 2) {
            commandResponse('Error: Need at least 2 active personalities to unlink all.', CliOutputType.ERROR);
            break;
          }

          let linksRemoved = 0;
          const personalityNames = activePersonalities.map(p => p.name);
          
          // Remove all bidirectional links between all personalities
          for (let i = 0; i < activePersonalities.length; i++) {
            for (let j = i + 1; j < activePersonalities.length; j++) {
              const source = activePersonalities[i];
              const target = activePersonalities[j];
              
              // Use bidirectional unlinking helper (will report individual changes)
              if (removeBidirectionalLink(source.id, target.id)) {
                linksRemoved++;
              }
            }
          }

          if (linksRemoved > 0) {
            commandResponse(`Removed ${linksRemoved} bidirectional links between ${activePersonalities.length} personalities.`);
            commandResponse(`All personalities are now isolated: ${personalityNames.join(', ')}`);
          } else {
            commandResponse(`No links found between personalities. They were already isolated.`);
          }
          break;
        }

        if (!targetName) { commandResponse(`Usage: unlink [source] [target] OR unlink all`, CliOutputType.ERROR); break; }
        
        const { found: foundSource, error: errorSource } = findPersonalityByPartialName(sourceName);
        if (errorSource) { commandResponse(errorSource, CliOutputType.ERROR); break; }
        const source = foundSource[0];
        
        const { found: foundTarget, error: errorTarget } = findPersonalityByPartialName(targetName);
        if (errorTarget) { commandResponse(errorTarget, CliOutputType.ERROR); break; }
        const target = foundTarget[0];

        // Check if there's any link to remove (bidirectional check)
        if (!source.visiblePersonalityIds.includes(target.id) && !target.visiblePersonalityIds.includes(source.id)) {
          commandResponse(`${source.name} and ${target.name} cannot see each other.`, CliOutputType.ERROR);
          break;
        }
        
        const linksRemoved = removeBidirectionalLink(source.id, target.id);
        if (linksRemoved) {
          commandResponse(`Bidirectional link removed. ${source.name} and ${target.name} can no longer see each other.`);
        } else {
          commandResponse(`${source.name} and ${target.name} were not linked.`);
        }
        break;
      }
      case CLI_COMMANDS.CONVERSE: {
        if (args.length === 0) {
          commandResponse('Usage: converse [personality1] [personality2] [...more personalities] [optional topic]', CliOutputType.ERROR);
          commandResponse('       converse all [optional topic] - includes all loaded personalities');
          commandResponse('       converse stop/off - stops all ongoing conversations');
          commandResponse('Examples: converse alice bob - two-person conversation');
          commandResponse('          converse alice bob charlie - three-person conversation');
          commandResponse('          converse all philosophy - group discussion with all personalities');
          commandResponse('          converse stop - stop all conversations (alias: converse off)');
          break;
        }

        const firstArg = args[0].toLowerCase();

        // Handle "converse stop/off" case
        if (firstArg === 'off' || firstArg === 'stop') {
          if (conversingPersonalityIds.length === 0) {
            commandResponse('No conversations are currently active.');
            break;
          }

          const conversationCount = conversingPersonalityIds.length;
          const participantNames = conversingPersonalityIds
            .map(id => activePersonalities.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');

          // Stop all conversations by clearing the conversing IDs
          setConversingPersonalityIds([]);
          setCurrentConversationTopic(null); // Clear conversation topic
          
          // Cancel any ongoing TTS
          ttsService.cancel();

          commandResponse(`Stopped ${conversationCount > 2 ? 'group' : ''} conversation involving: ${participantNames}`);
          commandResponse('All personalities are now available for individual chat.');
          break;
        }

        // Handle "converse all" case
        if (firstArg === 'all') {
          // Use all active personalities
          if (activePersonalities.length < 2) {
            commandResponse('Error: Need at least 2 active personalities for a group conversation.', CliOutputType.ERROR);
            commandResponse('Tip: Load more personalities first, then use "converse all".');
            break;
          }

          // Check if all personalities can see each other (are linked)
          let missingLinks: string[] = [];
          for (let i = 0; i < activePersonalities.length; i++) {
            for (let j = 0; j < activePersonalities.length; j++) {
              if (i !== j) {
                const p1 = activePersonalities[i];
                const p2 = activePersonalities[j];
                if (!p1.visiblePersonalityIds.includes(p2.id)) {
                  missingLinks.push(`${p1.name} cannot see ${p2.name}`);
                }
              }
            }
          }
          
          if (missingLinks.length > 0) {
            commandResponse('Note: Not all personalities are explicitly linked. Proceeding with implicit visibility among all loaded personalities.');
          }
          
          const cliTopic = args.slice(1).join(' ').trim() || 'General discussion';
          // Check for forced topic first, then CLI topic
          const effectiveGroupTopic = experimentalSettings.forcedTopic?.trim() || cliTopic;
          const groupTopic = effectiveGroupTopic;
          const participantNames = activePersonalities.map(p => p.name).join(', ');
          commandResponse(`Initiating group conversation with all ${activePersonalities.length} personalities: ${participantNames}`);
          commandResponse(`Topic: ${groupTopic}${experimentalSettings.forcedTopic?.trim() ? ' (FORCED FROM EXPERIMENTAL SETTINGS)' : ''}`);
          handleMultiPersonConversation(activePersonalities, groupTopic);
          break;
        }

        // Parse personality names and topic
        // Look for topic by finding where personality names end
        const personalityNames: string[] = [];
        const topicParts: string[] = [];
        let foundTopic = false;

        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const { found } = findPersonalityByPartialName(arg);
          
          if (found.length > 0 && !foundTopic) {
            personalityNames.push(arg);
          } else {
            foundTopic = true;
            topicParts.push(...args.slice(i));
            break;
          }
        }

        // If we didn't find any valid personality names, treat all args as potential names
        if (personalityNames.length === 0) {
          personalityNames.push(...args);
        }

        const topic = topicParts.join(' ').trim();

        // Need at least 2 personalities
        if (personalityNames.length < 2) {
          commandResponse('Error: Need at least 2 personalities for a conversation.', CliOutputType.ERROR);
          break;
        }

        // Find all personalities
        const personalities: Personality[] = [];
        for (const name of personalityNames) {
          const { found, error } = findPersonalityByPartialName(name);
          if (error) {
            commandResponse(error, CliOutputType.ERROR);
            break;
          }
          if (found.length > 0) {
            personalities.push(found[0]);
          }
        }

        if (personalities.length !== personalityNames.length) {
          break; // Error already reported above
        }

        // Implicitly allow all selected personalities to see each other for this conversation

        if (personalities.length === 2) {
          // Two-person conversation
          const [p1, p2] = personalities;
          // Check for forced topic first, then CLI topic
          const effectiveTopicForCommand = experimentalSettings.forcedTopic?.trim() || topic || '';
          const topicSummary = effectiveTopicForCommand;
          const initialMessage = topicSummary
            ? `I was asked to discuss ${topicSummary} with you. Let's talk specifically about ${topicSummary}. What are your thoughts on ${topicSummary}?`
            : `Hello, ${p2.name}. I was asked to start a conversation with you.`;
          commandResponse(`Initiating conversation between ${p1.name} and ${p2.name}...`);
          if (topicSummary) {
            commandResponse(`Topic: ${topicSummary}${experimentalSettings.forcedTopic?.trim() ? ' (FORCED FROM EXPERIMENTAL SETTINGS)' : ''}`);
          }
          handleAiConversation(p1.id, p2.id, initialMessage, { topicHint: topicSummary || undefined });
        } else {
          // Multi-person conversation
          const names = personalities.map(p => p.name).join(', ');
          // Check for forced topic first, then CLI topic
          const effectiveTopicForCommand = experimentalSettings.forcedTopic?.trim() || topic || 'General discussion';
          const conversationTopic = effectiveTopicForCommand;
          commandResponse(`Initiating group conversation with ${personalities.length} personalities: ${names}`);
          commandResponse(`Topic: ${conversationTopic}${experimentalSettings.forcedTopic?.trim() ? ' (FORCED FROM EXPERIMENTAL SETTINGS)' : ''}`);
          handleMultiPersonConversation(personalities, conversationTopic);
        }
        break;
      }
      case CLI_COMMANDS.MOOD: {
        const moodArg = args.join(' '); // Allow multi-word moods like "filthy gagging"
        const predefinedMoods = ['neutral', 'angry', 'loving', 'happy', 'sad', 'paranoid', 'aroused', 'stoned', 'drunk', 'horny'];
        
        if (!moodArg) {
          commandResponse(`Current mood: ${currentMood}`);
          commandResponse(`Common moods: ${predefinedMoods.join(', ')}`);
          commandResponse(`You can also use any custom mood (e.g., "filthy gagging", "mysteriously seductive", "playfully mischievous")`);
          break;
        }
        
        const newMood = moodArg.toLowerCase();
        setCurrentMood(newMood);
        commandResponse(`Mood set to: ${newMood}`);
        commandResponse(`All personalities will now respond with a ${newMood} emotional state.`);
        break;
      }
      case CLI_COMMANDS.LOAD: {
        if (!currentUser) {
          commandResponse('Error: You must be logged in to load personalities.', CliOutputType.ERROR);
          break;
        }

        // Subcommand: load llm → insert a local LLM as a standard mind named "LLM"
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'llm') {
          try {
            // Detect local LLM availability priority: LM Studio URL -> llama.cpp server -> WebLLM model
            const useLlamaServer = (import.meta as any).env?.VITE_USE_LLAMA_SERVER === 'true';
            let llmMode: 'lmstudio' | 'llama' | 'webllm' | null = null;

            // 1) LM Studio (OpenAI-compatible) via saved URL/IP:port
            try {
              const ok = await testLmStudioConnection();
              if (ok) {
                llmMode = 'lmstudio';
              }
            } catch {}

            // 2) llama.cpp server via OpenAI-compatible /v1
            if (!llmMode && useLlamaServer) {
              try {
                const llamaBase = (((import.meta as any).env?.VITE_LLAMA_BASE_URL as string) || '/v1').replace(/\/$/, '');
                const res = await fetch(`${llamaBase}/models`, { method: 'GET' });
                if (res.ok) {
                  const data = await res.json().catch(() => null);
                  const hasModels = Array.isArray(data?.data) ? data.data.length > 0 : true;
                  if (hasModels) llmMode = 'llama';
                }
              } catch {}
            }

            // 3) WebLLM current model
            if (!llmMode && localModelService.getCurrentModel()) {
              llmMode = 'webllm';
            }

            if (!llmMode) {
              commandResponse('LLM unavailable', CliOutputType.ERROR);
              commandResponse('Tip: Set LM Studio URL with: llm <ip:port>, or enable VITE_USE_LLAMA_SERVER, or load a WebLLM model.');
              break;
            }

            // Reuse existing saved LLM mind if present; else create fresh with blank template
            const existingLlm = allPersonalities.find(p => p.name.toLowerCase() === 'llm');
            const otherIds = activePersonalities.map(p => p.id);
            if (existingLlm) {
              // Ensure LLM can chat with everyone immediately
              const updatedLlm: Personality = {
                ...existingLlm,
                visiblePersonalityIds: Array.from(new Set([...(existingLlm.visiblePersonalityIds || []), ...otherIds]))
              } as Personality;

              // Activate the updated LLM
              saveAndSetActivePersonalities([updatedLlm]);

              // Ensure everyone else can chat with LLM (bidirectional)
              activePersonalities.forEach(p => {
                if (!p.visiblePersonalityIds.includes(updatedLlm.id)) {
                  handleUpdatePersonality(p.id, { visiblePersonalityIds: [...p.visiblePersonalityIds, updatedLlm.id] });
                }
              });

              commandResponse(`LLM mind loaded (${llmMode === 'lmstudio' ? `LM Studio @ ${getCurrentBaseUrl()}` : llmMode}).`);
              openWindow(updatedLlm.id);
            } else {
              // Create LLM and immediately link to all loaded personalities (both directions)
              const newPersonality: Personality = {
                id: generateUUID(),
                name: 'LLM',
                knowledge: '',
                prompt: '',
                config: DEFAULT_CONFIG,
                visiblePersonalityIds: otherIds,
                ttsEnabled: false,
              };

              saveAndSetActivePersonalities([newPersonality]);

              // Ensure everyone sees LLM (bidirectional)
              activePersonalities.forEach(p => {
                if (!p.visiblePersonalityIds.includes(newPersonality.id)) {
                  handleUpdatePersonality(p.id, { visiblePersonalityIds: [...p.visiblePersonalityIds, newPersonality.id] });
                }
              });

              commandResponse(`LLM mind created and loaded (${llmMode === 'lmstudio' ? `LM Studio @ ${getCurrentBaseUrl()}` : llmMode}).`);
              openWindow(newPersonality.id);
            }

            break;
          } catch (error) {
            commandResponse(`Error loading LLM mind: ${error instanceof Error ? error.message : String(error)}`, CliOutputType.ERROR);
            break;
          }
        }

        setLoadModalOpen(true);
        commandResponse('Opening personality selection modal...');
        break;
      }
      case CLI_COMMANDS.CONVERSE_LENGTH: {
        const [lengthArg] = args;
        const validLengths = ['short', 'medium', 'long'];
        
        if (!lengthArg) {
          commandResponse(`Current conversation length: ${conversationLength}`);
          commandResponse(`Available lengths: ${validLengths.join(', ')}`);
          commandResponse('short: 1-2 sentences, medium: 1-2 paragraphs, long: detailed responses');
          break;
        }
        
        const newLength = lengthArg.toLowerCase() as 'short' | 'medium' | 'long';
        if (!validLengths.includes(newLength)) {
          commandResponse(`Error: Invalid length '${lengthArg}'. Available lengths: ${validLengths.join(', ')}`, CliOutputType.ERROR);
          break;
        }
        
        setConversationLength(newLength);
        commandResponse(`Conversation length set to: ${newLength}`);
        
        const descriptions = {
          short: '1-2 sentences maximum',
          medium: '1-2 paragraphs maximum', 
          long: 'detailed responses allowed'
        };
        commandResponse(`Personalities will now use ${descriptions[newLength]} in conversations.`);
        break;
      }
      case CLI_COMMANDS.ASSIGN_VOICES: {
        if (!currentUser) {
          commandResponse('Error: You must be logged in to assign voice IDs.', CliOutputType.ERROR);
          break;
        }

        // Subcommand: auto => assign random voices from ElevenLabs to missing personalities
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'auto') {
          try {
            const missing = activePersonalities
              .filter(p => !p.config?.voiceId || p.config.voiceId.trim() === '')
              .map(p => ({ id: p.id, name: p.name }));

            if (missing.length === 0) {
              commandResponse('All personalities already have a voice_id.');
              break;
            }

            commandResponse('Fetching ElevenLabs voices and assigning randomly to missing personalities...');
            const svc = await import('./services/elevenlabsService');
            const assignments = await svc.assignRandomVoiceIds(missing, elevenLabsApiKey || undefined);
            if (!assignments || assignments.length === 0) {
              commandResponse('Failed to assign random voices (no voices available or API error).', CliOutputType.ERROR);
              break;
            }

            let updated = [...activePersonalities];
            assignments.forEach(a => {
              updated = updated.map(p => p.id === a.personalityId
                ? { ...p, config: { ...p.config, voiceId: a.voiceId } }
                : p);
              try { voiceIdRegistry.setVoiceId(a.personalityId, a.voiceId); } catch (err) {
                console.warn('Failed to persist assigned ElevenLabs voice', a.personalityId, err);
              }
              commandResponse(`🎤 ${a.voiceName} → assigned to ${activePersonalities.find(p => p.id === a.personalityId)?.name}`);
            });

            const updatedWithRegistry = applyRegistryVoices(updated);
            setActivePersonalities(updatedWithRegistry);
            personalityService.savePersonalities([
              ...allPersonalities.filter(p => !activePersonalities.find(ap => ap.id === p.id)),
              ...updatedWithRegistry
            ]);
            commandResponse(`✅ Assigned ${assignments.length} ElevenLabs voice_id(s).`);
          } catch (e) {
            commandResponse(`Error assigning random voices: ${e instanceof Error ? e.message : String(e)}`, CliOutputType.ERROR);
          }
          break;
        }
        
        // Default behavior: assign voice mappings from JSON file
        try {
          commandResponse('Loading voice mappings and assigning to matching personalities...');
          let assignedCount = 0;
          const updatedPersonalities = [];
          
          for (const personality of activePersonalities) {
            const originalVoiceId = personality.config?.voiceId;
            const updatedPersonality = await assignVoiceIdToPersonality(personality);
            
            if (updatedPersonality.config?.voiceId !== originalVoiceId) {
              assignedCount++;
              commandResponse(`✅ Assigned voice to ${personality.name}: ${updatedPersonality.config?.voiceId}`);
            }
            
            updatedPersonalities.push(updatedPersonality);
          }
          
          if (assignedCount > 0) {
            const hydrated = applyRegistryVoices(updatedPersonalities);
            setActivePersonalities(hydrated);
            personalityService.savePersonalities([
              ...allPersonalities.filter(p => !activePersonalities.find(ap => ap.id === p.id)),
              ...hydrated
            ]);
            commandResponse(`🎤 Successfully assigned ${assignedCount} voice ID(s) to matching personalities.`);
          } else {
            commandResponse('No matching personalities found for voice assignment.');
            commandResponse('Available voice mappings: Tony Blair, Donald Trump, Gypsy Rose, Lucy Letby, Jill Dando, Myra Hindley, Maxine Carr, Reggie Cray, Mr T, Jimmy, Yorkshire RIP, Huntley, Karen Shannon, Adolf Hitler, Idi Amin');
          }
        } catch (error) {
          commandResponse(`Error assigning voice mappings: ${error instanceof Error ? error.message : String(error)}`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.PROFILE: {
        const [action, ...profileArgs] = args;
        
        if (!action) {
          commandResponse('Usage: profile [list|export|import] [args]');
          commandResponse('  profile list - Show all saved user profiles');
          commandResponse('  profile export [username] - Export user profile to JSON');
          commandResponse('  profile import [json_data] - Import user profile from JSON');
          break;
        }
        
        switch (action.toLowerCase()) {
          case 'list':
            const profiles = userProfileService.listUserProfiles();
            if (profiles.length === 0) {
              commandResponse('No user profiles found.');
            } else {
              commandResponse('📋 Saved User Profiles:');
              profiles.forEach(profile => {
                const lastLogin = new Date(profile.lastLogin).toLocaleDateString();
                commandResponse(`  👤 ${profile.username} - ${profile.personalityCount} personalities (Last: ${lastLogin})`);
              });
            }
            break;
            
          case 'export':
            const exportUsername = profileArgs[0];
            if (!exportUsername) {
              commandResponse('Error: Username required for export.', CliOutputType.ERROR);
              commandResponse('Usage: profile export [username]');
              break;
            }
            
            const exportData = userProfileService.exportUserProfile(exportUsername);
            if (exportData) {
              commandResponse(`📤 Profile exported for ${exportUsername}:`);
              commandResponse('Copy the following JSON data to save externally:');
              commandResponse('--- BEGIN PROFILE DATA ---');
              commandResponse(exportData);
              commandResponse('--- END PROFILE DATA ---');
            } else {
              commandResponse(`Error: Profile not found for user '${exportUsername}'.`, CliOutputType.ERROR);
            }
            break;
            
          case 'import':
            const importData = profileArgs.join(' ');
            if (!importData) {
              commandResponse('Error: JSON data required for import.', CliOutputType.ERROR);
              commandResponse('Usage: profile import [json_data]');
              break;
            }
            
            const importSuccess = userProfileService.importUserProfile(importData);
            if (importSuccess) {
              commandResponse('✅ Profile imported successfully!');
            } else {
              commandResponse('Error: Failed to import profile. Check JSON format.', CliOutputType.ERROR);
            }
            break;
            
          default:
            commandResponse(`Error: Unknown profile action '${action}'.`, CliOutputType.ERROR);
            commandResponse('Available actions: list, export, import');
            break;
        }
        break;
      }
      case CLI_COMMANDS.LOCAL: {
        const [action, modelName] = args;
        
        if (!action) {
          commandResponse('Usage: local [list|load|test] [model_name]');
          commandResponse('  local list - Show available local models with status');
          commandResponse('  local test - Test network connectivity to model servers');
          commandResponse('  local load - Show available models for loading');
          commandResponse('  local load [model] - Load a specific local model');
          break;
        }
        
        switch (action.toLowerCase()) {
          case 'list':
            const supportedModels = localModelService.getSupportedModels();
            const loadedModels = localModelService.getAvailableModels();
            const recommendedModels = localModelService.getRecommendedModels();
            
            commandResponse('📋 Available Local Models:');
            commandResponse('');
            commandResponse('💡 Recommended (Memory Efficient):');
            recommendedModels.forEach(model => {
              const isLoaded = loadedModels.some(loaded => loaded.modelId === model);
              const status = isLoaded ? '✅ Loaded' : '⬇️ Available';
              const displayName = model.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
              const memInfo = localModelService.getModelMemoryInfo(model);
              commandResponse(`  ${status} ${displayName} ${memInfo ? `(${memInfo.size})` : ''}`);
            });
            
            commandResponse('');
            commandResponse('⚠️ Larger Models (May Cause Memory Issues):');
            supportedModels.filter(model => !recommendedModels.includes(model)).forEach(model => {
              const isLoaded = loadedModels.some(loaded => loaded.modelId === model);
              const status = isLoaded ? '✅ Loaded' : '⬇️ Available';
              const displayName = model.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
              const memInfo = localModelService.getModelMemoryInfo(model);
              commandResponse(`  ${status} ${displayName} ${memInfo ? `(${memInfo.size})` : ''}`);
            });
            
            // Show currently loaded models
            if (loadedModels.length > 0) {
              commandResponse('');
              commandResponse('🔥 Currently Loaded Models:');
              loadedModels.forEach(model => {
                const displayName = model.type === 'gguf' ? 
                  `${model.name} (GGUF)` : 
                  model.modelId.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
                const sizeInfo = model.size ? ` - ${formatFileSize(model.size)}` : '';
                const isCurrent = localModelService.getCurrentModel()?.id === model.id ? ' ⭐ ACTIVE' : '';
                commandResponse(`  ✅ ${displayName}${sizeInfo}${isCurrent}`);
              });
              
              const current = localModelService.getCurrentModel();
              if (current) {
                commandResponse(`\n🎯 Current Model: ${current.name}`);
              }
            }
            
            commandResponse('');
            commandResponse('💡 Tip: Use Settings Modal to browse and load GGUF files');
            commandResponse('💡 For WebLLM models: Start with Qwen2.5-0.5B for best compatibility');
            break;

          case 'test':
            commandResponse('🔍 Testing network connectivity...');
            try {
              const connectivity = await localModelService.testNetworkConnectivity();
              commandResponse('');
              commandResponse('📡 Network Connectivity Results:');
              commandResponse(`  General Internet: ${connectivity.general ? '✅ Connected' : '❌ Failed'}`);
              commandResponse(`  Hugging Face: ${connectivity.huggingface ? '✅ Connected' : '❌ Failed'}`);
              
              if (!connectivity.general) {
                commandResponse('');
                commandResponse('⚠️ No internet connection detected.');
                commandResponse('💡 Check your network connection and try again.');
              } else if (!connectivity.huggingface) {
                commandResponse('');
                commandResponse('⚠️ Cannot reach Hugging Face servers.');
                commandResponse('💡 This might be due to:');
                commandResponse('   - Firewall/proxy restrictions');
                commandResponse('   - Corporate network blocking');
                commandResponse('   - Temporary server issues');
                commandResponse('💡 Try using a VPN or cloud providers instead.');
              } else {
                commandResponse('');
                commandResponse('✅ Network connectivity looks good!');
                commandResponse('💡 You should be able to download models.');
              }
            } catch (error) {
              commandResponse(`❌ Network test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, CliOutputType.ERROR);
            }
            break;
            
          case 'load':
            if (!modelName) {
              // Show interactive model selection
              const supportedModelsList = localModelService.getSupportedModels();
              const recommendedModels = localModelService.getRecommendedModels();
              
              commandResponse('📋 Available Models for Loading:');
              commandResponse('');
              commandResponse('💡 Recommended Models (Choose one):');
              
              recommendedModels.forEach((model, index) => {
                const displayName = model.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
                const memInfo = localModelService.getModelMemoryInfo(model);
                commandResponse(`  ${index + 1}. ${displayName} ${memInfo ? `(${memInfo.size})` : ''}`);
              });
              
              commandResponse('');
              commandResponse('⚠️ Larger Models (Advanced Users):');
              
              const largerModels = supportedModelsList.filter(model => !recommendedModels.includes(model));
              largerModels.forEach((model, index) => {
                const displayName = model.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Q)');
                const memInfo = localModelService.getModelMemoryInfo(model);
                commandResponse(`  ${recommendedModels.length + index + 1}. ${displayName} ${memInfo ? `(${memInfo.size})` : ''}`);
              });
              
              commandResponse('');
              commandResponse('💡 To load a model, use: local load [model_name]');
              commandResponse('💡 Example: local load Qwen2.5-0.5B');
              commandResponse('💡 Or use the Settings Modal (⚙️) for easier selection');
              break;
            }
            
            // First check if it's an already loaded model
            const loadedModelsList = localModelService.getAvailableModels();
            const loadedModel = loadedModelsList.find(model => 
              model.name.toLowerCase().includes(modelName.toLowerCase()) ||
              model.modelId.toLowerCase().includes(modelName.toLowerCase())
            );
            
            if (loadedModel) {
              // Switch to the already loaded model
              setCurrentLocalModel(loadedModel.id);
              setApiProvider(ApiProvider.LOCAL);
              setModel(loadedModel.name);
              commandResponse(`✅ Switched to loaded model: ${loadedModel.name}`);
              break;
            }
            
            // Find the full model ID from the display name for WebLLM models
            const supportedModelsList = localModelService.getSupportedModels();
            const fullModelId = supportedModelsList.find(model => 
              model.toLowerCase().includes(modelName.toLowerCase()) ||
              model.replace('-MLC', '').toLowerCase().includes(modelName.toLowerCase())
            );
            
            if (!fullModelId) {
              commandResponse(`Error: Model '${modelName}' not found.`, CliOutputType.ERROR);
              commandResponse('Use "local list" to see available models.');
              commandResponse('💡 For GGUF models, use the Settings Modal to browse and load them first.');
              break;
            }
            
            commandResponse(`🔄 Loading model: ${fullModelId.replace('-MLC', '').replace(/q4f\d+_\d+/, '(Quantized)')}...`);
            commandResponse('⏳ This may take several minutes for the first load.');
            
            try {
              await handleLocalModelLoad(fullModelId);
            } catch (error) {
              // Error handling is done in handleLocalModelLoad
            }
            break;
            
          default:
            commandResponse(`Error: Unknown action '${action}'. Use 'list' or 'load'.`, CliOutputType.ERROR);
            break;
        }
        break;
      }
      case CLI_COMMANDS.DEBUG: {
        if (currentUser !== 'admin') { commandResponse('Error: Admin only.', CliOutputType.ERROR); break; }
        const arg = args[0]?.toLowerCase();
        
        // Gang debug subcommand
        if (arg === 'gangs') {
          // Check if gangs feature is enabled
          if (!experimentalSettings.gangsEnabled) {
            commandResponse('Error: Gang debug requires gangs feature to be enabled in Experimental settings.', CliOutputType.ERROR);
            commandResponse('Enable gangs in Settings > Experimental first.', CliOutputType.ERROR);
            break;
          }
          
          const gangArg = args[1]?.toLowerCase();
          if (!gangArg || gangArg === 'toggle') { 
            const newState = !gangDebugOpen; 
            setGangDebugOpen(newState); 
            commandResponse(`Gang debug window ${newState ? 'opened' : 'closed'}.`); 
            break; 
          }
          if (gangArg === 'on') { setGangDebugOpen(true); commandResponse('Gang debug window opened.'); break; }
          if (gangArg === 'off') { setGangDebugOpen(false); commandResponse('Gang debug window closed.'); break; }
          if (gangArg === 'clear') { 
            setGangEvents([]); 
            setGangConversations([]);
            setDrugTransactions([]);
            setKilledInGangSession(new Set()); // Clear killed tracking
            commandResponse('Gang events, conversations, drug transactions, and death masks cleared.'); 
            break; 
          }
          if (gangArg === 'testdrugs') {
            // Manually trigger multiple test drug transactions
            const testPersonality = activePersonalities[0];
            if (testPersonality) {
              const memberStatus = experimentalSettings.gangsConfig?.memberStatus[testPersonality.id];
              const gang = memberStatus?.gangId ? experimentalSettings.gangsConfig?.gangs[memberStatus.gangId] : null;
              
              // Add multiple test transactions
              addDrugTransaction(
                'deal',
                testPersonality.id,
                testPersonality.name,
                25,
                `💰 TEST: Dealt 25g drugs for $750! Gang money: $1500`,
                750,
                false,
                gang?.id,
                gang?.name
              );
              
              addDrugTransaction(
                'smuggle',
                testPersonality.id,
                testPersonality.name,
                40,
                `💊 TEST: Successfully smuggled 40g drugs into prison! Total stash: 65g`,
                undefined,
                false,
                gang?.id,
                gang?.name
              );
              
              addDrugTransaction(
                'deal',
                testPersonality.id,
                testPersonality.name,
                15,
                `🚨 TEST: CAUGHT dealing 15g drugs! Lost drugs.`,
                0,
                true,
                gang?.id,
                gang?.name
              );
              
              commandResponse(`Added 3 test drug transactions for ${testPersonality.name}`);
              commandResponse(`Check Gang Debug Window → 💊 Drug Deals tab`);
            } else {
              commandResponse('No personalities loaded for drug test', CliOutputType.ERROR);
            }
            break;
          }
          if (gangArg === 'release') {
            // Bribe guards to release imprisoned gang members
            if (!experimentalSettings.gangsEnabled || !experimentalSettings.gangsConfig) {
              commandResponse('Error: Gangs must be enabled', CliOutputType.ERROR);
              break;
            }
            
            const imprisonedMembers = activePersonalities.filter(p => {
              const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
              return status?.imprisoned && !status.killed;
            });
            
            if (imprisonedMembers.length === 0) {
              commandResponse('No gang members are currently imprisoned', CliOutputType.RESPONSE);
              break;
            }
            
            let releasedCount = 0;
            let failedCount = 0;
            
            for (const member of imprisonedMembers) {
              const releaseResult = gangService.attemptPrisonReleaseBribe(
                experimentalSettings.gangsConfig,
                member.id
              );
              
              if (releaseResult.success) {
                releasedCount++;
                addGangEvent('released', `💰 ${member.name} ${releaseResult.message}`, [member.id]);
                commandResponse(`✅ ${member.name}: ${releaseResult.message}`);
              } else {
                failedCount++;
                commandResponse(`❌ ${member.name}: ${releaseResult.message}`, CliOutputType.ERROR);
              }
              
              // Update the config
              setExperimentalSettings(prev => ({
                ...prev,
                gangsConfig: releaseResult.config
              }));
            }
            
            commandResponse(`Release attempts: ${releasedCount} successful, ${failedCount} failed`);
            break;
          }
          if (gangArg === 'drugstats') {
            commandResponse(`💊 Drug Transaction Stats:`);
            commandResponse(`Total transactions tracked: ${drugTransactions.length}`);
            if (drugTransactions.length > 0) {
              const deals = drugTransactions.filter(t => t.type === 'deal');
              const smuggles = drugTransactions.filter(t => t.type === 'smuggle');
              const caught = drugTransactions.filter(t => t.caught);
              const totalProfit = drugTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);
              
              commandResponse(`  • Deals: ${deals.length}`);
              commandResponse(`  • Smuggling: ${smuggles.length}`);
              commandResponse(`  • Caught: ${caught.length}`);
              commandResponse(`  • Total Profit: $${totalProfit}`);
              
              commandResponse(`Recent transactions:`);
              drugTransactions.slice(-3).forEach(t => {
                commandResponse(`  ${t.type.toUpperCase()}: ${t.personalityName} - ${t.amount}g ${t.profit ? `($${t.profit})` : ''} ${t.caught ? '[CAUGHT]' : ''}`);
              });
            }
            break;
          }
          if (gangArg === 'leave') {
            // Find the personality with a gang ID to leave
            const gangMember = activePersonalities.find(p => experimentalSettings.gangsConfig?.memberStatus[p.id]?.gangId);
            if (gangMember && experimentalSettings.gangsConfig) {
              const oldGangId = experimentalSettings.gangsConfig.memberStatus[gangMember.id].gangId;
              const oldGangName = experimentalSettings.gangsConfig.gangs[oldGangId]?.name || oldGangId;

              setExperimentalSettings(prev => {
                if (!prev.gangsConfig) return prev;
                const updated = gangService.removeFromGang(prev.gangsConfig, gangMember.id);
                return { ...prev, gangsConfig: updated };
              });

              addGangEvent('leave', `💔 ${gangMember.name} left ${oldGangName}`, [gangMember.id]);
              commandResponse(`${gangMember.name} left ${oldGangName}.`);
            } else {
              commandResponse('No gang member found to leave.', CliOutputType.ERROR);
            }
            break;
          }
          commandResponse("Usage: debug gangs [on|off|toggle|clear|leave|testdrugs|drugstats|release]", CliOutputType.ERROR);
          break;
        }
        
        // Regular debug window
        if (!arg || arg === 'toggle') { setDebugOpen(o => !o); commandResponse(`Debug window ${!debugOpen ? 'opened' : 'closed'}.`); break; }
        if (arg === 'on') { setDebugOpen(true); commandResponse('Debug window opened.'); break; }
        if (arg === 'off') { setDebugOpen(false); commandResponse('Debug window closed.'); break; }
        if (arg === 'clear') { setDebugEvents([]); commandResponse('Debug logs cleared.'); break; }
        commandResponse("Usage: debug [on|off|toggle|clear] or debug gangs [on|off|toggle|clear] or debug api", CliOutputType.ERROR);
        break;
      }
      
      case CLI_COMMANDS.DEBUG_API: {
        if (currentUser !== 'admin') {
          commandResponse('❌ Admin access required for API debug monitor.', CliOutputType.ERROR);
          break;
        }
        
        setApiDebugOpen(true);
        setApiDebugMinimized(false);
          commandResponse('📊 API Debug Monitor opened.', CliOutputType.RESPONSE);
        break;
      }
      case CLI_COMMANDS.MIMIC: {
        // Usage: mimic [source] [target] [message]
        const rest = cleanCommandStr.slice(command.length).trim();
        const parts = rest.split(/\s+/);
        if (parts.length < 3) {
          commandResponse("Usage: mimic [source] [target] [message]", CliOutputType.ERROR);
          break;
        }
        
        const sourceName = parts[0];
        const targetName = parts[1];
        const injectedMsg = parts.slice(2).join(' '); // Join remaining parts as the message
        
        if (!sourceName || !targetName || !injectedMsg) {
          commandResponse("Usage: mimic [source] [target] [message]", CliOutputType.ERROR);
          break;
        }
        
        const { found: srcMatches, error: srcErr } = findPersonalityByPartialName(sourceName);
        if (srcErr || srcMatches.length === 0) { commandResponse(srcErr || `Source not found: ${sourceName}`, CliOutputType.ERROR); break; }
        const sourceP = srcMatches[0];
        const { found: dstMatches, error: dstErr } = findPersonalityByPartialName(targetName);
        if (dstErr || dstMatches.length === 0) { commandResponse(dstErr || `Target not found: ${targetName}`, CliOutputType.ERROR); break; }
        const targetP = dstMatches[0];

        // Ensure bidirectional visibility so the message can be delivered
        const srcCanSeeTgt = sourceP.visiblePersonalityIds.includes(targetP.id);
        const tgtCanSeeSrc = targetP.visiblePersonalityIds.includes(sourceP.id);
        if (!srcCanSeeTgt || !tgtCanSeeSrc) {
          const linked = createBidirectionalLink(sourceP.id, targetP.id);
          if (!linked) {
            // Even if not linked, proceed with direct injection below
          }
        }

        addCliMessage(`[MIMIC] Injecting message as ${sourceP.name} → ${targetP.name}: ${injectedMsg}`, CliOutputType.COMMUNICATION);
        addDebugEvent('inject', `Mimic ${sourceP.name} → ${targetP.name}`, injectedMsg, { sourceId: sourceP.id, targetId: targetP.id });

        // Reuse existing path to send message and trigger natural response/TTS
        await sendPersonalityMessage(sourceP.id, targetP.id, injectedMsg);
        break;
      }
      case CLI_COMMANDS.GAME: {
        if (activePersonalities.length < 10) {
          commandResponse('Error: At least 10 loaded personalities required to play The Hidden Identities game.', CliOutputType.ERROR);
          commandResponse(`Currently loaded: ${activePersonalities.length}/10. Use 'load' command to select more personalities.`);
          break;
        }
        setIsGameWindowOpen(true);
        commandResponse('Opening The Hidden Identities game window...');
        break;
      }
      case CLI_COMMANDS.CHESS: {
        const opponentName = args[0];
        if (!opponentName) {
          commandResponse('Usage: chess [personality_name]', CliOutputType.ERROR);
          commandResponse('Example: chess Adolf');
          break;
        }

        const { found: matches, error: err } = findPersonalityByPartialName(opponentName);
        if (err || matches.length === 0) {
          commandResponse(err || `Personality '${opponentName}' not found or not loaded.`, CliOutputType.ERROR);
          break;
        }

        const opponent = matches[0];
        setChessOpponent(opponent);
        setChessHistory([
          {
            author: MessageAuthor.SYSTEM,
            text: `Starting chess game with ${opponent.name}. You are playing as White. Good luck!`,
            timestamp: new Date().toISOString(),
          },
        ]);
        commandResponse(`Opening chess board. You are playing against ${opponent.name} as White.`);
        break;
      }
      case CLI_COMMANDS.GAME2: {
        if (activePersonalities.length < 3) {
          commandResponse('Error: At least 3 loaded personalities required to play Celebrity Guess.', CliOutputType.ERROR);
          commandResponse(`Currently loaded: ${activePersonalities.length}/3. Use 'load' command to select more personalities.`);
          break;
        }
        
        const newGameState = celebrityGuessService.initializeGame(activePersonalities);
        setCelebrityGameState(newGameState);
        setIsCelebrityGameOpen(true);
        commandResponse('Opening Celebrity Guess game window...');
        break;
      }
      case CLI_COMMANDS.BRIBE: {
        if (!experimentalSettings.gangsEnabled || !experimentalSettings.gangsConfig) {
          commandResponse('Error: Gang mode must be enabled. Enable in Settings > Experimental > Gangs.', CliOutputType.ERROR);
          break;
        }
        
        if (!experimentalSettings.gangsConfig.weaponsEnabled) {
          commandResponse('Error: Weapons system is disabled. Enable in Settings > Experimental > Gangs > Weapons.', CliOutputType.ERROR);
          break;
        }
        
        if (args.length < 2) {
          commandResponse('Usage: bribe [personality] [gun|shank|chain]', CliOutputType.ERROR);
          commandResponse('Example: bribe Alice gun - Bribe guard to smuggle a gun for Alice');
          commandResponse('Example: bribe Bob shank - Bribe guard for a shank for Bob');
          break;
        }
        
        const [personalityName, weaponTypeStr] = args;
        const weaponType = weaponTypeStr.toLowerCase() as 'gun' | 'shank' | 'chain';
        
        if (!['gun', 'shank', 'chain'].includes(weaponType)) {
          commandResponse(`Error: Invalid weapon type '${weaponTypeStr}'. Use: gun, shank, or chain.`, CliOutputType.ERROR);
          break;
        }
        
        const { found: matches, error: findErr } = findPersonalityByPartialName(personalityName);
        if (findErr || matches.length === 0) {
          commandResponse(findErr || `Personality '${personalityName}' not found.`, CliOutputType.ERROR);
          break;
        }
        
        const personality = matches[0];
        const bribeResult = gangService.attemptGuardBribe(
          experimentalSettings.gangsConfig,
          personality.id,
          weaponType
        );
        
        if (bribeResult.success) {
          console.log(`[APP] Bribe success! Updating gangsConfig. Weapon:`, bribeResult.weapon);
          console.log(`[APP] Member now has ${bribeResult.config.memberStatus[personality.id].weapons.length} weapons`);
          
          setExperimentalSettings(prev => {
            console.log(`[APP] Previous gangsConfig weapons count:`, Object.values(prev.gangsConfig?.memberStatus || {}).reduce((sum, s) => sum + (s.weapons?.length || 0), 0));
            const updated = {
              ...prev,
              gangsConfig: bribeResult.config
            };
            console.log(`[APP] Updated gangsConfig weapons count:`, Object.values(updated.gangsConfig?.memberStatus || {}).reduce((sum, s) => sum + (s.weapons?.length || 0), 0));
            return updated;
          });
          
          commandResponse(`✅ ${personality.name}: ${bribeResult.message}`, CliOutputType.RESPONSE);
          addGangEvent('bribe_success', `💰 ${personality.name} successfully bribed guard for ${bribeResult.weapon?.name}`, [personality.id]);
          if (bribeResult.weapon) {
            addGangEvent('weapon_acquired', `🔫 ${personality.name} acquired ${bribeResult.weapon.name} via bribe`, [personality.id]);
          }
        } else {
          setExperimentalSettings(prev => ({
            ...prev,
            gangsConfig: bribeResult.config
          }));
          
          const isSolitary = bribeResult.message.includes('SOLITARY');
          commandResponse(`${isSolitary ? '⚠️' : '❌'} ${personality.name}: ${bribeResult.message}`, isSolitary ? CliOutputType.ERROR : CliOutputType.RESPONSE);
          
          if (isSolitary) {
            addGangEvent('imprisoned', `🔒 ${personality.name} caught bribing guard - sent to SOLITARY CONFINEMENT`, [personality.id]);
          } else {
            addGangEvent('bribe_failed', `❌ ${personality.name}'s bribe attempt failed`, [personality.id]);
          }
        }
        break;
      }
      case CLI_COMMANDS.CRAFT: {
        if (!experimentalSettings.gangsEnabled || !experimentalSettings.gangsConfig) {
          commandResponse('Error: Gang mode must be enabled. Enable in Settings > Experimental > Gangs.', CliOutputType.ERROR);
          break;
        }
        
        if (!experimentalSettings.gangsConfig.weaponsEnabled) {
          commandResponse('Error: Weapons system is disabled. Enable in Settings > Experimental > Gangs > Weapons.', CliOutputType.ERROR);
          break;
        }
        
        if (args.length < 2) {
          commandResponse('Usage: craft [personality] [shank|chain]', CliOutputType.ERROR);
          commandResponse('Example: craft Alice shank - Alice crafts a shank');
          commandResponse('Note: Guns cannot be crafted, only obtained from guards.');
          break;
        }
        
        const [personalityName, weaponTypeStr] = args;
        const weaponType = weaponTypeStr.toLowerCase() as 'shank' | 'chain';
        
        if (!['shank', 'chain'].includes(weaponType)) {
          commandResponse(`Error: Invalid weapon type '${weaponTypeStr}'. Can only craft: shank or chain (not guns).`, CliOutputType.ERROR);
          break;
        }
        
        const { found: matches, error: findErr } = findPersonalityByPartialName(personalityName);
        if (findErr || matches.length === 0) {
          commandResponse(findErr || `Personality '${personalityName}' not found.`, CliOutputType.ERROR);
          break;
        }
        
        const personality = matches[0];
        const craftResult = gangService.craftWeapon(
          experimentalSettings.gangsConfig,
          personality.id,
          weaponType as any
        );
        
        if (craftResult.success) {
          console.log(`[APP] Craft success! Updating gangsConfig. Weapon:`, craftResult.weapon);
          console.log(`[APP] Member now has ${craftResult.config.memberStatus[personality.id].weapons.length} weapons`);
          
          setExperimentalSettings(prev => {
            const updated = {
              ...prev,
              gangsConfig: craftResult.config
            };
            console.log(`[APP] Updated gangsConfig weapons count:`, Object.values(updated.gangsConfig?.memberStatus || {}).reduce((sum, s) => sum + (s.weapons?.length || 0), 0));
            return updated;
          });
          
          commandResponse(`✅ ${personality.name}: ${craftResult.message}`, CliOutputType.RESPONSE);
          addGangEvent('weapon_crafted', `🔨 ${personality.name} crafted ${craftResult.weapon?.name}`, [personality.id]);
          if (craftResult.weapon) {
            addGangEvent('weapon_acquired', `🔫 ${personality.name} acquired ${craftResult.weapon.name} via crafting`, [personality.id]);
          }
        } else {
          commandResponse(`❌ ${personality.name}: ${craftResult.message}`, CliOutputType.RESPONSE);
        }
        break;
      }
      case CLI_COMMANDS.STEAL: {
        if (!experimentalSettings.gangsEnabled || !experimentalSettings.gangsConfig) {
          commandResponse('Error: Gang mode must be enabled. Enable in Settings > Experimental > Gangs.', CliOutputType.ERROR);
          break;
        }
        
        if (!experimentalSettings.gangsConfig.weaponsEnabled) {
          commandResponse('Error: Weapons system is disabled. Enable in Settings > Experimental > Gangs > Weapons.', CliOutputType.ERROR);
          break;
        }
        
        if (args.length < 2) {
          commandResponse('Usage: steal [thief] [victim]', CliOutputType.ERROR);
          commandResponse('Example: steal Alice Bob - Alice steals a weapon from Bob');
          commandResponse('Note: Victim must have at least one weapon.', CliOutputType.ERROR);
          break;
        }
        
        const [thiefName, victimName] = args;
        
        const { found: thiefMatches, error: thiefErr } = findPersonalityByPartialName(thiefName);
        if (thiefErr || thiefMatches.length === 0) {
          commandResponse(thiefErr || `Thief personality '${thiefName}' not found.`, CliOutputType.ERROR);
          break;
        }
        
        const { found: victimMatches, error: victimErr } = findPersonalityByPartialName(victimName);
        if (victimErr || victimMatches.length === 0) {
          commandResponse(victimErr || `Victim personality '${victimName}' not found.`, CliOutputType.ERROR);
          break;
        }
        
        const thief = thiefMatches[0];
        const victim = victimMatches[0];
        
        if (thief.id === victim.id) {
          commandResponse('Error: Cannot steal from yourself!', CliOutputType.ERROR);
          break;
        }
        
        const stealResult = gangService.stealWeapon(
          experimentalSettings.gangsConfig,
          thief.id,
          victim.id
        );
        
        if (stealResult.success) {
          console.log(`[APP] Steal success! Weapon:`, stealResult.weapon);
          console.log(`[APP] Thief ${thief.name} now has ${stealResult.config.memberStatus[thief.id].weapons.length} weapons`);
          console.log(`[APP] Victim ${victim.name} now has ${stealResult.config.memberStatus[victim.id].weapons.length} weapons`);
          
          setExperimentalSettings(prev => {
            const updated = {
              ...prev,
              gangsConfig: stealResult.config
            };
            console.log(`[APP] Updated gangsConfig weapons count:`, Object.values(updated.gangsConfig?.memberStatus || {}).reduce((sum, s) => sum + (s.weapons?.length || 0), 0));
            return updated;
          });
          
          commandResponse(`✅ ${thief.name}: ${stealResult.message}`, CliOutputType.RESPONSE);
          addGangEvent('weapon_stolen', `🔪 ${thief.name} stole ${stealResult.weapon?.name} from ${victim.name}`, [thief.id, victim.id]);
        } else {
          commandResponse(`❌ ${thief.name}: ${stealResult.message}`, CliOutputType.RESPONSE);
        }
        break;
      }
      case CLI_COMMANDS.INSERT: {
        if (!currentUser) {
          commandResponse('Error: You must be logged in to use the insert command.', CliOutputType.ERROR);
          break;
        }

        commandResponse('🔓 GANG PRISON INSERTION SEQUENCE INITIATED...', CliOutputType.RESPONSE);
        
        // Step 1: Enable gang mode if not already enabled
        let gangsConfig = experimentalSettings.gangsConfig;
        if (!experimentalSettings.gangsEnabled || !gangsConfig) {
          commandResponse('⚙️  Enabling gang mode...', CliOutputType.RESPONSE);
          gangsConfig = gangService.getDefaultConfig();
          gangsConfig = gangService.initializeGangs(gangsConfig);
          gangsConfig = gangService.initializeGuards(gangsConfig, 6);
          gangsConfig.deathEnabled = true; // Enable death for realistic prison experience
          gangsConfig.weaponsEnabled = true; // Enable weapons system
          
          setExperimentalSettings(prev => ({
            ...prev,
            gangsEnabled: true,
            gangsConfig: gangsConfig
          }));
          commandResponse('✅ Gang mode enabled with 3 rival gangs!', CliOutputType.RESPONSE);
        } else {
          commandResponse('✅ Gang mode already active.', CliOutputType.RESPONSE);
        }

        // Step 2: Create "Spunker" personality
        commandResponse('👤 Creating "Spunker" personality...', CliOutputType.RESPONSE);
        const spunkerId = generateUUID();
        const spunkerPersonality: Personality = {
          id: spunkerId,
          name: 'Spunker',
          knowledge: `You are Spunker, a notorious street hustler and con artist who got caught running an underground gambling ring. You're cunning, manipulative, and always looking for an angle. You speak in street slang and never back down from a challenge. You've been in and out of prison multiple times and know how the system works. You're always scheming to gain respect and climb the prison hierarchy.`,
          prompt: `Respond as Spunker, a street-smart hustler with a cocky attitude. Use urban slang, make references to hustling and gambling. You're always calculating odds and looking for opportunities. You respect strength but value intelligence more. You're unpredictable - friendly one moment, ruthless the next.`,
          config: { ...DEFAULT_CONFIG, temperature: 0.9, topP: 0.95 },
          visiblePersonalityIds: [],
          ttsEnabled: globalTtsEnabled,
          profileImage: undefined
        };

        // Step 3: Create user's avatar personality
        const userName = currentUser === 'admin' ? 'The Administrator' : currentUser;
        commandResponse(`👤 Creating your avatar: "${userName}"...`, CliOutputType.RESPONSE);
        const userAvatarId = generateUUID();
        const userAvatarPersonality: Personality = {
          id: userAvatarId,
          name: userName,
          knowledge: `You are ${userName}, a new inmate who just arrived at this maximum-security prison. You're observant, cautious, and trying to figure out the power dynamics. You're not a hardened criminal but you're determined to survive. You watch, listen, and learn before making moves. You understand that respect is earned through actions, not words.`,
          prompt: `Respond as ${userName}, a newcomer to prison who is street-smart but still learning the ropes. Be cautious and observant. Ask questions to understand gang dynamics. Show respect to established inmates but don't be a pushover. Your goal is survival and possibly gaining allies.`,
          config: { ...DEFAULT_CONFIG, temperature: 0.85 },
          visiblePersonalityIds: [],
          ttsEnabled: globalTtsEnabled,
          profileImage: undefined
        };

        // Step 4: Load both personalities
        commandResponse('📥 Loading personalities into prison system...', CliOutputType.RESPONSE);
        setActivePersonalities(prev => {
          // Filter out any duplicates by name
          const filtered = prev.filter(p => 
            p.name.toLowerCase() !== 'spunker' && 
            p.name.toLowerCase() !== userName.toLowerCase()
          );
          return [...filtered, spunkerPersonality, userAvatarPersonality];
        });

        // Step 5: Assign to rival gangs
        setTimeout(() => {
          setExperimentalSettings(prev => {
            if (!prev.gangsConfig) return prev;
            
            const gangIds = Object.keys(prev.gangsConfig.gangs);
            if (gangIds.length < 2) {
              commandResponse('⚠️  Not enough gangs to create rivalry. Both personalities remain independent.', CliOutputType.ERROR);
              return prev;
            }

            // Assign Spunker to first gang
            const spunkerGangId = gangIds[0];
            const spunkerGang = prev.gangsConfig.gangs[spunkerGangId];
            
            // Assign user avatar to a different gang (rival)
            const userGangId = gangIds[gangIds.length > 2 ? 1 : 1]; // Pick 2nd gang
            const userGang = prev.gangsConfig.gangs[userGangId];

            commandResponse(`🔴 Spunker assigned to: ${spunkerGang.name}`, CliOutputType.RESPONSE);
            commandResponse(`🔵 ${userName} assigned to: ${userGang.name}`, CliOutputType.RESPONSE);
            commandResponse('⚔️  You are now RIVALS in the prison gang war!', CliOutputType.ERROR);

            // Use gangService to properly assign them
            let updatedConfig = gangService.assignToGang(prev.gangsConfig, spunkerId, spunkerGangId, false);
            updatedConfig = gangService.assignToGang(updatedConfig, userAvatarId, userGangId, false);

            // Link personalities so they can interact
            setTimeout(() => {
              setActivePersonalities(current => {
                return current.map(p => {
                  if (p.id === spunkerId) {
                    return { ...p, visiblePersonalityIds: [userAvatarId, ...p.visiblePersonalityIds] };
                  }
                  if (p.id === userAvatarId) {
                    return { ...p, visiblePersonalityIds: [spunkerId, ...p.visiblePersonalityIds] };
                  }
                  return p;
                });
              });
            }, 100);

            return {
              ...prev,
              gangsConfig: updatedConfig
            };
          });

          // Step 6: Open gang debug window
          setTimeout(() => {
            setGangDebugOpen(true);
            commandResponse('📊 Gang debug window opened for monitoring.', CliOutputType.RESPONSE);
            commandResponse('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', CliOutputType.RESPONSE);
            commandResponse('🔓 INSERTION COMPLETE!', CliOutputType.RESPONSE);
            commandResponse(`✅ ${userName} and Spunker are now in rival gangs.`, CliOutputType.RESPONSE);
            commandResponse('💬 Use "person Spunker" or "person ' + userName + '" to interact.', CliOutputType.RESPONSE);
            commandResponse('📊 Monitor gang activity in the debug window.', CliOutputType.RESPONSE);
            commandResponse('⚠️  Death is ENABLED - survive the gang war!', CliOutputType.ERROR);
            commandResponse('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', CliOutputType.RESPONSE);
            
            addGangEvent('prison_insertion', `🚨 NEW INMATES: ${userName} and Spunker have been inserted into rival gangs!`, [userAvatarId, spunkerId]);
          }, 500);
        }, 500);

        break;
      }
      case CLI_COMMANDS.UNLOAD: {
        // Unload all personalities from desktop and close their chat windows
        // Similar to CLOSE_ALL but less destructive - keeps user logged in and doesn't reset settings
        
        ttsService.cancel();
        
        const windowCount = windows.length;
        const personalityCount = activePersonalities.length;
        const conversationCount = conversingPersonalityIds.length;
        
        // Save loaded personalities to available slots before unloading
        if (activePersonalities.length > 0) {
          try {
            // Load current slots
            const raw = localStorage.getItem(PERSONALITY_SLOTS_STORAGE_KEY);
            const currentSlots = raw ? JSON.parse(raw) : [];
            const SLOT_COUNT = 15;
            const slots = Array.from({ length: SLOT_COUNT }, (_, i) => currentSlots[i] ?? null);
            
            let savedCount = 0;
            let skippedCount = 0;
            
            // Save each active personality to an available slot
            for (const personality of activePersonalities) {
              // Check if personality already exists in slots (by name)
              const existsInSlots = slots.some(slot => 
                slot && slot.name.toLowerCase().trim() === personality.name.toLowerCase().trim()
              );
              
              if (existsInSlots) {
                skippedCount++;
                continue;
              }
              
              // Find first empty slot
              const emptySlotIndex = slots.findIndex(slot => slot === null);
              if (emptySlotIndex !== -1) {
                slots[emptySlotIndex] = personality;
                savedCount++;
              } else {
                // No empty slots available, skip this personality
                skippedCount++;
              }
            }
            
            // Save updated slots to localStorage
            if (savedCount > 0) {
              localStorage.setItem(PERSONALITY_SLOTS_STORAGE_KEY, JSON.stringify(slots));
              // Dispatch custom event to notify of slots update
              window.dispatchEvent(new Event('personalitySlotsUpdated'));
            }
            
            // Report slot saving results
            if (savedCount > 0) {
              commandResponse(`💾 Saved ${savedCount} personalit${savedCount !== 1 ? 'ies' : 'y'} to slots`, CliOutputType.RESPONSE);
            }
            if (skippedCount > 0) {
              commandResponse(`⏭️ Skipped ${skippedCount} personalit${skippedCount !== 1 ? 'ies' : 'y'} (already in slots or no space)`, CliOutputType.RESPONSE);
            }
          } catch (error) {
            commandResponse(`⚠️ Failed to save personalities to slots: ${error}`, CliOutputType.WARNING);
          }
        }
        
        // Save current user profile before unloading (if user is logged in)
        if (currentUser) {
          userProfileService.saveUserProfile(currentUser, []);
        }
        
        // Stop all conversations
        setConversingPersonalityIds([]);
        
        // Close all windows
        setWindows([]);
        
        // Unload all personalities
        setActivePersonalities([]);
        
        // Clear CLI focused personality
        setCliFocusedPersonalityId(null);
        
        // Close games but don't reset settings
        setIsGameWindowOpen(false);
        setIsCelebrityGameOpen(false);
        setChessOpponent(null);
        
        // Clear voice registry for unloaded personalities
        voiceIdRegistry.clearAll();
        personalityNameRegistryRef.current = {};
        
        // Provide feedback
        const messages = [];
        if (windowCount > 0) {
          messages.push(`closed ${windowCount} window${windowCount !== 1 ? 's' : ''}`);
        }
        if (personalityCount > 0) {
          messages.push(`unloaded ${personalityCount} personalit${personalityCount !== 1 ? 'ies' : 'y'}`);
        }
        if (conversationCount > 0) {
          messages.push(`stopped ${conversationCount} conversation${conversationCount !== 1 ? 's' : ''}`);
        }
        
        commandResponse('📤 PERSONALITY UNLOAD COMPLETE', CliOutputType.RESPONSE);
        if (messages.length > 0) {
          commandResponse(`✅ ${messages.join(', ')}`);
        }
        commandResponse('✅ All conversations terminated');
        commandResponse('✅ Desktop cleared - personalities saved to slots');
        commandResponse('', CliOutputType.RESPONSE);
        commandResponse('Use "load" command to reload personalities from slots.', CliOutputType.RESPONSE);
        
        break;
      }
      case 'weapons': {
        // Debug command to check weapon status
        if (!experimentalSettings.gangsEnabled || !experimentalSettings.gangsConfig) {
          commandResponse('Error: Gang mode must be enabled.', CliOutputType.ERROR);
          break;
        }
        
        if (!experimentalSettings.gangsConfig.weaponsEnabled) {
          commandResponse('Error: Weapons system is disabled.', CliOutputType.ERROR);
          break;
        }
        
        const totalWeapons = Object.values(experimentalSettings.gangsConfig.memberStatus).reduce((sum, s) => sum + (s.weapons?.length || 0), 0);
        const armedMembers = Object.values(experimentalSettings.gangsConfig.memberStatus).filter(s => (s.weapons?.length || 0) > 0).length;
        
        commandResponse(`📊 WEAPON STATUS:`, CliOutputType.RESPONSE);
        commandResponse(`Total weapons in circulation: ${totalWeapons}`, CliOutputType.RESPONSE);
        commandResponse(`Armed members: ${armedMembers}/${activePersonalities.length}`, CliOutputType.RESPONSE);
        
        if (totalWeapons > 0) {
          commandResponse('', CliOutputType.RESPONSE);
          commandResponse('Armed personalities:', CliOutputType.RESPONSE);
          
          activePersonalities.forEach(p => {
            const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
            if (status && status.weapons.length > 0) {
              const weaponsList = status.weapons.map(w => `${w.name} (${w.type}, ${w.damage} dmg, ${w.durability.toFixed(0)}%)`).join(', ');
              commandResponse(`  ${p.name}: ${status.weapons.length} weapon(s) - ${weaponsList}`, CliOutputType.RESPONSE);
            }
          });
        } else {
          commandResponse('No weapons in circulation. Use: bribe [name] [gun|shank|chain]', CliOutputType.RESPONSE);
        }
        break;
      }
      case CLI_COMMANDS.USAGE: {
        if (!currentUser) {
          commandResponse('Error: You must be logged in to view API usage statistics.', CliOutputType.ERROR);
          break;
        }
        
        if (currentUser !== 'admin') {
          commandResponse('Error: Only admin users can view API usage statistics.', CliOutputType.ERROR);
          break;
        }
        
        const userData = users[currentUser];
        const apiUsage = userData?.apiUsage;
        
        if (!apiUsage) {
          commandResponse('No API usage data available yet.');
          break;
        }
        
        commandResponse('=== GEMINI API USAGE STATISTICS ===');
        commandResponse(`Total Requests: ${apiUsage.totalRequests}`);
        commandResponse(`Input Tokens: ${formatTokenCount(apiUsage.totalInputTokens)}`);
        commandResponse(`Output Tokens: ${formatTokenCount(apiUsage.totalOutputTokens)}`);
        commandResponse(`Total Tokens: ${formatTokenCount(apiUsage.totalInputTokens + apiUsage.totalOutputTokens)}`);
        commandResponse(`Estimated Cost: ${formatCost(apiUsage.estimatedCost)}`);
        commandResponse(`Last Updated: ${new Date(apiUsage.lastUpdated).toLocaleString()}`);
        commandResponse('');
        commandResponse('Note: Costs are estimates based on approximate token counting.');
        break;
      }
      case CLI_COMMANDS.VOICES: {
        try {
          const svc = await import('./services/elevenlabsService');
          commandResponse('🔊 Fetching ElevenLabs voices...');
          const voices = await svc.listVoices(elevenLabsApiKey || undefined);
          if (!voices || voices.length === 0) {
            commandResponse('No ElevenLabs voices found. Ensure your API key is set in Settings.', CliOutputType.ERROR);
          } else {
            commandResponse('🎙️ ElevenLabs Voices:');
            voices.forEach(v => commandResponse(`  • ${v.name} — ${v.voice_id}`));
            commandResponse('Use: assignvoices auto — to assign random voices to personalities missing a voice_id.');
          }
        } catch (e) {
          commandResponse(`Error listing voices: ${e instanceof Error ? e.message : String(e)}`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.VOICE_DEBUG: {
        commandResponse('🔍 Voice Assignment Debug:');
        commandResponse(`Current TTS Provider: ${ttsProvider}`);
        commandResponse(`Saved TTS Provider: ${localStorage.getItem(TTS_PROVIDER_STORAGE_KEY) || 'None'}`);
        commandResponse('');
        
        if (activePersonalities.length === 0) {
          commandResponse('No personalities loaded.');
          break;
        }
        
        activePersonalities.forEach((personality, index) => {
          const voiceId = personality.config?.voiceId;
          const registryVoiceId = voiceIdRegistry.getVoiceId(personality.id);
          const hasVoiceId = voiceId && voiceId.trim() !== '';
          const hasRegistryId = registryVoiceId && registryVoiceId.trim() !== '';
          
          commandResponse(`${index + 1}. ${personality.name}:`);
          commandResponse(`   Config Voice ID: ${hasVoiceId ? voiceId : 'None'}`);
          commandResponse(`   Registry Voice ID: ${hasRegistryId ? registryVoiceId : 'None'}`);
          commandResponse(`   TTS Enabled: ${personality.ttsEnabled ? 'Yes' : 'No'}`);
          
          // Show inferred voice for browser TTS
          if (ttsProvider === TtsProvider.BROWSER) {
            const text = `${personality.name}\n${personality.prompt}\n${personality.knowledge}`.toLowerCase();
            let accent = 'en-US';
            if (/(\buk\b|british|england|london|oxford|manchester|yorkshire|birmingham|liverpool|glasgow|edinburgh|wales|scotland)/.test(text)) {
              accent = 'en-GB';
            } else if (/(australi|aussie|sydney|melbourne|brisbane|perth|adelaide|darwin|canberra)/.test(text)) {
              accent = 'en-AU';
            } else if (/(india|indian|mumbai|delhi|bangalore|kolkata|chennai|hyderabad|pune|ahmedabad|hindi|punjabi|tamil|bengali)/.test(text)) {
              accent = 'en-IN';
            }
            commandResponse(`   Detected Accent: ${accent}`);
          }
          
          // Show inferred voice for OpenAI TTS
          if (ttsProvider === TtsProvider.OPENAI) {
            const personalityText = `${personality.name} ${personality.prompt || ''} ${personality.knowledge || ''}`.toLowerCase();
            let inferredVoice = 'alloy'; // default
            
            // Simulate the voice selection logic
            if (personalityText.includes('tony blair')) inferredVoice = 'fable';
            else if (personalityText.includes('lucy letby')) inferredVoice = 'nova';
            else if (personalityText.includes('jill dando')) inferredVoice = 'shimmer';
            else if (personalityText.includes('keir starmer')) inferredVoice = 'echo';
            else {
              // Hash-based selection for variety
              let hash = 0;
              const seed = personality.id || personality.name;
              for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
              }
              const voices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];
              inferredVoice = voices[Math.abs(hash) % 6];
            }
            
            commandResponse(`   Inferred OpenAI Voice: ${inferredVoice}`);
          }
          
          commandResponse('');
        });
        
        // Show recommendations
        const missingVoices = activePersonalities.filter(p => 
          !p.config?.voiceId || p.config.voiceId.trim() === ''
        );
        
        if (missingVoices.length > 0) {
          commandResponse(`⚠️  ${missingVoices.length} personalities have no voice ID assigned.`);
          if (ttsProvider === TtsProvider.ELEVENLABS) {
            commandResponse('Run: assignvoices auto — to assign random ElevenLabs voices');
          } else if (ttsProvider === TtsProvider.GEMINI) {
            commandResponse('Gemini TTS will auto-select Neural2 voices based on personality');
          } else {
            commandResponse('Browser TTS will use accent detection for voice selection');
          }
        } else {
          commandResponse('✅ All personalities have voice assignments.');
        }
        break;
      }
      case CLI_COMMANDS.SOUND: {
        const [soundArg] = args;
        
        if (!soundArg) {
          commandResponse(`Global TTS is currently: ${globalTtsEnabled ? 'ON' : 'OFF'}`);
          commandResponse('Usage: sound [on|off]');
          break;
        }
        
        const soundState = soundArg.toLowerCase();
        if (soundState === 'on') {
          applyGlobalTts(true);
          commandResponse('Global TTS enabled. All personalities will now speak when TTS is enabled for their windows.');
        } else if (soundState === 'off') {
          applyGlobalTts(false);
          commandResponse('Global TTS disabled. No personalities will speak regardless of individual TTS settings.');
        } else {
          commandResponse(`Error: Invalid option '${soundArg}'. Use 'on' or 'off'.`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.SHADOW: {
        const [arg] = args;
        if (!arg) {
          commandResponse(`CLI shadow overlay is currently: ${cliShadowEnabled ? 'ON' : 'OFF'}`);
          commandResponse('Usage: shadow [on|off]');
          break;
        }
        const state = arg.toLowerCase();
        if (state === 'on') {
          setCliShadowEnabled(true);
          localStorage.setItem(CLI_SHADOW_ENABLED_STORAGE_KEY, 'true');
          commandResponse('CLI shadow overlay enabled.');
        } else if (state === 'off') {
          setCliShadowEnabled(false);
          localStorage.setItem(CLI_SHADOW_ENABLED_STORAGE_KEY, 'false');
          commandResponse('CLI shadow overlay disabled.');
        } else {
          commandResponse(`Error: Invalid option '${arg}'. Use 'on' or 'off'.`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.AUTONOMOUS: {
        const [arg] = args;
        if (!arg) {
          commandResponse(`Autonomous communication is currently: ${autonomousCommunicationEnabled ? 'ENABLED' : 'DISABLED'}`);
          commandResponse('Usage: autonomous [on|off]');
          commandResponse('When enabled, linked personalities can spontaneously message each other.');
          break;
        }
        const state = arg.toLowerCase();
        if (state === 'on') {
          setAutonomousCommunicationEnabled(true);
          commandResponse('Autonomous communication ENABLED.');
          commandResponse('Linked personalities can now spontaneously message each other.');
        } else if (state === 'off') {
          setAutonomousCommunicationEnabled(false);
          commandResponse('Autonomous communication DISABLED.');
          commandResponse('Personalities will no longer initiate spontaneous conversations.');
        } else {
          commandResponse(`Error: Invalid option '${arg}'. Use 'on' or 'off'.`, CliOutputType.ERROR);
        }
        break;
      }
      case CLI_COMMANDS.SAY: {
        const message = args.join(' ');
        
        if (!message.trim()) {
          commandResponse('Error: Please provide a message to say.', CliOutputType.ERROR);
          commandResponse('Usage: say [your message]');
          break;
        }
        
        // Check if there are ongoing conversations
        if (conversingPersonalityIds.length === 0) {
          commandResponse('No ongoing conversations to join. Start a conversation first using "converse" command.', CliOutputType.ERROR);
          break;
        }
        
        // Create user message
        const userMessage: ChatMessage = {
          author: MessageAuthor.USER,
          text: message,
          timestamp: new Date().toISOString()
        };
        
        // Add message to all conversation participants
        const addMessageToAll = (msg: ChatMessage) => {
          const updateHistories = (currentHistories: Record<string, ChatMessage[]>) => {
            const newHistories = {...currentHistories};
            conversingPersonalityIds.forEach(id => {
              const history = currentHistories[id] || getChatHistory(id);
              newHistories[id] = [...history, msg];
              if(currentUser) {
                saveChatHistory(id, newHistories[id]);
              }
            });
            return newHistories;
          };
          setSessionHistories(prev => updateHistories(prev));
        };
        
        // Add user message to all participants
        addMessageToAll(userMessage);
        
        // Log the message to CLI
        setCliHistory(prev => [...prev, { type: CliOutputType.USER_MESSAGE, text: message }]);
        
        // Stop any current automated response
        setCurrentSpeakerId(null);
        setShouldSkipToNext(true);
        
        // Get participant names for display
        const participantNames = conversingPersonalityIds
          .map(id => activePersonalities.find(p => p.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        
        commandResponse(`Message inserted into ongoing conversation with: ${participantNames}`);
        commandResponse('The conversation will continue naturally from here.');
        
        // Let the conversation continue with the next speaker in line
        // The automated conversation system will pick up and continue
        if (conversingPersonalityIds.length > 0) {
          // Find the next speaker (could be random or round-robin based on your system)
          const nextSpeakerId = conversingPersonalityIds[Math.floor(Math.random() * conversingPersonalityIds.length)];
          
          // Give a brief moment for the system to process, then continue conversation
          setTimeout(() => {
            const contextPrompt = `${currentUser || 'The user'} just said: "${message}". Please respond naturally to their input and continue the conversation. Stay in character and incorporate their message into the ongoing discussion. Speak in first person only - no action descriptions, no asterisks, no third-person narration. Just your direct speech as if talking aloud.`;
            triggerAiResponse(nextSpeakerId, getChatHistory(nextSpeakerId), contextPrompt, 'converse');
          }, 500);
        }
        
        break;
      }
      case CLI_COMMANDS.CLOSE_CHATS: {
        const openWindowCount = windows.length;
        const conversationCount = conversingPersonalityIds.length;
        
        // Stop all conversations
        if (conversingPersonalityIds.length > 0) {
          setConversingPersonalityIds([]);
          ttsService.cancel();
        }
        
        // Close all chat windows
        if (windows.length > 0) {
          setWindows([]);
          setFocusedWindowId(null);
        }
        
        // Exit CLI chat mode if active
        if (cliFocusedPersonalityId) {
          setCliFocusedPersonalityId(null);
        }
        
        // Provide feedback
        if (openWindowCount === 0 && conversationCount === 0 && !cliFocusedPersonalityId) {
          commandResponse('No active chats or conversations to close.');
        } else {
          const messages = [];
          if (openWindowCount > 0) {
            messages.push(`Closed ${openWindowCount} chat window${openWindowCount !== 1 ? 's' : ''}`);
          }
          if (conversationCount > 0) {
            messages.push(`Stopped ${conversationCount > 2 ? 'group' : ''} conversation${conversationCount > 2 ? 's' : ''}`);
          }
          if (cliFocusedPersonalityId) {
            messages.push('Exited CLI chat mode');
          }
          
          commandResponse(messages.join(', ') + '.');
          commandResponse('All personalities are now available for new conversations.');
        }
        break;
      }
      case CLI_COMMANDS.CLOSE_ALL:
      case CLI_COMMANDS.STOP: {
        // COMPREHENSIVE RESET: Full system shutdown and reset

        ttsService.cancel();
        applyGlobalTts(false);

        const windowCount = windows.length;
        const personalityCount = activePersonalities.length;
        const conversationCount = conversingPersonalityIds.length;
        const gangsWereEnabled = experimentalSettings.gangsEnabled;
        const gamesOpen = (isGameWindowOpen ? 1 : 0) + (isCelebrityGameOpen ? 1 : 0) + (chessOpponent ? 1 : 0);

        if (currentUser) {
          userProfileService.saveUserProfile(currentUser, []);
        }

        resetApplicationToInitialState();

        // Provide comprehensive feedback
        const messages = [];
        if (windowCount > 0) {
          messages.push(`closed ${windowCount} window${windowCount !== 1 ? 's' : ''}`);
        }
        if (personalityCount > 0) {
          messages.push(`unloaded ${personalityCount} personalit${personalityCount !== 1 ? 'ies' : 'y'}`);
        }
        if (conversationCount > 0) {
          messages.push(`stopped ${conversationCount} conversation${conversationCount !== 1 ? 's' : ''}`);
        }
        if (gamesOpen > 0) {
          messages.push(`closed ${gamesOpen} game${gamesOpen !== 1 ? 's' : ''}`);
        }
        
        commandResponse('🛑 SYSTEM RESET INITIATED', CliOutputType.RESPONSE);
        if (messages.length > 0) {
          commandResponse(`✅ ${messages.join(', ')}`);
        }
        commandResponse('✅ TTS disabled globally');
        commandResponse('✅ All experimental settings reset to defaults');
        if (gangsWereEnabled) {
          commandResponse('✅ Gang mode disabled');
        }
        commandResponse('✅ Mood reset to neutral');
        commandResponse('✅ All prompts reset to standard framework');
        commandResponse('', CliOutputType.RESPONSE);
        commandResponse('System ready for fresh start. Load personalities to begin.', CliOutputType.RESPONSE);
        break;
      }
      case CLI_COMMANDS.EXIT:
        if (cliFocusedPersonalityId) {
          setCliFocusedPersonalityId(null);
          commandResponse(`Exited chat with ${cliFocusedPersonality?.name}.`);
        } else {
          // No active CLI chat, treat as application exit with confirmation
          commandResponse('⚠️  WARNING: EXIT will perform a complete application reset!', CliOutputType.ERROR);
          commandResponse('This will:', CliOutputType.RESPONSE);
          commandResponse('• Close all chat windows and stop all conversations', CliOutputType.RESPONSE);
          commandResponse('• Unload all personalities and clear all history', CliOutputType.RESPONSE);
          commandResponse('• Reset all settings to defaults (gangs, mood, TTS, etc.)', CliOutputType.RESPONSE);
          commandResponse('• Log you out and return to the login screen ? (Y/N)', CliOutputType.RESPONSE);
          commandResponse('', CliOutputType.RESPONSE);
          commandResponse('Are you sure you want to exit and reset the application? (Y/N):', CliOutputType.ERROR);
          setPendingConfirmation('exit');
        }
        break;
      case CLI_COMMANDS.QUIT: {
        // Always show confirmation for quit
        commandResponse('⚠️  WARNING: QUIT will perform a complete application reset!', CliOutputType.ERROR);
        commandResponse('This will:', CliOutputType.RESPONSE);
        commandResponse('• Close all chat windows and stop all conversations', CliOutputType.RESPONSE);
        commandResponse('• Unload all personalities and clear all history', CliOutputType.RESPONSE);
        commandResponse('• Reset all settings to defaults (gangs, mood, TTS, etc.)', CliOutputType.RESPONSE);
        commandResponse('• Log you out and return to the login screen ? (Y/N)', CliOutputType.RESPONSE);
        commandResponse('', CliOutputType.RESPONSE);
        commandResponse('=======================================', CliOutputType.ERROR);
        commandResponse('Choose Yes or No', CliOutputType.ERROR);
        commandResponse('Are you sure you want to quit? (Y/N):', CliOutputType.ERROR);
        commandResponse('=======================================', CliOutputType.ERROR);
        setPendingConfirmation('quit');
        return; // Use return instead of break to exit immediately
      }
      case CLI_COMMANDS.CLAUDE: {
        if (!currentUser) {
          commandResponse('Error: You must be logged in to use Claude.', CliOutputType.ERROR);
          break;
        }
        
        if (currentUser !== 'admin') {
          commandResponse('Error: Only admin users can access Claude.', CliOutputType.ERROR);
          break;
        }

        const message = args.join(' ');
        if (!message) {
          commandResponse('Error: Please provide a message for Claude.', CliOutputType.ERROR);
          commandResponse('Usage: claude [your message]');
          break;
        }

        // Add user message to Claude CLI history
        const userMessage: ChatMessage = {
          author: MessageAuthor.USER,
          text: message,
          timestamp: new Date().toISOString()
        };
        
        const updatedHistory = [...claudeCliHistory, userMessage];
        setClaudeCliHistory(updatedHistory);
        
        // Display user message
        commandResponse(`You: ${message}`, CliOutputType.USER_MESSAGE);
        
        try {
          // Set up Claude CLI context with all the control functions
          const claudeContext: ClaudeControlContext = {
            currentUser,
            activePersonalities,
            allPersonalities,
            apiProvider,
            model,
            modelConfig,
            ttsProvider,
            setApiProvider: (provider: ApiProvider) => {
              setApiProvider(provider);
              localStorage.setItem(API_PROVIDER_STORAGE_KEY, provider);
              console.log(`[API PROVIDER] Switched to: ${provider}`);
            },
            setModel: (newModel: string) => {
              setModel(newModel);
              localStorage.setItem(CURRENT_MODEL_STORAGE_KEY, newModel);
            },
            setModelConfig: (updates: Partial<ModelConfig>) => {
              const newConfig = { ...modelConfig, ...updates };
              setModelConfig(newConfig);
              localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
            },
            setTtsProvider: (provider: TtsProvider) => {
              setTtsProvider(provider);
              localStorage.setItem(TTS_PROVIDER_STORAGE_KEY, provider);
            },
            setActivePersonalities,
            createPersonality: (personalityData: Omit<Personality, 'id'>) => {
              const newPersonality: Personality = {
                ...personalityData,
                id: generateUUID()
              };
              const updatedPersonalities = [...allPersonalities, newPersonality];
              setAllPersonalities(updatedPersonalities);
              personalityService.savePersonalities(updatedPersonalities);
            },
            updatePersonality: (id: string, updates: Partial<Personality>) => {
              const updatedPersonalities = allPersonalities.map(p => 
                p.id === id ? { ...p, ...updates } : p
              );
              setAllPersonalities(updatedPersonalities);
              personalityService.savePersonalities(updatedPersonalities);
            },
            deletePersonality: (id: string) => {
              const updatedPersonalities = allPersonalities.filter(p => p.id !== id);
              setAllPersonalities(updatedPersonalities);
              personalityService.savePersonalities(updatedPersonalities);
            },
            commandResponse: (text: string, type: CliOutputType = CliOutputType.RESPONSE) => {
              addCliMessage(text, type);
            },
            linkPersonalities: (sourceId: string, targetId: string) => {
              const updatedPersonalities = allPersonalities.map(p => {
                if (p.id === sourceId && !p.visiblePersonalityIds.includes(targetId)) {
                  return { ...p, visiblePersonalityIds: [...p.visiblePersonalityIds, targetId] };
                }
                if (p.id === targetId && !p.visiblePersonalityIds.includes(sourceId)) {
                  return { ...p, visiblePersonalityIds: [...p.visiblePersonalityIds, sourceId] };
                }
                return p;
              });
              setAllPersonalities(updatedPersonalities);
              personalityService.savePersonalities(updatedPersonalities);
            },
            unlinkPersonalities: (sourceId: string, targetId: string) => {
              const updatedPersonalities = allPersonalities.map(p => {
                if (p.id === sourceId) {
                  return { ...p, visiblePersonalityIds: p.visiblePersonalityIds.filter(id => id !== targetId) };
                }
                if (p.id === targetId) {
                  return { ...p, visiblePersonalityIds: p.visiblePersonalityIds.filter(id => id !== sourceId) };
                }
                return p;
              });
              setAllPersonalities(updatedPersonalities);
              personalityService.savePersonalities(updatedPersonalities);
            },
            setMood: (mood: string) => {
              setCurrentMood(mood);
            },
            toggleTts: (enabled: boolean) => {
              applyGlobalTts(enabled);
            },
            clearHistory: (personalityId?: string) => {
              if (personalityId) {
                setSessionHistories(prev => ({
                  ...prev,
                  [personalityId]: []
                }));
              } else {
                setSessionHistories({});
              }
            }
          };

          claudeCliService.setContext(claudeContext);
          
          // Get Claude's response
          const claudeResponse = await claudeCliService.processCommand(message, updatedHistory);
          
          // Add Claude's response to history
          const claudeMessage: ChatMessage = {
            author: MessageAuthor.AI,
            text: claudeResponse,
            timestamp: new Date().toISOString(),
            authorName: 'Claude'
          };
          
          setClaudeCliHistory(prev => [...prev, claudeMessage]);
          
          // Display Claude's response
          commandResponse(claudeResponse, CliOutputType.AI_RESPONSE);
          
        } catch (error) {
          console.error('Error communicating with Claude:', error);
          commandResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, CliOutputType.ERROR);
        }
        break;
      }
      default:
        commandResponse(`Error: Command not found '${command}'`, CliOutputType.ERROR);
    }
  };

  // Subscribe to TTS audio events for debug logs
  useEffect(() => {
    const onTts = (e: any) => {
      if (e?.type === 'start') {
        addDebugEvent('tts_start', `Playback START`, `Provider: ${e.provider}`, { provider: e.provider, speakerId: e.speakerId });
      } else if (e?.type === 'stop') {
        addDebugEvent('tts_stop', `Playback STOP`, `Provider: ${e.provider}`, { provider: e.provider, speakerId: e.speakerId });
      }
    };
    try { ttsService.addTtsAudioListener(onTts); } catch {}
    return () => { try { ttsService.removeTtsAudioListener(onTts); } catch {} };
  }, [addDebugEvent]);

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-light-bg dark:bg-base-900 overflow-hidden">
      {/* Grok-style star field background */}
      <StarField 
        enabled={starFieldEnabled}
        starCount={starFieldCount}
        speedMultiplier={starFieldSpeed}
        shootingStarsEnabled={shootingStarsEnabled}
      />
      
      {!currentUser ? (
        // Login Required Screen with background
        <div 
          className="h-full flex flex-col items-center justify-center"
          style={{
            backgroundImage: `url(${BACKGROUND_URLS[desktopBackground] || BACKGROUND_URLS['background.png']})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Background overlay for better contrast */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          
          <div className="relative z-10 max-w-md w-full mx-auto p-8 bg-light-panel/90 dark:bg-base-800/90 rounded-lg border border-light-border dark:border-base-700 shadow-2xl backdrop-blur-md">
            <div className="text-center mb-8">
              <h1 className="font-mono text-3xl font-light text-light-text dark:text-gray-100 tracking-wide uppercase mb-2">
                VIRTUAL MINDS FRAMEWORK V23
              </h1>
              <p className="text-sm text-light-text-secondary dark:text-gray-400">
                Login Required
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-light-text dark:text-gray-300 mb-4">
                  You must login to access the Virtual Minds Framework.
                </p>
                <div className="bg-light-bg/80 dark:bg-base-900/80 p-4 rounded-md border border-light-border dark:border-base-600 backdrop-blur-sm">
                  <p className="text-sm text-light-text-secondary dark:text-gray-400 mb-2 font-mono">
                    Available Commands:
                  </p>
                  <div className="space-y-1 text-left">
                    <p className="text-sm font-mono text-terminal">
                      <span className="text-blue-400">register</span> <span className="text-gray-500">[username]</span> - Create new account
                    </p>
                    <p className="text-sm font-mono text-terminal">
                      <span className="text-blue-400">login</span> <span className="text-gray-500">[username]</span> - Login to existing account
                    </p>
                    <p className="text-sm font-mono text-terminal">
                      <span className="text-blue-400">login admin</span> <span className="text-gray-500">[password]</span> - Admin access
                    </p>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
          
          {/* CLI for login only */}
          <div className="relative z-10 w-full max-w-4xl mx-auto mt-8 px-4">
            <Cli
              onCommand={handleCommand}
              history={cliHistory}
              cliFocusedPersonalityName={null}
              isMaximized={false}
              apiProvider={apiProvider}
              ttsProvider={ttsProvider}
              availableModels={availableModelsForCli}
              onModelSelect={handleModelSelection}
              availablePersonalities={[]} // No personalities available before login
              onPersonalitySelect={() => {}} // Disabled before login
              overlayEnabled={false}
              cliFontColor={cliFontColor}
              cliBgColor={cliBgColor}
              currentUser={currentUser}
              shadowEnabled={cliShadowEnabled}
            />
          </div>
        </div>
      ) : (
        // Main Application (only shown after login)
        <>
          <Header 
            onSettingsClick={() => {
              setSettingsInitialTab('ai');
              setSettingsOpen(true);
            }} 
            currentUser={currentUser} 
            theme={theme} 
            onThemeToggle={handleThemeToggle}
            globalTtsEnabled={globalTtsEnabled}
            onGlobalTtsToggle={() => applyGlobalTts(!globalTtsEnabled)}
            gangsEnabled={experimentalSettings.gangsEnabled}
            gangsConfig={experimentalSettings.gangsConfig}
            killedInGangSession={killedInGangSession}
            onGangSettingsClick={() => {
              setSettingsInitialTab('gangs');
              setSettingsOpen(true);
            }}
            onGangDebugClick={() => setGangDebugOpen(prev => !prev)}
            onMobileMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
            onGangModeDisableAndStop={() => {
              // Execute the same comprehensive reset as the stop command
              
              // 1. Stop all TTS immediately
              ttsService.cancel();
              
              // 2. Turn TTS OFF globally
              applyGlobalTts(false);
              
              // 3. Stop all conversations
              setConversingPersonalityIds([]);
              
              // 4. Close all windows
              setWindows([]);
              setFocusedWindowId(null);
              
              // 5. Close all game windows
              setIsGameWindowOpen(false);
              setIsCelebrityGameOpen(false);
              setCelebrityGameState(null);
              setChessOpponent(null);
              setChessHistory([]);
              
              // 6. Exit CLI chat mode
              if (cliFocusedPersonalityId) {
                setCliFocusedPersonalityId(null);
              }
              
              // 7. Unload all personalities
              setActivePersonalities([]);
              
              // 8. Save empty profile
              if (currentUser) {
                userProfileService.saveUserProfile(currentUser, []);
              }
              
              // 9. Reset all experimental settings to defaults (includes disabling gangs)
              setExperimentalSettings(getDefaultExperimentalSettings());
              
              // 10. Clear gang events and conversations
              setGangEvents([]);
              setGangConversations([]);
              
              // 11. Reset mood to neutral
              setCurrentMood('neutral');
              
              // 12. Reset desktop background to default
              setDesktopBackground('background.png');
              localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'background.png');
              
              // 13. Close gang debug window if open
              setGangDebugOpen(false);
              
              // Provide feedback via CLI
              addCliMessage('🛑 GANG MODE DISABLED & SYSTEM RESET COMPLETE', CliOutputType.RESPONSE);
              addCliMessage('✅ All personalities unloaded', CliOutputType.RESPONSE);
              addCliMessage('✅ TTS disabled globally', CliOutputType.RESPONSE);
              addCliMessage('✅ All experimental settings reset to defaults', CliOutputType.RESPONSE);
              addCliMessage('✅ Gang mode disabled', CliOutputType.RESPONSE);
              addCliMessage('✅ All prompts reset to standard framework', CliOutputType.RESPONSE);
              addCliMessage('', CliOutputType.RESPONSE);
              addCliMessage('System ready for fresh start. Load personalities to begin.', CliOutputType.RESPONSE);
            }}
            povertyEnabled={experimentalSettings.povertyEnabled}
            povertyConfig={experimentalSettings.povertyConfig}
            onPovertyDebugClick={() => setPovertyDebugOpen(prev => !prev)}
            onPovertySettingsClick={() => {
              setSettingsInitialTab('ai');
              setSettingsOpen(true);
            }}
            onPovertyDisable={() => {
              // Execute the same comprehensive reset as the stop command
              
              // 1. Stop all TTS immediately
              ttsService.cancel();
              
              // 2. Turn TTS OFF globally
              applyGlobalTts(false);
              
              // 3. Stop all conversations
              setConversingPersonalityIds([]);
              
              // 4. Close all windows
              setWindows([]);
              setFocusedWindowId(null);
              
              // 5. Close all game windows
              setIsGameWindowOpen(false);
              setIsCelebrityGameOpen(false);
              setCelebrityGameState(null);
              setChessOpponent(null);
              setChessHistory([]);
              
              // 6. Exit CLI chat mode
              if (cliFocusedPersonalityId) {
                setCliFocusedPersonalityId(null);
              }
              
              // 7. Unload all personalities
              setActivePersonalities([]);
              
              // 8. Save empty profile
              if (currentUser) {
                userProfileService.saveUserProfile(currentUser, []);
              }
              
              // 9. Reset all experimental settings to defaults (includes disabling poverty mode)
              setExperimentalSettings(getDefaultExperimentalSettings());
              
              // 10. Clear poverty events
              setPovertyEvents([]);
              
              // 11. Clear gang events and conversations
              setGangEvents([]);
              setGangConversations([]);
              
              // 12. Reset mood to neutral
              setCurrentMood('neutral');
              
              // 13. Reset desktop background to default
              setDesktopBackground('background.png');
              localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, 'background.png');
              
              // 14. Close all debug windows if open
              setGangDebugOpen(false);
              setPovertyDebugOpen(false);
              
              // Provide feedback via CLI
              addCliMessage('🛑 POVERTY MODE DISABLED & SYSTEM RESET COMPLETE', CliOutputType.RESPONSE);
              addCliMessage('✅ All personalities unloaded', CliOutputType.RESPONSE);
              addCliMessage('✅ TTS disabled globally', CliOutputType.RESPONSE);
              addCliMessage('✅ All experimental settings reset to defaults', CliOutputType.RESPONSE);
              addCliMessage('✅ Poverty mode disabled', CliOutputType.RESPONSE);
              addCliMessage('✅ All prompts reset to standard framework', CliOutputType.RESPONSE);
              addCliMessage('', CliOutputType.RESPONSE);
              addCliMessage('System ready for fresh start. Load personalities to begin.', CliOutputType.RESPONSE);
            }}
          />
          <div className="flex-1 flex overflow-hidden">
        <PersonalityPanel
          personalities={activePersonalities}
          openWindows={windows}
          onPersonalitySelect={openWindow}
          onPersonalityRemove={removePersonality}
          onFileUpload={handleFileUpload}
          onCreateClick={() => setDiscoverOpen(true)}
          onLoadFromServer={loadServerPersonalities}
          currentSpeakerId={currentSpeakerId}
          onSkipToNext={handleSkipToNext}
          slotsCount={slotsCount}
          gangsEnabled={experimentalSettings.gangsEnabled}
          gangsConfig={experimentalSettings.gangsConfig}
          povertyEnabled={experimentalSettings.povertyEnabled}
          povertyConfig={experimentalSettings.povertyConfig}
          dwpFlashPersonalityId={dwpFlashPersonalityId}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={() => setIsMobileMenuOpen(false)}
          customBgColor={personalityPanelBgColor}
          customBorderColor={personalityPanelBorderColor}
          customFontColor={personalityPanelFontColor}
        />
        <main className="flex-1 flex flex-col relative bg-light-bg dark:bg-base-900/50">
           {/* Desktop Area */}
           <div 
             className="flex-1 relative isolate overflow-hidden"
             style={{
               backgroundImage: starFieldEnabled ? 'none' : `url(${experimentalSettings.gangsEnabled ? GANGMODE_BACKGROUND_URL : BACKGROUND_URLS[desktopBackground] || BACKGROUND_URLS['background.png']})`,
               backgroundSize: experimentalSettings.gangsEnabled ? 'contain' : 'cover',
               backgroundPosition: 'center',
               backgroundRepeat: 'no-repeat'
             }}
           >
             {/* Gang Mode Black Background with Centered Image */}
             {experimentalSettings.gangsEnabled && !starFieldEnabled && (
               <div className="absolute inset-0 bg-black pointer-events-none z-0">
                 <div 
                   className="absolute inset-0 flex items-center justify-center"
                   style={{
                     backgroundImage: `url(${GANGBACKS_URL})`,
                     backgroundSize: 'contain',
                     backgroundPosition: 'center',
                     backgroundRepeat: 'no-repeat'
                   }}
                 />
               </div>
             )}

             {/* Killed Gang Personalities, Drug Medal Winners, and Struck-Off Homeless - Overlays on Desktop */}
             {((experimentalSettings.gangsEnabled || killedInGangSession.size > 0) && experimentalSettings.gangsConfig) || 
              (experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig) ? (
               <div className="absolute inset-0 pointer-events-none z-20 flex flex-wrap items-start justify-start p-8 gap-4">
                 {/* Death Masks - Gangs */}
                 {experimentalSettings.gangsConfig && activePersonalities
                   .filter(p => {
                     const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
                     // Show death mask if currently killed OR if killed during this gang session
                     return status?.killed || killedInGangSession.has(p.id);
                   })
                   .map((p, index) => {
                     const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
                     const gang = status?.gangId ? experimentalSettings.gangsConfig?.gangs[status.gangId] : null;
                     return (
                       <div
                         key={p.id}
                         className="flex flex-col items-center animate-pulse"
                         style={{
                           animationDuration: '3s',
                           animationDelay: `${index * 0.2}s`
                         }}
                       >
                         <div 
                           className="relative w-24 h-24 rounded-full border-4 border-red-600 bg-black/80 flex items-center justify-center shadow-2xl"
                           style={{
                             boxShadow: `0 0 20px rgba(220, 38, 38, 0.6), 0 0 40px rgba(220, 38, 38, 0.4)`
                           }}
                         >
                           {p.profileImage ? (
                             <img 
                               src={p.profileImage} 
                               alt={p.name}
                               className="w-full h-full rounded-full object-cover grayscale opacity-40"
                             />
                           ) : null}
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-5xl drop-shadow-lg">💀</span>
                           </div>
                           {gang && (
                             <div 
                               className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white"
                               style={{ backgroundColor: gang.color }}
                               title={gang.name}
                             />
                           )}
                         </div>
                         <div className="mt-2 px-3 py-1 bg-black/80 border border-red-600 rounded text-red-500 font-bold text-sm text-center shadow-lg">
                           {p.name}
                         </div>
                         <div className="text-[10px] text-red-400 font-mono uppercase mt-1">
                           KILLED
                         </div>
                       </div>
                     );
                   })
                 }
                 
                 {/* Struck-Off / Homeless Personalities - Poverty Mode */}
                 {experimentalSettings.povertyEnabled && experimentalSettings.povertyConfig && activePersonalities
                   .filter(p => {
                     const status = experimentalSettings.povertyConfig?.personalityStatus[p.id];
                     return status?.struckOffBenefits;
                   })
                   .map((p, index) => {
                     const status = experimentalSettings.povertyConfig?.personalityStatus[p.id];
                     return (
                       <div
                         key={`homeless-${p.id}`}
                         className="flex flex-col items-center animate-pulse"
                         style={{
                           animationDuration: '3s',
                           animationDelay: `${index * 0.2}s`
                         }}
                       >
                         <div 
                           className="relative w-24 h-24 rounded-full border-4 border-yellow-600 bg-black/80 flex items-center justify-center shadow-2xl"
                           style={{
                             boxShadow: `0 0 20px rgba(202, 138, 4, 0.6), 0 0 40px rgba(202, 138, 4, 0.4)`
                           }}
                         >
                           {p.profileImage ? (
                             <img 
                               src={p.profileImage} 
                               alt={p.name}
                               className="w-full h-full rounded-full object-cover grayscale opacity-40"
                             />
                           ) : null}
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-5xl drop-shadow-lg">🍺</span>
                           </div>
                         </div>
                         <div className="mt-2 px-3 py-1 bg-black/80 border border-yellow-600 rounded text-yellow-500 font-bold text-sm text-center shadow-lg">
                           {p.name}
                         </div>
                         <div className="text-[10px] text-yellow-400 font-mono uppercase mt-1">
                           HOMELESS
                         </div>
                         <div className="text-[9px] text-gray-400 font-mono text-center mt-0.5 max-w-[120px]">
                           Struck off DWP
                         </div>
                       </div>
                     );
                   })
                 }
                 
                 {/* Drug Medal Winners - Display separately from death masks */}
                 {experimentalSettings.gangsConfig && activePersonalities
                   .filter(p => {
                     const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
                     // Show drug medal if member has earned medal trophy and is not dead
                     return status && status.drugTrophies?.includes('medal') && !status.killed && !killedInGangSession.has(p.id);
                   })
                   .map((p, index) => {
                     const status = experimentalSettings.gangsConfig?.memberStatus[p.id];
                     const gang = status?.gangId ? experimentalSettings.gangsConfig?.gangs[status.gangId] : null;
                     const earnings = status?.totalDrugEarnings || 0;
                     
                     return (
                       <div
                         key={`medal-${p.id}`}
                         className="flex flex-col items-center animate-bounce"
                         style={{
                           animationDuration: '2s',
                           animationDelay: `${index * 0.3}s`
                         }}
                       >
                         <div 
                           className="relative w-20 h-20 rounded-full border-4 border-yellow-500 bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center shadow-2xl"
                           style={{
                             boxShadow: `0 0 30px rgba(250, 204, 21, 0.7), 0 0 60px rgba(250, 204, 21, 0.4)`
                           }}
                         >
                           {p.profileImage ? (
                             <img 
                               src={p.profileImage} 
                               alt={p.name}
                               className="w-14 h-14 rounded-full object-cover opacity-90"
                             />
                           ) : null}
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-4xl drop-shadow-lg">🏅</span>
                           </div>
                           {gang && (
                             <div 
                               className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-yellow-500 flex items-center justify-center text-xs font-bold shadow-lg"
                               style={{ backgroundColor: gang.color, borderColor: gang.color }}
                             >
                               <span className="text-white">{gang.name[0]}</span>
                             </div>
                           )}
                         </div>
                         <div className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-600 to-yellow-700 border border-yellow-500 rounded text-white font-bold text-sm text-center shadow-lg">
                           {p.name}
                         </div>
                         <div className="text-[10px] text-yellow-400 font-mono uppercase mt-1">
                           ${earnings.toLocaleString()} EARNED
                         </div>
                       </div>
                     );
                   })
                 }
               </div>
             ) : null}

             {/* Background overlay for better contrast */}
             {!starFieldEnabled && (
               <div className="absolute inset-0 bg-light-bg/20 dark:bg-base-900/30 pointer-events-none"></div>
             )}

             {/* Help overlay when shadow is ON */}
             {cliShadowEnabled && (
               <div className="absolute top-0 right-0 p-4 max-h-full overflow-y-auto pointer-events-none w-[44ch] sm:w-[520px]">
                 <div className="text-left text-xs sm:text-sm font-mono leading-5 whitespace-pre-wrap text-light-text dark:text-gray-100 bg-light-bg/60 dark:bg-base-900/70 rounded-bl-lg shadow-lg backdrop-blur-sm px-3 py-2 opacity-25">
                   {HELP_MESSAGE}
                 </div>
               </div>
             )}

             {windows.filter(w => w.status === WindowStatus.OPEN).sort((a,b) => a.zIndex - b.zIndex).map(win => {
                const personality = activePersonalities.find(p => p.id === win.personalityId);
                if (!personality) return null;
                return (
                    <DraggableWindow 
                        key={win.id} 
                        windowState={win} 
                        onFocus={() => focusWindow(win.id)}
                        onClose={() => closeWindow(win.id)}
                        onMinimize={() => minimizeWindow(win.id)}
                        onResize={(size) => handleWindowResize(win.id, size)}
                        isFocused={focusedWindowId === win.id}
                        personality={personality}
                        onUpdatePersonality={(id, updates) => handleUpdatePersonality(id, updates)}
                        onViewDetails={() => setViewingDetailsForId(personality.id)}
                        chatHistory={suppressHistory[win.personalityId] === true ? [] : getChatHistory(win.personalityId)}
                        isLoading={isLoading === win.id}
                        onSendMessage={(msg) => handleSendMessage(win.id, msg)}
                        onRepeatAt={(idx) => handleRepeatAt(win.personalityId, idx)}
                        currentUser={currentUser}
                        currentMood={currentMood}
                        onTtsToggle={() => {
                            setWindows(wins => wins.map(w => w.id === win.id ? {...w, sessionTtsEnabled: !w.sessionTtsEnabled} : w));
                            if(win.sessionTtsEnabled) ttsService.cancel();
                        }}
                        allPersonalities={activePersonalities}
                        onLinkToggle={(targetId) => {
                            const isLinked = personality.visiblePersonalityIds.includes(targetId);
                            if (isLinked) {
                                // Remove bidirectional link
                                removeBidirectionalLink(personality.id, targetId);
                            } else {
                                // Create bidirectional link
                                createBidirectionalLink(personality.id, targetId);
                            }
                        }}
                        isConversing={conversingPersonalityIds.includes(win.personalityId)}
                        isCurrentSpeaker={currentSpeakerId === win.personalityId}
                        chatInputColor={chatInputColor}
                        chatAiColor={chatAiColor}
                        chatWindowBgColor={chatWindowBgColor}
                        chatWindowAlpha={chatWindowAlpha}
                        chatMessageAlpha={chatMessageAlpha}
                        themeMode={theme}
                        onSkipToNext={handleSkipToNext}
                        gangsEnabled={experimentalSettings.gangsEnabled}
                        gangsConfig={experimentalSettings.gangsConfig}
                    />
                )
             })}
             {/* Desktop is Clear message hidden per user request */}
             {false && windows.length === 0 && !experimentalSettings.gangsEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none z-10">
                    <div className="bg-light-bg/80 dark:bg-base-900/80 backdrop-blur-sm rounded-lg p-6 border border-light-border dark:border-base-700">
                        <CpuChipIcon className="w-24 h-24 text-light-border dark:text-base-700 mb-4 mx-auto" />
                        <h2 className="text-2xl font-bold text-light-text dark:text-gray-300">Desktop is Clear</h2>
                    {!currentUser ? (
                    <p className="text-light-text-secondary dark:text-gray-400 mt-2">
                        Use the CLI to <code className="bg-black/10 dark:bg-base-800 px-1 py-0.5 rounded text-terminal">register</code> or <code className="bg-black/10 dark:bg-base-800 px-1 py-0.5 rounded text-terminal">login admin</code>.
                    </p>
                    ) : (
                    <p className="text-light-text-secondary dark:text-gray-400 mt-2">
                        Select a personality from the left to open a chat window.
                    </p>
                    )}
                    </div>
                </div>
             )}
           </div>
           
           {/* CLI Overlay - Positioned absolutely over the background */}
           {!isCliMaximized && (
            <div
              ref={cliResizerRef}
              className="absolute bottom-0 left-0 right-0 w-full h-6 bg-light-panel dark:bg-base-800 cursor-row-resize select-none hover:bg-primary/40 transition-colors z-30 border-t border-light-border dark:border-base-700 flex items-center justify-center shrink-0"
              style={{ 
                touchAction: 'none', 
                userSelect: 'none',
                bottom: `${cliHeight}px`
              }}
              title="Drag to resize CLI height"
              onMouseDown={handleCliResizerMouseDown}
            >
              <div className="flex flex-col items-center gap-1 pointer-events-none">
                <div className="w-12 h-1 bg-light-text-secondary dark:bg-gray-500 rounded-full opacity-70"></div>
                <div className="w-12 h-1 bg-light-text-secondary dark:bg-gray-500 rounded-full opacity-40"></div>
              </div>
            </div>
          )}
          <div 
            className="absolute bottom-0 left-0 right-0 z-20"
            style={{ height: isCliMaximized ? '100%' : `${cliHeight}px` }}
          >
            <Cli 
              onCommand={handleCommand} 
              history={cliHistory} 
              cliFocusedPersonalityName={cliFocusedPersonality?.name}
              isMaximized={isCliMaximized}
              onMaximizeToggle={() => setIsCliMaximized(!isCliMaximized)}
              height={cliHeight}
              currentModel={model}
              apiProvider={apiProvider}
              ttsProvider={ttsProvider}
              availableModels={availableModelsForCli}
              onModelSelect={handleModelSelection}
              availablePersonalities={activePersonalities.map(p => ({ id: p.id, name: p.name }))}
              onPersonalitySelect={handlePersonalitySelection}
              overlayEnabled={false}
              cliFontColor={cliFontColor}
              cliBgColor={cliBgColor}
              currentUser={currentUser}
              shadowEnabled={cliShadowEnabled}
              conversationTopic={currentConversationTopic}
              onHeightChange={(delta) => {
                const newHeight = cliHeight + delta;
                const minHeight = 80;
                const maxHeight = window.innerHeight * 0.8;
                if (newHeight >= minHeight && newHeight <= maxHeight) {
                  setCliHeight(newHeight);
                }
              }}
            />
          </div>
        </main>
      </div>
      <AdminDebugWindow 
        open={debugOpen} 
        onClose={() => setDebugOpen(false)} 
        onClear={() => setDebugEvents([])} 
        events={debugEvents} 
        experimentalSettings={experimentalSettings}
        activePersonalities={activePersonalities}
      />
      <GangDebugWindow
        open={gangDebugOpen}
        onClose={() => setGangDebugOpen(false)}
        onClear={() => {
          setGangEvents([]);
          setGangConversations([]);
          setDrugTransactions([]);
          setKilledInGangSession(new Set()); // Clear killed tracking
        }}
        events={gangEvents}
        conversations={gangConversations}
        drugTransactions={drugTransactions}
        gangsConfig={experimentalSettings.gangsConfig}
        activePersonalities={activePersonalities}
      />
      <PovertyDebugWindow
        open={povertyDebugOpen}
        onClose={() => setPovertyDebugOpen(false)}
        onClear={() => {
          setPovertyEvents([]);
          setPovertyConversations([]);
          setPovertyDwpPayments([]);
          setPovertyPipPayments([]);
          setPovertyPubVisits([]);
        }}
        events={povertyEvents}
        povertyConfig={experimentalSettings.povertyConfig}
        activePersonalities={activePersonalities}
        conversations={povertyConversations}
        dwpPayments={povertyDwpPayments}
        pipPayments={povertyPipPayments}
        pubVisits={povertyPubVisits}
      />
      <ApiDebugWindow
        isOpen={apiDebugOpen}
        onClose={() => setApiDebugOpen(false)}
        onMinimize={() => setApiDebugMinimized(!apiDebugMinimized)}
        isMinimized={apiDebugMinimized}
      />
      {isGameWindowOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-[95vw] max-h-[90vh] bg-base-800 rounded-lg shadow-2xl overflow-hidden">
            <HiddenIdentitiesGame
              personalities={activePersonalities}
              onClose={() => setIsGameWindowOpen(false)}
            />
          </div>
        </div>
      )}
      {chessOpponent && (
        <ErrorBoundary
          children={
            <ChessGameWindow
              personality={chessOpponent}
              onClose={() => {
                setChessOpponent(null);
                setChessHistory([]);
              }}
              onSendToAI={handleChessAIMessage}
              chatHistory={chessHistory}
              onMove={(gameState) => {
                // Track game state updates
                console.log('Chess move made:', gameState.lastMove?.notation);
              }}
              currentUser={currentUser}
            />
          }
        />
      )}
      {isCelebrityGameOpen && celebrityGameState && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-[95vw] max-h-[90vh] bg-base-800 rounded-lg shadow-2xl overflow-hidden">
            <CelebrityGuessGame
              personalities={activePersonalities}
              gameState={celebrityGameState}
              onClose={() => {
                setIsCelebrityGameOpen(false);
                setCelebrityGameState(null);
              }}
              onAskQuestion={handleCelebrityGameAskQuestion}
              onMakeGuess={handleCelebrityGameMakeGuess}
              onRequestCelebrity={handleRequestCelebrity}
              onCompleteRound={handleCelebrityGameCompleteRound}
              onEndGame={handleCelebrityGameEnd}
              onManualStartRound={handleManualStartCelebrityRound}
            />
          </div>
        </div>
      )}
       <Taskbar windows={windows} personalities={activePersonalities} onFocus={focusWindow} onClose={closeWindow} focusedWindowId={focusedWindowId} isLoadingWindowId={isLoading} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        initialTab={settingsInitialTab}
        apiProvider={apiProvider} 
        onApiProviderChange={(provider: ApiProvider) => {
          setApiProvider(provider);
          localStorage.setItem(API_PROVIDER_STORAGE_KEY, provider);
          console.log(`[SETTINGS] API Provider changed to: ${provider}`);
        }} 
        openAiApiKey={openAiApiKey} 
        onOpenAiApiKeyChange={setOpenAiApiKey} 
        currentModel={currentModel} 
        onModelChange={setModel} 
        modelConfig={modelConfig} 
        onModelConfigChange={setModelConfig}
        ttsConfig={{ 
          provider: ttsProvider, 
          elevenLabsApiKey: elevenLabsApiKey, 
          openaiApiKey: openaiTtsApiKey, 
          geminiApiKey: geminiTtsApiKey,
          azureApiKey: azureTtsApiKey,
          playhtApiKey: playhtApiKey,
          playhtUserId: playhtUserId,
          defaultEmotion: defaultEmotion,
          emotionIntensity: emotionIntensity
        }}
        onTtsConfigChange={handleTtsConfigChange}
        localModels={localModels}
        onLocalModelLoad={handleLocalModelLoad}
        exportPath={exportPath}
        onExportPathChange={handleExportPathChange}
        geminiApiKey={geminiApiKey}
        onGeminiApiKeyChange={setGeminiApiKey}
        chatInputColor={chatInputColor}
        onChatInputColorChange={(c) => { setChatInputColor(c); localStorage.setItem(CHAT_INPUT_COLOR_STORAGE_KEY, c); }}
        chatAiColor={chatAiColor}
        onChatAiColorChange={(c) => { setChatAiColor(c); localStorage.setItem(CHAT_AI_COLOR_STORAGE_KEY, c); }}
        chatWindowBgColor={chatWindowBgColor}
        onChatWindowBgColorChange={(c) => { setChatWindowBgColor(c); localStorage.setItem(CHAT_WINDOW_BG_COLOR_STORAGE_KEY, c); }}
        chatWindowAlpha={chatWindowAlpha}
        onChatWindowAlphaChange={(a) => { setChatWindowAlpha(a); localStorage.setItem(CHAT_WINDOW_ALPHA_STORAGE_KEY, String(a)); }}
        chatMessageAlpha={chatMessageAlpha}
        onChatMessageAlphaChange={(a) => { setChatMessageAlpha(a); localStorage.setItem(CHAT_MESSAGE_ALPHA_STORAGE_KEY, String(a)); }}
        cliFontColor={cliFontColor}
        onCliFontColorChange={(c) => { setCliFontColor(c); localStorage.setItem(CLI_FONT_COLOR_STORAGE_KEY, c); }}
        cliBgColor={cliBgColor}
        onCliBgColorChange={(c) => { setCliBgColor(c); localStorage.setItem(CLI_BG_COLOR_STORAGE_KEY, c); }}
        desktopBackground={desktopBackground}
        onDesktopBackgroundChange={(bg) => { setDesktopBackground(bg); localStorage.setItem(DESKTOP_BACKGROUND_STORAGE_KEY, bg); }}
        personalityPanelBgColor={personalityPanelBgColor}
        onPersonalityPanelBgColorChange={(c) => { setPersonalityPanelBgColor(c); localStorage.setItem(PERSONALITY_PANEL_BG_COLOR_STORAGE_KEY, c); }}
        personalityPanelBorderColor={personalityPanelBorderColor}
        onPersonalityPanelBorderColorChange={(c) => { setPersonalityPanelBorderColor(c); localStorage.setItem(PERSONALITY_PANEL_BORDER_COLOR_STORAGE_KEY, c); }}
        personalityPanelFontColor={personalityPanelFontColor}
        onPersonalityPanelFontColorChange={(c) => { setPersonalityPanelFontColor(c); localStorage.setItem(PERSONALITY_PANEL_FONT_COLOR_STORAGE_KEY, c); }}
        starFieldEnabled={starFieldEnabled}
        onStarFieldEnabledChange={setStarFieldEnabled}
        starFieldCount={starFieldCount}
        onStarFieldCountChange={setStarFieldCount}
        starFieldSpeed={starFieldSpeed}
        onStarFieldSpeedChange={setStarFieldSpeed}
        shootingStarsEnabled={shootingStarsEnabled}
        onShootingStarsEnabledChange={setShootingStarsEnabled}
        personalities={activePersonalities}
        experimentalSettings={experimentalSettings}
        onExperimentalSettingsChange={setExperimentalSettings}
        onResetThemeColors={() => {
          // Reset chat colors
          setChatInputColor('');
          setChatAiColor('');
          setChatWindowBgColor('');
          setChatWindowAlpha(0.4);
          setChatMessageAlpha(1.0);
          
          // Reset CLI colors
          setCliFontColor('');
          setCliBgColor('');
          
          // Reset desktop background to default
          setDesktopBackground('background.png');
          
          // Reset personality panel colors
          setPersonalityPanelBgColor('');
          setPersonalityPanelBorderColor('');
          setPersonalityPanelFontColor('');
          
          // Reset star field settings to defaults
          setStarFieldEnabled(false);
          setStarFieldCount(1.0);
          setStarFieldSpeed(1.0);
          setShootingStarsEnabled(false);
          
          // Clear all localStorage entries
          localStorage.removeItem(CHAT_INPUT_COLOR_STORAGE_KEY);
          localStorage.removeItem(CHAT_AI_COLOR_STORAGE_KEY);
          localStorage.removeItem(CLI_FONT_COLOR_STORAGE_KEY);
          localStorage.removeItem(CLI_BG_COLOR_STORAGE_KEY);
          localStorage.removeItem(CHAT_WINDOW_BG_COLOR_STORAGE_KEY);
          localStorage.removeItem(DESKTOP_BACKGROUND_STORAGE_KEY);
          localStorage.removeItem(PERSONALITY_PANEL_BG_COLOR_STORAGE_KEY);
          localStorage.removeItem(PERSONALITY_PANEL_BORDER_COLOR_STORAGE_KEY);
          localStorage.removeItem(PERSONALITY_PANEL_FONT_COLOR_STORAGE_KEY);
          localStorage.removeItem(STARFIELD_ENABLED_STORAGE_KEY);
          localStorage.removeItem(STARFIELD_COUNT_STORAGE_KEY);
          localStorage.removeItem(STARFIELD_SPEED_STORAGE_KEY);
          localStorage.removeItem(SHOOTING_STARS_ENABLED_STORAGE_KEY);
          localStorage.setItem(CHAT_WINDOW_ALPHA_STORAGE_KEY, '0.4');
          localStorage.setItem(CHAT_MESSAGE_ALPHA_STORAGE_KEY, '1.0');
        }}
      />
      <DiscoverModal
        isOpen={isDiscoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onOpenCreate={() => setCreateOpen(true)}
        onOpenSlots={() => {
          setDiscoverOpen(false);
          openSlotsForLoad();
        }}
      />
      <CreatePersonalityModal 
        isOpen={isCreateOpen} 
        onClose={() => setCreateOpen(false)} 
        onSave={(p) => {
          const newPersonality: Personality = { ...p, id: generateUUID() };
          saveAndSetActivePersonalities([newPersonality]);
          // Prompt user to save this newly created personality to a quick slot
          openSlotsForSave(newPersonality);
         }} 
        activeApiProvider={apiProvider} 
        activeModel={currentModel} 
        openAiApiKey={openAiApiKey} 
        masterModelConfig={modelConfig} 
        allPersonalities={activePersonalities}
      />
      <PersonalityDetailsModal personality={personalityForDetailsModal} onClose={() => setViewingDetailsForId(null)} onUpdatePersonality={handleUpdatePersonality} />
      <PersonalityLoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        allPersonalities={allPersonalities}
        loadedPersonalities={activePersonalities}
        onFileUpload={handleFileUpload}
        onOpenSlots={() => {
          setLoadModalOpen(false);
          openSlotsForLoad();
        }}
        onLoad={(selected) => {
          // Filter out duplicates by name (case-insensitive)
          const uniquePersonalities: Personality[] = [];
          const seenNames = new Set<string>();
          
          for (const p of selected) {
            const normalizedName = p.name.toLowerCase().trim();
            if (!seenNames.has(normalizedName)) {
              seenNames.add(normalizedName);
              uniquePersonalities.push(p);
            } else {
              addCliMessage(`Skipped duplicate: "${p.name}"`, CliOutputType.ERROR);
            }
          }
          
          if (uniquePersonalities.length < selected.length) {
            addCliMessage(`Removed ${selected.length - uniquePersonalities.length} duplicate(s)`, CliOutputType.RESPONSE);
          }
          
          setActivePersonalities(applyRegistryVoices(uniquePersonalities));
          setLoadModalOpen(false);
        }}
      />
      <PersonalitySlotsModal
        isOpen={isSlotsOpen}
        mode={slotsMode}
        saveCandidate={saveCandidate || undefined}
        onClose={() => setSlotsOpen(false)}
        currentUser={currentUser}
        onLoad={(personality) => {
          // Legacy direct load path
          setActivePersonalities(prev => {
            const exists = prev.some(p => p.id === personality.id);
            if (exists) return prev;
            return applyRegistryVoices([...prev, personality]);
          });
          addCliMessage(`Loaded quick personality: ${personality.name}`, CliOutputType.RESPONSE);
        }}
        loadedIds={activePersonalities.map(p => p.id)}
        loadedPersonalities={activePersonalities}
        onOpenConfig={(personalityId) => {
          setViewingDetailsForId(personalityId);
        }}
        onToggleLoad={(personality, load) => {
          if (load) {
            setActivePersonalities(prev => {
              // Check for duplicates by ID or NAME
              const existsById = prev.some(p => p.id === personality.id);
              const existsByName = prev.some(p => p.name.toLowerCase().trim() === personality.name.toLowerCase().trim());
              
              if (existsById || existsByName) {
                addCliMessage(`Cannot load "${personality.name}" - already loaded (duplicate detected)`, CliOutputType.ERROR);
                return prev;
              }
              return applyRegistryVoices([...prev, personality]);
            });
            addCliMessage(`Loaded quick personality: ${personality.name}`, CliOutputType.RESPONSE);
          } else {
            // Use existing removal logic to close windows, etc.
            removePersonality(personality.id);
            addCliMessage(`Unloaded quick personality: ${personality.name}`, CliOutputType.RESPONSE);
          }
        }}
      />
        </>
      )}
    </div>
  );
};

export default App;