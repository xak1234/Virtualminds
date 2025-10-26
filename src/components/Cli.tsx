import React, { useState, useRef, useEffect } from 'react';
import type { CliOutput } from '../types';
import { CliOutputType, TtsProvider } from '../types';
import { MinimizeIcon } from './icons/MinimizeIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CLI_COMMANDS, CLI_SHORTCUTS } from '../constants';
import { addTtsAudioListener, removeTtsAudioListener } from '../services/ttsService';
import { isAdminLoginWithPassword } from '../services/cliCommandUtils';

interface CliProps {
  onCommand: (command: string) => void;
  history: CliOutput[];
  cliFocusedPersonalityName?: string;
  isMaximized?: boolean;
  onMaximizeToggle?: () => void;
  height?: number;
  onHeightChange?: (delta: number) => void;
  currentModel?: string;
  apiProvider?: string;
  ttsProvider?: TtsProvider;
  overlayEnabled?: boolean;
  availableModels?: string[];
  onModelSelect?: (model: string) => void;
  availablePersonalities?: Array<{id: string, name: string}>;
  onPersonalitySelect?: (personalities: string[]) => void;
  cliFontColor?: string;
  cliBgColor?: string;
  currentUser?: string | null;
  shadowEnabled?: boolean; // when true, disable CLI autoscroll
  conversationTopic?: string | null; // current conversation topic
  isLlmConversationMode?: boolean; // when true, CLI is in LLM communication mode
}

export const Cli: React.FC<CliProps> = ({ 
  onCommand, 
  history, 
  cliFocusedPersonalityName, 
  isMaximized = false,
  onMaximizeToggle,
  height = 256,
  onHeightChange,
  currentModel,
  apiProvider,
  ttsProvider,
  overlayEnabled = false,
  availableModels = [],
  onModelSelect,
  availablePersonalities = [],
  onPersonalitySelect,
  cliFontColor,
  cliBgColor,
  currentUser,
  shadowEnabled = false,
  conversationTopic = null,
  isLlmConversationMode = false
}) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [isModelSelectionMode, setIsModelSelectionMode] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isPersonalitySelectionMode, setIsPersonalitySelectionMode] = useState(false);
  const [selectedPersonalityIndex, setSelectedPersonalityIndex] = useState(0);
  const [selectedPersonalities, setSelectedPersonalities] = useState<string[]>([]);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ttsStatusLabel, setTtsStatusLabel] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [validationType, setValidationType] = useState<'error' | 'info'>('info');

  // New scrolling and search state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [filteredHistory, setFilteredHistory] = useState<CliOutput[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Error/Warning view state
  const [isErrorWarningMode, setIsErrorWarningMode] = useState(false);
  const [errorWarningFilter, setErrorWarningFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  // Initialize filtered history
  useEffect(() => {
    if (isErrorWarningMode) {
      // Show only errors and warnings
      const errorWarningHistory = history.filter(item => 
        item.type === CliOutputType.ERROR || item.type === CliOutputType.WARNING
      );
      
      let filtered = errorWarningHistory;
      if (errorWarningFilter === 'errors') {
        filtered = errorWarningHistory.filter(item => item.type === CliOutputType.ERROR);
      } else if (errorWarningFilter === 'warnings') {
        filtered = errorWarningHistory.filter(item => item.type === CliOutputType.WARNING);
      }
      
      setFilteredHistory(filtered);
    } else {
      // Show only standard messages (exclude errors and warnings)
      const standardHistory = history.filter(item => 
        item.type !== CliOutputType.ERROR && item.type !== CliOutputType.WARNING
      );
      setFilteredHistory(standardHistory);
    }
  }, [history, isErrorWarningMode, errorWarningFilter]);

  // Search functionality
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setFilteredHistory(history);
      return;
    }

    const results: number[] = [];
    const filtered = history.filter((item, index) => {
      const matches = item.text.toLowerCase().includes(query.toLowerCase()) ||
                     (item.authorName && item.authorName.toLowerCase().includes(query.toLowerCase()));
      if (matches) {
        results.push(index);
      }
      return matches;
    });

    setSearchResults(results);
    setFilteredHistory(filtered);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  };

  // Navigate search results
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    
    // Scroll to the search result
    if (scrollContainerRef.current && searchResults[newIndex] !== undefined) {
      const targetIndex = searchResults[newIndex];
      const container = scrollContainerRef.current;
      const targetElement = container.children[0]?.children[targetIndex] as HTMLElement;
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsScrollLocked(true);
      }
    }
  };

  // Scroll controls
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setIsScrollLocked(true);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsScrollLocked(false);
    }
  };

  const scrollPageUp = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop -= container.clientHeight * 0.8;
      setIsScrollLocked(true);
    }
  };

  const scrollPageDown = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop += container.clientHeight * 0.8;
      
      // Check if we're at the bottom
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      setIsScrollLocked(!isAtBottom);
    }
  };

  // Handle scroll events to track position
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      setScrollPosition(scrollTop);
      
      // Auto-unlock scroll when user scrolls to bottom
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isAtBottom) {
        setIsScrollLocked(false);
      }
    }
  };

  // Handle mouse wheel events for smooth scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      // Allow natural scrolling behavior
      setIsScrollLocked(true);
      
      // Check if we're scrolling to the bottom
      const container = scrollContainerRef.current;
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      if (isAtBottom && e.deltaY > 0) {
        setIsScrollLocked(false);
      }
    }
  };

  // Toggle search mode
  const toggleSearchMode = () => {
    setIsSearchMode(!isSearchMode);
    if (!isSearchMode) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      // Reset to appropriate view
      if (isErrorWarningMode) {
        const errorWarningHistory = history.filter(item => 
          item.type === CliOutputType.ERROR || item.type === CliOutputType.WARNING
        );
        let filtered = errorWarningHistory;
        if (errorWarningFilter === 'errors') {
          filtered = errorWarningHistory.filter(item => item.type === CliOutputType.ERROR);
        } else if (errorWarningFilter === 'warnings') {
          filtered = errorWarningHistory.filter(item => item.type === CliOutputType.WARNING);
        }
        setFilteredHistory(filtered);
      } else {
        // Show only standard messages (exclude errors and warnings)
        const standardHistory = history.filter(item => 
          item.type !== CliOutputType.ERROR && item.type !== CliOutputType.WARNING
        );
        setFilteredHistory(standardHistory);
      }
    }
  };

  // Toggle error/warning mode
  const toggleErrorWarningMode = () => {
    setIsErrorWarningMode(!isErrorWarningMode);
    if (isSearchMode) {
      // Exit search mode when switching views
      setIsSearchMode(false);
      setSearchQuery('');
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  };

  // Get error and warning counts
  const getErrorWarningCounts = () => {
    const errors = history.filter(item => item.type === CliOutputType.ERROR).length;
    const warnings = history.filter(item => item.type === CliOutputType.WARNING).length;
    return { errors, warnings };
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Enhanced keyboard shortcuts
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    // CRITICAL: Check if user is in any input field (modal inputs, text areas, etc)
    const activeElement = document.activeElement as HTMLElement;
    const isInInput = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' ||
                      activeElement?.tagName === 'SELECT';
    
    // If in any input field, ONLY allow Ctrl+F and Ctrl+E to work (for search/error view)
    // All other keys (Ctrl+C, Ctrl+V, Delete, etc.) should work normally in the input
    if (isInInput) {
      const isSearchShortcut = e.ctrlKey && e.key === 'f';
      const isErrorViewShortcut = e.ctrlKey && e.key === 'e';
      
      // Allow these specific shortcuts even in input fields
      if (isSearchShortcut) {
        e.preventDefault();
        toggleSearchMode();
        return;
      }
      
      if (isErrorViewShortcut) {
        e.preventDefault();
        toggleErrorWarningMode();
        return;
      }
      
      // For all other keys in input fields, let the input handle it normally
      // This allows Ctrl+C, Ctrl+V, Delete, Backspace, etc. to work
      return;
    }
    
    // When NOT in input field, CTRL+V should do nothing
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      return;
    }
    
    // Search mode shortcuts (only when NOT in input)
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      toggleSearchMode();
      return;
    }

    // Error/Warning mode shortcut (Ctrl+E) - only when NOT in input
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      toggleErrorWarningMode();
      return;
    }

    if (isSearchMode) {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateSearch(e.shiftKey ? 'prev' : 'next');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleSearchMode();
        return;
      }
    }

    // Scroll shortcuts (when not in input fields - already checked above)
    if (e.key === 'Home') {
      e.preventDefault();
      scrollToTop();
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToBottom();
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      scrollPageUp();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      scrollPageDown();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSearchMode, searchResults, currentSearchIndex, isErrorWarningMode]);

  useEffect(() => {
    // Auto-scroll to bottom only when not locked and new messages arrive
    if (!shadowEnabled && !isScrollLocked && history.length > 0) {
      const last = history[history.length - 1];
      // Only force scroll for commands, let overflow-anchor handle responses
      if (last?.type === CliOutputType.COMMAND) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    }
  }, [history, shadowEnabled, isScrollLocked]);

  // Subscribe to TTS events to reflect actual provider used (including fallbacks)
  useEffect(() => {
    const onTtsEvent = (e: any) => {
      if (!e || !e.type) return;
      if (e.type === 'start') {
        const used: TtsProvider | undefined = e.provider;
        const requested = ttsProvider;
        const fmt = (p?: string) => (p ? p.toUpperCase() : '');
        if (used && requested && used !== requested) {
          setTtsStatusLabel(`${fmt(String(requested))} → ${fmt(String(used))}`);
        } else if (used) {
          setTtsStatusLabel(fmt(String(used)));
        }
      }
      // We intentionally keep the last known label on 'stop' to show what was used
    };
    try { addTtsAudioListener(onTtsEvent); } catch {}
    return () => { try { removeTtsAudioListener(onTtsEvent); } catch {} };
  }, [ttsProvider]);

  // Load command history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('cmf_command_history');
    console.log('[CLI History] Loading from localStorage:', savedHistory);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as string[];
        const filtered = parsed.filter(cmd => !isAdminLoginWithPassword(cmd));
        if (filtered.length !== parsed.length) {
          localStorage.setItem('cmf_command_history', JSON.stringify(filtered));
        }
        console.log('[CLI History] Loaded', filtered.length, 'commands');
        setCommandHistory(filtered);
      } catch {
        // Ignore malformed history
        console.log('[CLI History] Failed to parse, resetting');
        setCommandHistory([]);
      }
    } else {
      console.log('[CLI History] No saved history found');
    }
  }, []);

  // Generate command suggestions
  const generateSuggestions = (inputText: string): string[] => {
    if (!inputText.trim()) return [];
    
    // Handle force command prefix
    const isForceCommand = inputText.startsWith('!');
    const searchText = isForceCommand ? inputText.substring(1) : inputText;
    
    const allCommands = [
      ...Object.values(CLI_COMMANDS),
      ...Object.keys(CLI_SHORTCUTS),
      ...commandHistory
    ];
    
    const matchingCommands = allCommands
      .filter(cmd => cmd.toLowerCase().startsWith(searchText.toLowerCase()))
      .slice(0, 5);
    
    // If user typed '!' prefix, add it back to suggestions
    if (isForceCommand) {
      return matchingCommands.map(cmd => '!' + cmd);
    }
    
    return matchingCommands;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Update suggestions
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0 && value.trim().length > 0);
    setSelectedSuggestion(0);

    // Live command validation
    validateLiveCommand(value, newSuggestions);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle personality selection mode
    if (isPersonalitySelectionMode) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPersonalityIndex(prev => Math.min(prev + 1, availablePersonalities.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPersonalityIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (e.key === ' ') {
          togglePersonalitySelection();
        } else if (e.key === 'Enter') {
          finishPersonalitySelection();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitPersonalitySelectionMode();
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < availablePersonalities.length) {
          setSelectedPersonalityIndex(index);
          togglePersonalitySelection();
        }
      }
      return;
    }

    // Handle model selection mode
    if (isModelSelectionMode) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedModelIndex(prev => Math.min(prev + 1, availableModels.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedModelIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectCurrentModel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitModelSelectionMode();
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < availableModels.length) {
          setSelectedModelIndex(index);
          selectCurrentModel();
        }
      }
      return;
    }

    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions.length > 0) {
          e.preventDefault();
          setInput(suggestions[selectedSuggestion]);
          setShowSuggestions(false);
          if (e.key === 'Enter') {
            handleCommandSubmit(suggestions[selectedSuggestion]);
          }
          return;
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // Command history navigation
    // Allow Ctrl+Up/Down for history navigation (always works, even with suggestions)
    // Also allow plain Up/Down when no suggestions are showing
    const isHistoryUp = e.key === 'ArrowUp' && (e.ctrlKey || !showSuggestions);
    const isHistoryDown = e.key === 'ArrowDown' && (e.ctrlKey || !showSuggestions);
    
    if (isHistoryUp) {
      e.preventDefault();
      console.log('[CLI History] Up pressed. History length:', commandHistory.length, 'Current index:', historyIndex);
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        console.log('[CLI History] Setting index to:', newIndex, 'Command:', commandHistory[newIndex]);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
        // Close suggestions when navigating history
        setShowSuggestions(false);
      } else {
        console.log('[CLI History] No commands in history');
      }
    } else if (isHistoryDown) {
      e.preventDefault();
      console.log('[CLI History] Down pressed. Current index:', historyIndex);
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
          console.log('[CLI History] Reached end, clearing input');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
          console.log('[CLI History] Setting index to:', newIndex, 'Command:', commandHistory[newIndex]);
        }
        // Close suggestions when navigating history
        setShowSuggestions(false);
      }
    }

    // Global fallback: ESC shrinks CLI or exits maximize when not in selection modes/suggestions
    if (e.key === 'Escape') {
      // Selection modes and suggestions already handle Esc above
      if (isModelSelectionMode || isPersonalitySelectionMode || showSuggestions) {
        return;
      }
      if (isMaximized && onMaximizeToggle) {
        e.preventDefault();
        onMaximizeToggle();
        return;
      }
      if (onHeightChange) {
        e.preventDefault();
        const shrinkBy = Math.max(100, Math.floor(height * 0.25));
        onHeightChange(-shrinkBy);
        return;
      }
    }
  };

  const handleCommandSubmit = (command: string) => {
    const trimmedCommand = command.trim();
    if (trimmedCommand) {
      // Check if this is the model selection command
      if (trimmedCommand.toLowerCase() === 'api model select') {
        if (availableModels.length > 0) {
          setIsModelSelectionMode(true);
          setSelectedModelIndex(availableModels.findIndex(model => model === currentModel) || 0);
          setInput('');
          setShowSuggestions(false);
          return;
        }
      }
      
      // Check if this is the personality selection command
      if (trimmedCommand.toLowerCase() === 'converse select') {
        if (availablePersonalities.length >= 2) {
          setIsPersonalitySelectionMode(true);
          setSelectedPersonalityIndex(0);
          setSelectedPersonalities([]);
          setInput('');
          setShowSuggestions(false);
          return;
        }
      }
      
      // Add to command history
      const shouldPersistCommand = !isAdminLoginWithPassword(trimmedCommand);
      if (shouldPersistCommand) {
        const filteredHistory = commandHistory.filter(cmd => cmd !== trimmedCommand);
        const newHistory = [...filteredHistory, trimmedCommand];
        if (newHistory.length > 50) newHistory.shift(); // Keep only last 50 commands
        console.log('[CLI History] Saving command:', trimmedCommand, 'Total commands:', newHistory.length);
        setCommandHistory(newHistory);
        localStorage.setItem('cmf_command_history', JSON.stringify(newHistory));
      } else {
        console.log('[CLI History] Command not persisted (admin login):', trimmedCommand);
      }
      
      onCommand(trimmedCommand);
      setInput('');
      setHistoryIndex(-1);
      setShowSuggestions(false);
    }
  };

  const exitModelSelectionMode = () => {
    setIsModelSelectionMode(false);
    setSelectedModelIndex(0);
  };

  const selectCurrentModel = () => {
    if (availableModels.length > 0 && onModelSelect) {
      const selectedModel = availableModels[selectedModelIndex];
      onModelSelect(selectedModel);
      exitModelSelectionMode();
    }
  };

  const exitPersonalitySelectionMode = () => {
    setIsPersonalitySelectionMode(false);
    setSelectedPersonalityIndex(0);
    setSelectedPersonalities([]);
  };

  const togglePersonalitySelection = () => {
    if (availablePersonalities.length > 0) {
      const personality = availablePersonalities[selectedPersonalityIndex];
      const isSelected = selectedPersonalities.includes(personality.id);
      
      if (isSelected) {
        setSelectedPersonalities(prev => prev.filter(id => id !== personality.id));
      } else {
        setSelectedPersonalities(prev => [...prev, personality.id]);
      }
    }
  };

  const finishPersonalitySelection = () => {
    if (selectedPersonalities.length >= 2 && onPersonalitySelect) {
      onPersonalitySelect(selectedPersonalities);
      exitPersonalitySelectionMode();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommandSubmit(input);
  };

  const renderHistoryItem = (item: CliOutput, index: number, isSearchResult: boolean = false) => {
    // Create a more unique key by combining index, type, and a hash of the text
    const textHash = item.text.slice(0, 10).replace(/\s/g, '');
    const uniqueKey = `${item.type}-${index}-${textHash}`;
    
    // Highlight search results
    const highlightClass = isSearchResult ? 'bg-yellow-100 dark:bg-yellow-900/30' : '';
    
    switch (item.type) {
      case CliOutputType.COMMAND:
        return (
          <div key={uniqueKey} className={`flex items-start gap-2 py-1 border-l-2 border-transparent ${highlightClass}`}>
            <span className="text-accent font-bold mt-0.5">$</span>
            <span className="flex-1 font-medium">{item.text}</span>
          </div>
        );
      case CliOutputType.RESPONSE:
        return (
          <div key={uniqueKey} className={`py-1 pl-4 border-l-2 border-green-500/30 ${highlightClass}`}>
            <pre className="whitespace-pre-wrap text-green-600 dark:text-green-400 text-sm leading-relaxed">{item.text}</pre>
          </div>
        );
      case CliOutputType.ERROR:
        return (
          <div key={uniqueKey} className={`py-1 pl-4 border-l-2 border-red-600 bg-red-50/10 dark:bg-red-950/20 rounded-r ${highlightClass}`}>
            <p className="text-red-500 font-medium">❌ {item.text}</p>
          </div>
        );
      case CliOutputType.WARNING:
        return (
          <div key={uniqueKey} className={`py-1 pl-4 border-l-2 border-yellow-500 bg-yellow-50/10 dark:bg-yellow-950/20 rounded-r ${highlightClass}`}>
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">⚠️ {item.text}</p>
          </div>
        );
      case CliOutputType.USER_MESSAGE:
        return (
          <div key={uniqueKey} className={`py-2 pl-4 border-l-2 border-blue-400/40 bg-blue-50/5 dark:bg-blue-950/10 rounded-r ${highlightClass}`}>
            <p className="text-blue-600 dark:text-blue-400">
              <span className="font-semibold">You:</span> 
              <span className="ml-2">{item.text}</span>
            </p>
          </div>
        );
      case CliOutputType.AI_RESPONSE:
        const aiName = item.authorName || 'AI';
        const isClaudeResponse = aiName === 'Claude';
        const borderColor = isClaudeResponse ? 'border-blue-400/40' : 'border-green-400/40';
        const bgColor = isClaudeResponse ? 'bg-blue-50/5 dark:bg-blue-950/10' : 'bg-green-50/5 dark:bg-green-950/10';
        const textColor = isClaudeResponse ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400';
        const contentTextColor = isClaudeResponse ? 'text-blue-700 dark:text-blue-300' : 'text-light-text dark:text-gray-200';
        const borderAccent = isClaudeResponse ? 'border-blue-300/20' : 'border-green-300/20';
        
        return (
          <div key={uniqueKey} className={`py-3 pl-4 border-l-2 ${borderColor} ${bgColor} rounded-r mb-2 ${highlightClass}`}>
            <div className="flex flex-col gap-1">
              <span className={`${textColor} font-bold text-sm uppercase tracking-wide`}>
                {isClaudeResponse ? '🧠' : '🤖'} {aiName}
              </span>
              <span className={`font-sans text-sm leading-relaxed ${contentTextColor} whitespace-pre-wrap pl-2 border-l ${borderAccent}`}>
                {item.text}
              </span>
            </div>
          </div>
        );
      case CliOutputType.COMMUNICATION:
        return (
          <div key={uniqueKey} className={`py-2 pl-4 border-l-2 border-emerald-400/40 bg-emerald-50/5 dark:bg-emerald-950/10 rounded-r ${highlightClass}`}>
            <p className="text-emerald-500 dark:text-emerald-400 font-medium">
              💬 {item.text}
            </p>
          </div>
        );
      case CliOutputType.EXTERNAL_LLM_RESPONSE:
        return (
          <div key={uniqueKey} className={`py-2 pl-4 border-l-2 border-blue-400/40 bg-blue-50/5 dark:bg-blue-950/10 rounded-r ${highlightClass}`}>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              🤖 {item.text}
            </p>
          </div>
        );
      default:
        return null;
    }
  };
  
  const promptSymbol = isLlmConversationMode ? 
    <span className="text-blue-500 dark:text-blue-400 font-semibold">LLM &gt;</span> :
    cliFocusedPersonalityName ? 
    <span>(<span className="text-green-600 dark:text-green-400">{cliFocusedPersonalityName}</span>)</span> : 
    '$';

  const formatModelName = (model: string, provider: string) => {
    if (provider === 'local') {
      // Check if it's a GGUF file
      if (model.toLowerCase().match(/\.(gguf|ggml|bin)$/)) {
        return model + ' ⚠️';
      }
      // Format local model names
      return model
        .replace('-MLC', '')
        .replace(/q4f\d+_\d+/, '(Q)')
        .replace(/Instruct/gi, 'Inst')
        .replace(/Chat/gi, 'Chat');
    }
    return model;
  };

  const formatTtsProvider = (p?: string) => {
    if (!p) return '';
    return p.toUpperCase();
  };

  // Copy CLI history to clipboard
  const copyCliHistory = async () => {
    try {
      const historyText = formatCliHistoryAsText();
      await navigator.clipboard.writeText(historyText);
      // Show a brief confirmation (could be enhanced with a toast notification)
      console.log('CLI history copied to clipboard');
    } catch (error) {
      console.error('Failed to copy CLI history:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formatCliHistoryAsText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Save CLI history as a file
  const saveCliHistory = () => {
    const historyText = formatCliHistoryAsText();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cmf-cli-history-${timestamp}.txt`;
    
    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format CLI history as plain text
  const formatCliHistoryAsText = (): string => {
    const header = `Criminal Minds Framework - CLI History
Generated: ${new Date().toLocaleString()}
User: ${currentUser || 'Anonymous'}
${currentModel && apiProvider ? `Model: ${apiProvider.toUpperCase()} - ${formatModelName(currentModel, apiProvider)}` : ''}
${ttsProvider ? `TTS: ${formatTtsProvider(ttsProvider)}` : ''}
${conversationTopic ? `Topic: ${conversationTopic}` : ''}
${'='.repeat(80)}

`;

    const historyText = history.map(item => {
      const timestamp = new Date().toLocaleTimeString();
      switch (item.type) {
        case CliOutputType.COMMAND:
          return `[${timestamp}] $ ${item.text}`;
        case CliOutputType.RESPONSE:
          return `[${timestamp}] ✓ ${item.text}`;
        case CliOutputType.ERROR:
          return `[${timestamp}] ❌ ${item.text}`;
        case CliOutputType.USER_MESSAGE:
          return `[${timestamp}] You: ${item.text}`;
        case CliOutputType.AI_RESPONSE:
          const aiName = item.authorName || 'AI';
          return `[${timestamp}] ${aiName}: ${item.text}`;
        case CliOutputType.COMMUNICATION:
          return `[${timestamp}] 💬 ${item.text}`;
        case CliOutputType.EXTERNAL_LLM_RESPONSE:
          return `[${timestamp}] 🤖 External LLM: ${item.text}`;
        default:
          return `[${timestamp}] ${item.text}`;
      }
    }).join('\n');

    return header + historyText + '\n\n' + '='.repeat(80) + '\nEnd of CLI History';
  };

  // Live validator to help users correct command syntax as they type
  const validateLiveCommand = (raw: string, suggs: string[]) => {
    try {
      setValidationMsg(null);
      if (!raw || !raw.trim()) return;

      // If chatting with a personality, require '!' or '/' for commands
      const trimmed = raw.trim();
      const isForce = trimmed.startsWith('!') || trimmed.startsWith('/');
      const withoutPrefix = isForce ? trimmed.slice(1).trim() : trimmed;

      if (cliFocusedPersonalityName && !isForce) {
        setValidationType('info');
        setValidationMsg("In chat mode, prefix commands with '!' or use '/command'.");
        return;
      }

      const [first, ...rest] = withoutPrefix.split(/\s+/);
      if (!first) return;
      const lower = first.toLowerCase();

      const mapped = (CLI_SHORTCUTS as any)[lower] || lower;
      const known = new Set(Object.values(CLI_COMMANDS).map(v => String(v)));
      if (!known.has(mapped)) {
        // Unknown command: suggest
        if (isForce || cliFocusedPersonalityName) {
          const hint = suggs && suggs.length > 0 ? ` Did you mean: ${suggs.slice(0,3).join(', ')}?` : '';
          setValidationType('error');
          setValidationMsg(`Unknown command '${first}'.${hint}`);
        }
        return;
      }

      // Command-specific validation
      const argsLine = withoutPrefix.slice(first.length).trim();
      switch (mapped) {
        case CLI_COMMANDS.API: {
          const [sub, ...restArgs] = argsLine.split(/\s+/).filter(Boolean);
          if (!sub) {
            setValidationType('info'); setValidationMsg("Usage: api provider [name] | api model [name] | api model | api model select"); return;
          }
          if (sub === 'provider') {
            const val = restArgs[0];
            const allowed = ['google','openai','claude','local'];
            if (!val) { setValidationType('info'); setValidationMsg("Usage: api provider [google|openai|claude|local]"); }
            else if (!allowed.includes(val.toLowerCase())) { setValidationType('error'); setValidationMsg(`Invalid provider '${val}'. Use google|openai|claude|local.`); }
          } else if (sub === 'model') {
            // ok; optional name or 'select'
          } else {
            setValidationType('error'); setValidationMsg("Invalid subcommand. Use: api provider | api model");
          }
          break;
        }
        case CLI_COMMANDS.CONVERSE: {
          if (!argsLine) { setValidationType('info'); setValidationMsg("Usage: converse [p1] [p2] [topic] | converse all [topic] | converse stop|off"); }
          else {
            const firstArg = argsLine.split(/\s+/)[0].toLowerCase();
            if (!['all','stop','off'].includes(firstArg)) {
              const nameCount = argsLine.split(/\s+/).filter(Boolean).length;
              if (nameCount < 2) { setValidationType('error'); setValidationMsg("Provide at least two personalities or use 'all'."); }
            }
          }
          break;
        }
        case CLI_COMMANDS.CONVERSE_LENGTH: {
          const v = argsLine.toLowerCase();
          if (!['short','medium','long'].includes(v)) { setValidationType('error'); setValidationMsg("Use: converselength [short|medium|long]"); }
          break;
        }
        case CLI_COMMANDS.SOUND:
        case CLI_COMMANDS.SHADOW:
        case CLI_COMMANDS.AUTONOMOUS: {
          const v = argsLine.toLowerCase();
          if (v && !['on','off'].includes(v)) { setValidationType('error'); setValidationMsg("Use: [on|off]"); }
          else if (!v) { setValidationType('info'); setValidationMsg("Use: [on|off]"); }
          break;
        }
        case CLI_COMMANDS.LOCAL: {
          const [sub, ...ra] = argsLine.split(/\s+/).filter(Boolean);
          if (!sub) { setValidationType('info'); setValidationMsg("Use: local list | local load [model]"); }
          else if (!['list','load'].includes(sub)) { setValidationType('error'); setValidationMsg("Invalid subcommand. Use: list | load [model]"); }
          break;
        }
        case CLI_COMMANDS.CONFIG: {
          const [key, val] = argsLine.split(/\s+/);
          const allowed = ['temp','temperature','topp','topk','tokens','maxoutputtokens'];
          if (!key || !val) { setValidationType('info'); setValidationMsg("Usage: config [temp|topp|topk|tokens] [value]"); }
          else if (!allowed.includes(key.toLowerCase())) { setValidationType('error'); setValidationMsg(`Invalid key '${key}'. Use temp|topp|topk|tokens.`); }
          else if (isNaN(parseFloat(val))) { setValidationType('error'); setValidationMsg("Value must be a number."); }
          break;
        }
        case CLI_COMMANDS.SAY: {
          if (!argsLine) { setValidationType('error'); setValidationMsg("Usage: say [your message]"); }
          break;
        }
        case CLI_COMMANDS.LINK: {
          // allow: link all | link [source] [target] | link [source]
          const parts = argsLine.split(/\s+/).filter(Boolean);
          if (parts.length === 0) { setValidationType('info'); setValidationMsg("Usage: link [source] [target] | link all | link [source] (to list)"); }
          break;
        }
        case CLI_COMMANDS.UNLINK: {
          const parts = argsLine.split(/\s+/).filter(Boolean);
          if (parts.length === 0) { setValidationType('info'); setValidationMsg("Usage: unlink [source] [target] | unlink all"); }
          else if (parts.length === 1 && parts[0].toLowerCase() !== 'all') { setValidationType('error'); setValidationMsg("Provide both [source] and [target] or use 'all'."); }
          break;
        }
        case CLI_COMMANDS.MIMIC: {
          const parts = argsLine.split(/\s+/).filter(Boolean);
          if (parts.length < 3) { 
            setValidationType('error'); 
            setValidationMsg("Usage: mimic [source] [target] [message]"); 
            break; 
          }
          // Basic validation - we have source, target, and at least one word for message
          break;
        }
        case CLI_COMMANDS.CLAUDE: {
          // Inform non-admins politely (only if we know currentUser)
          if (currentUser && currentUser !== 'admin') { setValidationType('info'); setValidationMsg("Admin only command."); }
          break;
        }
        case CLI_COMMANDS.LOGIN:
        case CLI_COMMANDS.REGISTER: {
          const v = argsLine.trim();
          if (!v) { setValidationType('error'); setValidationMsg(`Usage: ${mapped} [username]`); }
          break;
        }
        default: {
          // Most others allow optional args or are self-descriptive
          break;
        }
      }
    } catch {
      // Do not block user input on validator errors
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-black font-mono text-xs flex flex-col text-light-text dark:text-gray-300 shrink-0 relative leading-tight tracking-tight ${
        isMaximized ? 'fixed inset-0 z-50' : ''
      }`}
      style={{ height: isMaximized ? '100vh' : `${height}px`, backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}
    >
      {/* Semi-transparent history overlay that spills into the main window above the CLI */}
      {overlayEnabled && history.length > 0 && !isMaximized && (
        <div className="absolute left-0 right-0 top-[-100vh] h-[100vh] opacity-50 pointer-events-none overflow-hidden z-10">
          <div className="w-full h-full flex flex-col justify-end p-2 space-y-1">
            {history.map((item, index) => (
              <React.Fragment key={`overlay-${index}`}>
                {renderHistoryItem(item, index)}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      <header className="bg-light-panel dark:bg-base-800 px-2 py-1 text-[10px] text-light-text-secondary dark:text-gray-400 border-b border-light-border dark:border-base-700 flex justify-between items-center leading-tight" style={{ backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}>
        <div className="flex items-center gap-3">
          <span>CMF Command Line {isMaximized ? '(Maximized)' : ''}</span>
          {currentModel && apiProvider && (
            <span className="text-primary font-medium">
              [{apiProvider.toUpperCase()}: {formatModelName(currentModel, apiProvider)}]
            </span>
          )}
          {(ttsProvider || ttsStatusLabel) && (
            <span className="text-primary font-medium">
              {' '}[TTS: {ttsStatusLabel ?? formatTtsProvider(ttsProvider)}]
            </span>
          )}
          {conversationTopic && (
            <span className="text-accent font-medium">
              {' '}[Topic: {conversationTopic}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">
              {cliFocusedPersonalityName ? '! for commands | ' : ''}↑↓ or Ctrl+↑↓ History | Tab Complete | Ctrl+E Toggle View | Ctrl+F Search | Esc Shrink/Close{currentUser === 'admin' ? ' | . for Claude' : ''}
            </span>
          
          {/* Error/Warning Controls */}
          <div className="flex items-center gap-1 border-l border-light-border dark:border-base-600 pl-2">
            <button
              onClick={toggleErrorWarningMode}
              className={`p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs flex items-center gap-1 ${
                isErrorWarningMode ? 'bg-red-500 text-white' : ''
              }`}
              title={`${isErrorWarningMode ? 'Show Standard Messages' : 'Show Errors/Warnings'} (Ctrl+E)`}
            >
              {(() => {
                const { errors, warnings } = getErrorWarningCounts();
                const total = errors + warnings;
                if (isErrorWarningMode) {
                  return '📋 Standard';
                }
                if (total === 0) return '🟢 Clean';
                return (
                  <>
                    {errors > 0 && <span className="text-red-400">❌{errors}</span>}
                    {warnings > 0 && <span className="text-yellow-400">⚠️{warnings}</span>}
                  </>
                );
              })()} 
            </button>
            {isErrorWarningMode && (
              <select
                value={errorWarningFilter}
                onChange={(e) => setErrorWarningFilter(e.target.value as 'all' | 'errors' | 'warnings')}
                className="p-1 text-xs bg-transparent border border-light-border dark:border-base-600 rounded"
                title="Filter error/warning types"
              >
                <option value="all">All Issues</option>
                <option value="errors">Errors Only</option>
                <option value="warnings">Warnings Only</option>
              </select>
            )}
          </div>

          {/* Search and Scroll Controls */}
          <div className="flex items-center gap-1 border-l border-light-border dark:border-base-600 pl-2">
            <button
              onClick={toggleSearchMode}
              className={`p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs ${isSearchMode ? 'bg-primary text-white' : ''}`}
              title="Search CLI history (Ctrl+F)"
            >
              🔍 Search
            </button>
            <button
              onClick={scrollToTop}
              className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs"
              title="Scroll to top (Home)"
            >
              ⬆️ Top
            </button>
            <button
              onClick={scrollToBottom}
              className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs"
              title="Scroll to bottom (End)"
            >
              ⬇️ Bottom
            </button>
            {isScrollLocked && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                📌 Locked
              </span>
            )}
          </div>

          {/* Copy and Save CLI History Buttons */}
          {history.length > 0 && (
            <div className="flex items-center gap-1 border-l border-light-border dark:border-base-600 pl-2">
              <button
                onClick={copyCliHistory}
                className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs"
                title="Copy CLI history to clipboard"
              >
                📋 Copy
              </button>
              <button
                onClick={saveCliHistory}
                className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs"
                title="Save CLI history as file"
              >
                💾 Save
              </button>
            </div>
          )}
          {!isMaximized && onHeightChange && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onHeightChange(50)}
                className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded"
                title="Extend CLI Up (+50px)"
              >
                <PlusIcon className="w-3 h-3" />
              </button>
              <button
                onClick={() => onHeightChange(-50)}
                className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded"
                title="Shrink CLI Down (-50px)"
              >
                <MinimizeIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          {onMaximizeToggle && (
            <button
              onClick={onMaximizeToggle}
              className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <MinimizeIcon className={`w-3 h-3 ${isMaximized ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </header>
      <div ref={scrollContainerRef} className="flex-1 p-3 overflow-y-auto space-y-2 relative flex flex-col scroll-smooth" style={{ color: cliFontColor || undefined, overflowAnchor: 'none' }} onScroll={handleScroll} onWheel={handleWheel}>
        {/* Error/Warning Mode Header */}
        {isErrorWarningMode && (
          <div className="sticky top-0 z-10 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 rounded-md p-2 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                  {(() => {
                    const { errors, warnings } = getErrorWarningCounts();
                    const total = errors + warnings;
                    if (total === 0) return '🟢 No Issues Found';
                    let message = '🚨 Issues Found: ';
                    if (errorWarningFilter === 'errors') {
                      message += `${errors} Error${errors !== 1 ? 's' : ''}`;
                    } else if (errorWarningFilter === 'warnings') {
                      message += `${warnings} Warning${warnings !== 1 ? 's' : ''}`;
                    } else {
                      message += `${errors} Error${errors !== 1 ? 's' : ''}, ${warnings} Warning${warnings !== 1 ? 's' : ''}`;
                    }
                    return message;
                  })()} 
                </span>
              </div>
              <button
                onClick={toggleErrorWarningMode}
                className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded text-xs text-red-600 dark:text-red-400"
                title="Return to standard messages"
              >
                ✕ Back to Standard
              </button>
            </div>
          </div>
        )}


        {/* Search Bar */}
        {isSearchMode && (
          <div className="sticky top-0 z-10 bg-light-panel dark:bg-base-800 border border-light-border dark:border-base-700 rounded-md p-2 mb-2">
            <div className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={isErrorWarningMode ? "Search errors/warnings..." : "Search CLI history..."}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                style={{ color: cliFontColor || undefined }}
              />
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-primary">
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <button
                    onClick={() => navigateSearch('prev')}
                    className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded"
                    title="Previous result (Shift+Enter)"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => navigateSearch('next')}
                    className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded"
                    title="Next result (Enter)"
                  >
                    ⬇️
                  </button>
                </div>
              )}
              <button
                onClick={toggleSearchMode}
                className="p-1 hover:bg-light-border dark:hover:bg-base-700 rounded text-xs"
                title="Close search (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="min-h-full flex flex-col justify-end">
          {(() => {
            let displayHistory = filteredHistory;
            
            // If in search mode, use search results
            if (isSearchMode) {
              displayHistory = filteredHistory;
            }
            
            // Show message if no content in current mode
            if (displayHistory.length === 0) {
              if (isErrorWarningMode) {
                return (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">🟢</div>
                      <div className="text-lg font-semibold mb-1">No Issues Found</div>
                      <div className="text-sm">
                        {errorWarningFilter === 'errors' ? 'No errors' : 
                         errorWarningFilter === 'warnings' ? 'No warnings' : 
                         'No errors or warnings'} in the current session.
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">📋</div>
                      <div className="text-lg font-semibold mb-1">No Standard Messages</div>
                      <div className="text-sm">
                        No standard messages found. Errors and warnings are hidden in this view.
                      </div>
                    </div>
                  </div>
                );
              }
            }
            
            return displayHistory.map((item, index) => {
              const originalIndex = isSearchMode ? searchResults[filteredHistory.indexOf(item)] : index;
              const isCurrentSearchResult = isSearchMode && searchResults[currentSearchIndex] === originalIndex;
              return renderHistoryItem(item, index, isCurrentSearchResult);
            });
          })()}
          <div ref={endOfHistoryRef} className="h-0" style={{ overflowAnchor: 'auto' }} />
        </div>
      </div>
      {/* Keep the command entry visible and above any overlays */}
      <div className="relative sticky bottom-0 z-20" style={{ backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 border border-light-border dark:border-base-700 rounded-t-md max-h-32 overflow-y-auto" style={{ backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={`suggestion-${index}-${suggestion}`}
                className={`px-3 py-1 text-xs cursor-pointer ${
                  index === selectedSuggestion 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-light-border dark:hover:bg-base-700'
                }`}
                onClick={() => {
                  setInput(suggestion);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
        {/* Live validation banner */}
        {validationMsg && (
          <div className={`absolute bottom-full left-0 right-0 mb-1 px-3 py-1 text-xs rounded ${validationType === 'error' ? 'bg-red-500/20 text-red-700 dark:text-red-300' : 'bg-black/10 dark:bg-white/10 text-light-text dark:text-gray-200'}`}
               style={{ backgroundColor: cliBgColor ? undefined : undefined }}>
            {validationMsg}
          </div>
        )}
        {isModelSelectionMode && availableModels.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 border border-light-border dark:border-base-700 rounded-t-md max-h-64 overflow-y-auto" style={{ backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}>
            <div className="px-3 py-2 text-xs font-semibold text-primary border-b border-light-border dark:border-base-700">
              Select Model for {apiProvider?.toUpperCase()} (↑↓ Navigate, Enter Select, Esc Cancel, 1-9 Quick Select)
            </div>
            {availableModels.map((model, index) => (
              <div
                key={`model-${index}-${model}`}
                className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between ${
                  index === selectedModelIndex 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-light-border dark:hover:bg-base-700'
                }`}
                onClick={() => {
                  setSelectedModelIndex(index);
                  selectCurrentModel();
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60 w-4">
                    {index < 9 ? (index + 1).toString() : ''}
                  </span>
                  <span className="font-mono">
                    {formatModelName(model, apiProvider || '')}
                  </span>
                  {model === currentModel && (
                    <span className="text-green-500 text-xs">✓ current</span>
                  )}
                </div>
                {apiProvider === 'local' && (
                  <span className="text-xs opacity-60">
                    {model.includes('0.5B') ? '~400MB' : 
                     model.includes('1B') ? '~700MB' : 
                     model.includes('1.5B') ? '~1.2GB' : 
                     model.includes('2B') ? '~1.5GB' : 
                     model.includes('3B') ? '~2.5GB' : 'Local'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {isPersonalitySelectionMode && availablePersonalities.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 border border-light-border dark:border-base-700 rounded-t-md max-h-64 overflow-y-auto" style={{ backgroundColor: cliBgColor || undefined, color: cliFontColor || undefined }}>
            <div className="px-3 py-2 text-xs font-semibold text-primary border-b border-light-border dark:border-base-700">
              Select Personalities for Conversation (↑↓ Navigate, Space Toggle, Enter Start, Esc Cancel, 1-9 Quick Toggle)
              {selectedPersonalities.length > 0 && (
                <span className="ml-2 text-green-500">
                  {selectedPersonalities.length} selected {selectedPersonalities.length >= 2 ? '✓' : '(need 2+)'}
                </span>
              )}
            </div>
            {availablePersonalities.map((personality, index) => {
              const isSelected = selectedPersonalities.includes(personality.id);
              const isHighlighted = index === selectedPersonalityIndex;
              return (
                <div
                  key={personality.id}
                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between ${
                    isHighlighted 
                      ? 'bg-primary text-white' 
                      : 'hover:bg-light-border dark:hover:bg-base-700'
                  }`}
                  onClick={() => {
                    setSelectedPersonalityIndex(index);
                    togglePersonalitySelection();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-60 w-4">
                      {index < 9 ? (index + 1).toString() : ''}
                    </span>
                    <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                      isSelected 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-400'
                    }`}>
                      {isSelected && '✓'}
                    </span>
                    <span className="font-mono text-green-600 dark:text-green-400">
                      {personality.name}
                    </span>
                  </div>
                </div>
              );
            })}
            {selectedPersonalities.length >= 2 && (
              <div className="px-3 py-2 border-t border-light-border dark:border-base-700 bg-green-50 dark:bg-green-900/20">
                <button
                  onClick={finishPersonalitySelection}
                  className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 px-3 rounded"
                >
                  Start Conversation with {selectedPersonalities.length} Personalities (Enter)
                </button>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="flex items-center p-2 border-t border-light-border dark:border-base-700" style={{ color: cliFontColor || undefined }}>
          <span>{promptSymbol}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none flex-1 focus:outline-none ml-2"
            style={{ 
              color: isLlmConversationMode ? '#3b82f6' : (cliFontColor || undefined) 
            }}
            placeholder={cliFocusedPersonalityName ? "Type a message, 'exit', or '!command'..." : "Type a command... (e.g., help)"}
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
};
