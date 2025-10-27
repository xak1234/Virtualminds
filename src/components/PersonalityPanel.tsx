import React from 'react';
import type { ChangeEvent } from 'react';
import type { Personality, WindowState, GangsConfig, PovertyConfig } from '../types';
import { UserIcon } from './icons/UserIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CloseIcon } from './icons/CloseIcon';
import { UploadIcon } from './icons/UploadIcon';
import { useEffect, useRef, useState } from 'react';
import * as ttsService from '../services/ttsService';
import { SpectrumBadge } from './SpectrumBadge';

interface PersonalityPanelProps {
  personalities: Personality[];
  openWindows: WindowState[];
  onPersonalitySelect: (id: string) => void;
  onPersonalityRemove: (id: string) => void;
  onFileUpload: (file: File) => void;
  onCreateClick: () => void; // opens the Discover modal
  onLoadFromServer?: () => void; // loads personalities from server
  currentSpeakerId?: string | null;
  onSkipToNext?: () => void; // optional callback to skip to next person in conversation
  slotsCount?: number; // number of occupied personality slots
  gangsEnabled?: boolean; // whether gangs feature is enabled
  gangsConfig?: GangsConfig; // gang configuration
  povertyEnabled?: boolean; // whether poverty feature is enabled
  povertyConfig?: PovertyConfig; // poverty configuration
  dwpFlashPersonalityId?: string | null; // personality ID currently flashing DWP payment
  isMobileMenuOpen?: boolean; // whether mobile menu is open
  onMobileMenuClose?: () => void; // callback to close mobile menu
  customBgColor?: string; // custom background color
  customBorderColor?: string; // custom border color
  customFontColor?: string; // custom font color
}


export const PersonalityPanel: React.FC<PersonalityPanelProps> = ({
  personalities,
  openWindows,
  onPersonalitySelect,
  onPersonalityRemove,
  onFileUpload,
  onCreateClick,
  onLoadFromServer,
  currentSpeakerId,
  onSkipToNext,
  slotsCount = 0,
  gangsEnabled = false,
  gangsConfig,
  povertyEnabled = false,
  povertyConfig,
  dwpFlashPersonalityId = null,
  isMobileMenuOpen = false,
  onMobileMenuClose,
  customBgColor,
  customBorderColor,
  customFontColor,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const openPersonalityIds = new Set(openWindows.map(w => w.personalityId));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (f) onFileUpload(f);
      }
      e.target.value = ''; // Reset file input
    }
  };


  const handleRemoveClick = (e: React.MouseEvent, personalityId: string) => {
    e.stopPropagation(); // Prevent triggering the personality select
    onPersonalityRemove(personalityId);
  };

  // Sort personalities: group all gang members together by gang, with leaders first in each gang
  const sortedPersonalities = React.useMemo(() => {
    if (!gangsEnabled || !gangsConfig || personalities.length === 0) {
      return personalities;
    }
    
    // Optimized: Cache gang and status lookups to avoid repeated object access
    const statusCache = new Map();
    const gangCache = new Map();
    
    personalities.forEach(p => {
      const status = gangsConfig.memberStatus[p.id];
      statusCache.set(p.id, status);
      if (status?.gangId && !gangCache.has(status.gangId)) {
        gangCache.set(status.gangId, gangsConfig.gangs[status.gangId]);
      }
    });
    
    // Enhanced sorting: Strictly group gang members together
    return [...personalities].sort((a, b) => {
      const aStatus = statusCache.get(a.id);
      const bStatus = statusCache.get(b.id);
      const aGangId = aStatus?.gangId || null;
      const bGangId = bStatus?.gangId || null;
      
      // Independent members (no gang) go to the bottom
      if (!aGangId && bGangId) return 1;  // a goes after b
      if (aGangId && !bGangId) return -1; // a goes before b
      if (!aGangId && !bGangId) return 0; // both independent, maintain order
      
      // Both are in gangs - GROUP BY GANG ID FIRST
      if (aGangId !== bGangId) {
        const aGang = gangCache.get(aGangId);
        const bGang = gangCache.get(bGangId);
        
        if (!aGang && bGang) return 1;
        if (aGang && !bGang) return -1;
        if (!aGang && !bGang) return 0;
        
        // Sort gangs by territory control (highest first)
        const aTerritoryControl = aGang!.territoryControl || 0;
        const bTerritoryControl = bGang!.territoryControl || 0;
        
        // Sort by territory control descending (most territory first)
        if (bTerritoryControl !== aTerritoryControl) {
          return bTerritoryControl - aTerritoryControl;
        }
        
        // If territories are equal, sort by member count (larger gangs first)
        const memberCountDiff = (bGang!.memberIds?.length || 0) - (aGang!.memberIds?.length || 0);
        if (memberCountDiff !== 0) return memberCountDiff;
        
        // Fallback to alphabetical for consistent ordering
        return (aGang!.name || '').localeCompare(bGang!.name || '');
      }
      
      // Same gang - sort by rank hierarchy within the gang
      if (aGangId === bGangId) {
        const aRank = aStatus?.rank || '';
        const bRank = bStatus?.rank || '';
        
        // Define rank priority: leader > soldier > recruit
        const rankPriority: Record<string, number> = {
          'leader': 0,
          'soldier': 1,
          'recruit': 2,
        };
        
        const aPriority = rankPriority[aRank] ?? 99;
        const bPriority = rankPriority[bRank] ?? 99;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Same rank - sort by respect (highest first)
        const respectDiff = (bStatus?.respect || 0) - (aStatus?.respect || 0);
        if (respectDiff !== 0) return respectDiff;
        
        // Fallback: maintain original order
        return 0;
      }
      
      return 0;
    });
  }, [personalities.length, gangsEnabled, gangsConfig?.memberStatus, gangsConfig?.gangs]); // Optimized dependencies

  return (
    <>
      {/* Mobile/Tablet overlay backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileMenuClose}
        />
      )}
      
      {/* Personality Panel - Hidden on mobile/tablet by default, shown via overlay when menu is open */}
      <aside 
        className={`
          w-64 flex flex-col shrink-0 backdrop-blur-sm 
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          inset-y-0 left-0
          z-50 lg:z-10
        `}
        style={{
          backgroundColor: customBgColor || undefined,
          borderRightColor: customBorderColor || undefined,
          borderRightWidth: customBorderColor ? '1px' : undefined,
          borderRightStyle: customBorderColor ? 'solid' : undefined,
          borderTopColor: customBorderColor || undefined,
          borderTopWidth: customBorderColor ? '1px' : undefined,
          borderTopStyle: customBorderColor ? 'solid' : undefined,
        }}
      >
        <div 
          className={`absolute inset-0 ${!customBgColor ? 'bg-light-panel/95 dark:bg-base-800/95' : ''} ${!customBorderColor ? 'border-r border-t border-light-border dark:border-base-700' : ''}`}
          style={{ pointerEvents: 'none' }}
        />
      <div 
        className={`p-4 border-b relative z-10 ${!customBorderColor ? 'border-light-border dark:border-base-700' : ''}`}
        style={{
          borderBottomColor: customBorderColor || undefined,
          borderBottomWidth: customBorderColor ? '1px' : undefined,
          borderBottomStyle: customBorderColor ? 'solid' : undefined,
        }}
      >
        <h2 className="text-lg font-semibold font-mono uppercase text-center text-light-text dark:text-gray-200">Minds</h2>
        <div className="flex justify-center gap-4 mt-2 text-xs font-mono text-light-text-secondary dark:text-gray-400">
          <span>LOADED: {personalities.length}</span>
          <span>•</span>
          <span>AVAILABLE: {slotsCount}</span>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-2 relative z-20">
        {sortedPersonalities.map((p, index) => {
          const isCurrentSpeaker = currentSpeakerId === p.id;
          const isOpen = openPersonalityIds.has(p.id);
          
          // Get gang info if gangs are enabled
          const memberStatus = gangsEnabled && gangsConfig ? gangsConfig.memberStatus[p.id] : null;
          const gang = memberStatus?.gangId && gangsConfig ? gangsConfig.gangs[memberStatus.gangId] : null;
          const isGangLeader = memberStatus?.rank === 'leader' && !memberStatus?.killed;
          const isKilled = memberStatus?.killed || false;
          const hasDrugMedal = gangsEnabled && memberStatus?.drugTrophies?.includes('medal') && !isKilled;
          
          // Get poverty info if poverty is enabled
          const povertyStatus = povertyEnabled && povertyConfig ? povertyConfig.personalityStatus[p.id] : null;
          const isPipClaimant = povertyStatus && povertyStatus.pipClaimsApproved > 0;
          const isDwpFlashing = dwpFlashPersonalityId === p.id;
          
          // Check if next personality is in a different gang (to add separator)
          const nextPersonality = sortedPersonalities[index + 1];
          const nextStatus = nextPersonality ? gangsConfig?.memberStatus[nextPersonality.id] : null;
          const isDifferentGang = nextPersonality && memberStatus?.gangId && nextStatus?.gangId && 
            memberStatus.gangId !== nextStatus.gangId;
          
          // Check if this is the last gang member before independents
          const isLastGangMember = nextPersonality && memberStatus?.gangId && !nextStatus?.gangId;
          
          // Check if this is the first member of a gang (to show gang header)
          const prevPersonality = index > 0 ? sortedPersonalities[index - 1] : null;
          const prevStatus = prevPersonality ? gangsConfig?.memberStatus[prevPersonality.id] : null;
          const isFirstOfGang = gang && memberStatus?.gangId && (
            !prevPersonality || prevStatus?.gangId !== memberStatus.gangId
          );
          
          return (
          <React.Fragment key={p.id}>
          {/* Gang header for first member of each gang */}
          {gangsEnabled && isFirstOfGang && gang && (
            <div className="flex items-center gap-2 py-1 px-2 mt-1" style={{ borderLeft: `3px solid ${gang.color}` }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gang.color }}></div>
              <span className="text-[10px] font-mono font-bold uppercase" style={{ color: gang.color }}>
                {gang.name}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                ({gang.memberIds.length})
              </span>
            </div>
          )}
          {/* Header for independent members section */}
          {gangsEnabled && !gang && (!prevPersonality || prevStatus?.gangId) && (
            <div className="flex items-center gap-2 py-1 px-2 mt-1 border-l-3 border-gray-500">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-[10px] font-mono font-bold uppercase text-gray-500">
                INDEPENDENT
              </span>
            </div>
          )}
          <div
            key={p.id}
            className={`w-full text-left p-4 rounded-md flex items-center gap-4 transition-colors duration-200 group relative ${
              isKilled && !gangsEnabled
                ? 'bg-red-900/40 border border-red-600 opacity-75'
                : isCurrentSpeaker
                  ? 'bg-green-200/30 dark:bg-green-900/30 animate-pulse'
                  : isOpen
                    ? 'bg-primary/20 text-primary dark:bg-primary/20 dark:text-accent'
                    : 'hover:bg-black/5 dark:hover:bg-base-700'
            }`}
            style={{
              animationDuration: isCurrentSpeaker ? '2s' : undefined,
              borderLeft: isGangLeader && gang 
                ? `4px solid ${gang.color}` 
                : povertyEnabled && povertyStatus && (povertyStatus.survivalActivity === 'homeless' || povertyStatus.currentHousing === 'street')
                  ? '4px solid #ea580c' // Orange border for homeless
                  : povertyEnabled && povertyStatus && povertyStatus.survivalActivity === 'prostitution'
                    ? '4px solid #ec4899' // Pink border for prostitution
                    : undefined,
              boxShadow: isGangLeader && gang 
                ? `0 0 10px ${gang.color}40` 
                : povertyEnabled && povertyStatus && (povertyStatus.survivalActivity === 'homeless' || povertyStatus.currentHousing === 'street')
                  ? '0 0 10px #ea580c40' // Orange glow for homeless
                  : povertyEnabled && povertyStatus && povertyStatus.survivalActivity === 'prostitution'
                    ? '0 0 10px #ec489940' // Pink glow for prostitution
                    : undefined,
              textDecoration: isKilled && !gangsEnabled ? 'line-through' : undefined,
            }}
          >
            {hasDrugMedal && (
              <div
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-yellow-500 bg-yellow-600/90 flex items-center justify-center shadow-lg z-10"
                title="Awarded Drug Medal"
              >
                <span className="text-xs">🏅</span>
              </div>
            )}
            {/* Gang Leader Crown Badge OR Death Skull - Top Left Corner */}
            {isKilled && !gangsEnabled ? (
              <div 
                className="absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-red-600 bg-red-900 flex items-center justify-center shadow-lg z-10"
                title="KILLED"
              >
                <span className="text-xs">💀</span>
              </div>
            ) : isGangLeader && gang ? (
              <div 
                className="absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg z-10 animate-pulse"
                style={{ backgroundColor: gang.color }}
                title={`GANG LEADER of ${gang.name}`}
              >
                <span className="text-xs">👑</span>
              </div>
            ) : null}
            
            {/* Poverty Status Badges - Homeless and Prostitution */}
            {povertyEnabled && povertyStatus && (
              <>
                {povertyStatus.survivalActivity === 'homeless' || povertyStatus.currentHousing === 'street' ? (
                  <div 
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-orange-500 bg-orange-600/90 flex items-center justify-center shadow-lg z-10 animate-pulse"
                    title="HOMELESS - Living on the streets"
                  >
                    <span className="text-xs">🏚️</span>
                  </div>
                ) : povertyStatus.survivalActivity === 'prostitution' ? (
                  <div 
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-pink-500 bg-pink-600/90 flex items-center justify-center shadow-lg z-10"
                    title="SEX WORK - Engaged in prostitution for survival"
                  >
                    <span className="text-xs">💋</span>
                  </div>
                ) : null}
              </>
            )}
            
            <button
              onClick={() => {
                // Prevent interaction with killed personalities in any mode
                if (isKilled || (gangsEnabled && memberStatus?.killed)) return;
                
                // If currently speaking and we have skip functionality, skip to next
                if (isCurrentSpeaker && onSkipToNext) {
                  onSkipToNext();
                } else {
                  // Otherwise, open/focus the personality window
                  onPersonalitySelect(p.id);
                }
              }}
              className="flex items-center gap-4 flex-1 min-w-0 btn-press"
              title={
                isKilled || memberStatus?.killed
                  ? "KILLED - Cannot converse or interact"
                  : memberStatus?.imprisoned 
                    ? `IN SOLITARY CONFINEMENT - ${p.name} cannot interact until released`
                    : (isCurrentSpeaker ? "Click to skip to next person" : `Open ${p.name}`)
              }
              disabled={isKilled || (gangsEnabled && (memberStatus?.imprisoned || memberStatus?.killed))}
            >
              <div className="relative w-8 h-8 flex-shrink-0">
                {p.profileImage ? (
                  <img 
                    src={p.profileImage} 
                    alt={p.name} 
                    className={`w-8 h-8 rounded-full object-cover ${
                      isKilled && !gangsEnabled 
                        ? 'grayscale opacity-60' 
                        : memberStatus?.imprisoned 
                          ? 'grayscale opacity-70' 
                          : ''
                    }`}
                  />
                ) : (
                  <UserIcon className={`w-8 h-8 p-1 ${
                    isKilled && !gangsEnabled 
                      ? 'text-red-600 dark:text-red-500' 
                      : memberStatus?.imprisoned 
                        ? 'text-gray-500 dark:text-gray-400' 
                        : ''
                  }`} />
                )}
                
                {/* Death Overlay - Large skull over the image */}
                {isKilled && !gangsEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <span className="text-red-600 text-lg font-bold drop-shadow-lg">💀</span>
                  </div>
                )}
                
                {/* Jail Bars Overlay - When imprisoned/in solitary confinement */}
                {gangsEnabled && memberStatus?.imprisoned && !memberStatus.killed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Jail bars pattern */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-80"
                           style={{
                             backgroundImage: `repeating-linear-gradient(
                               90deg,
                               transparent 0px,
                               transparent 2px,
                               #374151 2px,
                               #374151 4px,
                               transparent 4px,
                               transparent 6px
                             )`
                           }}>
                      </div>
                    </div>
                    {/* Lock icon in center */}
                    <div className="relative z-10 bg-red-900/80 rounded-full w-5 h-5 flex items-center justify-center border border-red-600">
                      <span className="text-red-300 text-xs font-bold">🔒</span>
                    </div>
                  </div>
                )}
                
                <SpectrumBadge size={32} targetId={p.id} />
                
                {/* Gang Badge */}
                {gang && memberStatus && (
                  <div
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold shadow-md"
                    style={{ backgroundColor: memberStatus.killed ? '#7f1d1d' : gang.color }}
                    title={`${gang.name} - ${memberStatus.rank}${memberStatus.imprisoned ? ' [SOLITARY]' : ''}${memberStatus.killed ? ' [KILLED]' : ''}`}
                  >
                    {memberStatus.killed ? '💀' : memberStatus.imprisoned ? '🔒' : memberStatus.rank === 'leader' ? '👑' : '⭐'}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span 
                    className={`truncate font-medium border border-light-border dark:border-base-600 rounded px-2 py-1 border-b-2 ${
                      isKilled 
                        ? (gangsEnabled ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-500 line-through') 
                        : memberStatus?.imprisoned 
                          ? 'text-orange-500 dark:text-orange-400' 
                          : 'text-green-600 dark:text-green-400'
                    }`}
                    style={{ fontSize: povertyEnabled ? '0.65rem' : '0.8rem' }}
                  >
                    {p.name}
                    {isKilled && (gangsEnabled ? ' [UNLOADED]' : ' [DECEASED]')}
                    {memberStatus?.imprisoned && !isKilled && ' [SOLITARY]'}
                  </span>
                  {isGangLeader && !isKilled && (
                    <span className="text-yellow-500 text-sm animate-pulse" title="Gang Leader">
                      👑
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {povertyEnabled && (
                      <>
                        {povertyStatus && isPipClaimant && (
                          <span className="text-blue-500 text-xs font-bold bg-blue-900/30 px-1.5 py-0.5 rounded" title="Claiming PIP">
                            P
                          </span>
                        )}
                        <span className={`text-red-400 text-sm font-bold ${isDwpFlashing ? 'animate-pulse' : ''}`} title="Cash on hand">
                          £{povertyStatus ? povertyStatus.cash_on_hand.toFixed(0) : '0'}
                        </span>
                        {isDwpFlashing && (
                          <span className="text-yellow-400 text-xs font-bold animate-pulse" title="DWP Payment Received!">
                            💰 DWP
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {gang && memberStatus && (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span 
                        className={`truncate ${isGangLeader ? 'font-bold' : 'font-semibold'}`}
                        style={{ color: memberStatus.killed ? '#7f1d1d' : gang.color }}
                      >
                        {memberStatus.killed ? '💀 ' : isGangLeader ? '👑 ' : ''}{gang.name} {isGangLeader && !memberStatus.killed && '(LEADER)'}
                      </span>
                      {memberStatus.killed && (
                        <span className="text-red-700 dark:text-red-600 font-bold">
                          [KILLED 💀]
                        </span>
                      )}
                      {memberStatus.imprisoned && !memberStatus.killed && (
                        <span className="text-red-500 dark:text-red-400 font-bold animate-pulse">
                          [SOLITARY]
                          {gang && gang.money >= 250 && (
                            <span className="text-green-400 ml-1" title="Gang has enough money ($250) to bribe for release">
                              💰
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {isGangLeader && !isKilled && (
                      <div className="text-[9px] font-mono space-y-0.5" style={{ color: gang.color }}>
                        <div>
                          👥 {gang.memberIds.length} member{gang.memberIds.length !== 1 ? 's' : ''} • 🗺️ {(gang.territoryControl * 100).toFixed(0)}% territory
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-bold">💰 ${gang.money || 0}</span>
                          {gang.drugsStash > 0 && (
                            <span className="text-purple-400">💊 {gang.drugsStash}g</span>
                          )}
                          {gang.items && gang.items.length > 0 && (
                            <span className="text-yellow-400">📦 {gang.items.length}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
            <button
              onClick={(e) => handleRemoveClick(e, p.id)}
              className={`${isKilled ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 p-1 hover:bg-red-500/20 rounded-md flex-shrink-0 btn-press`}
              title={isKilled ? 'Being removed...' : `Remove ${p.name}`}
              disabled={isKilled}
            >
              <CloseIcon className={`w-4 h-4 ${isKilled ? 'text-red-900' : 'text-red-500 hover:text-red-600'}`} />
            </button>
          </div>
          {/* Small separator between different gangs */}
          {gangsEnabled && isDifferentGang && (
            <div className="py-1"></div>
          )}
          {/* Separator before independent members */}
          {gangsEnabled && isLastGangMember && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-500/50 to-transparent"></div>
              <span className="text-[10px] text-gray-500/70 font-mono font-bold">INDEPENDENTS ↓</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-500/50 to-transparent"></div>
            </div>
          )}
          </React.Fragment>
          );
        })}
      </div>
      <div className="p-4 border-t border-light-border dark:border-base-700 space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".zip"
          multiple
          className="hidden"
        />
        
        {/* Mobile/Tablet Only Buttons - Hidden on Desktop (lg and above) */}
        <div className="lg:hidden space-y-2">
          {/* Load from Server Button (primary) */}
          {onLoadFromServer && (
            <button
              onClick={onLoadFromServer}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 dark:from-green-600 dark:to-green-700 hover:from-green-700 hover:to-green-600 dark:hover:from-green-700 dark:hover:to-green-800 text-white font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors duration-200 shadow-md hover:shadow-lg text-sm"
              title="Load personalities from server"
            >
              <UploadIcon className="w-4 h-4" />
              <span>Load from Server</span>
            </button>
          )}
          
          {/* Upload ZIP Button (secondary) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-500 dark:from-gray-600 dark:to-gray-700 hover:from-gray-700 hover:to-gray-600 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors duration-200 shadow-md hover:shadow-lg text-sm"
            title="Upload personality ZIP files from device"
          >
            <UploadIcon className="w-4 h-4" />
            <span>Upload from Device</span>
          </button>
        </div>
        
        {/* Discover Button */}
          <button
          onClick={onCreateClick}
          className="w-full bg-gradient-to-r from-primary to-primary/80 dark:from-accent dark:to-accent/80 hover:from-primary/90 hover:to-primary/70 dark:hover:from-accent/90 dark:hover:to-accent/70 text-white dark:text-base-900 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors duration-200 shadow-md hover:shadow-lg text-sm relative z-50 btn-press"
          title="Discover and create new personalities"
          style={{ pointerEvents: 'auto' }}
        >
          <PlusIcon className="w-4 h-4" />
          <span>Discover</span>
        </button>
        
        <div className="mt-2 text-xs font-mono text-center text-white select-none">franks-apps.com</div>
      </div>
    </aside>
    </>
  );
};
