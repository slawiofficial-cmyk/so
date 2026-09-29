import {
  GameDifficulty,
  GameMode,
  GameScoreState,
  GameTarget,
  HitEffect,
  DifficultyConfig,
} from '../types/game';
import { TrackedTarget } from '../types/vision';
import { soundSynth } from '../audio/soundSynthesizer';

export const DIFFICULTY_CONFIGS: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    name: 'easy',
    label: 'سهل (Easy)',
    targetSpeed: 0.6,
    targetSize: 1.4,
    spawnIntervalMs: 2200,
    maxActiveTargets: 3,
    timeLimitSec: 60,
    pointsMultiplier: 1,
  },
  normal: {
    name: 'normal',
    label: 'متوسط (Normal)',
    targetSpeed: 1.0,
    targetSize: 1.0,
    spawnIntervalMs: 1600,
    maxActiveTargets: 5,
    timeLimitSec: 45,
    pointsMultiplier: 1.5,
  },
  hard: {
    name: 'hard',
    label: 'صعب (Hard)',
    targetSpeed: 1.5,
    targetSize: 0.75,
    spawnIntervalMs: 1100,
    maxActiveTargets: 6,
    timeLimitSec: 35,
    pointsMultiplier: 2.2,
  },
  extreme: {
    name: 'extreme',
    label: 'فائق (Extreme)',
    targetSpeed: 2.2,
    targetSize: 0.55,
    spawnIntervalMs: 750,
    maxActiveTargets: 8,
    timeLimitSec: 25,
    pointsMultiplier: 3.5,
  },
};

const TARGET_COLORS = ['#38bdf8', '#f43f5e', '#a855f7', '#fbbf24', '#34d399', '#f97316'];

export class TargetChallengeGame {
  private state: GameScoreState;
  private targets: Map<string, GameTarget> = new Map();
  private hitEffects: HitEffect[] = [];
  private lastSpawnTime: number = 0;
  private targetIdCounter: number = 1;
  private gameMode: GameMode = 'virtual_drones';
  private onStateChangeCallback?: (state: GameScoreState) => void;

  constructor(difficulty: GameDifficulty = 'normal') {
    const bestScore = this.loadBestScore(difficulty);
    this.state = {
      score: 0,
      hits: 0,
      misses: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      bestScore,
      timeRemainingSec: DIFFICULTY_CONFIGS[difficulty].timeLimitSec,
      totalSessionSec: 0,
      isActive: false,
      isGameOver: false,
      difficulty,
      lastHitPoints: 0,
      multiplier: 1,
    };
  }

  public setCallback(cb: (state: GameScoreState) => void) {
    this.onStateChangeCallback = cb;
  }

  public getState(): GameScoreState {
    return { ...this.state };
  }

  public getTargets(): GameTarget[] {
    return Array.from(this.targets.values());
  }

  public getHitEffects(): HitEffect[] {
    return this.hitEffects;
  }

  public setDifficulty(diff: GameDifficulty) {
    this.state.difficulty = diff;
    this.state.bestScore = this.loadBestScore(diff);
    this.state.timeRemainingSec = DIFFICULTY_CONFIGS[diff].timeLimitSec;
    this.notifyState();
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
  }

  public startGame() {
    const config = DIFFICULTY_CONFIGS[this.state.difficulty];
    this.targets.clear();
    this.hitEffects = [];
    this.targetIdCounter = 1;
    this.lastSpawnTime = performance.now();

    this.state = {
      score: 0,
      hits: 0,
      misses: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      bestScore: this.loadBestScore(this.state.difficulty),
      timeRemainingSec: config.timeLimitSec,
      totalSessionSec: 0,
      isActive: true,
      isGameOver: false,
      difficulty: this.state.difficulty,
      lastHitPoints: 0,
      multiplier: 1,
    };

    soundSynth.playLockOn();
    this.notifyState();
  }

  public stopGame() {
    this.state.isActive = false;
    this.state.isGameOver = true;
    this.saveStats();
    this.notifyState();
  }

  /**
   * Main game loop step: updates moving targets, handles life-cycles, timer
   */
  public update(dt: number, realTrackedTargets?: TrackedTarget[]) {
    if (!this.state.isActive || this.state.isGameOver) {
      // Clean up old hit effects even when paused
      const now = performance.now();
      this.hitEffects = this.hitEffects.filter(e => now - e.createdAt < 1200);
      return;
    }

    const now = performance.now();
    const config = DIFFICULTY_CONFIGS[this.state.difficulty];

    // Update timer
    this.state.totalSessionSec += dt;
    this.state.timeRemainingSec = Math.max(0, this.state.timeRemainingSec - dt);
    if (this.state.timeRemainingSec <= 0) {
      this.stopGame();
      soundSynth.playTargetMiss();
      return;
    }

    // Clean old hit effects
    this.hitEffects = this.hitEffects.filter(e => now - e.createdAt < 1200);

    // Spawning logic
    if (this.gameMode === 'ar_real_objects' && realTrackedTargets) {
      this.syncRealTargets(realTrackedTargets);
    } else {
      if (
        this.targets.size < config.maxActiveTargets &&
        now - this.lastSpawnTime > config.spawnIntervalMs
      ) {
        this.spawnVirtualTarget(config);
        this.lastSpawnTime = now;
      }
    }

    // Update target positions according to motion formulas
    for (const [id, target] of this.targets.entries()) {
      if (target.isHit) {
        if (now - (target.hitTimestamp || 0) > 300) {
          this.targets.delete(id);
        }
        continue;
      }

      // Check lifetime
      if (target.movementPattern !== 'real_anchor' && now - target.spawnTime > target.lifetimeMs) {
        // Expired target
        this.targets.delete(id);
        this.state.combo = 0;
        this.state.multiplier = 1;
        continue;
      }

      // Trajectory mathematics
      const speed = config.targetSpeed;
      if (target.movementPattern === 'linear') {
        target.x += target.vx * speed * dt;
        if (target.x > 0.92) {
          target.x = 0.92;
          target.vx = -Math.abs(target.vx);
        } else if (target.x < 0.08) {
          target.x = 0.08;
          target.vx = Math.abs(target.vx);
        }
      } else if (target.movementPattern === 'bounce') {
        target.y += target.vy * speed * dt;
        if (target.y > 0.85) {
          target.y = 0.85;
          target.vy = -Math.abs(target.vy);
        } else if (target.y < 0.15) {
          target.y = 0.15;
          target.vy = Math.abs(target.vy);
        }
      } else if (target.movementPattern === 'sine') {
        target.x += target.vx * speed * dt;
        const timeElapsed = (now - target.spawnTime) / 1000;
        target.y = 0.5 + Math.sin(timeElapsed * 3) * 0.25;
        if (target.x > 0.92) { target.x = 0.92; target.vx = -Math.abs(target.vx); }
        if (target.x < 0.08) { target.x = 0.08; target.vx = Math.abs(target.vx); }
      } else if (target.movementPattern === 'erratic') {
        target.x += target.vx * speed * dt;
        target.y += target.vy * speed * dt;
        if (target.x > 0.92 || target.x < 0.08) target.vx *= -1;
        if (target.y > 0.85 || target.y < 0.15) target.vy *= -1;
      }
    }

    this.notifyState();
  }

  /**
   * Safe Virtual Laser Trigger / Shot Action
   * Center crosshair coordinates: (0.5, 0.5) by default, or specific crosshair tap
   */
  public triggerShot(crosshairX: number = 0.5, crosshairY: number = 0.5): {
    hit: boolean;
    target?: GameTarget;
    points: number;
    isCrit: boolean;
  } {
    if (!this.state.isActive || this.state.isGameOver) {
      soundSynth.playLaserShot();
      return { hit: false, points: 0, isCrit: false };
    }

    soundSynth.playLaserShot();

    const now = performance.now();
    let hitTarget: GameTarget | null = null;
    let minDistance = Infinity;

    // Check intersection with all active targets
    for (const target of this.targets.values()) {
      if (target.isHit) continue;

      const dx = crosshairX - target.x;
      const dy = crosshairY - target.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= target.radius) {
        if (distance < minDistance) {
          minDistance = distance;
          hitTarget = target;
        }
      }
    }

    if (hitTarget) {
      // Calculate hit accuracy (bullseye = distance < 35% radius)
      const isCrit = minDistance < hitTarget.radius * 0.35;
      const basePoints = hitTarget.points;
      const critMultiplier = isCrit ? 2.0 : 1.0;
      const finalPoints = Math.round(basePoints * critMultiplier * this.state.multiplier);

      hitTarget.isHit = true;
      hitTarget.hitTimestamp = now;

      this.state.hits++;
      this.state.combo++;
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo;
      }

      // Multiplier tiers: 3 combo = 1.5x, 6 combo = 2x, 10 combo = 3x, 15 combo = 4x
      if (this.state.combo >= 15) this.state.multiplier = 4;
      else if (this.state.combo >= 10) this.state.multiplier = 3;
      else if (this.state.combo >= 6) this.state.multiplier = 2;
      else if (this.state.combo >= 3) this.state.multiplier = 1.5;
      else this.state.multiplier = 1;

      this.state.score += finalPoints;
      this.state.lastHitPoints = finalPoints;

      if (this.state.score > this.state.bestScore) {
        this.state.bestScore = this.state.score;
        this.saveBestScore(this.state.difficulty, this.state.bestScore);
      }

      this.updateAccuracy();

      // Audio feedback
      soundSynth.playTargetHit(isCrit);
      if (this.state.combo > 0 && this.state.combo % 3 === 0) {
        soundSynth.playComboChime(this.state.combo);
      }

      // Add floating hit score effect
      this.hitEffects.push({
        id: `hit-${now}-${Math.random()}`,
        x: hitTarget.x,
        y: hitTarget.y,
        text: isCrit ? `CRITICAL! +${finalPoints}` : `HIT +${finalPoints}`,
        color: isCrit ? '#f43f5e' : '#38bdf8',
        points: finalPoints,
        isCrit,
        createdAt: now,
      });

      this.notifyState();
      return { hit: true, target: hitTarget, points: finalPoints, isCrit };
    } else {
      // Miss
      this.state.misses++;
      this.state.combo = 0;
      this.state.multiplier = 1;
      this.updateAccuracy();

      soundSynth.playTargetMiss();

      this.hitEffects.push({
        id: `miss-${now}-${Math.random()}`,
        x: crosshairX,
        y: crosshairY,
        text: 'MISS',
        color: '#64748b',
        points: 0,
        isCrit: false,
        createdAt: now,
      });

      this.notifyState();
      return { hit: false, points: 0, isCrit: false };
    }
  }

  private updateAccuracy() {
    const totalShots = this.state.hits + this.state.misses;
    if (totalShots > 0) {
      this.state.accuracy = parseFloat(((this.state.hits / totalShots) * 100).toFixed(1));
    }
  }

  private spawnVirtualTarget(config: DifficultyConfig) {
    const idNum = this.targetIdCounter++;
    const id = `TARGET_${idNum < 10 ? '0' : ''}${idNum}`;
    const patterns: Array<'linear' | 'sine' | 'bounce' | 'erratic'> = ['linear', 'sine', 'bounce', 'erratic'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    const startX = 0.15 + Math.random() * 0.7;
    const startY = 0.2 + Math.random() * 0.6;
    const vx = (Math.random() > 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.18);
    const vy = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.15);

    const baseRadius = 0.07 * config.targetSize;
    const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];

    const target: GameTarget = {
      id,
      type: 'drone',
      name: `DRONE-${idNum}`,
      x: startX,
      y: startY,
      radius: baseRadius,
      vx,
      vy,
      movementPattern: pattern,
      maxHealth: 1,
      currentHealth: 1,
      points: Math.round(100 * config.pointsMultiplier),
      spawnTime: performance.now(),
      lifetimeMs: Math.max(3500, 7500 / config.targetSpeed),
      color,
    };

    this.targets.set(id, target);
  }

  private syncRealTargets(realTargets: TrackedTarget[]) {
    // Convert real camera tracked targets into AR game targets
    for (const real of realTargets) {
      const gameTargetId = `REAL_${real.id}`;
      if (!this.targets.has(gameTargetId)) {
        const target: GameTarget = {
          id: gameTargetId,
          type: 'real_object',
          name: real.id,
          x: real.centerX,
          y: real.centerY,
          radius: Math.max(0.06, Math.min(0.2, (real.bbox.width + real.bbox.height) / 4)),
          vx: real.velocityX,
          vy: real.velocityY,
          movementPattern: 'real_anchor',
          maxHealth: 1,
          currentHealth: 1,
          points: 150,
          spawnTime: performance.now(),
          lifetimeMs: 30000,
          color: real.targetType === 'person' ? '#38bdf8' : '#fbbf24',
          realTargetId: real.id,
        };
        this.targets.set(gameTargetId, target);
      } else {
        const existing = this.targets.get(gameTargetId)!;
        existing.x = real.centerX;
        existing.y = real.centerY;
        existing.radius = Math.max(0.06, Math.min(0.2, (real.bbox.width + real.bbox.height) / 4));
      }
    }
  }

  private loadBestScore(diff: GameDifficulty): number {
    try {
      const val = localStorage.getItem(`robovision_best_score_${diff}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(diff: GameDifficulty, score: number) {
    try {
      localStorage.setItem(`robovision_best_score_${diff}`, score.toString());
    } catch {}
  }

  private saveStats() {
    try {
      const statsJson = localStorage.getItem('robovision_all_stats');
      const allStats = statsJson ? JSON.parse(statsJson) : {
        totalGames: 0,
        totalHits: 0,
        totalMisses: 0,
        bestCombo: 0,
        highestScore: 0,
        totalTimeSec: 0,
      };

      allStats.totalGames++;
      allStats.totalHits += this.state.hits;
      allStats.totalMisses += this.state.misses;
      allStats.totalTimeSec += Math.round(this.state.totalSessionSec);
      if (this.state.maxCombo > allStats.bestCombo) {
        allStats.bestCombo = this.state.maxCombo;
      }
      if (this.state.score > allStats.highestScore) {
        allStats.highestScore = this.state.score;
      }

      localStorage.setItem('robovision_all_stats', JSON.stringify(allStats));
    } catch {}
  }

  private notifyState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }
}
