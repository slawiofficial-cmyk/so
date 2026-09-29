import React from 'react';
import { TrackedTarget } from '../../types/vision';
import { Target, Lock, Unlock, Compass, Activity, Clock, Crosshair, ArrowUpRight } from 'lucide-react';

interface TrackingViewProps {
  targets: TrackedTarget[];
  lockedTargetId: string | null;
  showTrajectories: boolean;
  onToggleTrajectories: () => void;
  onSelectTarget: (target: TrackedTarget) => void;
  onToggleLock: (target: TrackedTarget) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  targets,
  lockedTargetId,
  showTrajectories,
  onToggleTrajectories,
  onSelectTarget,
  onToggleLock,
}) => {
  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto overflow-y-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 hud-box p-4 rounded-xl border border-sky-500/30">
        <div>
          <h2 className="text-xl font-bold font-cyber text-sky-400 flex items-center gap-2">
            <Target className="w-6 h-6 text-sky-400 animate-pulse" />
            <span>نظام التتبع المتقدم (Multi-Object Tracking Engine)</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono-hud mt-1">
            Centroid & IoU Association • Persistent IDs • Velocity Vectors • Trajectory Smoothing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTrajectories}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-hud transition-all border ${
              showTrajectories
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {showTrajectories ? '✓ مسارات الحركة مفعّلة' : 'مسارات الحركة معطلة'}
          </button>
        </div>
      </div>

      {/* Target Directory List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono-hud text-slate-400 px-1">
          <span>الأهداف النشطة حالياً ({targets.length})</span>
          <span>PERSISTENT TRACKING REGISTRY</span>
        </div>

        {targets.length === 0 ? (
          <div className="hud-box p-8 rounded-xl text-center space-y-2 border border-slate-800">
            <Crosshair className="w-10 h-10 text-slate-600 mx-auto animate-spin" />
            <p className="text-sm text-slate-300 font-cyber font-semibold">
              لا توجد أهداف نشطة في مجال الرؤية حالياً
            </p>
            <p className="text-xs text-slate-500 font-mono-hud">
              وجّه الكاميرا نحو شخص، وجه، سيارة، كوب، أو أي عنصر أمامك لبدء التتبع التلقائي.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {targets.map((target) => {
              const isLocked = target.id === lockedTargetId || target.isLocked;
              const posX = Math.round(target.centerX * 100);
              const posY = Math.round(target.centerY * 100);
              const conf = Math.round(target.confidence * 100);
              const vel = (target.velocity * 10).toFixed(1);

              return (
                <div
                  key={target.id}
                  onClick={() => onSelectTarget(target)}
                  className={`hud-box p-4 rounded-xl cursor-pointer transition-all border hover:scale-[1.01] ${
                    isLocked
                      ? 'border-red-500/50 hud-box-danger'
                      : 'border-slate-800 hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isLocked ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-cyber font-bold text-sm text-slate-100 flex items-center gap-2">
                          <span>{target.id}</span>
                          {isLocked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded border border-red-500/40">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono-hud">
                          Type: {target.label} • UID: #{target.rawId}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(target);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isLocked
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-sky-400'
                      }`}
                    >
                      {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 font-mono-hud text-xs">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <div className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" /> الثقة
                      </div>
                      <div className="font-bold text-emerald-400 text-sm">{conf}%</div>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <div className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Compass className="w-3 h-3 text-sky-400" /> الإحداثيات
                      </div>
                      <div className="font-bold text-slate-200 text-sm">
                        {posX}% , {posY}%
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <div className="text-slate-500 text-[10px] flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-amber-400" /> السرعة
                      </div>
                      <div className="font-bold text-amber-400 text-sm">{vel}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono-hud text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> مدة التتبع: {target.trackingDuration.toFixed(1)} ث
                    </span>
                    {target.distanceEstimateMeters && (
                      <span className="text-sky-400">
                        مسافة: ~{target.distanceEstimateMeters} م
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
