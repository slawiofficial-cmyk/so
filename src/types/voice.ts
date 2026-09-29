export type VoiceLanguage = 'ar' | 'en' | 'fr';

export type VoiceIntent = 
  | 'DESCRIBE_SCENE'      // "ماذا أمامي؟" / "What do you see?"
  | 'CHECK_PERSON'        // "هل يوجد شخص؟" / "Is there a person?"
  | 'LIST_OBJECTS'        // "ما الأشياء الموجودة أمامي؟" / "List objects"
  | 'TRACK_TARGET'        // "تتبع الهدف" / "Track target" / "Lock on"
  | 'START_GAME'          // "ابدأ اللعبة" / "Start game"
  | 'STOP_ALL'            // "توقف" / "Stop"
  | 'SWITCH_CAMERA'       // "غيّر الكاميرا" / "Switch camera"
  | 'ROBOT_CENTER'        // "وجّه للأمام" / "Center robot"
  | 'UNKNOWN';

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  intent?: VoiceIntent;
  timestamp: number;
}

export interface VoiceConfig {
  language: VoiceLanguage;
  enabled: boolean;
  autoSpeakResponses: boolean;
  speechRate: number;      // 0.8 - 1.3
  speechPitch: number;     // 0.8 - 1.2
  voiceVolume: number;     // 0 - 1
  continuousListening: boolean;
  useCyberFilter: boolean;
}
