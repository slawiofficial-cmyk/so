import React from 'react';
import {
  Eye,
  Crosshair,
  Target,
  Bot,
  Mic,
  BarChart3,
  Settings,
} from 'lucide-react';

export type ActiveTab = 'vision' | 'tracking' | 'challenge' | 'robot' | 'voice' | 'stats' | 'settings';

interface ControlNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  targetCount: number;
  isGameActive: boolean;
  isRobotConnected: boolean;
}

export const ControlNav: React.FC<ControlNavProps> = ({
  activeTab,
  onSelectTab,
  targetCount,
  isGameActive,
  isRobotConnected,
}) => {
  const tabs = [
    {
      id: 'vision' as ActiveTab,
      label: 'VISION',
      labelAr: 'الرؤية',
      icon: Eye,
      badge: targetCount > 0 ? `${targetCount}` : null,
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    },
    {
      id: 'tracking' as ActiveTab,
      label: 'TRACKING',
      labelAr: 'التتبع',
      icon: Target,
      badge: targetCount > 0 ? `${targetCount}` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'challenge' as ActiveTab,
      label: 'CHALLENGE',
      labelAr: 'التصويب',
      icon: Crosshair,
      badge: isGameActive ? 'LIVE' : null,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
    },
    {
      id: 'robot' as ActiveTab,
      label: 'ROBOT',
      labelAr: 'الروبوت',
      icon: Bot,
      badge: isRobotConnected ? 'ON' : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    },
    {
      id: 'voice' as ActiveTab,
      label: 'VOICE',
      labelAr: 'الصوت',
      icon: Mic,
    },
    {
      id: 'stats' as ActiveTab,
      label: 'STATS',
      labelAr: 'الإحصاء',
      icon: BarChart3,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'SETTINGS',
      labelAr: 'الإعدادات',
      icon: Settings,
    },
  ];

  return (
    <nav className="w-full hud-box border-t border-slate-800/80 bg-slate-950/90 z-30 px-2 py-1.5 backdrop-blur-md">
      <div className="flex items-center justify-around max-w-4xl mx-auto overflow-x-auto no-scrollbar gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] py-1.5 px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-bold border ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-cyber font-bold mt-1 tracking-wider uppercase">
                {tab.label}
              </span>
              <span className="text-[9px] text-slate-400 font-sans hidden sm:block">
                {tab.labelAr}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
