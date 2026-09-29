import React from 'react';
import { CameraDeviceInfo } from '../../vision/cameraManager';
import { DetectorConfig } from '../../vision/detector';
import { VoiceConfig } from '../../types/voice';
import {
  Settings,
  Camera,
  Cpu,
  Battery,
  Shield,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';

interface SettingsViewProps {
  cameras: CameraDeviceInfo[];
  selectedCameraId: string | null;
  onSelectCamera: (deviceId: string) => void;
  detectorConfig: DetectorConfig;
  onUpdateDetectorConfig: (config: Partial<DetectorConfig>) => void;
  voiceConfig: VoiceConfig;
  onUpdateVoiceConfig: (config: Partial<VoiceConfig>) => void;
  soundVolume: number;
  isSoundMuted: boolean;
  onUpdateSound: (vol: number, muted: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  detectorConfig,
  onUpdateDetectorConfig,
  voiceConfig,
  onUpdateVoiceConfig,
  soundVolume,
  isSoundMuted,
  onUpdateSound,
}) => {
  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto pb-24 font-mono-hud">
      {/* Header */}
      <div className="hud-box p-4 rounded-xl border border-sky-500/30 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-cyber text-slate-100">
            إعدادات النظام والرؤية (System & Vision Settings)
          </h2>
          <p className="text-xs text-slate-400">
            تخصيص الكاميرا، عتبة الثقة، توفير البطارية، والصوت
          </p>
        </div>
      </div>

      {/* Camera Selection */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-cyber font-bold text-slate-200">
          <Camera className="w-4 h-4 text-sky-400" />
          <span>اختيار الكاميرا (Camera Device Source)</span>
        </div>

        {cameras.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {cameras.map((cam) => {
              const isSelected = selectedCameraId === cam.deviceId || (!selectedCameraId && cam.facing === 'environment');
              return (
                <button
                  key={cam.deviceId}
                  onClick={() => onSelectCamera(cam.deviceId)}
                  className={`p-3 rounded-lg text-right flex items-center justify-between border transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-bold text-slate-200">{cam.label}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{cam.facing} Mode</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            جارٍ استخدام الكاميرا الافتراضية للجهاز.
          </div>
        )}
      </div>

      {/* AI Vision & Tracking Confidence */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-cyber font-bold text-slate-200">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>حساسية الرؤية وعتبة الاكتشاف (Detection Thresholds)</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>الحد الأدنى لثقة الاكتشاف (Min Confidence):</span>
              <span className="text-emerald-400 font-bold">{Math.round(detectorConfig.minConfidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.85"
              step="0.05"
              value={detectorConfig.minConfidence}
              onChange={(e) => onUpdateDetectorConfig({ minConfidence: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400"
            />
            <span className="text-[10px] text-slate-500">
              القيمة المنخفضة تكتشف أهدافاً أكثر، والقيمة المرتفعة تمنع الاكتشافات الخاطئة.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>الحد الأقصى للأهداف المتزامنة (Max Simultaneous Targets):</span>
              <span className="text-sky-400 font-bold">{detectorConfig.maxDetections}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={detectorConfig.maxDetections}
              onChange={(e) => onUpdateDetectorConfig({ maxDetections: parseInt(e.target.value, 10) })}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-slate-200 font-bold">اكتشاف وتتبع الوجوه (Face Detection)</div>
              <div className="text-[10px] text-slate-500">تمييز الوجوه البشرية عن باقي الأجسام</div>
            </div>
            <button
              onClick={() => onUpdateDetectorConfig({ detectFaces: !detectorConfig.detectFaces })}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                detectorConfig.detectFaces
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {detectorConfig.detectFaces ? 'مفعّل (ON)' : 'معطل (OFF)'}
            </button>
          </div>
        </div>
      </div>

      {/* Performance & Battery Saver */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-cyber font-bold text-slate-200">
          <Battery className="w-4 h-4 text-amber-400" />
          <span>وضع توفير الطاقة والحرارة (Battery & Thermal Saver)</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-200 text-xs font-bold">
              تخفيض معدل المعالجة التلقائي (Frame Skipping)
            </div>
            <div className="text-[10px] text-slate-500">
              يقلل استهلاك المعالج بنسبة تصل إلى 40% ويحافظ على برودة الهاتف.
            </div>
          </div>
          <button
            onClick={() => onUpdateDetectorConfig({ batterySaver: !detectorConfig.batterySaver })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              detectorConfig.batterySaver
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {detectorConfig.batterySaver ? 'نشط (Active)' : 'معطل'}
          </button>
        </div>
      </div>

      {/* Sound & Voice Settings */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-cyber font-bold text-slate-200">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>المؤثرات الصوتية والمساعد (Sound & Audio FX)</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>مستوى صوت المؤثرات الليزرية والروبوت:</span>
              <span className="text-sky-400 font-bold">{Math.round(soundVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateSound(soundVolume, !isSoundMuted)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-sky-400"
              >
                {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => onUpdateSound(parseFloat(e.target.value), isSoundMuted)}
                className="flex-1 accent-sky-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-slate-200 font-bold">النطق الصوتي التلقائي للإجابات</div>
              <div className="text-[10px] text-slate-500">قراءة النتائج بالصوت عبر مكبر الهاتف</div>
            </div>
            <button
              onClick={() => onUpdateVoiceConfig({ autoSpeakResponses: !voiceConfig.autoSpeakResponses })}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                voiceConfig.autoSpeakResponses
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {voiceConfig.autoSpeakResponses ? 'مفعّل' : 'صامت'}
            </button>
          </div>
        </div>
      </div>

      {/* Privacy & Safety Guarantee */}
      <div className="hud-box p-4 rounded-xl border border-emerald-500/30 bg-slate-950/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-cyber font-bold text-emerald-400">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>سياسة الخصوصية والأمان الصارمة (Privacy Guarantee)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          جميع عمليات الرؤية الحاسوبية، وتتبع الأجسام والوجوه، وحساب الإحداثيات تتم كلياً على معالج هاتفك محلياً (On-Device Offline Vision).
          لا يتم رفع بث الكاميرا أو صور الوجوه لأي خوادم خارجية.
        </p>
      </div>
    </div>
  );
};
