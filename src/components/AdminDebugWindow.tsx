import React, { useEffect, useRef, useState } from 'react';
import type { ExperimentalSettings, Personality } from '../types';

export type DebugEvent = {
  id: string;
  time: string; // ISO
  type: string;
  title: string;
  details?: string;
  data?: any;
};

interface AdminDebugWindowProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  events: DebugEvent[];
  experimentalSettings?: ExperimentalSettings;
  activePersonalities?: Personality[];
}

// Syntax highlighting utility
const syntaxHighlight = (text: string): JSX.Element => {
  const tokens: JSX.Element[] = [];
  let currentIndex = 0;
  
  // Regex patterns for different token types
  const patterns = [
    { type: 'string', regex: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, color: 'text-green-600 dark:text-green-400' },
    { type: 'number', regex: /\b\d+\.?\d*\b/, color: 'text-purple-600 dark:text-purple-400' },
    { type: 'boolean', regex: /\b(true|false|null|undefined)\b/, color: 'text-orange-600 dark:text-orange-400' },
    { type: 'function', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, color: 'text-blue-600 dark:text-blue-400 font-semibold' },
    { type: 'property', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/, color: 'text-cyan-600 dark:text-cyan-400' },
    { type: 'variable', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/, color: 'text-yellow-600 dark:text-yellow-300' },
    { type: 'operator', regex: /[+\-*/%=<>!&|]+/, color: 'text-red-600 dark:text-red-400' },
    { type: 'bracket', regex: /[{}\[\]()]/, color: 'text-pink-600 dark:text-pink-400 font-bold' },
  ];
  
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        const lineTokens: JSX.Element[] = [];
        let pos = 0;
        const lineText = line;
        
        while (pos < lineText.length) {
          let matched = false;
          
          for (const pattern of patterns) {
            const regex = new RegExp('^' + pattern.regex.source);
            const match = lineText.slice(pos).match(regex);
            
            if (match) {
              const matchText = match[0];
              const key = `${lineIdx}-${pos}-${pattern.type}`;
              
              if (pattern.type === 'function') {
                // Extract function name without the parenthesis
                const funcName = match[1];
                lineTokens.push(
                  <span key={key} className={pattern.color}>{funcName}</span>,
                  <span key={`${key}-paren`} className="text-pink-600 dark:text-pink-400 font-bold">(</span>
                );
              } else if (pattern.type === 'property') {
                // Extract property name without the colon
                const propName = match[1];
                lineTokens.push(
                  <span key={key} className={pattern.color}>{propName}</span>,
                  <span key={`${key}-colon`} className="text-gray-500">:</span>
                );
              } else {
                lineTokens.push(<span key={key} className={pattern.color}>{matchText}</span>);
              }
              
              pos += matchText.length;
              matched = true;
              break;
            }
          }
          
          if (!matched) {
            // No pattern matched, add the character as-is
            const char = lineText[pos];
            lineTokens.push(<span key={`${lineIdx}-${pos}-plain`} className="text-gray-700 dark:text-gray-300">{char}</span>);
            pos++;
          }
        }
        
        return (
          <React.Fragment key={lineIdx}>
            {lineTokens}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const AdminDebugWindow: React.FC<AdminDebugWindowProps> = ({ open, onClose, onClear, events, experimentalSettings, activePersonalities }) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'events' | 'experimental'>('events');

  const initialWidth = Math.min(1000, Math.floor(window.innerWidth * 0.6));
  const initialHeight = Math.min(600, Math.floor(window.innerHeight * 0.7));
  const [pos, setPos] = useState({ x: Math.max(8, window.innerWidth - initialWidth - 24), y: Math.max(8, window.innerHeight - initialHeight - 24) });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

  // When minimized, position at bottom of screen
  const getMinimizedPosition = () => ({
    x: Math.max(8, Math.min(pos.x, window.innerWidth - size.width - 8)),
    y: window.innerHeight - 48 - 8 // 48px height + 8px margin
  });

  const getMinimizedSize = () => ({
    width: Math.min(size.width, window.innerWidth - 16),
    height: 48
  });

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      
      if (!clientX || !clientY) return;
      
      if (isDragging && !isMinimized) { // Don't allow dragging when minimized
        const nx = clientX - dragOffset.x;
        const ny = clientY - dragOffset.y;
        const maxX = window.innerWidth - size.width - 8;
        const maxY = window.innerHeight - size.height - 8;
        setPos({ x: Math.max(8, Math.min(nx, maxX)), y: Math.max(8, Math.min(ny, maxY)) });
      } else if (isResizing && !isMinimized) { // Don't allow resizing when minimized
        const desiredW = Math.max(360, Math.min(clientX - pos.x, window.innerWidth - pos.x - 8));
        const desiredH = Math.max(200, Math.min(clientY - pos.y, window.innerHeight - pos.y - 8));
        setSize({ width: desiredW, height: desiredH });
      }
    };
    
    const onUp = () => { 
      setIsDragging(false); 
      setIsResizing(false);
      document.body.style.touchAction = '';
      document.body.style.userSelect = '';
    };
    
    if (isDragging || isResizing) {
      // Mouse events
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      
      // Touch events for mobile/tablet
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
      document.addEventListener('touchcancel', onUp);
      
      // Prevent scrolling while dragging on mobile
      document.body.style.touchAction = 'none';
      document.body.style.userSelect = 'none';
    }
    
    return () => { 
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
      document.body.style.touchAction = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragOffset.x, dragOffset.y, pos.x, pos.y, size.width, size.height, isMinimized]);

  useEffect(() => {
    const onResize = () => {
      // Clamp window on viewport resize
      if (isMinimized) {
        // Keep minimized window at bottom
        const minPos = getMinimizedPosition();
        const minSize = getMinimizedSize();
        setPos(minPos);
        setSize(minSize);
      } else {
        setPos(prev => ({
          x: Math.max(8, Math.min(prev.x, window.innerWidth - size.width - 8)),
          y: Math.max(8, Math.min(prev.y, window.innerHeight - size.height - 8)),
        }));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [size.width, size.height, isMinimized]);

  // Handle minimize/restore transitions
  useEffect(() => {
    if (isMinimized) {
      // Move to bottom when minimizing
      setPos(getMinimizedPosition());
      setSize(getMinimizedSize());
    }
    // Note: When restoring, we keep the current position and size
  }, [isMinimized]);

  if (!open) return null;

  const currentPos = isMinimized ? getMinimizedPosition() : pos;
  const currentSize = isMinimized ? getMinimizedSize() : size;

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid drag when clicking interactive header buttons or when minimized
    const target = e.target as HTMLElement;
    if (target.closest('button') || isMinimized) return;
    const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  return (
    <div
      className="fixed z-[100] select-none"
      style={{ top: currentPos.y, left: currentPos.x, width: currentSize.width, height: currentSize.height }}
    >
      <div className="relative w-full h-full border border-light-border dark:border-base-700 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm bg-white/75 dark:bg-base-900/75">
        <header
          ref={headerRef}
          onMouseDown={startDrag}
          className={`flex flex-col bg-light-panel/60 dark:bg-base-800/60 border-b border-light-border dark:border-base-700 ${
            isDragging ? 'cursor-grabbing' : isMinimized ? 'cursor-default' : 'cursor-grab'
          }`}
          title={isMinimized ? 'Click Restore to drag' : 'Drag to move'}
        >
          <div className="h-10 flex items-center justify-between px-3">
            <div className="font-semibold text-sm text-center flex-1">Admin Debug Window</div>
            <div className="flex items-center gap-2">
              <button onClick={onClear} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">Clear</button>
              <button onClick={() => setIsMinimized(m => !m)} className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20" title={isMinimized ? 'Restore' : 'Minimize'}>
                {isMinimized ? 'Restore' : 'Minimize'}
              </button>
              <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">Close</button>
            </div>
          </div>
          {!isMinimized && (
            <div className="flex gap-1 px-3 pb-2">
              <button
                onClick={() => setActiveTab('events')}
                className={`text-xs px-3 py-1 rounded ${activeTab === 'events' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('experimental')}
                className={`text-xs px-3 py-1 rounded ${activeTab === 'experimental' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
              >
                Experimental Settings
              </button>
            </div>
          )}
        </header>
        {!isMinimized && (
          <div className="absolute inset-0 top-[72px] overflow-auto p-3 font-mono text-xs space-y-1" data-scrollable>
            {activeTab === 'events' && (
              <>
                {events.length === 0 && (
                  <div className="text-light-text-secondary dark:text-gray-400">No debug events yet. Actions like sending messages or TTS playback will appear here.</div>
                )}
                {events.slice().reverse().map(ev => {
              const isExpanded = expandedEvents.has(ev.id);
              const hasDetails = ev.details || ev.data !== undefined;
              
              // Color code event types
              const getEventTypeColor = (type: string) => {
                const lowerType = type.toLowerCase();
                if (lowerType.includes('error')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
                if (lowerType.includes('tts') || lowerType.includes('audio')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700';
                if (lowerType.includes('message') || lowerType.includes('chat')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
                if (lowerType.includes('api') || lowerType.includes('request')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
                if (lowerType.includes('system') || lowerType.includes('init')) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
                if (lowerType.includes('inject') || lowerType.includes('mimic')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700';
              };
              
              return (
                <div key={ev.id} className="border border-light-border dark:border-base-700 rounded bg-white/40 dark:bg-white/5">
                  <div 
                    className={`flex items-center justify-between p-2 ${hasDetails ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                    onClick={() => hasDetails && toggleEventExpansion(ev.id)}
                    title={hasDetails ? (isExpanded ? 'Click to collapse' : 'Click to expand details') : undefined}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {hasDetails && (
                        <span className="text-gray-500 select-none flex-shrink-0">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${getEventTypeColor(ev.type)}`}>
                        {ev.type}
                      </span>
                      <div className="font-semibold truncate">{ev.title}</div>
                      {ev.details && !isExpanded && (
                        <div className="text-gray-600 dark:text-gray-400 truncate flex-1">
                          - {ev.details.split('\n')[0].substring(0, 80)}{ev.details.length > 80 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <div className="opacity-60 text-[10px] flex-shrink-0 ml-2 font-mono">
                      {new Date(ev.time).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-2 border-t border-light-border dark:border-base-700 bg-black/5 dark:bg-white/5">
                      {ev.details && (
                        <div className="mt-2">
                          <div className="text-gray-600 dark:text-gray-400 text-xs mb-1 font-bold">📝 Details:</div>
                          <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                            {syntaxHighlight(ev.details)}
                          </pre>
                        </div>
                      )}
                      {ev.data !== undefined && (
                        <div className="mt-2">
                          <div className="text-gray-600 dark:text-gray-400 text-xs mb-1 font-bold">🔍 Data:</div>
                          <pre className="whitespace-pre-wrap overflow-auto bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700 text-xs max-h-64 font-mono leading-relaxed">
                            {syntaxHighlight(JSON.stringify(ev.data, null, 2))}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
                })}
              </>
            )}

            {activeTab === 'experimental' && experimentalSettings && (
              <div className="space-y-3 text-light-text dark:text-gray-200">
                <h3 className="font-bold text-sm">Active Experimental Settings</h3>
                
                <div className="space-y-2 text-xs">
                  {experimentalSettings.forcedTopic && (
                    <div className="border-2 border-primary rounded p-2 bg-primary/10">
                      <div className="font-semibold mb-1 text-primary">🔒 Forced Topic Active</div>
                      <div className="font-mono">&quot;{experimentalSettings.forcedTopic}&quot;</div>
                      <div className="text-xs opacity-70 mt-1">This topic will override all conversation topics</div>
                    </div>
                  )}
                  
                  <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                    <div className="font-semibold mb-1">Conversation Flow</div>
                    <div>Turn Order: {experimentalSettings.turnOrderMode}</div>
                    <div>Context Window: {experimentalSettings.contextWindowSize} messages</div>
                    <div>Topic Drift: {(experimentalSettings.topicDriftAllowance * 100).toFixed(0)}%</div>
                    <div>Thinking Time Variance: {experimentalSettings.thinkingTimeVariance ? 'Enabled' : 'Disabled'}</div>
                    <div>Silence Tolerance: {experimentalSettings.silenceTolerance}ms</div>
                  </div>

                  <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                    <div className="font-semibold mb-1">Autonomous Communication</div>
                    <div>Initiative Probability: {(experimentalSettings.defaultInitiativeProbability * 100).toFixed(0)}%</div>
                    <div>Frequency Pattern: {experimentalSettings.communicationFrequencyPattern}</div>
                    <div>Target Selection: {experimentalSettings.targetSelectionMode}</div>
                    <div>Social Energy Model: {experimentalSettings.enableSocialEnergyModel ? 'Enabled' : 'Disabled'}</div>
                  </div>

                  <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                    <div className="font-semibold mb-1">Response Characteristics</div>
                    <div>Default Verbosity: {experimentalSettings.defaultVerbosity.toFixed(2)}x</div>
                    <div>Diversity Boost: +{experimentalSettings.diversityBoost.toFixed(2)} temperature</div>
                    <div>Emotional Expressiveness: {(experimentalSettings.emotionalExpressiveness * 100).toFixed(0)}%</div>
                    <div>Verbosity Adaptation: {experimentalSettings.verbosityAdaptation ? 'Enabled' : 'Disabled'}</div>
                  </div>

                  <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                    <div className="font-semibold mb-1">Social Dynamics</div>
                    <div>Relationship Tracking: {experimentalSettings.enableRelationshipTracking ? 'Enabled' : 'Disabled'}</div>
                    <div>Conflict Mode: {experimentalSettings.conflictMode}</div>
                    <div>Metacommunication: {experimentalSettings.enableMetacommunication ? 'Enabled' : 'Disabled'}</div>
                  </div>

                  <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                    <div className="font-semibold mb-1">Advanced Features</div>
                    <div>Theory of Mind: {(experimentalSettings.theoryOfMind * 100).toFixed(0)}%</div>
                    <div>Self Awareness: {(experimentalSettings.selfAwareness * 100).toFixed(0)}%</div>
                    <div>Opinion Shift Rate: {(experimentalSettings.opinionShiftRate * 100).toFixed(0)}%</div>
                    <div>Mood System: {experimentalSettings.enableMoodSystem ? 'Enabled' : 'Disabled'}</div>
                  </div>

                  {activePersonalities && activePersonalities.length > 0 && (
                    <div className="border border-light-border dark:border-base-700 rounded p-2 bg-white/40 dark:bg-white/5">
                      <div className="font-semibold mb-2">Per-Personality Overrides</div>
                      {activePersonalities.map(p => {
                        const override = experimentalSettings.personalityOverrides[p.id];
                        if (!override || Object.keys(override).length === 0) return null;
                        return (
                          <div key={p.id} className="mb-2 pl-2 border-l-2 border-primary">
                            <div className="font-medium">{p.name}</div>
                            {override.initiativeProbability !== undefined && (
                              <div className="opacity-80">Initiative: {(override.initiativeProbability * 100).toFixed(0)}%</div>
                            )}
                            {override.baseVerbosity !== undefined && (
                              <div className="opacity-80">Verbosity: {override.baseVerbosity.toFixed(2)}x</div>
                            )}
                            {override.assertiveness !== undefined && (
                              <div className="opacity-80">Assertiveness: {(override.assertiveness * 100).toFixed(0)}%</div>
                            )}
                            {override.temperatureBoost !== undefined && (
                              <div className="opacity-80">Temperature Boost: +{override.temperatureBoost.toFixed(2)}</div>
                            )}
                            {override.socialEnergy !== undefined && experimentalSettings.enableSocialEnergyModel && (
                              <div className="opacity-80">Social Energy: {(override.socialEnergy * 100).toFixed(0)}%</div>
                            )}
                            {override.mood && experimentalSettings.enableMoodSystem && (
                              <div className="opacity-80">Mood: {override.mood}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Resize handle */}
        {!isMinimized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={() => setIsResizing(true)}
            title="Resize"
          >
            <svg className="w-full h-full text-light-text-secondary dark:text-gray-600 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 20L20 4" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
