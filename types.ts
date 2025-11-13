export type AppState = 'LOADING' | 'SPLASH' | 'TUTORIAL' | 'GAME' | 'GAME_OVER';

export interface PlayerStats {
  health: number;
  armor: number;
  glitchLevel: number;
}

export interface LogEntry {
  id: number;
  text: string;
  sender: 'system' | 'player';
}

export interface Enemy {
  name: string;
  description: string;
}

export interface StalkingEnemy {
  enemy: Enemy;
  distance: number; // e.g., 5 = far, 1 = very close
  aiState: 'patrolling' | 'hunting';
}

export interface GameState {
  mission: string;
  secondaryMission?: string;
  stats: PlayerStats;
  log: LogEntry[];
  currentEnemy: Enemy | null;
  stalkingEnemy: StalkingEnemy | null;
  isTutorialActive: boolean;
  tutorialStep: number;
}

export interface GeminiResponse {
  description: string;
  missionCompleted: boolean;
  statsChange: {
    health: number;
    armor: number;
    glitchLevel: number;
  };
  encounterUpdate?: {
    enemyDefeated: boolean;
    fleeSuccess: boolean;
  };
  stalkerUpdate?: {
    distanceChange: number;
    newAiState?: 'patrolling' | 'hunting';
    description?: string;
  };
}