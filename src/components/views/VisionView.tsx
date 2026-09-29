import React from 'react';
import { HUDCanvas } from '../HUDCanvas';
import { HUDOverlay } from '../HUDOverlay';
import { TargetDetailPanel } from '../TargetDetailPanel';
import { TrackedTarget, VisionMetrics } from '../../types/vision';
import { GameScoreState, GameTarget, HitEffect } from '../../types/game';
import { Camera, RefreshCw, Sparkles, AlertCircle, Scan, PlusCircle } from 'lucide-react';

interface VisionViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  targets: TrackedTarget[];
  lockedTarget: TrackedTarget | null;
  metrics: VisionMetrics;
  gameState: GameScoreState;
  gameTargets: GameTarget[];
  hitEffects: HitEffect[];
  isGameActive: boolean;
  isVoiceListening: boolean;
  showTrajectories: boolean;
  autoAimActive: boolean;
  autoFireActive: boolean;
  crosshairPosition: { x: number; y: number };
  selectedTarget: TrackedTarget | null;
  hasCameraPermission: boolean;
  isCameraLoading: boolean;
  cameraError: string | null;
  onRequestCamera: () => void;
  onToggleCamera: () => void;
  onToggleBatterySaver: () => void;
  onToggleAutoAim: () => void;
  onToggleAutoFire: () => void;
  onSelectTarget: (target: TrackedTarget | null) => void;
  onToggleLock: (target: TrackedTarget) => void;
  onFocusRobot?: (target: TrackedTarget) => void;
  onShootVirtualLaser: (x?: number, y?: number) => void;
  onAnalyzeWithGemini?: () => void;
  onSpawnTestTarget?: () => void;
  geminiAnalysisText?: string | null;
  isAnalyzingGemini?: boolean;
}

export const VisionView: React.FC<VisionViewProps> = ({
  videoRef,
  targets,
  lockedTarget,
  metrics,
  gameState,
  gameTargets,
  hitEffects,
  isGameActive,
  isVoiceListening,
  showTrajectories,
  autoAimActive,
  autoFireActive,
  crosshairPosition,
  selectedTarget,
  hasCameraPermission,
  isCameraLoading,
  cameraError,
  onRequestCamera,
  onToggleCamera,
  onToggleBatterySaver,
  onToggleAutoAim,
  onToggleAutoFire,
  onSelectTarget,
  onToggleLock,
  onFocusRobot,
  onShootVirtualLaser,
  onAnalyzeWithGemini,
  onSpawnTestTarget,
  geminiAnalysisText,
  isAnalyzingGemini,
}) => {
  return (
    <div className="relative w-full h-[calc(100vh-68px)] bg-slate-950 overflow-hidden flex items-center justify-center">
      
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover select-none"
      />

      {/* Futuristic Scanlines & Vignette */}
      <div className="absolute inset-0 scanlines pointer-events-none z-10 opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none z-10" />

      {/* Real-time F-16 Canvas Render Overlay */}
      <HUDCanvas
        targets={targets}
        lockedTargetId={lockedTarget?.id || null}
        metrics={metrics}
        gameActive={isGameActive}
        gameTargets={gameTargets}
        hitEffects={hitEffects}
        showTrajectories={showTrajectories}
        showTelemetryHUD={true}
        autoAimActive={autoAimActive}
        f16ModeActive={true}
        crosshairPosition={crosshairPosition}
        onTargetClick={(target) => onSelectTarget(target)}
        onCanvasShoot={(x, y) => onShootVirtualLaser(x, y)}
      />

      {/* Top and Floating F-16 HUD Controls */}
      <HUDOverlay
        metrics={metrics}
        gameState={gameState}
        isGameActive={isGameActive}
        isVoiceListening={isVoiceListening}
        autoAimActive={autoAimActive}
        autoFireActive={autoFireActive}
        isTargetLocked={!!lockedTarget || targets.length > 0}
        lockedTargetLabel={lockedTarget?.id || (targets[0] ? targets[0].id : undefined)}
        onToggleCamera={onToggleCamera}
        onToggleBatterySaver={onToggleBatterySaver}
        onToggleAutoAim={onToggleAutoAim}
        onToggleAutoFire={onToggleAutoFire}
        onShootVirtualLaser={() => onShootVirtualLaser(crosshairPosition.x, crosshairPosition.y)}
      />

      {/* Target Detail Drawer (When an item is clicked) */}
      <TargetDetailPanel
        target={selectedTarget}
        isLocked={selectedTarget?.id === lockedTarget?.id}
        onClose={() => onSelectTarget(null)}
        onToggleLock={(t) => onToggleLock(t)}
        onFocusRobot={onFocusRobot}
      />

      {/* Gemini AI Scene Insight Pill / Drawer */}
      {geminiAnalysisText && (
        <div className="absolute top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="hud-box p-3.5 rounded-xl border border-purple-500/50 bg-slate-950/90 text-xs font-mono-hud text-slate-200 space-y-1.5 shadow-xl">
            <div className="flex items-center justify-between text-purple-400 font-bold font-cyber">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                تحليل المشهد المتقدم (AI Scene Insight)
              </span>
            </div>
            <p className="leading-relaxed text-slate-300">{geminiAnalysisText}</p>
          </div>
        </div>
      )}

      {/* Bottom Floating Quick Actions */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        {onAnalyzeWithGemini && (
          <button
            onClick={onAnalyzeWithGemini}
            disabled={isAnalyzingGemini}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber font-semibold bg-slate-900/90 text-purple-300 border border-purple-500/40 hover:bg-purple-950/40 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAnalyzingGemini ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحليل المشهد</span>
          </button>
        )}

        {onSpawnTestTarget && (
          <button
            onClick={onSpawnTestTarget}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-cyber font-semibold bg-slate-900/90 text-sky-300 border border-sky-500/40 hover:bg-sky-950/40 transition-all shadow-lg active:scale-95"
            title="إضافة هدف متحرك للاختبار"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>+ هدف تجريبي</span>
          </button>
        )}
      </div>

      {/* Camera Permission / Fallback Dialog */}
      {!hasCameraPermission && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="hud-box p-6 rounded-2xl max-w-md w-full border border-sky-500/40 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/40">
              <Camera className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-cyber text-slate-100">
                تفعيل الكاميرا (Camera Access)
              </h3>
              <p className="text-xs text-slate-400 font-mono-hud mt-1">
                يحتاج تطبيق RoboVision AI إلى إذن الكاميرا لتحليل البيئة في الوقت الحقيقي وتتبع الأجسام والوجوه.
              </p>
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono-hud flex items-center gap-2 text-right">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            <button
              onClick={onRequestCamera}
              disabled={isCameraLoading}
              className="w-full py-3 rounded-xl font-cyber font-bold text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isCameraLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ تشغيل الكاميرا...</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  <span>منح الإذن وبدء الرؤية</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
