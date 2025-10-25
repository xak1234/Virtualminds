import React, { useEffect, useRef, useState } from 'react';
import type { PovertyConfig, Personality } from '../types';
import { povertyService } from '../services/povertyService';

export type PovertyEventType = {
  id: string;
  time: string;
  type: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
};

interface PovertyDebugWindowProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  events: PovertyEventType[];
  povertyConfig?: PovertyConfig;
  activePersonalities?: Personality[];
  conversations?: any[];
  dwpPayments?: any[];
  pubVisits?: any[];
  pipPayments?: any[];
}

export const PovertyDebugWindow: React.FC<PovertyDebugWindowProps> = ({
  open,
  onClose,
  onClear,
  events,
  povertyConfig,
  activePersonalities = [],
  conversations = [],
  dwpPayments = [],
  pubVisits = [],
  pipPayments = [],
}) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'personalities' | 'conversations' | 'dwp' | 'pubvisits' | 'pip' | 'events'>('personalities');
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const previousEventCountRef = useRef(0);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 animate-pulse font-bold';
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  useEffect(() => {
    if (events.length > previousEventCountRef.current) {
      setIsMinimized(false);
      setActiveTab('events');
      requestAnimationFrame(() => {
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
    previousEventCountRef.current = events.length;
  }, [events.length]);

  const STORAGE_KEY = 'povertyDebugWindowState';

  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pos && parsed.size) {
          const validX = Math.max(8, Math.min(parsed.pos.x, window.innerWidth - parsed.size.width - 8));
          const validY = Math.max(8, Math.min(parsed.pos.y, window.innerHeight - parsed.size.height - 8));
          return { pos: { x: validX, y: validY }, size: parsed.size };
        }
      }
    } catch (e) {
      console.warn('[POVERTY DEBUG] Failed to load saved window state:', e);
    }

    const initialWidth = Math.min(900, Math.floor(window.innerWidth * 0.55));
    const initialHeight = Math.min(600, Math.floor(window.innerHeight * 0.7));
    return {
      pos: { x: Math.max(8, window.innerWidth - initialWidth - 24), y: Math.max(8, window.innerHeight - initialHeight - 24) },
      size: { width: initialWidth, height: initialHeight },
    };
  };

  const initialState = getInitialState();
  const [pos, setPos] = useState(initialState.pos);
  const [size, setSize] = useState(initialState.size);

  const getMinimizedPosition = () => ({
    x: Math.max(8, Math.min(pos.x, window.innerWidth - size.width - 8)),
    y: window.innerHeight - 48 - 8,
  });

  const getMinimizedSize = () => ({
    width: Math.min(size.width, window.innerWidth - 16),
    height: 48,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pos, size }));
    } catch (e) {
      console.warn('[POVERTY DEBUG] Failed to save window state:', e);
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
      document.body.style.touchAction = '';
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
      document.addEventListener('touchcancel', onUp);
      document.body.style.userSelect = 'none';
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
  const stats = povertyConfig ? povertyService.getPovertyStats(povertyConfig) : null;

  return (
    <div
      className="fixed bg-gray-900/75 backdrop-blur-sm border border-red-600 rounded-lg shadow-2xl flex flex-col overflow-hidden z-50"
      style={{
        left: displayPos.x,
        top: displayPos.y,
        width: displaySize.width,
        height: displaySize.height,
        transition: isMinimized ? 'all 0.2s ease-in-out' : 'none',
      }}
    >
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
            e.preventDefault();
            setIsDragging(true);
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const touch = e.touches[0];
            setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
          }
        }}
      >
        <div className="w-24"></div>
        <div className="flex items-center justify-center gap-2 font-mono font-bold flex-1">
          <span className="text-xl">💰</span>
          <span>POVERTY MONITOR</span>
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
          <div className="flex bg-gray-800 border-b border-gray-700">
            {[
              { key: 'personalities', label: '👥 Personalities', count: povertyConfig ? Object.keys(povertyConfig.personalityStatus).length : 0 },
              { key: 'conversations', label: '💬 Conversations', count: conversations.length },
              { key: 'dwp', label: '🏛️ DWP Payments', count: dwpPayments.length },
              { key: 'pubvisits', label: '🍺 Pub Visits', count: pubVisits.length },
              { key: 'pip', label: '🏥 PIP Payments', count: pipPayments.length },
              { key: 'events', label: '📜 Events', count: events.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-sm font-semibold transition-colors relative`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 text-sm font-mono">
            {activeTab === 'conversations' && (
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-gray-400 italic">No conversations tracked yet</div>
                ) : (
                  conversations.map((conv, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-900 border border-yellow-700/30">
                      <div className="text-xs text-gray-400">{conv.time || new Date().toLocaleTimeString()}</div>
                      <div className="text-sm text-gray-200">{conv.message || conv}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'dwp' && (
              <div className="space-y-2">
                {dwpPayments.length === 0 ? (
                  <div className="text-gray-400 italic">No DWP payments recorded</div>
                ) : (
                  dwpPayments.map((payment, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-900 border border-green-700/30">
                      <div className="text-xs text-gray-400">{payment.time || new Date().toLocaleTimeString()}</div>
                      <div className="text-sm text-green-400">💷 £{payment.amount || 0} - {payment.status || 'Approved'}</div>
                      {payment.personality && <div className="text-xs text-gray-400">{payment.personality}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'pubvisits' && (
              <div className="space-y-2">
                {pubVisits.length === 0 ? (
                  <div className="text-gray-400 italic">No pub visits recorded</div>
                ) : (
                  pubVisits.map((visit, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-900 border border-orange-700/30">
                      <div className="text-xs text-gray-400">{visit.time || new Date().toLocaleTimeString()}</div>
                      <div className="text-sm text-orange-400">🍺 {visit.personality || 'Unknown'}</div>
                      {visit.activity && <div className="text-xs text-gray-400">{visit.activity}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'pip' && (
              <div className="space-y-2">
                {pipPayments.length === 0 ? (
                  <div className="text-gray-400 italic">No PIP payments recorded</div>
                ) : (
                  pipPayments.map((payment, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-900 border border-blue-700/30">
                      <div className="text-xs text-gray-400">{payment.time || new Date().toLocaleTimeString()}</div>
                      <div className="text-sm text-blue-400">🏥 £{payment.amount || 0} - {payment.status || 'Approved'}</div>
                      {payment.personality && <div className="text-xs text-gray-400">{payment.personality}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'personalities' && povertyConfig && (
              <div className="space-y-3">
                {Object.values(povertyConfig.personalityStatus).map((status) => {
                  const personality = activePersonalities.find(p => p.id === status.personalityId);
                  return (
                    <div key={status.personalityId} className={`p-3 rounded-lg border ${status.struckOffBenefits ? 'border-red-700 bg-red-900/20' : 'border-yellow-700 bg-gray-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {personality?.profileImage && <img src={personality.profileImage} alt={personality.name} className="w-6 h-6 rounded-full" />}
                          <span className="font-bold text-white">{personality?.name || status.personalityId}</span>
                          {status.ejectedFromSimulation && (
                            <span className={`text-xs px-2 py-1 rounded text-white font-bold ${status.ejectionReason === 'homeless' ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}>
                              {status.ejectionReason === 'homeless' ? '💀 EJECTED (HOMELESS)' : '✅ EJECTED (SUCCESS)'}
                            </span>
                          )}
                          {status.struckOffBenefits && !status.ejectedFromSimulation && (
                            <span className="text-xs px-2 py-1 rounded bg-red-600 text-white font-bold animate-pulse">
                              ⚰️ HOMELESS
                            </span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-700">
                          🏠 {status.currentHousing}
                        </span>
                      </div>
                      
                      {/* 12 Core Daily Variables + Danger */}
                      <div className="mb-2 p-2 bg-gray-900/50 rounded border border-gray-700">
                        <div className="text-xs font-bold text-yellow-400 mb-1">📊 TODAY'S STATUS</div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
                          <div>💷 Cash: <span className="text-green-400">£{status.cash_on_hand.toFixed(2)}</span></div>
                          <div>📈 Income: <span className="text-green-400">£{status.income_today.toFixed(2)}</span></div>
                          <div>📉 Expenses: <span className="text-red-400">£{status.expenses_today.toFixed(2)}</span></div>
                          <div>💼 Job: <span className="text-white uppercase">{status.job_status}</span></div>
                          <div>❤️ Health: <span className="text-white">{status.health.toFixed(0)}/100</span></div>
                          <div>💊 Addiction: <span className="text-orange-400">{status.addiction_level.toFixed(0)}/100</span></div>
                          <div>🌿 Cannabis: <span className="text-white">{status.cannabis_consumption.toFixed(1)}g</span></div>
                          <div>🍺 Alcohol: <span className="text-white">{status.alcohol_units.toFixed(1)} units</span></div>
                          <div>🏛️ Welfare: <span className="text-green-400">£{status.welfare_income_today.toFixed(2)}</span></div>
                          <div>⚠️ Incident: <span className={`uppercase ${status.incident_today === 'arrest' ? 'text-red-500' : status.incident_today === 'assault' ? 'text-orange-500' : status.incident_today === 'harassment' ? 'text-yellow-500' : 'text-gray-500'}`}>{status.incident_today}</span></div>
                          <div>🚨 Danger: <span className={`font-bold ${status.danger_level > 70 ? 'text-red-500' : status.danger_level > 40 ? 'text-orange-500' : 'text-yellow-500'}`}>{status.danger_level.toFixed(0)}/100</span></div>
                          <div>📊 Score: <span className={status.daily_score >= 0 ? 'text-green-400' : 'text-red-400'}>{status.daily_score >= 0 ? '+' : ''}{status.daily_score}</span></div>
                          <div className="col-span-2">📅 Unemployed: <span className="text-white">{status.days_unemployed} days</span></div>
                        </div>
                      </div>
                      
                      {/* Additional Stats */}
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                        <div>Stress: <span className="text-white">{status.stressLevel.toFixed(0)}/100</span></div>
                        <div>Mental: <span className="text-white">{status.psychologicalStability.toFixed(0)}/100</span></div>
                        <div>DWP: <span className="text-green-400">{status.dwpClaimsApproved}</span>/<span className="text-red-400">{status.dwpClaimsDenied}</span></div>
                        <div>Fraud: <span className="text-red-400">{status.falseClaims}/3</span></div>
                        <div>Assaults: <span className="text-red-400">{status.assaultIncidents}</span></div>
                        <div>Harassment: <span className="text-orange-400">{status.harassmentIncidents}</span></div>
                      </div>
                      
                      {status.ejectedFromSimulation && (
                        <div className="mt-2 p-2 bg-yellow-900/30 rounded border border-yellow-700">
                          <div className="text-xs text-yellow-400 font-bold">
                            {status.ejectionReason === 'homeless' ? '💀 EJECTED FROM SIMULATION (HOMELESS)' : '✅ EJECTED FROM SIMULATION (SUCCESS)'}
                          </div>
                          <div className="text-xs text-gray-300">Ejected on day {status.ejectionDay}</div>
                        </div>
                      )}
                      {status.struckOffBenefits && !status.ejectedFromSimulation && (
                        <div className="mt-2 p-2 bg-red-900/30 rounded border border-red-700">
                          <div className="text-xs text-red-400 font-bold">🚨 STRUCK OFF:</div>
                          <div className="text-xs text-gray-300">{status.struckOffReason}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 italic">No poverty events yet...</div>
                ) : (
                  events.slice().reverse().map(event => (
                    <div key={event.id} className="p-2 bg-gray-800 rounded border border-gray-700 hover:border-gray-600">
                      <div className="flex items-start gap-2">
                        <span className="ext-xs font-bold uppercase">
                          {event.type}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(event.time).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm text-gray-200 mt-1">{event.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            style={{ background: 'linear-gradient(135deg, transparent 50%, #eab308 50%)' }}
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
