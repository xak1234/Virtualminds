import React, { useState, useRef, useEffect } from 'react';
import type { WindowState, Personality, ChatMessage, GangsConfig } from '../types';
import { ChatWindow } from './ChatWindow';
import { CloseIcon } from './icons/CloseIcon';
import { MinimizeIcon } from './icons/MinimizeIcon';
import { PencilIcon } from './icons/PencilIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LinkIcon } from './icons/LinkIcon';
import { UserIcon } from './icons/UserIcon';
import { SpeakerOnIcon } from './icons/SpeakerOnIcon';
import { SpeakerOffIcon } from './icons/SpeakerOffIcon';
import { SpectrumBadge } from './SpectrumBadge';

type MoodType = 'neutral' | 'angry' | 'loving' | 'happy' | 'sad' | 'paranoid' | 'aroused' | 'stoned' | 'drunk' | 'horny';

interface DraggableWindowProps {
  windowState: WindowState;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onResize: (size: { width: number; height: number }) => void;
  isFocused: boolean;
  personality: Personality;
  onUpdatePersonality: (id: string, updates: Partial<Personality>) => void;
  onViewDetails: () => void;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onRepeatAt?: (index: number) => void;
  currentUser: string | null;
  currentMood: MoodType;
  onTtsToggle: () => void;
  allPersonalities: Personality[];
  onLinkToggle: (targetId: string) => void;
  isConversing: boolean;
  isCurrentSpeaker?: boolean;
  chatInputColor: string;
  chatAiColor: string;
  chatWindowBgColor: string;
  chatWindowAlpha: number;
  chatMessageAlpha: number;
  themeMode: 'light' | 'dark';
  onSkipToNext?: () => void; // optional callback to skip to next person in conversation
  gangsEnabled?: boolean;
  gangsConfig?: GangsConfig;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  windowState, onFocus, onClose, onMinimize, isFocused,
  personality, onUpdatePersonality, onViewDetails, onResize, 
  currentMood, allPersonalities, onLinkToggle, isConversing, isCurrentSpeaker, onTtsToggle, chatInputColor, chatAiColor, chatWindowBgColor, chatWindowAlpha, chatMessageAlpha, themeMode, onSkipToNext, gangsEnabled = false, gangsConfig, ...chatWindowProps
}) => {
  const [position, setPosition] = useState(windowState.position);
  const [size, setSize] = useState(windowState.size);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(personality.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isLinkMenuOpen, setLinkMenuOpen] = useState(false);
  const linkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);
  
  useEffect(() => {
    setNameInput(personality.name);
  }, [personality.name]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Determine the container rect (the positioned ancestor) for proper clamping
      const container = nodeRef.current?.parentElement as HTMLElement | null;
      const containerRect = container?.getBoundingClientRect();

      if (isDragging) {
        // Compute tentative new top-left relative to the container, not the viewport
        const leftFromViewport = e.clientX - dragOffset.current.x;
        const topFromViewport = e.clientY - dragOffset.current.y;
        const containerLeft = containerRect ? containerRect.left : 0;
        const containerTop = containerRect ? containerRect.top : 0;

        const newXRel = leftFromViewport - containerLeft;
        const newYRel = topFromViewport - containerTop;

        const windowWidth = size.width;
        const windowHeight = size.height;
        const maxX = (containerRect ? containerRect.width : window.innerWidth) - windowWidth;
        const maxY = (containerRect ? containerRect.height : window.innerHeight) - windowHeight;

        // Keep a small padding so the header is always reachable
        const padding = 8;
        const constrainedX = Math.max(padding, Math.min(newXRel, Math.max(padding, maxX)));
        const constrainedY = Math.max(padding, Math.min(newYRel, Math.max(padding, maxY)));

        setPosition({
          x: constrainedX,
          y: constrainedY,
        });
      } else if (isResizing) {
        // Resize relative to container; ensure minimums and clamp to container bounds
        const containerLeft = containerRect ? containerRect.left : 0;
        const containerTop = containerRect ? containerRect.top : 0;
        const containerWidth = containerRect ? containerRect.width : window.innerWidth;
        const containerHeight = containerRect ? containerRect.height : window.innerHeight;

        setSize(currentSize => {
          const minWidth = 400;
          const minHeight = 300;
          const maxWidth = Math.max(minWidth, containerWidth - position.x - 8);
          const maxHeight = Math.max(minHeight, containerHeight - position.y - 8);

          const desiredWidth = e.clientX - containerLeft - position.x;
          const desiredHeight = e.clientY - containerTop - position.y;

          const newWidth = Math.max(minWidth, Math.min(desiredWidth, maxWidth));
          const newHeight = Math.max(minHeight, Math.min(desiredHeight, maxHeight));
          return { width: newWidth, height: newHeight };
        });
      }
    };
    const handleMouseUp = () => {
        if (isResizing) {
            setSize(currentSize => {
                onResize(currentSize);
                return currentSize;
            });
        }
        
        // Re-enable text selection when drag/resize ends
        if (isDragging || isResizing) {
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        }
        
        setIsDragging(false);
        setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, position.x, position.y, size.width, size.height, onResize]);

  // Clamp initial position and on window resize to keep the window fully visible within the container
  useEffect(() => {
    const clampToContainer = () => {
      const container = nodeRef.current?.parentElement as HTMLElement | null;
      const rect = container?.getBoundingClientRect();
      if (!rect) return;
      const padding = 8;
      const maxX = Math.max(padding, rect.width - size.width);
      const maxY = Math.max(padding, rect.height - size.height);
      setPosition(prev => ({
        x: Math.max(padding, Math.min(prev.x, maxX)),
        y: Math.max(padding, Math.min(prev.y, maxY)),
      }));
    };

    clampToContainer();
    window.addEventListener('resize', clampToContainer);
    return () => window.removeEventListener('resize', clampToContainer);
  }, [size.width, size.height]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (linkMenuRef.current && !linkMenuRef.current.contains(event.target as Node)) {
        setLinkMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent dragging when clicking on interactive elements or scrollable content
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('.overflow-y-auto') ||
        (e.target as HTMLElement).closest('[data-scrollable]')) return;
    
    // Prevent text selection and default behavior during drag
    e.preventDefault();
    e.stopPropagation();
    
    onFocus();
    if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        setIsDragging(true);
        
        // Disable text selection on the document during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onFocus();
    setIsResizing(true);
  };
  
  const handleNameSave = () => {
    if (nameInput.trim() && nameInput.trim() !== personality.name) {
      onUpdatePersonality(personality.id, { name: nameInput.trim() });
    } else {
        setNameInput(personality.name);
    }
    setIsEditingName(false);
  };
  
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') {
      setNameInput(personality.name);
      setIsEditingName(false);
    }
  };


  const hexToRgba = (hex: string, alpha: number): string => {
    const clean = hex.replace('#', '');
    const isShort = clean.length === 3;
    const r = parseInt(isShort ? clean[0] + clean[0] : clean.slice(0, 2), 16);
    const g = parseInt(isShort ? clean[1] + clean[1] : clean.slice(2, 4), 16);
    const b = parseInt(isShort ? clean[2] + clean[2] : clean.slice(4, 6), 16);
    const a = Math.min(Math.max(alpha, 0), 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  if (!personality) return null;
  
  // Get gang info if gangs are enabled
  const memberStatus = gangsEnabled && gangsConfig ? gangsConfig.memberStatus[personality.id] : null;
  const gang = memberStatus?.gangId && gangsConfig ? gangsConfig.gangs[memberStatus.gangId] : null;
  // In gang mode, killed personalities can be reloaded and used again, so don't disable chat
  // Only disable if NOT in gang mode and the personality is marked as killed
  const isKilled = !gangsEnabled && Boolean(memberStatus?.killed);
  const isGangLeader = memberStatus?.rank === 'leader' && !memberStatus?.killed;
  
  return (
    <div
      ref={nodeRef}
      className={`absolute max-w-[90vw] max-h-[80vh] backdrop-blur-sm rounded-lg shadow-2xl flex flex-col border-2 ${
        isKilled
          ? 'border-red-700 shadow-red-900/40'
          : isGangLeader && gang
            ? 'border-yellow-500 shadow-yellow-500/30'
            : isFocused
              ? 'border-primary dark:border-primary'
              : 'border-light-border dark:border-base-700'
      } ${isKilled ? 'opacity-90' : ''}`}
      
      style={{
        top: position.y,
        left: position.x,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: windowState.zIndex,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
        backgroundColor: (chatWindowBgColor && chatWindowBgColor.trim() !== '')
          ? hexToRgba(chatWindowBgColor.trim(), Math.min(Math.max(chatWindowAlpha, 0), 1))
          : (themeMode === 'dark'
              ? `rgba(31, 41, 55, ${Math.min(Math.max(chatWindowAlpha, 0), 1)})`
              : `rgba(255, 255, 255, ${Math.min(Math.max(chatWindowAlpha, 0), 1)})`),
      }}
      onClick={onFocus}
    >
      <header
        className={`h-10 flex items-center justify-between px-2 rounded-t-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''} relative`}
        style={{
          backgroundColor: isKilled
            ? 'rgba(127, 29, 29, 0.35)'
            : isGangLeader && gang
              ? `${gang.color}40`
              : 'rgba(59, 130, 246, 0.15)',
          borderBottom: isKilled
            ? '2px solid rgba(185, 28, 28, 0.7)'
            : isGangLeader && gang
              ? `2px solid ${gang.color}`
              : undefined
        }}
        onMouseDown={handleDragMouseDown}
      >
        {/* Gang status badge - leader crown or death marker */}
        {isKilled ? (
          <div
            className="absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 border-red-700 bg-red-900 flex items-center justify-center shadow-lg z-10"
            title="KILLED"
          >
            <span className="text-sm">💀</span>
          </div>
        ) : isGangLeader && gang ? (
          <div
            className="absolute -top-2 -left-2 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg z-10 animate-pulse"
            style={{ backgroundColor: gang.color }}
            title={`GANG LEADER of ${gang.name}`}
          >
            <span className="text-sm">👑</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-6 h-6 flex-shrink-0">
              {personality.profileImage ? (
                  <img src={personality.profileImage} alt={personality.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                  <UserIcon className="w-6 h-6 rounded-full object-cover p-1 bg-light-panel dark:bg-base-800" />
              )}
              <SpectrumBadge size={24} targetId={personality.id} />
            </div>

            {isEditingName ? (
                <input 
                    ref={nameInputRef}
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={handleNameKeyDown}
                    className="bg-light-panel dark:bg-base-800 text-sm font-bold p-0.5 rounded-sm outline-none ring-2 ring-primary w-full text-gray-900 dark:text-white"
                />
            ) : (
                <>
                  <span className="font-extrabold text-lg truncate pl-1 text-white">{personality.name}</span>
                  {isGangLeader && (
                    <span className="ml-1 text-yellow-400 text-lg animate-pulse" title="Gang Leader">
                      👑
                    </span>
                  )}
                  <span className="ml-2 text-sm text-white italic flex-none">({currentMood})</span>
                  {gang && memberStatus && (
                    <div className={`ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full border-2 flex-none ${isGangLeader ? 'border-yellow-400' : memberStatus.killed ? 'border-red-700' : ''}`}
                         style={{
                           backgroundColor: memberStatus.killed ? '#7f1d1d55' : (isGangLeader ? `${gang.color}40` : `${gang.color}20`),
                           borderColor: memberStatus.killed ? '#7f1d1d' : (isGangLeader ? '#facc15' : gang.color)
                         }}>
                      <span className={`text-xs ${isGangLeader ? 'font-extrabold' : 'font-bold'}`} style={{ color: memberStatus.killed ? '#7f1d1d' : gang.color }}>
                        {memberStatus.killed ? '💀 FALLEN' : memberStatus.rank === 'leader' ? '👑 LEADER' : '⭐'} {gang.name}
                      </span>
                      {memberStatus.killed && (
                        <span className="text-xs font-bold text-red-700 dark:text-red-600">
                          💀
                        </span>
                      )}
                      {memberStatus.imprisoned && !memberStatus.killed && (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">
                          🔒
                        </span>
                      )}
                    </div>
                  )}
                </>
            )}
        </div>
        <div className="flex items-center gap-1 relative" ref={linkMenuRef}>
          {personality.ttsEnabled && (
            <button 
              onClick={(e) => { e.stopPropagation(); onTtsToggle(); }} 
              className={`p-2 rounded-full hover:bg-black/10 hover:bg-white/10 ${
                windowState.sessionTtsEnabled ? 'bg-green-100 dark:bg-green-900/30' : ''
              }`}
              title="Toggle Text-to-Speech"
            >
              {windowState.sessionTtsEnabled ? (
                <SpeakerOnIcon className="w-5 h-5 text-green-700 dark:text-green-300"/>
              ) : (
                <SpeakerOffIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
              )}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} className="hidden p-2 rounded-full hover:bg-black/10 hover:bg-white/10" title="Edit Name"><PencilIcon className="w-4 h-4 text-white" /></button>
          <button onClick={(e) => { e.stopPropagation(); onViewDetails(); }} className="p-2 rounded-full hover:bg-black/10 hover:bg-white/10" title="View Details"><InformationCircleIcon className="w-5 h-5 text-white" /></button>
          <button onClick={(e) => { e.stopPropagation(); setLinkMenuOpen(o => !o); }} className="hidden p-2 rounded-full hover:bg-black/10 hover:bg-white/10" title="Link Personalities"><LinkIcon className="w-5 h-5 text-white" /></button>
          {isLinkMenuOpen && (
             <div className="absolute top-full right-0 mt-2 w-64 bg-light-panel dark:bg-base-800 border border-light-border dark:border-base-600 rounded-md shadow-lg z-20">
                <div className="p-2 text-xs font-bold text-light-text-secondary dark:text-gray-400 border-b border-light-border dark:border-base-700">
                  Personality Links
                  <div className="text-xs font-normal mt-1 opacity-75">↔️ = Mutual, → = One-way</div>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto">
                  {allPersonalities.filter(p => p.id !== personality.id).map(p => {
                    const canSeeOther = personality.visiblePersonalityIds.includes(p.id);
                    const otherCanSeeThis = p.visiblePersonalityIds.includes(personality.id);
                    const isBidirectional = canSeeOther && otherCanSeeThis;
                    const isOneWay = canSeeOther || otherCanSeeThis;
                    
                    return (
                      <label key={p.id} className="flex items-center p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-base-700 cursor-pointer text-sm group">
                        <input 
                          type="checkbox" 
                          checked={canSeeOther} 
                          onChange={() => onLinkToggle(p.id)} 
                          className="h-4 w-4 rounded border-gray-400 text-primary bg-base-900 focus:ring-primary"
                        />
                        <div className="ml-2 flex items-center justify-between w-full">
                          <span className={`truncate ${
                            isBidirectional 
                              ? 'text-green-600 dark:text-green-400' 
                              : isOneWay 
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {p.name}
                          </span>
                          <span className="ml-2 flex items-center text-xs opacity-70 group-hover:opacity-100">
                            {isBidirectional && (
                              <span className="text-green-600 dark:text-green-400" title="Bidirectional link - both can see each other">
                                ↔️
                              </span>
                            )}
                            {canSeeOther && !otherCanSeeThis && (
                              <span className="text-yellow-600 dark:text-yellow-400" title="One-way link - only this personality can see them">
                                →
                              </span>
                            )}
                            {!canSeeOther && otherCanSeeThis && (
                              <span className="text-yellow-600 dark:text-yellow-400" title="One-way link - only they can see this personality">
                                ←
                              </span>
                            )}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                  {allPersonalities.length <= 1 && <p className="text-xs text-light-text-secondary dark:text-gray-500 p-1">No other personalities loaded.</p>}
                </div>
             </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-2 rounded-full hover:bg-white/10" title="Minimize"><MinimizeIcon className="w-4 h-4 text-white" /></button>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-red-500/20" title="Close"><CloseIcon className="w-4 h-4 text-white hover:text-red-500" /></button>
        </div>
      </header>
      {isKilled && (
        <div className="bg-red-950/80 border-y border-red-800 text-red-200 font-mono text-xs uppercase tracking-[0.35em] text-center py-2 flex items-center justify-center gap-2">
          <span className="text-base">💀</span>
          <span>Deceased - interactions disabled</span>
        </div>
      )}
      <div className="flex-grow overflow-hidden p-2" onMouseDown={(e) => e.stopPropagation()}>
        <div
          className={`h-full w-full rounded-md border border-light-border dark:border-base-700 overflow-hidden ${
            isConversing && onSkipToNext && !isKilled ? 'cursor-pointer' : ''
          } ${isKilled ? 'opacity-80' : ''}`}
          onClick={() => {
            if (isKilled) {
              return;
            }
            if (isConversing && onSkipToNext) {
              onSkipToNext();
            }
          }}
          title={isKilled ? 'This personality has been killed' : isConversing ? "Click to skip to next person" : undefined}
        >
          <ChatWindow
              personality={personality}
              sessionTtsEnabled={windowState.sessionTtsEnabled}
              isConversing={isConversing}
              isDragging={isDragging}
              isCurrentSpeaker={isCurrentSpeaker}
              inputTextColor={chatInputColor}
              aiTextColor={chatAiColor}
              chatMessageAlpha={chatMessageAlpha}
              onSkipToNext={onSkipToNext}
              isPersonalityKilled={isKilled}
              {...chatWindowProps}
          />
        </div>
      </div>
       <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
        onMouseDown={handleResizeMouseDown}
        title="Resize window"
      >
        <svg className="w-full h-full text-light-text-secondary dark:text-gray-600 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 20L20 4" />
        </svg>
      </div>
    </div>
  );
};