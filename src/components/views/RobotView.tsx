import React, { useState } from 'react';
import { RobotConfig, RobotPanTiltState, RobotProtocol } from '../../types/robot';
import {
  Bot,
  Compass,
  RotateCcw,
  Shield,
  Sliders,
  Terminal,
  Wifi,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface RobotViewProps {
  config: RobotConfig;
  state: RobotPanTiltState;
  logs: string[];
  transmittedCount: number;
  connectionStatus: string;
  onUpdateConfig: (config: Partial<RobotConfig>) => void;
  onResetCenter: () => void;
  onManualPanTilt: (pan: number, tilt: number) => void;
  onConnectWebSocket: () => void;
  onDisconnectWebSocket: () => void;
}

export const RobotView: React.FC<RobotViewProps> = ({
  config,
  state,
  logs,
  transmittedCount,
  connectionStatus,
  onUpdateConfig,
  onResetCenter,
  onManualPanTilt,
  onConnectWebSocket,
  onDisconnectWebSocket,
}) => {
  const [showAdvancedPID, setShowAdvancedPID] = useState(false);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto overflow-y-auto pb-24">
      {/* Header Banner */}
      <div className="hud-box p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold font-cyber text-slate-100">
                مركز تحكم وتوجيه الروبوت (Robot Gimbal Center)
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-mono-hud">
              Visual Servoing • PID Tracking Loop • WebSocket / BLE / REST Telemetry Bridge
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetCenter}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-cyber text-xs bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة توجيه للوسط (Center)</span>
            </button>
          </div>
        </div>

        {/* Safety Boundary Interlock */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-emerald-400 font-mono-hud">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            بروتوكول السلامة نشط: الأوامر مقيدة حصرياً بمحركات توجيه الكاميرا/الرأس (Pan/Tilt Gimbal) والمؤشرات الضوئية.
          </span>
        </div>
      </div>

      {/* Main Pan/Tilt 2D Visualizer + Telemetry Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Visual Gimbal Radar */}
        <div className="hud-box p-5 rounded-xl border border-sky-500/30 lg:col-span-2 flex flex-col items-center justify-center relative min-h-[300px]">
          <div className="absolute top-3 left-4 text-xs font-mono-hud text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>محاكي حركة الجيمبل ثلاثي الأبعاد (2-Axis Servo Visualizer)</span>
          </div>

          {/* Servo Radar Sphere */}
          <div className="w-64 h-64 rounded-full border-2 border-slate-800 relative flex items-center justify-center bg-slate-950/60 shadow-inner my-6">
            {/* Grid Crosshair */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700/60" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-700/60" />

            {/* Concentric angle circles */}
            <div className="w-44 h-44 rounded-full border border-slate-800/80" />
            <div className="w-24 h-24 rounded-full border border-slate-800/80" />

            {/* Target Crosshair Position (Desired angle) */}
            <div
              className="absolute w-8 h-8 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center transition-all duration-150 pointer-events-none"
              style={{
                transform: `translate(${state.targetPanDeg * 1.2}px, ${state.targetTiltDeg * 1.2}px)`,
              }}
            >
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            </div>

            {/* Current Servo Head Position (Smoothed actual servo) */}
            <div
              className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/40 transition-all duration-75 text-slate-950 font-bold text-[10px]"
              style={{
                transform: `translate(${state.currentPanDeg * 1.2}px, ${state.currentTiltDeg * 1.2}px)`,
              }}
            >
              CAM
            </div>
          </div>

          {/* Angle Readouts */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm font-mono-hud text-center">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">YAW (الأفقي - Pan)</div>
              <div className="text-lg font-bold text-sky-400">{state.currentPanDeg.toFixed(1)}°</div>
              <div className="text-[10px] text-slate-500">الهدف: {state.targetPanDeg.toFixed(1)}°</div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-xs">PITCH (العمودي - Tilt)</div>
              <div className="text-lg font-bold text-sky-400">{state.currentTiltDeg.toFixed(1)}°</div>
              <div className="text-[10px] text-slate-500">الهدف: {state.targetTiltDeg.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        {/* Telemetry & Protocol Status */}
        <div className="space-y-4">
          <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-sm font-cyber font-bold text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <span>بيانات التوافق والاتصال (Protocol)</span>
            </div>

            <div className="space-y-2 font-mono-hud text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">البروتوكول:</span>
                <span className="font-bold text-amber-400 uppercase">{config.protocol}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">حالة الاتصال:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {connectionStatus}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">الحزم المرسلة:</span>
                <span className="font-bold text-sky-400">{transmittedCount.toLocaleString()} pkt</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">معدل البث:</span>
                <span className="font-bold text-slate-200">{config.transmitRateHz} Hz</span>
              </div>
            </div>

            {/* Protocol Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] text-slate-400 font-mono-hud">تغيير البروتوكول:</label>
              <select
                value={config.protocol}
                onChange={(e) => onUpdateConfig({ protocol: e.target.value as RobotProtocol })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono-hud outline-none focus:border-sky-500"
              >
                <option value="simulation">محاكاة داخلية (Simulation)</option>
                <option value="websocket">خادم WebSocket (ESP32 / ROS2 / Python)</option>
                <option value="rest_api">واجهة REST API (HTTP POST)</option>
                <option value="bluetooth">بلوتوث Web BLE</option>
              </select>
            </div>

            {config.protocol === 'websocket' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={config.endpointUrl}
                  onChange={(e) => onUpdateConfig({ endpointUrl: e.target.value })}
                  placeholder="ws://192.168.1.50:8080/robot"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono-hud"
                />
                <div className="flex gap-2">
                  <button
                    onClick={onConnectWebSocket}
                    className="flex-1 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 text-xs font-mono-hud hover:bg-sky-500/30"
                  >
                    اتصال (Connect)
                  </button>
                  <button
                    onClick={onDisconnectWebSocket}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono-hud hover:bg-slate-700"
                  >
                    قطع الاتصال
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Auto-Tracking */}
          <div className="hud-box p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-cyber font-bold text-sm text-slate-100">
                التتبع البصري التلقائي (Auto-Follow)
              </div>
              <div className="text-xs text-slate-400">
                توجيه محركات الرأس تلقائياً نحو الهدف المقفول
              </div>
            </div>
            <button
              onClick={() => onUpdateConfig({ autoTrackingEnabled: !config.autoTrackingEnabled })}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-hud font-bold border transition-all ${
                config.autoTrackingEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {config.autoTrackingEnabled ? 'مفعّل (ON)' : 'معطل (OFF)'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Joystick Sliders & PID Tuning */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-sm font-cyber font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>التحكم اليدوي وتعديل PID</span>
          </div>
          <button
            onClick={() => setShowAdvancedPID(!showAdvancedPID)}
            className="text-xs text-sky-400 font-mono-hud hover:underline"
          >
            {showAdvancedPID ? 'إخفاء إعدادات PID المتقدمة' : 'إظهار إعدادات PID المتقدمة'}
          </button>
        </div>

        {/* Manual Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono-hud text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>توجيه أفقي يدوي (Manual Pan Yaw):</span>
              <span className="text-sky-400 font-bold">{state.currentPanDeg.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min={-config.panLimitDeg}
              max={config.panLimitDeg}
              value={state.currentPanDeg}
              onChange={(e) => onManualPanTilt(parseFloat(e.target.value), state.currentTiltDeg)}
              className="w-full accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>توجيه عمودي يدوي (Manual Tilt Pitch):</span>
              <span className="text-sky-400 font-bold">{state.currentTiltDeg.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min={-config.tiltLimitDeg}
              max={config.tiltLimitDeg}
              value={state.currentTiltDeg}
              onChange={(e) => onManualPanTilt(state.currentPanDeg, parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>
        </div>

        {/* PID Tuning Controls */}
        {showAdvancedPID && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 font-mono-hud text-xs animate-in fade-in duration-150">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>معامل التناسب (Kp):</span>
                <span className="text-amber-400 font-bold">{config.kp}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={config.kp}
                onChange={(e) => onUpdateConfig({ kp: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>معامل التكامل (Ki):</span>
                <span className="text-amber-400 font-bold">{config.ki}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.01"
                value={config.ki}
                onChange={(e) => onUpdateConfig({ ki: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>معامل التفاضل (Kd):</span>
                <span className="text-amber-400 font-bold">{config.kd}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.02"
                value={config.kd}
                onChange={(e) => onUpdateConfig({ kd: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Command Log Feed */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="text-xs font-mono-hud text-slate-400 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>سجل الأوامر وحزم الاتصال الحية (Robot Telemetry Log)</span>
        </div>
        <div className="bg-slate-950 rounded-lg p-3 max-h-36 overflow-y-auto font-mono-hud text-[11px] space-y-1 text-slate-300 border border-slate-900">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-tight text-slate-400">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
