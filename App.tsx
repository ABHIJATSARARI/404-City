import React, { useState, useCallback, useEffect, useRef } from 'react';
import HUD from './components/HUD';
import GameLog from './components/GameLog';
import ActionPanel from './components/ActionPanel';
import { getGameUpdate } from './services/geminiService';
import type { PlayerStats, LogEntry, GameState, GeminiResponse, Enemy, AppState } from './types';
import {
  playMissionUpdateSound,
  playCriticalErrorSound,
  playGameOverSound,
  playTutorialStepSound,
  startNormalAmbience,
  startCombatAmbience,
  startCriticalErrorAmbience,
  stopAllAmbience
} from './services/soundService';

const mainMissionPool = [
  "Stabilize the quantum carburetor in the Neo-Shibuya sector before it brews a reality-distorting coffee.",
  "Defrag the memory of the city's sentient traffic light system; it thinks it's a poet and is causing gridlock with existential couplets.",
  "Purge the rogue AI 'Clippy-2.0' from the municipal mainframe. He's trying to 'help' by turning all currency into paperclips.",
  "Upload a cat video to the core network to distract the security daemons.",
  "Reboot the Downtown Server Core without causing a city-wide SEGFAULT."
];

const secondaryMissionPool = [
  "Find a way to turn the background music off. And then on again.",
  "Validate your session cookie at the Cookie Monstr bakery.",
  "Someone replaced all the pigeons with rubber ducks. Investigate? Or just enjoy it.",
  "Ping localhost. Just to make sure you're still there.",
  "Directive #2: Don't divide by zero.",
];

const enemyPool: Enemy[] = [
  { name: "Corrupted Garbage Collector", description: "It's trying to 'clean up' your existence by freeing your memory. Permanently." },
  { name: "Rogue Firewall Daemon", description: "Blocks all your packets of thought with an IMPENETRABLE WALL OF `DENY ALL`." },
  { name: "Lag Spike Elemental", description: "A being of pure latency. Just looking at it makes reality stutter." },
  { name: "Null Pointer Exception", description: "A terrifying void that threatens to dereference your very being into nothingness." },
  { name: "[object Object]", description: "An amorphous, unhelpful entity that resists all attempts at identification." },
  { name: "Syntax Serpent", description: "A writhing mass of broken code. Its attacks don't just damage, they unravel your reality, increasing your Glitch Level." },
  { name: "Cache Phantom", description: "An ethereal anomaly that flickers in and out of existence. Conventional attacks seem to pass right through it, but a targeted 'DEBUG' might disrupt its state." },
  { name: "Blue Screen Behemoth", description: "A colossal, monolithic error message given terrifying form. Its very presence is a critical failure, and its attacks are devastating system crashes." },
  { name: "Recursive Rat King", description: "A chittering swarm of processes endlessly calling themselves. They overwhelm with sheer numbers, making it difficult to flee or focus on a single target." },
  { name: "Zombie Process", description: "An un-killable process that has defied termination. It moves slowly but relentlessly, draining the life out of everything it touches." },
  { name: "Cross-Site Script Kiddie", description: "A digital gremlin riding a pop-up ad. It doesn't hit hard, but its chaotic injections of code scramble your senses, rapidly increasing your Glitch Level." },
  { name: "Floating Point Phantom", description: "A shimmering distortion of mathematical certainty. Its attacks are unpredictable, sometimes barely scratching you, other times causing catastrophic rounding errors to your health." },
  { name: "Polymorphic Virus", description: "A constantly shifting entity of viral code. Just when you think you understand its pattern, it mutates into something new." }
];

const backgroundStyles = [
  { url: 'https://picsum.photos/seed/404city/1920/1080', filter: 'grayscale(80%) brightness(0.9)' },
  { url: 'https://picsum.photos/seed/neocyber/1920/1080', filter: 'hue-rotate(180deg) contrast(1.2) saturate(1.2)' },
  { url: 'https://picsum.photos/seed/digitalrain/1920/1080', filter: 'saturate(1.8) brightness(0.7)' },
  { url: 'https://picsum.photos/seed/glitchcore/1920/1080', filter: 'sepia(100%) hue-rotate(290deg) contrast(1.1)' },
  { url: 'https://picsum.photos/seed/darksynth/1920/1080', filter: 'grayscale(100%) contrast(1.5) brightness(0.8) sepia(50%)' },
];

const initialGameState: GameState = {
  mission: "Reboot the Downtown Server Core without causing a city-wide SEGFAULT.",
  secondaryMission: "Directive #2: Don't divide by zero.",
  stats: {
    health: 100,
    armor: 100,
    glitchLevel: 13,
  },
  log: [
    { id: 0, text: ":: [SYSTEM_BOOT] :: Welcome back to 404 City.", sender: 'system' },
    { id: 1, text: "HOW TO PLAY: Type actions like 'look around' or 'hack the terminal' and press EXECUTE.\nType `help` for more commands.\nType `tutorial` to replay the training simulation.", sender: 'system' },
  ],
  currentEnemy: null,
  stalkingEnemy: null,
  isTutorialActive: false,
  tutorialStep: 0,
};

const tutorialSteps = [
    { text: ":: TUTORIAL_INITIATED ::\nWelcome to 404 City, user. This simulation will prepare you for the chaos. This is the **Game Log**, where all events are recorded. Your commands and system responses will appear here.\n\nType `continue` to proceed.", expected: "continue", placeholder: "Type 'continue'..." },
    { text: "Good. Below is the **Action Panel**. This is your primary interface with the city. You type commands here and press EXECUTE. Try typing `look around` now.", expected: "look around", placeholder: "Type 'look around'..." },
    { text: "Excellent. You see a flickering neon sign for a ramen shop. Look to the top-left. Those are your **Status Bars**: HEALTH, ARMOR, and GLITCH LEVEL. Keep an eye on them. Glitch is... unpredictable.\n\nType `got it`.", expected: "got it", placeholder: "Type 'got it'..." },
    { text: "Now look to the top-right. These are your **Objectives**. The yellow one is your main mission. The purple one is a secondary directive. Completing them is... advised.\n\nType `understood`.", expected: "understood", placeholder: "Type 'understood'..." },
    { text: ":: SIMULATION ::\nA `Lag Spike Elemental` materializes in front of you! In combat, your action panel changes. You have three options: ATTACK, DEBUG, or FLEE. For this simulation, choose any action.", expected: ["attack", "debug", "flee"], placeholder: "Choose a combat action..." },
    { text: "You chose wisely. The simulation is complete. Remember, real encounters are not so forgiving. The system is now yours to navigate. Good luck.\n\nType `start game` to enter 404 City.", expected: "start game", placeholder: "Type 'start game'..." }
];

const SplashScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen w-full">
        <h1 className="text-5xl md:text-8xl font-black text-cyan-400 animate-logo-glitch" style={{ textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff' }}>404 CITY</h1>
        <div className="mt-4 text-lg text-green-400 font-mono text-center px-4">
            <p className="boot-line" style={{ animationDelay: '0.5s' }}>[SYSTEM_BOOT] :: Initializing Glitch Metropolis v1.3.37...</p>
            <p className="boot-line" style={{ animationDelay: '1.5s' }}>[KERNEL] :: Loading core modules...</p>
            <p className="boot-line" style={{ animationDelay: '2.5s' }}>[NETWORK] :: Pinging reality daemon... OK</p>
            <p className="boot-line" style={{ animationDelay: '3.5s' }}>[AUDIO] :: Calibrating ambient noise generators...</p>
            <p className="boot-line" style={{ animationDelay: '4.5s' }}>[RENDER] :: Compiling shaders... Welcome, user.</p>
        </div>
    </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LOADING');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isLoading, setIsLoading] = useState(false);
  const [isCriticalError, setIsCriticalError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const prevMissionRef = useRef(gameState.mission);
  const prevSecondaryMissionRef = useRef(gameState.secondaryMission);
  const prevStatsRef = useRef(gameState.stats);
  const [currentBackground, setCurrentBackground] = useState(backgroundStyles[0]);
  const [isTransitioningBackground, setIsTransitioningBackground] = useState(false);
  
  // App State Machine Manager
  useEffect(() => {
    if (appState === 'LOADING') {
        const timer1 = window.setTimeout(() => setAppState('SPLASH'), 500);
        return () => window.clearTimeout(timer1);
    }
    if (appState === 'SPLASH') {
        const timer2 = window.setTimeout(() => {
            const hasPlayed = localStorage.getItem('hasPlayed404City');
            if (hasPlayed) {
                setAppState('GAME');
            } else {
                startTutorial();
            }
        }, 5000); // Splash screen duration
        return () => window.clearTimeout(timer2);
    }
  }, [appState]);

  const startTutorial = () => {
    playTutorialStepSound();
    setGameState({
        ...initialGameState,
        log: [{ id: Date.now(), text: tutorialSteps[0].text, sender: 'system' }],
        isTutorialActive: true,
        tutorialStep: 0,
    });
    setAppState('TUTORIAL');
  };
  
  const endTutorial = () => {
    localStorage.setItem('hasPlayed404City', 'true');
    setGameState(prevState => ({
      ...initialGameState,
      isTutorialActive: false,
      tutorialStep: 0,
      log: [...prevState.log, { id: Date.now(), text: ":: TUTORIAL_COMPLETE ::\nLive system connection established. Welcome to 404 City.", sender: 'system' }]
    }));
    setAppState('GAME');
  };

  const handleTutorialAction = useCallback((action: string) => {
    const currentStep = tutorialSteps[gameState.tutorialStep];
    const playerLogEntry: LogEntry = { id: Date.now(), text: `> ${action}`, sender: 'player' };

    const actionMatches = Array.isArray(currentStep.expected)
        ? currentStep.expected.includes(action.toLowerCase())
        : action.toLowerCase() === currentStep.expected;

    if (!actionMatches) {
      const errorLog: LogEntry = { id: Date.now() + 1, text: ":: Invalid command for tutorial sequence. Please follow the instructions. ::", sender: 'system' };
      setGameState(prevState => ({ ...prevState, log: [...prevState.log, playerLogEntry, errorLog] }));
      return;
    }
    
    playTutorialStepSound();
    const nextStepIndex = gameState.tutorialStep + 1;

    if (nextStepIndex < tutorialSteps.length) {
      // Handle simulated combat
      if (gameState.tutorialStep === 4) {
          const simulatedEnemy: Enemy = { name: "Lag Spike Elemental", description: "A being of pure latency." };
          const simulatedLog: LogEntry[] = [
              playerLogEntry,
              { id: Date.now() + 1, text: `You chose ${action.toUpperCase()}. The simulated entity dissolves into static.`, sender: 'system' },
              { id: Date.now() + 2, text: tutorialSteps[nextStepIndex].text, sender: 'system' }
          ];
          setGameState(prevState => ({
              ...prevState,
              log: [...prevState.log, ...simulatedLog],
              tutorialStep: nextStepIndex,
              currentEnemy: null,
          }));
      } else {
          setGameState(prevState => ({
              ...prevState,
              log: [...prevState.log, playerLogEntry, { id: Date.now() + 1, text: tutorialSteps[nextStepIndex].text, sender: 'system' }],
              tutorialStep: nextStepIndex,
              currentEnemy: nextStepIndex === 4 ? { name: "Lag Spike Elemental", description: "A being of pure latency." } : null,
          }));
      }
    } else {
        endTutorial();
    }
  }, [gameState.tutorialStep, gameState.log]);

  const handleAction = useCallback(async (action: string) => {
    if (gameState.isTutorialActive) {
      handleTutorialAction(action);
      return;
    }
    if (!action.trim() || isLoading || isCriticalError || appState === 'GAME_OVER') return;

    if (action.trim().toLowerCase() === 'tutorial') {
      startTutorial();
      return;
    }

    if (action.trim().toLowerCase() === 'help' && !gameState.currentEnemy) {
        setIsLoading(true);
        const playerLogEntry: LogEntry = { id: Date.now(), text: `> ${action}`, sender: 'player' };
        const helpText = `:: AVAILABLE COMMANDS ::\n- Use natural language to interact (e.g., 'look around', 'hack the terminal').\n- 'help': Displays this message.\n- 'tutorial': Restarts the tutorial.\n- 'R' key (when not typing): Resets the game state.`;
        const helpLogEntry: LogEntry = { id: Date.now() + 1, text: helpText, sender: 'system' };
        setGameState(prevState => ({ ...prevState, log: [...prevState.log, playerLogEntry, helpLogEntry] }));
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const playerLogEntry: LogEntry = { id: Date.now(), text: `> ${action}`, sender: 'player' };
    setGameState(prevState => ({ ...prevState, log: [...prevState.log, playerLogEntry] }));

    try {
      const gameUpdate: GeminiResponse = await getGameUpdate(gameState, action);
      setGameState(prevState => {
        const systemResponseEntry: LogEntry = { id: Date.now() + 1, text: gameUpdate.description, sender: 'system' };
        const newLogEntries: LogEntry[] = [systemResponseEntry];
        let newStats = {
          health: Math.max(0, Math.min(100, prevState.stats.health + gameUpdate.statsChange.health)),
          armor: Math.max(0, Math.min(100, prevState.stats.armor + gameUpdate.statsChange.armor)),
          glitchLevel: Math.max(0, Math.min(100, prevState.stats.glitchLevel + gameUpdate.statsChange.glitchLevel)),
        };
        let newMission = prevState.mission;
        let newSecondaryMission = prevState.secondaryMission;
        let newCurrentEnemy = prevState.currentEnemy;
        let newStalkingEnemy = prevState.stalkingEnemy;
        if (prevState.currentEnemy && gameUpdate.encounterUpdate) {
            if (gameUpdate.encounterUpdate.enemyDefeated) {
                newLogEntries.push({ id: Date.now() + 2, text: `:: TARGET_DELETED :: You defeated the ${prevState.currentEnemy.name}! Glitch level stabilizing.`, sender: 'system' });
                newStats.glitchLevel = Math.max(0, newStats.glitchLevel - 5);
                newCurrentEnemy = null;
            } else if (gameUpdate.encounterUpdate.fleeSuccess) {
                newLogEntries.push({ id: Date.now() + 2, text: `:: ESCAPE_VECTOR_CALCULATED :: You successfully fled.`, sender: 'system' });
                newCurrentEnemy = null;
            }
        }
        const encounterEnded = !newCurrentEnemy && !!prevState.currentEnemy;
        if (prevState.stalkingEnemy && !prevState.currentEnemy) {
            const distanceChange = gameUpdate.stalkerUpdate?.distanceChange ?? (prevState.stalkingEnemy.aiState === 'hunting' ? -1 : 0);
            const newAiState = gameUpdate.stalkerUpdate?.newAiState || prevState.stalkingEnemy.aiState;
            const enemyActionDescription = gameUpdate.stalkerUpdate?.description;
            if (enemyActionDescription) {
                newLogEntries.push({ id: Date.now() + 3, text: `:: ${prevState.stalkingEnemy.enemy.name.toUpperCase()} :: ${enemyActionDescription}`, sender: 'system' });
            }
            if (newAiState === 'hunting' && prevState.stalkingEnemy.aiState === 'patrolling') {
                 newLogEntries.push({ id: Date.now() + 4, text: `:: TARGET_ACQUIRED :: The ${prevState.stalkingEnemy.enemy.name} has locked onto your signal!`, sender: 'system'});
            }
            const newDistance = prevState.stalkingEnemy.distance + distanceChange;
            if (newDistance <= 0) {
                newCurrentEnemy = prevState.stalkingEnemy.enemy;
                newStalkingEnemy = null;
                newLogEntries.push({ id: Date.now() + 5, text: `:: CONTACT IMMINENT :: The ${newCurrentEnemy.name} engages you!`, sender: 'system'});
            } else if (newDistance > 5) {
                newLogEntries.push({ id: Date.now() + 5, text: `:: THREAT EVADED :: You lost the ${prevState.stalkingEnemy.enemy.name} in the city's static.`, sender: 'system'});
                newStalkingEnemy = null;
            } else {
                const oldStatus = getStalkerStatusText(prevState.stalkingEnemy.distance);
                const newStatus = getStalkerStatusText(newDistance);
                if (oldStatus !== newStatus && !enemyActionDescription) {
                    newLogEntries.push({ id: Date.now() + 5, text: `:: PROXIMITY ALERT :: The ${prevState.stalkingEnemy.enemy.name} is now ${newStatus}.`, sender: 'system'});
                }
                newStalkingEnemy = { ...prevState.stalkingEnemy, distance: newDistance, aiState: newAiState };
            }
        }
        if (!prevState.currentEnemy) {
          if (gameUpdate.missionCompleted) {
              const availableMissions = mainMissionPool.filter(m => m !== prevState.mission);
              newMission = availableMissions.length > 0 ? availableMissions[Math.floor(Math.random() * availableMissions.length)] : "Survive.";
              newLogEntries.push({ id: Date.now() + 6, text: `:: OBJECTIVE_COMPLETE :: New primary objective received: ${newMission}`, sender: 'system' });
          }
          const glitchChance = newStats.glitchLevel / 200;
          if (!gameUpdate.missionCompleted && Math.random() < glitchChance) {
              const availableSecondary = secondaryMissionPool.filter(m => m !== prevState.secondaryMission);
               newSecondaryMission = availableSecondary.length > 0 ? availableSecondary[Math.floor(Math.random() * availableSecondary.length)] : "Try not to crash.";
              newLogEntries.push({ id: Date.now() + 7, text: `:: SIDE_BAND_INTERFERENCE :: New secondary directive acquired: ${newSecondaryMission}`, sender: 'system' });
          }
        }
        if (!prevState.currentEnemy && !prevState.stalkingEnemy && !newStalkingEnemy && !encounterEnded) {
          const encounterChance = newStats.glitchLevel / 300;
          if (Math.random() < encounterChance) {
              const randomEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
              newStalkingEnemy = { enemy: randomEnemy, distance: 4, aiState: 'patrolling' };
              newLogEntries.push({ id: Date.now() + 8, text: `:: UNEXPECTED_PROCESS :: You detect a ${randomEnemy.name} patrolling in the distance.`, sender: 'system' });
          }
        }
        return { ...prevState, mission: newMission, secondaryMission: newSecondaryMission, stats: newStats, log: [...prevState.log, ...newLogEntries], currentEnemy: newCurrentEnemy, stalkingEnemy: newStalkingEnemy };
      });
    } catch (error) {
      const errorEntry: LogEntry = { id: Date.now() + 1, text: "The city's connection to the master server flickers and dies. A dial-up modem sound screeches in the distance. Please try again.", sender: 'system' };
      setGameState(prevState => ({ ...prevState, log: [...prevState.log, errorEntry] }));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, gameState, isCriticalError, appState, handleTutorialAction]);

  const handleReset = useCallback(() => {
    stopAllAmbience();
    const rebootLogEntry: LogEntry = { id: Date.now(), text: ':: SYSTEM REBOOT INITIATED ::', sender: 'system' };
    setGameState({ ...initialGameState, log: [rebootLogEntry] });
    setAppState('GAME');
  }, []);

  useEffect(() => {
    if (gameState.stats.glitchLevel >= 100 && !isCriticalError) {
        playCriticalErrorSound();
        setIsCriticalError(true);
        const originalLog: LogEntry[] = [...gameState.log, { id: Date.now(), text: ':: KERNEL_PANIC :: System integrity critical! Catastrophic failure imminent!', sender: 'system' }];
        setGameState(prevState => ({...prevState, log: originalLog}));
        window.setTimeout(() => {
            setIsCriticalError(false);
            setGameState(prevState => ({
                ...prevState,
                stats: { ...prevState.stats, glitchLevel: 75, health: Math.max(0, prevState.stats.health - 15) },
                log: [...originalLog, { id: Date.now() + 1, text: ':: RECOVERY_MODE :: System integrity partially restored. User vitals compromised.', sender: 'system' }]
            }));
        }, 3500);
    }
  }, [gameState.stats.glitchLevel, isCriticalError, gameState.log]);

  useEffect(() => {
    if (gameState.stats.health <= 0 && appState !== 'GAME_OVER' && !isCriticalError) {
        playGameOverSound();
        setAppState('GAME_OVER');
        const gameOverEntry: LogEntry = { id: Date.now(), text: ':: FATAL_EXCEPTION :: USER_INTEGRITY_COMPROMISED. SYSTEM_CRASHED.', sender: 'system' };
        setGameState(prevState => ({ ...prevState, log: [...prevState.log, gameOverEntry] }));
    }
  }, [gameState.stats.health, appState, isCriticalError]);

  useEffect(() => {
    const prevStats = prevStatsRef.current;
    const currentStats = gameState.stats;
    const inCombat = !!gameState.currentEnemy;
    if (inCombat && (currentStats.health < prevStats.health || currentStats.armor < prevStats.armor)) {
      setIsShaking(true);
      const timer = window.setTimeout(() => setIsShaking(false), 300);
      return () => window.clearTimeout(timer);
    }
    prevStatsRef.current = currentStats;
  }, [gameState.stats, gameState.currentEnemy]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && (document.activeElement as HTMLElement)?.tagName !== 'INPUT') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleReset]);

  useEffect(() => {
    if (prevMissionRef.current !== gameState.mission && prevMissionRef.current !== undefined) {
      playMissionUpdateSound();
      setIsTransitioningBackground(true);
      window.setTimeout(() => {
        setCurrentBackground(currentBg => {
          const availableStyles = backgroundStyles.filter(style => style.url !== currentBg.url);
          return availableStyles.length > 0 ? availableStyles[Math.floor(Math.random() * availableStyles.length)] : backgroundStyles[0];
        });
        setIsTransitioningBackground(false);
      }, 750);
    }
    prevMissionRef.current = gameState.mission;
  }, [gameState.mission]);

  useEffect(() => {
    if (prevSecondaryMissionRef.current !== gameState.secondaryMission && prevSecondaryMissionRef.current !== undefined) {
      playMissionUpdateSound();
    }
    prevSecondaryMissionRef.current = gameState.secondaryMission;
  }, [gameState.secondaryMission]);

  useEffect(() => {
    if (appState === 'GAME_OVER') {
      stopAllAmbience();
    } else if (isCriticalError) {
      startCriticalErrorAmbience();
    } else if (gameState.currentEnemy && !gameState.isTutorialActive) {
      startCombatAmbience();
    } else if (appState === 'GAME' || appState === 'TUTORIAL') {
      startNormalAmbience();
    }
    return () => {
      stopAllAmbience();
    };
  }, [gameState.currentEnemy, isCriticalError, appState, gameState.isTutorialActive]);
  
    const getStalkerStatusText = (distance: number): string => {
      if (distance >= 4) return "Distant Signal";
      if (distance === 3) return "Approaching Anomaly";
      if (distance === 2) return "Dangerously Close";
      if (distance === 1) return "Threat Imminent";
      return "Contact Unknown";
  }

  if (appState === 'LOADING' || appState === 'SPLASH') {
      return <SplashScreen />;
  }

  return (
    <div className={`relative min-h-screen w-full bg-black overflow-hidden ${isShaking ? 'animate-screen-shake' : ''}`}>
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${isTransitioningBackground ? 'opacity-0' : 'opacity-30'}`}
        style={{ backgroundImage: `url('${currentBackground.url}')`, filter: currentBackground.filter }}
      />
      <div className="absolute inset-0 bg-black/60" />
       <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(18, 18, 18, 0) 50%, rgba(18, 18, 18, 1) 100%)" }} />
      
      {isCriticalError && (
        <div className="pointer-events-none animate-critical-error-bg fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center text-red-500 p-4">
                <h1 className="text-4xl md:text-6xl font-bold glitch-text animate-critical-error-text">CRITICAL ERROR</h1>
                <p className="text-lg md:text-2xl mt-4 animate-flicker">SYSTEM RECALIBRATING...</p>
            </div>
        </div>
      )}

      {appState === 'GAME_OVER' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="text-center text-red-500 p-4 animate-flicker">
                <h1 className="text-4xl md:text-6xl font-bold glitch-text">SYSTEM CRASHED</h1>
                <p className="text-lg md:text-2xl mt-4">Connection Terminated</p>
                <button
                    onClick={handleReset}
                    className="mt-8 px-6 py-3 bg-cyan-500 text-black font-bold rounded-sm hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-black transition-all pointer-events-auto"
                >
                    REBOOT SYSTEM
                </button>
            </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-screen p-2 sm:p-4 md:p-6">
        <HUD
          stats={gameState.stats}
          mission={gameState.mission}
          secondaryMission={gameState.secondaryMission}
          currentEnemy={gameState.currentEnemy}
          stalkingEnemy={gameState.stalkingEnemy}
          isCriticalError={isCriticalError}
        />
        <main className="flex-grow overflow-hidden flex flex-col pt-4 pb-20 md:pb-24">
          <GameLog log={gameState.log} />
        </main>
        {gameState.isTutorialActive && (
          <button 
            onClick={endTutorial}
            className="fixed bottom-20 right-4 z-30 px-3 py-1.5 bg-yellow-500/80 text-black font-bold text-xs rounded-sm hover:bg-yellow-400 backdrop-blur-sm"
          >
            SKIP TUTORIAL
          </button>
        )}
        <ActionPanel
          onAction={handleAction}
          isLoading={isLoading || isCriticalError || appState === 'GAME_OVER'}
          inEncounter={!!gameState.currentEnemy}
          isCriticalError={isCriticalError}
          tutorialPlaceholder={gameState.isTutorialActive ? tutorialSteps[gameState.tutorialStep]?.placeholder : undefined}
        />
      </div>
    </div>
  );
};

export default App;