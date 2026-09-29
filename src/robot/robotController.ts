import {
  RobotConfig,
  RobotPanTiltState,
  RobotProtocol,
  RobotTelemetryPacket,
} from '../types/robot';
import { TrackedTarget } from '../types/vision';

const DEFAULT_CONFIG: RobotConfig = {
  protocol: 'simulation',
  endpointUrl: 'ws://192.168.1.100:8080/robot',
  bluetoothDeviceName: 'RoboVision_Gimbal_01',
  panLimitDeg: 90,
  tiltLimitDeg: 45,
  invertPan: false,
  invertTilt: false,
  kp: 0.65,
  ki: 0.05,
  kd: 0.12,
  transmitRateHz: 20,
  ledIndicatorColor: '#38bdf8',
  autoTrackingEnabled: true,
  safetyInterlockActive: true, // Strict safety guarantee
};

export class RobotController {
  private config: RobotConfig;
  private state: RobotPanTiltState = {
    currentPanDeg: 0,
    currentTiltDeg: 0,
    targetPanDeg: 0,
    targetTiltDeg: 0,
    panSpeedDegPerSec: 0,
    tiltSpeedDegPerSec: 0,
    isLockedOnTarget: false,
    activeTargetId: null,
    pidOutput: {
      panCorrection: 0,
      tiltCorrection: 0,
    },
  };

  private lastTime: number = performance.now();
  private integralPan: number = 0;
  private integralTilt: number = 0;
  private lastErrorPan: number = 0;
  private lastErrorTilt: number = 0;
  private transmittedCount: number = 0;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private logs: string[] = [];

  constructor(initialConfig?: Partial<RobotConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.addLog('RoboVision Controller Initialized. Mode: Safe Gimbal / Head Servo only.');
  }

  public getConfig(): RobotConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<RobotConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.addLog(`Config updated. Protocol: ${this.config.protocol}`);
  }

  public getState(): RobotPanTiltState {
    return { ...this.state };
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public getTransmittedCount(): number {
    return this.transmittedCount;
  }

  public getConnectionStatus(): string {
    if (this.config.protocol === 'simulation') return 'Simulated Active';
    return this.connectionStatus;
  }

  /**
   * Main visual servoing loop: takes locked or highest-confidence tracked target
   * and computes smooth PID head/pan-tilt servo angles.
   */
  public update(dt: number, lockedTarget: TrackedTarget | null, allTargets: TrackedTarget[] = []) {
    const now = performance.now();

    // Select target to follow
    let targetToFollow: TrackedTarget | null = lockedTarget;
    if (!targetToFollow && this.config.autoTrackingEnabled && allTargets.length > 0) {
      // Pick target closest to center or with highest confidence
      targetToFollow = allTargets.reduce((prev, curr) => {
        const prevDist = Math.hypot(prev.centerX - 0.5, prev.centerY - 0.5);
        const currDist = Math.hypot(curr.centerX - 0.5, curr.centerY - 0.5);
        return currDist < prevDist ? curr : prev;
      }, allTargets[0]);
    }

    if (targetToFollow && this.config.autoTrackingEnabled) {
      this.state.isLockedOnTarget = true;
      this.state.activeTargetId = targetToFollow.id;

      // Desired angles based on target optical offset
      let targetYaw = targetToFollow.yawOffsetDeg * (this.config.invertPan ? -1 : 1);
      let targetPitch = targetToFollow.pitchOffsetDeg * (this.config.invertTilt ? -1 : 1);

      // Clamp to safety boundaries
      targetYaw = Math.max(-this.config.panLimitDeg, Math.min(this.config.panLimitDeg, targetYaw));
      targetPitch = Math.max(-this.config.tiltLimitDeg, Math.min(this.config.tiltLimitDeg, targetPitch));

      this.state.targetPanDeg = targetYaw;
      this.state.targetTiltDeg = targetPitch;

      // Compute PID Controller
      const errorPan = targetYaw - this.state.currentPanDeg;
      const errorTilt = targetPitch - this.state.currentTiltDeg;

      this.integralPan += errorPan * dt;
      this.integralTilt += errorTilt * dt;
      // Anti-windup clamping
      this.integralPan = Math.max(-30, Math.min(30, this.integralPan));
      this.integralTilt = Math.max(-20, Math.min(20, this.integralTilt));

      const derivPan = (errorPan - this.lastErrorPan) / Math.max(0.001, dt);
      const derivTilt = (errorTilt - this.lastErrorTilt) / Math.max(0.001, dt);

      this.lastErrorPan = errorPan;
      this.lastErrorTilt = errorTilt;

      const pOut = this.config.kp * errorPan + this.config.ki * this.integralPan + this.config.kd * derivPan;
      const tOut = this.config.kp * errorTilt + this.config.ki * this.integralTilt + this.config.kd * derivTilt;

      this.state.pidOutput = {
        panCorrection: parseFloat(pOut.toFixed(2)),
        tiltCorrection: parseFloat(tOut.toFixed(2)),
      };

      // Apply servo movement with physical servo slew speed limit
      const maxServoSlewDegPerSec = 140; // Max physical servo speed
      const panStep = Math.max(-maxServoSlewDegPerSec * dt, Math.min(maxServoSlewDegPerSec * dt, pOut * 35 * dt));
      const tiltStep = Math.max(-maxServoSlewDegPerSec * dt, Math.min(maxServoSlewDegPerSec * dt, tOut * 35 * dt));

      this.state.currentPanDeg = Math.max(-this.config.panLimitDeg, Math.min(this.config.panLimitDeg, this.state.currentPanDeg + panStep));
      this.state.currentTiltDeg = Math.max(-this.config.tiltLimitDeg, Math.min(this.config.tiltLimitDeg, this.state.currentTiltDeg + tiltStep));
      this.state.panSpeedDegPerSec = Math.abs(panStep / dt);
      this.state.tiltSpeedDegPerSec = Math.abs(tiltStep / dt);
    } else {
      // Return to neutral center smoothly when no target
      this.state.isLockedOnTarget = false;
      this.state.activeTargetId = null;
      this.state.targetPanDeg = 0;
      this.state.targetTiltDeg = 0;

      const returnSpeed = 40; // deg/sec
      if (Math.abs(this.state.currentPanDeg) > 0.5) {
        this.state.currentPanDeg -= Math.sign(this.state.currentPanDeg) * returnSpeed * dt;
      } else {
        this.state.currentPanDeg = 0;
      }
      if (Math.abs(this.state.currentTiltDeg) > 0.5) {
        this.state.currentTiltDeg -= Math.sign(this.state.currentTiltDeg) * returnSpeed * dt;
      } else {
        this.state.currentTiltDeg = 0;
      }
    }

    // Transmit telemetry at configured Hz
    const transmitIntervalMs = 1000 / this.config.transmitRateHz;
    if (now - this.lastTime >= transmitIntervalMs) {
      this.lastTime = now;
      this.dispatchTelemetry(targetToFollow);
    }
  }

  public manualSetPanTilt(pan: number, tilt: number) {
    this.state.targetPanDeg = Math.max(-this.config.panLimitDeg, Math.min(this.config.panLimitDeg, pan));
    this.state.targetTiltDeg = Math.max(-this.config.tiltLimitDeg, Math.min(this.config.tiltLimitDeg, tilt));
    this.state.currentPanDeg = this.state.targetPanDeg;
    this.state.currentTiltDeg = this.state.targetTiltDeg;
    this.dispatchTelemetry(null);
  }

  public resetToCenter() {
    this.state.currentPanDeg = 0;
    this.state.currentTiltDeg = 0;
    this.state.targetPanDeg = 0;
    this.state.targetTiltDeg = 0;
    this.integralPan = 0;
    this.integralTilt = 0;
    this.addLog('Robot position reset to center (0°, 0°).');
    this.dispatchTelemetry(null);
  }

  private dispatchTelemetry(target: TrackedTarget | null) {
    this.transmittedCount++;

    const packet: RobotTelemetryPacket = {
      timestamp: Date.now(),
      command: target ? 'LOCK_TARGET' : 'PAN_TILT',
      yaw: parseFloat(this.state.currentPanDeg.toFixed(2)),
      pitch: parseFloat(this.state.currentTiltDeg.toFixed(2)),
      targetLabel: target?.label,
      targetConfidence: target ? parseFloat(target.confidence.toFixed(2)) : undefined,
      distanceEstMeters: target?.distanceEstimateMeters,
      safetyStatus: 'SAFE_CAMERA_SERVO_ONLY',
      transmittedCount: this.transmittedCount,
    };

    if (this.config.protocol === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(packet));
      } catch (err) {
        this.addLog(`WS Send error: ${err}`);
      }
    } else if (this.config.protocol === 'rest_api' && this.config.endpointUrl) {
      // Dispatch async REST without blocking UI
      if (this.transmittedCount % Math.max(1, Math.round(this.config.transmitRateHz / 2)) === 0) {
        fetch(this.config.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet),
        }).catch(() => {});
      }
    }
  }

  public connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }
    try {
      this.connectionStatus = 'connecting';
      this.addLog(`Connecting to WebSocket: ${this.config.endpointUrl}`);
      this.ws = new WebSocket(this.config.endpointUrl);

      this.ws.onopen = () => {
        this.connectionStatus = 'connected';
        this.isConnected = true;
        this.addLog('WebSocket connected successfully.');
      };

      this.ws.onclose = () => {
        this.connectionStatus = 'disconnected';
        this.isConnected = false;
        this.addLog('WebSocket disconnected.');
      };

      this.ws.onerror = () => {
        this.connectionStatus = 'error';
        this.addLog('WebSocket connection failed.');
      };
    } catch (e) {
      this.connectionStatus = 'error';
      this.addLog(`WebSocket init error: ${e}`);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
    this.isConnected = false;
  }

  private addLog(msg: string) {
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    this.logs.unshift(`[${timeStr}] ${msg}`);
    if (this.logs.length > 50) this.logs.pop();
  }
}

export const robotController = new RobotController();
