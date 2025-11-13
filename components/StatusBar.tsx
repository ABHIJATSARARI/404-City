
import React, { useState, useEffect, useRef } from 'react';
import { playUIInteractionSound } from '../services/soundService';

interface StatusBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ label, value, maxValue = 100, color }) => {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Pulse on any value change, not just on initial render
    if (prevValueRef.current !== value) {
      playUIInteractionSound();
      setIsPulsing(true);
      // FIX: Use window.setTimeout and window.clearTimeout to avoid ambiguity with Node.js types.
      const timer = window.setTimeout(() => {
        setIsPulsing(false);
      }, 500); // Must match animation duration
      
      return () => window.clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  const isLowHealth = label === 'HEALTH' && value < 30;

  const getPulseClass = () => {
    if (!isPulsing) return '';
    switch (label) {
      case 'HEALTH':
        return 'animate-pulse-health';
      case 'ARMOR':
        return 'animate-pulse-armor';
      case 'GLITCH':
        return 'animate-pulse-glitch';
      default:
        return '';
    }
  };

  return (
    <div className={`w-full bg-black/50 p-1.5 border border-gray-700/50 rounded-sm backdrop-blur-sm transition-shadow duration-300 ${getPulseClass()} ${isLowHealth ? 'animate-flash-danger' : ''}`}>
      <div className="flex justify-between items-center mb-1 px-1">
        <span className="text-xs font-bold tracking-widest text-gray-300">{label}</span>
        <span className="text-xs font-semibold text-white">{value}%</span>
      </div>
      <div className="w-full bg-gray-800/70 h-2.5 rounded-sm overflow-hidden border border-black/50">
        <div
          className={`h-full transition-all duration-300 ease-in-out ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StatusBar;
