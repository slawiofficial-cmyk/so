import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Trophy,
  Target,
  Flame,
  Clock,
  Zap,
  Activity,
  Trash2,
} from 'lucide-react';

interface AllStats {
  totalGames: number;
  totalHits: number;
  totalMisses: number;
  bestCombo: number;
  highestScore: number;
  totalTimeSec: number;
}

export const StatsView: React.FC = () => {
  const [stats, setStats] = useState<AllStats>({
    totalGames: 0,
    totalHits: 0,
    totalMisses: 0,
    bestCombo: 0,
    highestScore: 0,
    totalTimeSec: 0,
  });

  const loadStats = () => {
    try {
      const data = localStorage.getItem('robovision_all_stats');
      if (data) {
        setStats(JSON.parse(data));
      }
    } catch {}
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = () => {
    if (confirm('هل تريد بالتأكيد مسح كافة الإحصائيات وسجلات الألعاب؟')) {
      localStorage.removeItem('robovision_all_stats');
      localStorage.removeItem('robovision_best_score_easy');
      localStorage.removeItem('robovision_best_score_normal');
      localStorage.removeItem('robovision_best_score_hard');
      localStorage.removeItem('robovision_best_score_extreme');
      setStats({
        totalGames: 0,
        totalHits: 0,
        totalMisses: 0,
        bestCombo: 0,
        highestScore: 0,
        totalTimeSec: 0,
      });
    }
  };

  const totalShots = stats.totalHits + stats.totalMisses;
  const overallAccuracy = totalShots > 0 ? ((stats.totalHits / totalShots) * 100).toFixed(1) : '100.0';
  const hours = Math.floor(stats.totalTimeSec / 3600);
  const minutes = Math.floor((stats.totalTimeSec % 3600) / 60);
  const seconds = stats.totalTimeSec % 60;
  const timeFormatted = `${hours > 0 ? `${hours} س ` : ''}${minutes} د ${seconds} ث`;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto overflow-y-auto pb-24">
      {/* Header */}
      <div className="hud-box p-4 rounded-xl border border-sky-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-cyber text-slate-100">
              سجل الإحصائيات والأداء (Performance & Analytics)
            </h2>
            <p className="text-xs text-slate-400 font-mono-hud">
              دقة التصويب • عدد الإصابات • التوافق وسجل الرؤية الحاسوبية
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-hud text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>تصفير الإحصائيات</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono-hud">
        <div className="hud-box p-4 rounded-xl border border-yellow-500/30 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>أعلى رقم قياسي (Best Score)</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.highestScore.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500">تم تحقيقه في وضع التصويب</div>
        </div>

        <div className="hud-box p-4 rounded-xl border border-sky-500/30 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Target className="w-4 h-4 text-sky-400" />
            <span>متوسط دقة التصويب الكلية</span>
          </div>
          <div className="text-2xl font-bold text-sky-400">{overallAccuracy}%</div>
          <div className="text-[10px] text-slate-500">من إجمالي {totalShots} إطلاق</div>
        </div>

        <div className="hud-box p-4 rounded-xl border border-rose-500/30 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>أعلى كومبو مستمر (Max Combo)</span>
          </div>
          <div className="text-2xl font-bold text-rose-400">{stats.bestCombo}x</div>
          <div className="text-[10px] text-slate-500">إصابات متتالية دون خطأ</div>
        </div>

        <div className="hud-box p-4 rounded-xl border border-emerald-500/30 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>إجمالي الإصابات الناجحة</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.totalHits}</div>
          <div className="text-[10px] text-slate-500">Hits Confirmed</div>
        </div>

        <div className="hud-box p-4 rounded-xl border border-purple-500/30 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>الجولات المكتملة</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.totalGames}</div>
          <div className="text-[10px] text-slate-500">Total Play Sessions</div>
        </div>

        <div className="hud-box p-4 rounded-xl border border-slate-700 bg-slate-900/60 space-y-1">
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>زمن التتبع واللعب</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{timeFormatted}</div>
          <div className="text-[10px] text-slate-500">Active Camera Time</div>
        </div>
      </div>

      {/* Accuracy Visual Progress Bar */}
      <div className="hud-box p-5 rounded-xl border border-slate-800 space-y-3 font-mono-hud">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300">معدل الدقة مقابل الأخطاء (Accuracy vs Misses)</span>
          <span className="text-sky-400 font-bold">{overallAccuracy}%</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-500"
            style={{ width: `${Math.min(100, parseFloat(overallAccuracy))}%` }}
          />
          <div
            className="h-full bg-rose-500/80 transition-all duration-500"
            style={{ width: `${Math.max(0, 100 - parseFloat(overallAccuracy))}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            إصابات: {stats.totalHits}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            أخطاء: {stats.totalMisses}
          </span>
        </div>
      </div>
    </div>
  );
};
