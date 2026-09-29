/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { CameraManager, cameraManager, CameraDeviceInfo } from './vision/cameraManager';
import { VisionDetector, DetectorConfig } from './vision/detector';
import { TrackingEngine } from './tracking/trackingEngine';
import { TargetChallengeGame } from './game/gameEngine';
import { robotController } from './robot/robotController';
import { voiceAssistant } from './voice/voiceAssistant';
import { soundSynth } from './audio/soundSynthesizer';

import { TrackedTarget, VisionMetrics } from './types/vision';
import { GameDifficulty, GameMode, GameScoreState, GameTarget, HitEffect } from './types/game';
import { RobotConfig, RobotPanTiltState } from './types/robot';
import { VoiceConfig, VoiceIntent, VoiceMessage } from './types/voice';

import { ControlNav, ActiveTab } from './components/ControlNav';
import { VisionView } from './components/views/VisionView';
import { TrackingView } from './components/views/TrackingView';
import { TargetChallengeView } from './components/views/TargetChallengeView';
import { RobotView } from './components/views/RobotView';
import { VoiceView } from './components/views/VoiceView';
import { StatsView } from './components/views/StatsView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  // Navigation & Active View
  const [activeTab, setActiveTab] = useState<ActiveTab>('vision');

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Vision & Tracking instances
  const detectorRef = useRef<VisionDetector>(new VisionDetector());
  const trackerRef = useRef<TrackingEngine>(new TrackingEngine());
  const gameRef = useRef<TargetChallengeGame>(new TargetChallengeGame('normal'));

  // Camera State
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  // Vision & Tracking State
  const [targets, setTargets] = useState<TrackedTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<TrackedTarget | null>(null);
  const [lockedTarget, setLockedTarget] = useState<TrackedTarget | null>(null);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);

  // F-16 Auto-Aim & Auto-Fire System State
  const [autoAimActive, setAutoAimActive] = useState<boolean>(true);
  const [autoFireActive, setAutoFireActive] = useState<boolean>(true);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const crosshairPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const lastAutoFireTimeRef = useRef<number>(0);

  // Metrics
  const [metrics, setMetrics] = useState<VisionMetrics>({
    fps: 0,
    detectionLatencyMs: 0,
    trackingLatencyMs: 0,
    activeTargetsCount: 0,
    frameWidth: 640,
    frameHeight: 480,
    batterySaverActive: false,
    modelLoaded: false,
    backend: 'webgl',
  });

  // Game Mode State
  const [gameState, setGameState] = useState<GameScoreState>(gameRef.current.getState());
  const [gameTargets, setGameTargets] = useState<GameTarget[]>([]);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('virtual_drones');

  // Robot Controller State
  const [robotConfig, setRobotConfig] = useState<RobotConfig>(robotController.getConfig());
  const [robotState, setRobotState] = useState<RobotPanTiltState>(robotController.getState());
  const [robotLogs, setRobotLogs] = useState<string[]>(robotController.getLogs());
  const [robotTransmittedCount, setRobotTransmittedCount] = useState<number>(0);

  // Voice Assistant State
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(voiceAssistant.getConfig());
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>(voiceAssistant.getMessages());
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);

  // Audio state
  const [soundVolume, setSoundVolume] = useState<number>(0.7);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // Gemini multimodal analysis state
  const [geminiAnalysisText, setGeminiAnalysisText] = useState<string | null>(null);
  const [isAnalyzingGemini, setIsAnalyzingGemini] = useState<boolean>(false);

  // Loop & Detection Throttling references
  const lastFrameTimeRef = useRef<number>(performance.now());
  const lastDetectionTimeRef = useRef<number>(performance.now());
  const fpsCountRef = useRef<number>(0);
  const fpsLastReportRef = useRef<number>(performance.now());
  const isProcessingFrameRef = useRef<boolean>(false);

  // =========================================================
  // 1. Initial Setup: Camera, Models, Voice Callbacks
  // =========================================================
  useEffect(() => {
    // Setup Game State Callback
    gameRef.current.setCallback((newState) => {
      setGameState(newState);
      if (newState.isGameOver && newState.score > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    });

    // Setup Voice Assistant Callback
    voiceAssistant.setCallbacks(
      (msgs) => setVoiceMessages(msgs),
      (intent) => handleVoiceIntent(intent)
    );

    // Initialize Neural Detector
    detectorRef.current.init().then((loaded) => {
      setMetrics((m) => ({
        ...m,
        modelLoaded: loaded,
        backend: detectorRef.current.getBackend(),
      }));
    });

    // Auto-request Camera on startup
    initCamera();

    return () => {
      cameraManager.stopCamera();
    };
  }, []);

  // Handle Intent triggered by voice
  const handleVoiceIntent = useCallback((intent: VoiceIntent) => {
    switch (intent) {
      case 'START_GAME':
        gameRef.current.startGame();
        setActiveTab('vision');
        break;
      case 'STOP_ALL':
        gameRef.current.stopGame();
        trackerRef.current.lockTarget(null);
        setLockedTarget(null);
        robotController.resetToCenter();
        break;
      case 'TRACK_TARGET': {
        const currentList = Array.from(trackerRef.current.update([], 640, 480));
        if (currentList.length > 0) {
          const t = currentList[0];
          trackerRef.current.lockTarget(t.id);
          setLockedTarget(t);
        }
        break;
      }
      case 'SWITCH_CAMERA':
        handleToggleCamera();
        break;
      case 'ROBOT_CENTER':
        robotController.resetToCenter();
        break;
      default:
        break;
    }
  }, []);

  const initCamera = async (deviceId?: string) => {
    if (!videoRef.current) return;
    setIsCameraLoading(true);
    setCameraError(null);

    const stream = await cameraManager.startCamera(videoRef.current, 'environment', deviceId);
    if (stream) {
      setHasCameraPermission(true);
      setIsCameraLoading(false);
      const cameras = await cameraManager.getAvailableCameras();
      setAvailableCameras(cameras);
    } else {
      setHasCameraPermission(false);
      setIsCameraLoading(false);
      setCameraError('لم يتم منح إذن الوصول للكاميرا أو الجهاز لا يحتوي على كاميرا نشطة.');
    }
  };

  const handleToggleCamera = async () => {
    if (!videoRef.current) return;
    soundSynth.playUIClick();
    const stream = await cameraManager.toggleFacing(videoRef.current);
    if (stream) {
      setHasCameraPermission(true);
      const cameras = await cameraManager.getAvailableCameras();
      setAvailableCameras(cameras);
    }
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    await initCamera(deviceId);
  };

  // =========================================================
  // 2. High-Performance Frame Loop & F-16 Auto-Aim / Auto-Fire
  // =========================================================
  useEffect(() => {
    let animId: number;

    const frameLoop = async () => {
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;

      // Calculate FPS
      fpsCountRef.current++;
      if (now - fpsLastReportRef.current >= 1000) {
        const currentFps = fpsCountRef.current;
        fpsCountRef.current = 0;
        fpsLastReportRef.current = now;
        setMetrics((prev) => ({ ...prev, fps: currentFps }));
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        // Detection Throttling & Frame Skipping (Battery Saver)
        const isBatterySaver = detectorRef.current['config'].batterySaver;
        const detectionIntervalMs = isBatterySaver ? 140 : 45;

        if (!isProcessingFrameRef.current && now - lastDetectionTimeRef.current >= detectionIntervalMs) {
          isProcessingFrameRef.current = true;
          lastDetectionTimeRef.current = now;

          const tStart = performance.now();
          const rawDetections = await detectorRef.current.detect(video);
          const tDetect = performance.now() - tStart;

          const tTrackStart = performance.now();
          const activeTargets = trackerRef.current.update(rawDetections, vw, vh);
          const tTrack = performance.now() - tTrackStart;

          setTargets(activeTargets);

          // Update current locked target reference
          const currentLocked = trackerRef.current.getLockedTarget();
          setLockedTarget(currentLocked);

          // Sync with Robot Controller Visual Servoing
          robotController.update(dt, currentLocked, activeTargets);
          setRobotState(robotController.getState());
          setRobotLogs(robotController.getLogs());
          setRobotTransmittedCount(robotController.getTransmittedCount());

          setMetrics((prev) => ({
            ...prev,
            detectionLatencyMs: Math.round(tDetect),
            trackingLatencyMs: Math.round(tTrack),
            activeTargetsCount: activeTargets.length,
            frameWidth: vw,
            frameHeight: vh,
          }));

          isProcessingFrameRef.current = false;
        }

        // Update active targets position motion if moving
        if (targets.length > 0) {
          const updatedMovingTargets = targets.map((t) => {
            if (t.velocity > 0.01) {
              const nx = t.centerX + t.velocityX * dt;
              const ny = t.centerY + t.velocityY * dt;
              // Bounce inside bounds
              let vx = t.velocityX;
              let vy = t.velocityY;
              if (nx > 0.85 || nx < 0.15) vx = -vx;
              if (ny > 0.85 || ny < 0.15) vy = -vy;

              return {
                ...t,
                centerX: Math.max(0.1, Math.min(0.9, nx)),
                centerY: Math.max(0.1, Math.min(0.9, ny)),
                velocityX: vx,
                velocityY: vy,
                bbox: {
                  ...t.bbox,
                  x: Math.max(0.05, Math.min(0.85, nx - t.bbox.width / 2)),
                  y: Math.max(0.05, Math.min(0.85, ny - t.bbox.height / 2)),
                },
              };
            }
            return t;
          });
          // Update targets state if changed
          if (updatedMovingTargets.some((t, i) => t.centerX !== targets[i]?.centerX)) {
            setTargets(updatedMovingTargets);
          }
        }

        // Target Challenge Game Engine Loop update
        gameRef.current.update(dt, targets);
        const activeGameTargets = gameRef.current.getTargets();
        setGameTargets(activeGameTargets);
        setHitEffects(gameRef.current.getHitEffects());

        // =========================================================
        // F-16 Auto-Lead Sight Slew & Auto-Target Engagement Engine
        // =========================================================
        let targetDestinationX = 0.5;
        let targetDestinationY = 0.5;
        let activeLockEntity: { x: number; y: number; radius?: number } | null = null;

        // Priority 1: Active Game Targets (Drones)
        if (gameState.isActive && activeGameTargets.length > 0) {
          const nearestDrone = activeGameTargets.reduce((prev, curr) => {
            const pDist = Math.hypot(prev.x - crosshairPosRef.current.x, prev.y - crosshairPosRef.current.y);
            const cDist = Math.hypot(curr.x - crosshairPosRef.current.x, curr.y - crosshairPosRef.current.y);
            return cDist < pDist ? curr : prev;
          }, activeGameTargets[0]);

          // Lead prediction: position + velocity offset
          targetDestinationX = nearestDrone.x + nearestDrone.vx * 0.16;
          targetDestinationY = nearestDrone.y + nearestDrone.vy * 0.16;
          activeLockEntity = { x: nearestDrone.x, y: nearestDrone.y, radius: nearestDrone.radius };
        }
        // Priority 2: Real Camera Tracked Targets (Person, Face, Car, Cup, etc.)
        else if (targets.length > 0) {
          const lockedOrNearest = lockedTarget || targets[0];
          // Lead calculation based on velocity
          targetDestinationX = lockedOrNearest.centerX + lockedOrNearest.velocityX * 0.15;
          targetDestinationY = lockedOrNearest.centerY + lockedOrNearest.velocityY * 0.15;
          activeLockEntity = {
            x: lockedOrNearest.centerX,
            y: lockedOrNearest.centerY,
            radius: Math.max(0.08, (lockedOrNearest.bbox.width + lockedOrNearest.bbox.height) / 4),
          };
        }

        if (autoAimActive && activeLockEntity) {
          // Smooth hydraulic slewing towards lead point
          const slewSpeed = 12.0; // Responsive tracking speed
          const nextX = crosshairPosRef.current.x + (targetDestinationX - crosshairPosRef.current.x) * (dt * slewSpeed);
          const nextY = crosshairPosRef.current.y + (targetDestinationY - crosshairPosRef.current.y) * (dt * slewSpeed);

          crosshairPosRef.current = {
            x: Math.max(0.05, Math.min(0.95, nextX)),
            y: Math.max(0.05, Math.min(0.95, nextY)),
          };
          setCrosshairPos({ ...crosshairPosRef.current });

          // Auto-Fire / Auto-Engagement Trigger
          if (autoFireActive) {
            const targetRadius = activeLockEntity.radius || 0.12;
            const distToTarget = Math.hypot(
              crosshairPosRef.current.x - activeLockEntity.x,
              crosshairPosRef.current.y - activeLockEntity.y
            );

            // If solution is solved (Pipper on target) and fire rate cooldown passed (every 220ms)
            if (distToTarget <= targetRadius * 1.05 && now - lastAutoFireTimeRef.current >= 220) {
              lastAutoFireTimeRef.current = now;
              gameRef.current.triggerShot(crosshairPosRef.current.x, crosshairPosRef.current.y);
            }
          }
        } else {
          // Smoothly return crosshair to center
          const returnSpeed = 6.0;
          crosshairPosRef.current = {
            x: crosshairPosRef.current.x + (0.5 - crosshairPosRef.current.x) * (dt * returnSpeed),
            y: crosshairPosRef.current.y + (0.5 - crosshairPosRef.current.y) * (dt * returnSpeed),
          };
          setCrosshairPos({ ...crosshairPosRef.current });
        }
      }

      animId = requestAnimationFrame(frameLoop);
    };

    animId = requestAnimationFrame(frameLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [targets, lockedTarget, autoAimActive, autoFireActive, gameState.isActive]);

  // =========================================================
  // 3. User Interactions & Action Handlers
  // =========================================================
  const handleToggleLock = (target: TrackedTarget) => {
    soundSynth.playLockOn();
    if (lockedTarget?.id === target.id) {
      trackerRef.current.lockTarget(null);
      setLockedTarget(null);
    } else {
      trackerRef.current.lockTarget(target.id);
      setLockedTarget(target);
    }
  };

  const handleShootVirtualLaser = (x: number = crosshairPos.x, y: number = crosshairPos.y) => {
    gameRef.current.triggerShot(x, y);
  };

  const handleToggleAutoAim = () => {
    soundSynth.playUIClick();
    setAutoAimActive((prev) => !prev);
  };

  const handleToggleAutoFire = () => {
    soundSynth.playUIClick();
    setAutoFireActive((prev) => !prev);
  };

  const handleToggleBatterySaver = () => {
    soundSynth.playUIClick();
    const current = detectorRef.current['config'].batterySaver;
    detectorRef.current.updateConfig({ batterySaver: !current });
    setMetrics((prev) => ({ ...prev, batterySaverActive: !current }));
  };

  const handleToggleVoiceListening = () => {
    soundSynth.playUIClick();
    if (isVoiceListening) {
      voiceAssistant.stopListening();
      setIsVoiceListening(false);
    } else {
      const started = voiceAssistant.startListening();
      setIsVoiceListening(started);
    }
  };

  const handleSendVoiceMessage = (text: string) => {
    voiceAssistant.handleUserSpeech(text, targets);
  };

  const handleUpdateSound = (vol: number, muted: boolean) => {
    setSoundVolume(vol);
    setIsSoundMuted(muted);
    soundSynth.setVolume(vol);
    soundSynth.setMuted(muted);
  };

  // Multimodal Gemini Scene Analysis Snapshot
  const handleAnalyzeWithGemini = async () => {
    if (!videoRef.current || isAnalyzingGemini) return;
    setIsAnalyzingGemini(true);
    setGeminiAnalysisText('جارٍ التقاط المشهد وتحليله بواسطة الذكاء الاصطناعي...');
    soundSynth.playScanPing();

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(640, video.videoWidth || 640);
      canvas.height = Math.min(480, video.videoHeight || 480);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);

        const detectedLabels = targets.map((t) => t.label);

        const res = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            language: voiceConfig.language,
            detectedLabels,
          }),
        });

        const data = await res.json();
        if (data.success && data.analysis) {
          setGeminiAnalysisText(data.analysis);
          if (voiceConfig.autoSpeakResponses) {
            voiceAssistant.speak(data.analysis);
          }
        } else {
          const offlineDesc = targets.length > 0
            ? `تحليل الرؤية المحلية: يتم رصد ${targets.length} أهداف نشطة (${targets.map(t => t.id).join('، ')}). تم قفل منظومة F-16 على الهدف.`
            : 'تحليل الرؤية المحلية: لا توجد عوائق أو أهداف مباشرة أمام الكاميرا.';
          setGeminiAnalysisText(offlineDesc);
          if (voiceConfig.autoSpeakResponses) {
            voiceAssistant.speak(offlineDesc);
          }
        }
      }
    } catch {
      const offlineDesc = targets.length > 0
        ? `رؤية محلية: تم رصد ${targets.length} أهداف نشطة (${targets.map(t => t.id).join('، ')}).`
        : 'رؤية محلية: المشهد خالٍ من الأهداف.';
      setGeminiAnalysisText(offlineDesc);
    } finally {
      setIsAnalyzingGemini(false);
    }
  };

  const handleSpawnTestTarget = () => {
    soundSynth.playLockOn();
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    const rndX = vw * (0.2 + Math.random() * 0.5);
    const rndY = vh * (0.2 + Math.random() * 0.4);
    const rndW = vw * 0.22;
    const rndH = vh * 0.32;

    const testTypes = ['person', 'face', 'cup', 'car', 'drone', 'bottle'];
    const chosenType = testTypes[Math.floor(Math.random() * testTypes.length)];

    const updated = trackerRef.current.update(
      [
        {
          bbox: [rndX, rndY, rndW, rndH],
          class: chosenType,
          score: 0.96,
          type: chosenType === 'face' ? 'face' : 'object',
        },
      ],
      vw,
      vh
    );

    // Give the target smooth velocity for realistic moving target tracking
    const movingList = updated.map((t) => {
      const vx = (Math.random() > 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.15);
      const vy = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.12);
      return {
        ...t,
        velocity: Math.hypot(vx, vy),
        velocityX: vx,
        velocityY: vy,
      };
    });

    setTargets(movingList);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Main Dynamic View Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'vision' && (
          <VisionView
            videoRef={videoRef}
            targets={targets}
            lockedTarget={lockedTarget}
            metrics={metrics}
            gameState={gameState}
            gameTargets={gameTargets}
            hitEffects={hitEffects}
            isGameActive={gameState.isActive}
            isVoiceListening={isVoiceListening}
            showTrajectories={showTrajectories}
            autoAimActive={autoAimActive}
            autoFireActive={autoFireActive}
            crosshairPosition={crosshairPos}
            selectedTarget={selectedTarget}
            hasCameraPermission={hasCameraPermission}
            isCameraLoading={isCameraLoading}
            cameraError={cameraError}
            onRequestCamera={() => initCamera()}
            onToggleCamera={handleToggleCamera}
            onToggleBatterySaver={handleToggleBatterySaver}
            onToggleAutoAim={handleToggleAutoAim}
            onToggleAutoFire={handleToggleAutoFire}
            onSelectTarget={(t) => setSelectedTarget(t)}
            onToggleLock={handleToggleLock}
            onFocusRobot={(t) => {
              handleToggleLock(t);
              setActiveTab('robot');
            }}
            onShootVirtualLaser={handleShootVirtualLaser}
            onAnalyzeWithGemini={handleAnalyzeWithGemini}
            onSpawnTestTarget={handleSpawnTestTarget}
            geminiAnalysisText={geminiAnalysisText}
            isAnalyzingGemini={isAnalyzingGemini}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingView
            targets={targets}
            lockedTargetId={lockedTarget?.id || null}
            showTrajectories={showTrajectories}
            onToggleTrajectories={() => setShowTrajectories(!showTrajectories)}
            onSelectTarget={(t) => {
              setSelectedTarget(t);
              setActiveTab('vision');
            }}
            onToggleLock={handleToggleLock}
          />
        )}

        {activeTab === 'challenge' && (
          <TargetChallengeView
            gameState={gameState}
            onStartGame={() => gameRef.current.startGame()}
            onStopGame={() => gameRef.current.stopGame()}
            onSetDifficulty={(d: GameDifficulty) => gameRef.current.setDifficulty(d)}
            onSetGameMode={(m: GameMode) => {
              setSelectedGameMode(m);
              gameRef.current.setGameMode(m);
            }}
            selectedMode={selectedGameMode}
            onSwitchToVisionTab={() => setActiveTab('vision')}
          />
        )}

        {activeTab === 'robot' && (
          <RobotView
            config={robotConfig}
            state={robotState}
            logs={robotLogs}
            transmittedCount={robotTransmittedCount}
            connectionStatus={robotController.getConnectionStatus()}
            onUpdateConfig={(c) => {
              robotController.updateConfig(c);
              setRobotConfig(robotController.getConfig());
            }}
            onResetCenter={() => robotController.resetToCenter()}
            onManualPanTilt={(p, t) => robotController.manualSetPanTilt(p, t)}
            onConnectWebSocket={() => robotController.connectWebSocket()}
            onDisconnectWebSocket={() => robotController.disconnect()}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceView
            config={voiceConfig}
            messages={voiceMessages}
            isListening={isVoiceListening}
            onToggleListening={handleToggleVoiceListening}
            onSendMessage={handleSendVoiceMessage}
            onClearMessages={() => voiceAssistant.clearMessages()}
            onUpdateConfig={(c) => {
              voiceAssistant.updateConfig(c);
              setVoiceConfig(voiceAssistant.getConfig());
            }}
            onSpeak={(txt) => voiceAssistant.speak(txt)}
          />
        )}

        {activeTab === 'stats' && <StatsView />}

        {activeTab === 'settings' && (
          <SettingsView
            cameras={availableCameras}
            selectedCameraId={selectedCameraId}
            onSelectCamera={handleSelectCamera}
            detectorConfig={detectorRef.current['config']}
            onUpdateDetectorConfig={(c) => detectorRef.current.updateConfig(c)}
            voiceConfig={voiceConfig}
            onUpdateVoiceConfig={(c) => {
              voiceAssistant.updateConfig(c);
              setVoiceConfig(voiceAssistant.getConfig());
            }}
            soundVolume={soundVolume}
            isSoundMuted={isSoundMuted}
            onUpdateSound={handleUpdateSound}
          />
        )}
      </main>

      {/* Cyberpunk Main Control Bar */}
      <ControlNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          soundSynth.playUIClick();
          setActiveTab(tab);
        }}
        targetCount={targets.length}
        isGameActive={gameState.isActive}
        isRobotConnected={robotController.getConnectionStatus().includes('Active') || robotController.getConnectionStatus().includes('connected')}
      />
    </div>
  );
}
