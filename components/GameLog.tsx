import React, { useRef, useEffect } from 'react';
import type { LogEntry } from '../types';
import { playSystemMessageSound, playTutorialStepSound } from '../services/soundService';

interface GameLogProps {
  log: LogEntry[];
}

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Check if a new message was added since the last render
    if (log.length > prevLogLengthRef.current) {
      const lastMessage = log[log.length - 1];
      // Only play sound for new system messages
      if (lastMessage && lastMessage.sender === 'system') {
        // A bit of a hack to distinguish tutorial steps, but effective
        if (lastMessage.text.includes(":: TUTORIAL_")) {
          playTutorialStepSound();
        } else {
          playSystemMessageSound();
        }
      }
    }

    // Update the ref for the next render
    prevLogLengthRef.current = log.length;

  }, [log]);

  return (
    <div className="w-full max-w-4xl mx-auto flex-grow overflow-y-auto pr-2">
      <div className="space-y-4">
        {log.map((entry) => (
          <div key={entry.id} className={`flex flex-col animate-log-entry ${entry.sender === 'player' ? 'items-end' : 'items-start'}`}>
            <p
              className={`max-w-prose text-sm leading-relaxed p-3 rounded-lg whitespace-pre-wrap ${
                entry.sender === 'player'
                  ? 'bg-blue-900/40 text-blue-200'
                  : 'bg-black/40 text-green-300'
              }`}
            >
              {entry.text}
            </p>
          </div>
        ))}
      </div>
      <div ref={logEndRef} />
    </div>
  );
};

export default GameLog;