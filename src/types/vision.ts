export type TargetType = 'person' | 'face' | 'car' | 'cup' | 'bottle' | 'cell phone' | 'laptop' | 'dog' | 'cat' | 'chair' | 'vehicle' | 'object' | 'custom';

export interface BoundingBox {
  x: number;      // normalized 0-1 or pixel
  y: number;
  width: number;
  height: number;
}

export interface RawDetection {
  bbox: [number, number, number, number]; // [x, y, width, height] in pixel coordinates
  class: string;
  score: number;
  type?: 'object' | 'face';
}

export interface TrackedTarget {
  id: string;             // Persistent unique ID e.g. "TARGET #01", "PERSON #04", "FACE #02"
  rawId: number;          // Numeric ID for tracking stability
  label: string;          // e.g. "Person", "Face", "Car", "Cup"
  targetType: TargetType;
  confidence: number;     // 0 - 1
  
  // Normalized coordinates (0 to 1 relative to video frame)
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Center coordinates (0 to 1)
  centerX: number;
  centerY: number;
  
  // Physical/Pixel dimensions in current frame
  pixelBbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Motion & Telemetry
  velocity: number;       // Normalized units / second
  velocityX: number;
  velocityY: number;
  headingAngle: number;   // Degrees (0-360)
  
  // Trajectory history for path visualization
  history: Array<{ x: number; y: number; timestamp: number }>;
  
  // Lifecycle
  firstSeen: number;      // Timestamp (ms)
  lastSeen: number;       // Timestamp (ms)
  trackingDuration: number; // Seconds active
  totalDetections: number;
  missedFrames: number;
  isLocked: boolean;      // User / Robot locked target
  
  // Pan-Tilt Servo offsets (-100% to +100% relative to center)
  yawOffsetDeg: number;   // Estimated degrees from center horizontal FOV
  pitchOffsetDeg: number; // Estimated degrees from center vertical FOV
  distanceEstimateMeters?: number;
}

export interface VisionMetrics {
  fps: number;
  detectionLatencyMs: number;
  trackingLatencyMs: number;
  activeTargetsCount: number;
  frameWidth: number;
  frameHeight: number;
  batterySaverActive: boolean;
  modelLoaded: boolean;
  backend: string;
}
