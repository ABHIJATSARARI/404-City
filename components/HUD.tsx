import React from 'react';
import StatusBar from './StatusBar';
import type { PlayerStats, Enemy, StalkingEnemy } from '../types';

interface HUDProps {
  stats: PlayerStats;
  mission: string;
  secondaryMission?: string;
  currentEnemy: Enemy | null;
  stalkingEnemy: StalkingEnemy | null;
  isCriticalError?: boolean;
}

const HostileEntityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 18a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
        <path d="M12 12v1" />
        <path d="M12 8h.01" />
        <path d="m15.5 13.25-2.5-1.5-2.5 1.5" />
    </svg>
);


const TargetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const SubTaskIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 10 20 15 15 20"></polyline>
    <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
  </svg>
);


const HUD: React.FC<HUDProps> = ({ stats, mission, secondaryMission, currentEnemy, stalkingEnemy, isCriticalError }) => {
  const getStalkerStatusText = (distance: number): string => {
    if (distance >= 4) return "Distant Signal";
    if (distance === 3) return "Approaching Anomaly";
    if (distance === 2) return "Dangerously Close";
    if (distance === 1) return "Threat Imminent";
    return "Contact Unknown";
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-20 p-2 sm:p-4 md:p-6 flex flex-col md:flex-row justify-between items-start gap-4 pointer-events-none ${isCriticalError ? 'animate-hud-critical-flash' : ''}`}>
      <div className="w-full md:w-1/3 space-y-2">
        <StatusBar label="HEALTH" value={stats.health} color="bg-green-500" />
        <StatusBar label="ARMOR" value={stats.armor} color="bg-blue-500" />
        <StatusBar label="GLITCH" value={stats.glitchLevel} color="bg-fuchsia-500" />
      </div>

      <div className="w-full md:w-1/3 flex flex-col items-start md:items-end gap-2">
        {currentEnemy && (
          <div className="p-3 w-full max-w-sm bg-red-900/40 border-2 border-red-500/70 rounded-sm backdrop-blur-sm animate-alert-glow">
            <div className="flex items-center gap-2">
              <HostileEntityIcon className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h3 className="text-red-400 font-bold text-sm tracking-widest glitch-text uppercase">!!! Anomaly Detected !!!</h3>
                <p className="text-lg mt-1 text-red-200 font-semibold">{currentEnemy.name}</p>
              </div>
            </div>
            <p className="text-sm mt-2 text-red-300">{currentEnemy.description}</p>
          </div>
        )}

        {stalkingEnemy && !currentEnemy && (
          <div className="p-3 w-full max-w-sm bg-yellow-900/30 border-2 border-yellow-500/60 rounded-sm backdrop-blur-sm animate-proximity-glow">
            <div className="flex items-center gap-2">
               <HostileEntityIcon className="w-6 h-6 text-yellow-400 shrink-0" />
              <div>
                <h3 className="text-yellow-400 font-bold text-sm tracking-widest glitch-text-subtle uppercase">:: Proximity Alert ::</h3>
                <p className="text-lg mt-1 text-yellow-200 font-semibold">{stalkingEnemy.enemy.name}</p>
              </div>
            </div>
            <p className="text-sm mt-2 text-yellow-300">Status: {getStalkerStatusText(stalkingEnemy.distance)}</p>
          </div>
        )}

        <div className="p-3 bg-black/50 border border-yellow-400/50 rounded-sm max-w-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <TargetIcon className="w-4 h-4 text-yellow-400 shrink-0" />
            <h2 className="text-yellow-400 font-bold text-sm tracking-widest glitch-text">CURRENT OBJECTIVE</h2>
          </div>
          <p className="text-sm mt-1 text-gray-300 glitch-text-subtle">{mission}</p>
        </div>
        
        {secondaryMission && (
          <div className="p-2 bg-black/50 border border-purple-500/50 rounded-sm max-w-xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
               <SubTaskIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <h3 className="text-purple-400 font-bold text-xs tracking-widest glitch-text-color">SECONDARY DIRECTIVE</h3>
            </div>
            <div className="glitch-text-secondary">
              <p className="text-xs mt-1 text-gray-400">{secondaryMission}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default HUD;