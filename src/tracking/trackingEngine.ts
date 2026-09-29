import { RawDetection, TrackedTarget, TargetType } from '../types/vision';

export interface TrackingOptions {
  iouThreshold: number;         // Minimum IOU to match same target (e.g. 0.20)
  maxDistanceThreshold: number; // Max normalized centroid distance (e.g. 0.45)
  maxLostFrames: number;        // Frames to keep tracking a lost object before discarding
  smoothingFactor: number;     // 0 to 1 for EMA position smoothing (0.65 = smooth & responsive)
  cameraFovHorizontalDeg: number; // Horizontal Field of View (e.g. 68 degrees for typical smartphone)
  cameraFovVerticalDeg: number;   // Vertical Field of View (e.g. 52 degrees)
}

const DEFAULT_OPTIONS: TrackingOptions = {
  iouThreshold: 0.18,
  maxDistanceThreshold: 0.45,
  maxLostFrames: 24,
  smoothingFactor: 0.65,
  cameraFovHorizontalDeg: 68,
  cameraFovVerticalDeg: 52,
};

export class TrackingEngine {
  private targets: Map<number, TrackedTarget> = new Map();
  private nextId: number = 1;
  private lockedTargetId: string | null = null;
  private options: TrackingOptions;
  private lastUpdateTime: number = performance.now();

  constructor(options: Partial<TrackingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public updateOptions(newOptions: Partial<TrackingOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  public lockTarget(id: string | null) {
    this.lockedTargetId = id;
    for (const target of this.targets.values()) {
      target.isLocked = (target.id === id);
    }
  }

  public getLockedTarget(): TrackedTarget | null {
    if (!this.lockedTargetId) return null;
    for (const target of this.targets.values()) {
      if (target.id === this.lockedTargetId) return target;
    }
    return null;
  }

  /**
   * Main tracking update step: associates raw detections with persistent tracked targets
   */
  public update(
    rawDetections: RawDetection[],
    frameWidth: number,
    frameHeight: number
  ): TrackedTarget[] {
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;

    const fw = frameWidth > 0 ? frameWidth : 640;
    const fh = frameHeight > 0 ? frameHeight : 480;

    // Convert raw detections to normalized boxes
    const normalizedDetections = rawDetections.map((d) => {
      const [px, py, pw, ph] = d.bbox;
      const x = Math.max(0, Math.min(1, px / fw));
      const y = Math.max(0, Math.min(1, py / fh));
      const width = Math.max(0.01, Math.min(1, pw / fw));
      const height = Math.max(0.01, Math.min(1, ph / fh));
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      return {
        raw: d,
        bbox: { x, y, width, height },
        pixelBbox: { x: px, y: py, width: pw, height: ph },
        centerX,
        centerY,
        label: d.class,
        confidence: d.score,
        targetType: this.normalizeTargetType(d.class, d.type),
      };
    });

    const activeTrackers = Array.from(this.targets.values());
    const matchedTrackers = new Set<number>();
    const matchedDetections = new Set<number>();

    // Step 1: Calculate cost matrix (weighted IoU + Centroid Distance)
    const matches: Array<{ trackerId: number; detIdx: number; score: number }> = [];

    for (let t = 0; t < activeTrackers.length; t++) {
      const tracker = activeTrackers[t];
      
      // Predict tracker's expected position based on velocity
      const predX = tracker.centerX + tracker.velocityX * dt;
      const predY = tracker.centerY + tracker.velocityY * dt;

      for (let d = 0; d < normalizedDetections.length; d++) {
        const det = normalizedDetections[d];

        const iou = this.calculateIoU(tracker.bbox, det.bbox);
        const dist = Math.hypot(det.centerX - predX, det.centerY - predY);

        if (dist <= this.options.maxDistanceThreshold || iou >= this.options.iouThreshold) {
          // Higher score = better match
          const matchScore = (iou * 0.6) + ((1 - Math.min(1, dist / this.options.maxDistanceThreshold)) * 0.4);
          matches.push({ trackerId: tracker.rawId, detIdx: d, score: matchScore });
        }
      }
    }

    // Sort matches by highest score first (Greedy Association)
    matches.sort((a, b) => b.score - a.score);

    for (const match of matches) {
      if (!matchedTrackers.has(match.trackerId) && !matchedDetections.has(match.detIdx)) {
        matchedTrackers.add(match.trackerId);
        matchedDetections.add(match.detIdx);

        const tracker = this.targets.get(match.trackerId);
        const det = normalizedDetections[match.detIdx];
        if (tracker && det) {
          this.updateTrackerWithDetection(tracker, det, dt, now);
        }
      }
    }

    // Step 2: Handle unmatched active trackers (lost frames)
    for (const tracker of activeTrackers) {
      if (!matchedTrackers.has(tracker.rawId)) {
        tracker.missedFrames++;
        // Extrapolate position with damping
        tracker.velocityX *= 0.85;
        tracker.velocityY *= 0.85;
        tracker.centerX += tracker.velocityX * dt;
        tracker.centerY += tracker.velocityY * dt;
        tracker.bbox.x = tracker.centerX - tracker.bbox.width / 2;
        tracker.bbox.y = tracker.centerY - tracker.bbox.height / 2;

        if (tracker.missedFrames > this.options.maxLostFrames) {
          this.targets.delete(tracker.rawId);
          if (this.lockedTargetId === tracker.id) {
            this.lockedTargetId = null;
          }
        }
      }
    }

    // Step 3: Handle new detections (create persistent targets)
    for (let d = 0; d < normalizedDetections.length; d++) {
      if (!matchedDetections.has(d)) {
        const det = normalizedDetections[d];
        const newRawId = this.nextId++;
        const targetNumberStr = newRawId < 10 ? `0${newRawId}` : `${newRawId}`;
        const prefix = det.targetType.toUpperCase();
        const persistentId = `${prefix} #${targetNumberStr}`;

        const newTarget: TrackedTarget = {
          id: persistentId,
          rawId: newRawId,
          label: det.label.charAt(0).toUpperCase() + det.label.slice(1),
          targetType: det.targetType,
          confidence: det.confidence,
          bbox: { ...det.bbox },
          pixelBbox: { ...det.pixelBbox },
          centerX: det.centerX,
          centerY: det.centerY,
          velocity: 0,
          velocityX: 0,
          velocityY: 0,
          headingAngle: 0,
          history: [{ x: det.centerX, y: det.centerY, timestamp: now }],
          firstSeen: now,
          lastSeen: now,
          trackingDuration: 0,
          totalDetections: 1,
          missedFrames: 0,
          isLocked: (this.lockedTargetId === persistentId),
          yawOffsetDeg: (det.centerX - 0.5) * this.options.cameraFovHorizontalDeg,
          pitchOffsetDeg: (det.centerY - 0.5) * this.options.cameraFovVerticalDeg,
          distanceEstimateMeters: this.estimateDistance(det.targetType, det.bbox.height),
        };

        this.targets.set(newRawId, newTarget);
      }
    }

    return Array.from(this.targets.values());
  }

  private updateTrackerWithDetection(
    tracker: TrackedTarget,
    det: {
      bbox: { x: number; y: number; width: number; height: number };
      pixelBbox: { x: number; y: number; width: number; height: number };
      centerX: number;
      centerY: number;
      label: string;
      confidence: number;
      targetType: TargetType;
    },
    dt: number,
    now: number
  ) {
    const alpha = this.options.smoothingFactor;

    // Instant velocity calculation before smoothing
    const instVx = (det.centerX - tracker.centerX) / dt;
    const instVy = (det.centerY - tracker.centerY) / dt;

    // Exponential Moving Average (EMA) smoothing for position & box
    tracker.centerX = tracker.centerX * (1 - alpha) + det.centerX * alpha;
    tracker.centerY = tracker.centerY * (1 - alpha) + det.centerY * alpha;
    tracker.bbox.width = tracker.bbox.width * (1 - alpha) + det.bbox.width * alpha;
    tracker.bbox.height = tracker.bbox.height * (1 - alpha) + det.bbox.height * alpha;
    tracker.bbox.x = tracker.centerX - tracker.bbox.width / 2;
    tracker.bbox.y = tracker.centerY - tracker.bbox.height / 2;

    tracker.pixelBbox = { ...det.pixelBbox };

    // Smooth velocity
    tracker.velocityX = tracker.velocityX * 0.5 + instVx * 0.5;
    tracker.velocityY = tracker.velocityY * 0.5 + instVy * 0.5;
    tracker.velocity = Math.hypot(tracker.velocityX, tracker.velocityY);

    // Calculate heading angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
    if (tracker.velocity > 0.02) {
      tracker.headingAngle = (Math.atan2(tracker.velocityY, tracker.velocityX) * 180 / Math.PI + 360) % 360;
    }

    // Confidence and metadata
    tracker.confidence = tracker.confidence * 0.3 + det.confidence * 0.7;
    tracker.lastSeen = now;
    tracker.trackingDuration = (now - tracker.firstSeen) / 1000;
    tracker.totalDetections++;
    tracker.missedFrames = 0;

    // Angular offsets from optical center (useful for robot gimbal / pan-tilt)
    tracker.yawOffsetDeg = (tracker.centerX - 0.5) * this.options.cameraFovHorizontalDeg;
    tracker.pitchOffsetDeg = (tracker.centerY - 0.5) * this.options.cameraFovVerticalDeg;
    tracker.distanceEstimateMeters = this.estimateDistance(tracker.targetType, tracker.bbox.height);

    // Append to trajectory history (keep last 30 points)
    tracker.history.push({ x: tracker.centerX, y: tracker.centerY, timestamp: now });
    if (tracker.history.length > 30) {
      tracker.history.shift();
    }
  }

  private calculateIoU(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): number {
    const xA = Math.max(a.x, b.x);
    const yA = Math.max(a.y, b.y);
    const xB = Math.min(a.x + a.width, b.x + b.width);
    const yB = Math.min(a.y + a.height, b.y + b.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;

    const unionArea = areaA + areaB - interArea;
    return unionArea <= 0 ? 0 : interArea / unionArea;
  }

  private normalizeTargetType(label: string, explicitType?: 'object' | 'face'): TargetType {
    if (explicitType === 'face' || label.toLowerCase().includes('face')) return 'face';
    const l = label.toLowerCase();
    if (l === 'person') return 'person';
    if (l === 'car' || l === 'truck' || l === 'bus' || l === 'motorcycle' || l === 'bicycle') return 'car';
    if (l === 'cup' || l === 'mug') return 'cup';
    if (l === 'bottle') return 'bottle';
    if (l === 'cell phone' || l === 'phone') return 'cell phone';
    if (l === 'laptop') return 'laptop';
    if (l === 'dog') return 'dog';
    if (l === 'cat') return 'cat';
    if (l === 'chair' || l === 'couch') return 'chair';
    return 'object';
  }

  private estimateDistance(type: TargetType, normHeight: number): number {
    if (normHeight <= 0) return 2.0;
    const referencePhysicalHeights: Record<string, number> = {
      person: 1.7,
      face: 0.22,
      car: 1.5,
      cup: 0.12,
      bottle: 0.25,
      'cell phone': 0.15,
      laptop: 0.25,
      dog: 0.55,
      cat: 0.3,
      chair: 0.9,
      object: 0.4,
    };
    const realH = referencePhysicalHeights[type] || 0.5;
    const focalFactor = 0.85;
    return parseFloat(Math.max(0.2, (realH * focalFactor) / normHeight).toFixed(2));
  }

  public clear() {
    this.targets.clear();
    this.lockedTargetId = null;
  }
}
