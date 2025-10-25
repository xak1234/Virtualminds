import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { MinimizeIcon } from './icons/MinimizeIcon';
import { RepeatIcon } from './icons/RepeatIcon';
import { formatCost, formatTokenCount } from '../services/costTrackingService';

interface ApiUsageEntry {
  id: string;
  timestamp: string;
  provider: string;
  model?: string;
  service: 'chat' | 'tts';
  inputTokens: number;
  outputTokens: number;
  cost: number;
  status: 'success' | 'error';
  details?: string;
}

interface ApiDebugWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
}

export const ApiDebugWindow: React.FC<ApiDebugWindowProps> = ({
  isOpen,
  onClose,
  onMinimize,
  isMinimized
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsageEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  
  const dragOffset = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Load API usage data from localStorage
  const loadApiUsage = () => {
    try {
      const stored = localStorage.getItem('cmf_api_usage_log');
      if (stored) {
        const data = JSON.parse(stored) as ApiUsageEntry[];
        setApiUsage(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (error) {
      console.error('Failed to load API usage data:', error);
    }
  };

  // Calculate totals
  const filteredUsage = apiUsage.filter(entry => {
    if (selectedProvider !== 'all' && entry.provider !== selectedProvider) return false;
    if (selectedService !== 'all' && entry.service !== selectedService) return false;
    return true;
  });

  const totals = filteredUsage.reduce((acc, entry) => {
    acc.requests++;
    acc.inputTokens += entry.inputTokens;
    acc.outputTokens += entry.outputTokens;
    acc.cost += entry.cost;
    if (entry.status === 'error') acc.errors++;
    return acc;
  }, { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0, errors: 0 });

  // Provider breakdown
  const providerBreakdown = apiUsage.reduce((acc, entry) => {
    if (!acc[entry.provider]) {
      acc[entry.provider] = { requests: 0, cost: 0, errors: 0 };
    }
    acc[entry.provider].requests++;
    acc[entry.provider].cost += entry.cost;
    if (entry.status === 'error') acc[entry.provider].errors++;
    return acc;
  }, {} as Record<string, { requests: number; cost: number; errors: number }>);

  // Service breakdown
  const serviceBreakdown = apiUsage.reduce((acc, entry) => {
    if (!acc[entry.service]) {
      acc[entry.service] = { requests: 0, cost: 0, errors: 0 };
    }
    acc[entry.service].requests++;
    acc[entry.service].cost += entry.cost;
    if (entry.status === 'error') acc[entry.service].errors++;
    return acc;
  }, {} as Record<string, { requests: number; cost: number; errors: number }>);

  useEffect(() => {
    loadApiUsage();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadApiUsage, 2000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const container = nodeRef.current?.parentElement as HTMLElement | null;
        const containerRect = container?.getBoundingClientRect();
        const containerLeft = containerRect ? containerRect.left : 0;
        const containerTop = containerRect ? containerRect.top : 0;

        const newXRel = e.clientX - dragOffset.current.x - containerLeft;
        const newYRel = e.clientY - dragOffset.current.y - containerTop;

        const maxX = (containerRect ? containerRect.width : window.innerWidth) - size.width;
        const maxY = (containerRect ? containerRect.height : window.innerHeight) - size.height;

        const padding = 8;
        const constrainedX = Math.max(padding, Math.min(newXRel, Math.max(padding, maxX)));
        const constrainedY = Math.max(padding, Math.min(newYRel, Math.max(padding, maxY)));

        setPosition({ x: constrainedX, y: constrainedY });
      } else if (isResizing) {
        const container = nodeRef.current?.parentElement as HTMLElement | null;
        const containerRect = container?.getBoundingClientRect();
        const containerLeft = containerRect ? containerRect.left : 0;
        const containerTop = containerRect ? containerRect.top : 0;

        const minWidth = 600;
        const minHeight = 400;
        const maxWidth = (containerRect ? containerRect.width : window.innerWidth) - position.x - 8;
        const maxHeight = (containerRect ? containerRect.height : window.innerHeight) - position.y - 8;

        const desiredWidth = e.clientX - containerLeft - position.x;
        const desiredHeight = e.clientY - containerTop - position.y;

        const newWidth = Math.max(minWidth, Math.min(desiredWidth, maxWidth));
        const newHeight = Math.max(minHeight, Math.min(desiredHeight, maxHeight));

        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
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
  }, [isDragging, isResizing, position, size]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('select') ||
        (e.target as HTMLElement).closest('input')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const clearLogs = () => {
    localStorage.removeItem('cmf_api_usage_log');
    setApiUsage([]);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(apiUsage, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-usage-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={nodeRef}
      className={`absolute bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col border-2 border-blue-500 z-50 ${
        isMinimized ? 'h-12' : ''
      }`}
      style={{
        top: position.y,
        left: position.x,
        width: `${size.width}px`,
        height: isMinimized ? '48px' : `${size.height}px`,
        transition: isDragging || isResizing ? 'none' : 'height 0.2s ease-in-out',
      }}
    >
      {/* Header */}
      <header
        className={`h-12 flex items-center justify-between px-4 rounded-t-lg cursor-grab ${
          isDragging ? 'cursor-grabbing' : ''
        } bg-gradient-to-r from-blue-600 to-purple-600 text-white`}
        onMouseDown={handleDragMouseDown}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Live monitoring active" />
          <span className="font-bold text-lg">🔍 API Debug Monitor</span>
          <span className="text-sm opacity-80">
            {totals.requests} requests • {formatCost(totals.cost)} • {totals.errors} errors
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setAutoRefresh(!autoRefresh); }}
            className={`p-2 rounded-full hover:bg-white/20 ${autoRefresh ? 'bg-green-500/30' : 'bg-gray-500/30'}`}
            title={`Auto refresh: ${autoRefresh ? 'ON' : 'OFF'}`}
          >
            <RepeatIcon className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="p-2 rounded-full hover:bg-white/20"
            title="Minimize"
          >
            <MinimizeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-full hover:bg-red-500/20"
            title="Close"
          >
            <CloseIcon className="w-4 h-4 hover:text-red-400" />
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider:</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="all">All</option>
                  {Object.keys(providerBreakdown).map(provider => (
                    <option key={provider} value={provider}>{provider.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service:</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="all">All</option>
                  <option value="chat">Chat</option>
                  <option value="tts">TTS</option>
                </select>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={loadApiUsage}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={exportLogs}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                >
                  Export
                </button>
                <button
                  onClick={clearLogs}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.requests}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatTokenCount(totals.inputTokens + totals.outputTokens)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCost(totals.cost)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.errors}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            </div>
          </div>

          {/* Provider & Service Breakdown */}
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">By Provider</h3>
              <div className="space-y-2">
                {Object.entries(providerBreakdown).map(([provider, stats]) => (
                  <div key={provider} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{provider.toUpperCase()}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-blue-600 dark:text-blue-400">{stats.requests} req</span>
                      <span className="text-green-600 dark:text-green-400">{formatCost(stats.cost)}</span>
                      {stats.errors > 0 && <span className="text-red-600 dark:text-red-400">{stats.errors} err</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">By Service</h3>
              <div className="space-y-2">
                {Object.entries(serviceBreakdown).map(([service, stats]) => (
                  <div key={service} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{service.toUpperCase()}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-blue-600 dark:text-blue-400">{stats.requests} req</span>
                      <span className="text-green-600 dark:text-green-400">{formatCost(stats.cost)}</span>
                      {stats.errors > 0 && <span className="text-red-600 dark:text-red-400">{stats.errors} err</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Request Log */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Recent Requests ({filteredUsage.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsage.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-lg font-medium mb-2">No API requests yet</div>
                  <div className="text-sm">API usage will appear here once you start making requests</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsage.map((entry) => (
                    <div key={entry.id} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      entry.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              entry.provider === 'openai' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              entry.provider === 'google' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              entry.provider === 'claude' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              entry.provider === 'elevenlabs' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              entry.provider === 'azure' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {entry.provider.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              entry.service === 'chat' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {entry.service.toUpperCase()}
                            </span>
                            {entry.model && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {entry.model}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              entry.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {entry.status === 'success' ? '✓' : '✗'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          {entry.details && entry.status === 'error' && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
                              {entry.details}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end text-xs text-gray-600 dark:text-gray-400 ml-4">
                          <div className="font-mono">{formatCost(entry.cost)}</div>
                          {entry.service === 'chat' && (
                            <div className="text-xs">
                              {formatTokenCount(entry.inputTokens)} in • {formatTokenCount(entry.outputTokens)} out
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
            onMouseDown={handleResizeMouseDown}
            title="Resize window"
          >
            <svg className="w-full h-full text-gray-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 20L20 4" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};
