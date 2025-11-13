// A service to generate and play sounds using the Web Audio API.

let audioContext: AudioContext | null = null;
let isInitialized = false;

// --- Ambient Sound State ---
type AmbienceState = 'none' | 'normal' | 'combat' | 'critical';
let currentAmbienceState: AmbienceState = 'none';
let activeAmbientNodes: { [key: string]: AudioNode | number } = {};

/**
 * Initializes the AudioContext. It's best practice to create this
 * on a user interaction, but we'll create it on the first sound play.
 */
const initializeAudio = () => {
  if (isInitialized) return;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    isInitialized = true;
  } catch (e) {
    console.error("Web Audio API is not supported in this browser.");
  }
};

/**
 * Browsers may suspend the AudioContext until a user interacts with the page.
 * This function resumes it if it's suspended.
 */
const resumeAudioContext = () => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

/**
 * A generic function to play a synthesized sound.
 * @param type - The oscillator type (e.g., 'sine', 'square').
 * @param frequency - The pitch of the sound in Hz.
 * @param duration - The duration of the sound in seconds.
 * @param volume - The volume (gain) from 0 to 1.
 * @param glitch - Whether to add a slight frequency modulation for a glitch effect.
 */
const playSound = (
  type: OscillatorType,
  frequency: number,
  duration: number,
  volume: number,
  glitch: boolean = false
) => {
  initializeAudio();
  if (!audioContext) return;

  resumeAudioContext();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  if (glitch) {
    oscillator.frequency.setValueAtTime(frequency + Math.random() * 50 - 25, audioContext.currentTime + 0.05);
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + 0.1);
  }

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// --- Sound Effects ---

export const playPlayerActionSound = () => {
  playSound('square', 800, 0.1, 0.1);
  playSound('square', 1200, 0.1, 0.1);
};

export const playSystemMessageSound = () => {
  playSound('triangle', 200, 0.2, 0.05, true);
};

export const playTutorialStepSound = () => {
  playSound('sine', 1000, 0.1, 0.1);
  window.setTimeout(() => playSound('sine', 1300, 0.1, 0.1), 80);
};

export const playUIInteractionSound = () => {
  playSound('sine', 1500, 0.1, 0.03);
};

export const playMissionUpdateSound = () => {
  playSound('sawtooth', 600, 0.15, 0.15);
  // FIX: Use window.setTimeout to avoid ambiguity with Node.js types.
  window.setTimeout(() => playSound('sawtooth', 800, 0.15, 0.15), 100);
};

export const playCriticalErrorSound = () => {
  if (!audioContext) initializeAudio();
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const buzz = audioContext.createOscillator();
  buzz.type = 'sawtooth';
  buzz.frequency.setValueAtTime(80, now);
  const alarm = audioContext.createOscillator();
  alarm.type = 'square';
  alarm.frequency.setValueAtTime(1500, now);
  alarm.frequency.linearRampToValueAtTime(1000, now + 0.5);
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
  buzz.connect(gainNode);
  alarm.connect(gainNode);
  gainNode.connect(audioContext.destination);
  buzz.start(now);
  buzz.stop(now + 2.5);
  alarm.start(now);
  alarm.stop(now + 2.5);
};

export const playGameOverSound = () => {
  if (!audioContext) initializeAudio();
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const crashOsc = audioContext.createOscillator();
  crashOsc.type = 'sawtooth';
  crashOsc.frequency.setValueAtTime(120, now);
  crashOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
  const toneOsc = audioContext.createOscillator();
  toneOsc.type = 'sine';
  toneOsc.frequency.setValueAtTime(1200, now);
  toneOsc.frequency.exponentialRampToValueAtTime(200, now + 0.6);
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
  crashOsc.connect(gainNode);
  toneOsc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  crashOsc.start(now);
  crashOsc.stop(now + 1.5);
  toneOsc.start(now);
  toneOsc.stop(now + 1.5);
};

// --- Ambient Sound System ---

export const stopAllAmbience = () => {
  if (currentAmbienceState === 'none' || !audioContext) return;
  
  if (activeAmbientNodes.masterGain) {
    const gain = activeAmbientNodes.masterGain as GainNode;
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
  }

  // Stop oscillators after fade out
  // FIX: Use window.setTimeout to avoid ambiguity with Node.js types.
  window.setTimeout(() => {
    Object.values(activeAmbientNodes).forEach(node => {
      if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
        node.stop();
      }
    });
    // FIX: Use window.clearInterval with a type guard to safely clear the interval.
    if (typeof activeAmbientNodes.glitchIntervalId === 'number') {
      window.clearInterval(activeAmbientNodes.glitchIntervalId);
    }
    activeAmbientNodes = {};
    currentAmbienceState = 'none';
  }, 500);
};

const createNormalAmbience = () => {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.1, now + 1.0); // Fade in
  masterGain.connect(audioContext.destination);
  activeAmbientNodes.masterGain = masterGain;

  // Low city hum
  const drone = audioContext.createOscillator();
  drone.type = 'sawtooth';
  drone.frequency.setValueAtTime(50, now);
  drone.connect(masterGain);
  drone.start(now);
  activeAmbientNodes.drone = drone;
  
  // Glitchy static
  const bufferSize = 2 * audioContext.sampleRate;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const whiteNoise = audioContext.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;
  
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(400, now);
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);

  whiteNoise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  whiteNoise.start();
  activeAmbientNodes.whiteNoise = whiteNoise;

  // Intermittent computer blips
  // FIX: Use window.setInterval to ensure the return type is 'number' and not 'NodeJS.Timeout', resolving the type error.
  const glitchIntervalId = window.setInterval(() => {
    playSound('sine', 800 + Math.random() * 400, 0.1, 0.05, true);
  }, 4500);
  activeAmbientNodes.glitchIntervalId = glitchIntervalId;
};

export const startNormalAmbience = () => {
  initializeAudio();
  if (currentAmbienceState === 'normal' || !audioContext) return;
  stopAllAmbience();
  currentAmbienceState = 'normal';
  // FIX: Use window.setTimeout to avoid ambiguity with Node.js types.
  window.setTimeout(createNormalAmbience, 500); // Wait for fade out
};

export const startCombatAmbience = () => {
  initializeAudio();
  if (currentAmbienceState === 'combat' || !audioContext) return;
  stopAllAmbience();
  currentAmbienceState = 'combat';
  // FIX: Use window.setTimeout to avoid ambiguity with Node.js types.
  window.setTimeout(() => {
    createNormalAmbience(); // Start with the base layer
    const now = audioContext.currentTime;
    
    // Rhythmic pulse
    const pulseOsc = audioContext.createOscillator();
    pulseOsc.type = 'square';
    pulseOsc.frequency.setValueAtTime(80, now);
    
    const pulseGain = audioContext.createGain();
    pulseGain.gain.setValueAtTime(0.0, now);

    // LFO for the pulse rhythm
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.5, now); // 1.5 Hz = 90 BPM
    lfo.connect(pulseGain.gain);
    lfo.start(now);
    
    pulseOsc.connect(pulseGain);
    if(activeAmbientNodes.masterGain) {
      pulseGain.connect(activeAmbientNodes.masterGain as GainNode);
    }
    pulseOsc.start(now);
    
    activeAmbientNodes.pulseOsc = pulseOsc;
    activeAmbientNodes.lfo = lfo;
  }, 500);
};

export const startCriticalErrorAmbience = () => {
  initializeAudio();
  if (currentAmbienceState === 'critical' || !audioContext) return;
  stopAllAmbience();
  currentAmbienceState = 'critical';
  // FIX: Use window.setTimeout to avoid ambiguity with Node.js types.
  window.setTimeout(() => {
    const now = audioContext.currentTime;

    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    masterGain.connect(audioContext.destination);
    activeAmbientNodes.masterGain = masterGain;

    // Dissonant alarm
    const alarm1 = audioContext.createOscillator();
    alarm1.type = 'square';
    alarm1.frequency.setValueAtTime(300, now);
    alarm1.connect(masterGain);
    alarm1.start(now);
    activeAmbientNodes.alarm1 = alarm1;

    const alarm2 = audioContext.createOscillator();
    alarm2.type = 'square';
    alarm2.frequency.setValueAtTime(315, now); // Dissonant interval
    alarm2.connect(masterGain);
    alarm2.start(now);
    activeAmbientNodes.alarm2 = alarm2;
  }, 500);
};