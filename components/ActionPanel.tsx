import React, { useState, useEffect } from 'react';
import { playPlayerActionSound } from '../services/soundService';

interface ActionPanelProps {
  onAction: (action: string) => void;
  isLoading: boolean;
  inEncounter: boolean;
  isCriticalError?: boolean;
  tutorialPlaceholder?: string;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ onAction, isLoading, inEncounter, isCriticalError, tutorialPlaceholder }) => {
  const [input, setInput] = useState('');
  
  // When a new tutorial step provides a placeholder, clear the input
  useEffect(() => {
    if (tutorialPlaceholder) {
      setInput('');
    }
  }, [tutorialPlaceholder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    playPlayerActionSound();
    onAction(input);
    setInput('');
  };

  const handleCombatAction = (action: string) => {
    playPlayerActionSound();
    onAction(action);
  };
  
  const getPlaceholderText = () => {
    if (tutorialPlaceholder) return tutorialPlaceholder;
    if (isCriticalError) return '!! KERNEL PANIC !!';
    if (isLoading) return 'Awaiting server response...';
    return 'Type your command...';
  };

  if (inEncounter) {
    const combatActions = ["ATTACK", "DEBUG", "FLEE"];
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-20 p-2 sm:p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 md:gap-4 p-2 bg-black/60 border border-red-500/50 rounded-md backdrop-blur-sm animate-pulse">
            {combatActions.map(action => (
              <button
                key={action}
                onClick={() => handleCombatAction(action)}
                disabled={isLoading}
                className="w-28 px-4 py-2 bg-red-500 text-black font-bold rounded-sm hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-black disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-5 h-5 mx-auto border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  action
                )}
              </button>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 p-2 sm:p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 md:gap-4 p-2 bg-black/60 border border-cyan-400/50 rounded-md backdrop-blur-sm">
          <span className="text-cyan-400 pl-2 hidden sm:inline">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholderText()}
            disabled={isLoading || isCriticalError}
            className="flex-grow bg-transparent focus:outline-none text-white placeholder-gray-500"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isCriticalError}
            className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-sm hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-black disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'EXECUTE'
            )}
          </button>
        </form>
      </div>
    </footer>
  );
};

export default ActionPanel;