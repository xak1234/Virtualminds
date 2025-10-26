import React from 'react';
import { CogIcon } from './icons/CogIcon';
import { UserIcon } from './icons/UserIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SpeakerOnIcon } from './icons/SpeakerOnIcon';
import { SpeakerOffIcon } from './icons/SpeakerOffIcon';
import { GangIcon } from './icons/GangIcon';
import { PrisonIcon } from './icons/PrisonIcon';
import { FistIcon } from './icons/FistIcon';
import { MenuIcon } from './icons/MenuIcon';
import type { GangsConfig, PovertyConfig } from '../types';

// Territory Pie Chart Component
interface TerritoryPieChartProps {
  gangsConfig?: GangsConfig;
  className?: string;
  deadCount?: number;
}

const TerritoryPieChart: React.FC<TerritoryPieChartProps> = ({ gangsConfig, className = '', deadCount = 0 }) => {
  if (!gangsConfig?.gangs) {
    return null;
  }

  const gangs = Object.values(gangsConfig.gangs);
  const totalTerritory = gangs.reduce((sum, gang) => sum + (gang.territoryControl || 0), 0);
  
  // Ensure territory is properly normalized if needed
  const normalizedGangs = totalTerritory > 0 ? gangs : gangs.map(gang => ({
    ...gang,
    territoryControl: gang.territoryControl || (1.0 / gangs.length)
  }));
  const radius = 20;
  const centerX = radius + 5;
  const centerY = radius + 5;

  let currentAngle = 0;

  return (
    <div className={`relative ${className}`} title="Gang Territory Distribution">
      <svg width={radius * 2 + 10} height={radius * 2 + 10} className="drop-shadow-sm">
        {normalizedGangs.map((gang, index) => {
          if (gang.territoryControl <= 0) return null;

          const recalculatedTotal = normalizedGangs.reduce((sum, g) => sum + g.territoryControl, 0);
          const percentage = recalculatedTotal > 0 ? (gang.territoryControl / recalculatedTotal) * 100 : 0;
          const angle = recalculatedTotal > 0 ? (gang.territoryControl / recalculatedTotal) * 360 : 0;

          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          // Convert angles to radians for SVG arc
          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startAngleRad);
          const y1 = centerY + radius * Math.sin(startAngleRad);
          const x2 = centerX + radius * Math.cos(endAngleRad);
          const y2 = centerY + radius * Math.sin(endAngleRad);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          return (
            <path
              key={gang.id}
              d={pathData}
              fill={gang.color}
              stroke="#000"
              strokeWidth="1"
              className="transition-all duration-300"
            />
          );
        })}

        {/* Center circle for aesthetics */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.3}
          fill="#1f2937"
          stroke="#374151"
          strokeWidth="1"
        />

        {/* Territory percentage in center - show dominant gang or total control */}
        <text
          x={centerX}
          y={centerY + 4}
          textAnchor="middle"
          className="text-xs font-bold fill-white"
          style={{ fontSize: '10px' }}
        >
          {(() => {
            if (normalizedGangs.length === 0) return '0%';
            
            // Find the gang with the most territory
            const dominantGang = normalizedGangs.reduce((max, gang) => 
              gang.territoryControl > max.territoryControl ? gang : max
            );
            
            // Show the dominant gang's percentage
            const dominantPercentage = Math.round(dominantGang.territoryControl * 100);
            return `${dominantPercentage}%`;
          })()}
        </text>
      </svg>

      {/* Legend - Inline next to pie chart */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs whitespace-nowrap">
        <span
          className={`font-mono font-bold flex items-center gap-1 ${deadCount > 0 ? 'text-red-400' : 'text-gray-400'}`}
          title="Total deceased gang members"
        >
          <span>💀</span>
          <span>{deadCount} dead</span>
        </span>
        {(() => {
          const activeGangs = normalizedGangs.filter(gang => gang.territoryControl > 0);
          const totalActiveTerritory = activeGangs.reduce((sum, g) => sum + g.territoryControl, 0);
          
          return activeGangs
            .sort((a, b) => b.territoryControl - a.territoryControl)
            .map((gang, idx) => {
              const percentage = totalActiveTerritory > 0 ? (gang.territoryControl / totalActiveTerritory) * 100 : 0;
            return (
              <React.Fragment key={gang.id}>
                {idx > 0 && <span className="text-gray-500">|</span>}
                <div className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-gray-600"
                    style={{ backgroundColor: gang.color }}
                  />
                  <span className="text-gray-300 font-mono font-bold">
                    {gang.name.slice(0, 6)}: {Math.round(percentage)}%
                  </span>
                </div>
              </React.Fragment>
            );
          });
        })()}
      </div>
    </div>
  );
};

interface HeaderProps {
  onSettingsClick: () => void;
  currentUser: string | null;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  globalTtsEnabled: boolean;
  onGlobalTtsToggle: () => void;
  gangsEnabled?: boolean;
  gangsConfig?: GangsConfig;
  killedInGangSession?: Set<string>;
  onGangSettingsClick?: () => void;
  onGangDebugClick?: () => void;
  onGangModeDisableAndStop?: () => void;
  povertyEnabled?: boolean;
  povertyConfig?: PovertyConfig;
  onPovertyDebugClick?: () => void;
  onPovertySettingsClick?: () => void;
  onPovertyDisable?: () => void;
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  currentUser,
  theme,
  onThemeToggle,
  globalTtsEnabled,
  onGlobalTtsToggle,
  gangsEnabled = false,
  gangsConfig,
  killedInGangSession = new Set(),
  onGangSettingsClick,
  onGangDebugClick,
  onGangModeDisableAndStop,
  povertyEnabled = false,
  povertyConfig,
  onPovertyDebugClick,
  onPovertySettingsClick,
  onPovertyDisable,
  onMobileMenuToggle
}) => {
  // Calculate total deaths from both gangsConfig and killedInGangSession
  const configDeaths = gangsConfig ? Object.values(gangsConfig.memberStatus || {}).filter(status => status?.killed).length : 0;
  const sessionDeaths = killedInGangSession.size;
  // Use the maximum to avoid double counting (some deaths might be in both)
  const deadCount = Math.max(configDeaths, sessionDeaths);

  return (
    <header className="bg-light-panel dark:bg-base-800 border-b border-light-border dark:border-base-700 p-3 flex justify-between items-center shrink-0 relative z-10">
      {/* Hamburger Menu Button - Visible only on mobile/tablet */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-primary mr-2"
          aria-label="Toggle mobile menu"
        >
          <MenuIcon className="w-6 h-6 text-white" />
        </button>
      )}
      
      <div className="lg:ml-64">
        <h1 className="font-mono text-2xl sm:text-4xl font-light text-light-text dark:text-gray-100 tracking-wide uppercase">
          VIRTUAL MINDS FRAMEWORK V24
          <span className="ml-2 text-[9px] sm:text-[10px] text-light-text-secondary dark:text-gray-400 font-mono normal-case tracking-wide">
            Exploring artificial personalities
          </span>
        </h1>
        {povertyEnabled && povertyConfig && (
          <div className="mt-1 text-sm text-yellow-400 font-mono font-bold">
            Day {(povertyConfig.currentSimulationDay || 0) + 1}
          </div>
        )}
        {gangsEnabled && (
          <div className="mt-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-500 font-mono text-lg font-bold tracking-wider animate-pulse">
                🔒 GANGS ACTIVE
              </span>
              <span className="text-xs text-red-600/70 dark:text-red-500/70 font-mono">
                Prison Environment Simulation Running
              </span>
            </div>

            {/* Territory Pie Chart */}
            <TerritoryPieChart
              gangsConfig={gangsConfig}
              className="ml-2"
              deadCount={deadCount}
            />
          </div>
        )}
        {povertyEnabled && (
          <div className="mt-1 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-500 font-mono text-lg font-bold tracking-wider animate-pulse">
                🍺 POVERTY ACTIVE
              </span>
              <span className="text-xs text-red-600/70 dark:text-red-500/70 font-mono">
                Poverty Environment Simulation Running
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-2 text-sm text-white">
            <UserIcon className="w-5 h-5 text-white"/>
            <span className="font-medium">{currentUser}</span>
          </div>
        )}
        
        {/* Gang Icons - Only visible when gangs are enabled */}
        {gangsEnabled && onGangDebugClick && (
          <button
            onClick={onGangDebugClick}
            className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-900/30 border border-red-600/50"
            aria-label="Gang Debug Window"
            title="Open Gang Debug Window"
          >
            <PrisonIcon className="w-6 h-6 text-red-400 animate-pulse" />
          </button>
        )}
        
        {gangsEnabled && onGangSettingsClick && (
          <button
            onClick={onGangSettingsClick}
            className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-900/30 border border-orange-600/50"
            aria-label="Gang Settings"
            title="Open Gang Settings"
          >
            <GangIcon className="w-6 h-6 text-orange-400" />
          </button>
        )}
        
        {gangsEnabled && onGangModeDisableAndStop && (
          <button
            onClick={() => {
              // Auto-proceed: Disable gang mode without confirmation
              onGangModeDisableAndStop();
            }}
            className="p-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-600 border-2 border-red-500 animate-pulse"
            aria-label="Disable Gang Mode & Stop"
            title="👊 Gangs Mode ON - Click to Turn OFF & Stop"
          >
            <FistIcon className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Poverty Icons - Only visible when poverty is enabled */}
        {povertyEnabled && onPovertyDebugClick && (
          <button
            onClick={onPovertyDebugClick}
            className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-900/30 border border-yellow-600/50"
            aria-label="Poverty Debug Window"
            title="Open Poverty Debug Window"
          >
            <span className="text-2xl">📊</span>
          </button>
        )}

        {povertyEnabled && onPovertySettingsClick && (
          <button
            onClick={onPovertySettingsClick}
            className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-900/30 border border-yellow-600/50"
            aria-label="Poverty Settings"
            title="Configure Poverty Simulation"
          >
            <span className="text-2xl">💸</span>
          </button>
        )}

        {povertyEnabled && onPovertyDisable && (
          <button
            onClick={onPovertyDisable}
            className="p-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-600 border-2 border-yellow-500 animate-pulse"
            aria-label="Disable Poverty Mode"
            title="💸 Poverty Mode ON - Click to Turn OFF"
          >
            <span className="text-2xl">⛔</span>
          </button>
        )}
        
        <button
          onClick={onGlobalTtsToggle}
          className={`p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-primary ${
            globalTtsEnabled ? 'bg-blue-100 dark:bg-blue-900/30' : ''
          }`}
          aria-label="Toggle global sound"
          title={globalTtsEnabled ? "Turn sound off globally" : "Turn sound on globally"}
        >
          {globalTtsEnabled ? (
            <SpeakerOnIcon className="w-6 h-6 text-white" />
          ) : (
            <SpeakerOffIcon className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="w-6 h-6 text-white" /> : <SunIcon className="w-6 h-6 text-white" />}
        </button>
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-md hover:bg-light-border dark:hover:bg-base-700 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Open settings"
        >
          <CogIcon className="w-6 h-6 text-white" />
        </button>
      </div>
    </header>
  );
};
