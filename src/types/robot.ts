export type RobotProtocol = 'simulation' | 'websocket' | 'bluetooth' | 'rest_api';

export interface RobotPanTiltState {
  currentPanDeg: number;   // -90 to +90 deg (Yaw)
  currentTiltDeg: number;  // -45 to +45 deg (Pitch)
  targetPanDeg: number;
  targetTiltDeg: number;
  panSpeedDegPerSec: number;
  tiltSpeedDegPerSec: number;
  isLockedOnTarget: boolean;
  activeTargetId: string | null;
  pidOutput: {
    panCorrection: number;
    tiltCorrection: number;
  };
}

export interface RobotConfig {
  protocol: RobotProtocol;
  endpointUrl: string;     // e.g. "ws://192.168.1.50:8080/robot" or "http://192.168.1.50:5000/api/move"
  bluetoothDeviceName: string;
  panLimitDeg: number;     // max 90
  tiltLimitDeg: number;    // max 45
  invertPan: boolean;
  invertTilt: boolean;
  kp: number;              // PID Proportional Gain
  ki: number;              // PID Integral Gain
  kd: number;              // PID Derivative Gain
  transmitRateHz: number;  // 10 - 50 Hz
  ledIndicatorColor: string;
  autoTrackingEnabled: boolean;
  safetyInterlockActive: boolean;
}

export interface RobotTelemetryPacket {
  timestamp: number;
  command: 'PAN_TILT' | 'LOCK_TARGET' | 'IDLE' | 'LED_SET';
  yaw: number;
  pitch: number;
  targetLabel?: string;
  targetConfidence?: number;
  distanceEstMeters?: number;
  safetyStatus: 'SAFE_CAMERA_SERVO_ONLY' | 'DISARMED';
  batteryLevel?: number;
  transmittedCount: number;
}
