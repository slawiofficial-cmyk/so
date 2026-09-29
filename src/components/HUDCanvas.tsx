import React, { useRef, useEffect } from 'react';
import { TrackedTarget, VisionMetrics } from '../types/vision';
import { GameTarget, HitEffect } from '../types/game';

interface HUDCanvasProps {
  targets: TrackedTarget[];
  lockedTargetId: string | null;
  metrics: VisionMetrics;
  gameActive: boolean;
  gameTargets: GameTarget[];
  hitEffects: HitEffect[];
  showTrajectories: boolean;
  showTelemetryHUD: boolean;
  autoAimActive?: boolean;
  f16ModeActive?: boolean;
  crosshairPosition?: { x: number; y: number };
  onTargetClick: (target: TrackedTarget) => void;
  onCanvasShoot?: (x: number, y: number) => void;
}

export const HUDCanvas: React.FC<HUDCanvasProps> = ({
  targets,
  lockedTargetId,
  metrics,
  gameActive,
  gameTargets,
  hitEffects,
  showTrajectories,
  showTelemetryHUD,
  autoAimActive = true,
  f16ModeActive = true,
  crosshairPosition = { x: 0.5, y: 0.5 },
  onTargetClick,
  onCanvasShoot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle click / tap on canvas for target locking or game shooting
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // In game mode, trigger virtual laser shot at tapped position or center
    if (gameActive && onCanvasShoot) {
      onCanvasShoot(clickX, clickY);
      return;
    }

    // Otherwise check if a tracked target was tapped to select it
    for (const target of targets) {
      const { x, y, width, height } = target.bbox;
      if (
        clickX >= x - 0.04 &&
        clickX <= x + width + 0.04 &&
        clickY >= y - 0.04 &&
        clickY <= y + height + 0.04
      ) {
        onTargetClick(target);
        return;
      }
    }
  };

  useEffect(() => {
    let animationId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ensure canvas internal dimensions match display size
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const now = performance.now();

      // Find Primary / Locked Target for F-16 Auto-Lead calculation
      let primaryTarget: TrackedTarget | null = null;
      if (lockedTargetId) {
        primaryTarget = targets.find(t => t.id === lockedTargetId) || null;
      }
      if (!primaryTarget && targets.length > 0) {
        // Automatically select target closest to center
        primaryTarget = targets.reduce((prev, curr) => {
          const pDist = Math.hypot(prev.centerX - 0.5, prev.centerY - 0.5);
          const cDist = Math.hypot(curr.centerX - 0.5, curr.centerY - 0.5);
          return cDist < pDist ? curr : prev;
        }, targets[0]);
      }

      // Check active game drone target as well
      let primaryGameTarget: GameTarget | null = null;
      if (gameActive && gameTargets.length > 0) {
        primaryGameTarget = gameTargets.reduce((prev, curr) => {
          const pDist = Math.hypot(prev.x - crosshairPosition.x, prev.y - crosshairPosition.y);
          const cDist = Math.hypot(curr.x - crosshairPosition.x, curr.y - crosshairPosition.y);
          return cDist < pDist ? curr : prev;
        }, gameTargets[0]);
      }

      // ==========================================
      // 1. Draw F-16 Pitch Ladder & Avionics Grid
      // ==========================================
      if (f16ModeActive && showTelemetryHUD) {
        const centerX = width * 0.5;
        const centerY = height * 0.5;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.font = '10px "Share Tech Mono", monospace';

        // Horizon line (dashed)
        ctx.beginPath();
        ctx.setLineDash([12, 8]);
        ctx.moveTo(centerX - 160, centerY);
        ctx.lineTo(centerX - 50, centerY);
        ctx.moveTo(centerX + 50, centerY);
        ctx.lineTo(centerX + 160, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pitch ladder rungs (+10, -10 degrees)
        const rungs = [-15, -10, -5, 5, 10, 15];
        for (const deg of rungs) {
          const py = centerY - deg * 7;
          if (py < 60 || py > height - 60) continue;
          const isPos = deg > 0;
          const rWidth = isPos ? 50 : 40;

          ctx.beginPath();
          if (isPos) {
            ctx.setLineDash([]);
          } else {
            ctx.setLineDash([4, 4]);
          }
          // Left bar
          ctx.moveTo(centerX - 90 - rWidth, py);
          ctx.lineTo(centerX - 90, py);
          ctx.lineTo(centerX - 90, py + (isPos ? 6 : -6));

          // Right bar
          ctx.moveTo(centerX + 90 + rWidth, py);
          ctx.lineTo(centerX + 90, py);
          ctx.lineTo(centerX + 90, py + (isPos ? 6 : -6));
          ctx.stroke();

          // Degree number
          ctx.fillText(`${Math.abs(deg)}`, centerX - 115 - rWidth, py + 3);
          ctx.fillText(`${Math.abs(deg)}`, centerX + 95 + rWidth, py + 3);
        }
        ctx.setLineDash([]);

        // Flight Path Marker (FPM) - aircraft boresight symbol
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.8;
        const fpmX = centerX;
        const fpmY = centerY;
        const fpmR = 7;
        ctx.beginPath();
        ctx.arc(fpmX, fpmY, fpmR, 0, Math.PI * 2);
        // Wings
        ctx.moveTo(fpmX - fpmR, fpmY);
        ctx.lineTo(fpmX - fpmR - 10, fpmY);
        ctx.moveTo(fpmX + fpmR, fpmY);
        ctx.lineTo(fpmX + fpmR + 10, fpmY);
        // Vertical fin
        ctx.moveTo(fpmX, fpmY - fpmR);
        ctx.lineTo(fpmX, fpmY - fpmR - 7);
        ctx.stroke();
      }

      // ==========================================
      // 2. Draw Trajectory Paths for Tracked Targets
      // ==========================================
      if (showTrajectories) {
        for (const target of targets) {
          if (target.history.length > 2) {
            ctx.beginPath();
            const first = target.history[0];
            ctx.moveTo(first.x * width, first.y * height);

            for (let i = 1; i < target.history.length; i++) {
              const pt = target.history[i];
              ctx.lineTo(pt.x * width, pt.y * height);
            }

            ctx.strokeStyle = target.isLocked ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // ==========================================
      // 3. Draw Tracked Target Boxes & F-16 TD Boxes
      // ==========================================
      for (const target of targets) {
        const bx = target.bbox.x * width;
        const by = target.bbox.y * height;
        const bw = target.bbox.width * width;
        const bh = target.bbox.height * height;
        const cx = target.centerX * width;
        const cy = target.centerY * height;
        const isPrimary = (primaryTarget?.id === target.id);
        const isLocked = target.id === lockedTargetId || target.isLocked || isPrimary;

        let themeColor = '#38bdf8';
        if (isLocked) themeColor = '#ef4444';
        else if (target.targetType === 'face') themeColor = '#a855f7';
        else if (target.targetType === 'person') themeColor = '#06b6d4';
        else if (target.targetType === 'car') themeColor = '#f59e0b';

        ctx.strokeStyle = themeColor;
        ctx.fillStyle = themeColor;
        ctx.lineWidth = isLocked ? 2.5 : 1.8;

        // Draw F-16 Target Designator Box (TD Box)
        const cornerLen = Math.min(22, Math.min(bw, bh) * 0.3);

        ctx.beginPath();
        // Top Left
        ctx.moveTo(bx, by + cornerLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + cornerLen, by);

        // Top Right
        ctx.moveTo(bx + bw - cornerLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + cornerLen);

        // Bottom Right
        ctx.moveTo(bx + bw, by + bh - cornerLen);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw - cornerLen, by + bh);

        // Bottom Left
        ctx.moveTo(bx + cornerLen, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + bh - cornerLen);
        ctx.stroke();

        ctx.fillStyle = isLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.04)';
        ctx.fillRect(bx, by, bw, bh);

        // Center Pip
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = themeColor;
        ctx.fill();

        // F-16 Target Vector Line / Aspect Angle Line
        if (target.velocity > 0.03) {
          const vEndX = cx + target.velocityX * width * 0.35;
          const vEndY = cy + target.velocityY * height * 0.35;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(vEndX, vEndY);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(vEndX, vEndY, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();
        }

        // F-16 TD Box Data Tag
        const confPercent = Math.round(target.confidence * 100);
        const distEst = target.distanceEstimateMeters ? `${target.distanceEstimateMeters}M` : '1.8M';
        const vcKnots = Math.round(target.velocity * 120);

        const headerText = `[${target.id}] RNG:${distEst} VC:${vcKnots}KT`;
        ctx.font = 'bold 11px "Share Tech Mono", monospace';
        const textMetrics = ctx.measureText(headerText);
        const badgeW = textMetrics.width + 12;
        const badgeH = 18;

        ctx.fillStyle = isLocked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(10, 15, 29, 0.85)';
        ctx.fillRect(bx, Math.max(0, by - badgeH - 2), badgeW, badgeH);
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, Math.max(0, by - badgeH - 2), badgeW, badgeH);

        ctx.fillStyle = isLocked ? '#ffffff' : themeColor;
        ctx.fillText(headerText, bx + 6, Math.max(12, by - 6));

        // Pulsing F-16 Locked Diamond Box
        if (isLocked) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          const lockPulse = Math.sin(now / 120) * 3;
          const dr = Math.max(bw, bh) / 2 + 8 + lockPulse;

          ctx.beginPath();
          ctx.moveTo(cx, cy - dr);
          ctx.lineTo(cx + dr, cy);
          ctx.lineTo(cx, cy + dr);
          ctx.lineTo(cx - dr, cy);
          ctx.closePath();
          ctx.stroke();

          // In-Range / SHOOT Cue Flashing
          const isShootSolution = Math.abs(crosshairPosition.x - target.centerX) < 0.15 && Math.abs(crosshairPosition.y - target.centerY) < 0.15;
          if (isShootSolution && Math.floor(now / 200) % 2 === 0) {
            ctx.font = 'bold 14px "Chakra Petch", sans-serif';
            ctx.fillStyle = '#ef4444';
            ctx.fillText('⚡ IN RNG / SHOOT', bx + bw + 8, cy);
          }
        }
      }

      // ==========================================
      // 4. Draw Game Mode AR Targets (Drones/Spheres)
      // ==========================================
      if (gameActive) {
        for (const gTarget of gameTargets) {
          const gx = gTarget.x * width;
          const gy = gTarget.y * height;
          const gr = gTarget.radius * Math.min(width, height);

          ctx.save();
          ctx.translate(gx, gy);

          if (gTarget.isHit) {
            const progress = (now - (gTarget.hitTimestamp || now)) / 300;
            ctx.beginPath();
            ctx.arc(0, 0, gr * (1 + progress * 2), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(244, 63, 94, ${1 - progress})`;
            ctx.lineWidth = 4;
            ctx.stroke();
          } else {
            const rotSpeed = now / 400;
            ctx.beginPath();
            ctx.arc(0, 0, gr, 0, Math.PI * 2);
            ctx.strokeStyle = gTarget.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.rotate(rotSpeed);
            ctx.beginPath();
            ctx.arc(0, 0, gr * 1.25, 0, Math.PI * 0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, gr * 1.25, Math.PI, Math.PI * 1.4);
            ctx.stroke();

            ctx.rotate(-rotSpeed * 2);
            ctx.beginPath();
            ctx.arc(0, 0, gr * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = gTarget.color;
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-gr * 0.7, 0);
            ctx.lineTo(gr * 0.7, 0);
            ctx.moveTo(0, -gr * 0.7);
            ctx.lineTo(0, gr * 0.7);
            ctx.stroke();

            ctx.rotate(rotSpeed);
            ctx.font = 'bold 11px "Share Tech Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`${gTarget.name} +${gTarget.points}`, 0, -gr - 8);
            ctx.textAlign = 'left';
          }

          ctx.restore();
        }
      }

      // ==========================================
      // 5. Draw Floating Hit / Miss Effects
      // ==========================================
      for (const effect of hitEffects) {
        const age = now - effect.createdAt;
        const progress = age / 1200;
        if (progress > 1) continue;

        const fx = effect.x * width;
        const fy = effect.y * height - progress * 40;
        const alpha = Math.max(0, 1 - progress);

        ctx.font = effect.isCrit
          ? 'bold 20px "Chakra Petch", sans-serif'
          : 'bold 16px "Chakra Petch", sans-serif';
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 10;
        ctx.fillText(effect.text, fx, fy);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }

      // ==========================================
      // 6. F-16 LCOS Dynamic Auto-Lead Reticle & Gun Pipper
      // ==========================================
      const chX = crosshairPosition.x * width;
      const chY = crosshairPosition.y * height;
      const chSize = 30;

      // Draw Auto-Lead Guide Line from aircraft boresight center to dynamic pipper
      if (Math.hypot(crosshairPosition.x - 0.5, crosshairPosition.y - 0.5) > 0.02) {
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.5);
        ctx.lineTo(chX, chY);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(chX, chY);

      // Outer Gun Reticle Ring
      ctx.strokeStyle = gameActive || primaryTarget ? '#f43f5e' : 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, chSize, 0, Math.PI * 2);
      ctx.stroke();

      // Funnel dots / Stadiametric Range ticks (F-16 gun sight)
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const tx = Math.cos(angle) * (chSize + 5);
        const ty = Math.sin(angle) * (chSize + 5);
        ctx.beginPath();
        ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
      }

      // Center Crosshair Lines with gap
      const gap = 7;
      ctx.beginPath();
      ctx.moveTo(-chSize - 8, 0);
      ctx.lineTo(-gap, 0);
      ctx.moveTo(gap, 0);
      ctx.lineTo(chSize + 8, 0);
      ctx.moveTo(0, -chSize - 8);
      ctx.lineTo(0, -gap);
      ctx.moveTo(0, gap);
      ctx.lineTo(0, chSize + 8);
      ctx.stroke();

      // Center Laser / Bullet Dot
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // F-16 Pipper status badge
      ctx.font = 'bold 9px "Share Tech Mono", monospace';
      ctx.fillStyle = autoAimActive ? '#22c55e' : '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(autoAimActive ? 'F-16 AUTO-LEAD' : 'MANUAL', 0, chSize + 14);
      ctx.textAlign = 'left';

      ctx.restore();

      // ==========================================
      // 7. Top Compass Heading Tape
      // ==========================================
      if (showTelemetryHUD) {
        const topY = 24;
        const centerX = width / 2;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 130, topY);
        ctx.lineTo(centerX + 130, topY);
        ctx.stroke();

        for (let i = -4; i <= 4; i++) {
          const tickX = centerX + i * 28;
          const tickH = i === 0 ? 8 : (i % 2 === 0 ? 5 : 3);
          ctx.beginPath();
          ctx.moveTo(tickX, topY - tickH);
          ctx.lineTo(tickX, topY + tickH);
          ctx.stroke();
        }

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(centerX, topY + 10);
        ctx.lineTo(centerX - 5, topY + 16);
        ctx.lineTo(centerX + 5, topY + 16);
        ctx.closePath();
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    targets,
    lockedTargetId,
    metrics,
    gameActive,
    gameTargets,
    hitEffects,
    showTrajectories,
    showTelemetryHUD,
    autoAimActive,
    f16ModeActive,
    crosshairPosition,
  ]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="absolute inset-0 w-full h-full pointer-events-auto touch-none cursor-crosshair z-10"
    />
  );
};
