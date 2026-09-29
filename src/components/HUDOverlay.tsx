import React from 'react';
import { VisionMetrics } from '../types/vision';
import { GameScoreState } from '../types/game';
import {
  Activity,
  Battery,
  Camera,
  Crosshair,
  Flame,
  Mic,
  Shield,
  Trophy,
  Zap,
  Target,
  Plane,
} from 'lucide-react';

interface HUDOverlayProps {
  metrics: VisionMetrics;
  gameState: GameScoreState;
  isGameActive: boolean;
  isVoiceListening: boolean;
  autoAimActive: boolean;
  autoFireActive: boolean;
  isTargetLocked: boolean;
  lockedTargetLabel?: string;
  onToggleCamera: () => void;
  onToggleBatterySaver: () => void;
  onToggleAutoAim: () => void;
  onToggleAutoFire: () => void;
  onShootVirtualLaser?: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  metrics,
  gameState,
  isGameActive,
  isVoiceListening,
  autoAimActive,
  autoFireActive,
  isTargetLocked,
  lockedTargetLabel,
  onToggleCamera,
  onToggleBatterySaver,
  onToggleAutoAim,
  onToggleAutoFire,
  onShootVirtualLaser,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 md:p-4 select-none">
      {/* Top Status Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Left Telemetry Cluster */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="hud-box rounded-lg px-2.5 py-1.5 flex items-center gap-2.5 font-mono-hud text-xs border border-sky-500/30">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-emerald-400">F-16 RADAR</span>
            </div>

            <div className="h-3 w-px bg-slate-700" />

            {/* FPS */}
            <div className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-300">FPS:</span>
              <span className={`font-bold ${metrics.fps >= 24 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics.fps}
              </span>
            </div>

            <div className="h-3 w-px bg-slate-700 hidden sm:block" />

            {/* Targets Count */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400">TRK:</span>
              <span className="text-amber-400 font-bold">{metrics.activeTargetsCount}</span>
            </div>
          </div>

          {/* F-16 Target Lock Status Alert */}
          {isTargetLocked && (
            <div className="hud-box rounded-lg px-2.5 py-1 flex items-center gap-2 font-mono-hud text-xs bg-red-500/20 border-red-500/50 text-red-400 animate-pulse">
              <Target className="w-3.5 h-3.5 text-red-400 animate-spin" />
              <span className="font-bold font-cyber">RADAR LOCK: {lockedTargetLabel || 'TARGET'}</span>
              <span className="text-[10px] px-1 py-0.2 bg-red-600 text-white rounded font-bold">IN RNG</span>
            </div>
          )}

          {/* Voice Listening Active Banner */}
          {isVoiceListening && (
            <div className="hud-box rounded-lg px-3 py-1 flex items-center gap-2 font-mono-hud text-xs bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse">
              <Mic className="w-3.5 h-3.5 animate-bounce" />
              <span>VOICE AI LISTENING / استماع...</span>
            </div>
          )}
        </div>

        {/* Right Action Quick Buttons (F-16 Auto-Aim & Auto-Fire Toggles) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* F-16 Auto-Aim Mode Button */}
          <button
            onClick={onToggleAutoAim}
            title="F-16 Auto-Aim / توجيه وتتبع آلي F-16"
            className={`hud-box px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-cyber text-xs transition-all border ${
              autoAimActive
                ? 'bg-sky-500/25 text-sky-300 border-sky-400 shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 border-slate-700 bg-slate-900/80'
            }`}
          >
            <Plane className={`w-3.5 h-3.5 ${autoAimActive ? 'text-sky-400 animate-pulse' : ''}`} />
            <span className="font-bold">تتبع F-16</span>
          </button>

          {/* F-16 Auto-Fire Mode Button */}
          <button
            onClick={onToggleAutoFire}
            title="Auto-Fire / إطلاق واصطياد تلقائي عند القفل"
            className={`hud-box px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-cyber text-xs transition-all border ${
              autoFireActive
                ? 'bg-red-500/25 text-red-300 border-red-500 shadow-md shadow-red-500/30 animate-pulse'
                : 'text-slate-400 hover:text-slate-200 border-slate-700 bg-slate-900/80'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoFireActive ? 'text-red-400 fill-current' : ''}`} />
            <span className="font-bold">إطلاق تلقائي</span>
          </button>

          {/* Battery Saver */}
          <button
            onClick={onToggleBatterySaver}
            title="Battery Saver Mode"
            className={`hud-box p-2 rounded-lg transition-all ${
              metrics.batterySaverActive
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200 border-slate-700 bg-slate-900/80'
            }`}
          >
            <Battery className="w-4 h-4" />
          </button>

          {/* Switch Camera */}
          <button
            onClick={onToggleCamera}
            title="Switch Camera (Front / Back)"
            className="hud-box p-2 rounded-lg text-slate-300 hover:text-sky-400 border-slate-700 hover:border-sky-500/50 bg-slate-900/80 transition-all"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game Mode HUD Card (Only displayed during active Target Challenge) */}
      {isGameActive && (
        <div className="self-start pointer-events-auto my-auto animate-in fade-in slide-in-from-left duration-300">
          <div className="hud-box rounded-xl p-3.5 font-mono-hud border-red-500/40 bg-slate-950/85 max-w-[280px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                <Crosshair className="w-4 h-4 animate-spin" />
                <span>TARGET CHALLENGE</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                {gameState.difficulty}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" /> SCORE:
                </span>
                <span className="text-lg font-bold text-yellow-400">
                  {gameState.score.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">TIME:</span>
                <span className={`font-bold ${gameState.timeRemainingSec <= 10 ? 'text-red-400 animate-ping' : 'text-slate-200'}`}>
                  {gameState.timeRemainingSec.toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-[10px]">HITS / MISS</span>
                  <div className="font-bold text-slate-200">
                    <span className="text-emerald-400">{gameState.hits}</span> / <span className="text-rose-400">{gameState.misses}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">ACCURACY</span>
                  <div className="font-bold text-sky-400">{gameState.accuracy}%</div>
                </div>
              </div>

              {gameState.combo > 1 && (
                <div className="pt-1.5 flex items-center justify-between bg-amber-500/10 rounded px-2 py-1 border border-amber-500/30">
                  <span className="text-amber-400 flex items-center gap-1 font-bold text-[11px]">
                    <Flame className="w-3.5 h-3.5" /> COMBO {gameState.combo}x
                  </span>
                  <span className="text-amber-300 font-bold text-xs">
                    {gameState.multiplier}x MULTIPLIER
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Center Safe Virtual Trigger Button */}
      {isGameActive && onShootVirtualLaser && (
        <div className="self-center pointer-events-auto pb-4 flex flex-col items-center gap-1.5">
          <button
            onClick={onShootVirtualLaser}
            className="flex items-center gap-2 px-8 py-3 rounded-full font-cyber font-bold text-sm bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 active:scale-95 transition-all border border-red-400/40"
          >
            <Zap className="w-5 h-5 fill-current animate-pulse" />
            <span>VIRTUAL CANNON TRIGGER / إطلاق يدوي</span>
          </button>
          {autoFireActive && (
            <span className="text-[10px] font-mono-hud text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
              ⚡ الإطلاق التلقائي نشط (AUTO-ENGAGE ENGAGED)
            </span>
          )}
        </div>
      )}

      {/* Bottom Corner Safety Interlock Badge */}
      <div className="flex items-center justify-between text-[11px] font-mono-hud text-slate-400 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>F-16 AVIONICS SIMULATION • SAFE VIRTUAL LASER ONLY</span>
        </div>
      </div>
    </div>
  );
};
