export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  facing: 'environment' | 'user' | 'unknown';
}

export class CameraManager {
  private currentStream: MediaStream | null = null;
  private currentFacing: 'environment' | 'user' = 'environment';
  private currentDeviceId: string | null = null;
  private isInitializing: boolean = false;
  private permissionGranted: boolean = false;
  private devices: CameraDeviceInfo[] = [];

  public async getAvailableCameras(): Promise<CameraDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');

      this.devices = videoDevices.map(d => {
        let facing: 'environment' | 'user' | 'unknown' = 'unknown';
        const label = (d.label || '').toLowerCase();
        if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          facing = 'environment';
        } else if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
          facing = 'user';
        }
        return {
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          facing,
        };
      });

      return this.devices;
    } catch {
      return [];
    }
  }

  public async startCamera(
    videoElement: HTMLVideoElement,
    facing: 'environment' | 'user' = this.currentFacing,
    deviceId?: string
  ): Promise<MediaStream | null> {
    if (this.isInitializing) return null;
    this.isInitializing = true;

    this.stopCamera();
    this.currentFacing = facing;
    this.currentDeviceId = deviceId || null;

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: facing },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
          },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.permissionGranted = true;

      videoElement.srcObject = stream;
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isInitializing = false;
      await this.getAvailableCameras();
      return stream;
    } catch (err) {
      console.warn('Primary camera init failed, attempting generic fallback constraints:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.currentStream = fallbackStream;
        this.permissionGranted = true;
        videoElement.srcObject = fallbackStream;
        await videoElement.play();
        this.isInitializing = false;
        return fallbackStream;
      } catch (fallbackErr) {
        console.error('Camera permission denied or camera unavailable:', fallbackErr);
        this.isInitializing = false;
        return null;
      }
    }
  }

  public toggleFacing(videoElement: HTMLVideoElement): Promise<MediaStream | null> {
    const nextFacing = this.currentFacing === 'environment' ? 'user' : 'environment';
    return this.startCamera(videoElement, nextFacing);
  }

  public stopCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }
  }

  public getFacing(): 'environment' | 'user' {
    return this.currentFacing;
  }

  public isStreamActive(): boolean {
    return this.currentStream !== null && this.currentStream.active;
  }

  public hasPermission(): boolean {
    return this.permissionGranted;
  }
}

export const cameraManager = new CameraManager();
