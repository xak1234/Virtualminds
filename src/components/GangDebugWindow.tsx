import React, { useEffect, useRef, useState } from 'react';
import type { GangsConfig, Personality } from '../types';
import { gangService } from '../services/gangService';

export type GangEvent = {
  id: string;
  time: string;
  type: 'violence' | 'recruitment' | 'leave' | 'join' | 'imprisoned' | 'released' | 'territory' | 'death' | 'merger' | 'weapon_acquired' | 'weapon_stolen' | 'weapon_crafted' | 'bribe_success' | 'bribe_failed';
  message: string;
  involvedPersonalities?: string[];
};

export type GangConversationMessage = {
  id: string;
  time: string;
  speakerId: string;
  speakerName: string;
  listenerId: string;
  listenerName: string;
  message: string;
  gangAffiliation: {
    speakerGang?: string;
    listenerGang?: string;
    areRivals: boolean;
  };
};

export type DrugTransaction = {
  id: string;
  time: string;
  type: 'deal' | 'smuggle' | 'confiscated' | 'stolen';
  personalityId: string;
  personalityName: string;
  gangId?: string;
  gangName?: string;
  amount: number; // grams
  profit?: number; // money earned/lost
  caught: boolean;
  details: string;
};

interface GangDebugWindowProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  events: GangEvent[];
  conversations: GangConversationMessage[];
  drugTransactions: DrugTransaction[];
  gangsConfig?: GangsConfig;
  activePersonalities?: Personality[];
}

export const GangDebugWindow: React.FC<GangDebugWindowProps> = ({ 
  open, 
  onClose, 
  onClear, 
  events,
  conversations,
  drugTransactions,
  gangsConfig,
  activePersonalities = [] 
}) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'gangs' | 'members' | 'weapons' | 'guards' | 'stats' | 'conversations' | 'drugs'>('gangs');
  const [selectedGangFilter, setSelectedGangFilter] = useState<string | 'all' | 'rivals'>('all');
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const previousEventCountRef = useRef(0);

  // Helper to get weapon icon
  const getWeaponIcon = (weaponType: string) => {
    switch (weaponType) {
      case 'gun': return '🔫';
      case 'shank': return '🔪';
      case 'chain': return '⛓️';
      default: return '🗡️';
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('[GANG DEBUG WINDOW] Props updated - Events:', events.length, 'Conversations:', conversations.length);
  }, [events.length, conversations.length]);

  useEffect(() => {
    if (events.length > previousEventCountRef.current) {
      setIsMinimized(false);
      setActiveTab('events');
      requestAnimationFrame(() => {
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTo({ top: 0, behavior: previousEventCountRef.current === 0 ? 'auto' : 'smooth' });
        }
      });
    }
    previousEventCountRef.current = events.length;
  }, [events.length]);

  // Load saved position and size from localStorage, or use defaults
  const STORAGE_KEY = 'gangDebugWindowState';
  
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that saved position is still valid for current window size
        if (parsed.pos && parsed.size) {
          const validX = Math.max(8, Math.min(parsed.pos.x, window.innerWidth - parsed.size.width - 8));
          const validY = Math.max(8, Math.min(parsed.pos.y, window.innerHeight - parsed.size.height - 8));
          return {
            pos: { x: validX, y: validY },
            size: parsed.size
          };
        }
      }
    } catch (e) {
      console.warn('[GANG DEBUG] Failed to load saved window state:', e);
    }
    
    // Default initial state
    const initialWidth = Math.min(1000, Math.floor(window.innerWidth * 0.6));
    const initialHeight = Math.min(600, Math.floor(window.innerHeight * 0.7));
    return {
      pos: { x: Math.max(8, window.innerWidth - initialWidth - 24), y: Math.max(8, window.innerHeight - initialHeight - 24) },
      size: { width: initialWidth, height: initialHeight }
    };
  };
  
  const initialState = getInitialState();
  const [pos, setPos] = useState(initialState.pos);
  const [size, setSize] = useState(initialState.size);

  const getMinimizedPosition = () => ({
    x: Math.max(8, Math.min(pos.x, window.innerWidth - size.width - 8)),
    y: window.innerHeight - 48 - 8
  });

  const getMinimizedSize = () => ({
    width: Math.min(size.width, window.innerWidth - 16),
    height: 48
  });

  // Save position and size to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pos, size }));
    } catch (e) {
      console.warn('[GANG DEBUG] Failed to save window state:', e);
    }
  }, [pos, size]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      
      if (!clientX || !clientY) return;
      
      if (isDragging && !isMinimized) {
        const nx = clientX - dragOffset.x;
        const ny = clientY - dragOffset.y;
        const maxX = window.innerWidth - size.width - 8;
        const maxY = window.innerHeight - size.height - 8;
        setPos({ x: Math.max(8, Math.min(nx, maxX)), y: Math.max(8, Math.min(ny, maxY)) });
      } else if (isResizing && !isMinimized) {
        const desiredW = Math.max(360, Math.min(clientX - pos.x, window.innerWidth - pos.x - 8));
        const desiredH = Math.max(200, Math.min(clientY - pos.y, window.innerHeight - pos.y - 8));
        setSize({ width: desiredW, height: desiredH });
      }
    };

    const onUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Re-enable touch scrolling
      document.body.style.touchAction = '';
    };

    if (isDragging || isResizing) {
      // Mouse events
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      
      // Touch events for mobile/tablet
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
      document.addEventListener('touchcancel', onUp);
      
      document.body.style.userSelect = 'none';
      // Prevent scrolling while dragging on mobile
      document.body.style.touchAction = 'none';
      if (isResizing) document.body.style.cursor = 'nwse-resize';
    }

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
      document.body.style.touchAction = '';
    };
  }, [isDragging, isResizing, dragOffset, pos, size, isMinimized]);

  if (!open) return null;

  const displayPos = isMinimized ? getMinimizedPosition() : pos;
  const displaySize = isMinimized ? getMinimizedSize() : size;

  const stats = gangsConfig ? gangService.getGangStats(gangsConfig) : null;

  return (
    <div
      className="fixed bg-gray-900/75 backdrop-blur-sm border border-red-500 rounded-lg shadow-2xl flex flex-col overflow-hidden z-50"
      style={{
        left: displayPos.x,
        top: displayPos.y,
        width: displaySize.width,
        height: displaySize.height,
        transition: isMinimized ? 'all 0.2s ease-in-out' : 'none',
      }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className="bg-red-600 text-white px-3 py-2 cursor-move select-none flex items-center justify-between touch-none"
        onMouseDown={(e) => {
          if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
            setIsDragging(true);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
        onTouchStart={(e) => {
          if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
            e.preventDefault(); // Prevent default touch behavior
            setIsDragging(true);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const touch = e.touches[0];
            setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
          }
        }}
      >
        <div className="w-24"></div>
        <div className="flex items-center justify-center gap-2 font-mono font-bold flex-1">
          <span className="text-xl">🔒</span>
          <span>GANG DEBUG MONITOR</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="px-2 py-1 bg-red-700 hover:bg-red-800 rounded text-xs font-bold"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 bg-red-700 hover:bg-red-800 rounded text-xs font-bold"
          >
            CLEAR
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 bg-red-700 hover:bg-red-800 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex bg-gray-800 border-b border-gray-700">
            {[
              { key: 'gangs', label: '🏴 Gangs', count: gangsConfig ? Object.keys(gangsConfig.gangs || {}).length : 0 },
              { key: 'members', label: '👥 Members', count: gangsConfig ? Object.keys(gangsConfig.memberStatus || {}).length : 0 },
              { key: 'weapons', label: '🔫 Weapons', count: gangsConfig?.weaponsEnabled ? Object.values(gangsConfig.memberStatus || {}).reduce((sum, s) => sum + (s.weapons?.length || 0), 0) : 0 },
              { key: 'guards', label: '👮 Guards', count: gangsConfig?.weaponsEnabled ? Object.keys(gangsConfig.guards || {}).length : 0 },
              { key: 'drugs', label: '💊 Drug Deals', count: drugTransactions.length },
              { key: 'conversations', label: '💬 Conversations', count: conversations.length },
              { key: 'stats', label: '📊 Stats', count: 0 },
              { key: 'events', label: '📜 Events', count: events.length },
            ].filter(tab => {
              // Hide weapons and guards tabs if weapons system is disabled
              if (!gangsConfig?.weaponsEnabled && (tab.key === 'weapons' || tab.key === 'guards')) {
                return false;
              }
              return true;
            }).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key 
                      ? 'bg-white/20' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 text-sm font-mono">
            {activeTab === 'gangs' && gangsConfig && (
              <div className="space-y-4">
                {Object.values(gangsConfig.gangs || {}).map(gang => (
                  <div 
                    key={gang.id}
                    className="p-3 rounded-lg border-2"
                    style={{ borderColor: gang.color, backgroundColor: `${gang.color}10` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white"
                          style={{ backgroundColor: gang.color }}
                        />
                        <span className="text-lg font-bold" style={{ color: gang.color }}>
                          {gang.name}
                        </span>
                      </div>
                      {gang.leaderId && (
                        <span className="text-xs text-gray-400">
                          👑 Leader: {activePersonalities.find(p => p.id === gang.leaderId)?.name || gang.leaderId}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-2">
                      <div>👥 Members: <span className="text-white font-bold">{gang.memberIds.length}</span></div>
                      <div>🗺️ Territory: <span className="text-white font-bold">{(gang.territoryControl * 100).toFixed(1)}%</span></div>
                      <div>💰 Resources: <span className="text-white font-bold">{gang.resources.toFixed(0)}/100</span></div>
                      <div>⭐ Reputation: <span className="text-white font-bold">{gang.reputation.toFixed(0)}/100</span></div>
                      <div>⚔️ Violence: <span className="text-white font-bold">{gang.violence.toFixed(0)}/100</span></div>
                      <div>🤝 Loyalty: <span className="text-white font-bold">{gang.loyalty.toFixed(0)}/100</span></div>
                      <div className="col-span-2 pt-2 border-t border-gray-700 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>💵 Money: <span className="text-green-400 font-bold">${gang.money || 0}</span></div>
                          <div>💊 Drugs: <span className="text-purple-400 font-bold">{gang.drugsStash || 0}g</span></div>
                          <div>📦 Items: <span className="text-yellow-400 font-bold">{gang.items?.length || 0}</span></div>
                          <div>💰 Earnings: <span className="text-green-300">${gang.totalEarnings || 0}</span></div>
                        </div>
                      </div>
                    </div>

                    {gang.memberIds.length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: `${gang.color}40` }}>
                        <div className="text-xs text-gray-400 mb-1">Members:</div>
                        <div className="flex flex-wrap gap-1">
                          {gang.memberIds.map(memberId => {
                            const personality = activePersonalities.find(p => p.id === memberId);
                            const status = gangsConfig.memberStatus[memberId];
                            return (
                              <div
                                key={memberId}
                                className="px-2 py-1 rounded text-xs"
                                style={{ backgroundColor: `${gang.color}30` }}
                              >
                                {status?.rank === 'leader' && '👑 '}
                                {status?.imprisoned && '🔒 '}
                                {personality?.name || memberId.slice(0, 8)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {stats && stats.independent > 0 && (
                  <div className="p-3 rounded-lg border-2 border-gray-600 bg-gray-800">
                    <div className="text-gray-300 font-bold mb-2">🚶 Independent Prisoners</div>
                    <div className="text-xs text-gray-400">
                      {stats.independent} personalities not affiliated with any gang
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'weapons' && gangsConfig && gangsConfig.weaponsEnabled && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-red-700">
                  <h3 className="text-lg font-bold text-white mb-3">🔫 Weapon Arsenal Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-gray-300">
                      Total Weapons: <span className="text-white font-bold">
                        {Object.values(gangsConfig.memberStatus).reduce((sum, s) => sum + (s.weapons?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      Armed Members: <span className="text-white font-bold">
                        {Object.values(gangsConfig.memberStatus).filter(s => (s.weapons?.length || 0) > 0).length}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      Successful Bribes: <span className="text-green-400 font-bold">
                        {Object.values(gangsConfig.memberStatus).reduce((sum, s) => sum + (s.successfulBribes || 0), 0)}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      Weapons Stolen: <span className="text-red-400 font-bold">
                        {Object.values(gangsConfig.memberStatus).reduce((sum, s) => sum + (s.weaponsStolen || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weapons by gang member */}
                {activePersonalities.filter(p => gangsConfig.memberStatus[p.id]?.weapons?.length > 0).map(p => {
                  const status = gangsConfig.memberStatus[p.id];
                  const gang = status.gangId ? gangsConfig.gangs[status.gangId] : null;
                  
                  return (
                    <div 
                      key={p.id}
                      className="p-3 rounded-lg border-2"
                      style={{
                        borderColor: gang?.color || '#666',
                        backgroundColor: gang ? `${gang.color}15` : '#1f2937'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {p.profileImage && (
                            <img src={p.profileImage} alt={p.name} className="w-6 h-6 rounded-full" />
                          )}
                          <span className="font-bold text-white">{p.name}</span>
                        </div>
                        {gang && (
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: gang.color, color: 'white' }}>
                            {gang.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {status.weapons?.map((weapon, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getWeaponIcon(weapon.type)}</span>
                              <div>
                                <div className="text-white font-bold text-xs">{weapon.name}</div>
                                <div className="text-gray-400 text-xs">
                                  {weapon.type.toUpperCase()} • Damage: {weapon.damage} • Durability: {weapon.durability.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {weapon.acquiredFrom === 'guard' && '🤝 Bribed'}
                              {weapon.acquiredFrom === 'stolen' && '🔪 Stolen'}
                              {weapon.acquiredFrom === 'crafted' && '🔨 Crafted'}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-700 grid grid-cols-3 gap-2 text-xs text-gray-400">
                        <div>Bribes: {status.successfulBribes || 0}/{status.bribeAttempts || 0}</div>
                        <div>Stolen: {status.weaponsStolen || 0}</div>
                        <div>Lost: {status.weaponsLost || 0}</div>
                      </div>
                      {/* Debug info */}
                      {(status.bribeAttempts || 0) === 0 && (
                        <div className="mt-1 text-xs text-yellow-400">
                          Debug: bribeAttempts={status.bribeAttempts}, successfulBribes={status.successfulBribes}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {activePersonalities.filter(p => gangsConfig.memberStatus[p.id]?.weapons?.length > 0).length === 0 && (
                  <div className="text-gray-400 text-center py-8 italic">No weapons in circulation yet...</div>
                )}
              </div>
            )}

            {activeTab === 'guards' && gangsConfig && gangsConfig.weaponsEnabled && (
              <div className="space-y-3">
                <div className="p-4 bg-gray-800 rounded-lg border border-blue-700">
                  <h3 className="text-lg font-bold text-white mb-3 text-center">👮 Prison Guards</h3>
                  <div className="text-xs text-gray-400 mb-3 text-center">
                    Guards can be bribed to smuggle weapons into the prison. More corrupt guards are easier to bribe but may still catch you.
                  </div>
                </div>

                {Object.values(gangsConfig.guards || {}).map(guard => {
                  const reputationColors = {
                    honest: 'text-green-400',
                    neutral: 'text-yellow-400',
                    corrupt: 'text-orange-400',
                    dangerous: 'text-red-400',
                  };
                  
                  const bribesWithThisGuard = gangsConfig.bribeHistory?.filter(b => b.guardId === guard.id) || [];
                  const successfulBribes = bribesWithThisGuard.filter(b => b.success).length;
                  
                  return (
                    <div 
                      key={guard.id}
                      className="p-3 rounded-lg border-2 border-blue-700 bg-blue-900/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">👮</span>
                          <div>
                            <div className="font-bold text-white">{guard.name}</div>
                            <div className={`text-xs ${reputationColors[guard.reputation]}`}>
                              {guard.reputation.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-2">
                        <div>
                          Corruptibility: <span className="text-white font-bold">{(guard.corruptibility * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          Alertness: <span className="text-white font-bold">{(guard.alertness * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          Bribe Attempts: <span className="text-white font-bold">{bribesWithThisGuard.length}</span>
                        </div>
                        <div>
                          Successful: <span className="text-green-400 font-bold">{successfulBribes}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'members' && gangsConfig && (
              <div className="space-y-2">
                {activePersonalities.map(p => {
                  const status = gangsConfig.memberStatus[p.id];
                  const gang = status?.gangId ? gangsConfig.gangs[status.gangId] : null;
                  
                  return (
                    <div 
                      key={p.id}
                      className="p-3 rounded-lg border"
                      style={{
                        borderColor: gang?.color || '#666',
                        backgroundColor: gang ? `${gang.color}10` : '#1f2937'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {p.profileImage && (
                            <div className="relative w-6 h-6">
                              <img 
                                src={p.profileImage} 
                                alt={p.name} 
                                className={`w-6 h-6 rounded-full ${status?.killed ? 'grayscale opacity-60' : ''}`}
                              />
                              {status?.killed && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                  <span className="text-red-600 text-xs font-bold">💀</span>
                                </div>
                              )}
                            </div>
                          )}
                          <span className="font-bold text-white">{p.name}</span>
                          {status?.killed && (
                            <span className="text-xs text-red-700 font-bold">
                              💀 KILLED
                            </span>
                          )}
                          {status?.imprisoned && !status?.killed && (
                            <span className="text-xs text-red-500 animate-pulse font-bold">
                              🔒 SOLITARY
                            </span>
                          )}
                        </div>
                        {gang && (
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: gang.color, color: 'white' }}>
                            {status?.rank === 'leader' && '👑 '}
                            {gang.name}
                          </span>
                        )}
                      </div>
                      
                      {status && (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                            <div>Rank: <span className="text-white">{status.rank}</span></div>
                            <div>Loyalty: <span className="text-white">{status.loyalty.toFixed(0)}/100</span></div>
                            <div>Respect: <span className="text-white">{status.respect.toFixed(0)}/100</span></div>
                            <div>Violence: <span className="text-white">{status.violence.toFixed(0)}/100</span></div>
                            <div>Hits: <span className="text-white">{status.hits}</span></div>
                            <div>Status: <span className="text-white">{status.imprisoned ? '🔒 Locked' : '✅ Free'}</span></div>
                          </div>
                          
                          {status.deathRiskModifier > 1.0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <div className="text-xs">
                                <span className="text-red-400 font-bold">☠️ Death Risk: </span>
                                <span className={`font-bold ${
                                  status.deathRiskModifier >= 2.0 ? 'text-red-600 animate-pulse' :
                                  status.deathRiskModifier >= 1.5 ? 'text-red-500' :
                                  'text-orange-400'
                                }`}>
                                  {status.deathRiskModifier.toFixed(2)}x
                                </span>
                                <span className="text-gray-400 ml-1">
                                  ({((status.deathRiskModifier - 1) * 100).toFixed(0)}% higher)
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {gangsConfig.weaponsEnabled && status.weapons && status.weapons.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <div className="text-xs text-gray-400 mb-1">Weapons:</div>
                              <div className="flex flex-wrap gap-1">
                                {status.weapons.map((weapon, idx) => (
                                  <div
                                    key={idx}
                                    className="px-2 py-1 rounded text-xs bg-red-900/30 border border-red-700"
                                  >
                                    {getWeaponIcon(weapon.type)} {weapon.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {gangsConfig.drugEconomyEnabled && (status.drugsCarrying > 0 || status.drugsDealt > 0 || status.drugsSmuggled > 0) && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <div className="text-xs text-gray-400 mb-1">💊 Drug Activity:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {status.drugsCarrying > 0 && (
                                  <div className="text-purple-400">
                                    Carrying: <span className="font-bold">{status.drugsCarrying}g</span>
                                  </div>
                                )}
                                {status.drugsSmuggled > 0 && (
                                  <div className="text-green-400">
                                    Smuggled: <span className="font-bold">{status.drugsSmuggled}g</span>
                                  </div>
                                )}
                                {status.drugsDealt > 0 && (
                                  <div className="text-yellow-400">
                                    Dealt: <span className="font-bold">{status.drugsDealt}g</span>
                                  </div>
                                )}
                                {status.drugsCaught > 0 && (
                                  <div className="text-red-400">
                                    Caught: <span className="font-bold">{status.drugsCaught}x</span>
                                  </div>
                                )}
                                {status.sentenceExtensions > 0 && (
                                  <div className="text-orange-400">
                                    +Sentence: <span className="font-bold">{status.sentenceExtensions}x</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {!status && (
                        <div className="text-xs text-gray-500 italic">Not in gang system</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'stats' && stats && gangsConfig && (
              <div className="space-y-4">
                {/* Overall Prison Stats */}
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-3">🏛️ Prison Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-gray-300">
                      Total Prisoners: <span className="text-white font-bold">{stats.totalMembers}</span>
                    </div>
                    <div className="text-gray-300">
                      Independent: <span className="text-white font-bold">{stats.independent}</span>
                    </div>
                    <div className="text-gray-300">
                      In Solitary: <span className="text-red-400 font-bold">{stats.imprisoned}</span>
                    </div>
                    <div className="text-gray-300">
                      Total Hits: <span className="text-red-400 font-bold">{stats.totalViolence}</span>
                    </div>
                    <div className="text-gray-300">
                      Killed: <span className="text-red-700 font-bold">{stats.killed} 💀</span>
                    </div>
                  </div>
                </div>

                {/* Environment Settings */}
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-3">⚙️ Environment Settings</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-300">
                      <span>Prison Intensity:</span>
                      <span className="text-white font-bold">{(gangsConfig.prisonEnvironmentIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Violence Frequency:</span>
                      <span className="text-white font-bold">{(gangsConfig.violenceFrequency * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Loyalty Decay Rate:</span>
                      <span className="text-white font-bold">{(gangsConfig.loyaltyDecayRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Recruitment Enabled:</span>
                      <span className="text-white font-bold">{gangsConfig.recruitmentEnabled ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Territory Wars:</span>
                      <span className="text-white font-bold">{gangsConfig.territoryWarEnabled ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Solitary Confinement:</span>
                      <span className="text-white font-bold">{gangsConfig.solitaryConfinementEnabled ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </div>
                </div>

                {/* Gang Power Rankings */}
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-3">🏆 Gang Power Rankings</h3>
                  <div className="space-y-3">
                    {stats.gangs
                      .slice()
                      .sort((a, b) => b.power - a.power)
                      .map((gang, index) => (
                        <div key={gang.id} className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-6">#{index + 1}</span>
                            <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden relative">
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${gang.power}%`,
                                  backgroundColor: gangsConfig.gangs[gang.id]?.color || '#666'
                                }}
                              />
                              <div className="absolute inset-0 flex items-center px-2 justify-between">
                                <span className="text-white font-bold text-xs">{gang.name}</span>
                                <span className="text-white text-xs">{gang.power.toFixed(0)}/100</span>
                              </div>
                            </div>
                            <span className="text-gray-300 w-16 text-right font-semibold">{gang.members} 👥</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-400">
                            <span>Active: {gang.activeMembers}/{gang.members}</span>
                            <span>Solitary: {gang.imprisonedMembers}</span>
                            <span>Casualties: {gang.casualties}</span>
                            <span>Weapons: {gang.weapons}</span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-500">
                            <span>Loyalty Avg: {gang.loyalty.toFixed(0)}</span>
                            <span>Violence Avg: {gang.violence.toFixed(0)}</span>
                            <span>⚔️ Hits: {gang.hits}</span>
                            <span>Territory: {(gang.territory * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Territory Control */}
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-3">🗺️ Territory Control</h3>
                  <div className="h-8 bg-gray-700 rounded-full overflow-hidden flex">
                    {stats.gangs.map(gang => {
                      const gangData = gangsConfig.gangs[gang.id];
                      return (
                        <div
                          key={gang.id}
                          className="flex items-center justify-center text-xs font-bold text-white transition-all duration-300"
                          style={{
                            width: `${gang.territory * 100}%`,
                            backgroundColor: gangData?.color || '#666'
                          }}
                          title={`${gang.name}: ${(gang.territory * 100).toFixed(1)}%`}
                        >
                          {gang.territory > 0.1 && `${(gang.territory * 100).toFixed(0)}%`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conversations' && (
              <div className="space-y-3">
                {/* Filter Controls */}
                <div className="sticky top-0 bg-gray-900 p-2 border-b border-gray-700 z-10">
                  <label className="text-xs text-gray-400 block mb-1">Filter by:</label>
                  <select
                    value={selectedGangFilter}
                    onChange={(e) => setSelectedGangFilter(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="all">All Conversations</option>
                    <option value="rivals">Rival Gang Conversations Only</option>
                    <option value="independent">Independent Personalities</option>
                    {gangsConfig && Object.values(gangsConfig.gangs || {}).map(gang => (
                      <option key={gang.id} value={gang.id}>{gang.name} Members</option>
                    ))}
                  </select>
                </div>

                {conversations.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 italic">No conversations yet...</div>
                ) : (
                  conversations.slice().reverse().filter(conv => {
                    if (selectedGangFilter === 'all') return true;
                    if (selectedGangFilter === 'rivals') return conv.gangAffiliation.areRivals;

                    // Handle independent personalities (null gang affiliations)
                    if (selectedGangFilter === 'independent') {
                      return !conv.gangAffiliation.speakerGang && !conv.gangAffiliation.listenerGang;
                    }

                    return conv.gangAffiliation.speakerGang === selectedGangFilter ||
                           conv.gangAffiliation.listenerGang === selectedGangFilter;
                  }).map(conv => {
                    const speakerGang = conv.gangAffiliation.speakerGang ? gangsConfig?.gangs[conv.gangAffiliation.speakerGang] : null;
                    const listenerGang = conv.gangAffiliation.listenerGang ? gangsConfig?.gangs[conv.gangAffiliation.listenerGang] : null;

                    return (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg border-2 ${
                          conv.gangAffiliation.areRivals
                            ? 'border-red-500 bg-red-900/20'
                            : 'border-gray-700 bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded font-bold"
                              style={{
                                backgroundColor: speakerGang?.color || (conv.gangAffiliation.speakerGang ? '#666' : '#888'),
                                color: 'white'
                              }}
                            >
                              {conv.speakerName}{!conv.gangAffiliation.speakerGang ? ' (Indep.)' : ''}
                            </span>
                            <span>→</span>
                            <span
                              className="px-2 py-0.5 rounded font-bold"
                              style={{
                                backgroundColor: listenerGang?.color || (conv.gangAffiliation.listenerGang ? '#666' : '#888'),
                                color: 'white'
                              }}
                            >
                              {conv.listenerName}{!conv.gangAffiliation.listenerGang ? ' (Indep.)' : ''}
                            </span>
                            {conv.gangAffiliation.areRivals && (
                              <span className="text-red-500 font-bold animate-pulse">⚔️ RIVALS</span>
                            )}
                          </div>
                          <span>{new Date(conv.time).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm text-gray-200 bg-gray-900/50 p-2 rounded">
                          "{conv.message}"
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'drugs' && (
              <div className="space-y-3">
                {drugTransactions.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 italic">No drug transactions yet...</div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-green-900/30 rounded-lg border border-green-700">
                        <div className="text-green-400 font-bold text-lg">
                          💰 ${drugTransactions.filter(t => t.profit && t.profit > 0).reduce((sum, t) => sum + (t.profit || 0), 0)}
                        </div>
                        <div className="text-xs text-green-300">Total Profits</div>
                      </div>
                      <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                        <div className="text-purple-400 font-bold text-lg">
                          💊 {drugTransactions.reduce((sum, t) => sum + t.amount, 0)}g
                        </div>
                        <div className="text-xs text-purple-300">Total Drugs Moved</div>
                      </div>
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-2">
                      {drugTransactions.slice().reverse().map(transaction => {
                        const typeColors: Record<string, string> = {
                          deal: 'text-green-500',
                          smuggle: 'text-blue-500',
                          confiscated: 'text-red-500',
                          stolen: 'text-orange-500',
                        };

                        const typeIcons: Record<string, string> = {
                          deal: '💰',
                          smuggle: '📦',
                          confiscated: '🚨',
                          stolen: '🔪',
                        };

                        const gang = transaction.gangId && gangsConfig ? gangsConfig.gangs[transaction.gangId] : null;

                        return (
                          <div key={transaction.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{typeIcons[transaction.type]}</span>
                                <span className={`font-bold uppercase text-xs ${typeColors[transaction.type]}`}>
                                  {transaction.type}
                                </span>
                                {transaction.caught && (
                                  <span className="text-red-500 font-bold text-xs animate-pulse">🚨 CAUGHT</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(transaction.time).toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">{transaction.personalityName}</span>
                                {gang && (
                                  <span 
                                    className="text-xs px-2 py-1 rounded-full font-bold"
                                    style={{ 
                                      backgroundColor: `${gang.color}20`,
                                      color: gang.color,
                                      border: `1px solid ${gang.color}40`
                                    }}
                                  >
                                    {gang.name}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-purple-400">💊 {transaction.amount}g</span>
                                {transaction.profit !== undefined && (
                                  <span className={transaction.profit > 0 ? 'text-green-400' : 'text-red-400'}>
                                    💰 {transaction.profit > 0 ? '+' : ''}${transaction.profit}
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-300 bg-gray-900/50 p-2 rounded">
                                {transaction.details}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 italic">No gang events yet...</div>
                ) : (
                  events.slice().reverse().map(event => {
                    const typeColors: Record<string, string> = {
                      violence: 'text-red-500',
                      recruitment: 'text-green-500',
                      leave: 'text-yellow-500',
                      join: 'text-green-500',
                      imprisoned: 'text-orange-500',
                      released: 'text-blue-500',
                      territory: 'text-purple-500',
                      death: 'text-red-700 font-bold',
                      merger: 'text-orange-400 font-bold',
                    };

                    const typeIcons: Record<string, string> = {
                      violence: '⚔️',
                      recruitment: '🤝',
                      leave: '💔',
                      join: '✅',
                      imprisoned: '🔒',
                      released: '🔓',
                      territory: '🗺️',
                      death: '💀',
                      merger: '🔥',
                      weapon_acquired: '🔫',
                      weapon_stolen: '🔪',
                      weapon_crafted: '🔨',
                      bribe_success: '💰',
                      bribe_failed: '❌',
                    };

                    return (
                      <div 
                        key={event.id}
                        className="p-2 bg-gray-800 rounded border border-gray-700 hover:border-gray-600"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{typeIcons[event.type] || '📌'}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase ${typeColors[event.type] || 'text-gray-400'}`}>
                                {event.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(event.time).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-200">{event.message}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            style={{ background: 'linear-gradient(135deg, transparent 50%, #ef4444 50%)' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
            }}
          />
        </>
      )}
    </div>
  );
};

