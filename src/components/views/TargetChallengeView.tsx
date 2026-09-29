import React from 'react';
import { GameDifficulty, GameMode, GameScoreState } from '../../types/game';
import { DIFFICULTY_CONFIGS } from '../../game/gameEngine';
import {
  Crosshair,
  Play,
  Square,
  Trophy,
  Flame,
  Shield,
  Zap,
  RotateCcw,
  Target,
  Sparkles,
} from 'lucide-react';

interface TargetChallengeViewProps {
  gameState: GameScoreState;
  onStartGame: () => void;
  onStopGame: () => void;
  onSetDifficulty: (diff: GameDifficulty) => void;
  onSetGameMode: (mode: GameMode) => void;
  selectedMode: GameMode;
  onSwitchToVisionTab: () => void;
}

export const TargetChallengeView: React.FC<TargetChallengeViewProps> = ({
  gameState,
  onStartGame,
  onStopGame,
  onSetDifficulty,
  onSetGameMode,
  selectedMode,
  onSwitchToVisionTab,
}) => {
  const currentDiff = gameState.difficulty;

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto overflow-y-auto pb-24">
      {/* Header Banner */}
      <div className="hud-box p-5 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <Crosshair className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold font-cyber text-slate-100">
                تحدي التصويب الافتراضي (Target Challenge)
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-mono-hud">
              محاكاة تصويب واقع معزز (AR) آمنة وسريعة • دقة التصويب، حساب النقاط، وتتبع الأهداف المتحركة
            </p>
          </div>

          <div className="flex items-center gap-2">
            {gameState.isActive ? (
              <button
                onClick={onStopGame}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-cyber font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>إنهاء الجولة</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onStartGame();
                  onSwitchToVisionTab();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-cyber font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>بدء التحدي الآن</span>
              </button>
            )}
          </div>
        </div>

        {/* Safety Badge */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-emerald-400 font-mono-hud">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>نظام آمن 100%: التصويب افتراضي ورقمي بالكامل داخل الشاشة ولا يرتبط بأي أسلحة حقيقية.</span>
        </div>
      </div>

      {/* Live Stats / High Score Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-hud">
        <div className="hud-box p-3.5 rounded-xl border border-yellow-500/30 bg-slate-900/60">
          <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>أعلى نتيجة (Best Score)</span>
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {gameState.bestScore.toLocaleString()}
          </div>
        </div>

        <div className="hud-box p-3.5 rounded-xl border border-sky-500/30 bg-slate-900/60">
          <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
            <Target className="w-4 h-4 text-sky-400" />
            <span>الدقة الحالية</span>
          </div>
          <div className="text-xl font-bold text-sky-400">
            {gameState.accuracy}%
          </div>
        </div>

        <div className="hud-box p-3.5 rounded-xl border border-rose-500/30 bg-slate-900/60">
          <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>أعلى كومبو (Max Combo)</span>
          </div>
          <div className="text-xl font-bold text-rose-400">
            {gameState.maxCombo}x
          </div>
        </div>

        <div className="hud-box p-3.5 rounded-xl border border-emerald-500/30 bg-slate-900/60">
          <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>إصابات / أخطاء</span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            <span className="text-emerald-400">{gameState.hits}</span> / <span className="text-rose-400">{gameState.misses}</span>
          </div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="space-y-2">
        <div className="text-sm font-cyber font-bold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>اختر مستوى الصعوبة (Difficulty Level):</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['easy', 'normal', 'hard', 'extreme'] as GameDifficulty[]).map((diff) => {
            const config = DIFFICULTY_CONFIGS[diff];
            const isSelected = currentDiff === diff;

            return (
              <button
                key={diff}
                onClick={() => onSetDifficulty(diff)}
                className={`hud-box p-4 rounded-xl text-right transition-all border ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/15 shadow-md shadow-sky-500/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-cyber font-bold text-sm text-slate-100 uppercase">
                    {config.label}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  )}
                </div>
                <div className="text-[11px] font-mono-hud text-slate-400 space-y-0.5 mt-2">
                  <div>السرعة: {config.targetSpeed}x</div>
                  <div>الوقت: {config.timeLimitSec} ثانية</div>
                  <div>مضاعف النقاط: {config.pointsMultiplier}x</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Mode Selector */}
      <div className="space-y-2">
        <div className="text-sm font-cyber font-bold text-slate-200">
          نوع الأهداف (Target Mode):
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => onSetGameMode('virtual_drones')}
            className={`hud-box p-4 rounded-xl text-right transition-all border ${
              selectedMode === 'virtual_drones'
                ? 'border-sky-500 bg-sky-500/15'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
            }`}
          >
            <div className="font-cyber font-bold text-sm text-slate-100 mb-1">
              🛸 طائرات مسيرة افتراضية (Virtual Drones)
            </div>
            <p className="text-xs text-slate-400">
              تتحرك الطائرات الافتراضية بمسارات خطية، متموجة، وعشوائية مختلفة فوق شاشة الكاميرا.
            </p>
          </button>

          <button
            onClick={() => onSetGameMode('ar_real_objects')}
            className={`hud-box p-4 rounded-xl text-right transition-all border ${
              selectedMode === 'ar_real_objects'
                ? 'border-amber-500 bg-amber-500/15'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
            }`}
          >
            <div className="font-cyber font-bold text-sm text-slate-100 mb-1">
              🎯 أهداف الواقع المعزز (AR Real Camera Targets)
            </div>
            <p className="text-xs text-slate-400">
              يتم تحويل الأشخاص والأشياء الحقيقية التي تكتشفها الكاميرا فورياً إلى أهداف تصويب AR.
            </p>
          </button>
        </div>
      </div>

      {/* Game Over Modal / Card if Game Over */}
      {gameState.isGameOver && (
        <div className="hud-box p-5 rounded-2xl border-2 border-yellow-500/60 bg-slate-950/95 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-bold font-cyber text-yellow-400">
                انتهت الجولة! (ROUND COMPLETE)
              </h3>
            </div>
            <button
              onClick={() => {
                onStartGame();
                onSwitchToVisionTab();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-cyber hover:bg-emerald-500/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-hud text-center">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">النتيجة النهائية</div>
              <div className="text-2xl font-bold text-yellow-400">{gameState.score}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">نسبة الدقة</div>
              <div className="text-2xl font-bold text-sky-400">{gameState.accuracy}%</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">الإصابات الناجحة</div>
              <div className="text-2xl font-bold text-emerald-400">{gameState.hits}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">أعلى كومبو</div>
              <div className="text-2xl font-bold text-rose-400">{gameState.maxCombo}x</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
