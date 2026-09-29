import React from 'react';
import { TrackedTarget } from '../types/vision';
import { Target, Lock, Crosshair, Zap, Compass, Activity, X } from 'lucide-react';

interface TargetDetailPanelProps {
  target: TrackedTarget | null;
  isLocked: boolean;
  onClose: () => void;
  onToggleLock: (target: TrackedTarget) => void;
  onFocusRobot?: (target: TrackedTarget) => void;
}

export const TargetDetailPanel: React.FC<TargetDetailPanelProps> = ({
  target,
  isLocked,
  onClose,
  onToggleLock,
  onFocusRobot,
}) => {
  if (!target) return null;

  const posXPercent = Math.round(target.centerX * 100);
  const posYPercent = Math.round(target.centerY * 100);
  const confPercent = Math.round(target.confidence * 100);
  const velVal = (target.velocity * 10).toFixed(1);
  const durationSec = target.trackingDuration.toFixed(1);

  return (
    <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 animate-in fade-in slide-in-from-bottom-6 duration-200">
      <div className={`hud-box rounded-xl p-4 text-slate-100 border ${isLocked ? 'border-red-500/50 hud-box-danger' : 'border-sky-500/40'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'}`}>
              <Target className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-bold text-lg tracking-wider text-slate-100">
                  {target.id}
                </span>
                {isLocked && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                    LOCKED
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono-hud">
                UID: 0x{target.rawId.toString(16).padStart(4, '0')} • {target.label}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5 my-3 font-mono-hud text-xs">
          
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Type / النوع</span>
            </div>
            <div className="font-bold text-slate-100 text-sm capitalize">
              {target.label}
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confidence / الثقة</span>
            </div>
            <div className="font-bold text-emerald-400 text-sm">
              {confPercent}%
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-sky-400" />
              <span>Position / الموقع</span>
            </div>
            <div className="font-bold text-slate-100 text-sm">
              X {posXPercent}% • Y {posYPercent}%
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Velocity / السرعة</span>
            </div>
            <div className="font-bold text-amber-400 text-sm">
              {velVal} <span className="text-[10px] text-slate-400">units/s</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 col-span-2 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-[11px]">Tracking Time / مدة التتبع</div>
              <div className="font-bold text-slate-200 text-sm">{durationSec} ثانية</div>
            </div>
            {target.distanceEstimateMeters && (
              <div className="text-right">
                <div className="text-slate-400 text-[11px]">Est. Distance / المسافة التقديرية</div>
                <div className="font-bold text-sky-400 text-sm">~{target.distanceEstimateMeters} م</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onToggleLock(target)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-cyber font-semibold text-xs transition-all ${
              isLocked
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/50 hover:bg-sky-500/30'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isLocked ? 'إلغاء القفل (Unlock)' : 'قفل التتبع (Lock)'}</span>
          </button>

          {onFocusRobot && (
            <button
              onClick={() => onFocusRobot(target)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-cyber font-semibold text-xs bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>توجيه الروبوت</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
