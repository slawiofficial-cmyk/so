import React, { useState } from 'react';
import { VoiceConfig, VoiceLanguage, VoiceMessage } from '../../types/voice';
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  Trash2,
  Globe,
  Sparkles,
  Bot,
  User,
} from 'lucide-react';

interface VoiceViewProps {
  config: VoiceConfig;
  messages: VoiceMessage[];
  isListening: boolean;
  onToggleListening: () => void;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onUpdateConfig: (config: Partial<VoiceConfig>) => void;
  onSpeak: (text: string) => void;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
  config,
  messages,
  isListening,
  onToggleListening,
  onSendMessage,
  onClearMessages,
  onUpdateConfig,
  onSpeak,
}) => {
  const [inputText, setInputText] = useState('');

  const quickPromptsAr = [
    'ماذا ترى؟',
    'هل يوجد شخص؟',
    'ما الأشياء الموجودة أمامي؟',
    'تتبع الهدف',
    'ابدأ اللعبة',
    'توقف',
    'وجّه للأمام',
  ];

  const quickPromptsEn = [
    'What do you see?',
    'Is there a person?',
    'List all objects',
    'Track target',
    'Start game',
    'Stop',
  ];

  const quickPrompts = config.language === 'ar' ? quickPromptsAr : quickPromptsEn;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto pb-24">
      {/* Header & Controls */}
      <div className="hud-box p-4 rounded-xl border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isListening ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-sky-500/20 text-sky-400 border-sky-500/40'}`}>
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-cyber text-slate-100">
              المساعد الصوتي الذكي (Voice Vision Assistant)
            </h2>
            <p className="text-xs text-slate-400 font-mono-hud">
              Speech-To-Text • Text-To-Speech • Real-time Multilingual Scene Understanding
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <select
            value={config.language}
            onChange={(e) => onUpdateConfig({ language: e.target.value as VoiceLanguage })}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono-hud rounded-lg p-1.5 outline-none focus:border-sky-500"
          >
            <option value="ar">العربية (Arabic)</option>
            <option value="en">English (US)</option>
            <option value="fr">Français (French)</option>
          </select>
        </div>
      </div>

      {/* Mic Main Interaction Hero */}
      <div className="hud-box p-6 rounded-2xl border border-slate-800 text-center space-y-4 bg-slate-950/70">
        <button
          onClick={onToggleListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all shadow-xl active:scale-95 ${
            isListening
              ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse ring-4 ring-rose-500/30'
              : 'bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-sky-500/30 hover:scale-105'
          }`}
        >
          {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        <div>
          <div className="text-sm font-cyber font-bold text-slate-200">
            {isListening ? 'جارٍ الاستماع إليك الآن... تحدث بصوت واضح' : 'اضغط على الميكروفون للتحدث مع الروبوت'}
          </div>
          <p className="text-xs text-slate-400 font-mono-hud mt-1">
            {config.language === 'ar' ? 'تحدث بالأوامر الصوتية لتحليل البيئة أو التحكم في اللعبة والتتبع' : 'Speak commands to analyze the scene, lock targets or trigger game mode'}
          </p>
        </div>

        {/* Quick Voice Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSendMessage(prompt)}
              className="px-3 py-1.5 rounded-full text-xs font-cyber bg-slate-900/90 text-slate-300 border border-slate-700 hover:border-sky-500/60 hover:text-sky-400 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Chat Feed */}
      <div className="hud-box p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono-hud text-slate-400">
          <span>سجل المحادثات الصوتية (Voice Logs)</span>
          {messages.length > 0 && (
            <button
              onClick={onClearMessages}
              className="flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono-hud">
              لم تبدأ أي محادثة بعد. استخدم الميكروفون أو اختر أحد الأوامر السريعة أعلاه.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse text-right' : 'text-right'}`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isUser
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs font-mono-hud ${
                      isUser
                        ? 'bg-sky-950/60 border border-sky-500/30 text-slate-100'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between gap-2">
                      <span>{isUser ? 'أنت (User)' : 'الرؤية الذكية (RoboVision AI)'}</span>
                      {!isUser && (
                        <button
                          onClick={() => onSpeak(msg.text)}
                          className="hover:text-sky-400 transition-colors"
                          title="قراءة صوتية"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Typed message input fallback */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب أمرك هنا يدوياً..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono-hud outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
