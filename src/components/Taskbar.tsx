import React from 'react';
import type { WindowState, Personality } from '../types';
import { WindowStatus } from '../types';
import { UserIcon } from './icons/UserIcon';
import { CloseIcon } from './icons/CloseIcon';

interface TaskbarProps {
  windows: WindowState[];
  personalities: Personality[];
  onFocus: (windowId: string) => void;
  onClose: (windowId: string) => void;
  focusedWindowId: string | null;
  isLoadingWindowId: string | null;
}

export const Taskbar: React.FC<TaskbarProps> = ({ windows, personalities, onFocus, onClose, focusedWindowId, isLoadingWindowId }) => {
  return (
    <div className="h-12 bg-light-panel dark:bg-base-800 border-t border-light-border dark:border-base-700 flex items-center px-4 gap-2 shrink-0 relative z-10">
      {windows.map(win => {
        const personality = personalities.find(p => p.id === win.personalityId);
        if (!personality) return null;
        
        const isFocused = win.id === focusedWindowId;
        const isMinimized = win.status === WindowStatus.MINIMIZED;
        const isLoading = win.id === isLoadingWindowId;

        return (
          <div
            key={win.id}
            className={`h-9 rounded-md flex items-center gap-1 transition-all duration-200 group
              ${isFocused ? 'bg-primary/20 text-accent' : ''}
              ${isMinimized ? 'border-b-2 border-accent' : ''}
              hover:bg-black/10 dark:hover:bg-base-700`}
          >
            <button
              onClick={() => onFocus(win.id)}
              className="flex items-center gap-2 px-3 h-full flex-1 min-w-0 rounded-l-md"
              title={personality.name}
            >
              {isLoading ? (
                  <div className="flex items-center justify-center w-6 h-6">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse [animation-delay:0.1s] ml-0.5"></div>
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse [animation-delay:0.2s] ml-0.5"></div>
                  </div>
              ) : personality.profileImage ? (
                  <img src={personality.profileImage} alt={personality.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                  <UserIcon className="w-6 h-6 p-0.5" />
              )}
              <span className="text-sm font-medium hidden sm:block truncate">{personality.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(win.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 hover:bg-red-500/20 rounded-r-md mr-1 flex-shrink-0"
              title={`Close ${personality.name}`}
            >
              <CloseIcon className="w-3 h-3 text-red-500 hover:text-red-600" />
            </button>
          </div>
        );
      })}
    </div>
  );
};