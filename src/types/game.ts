export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'extreme';
export type GameMode = 'virtual_drones' | 'ar_real_objects' | 'speed_trial';

export interface GameTarget {
  id: string;
  type: 'drone' | 'cyber_sphere' | 'real_object' | 'boss_core' | 'bonus_node';
  name: string;
  x: number;          // 0 to 1 (center x)
  y: number;          // 0 to 1 (center y)
  radius: number;     // Normalized radius or width
  vx: number;         // Velocity X (units / sec)
  vy: number;         // Velocity Y (units / sec)
  movementPattern: 'linear' | 'sine' | 'bounce' | 'erratic' | 'orbit' | 'real_anchor';
  maxHealth: number;
  currentHealth: number;
  points: number;
  spawnTime: number;
  lifetimeMs: number;
  color: string;
  realTargetId?: string; // If anchored to a real detected object
  isHit?: boolean;
  hitTimestamp?: number;
}

export interface GameScoreState {
  score: number;
  hits: number;
  misses: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  bestScore: number;
  timeRemainingSec: number;
  totalSessionSec: number;
  isActive: boolean;
  isGameOver: boolean;
  difficulty: GameDifficulty;
  lastHitPoints: number;
  multiplier: number;
}

export interface DifficultyConfig {
  name: string;
  label: string;
  targetSpeed: number;     // Speed multiplier
  targetSize: number;      // Size multiplier
  spawnIntervalMs: number;
  maxActiveTargets: number;
  timeLimitSec: number;
  pointsMultiplier: number;
}

export interface HitEffect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  points: number;
  isCrit: boolean;
  createdAt: number;
}
