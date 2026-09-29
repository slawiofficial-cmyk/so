import { VoiceConfig, VoiceIntent, VoiceLanguage, VoiceMessage } from '../types/voice';
import { TrackedTarget } from '../types/vision';

// Web Speech API interface definitions
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): IWindowSpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): IWindowSpeechRecognition;
    };
  }
}

export class VoiceAssistant {
  private config: VoiceConfig = {
    language: 'ar',
    enabled: true,
    autoSpeakResponses: true,
    speechRate: 1.0,
    speechPitch: 1.05,
    voiceVolume: 0.9,
    continuousListening: false,
    useCyberFilter: true,
  };

  private recognition: IWindowSpeechRecognition | null = null;
  private isListening: boolean = false;
  private messages: VoiceMessage[] = [];
  private onMessageCallback?: (messages: VoiceMessage[]) => void;
  private onIntentCallback?: (intent: VoiceIntent, originalText: string) => void;

  constructor(config?: Partial<VoiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initSpeechRecognition();
  }

  public setCallbacks(
    onMsg: (messages: VoiceMessage[]) => void,
    onIntent: (intent: VoiceIntent, originalText: string) => void
  ) {
    this.onMessageCallback = onMsg;
    this.onIntentCallback = onIntent;
  }

  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  public getMessages(): VoiceMessage[] {
    return [...this.messages];
  }

  public updateConfig(newConfig: Partial<VoiceConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.recognition) {
      this.recognition.lang = this.getLangCode(this.config.language);
    }
  }

  private getLangCode(lang: VoiceLanguage): string {
    switch (lang) {
      case 'ar': return 'ar-SA';
      case 'en': return 'en-US';
      case 'fr': return 'fr-FR';
      default: return 'ar-SA';
    }
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = this.config.continuousListening;
        this.recognition.interimResults = false;
        this.recognition.lang = this.getLangCode(this.config.language);

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[event.resultIndex][0].transcript;
          if (transcript && transcript.trim()) {
            this.handleUserSpeech(transcript.trim());
          }
        };

        this.recognition.onerror = () => {
          this.isListening = false;
        };

        this.recognition.onend = () => {
          this.isListening = false;
        };
      } catch (err) {
        console.warn('Speech Recognition not supported in this environment:', err);
      }
    }
  }

  public startListening(): boolean {
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    if (!this.recognition) {
      return false;
    }
    try {
      this.recognition.lang = this.getLangCode(this.config.language);
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch {
      this.isListening = false;
      return false;
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Processes a user speech string or typed command
   */
  public handleUserSpeech(text: string, currentTargets: TrackedTarget[] = []) {
    const userMsg: VoiceMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.notifyMessages();

    // Parse Intent
    const intent = this.parseIntent(text);
    userMsg.intent = intent;

    // Generate AI response
    const responseText = this.generateResponse(intent, text, currentTargets);

    const assistantMsg: VoiceMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'assistant',
      text: responseText,
      intent,
      timestamp: Date.now(),
    };
    this.messages.push(assistantMsg);
    this.notifyMessages();

    // Trigger action callback
    if (this.onIntentCallback) {
      this.onIntentCallback(intent, text);
    }

    // Speak aloud
    if (this.config.autoSpeakResponses) {
      this.speak(responseText);
    }
  }

  public parseIntent(text: string): VoiceIntent {
    const t = text.toLowerCase();

    // Arabic / English / French mappings
    if (
      t.includes('ماذا ترى') ||
      t.includes('ماذا أمامي') ||
      t.includes('ماذا يوجد') ||
      t.includes('صف المشهد') ||
      t.includes('what do you see') ||
      t.includes('what is in front') ||
      t.includes('que vois-tu') ||
      t.includes('décris')
    ) {
      return 'DESCRIBE_SCENE';
    }

    if (
      t.includes('شخص') ||
      t.includes('انسان') ||
      t.includes('وجه') ||
      t.includes('person') ||
      t.includes('human') ||
      t.includes('someone') ||
      t.includes('personne') ||
      t.includes('quelqu')
    ) {
      return 'CHECK_PERSON';
    }

    if (
      t.includes('اشياء') ||
      t.includes('أشياء') ||
      t.includes('عناصر') ||
      t.includes('أهداف') ||
      t.includes('objects') ||
      t.includes('items') ||
      t.includes('targets') ||
      t.includes('objets')
    ) {
      return 'LIST_OBJECTS';
    }

    if (
      t.includes('تتبع') ||
      t.includes('تثبيت') ||
      t.includes('قفل') ||
      t.includes('track') ||
      t.includes('lock') ||
      t.includes('follow') ||
      t.includes('suivre') ||
      t.includes('verrouiller')
    ) {
      return 'TRACK_TARGET';
    }

    if (
      t.includes('ابدأ اللعبة') ||
      t.includes('ابدا اللعبة') ||
      t.includes('العب') ||
      t.includes('تصويب') ||
      t.includes('تحدي') ||
      t.includes('start game') ||
      t.includes('play') ||
      t.includes('target challenge') ||
      t.includes('commencer le jeu')
    ) {
      return 'START_GAME';
    }

    if (
      t.includes('توقف') ||
      t.includes('قف') ||
      t.includes('انهاء') ||
      t.includes('stop') ||
      t.includes('halt') ||
      t.includes('arrete') ||
      t.includes('pause')
    ) {
      return 'STOP_ALL';
    }

    if (
      t.includes('كاميرا') ||
      t.includes('بدل') ||
      t.includes('switch camera') ||
      t.includes('change camera')
    ) {
      return 'SWITCH_CAMERA';
    }

    if (
      t.includes('وجه') ||
      t.includes('أمام') ||
      t.includes('وسط') ||
      t.includes('center') ||
      t.includes('reset')
    ) {
      return 'ROBOT_CENTER';
    }

    return 'UNKNOWN';
  }

  private generateResponse(
    intent: VoiceIntent,
    userText: string,
    currentTargets: TrackedTarget[]
  ): string {
    const lang = this.config.language;
    const count = currentTargets.length;

    // Translation dictionary for common detected labels to Arabic/French
    const translateLabel = (lbl: string): string => {
      const l = lbl.toLowerCase();
      if (lang === 'ar') {
        if (l.includes('person')) return 'شخص';
        if (l.includes('face')) return 'وجه إنسان';
        if (l.includes('car')) return 'سيارة';
        if (l.includes('cup')) return 'كوب';
        if (l.includes('bottle')) return 'قارورة';
        if (l.includes('phone')) return 'هاتف ذكي';
        if (l.includes('laptop')) return 'حاسوب محمول';
        if (l.includes('dog')) return 'كلب';
        if (l.includes('cat')) return 'قطة';
        if (l.includes('chair')) return 'كرسي';
        return lbl;
      }
      if (lang === 'fr') {
        if (l.includes('person')) return 'une personne';
        if (l.includes('face')) return 'un visage';
        if (l.includes('car')) return 'une voiture';
        if (l.includes('cup')) return 'une tasse';
        if (l.includes('bottle')) return 'une bouteille';
        if (l.includes('phone')) return 'un téléphone';
        if (l.includes('laptop')) return 'un ordinateur';
        if (l.includes('dog')) return 'un chien';
        if (l.includes('cat')) return 'un chat';
        if (l.includes('chair')) return 'une chaise';
        return lbl;
      }
      return lbl;
    };

    switch (intent) {
      case 'DESCRIBE_SCENE':
      case 'LIST_OBJECTS': {
        if (count === 0) {
          if (lang === 'ar') return 'لا أرى أي أهداف واضحة في مجال الرؤية حالياً.';
          if (lang === 'fr') return 'Je ne détecte aucun objet pour le moment.';
          return 'I do not see any distinct targets in view right now.';
        }

        const labels = currentTargets.map(t => translateLabel(t.label));
        const uniqueLabels = Array.from(new Set(labels)).join('، ');

        if (lang === 'ar') {
          return `أرى أمام الكاميرا ${count} أهداف نشطة: (${uniqueLabels}).`;
        }
        if (lang === 'fr') {
          return `Je vois ${count} objets devant la caméra : ${uniqueLabels}.`;
        }
        return `I detect ${count} active targets ahead: ${uniqueLabels}.`;
      }

      case 'CHECK_PERSON': {
        const persons = currentTargets.filter(t => t.targetType === 'person' || t.targetType === 'face');
        if (persons.length > 0) {
          const best = persons[0];
          const conf = Math.round(best.confidence * 100);
          if (lang === 'ar') return `نعم، تم رصد شخص (${best.id}) بدرجة ثقة ${conf}%.`;
          if (lang === 'fr') return `Oui, une personne a été détectée avec ${conf}% de confiance.`;
          return `Yes, a person is detected (${best.id}) with ${conf}% confidence.`;
        } else {
          if (lang === 'ar') return 'لا يوجد أي شخص أمام الكاميرا في الوقت الحالي.';
          if (lang === 'fr') return 'Aucune personne détectée dans le champ visuel.';
          return 'No person is detected in front of the camera right now.';
        }
      }

      case 'TRACK_TARGET': {
        if (count > 0) {
          const target = currentTargets[0];
          if (lang === 'ar') return `تم تثبيت وقفل التتبع على الهدف ${target.id}.`;
          if (lang === 'fr') return `Cible verrouillée sur ${target.id}.`;
          return `Locked and tracking target ${target.id}.`;
        }
        if (lang === 'ar') return 'لا يوجد هدف حالي متاح لقفله.';
        return 'No target available to lock on.';
      }

      case 'START_GAME': {
        if (lang === 'ar') return 'تم تفعيل وضع تحدي التصويب الافتراضي! صوّب على الأهداف بدقة.';
        if (lang === 'fr') return 'Mode Défi Cible activé ! Visez les drones virtuels.';
        return 'Target Challenge activated! Aim at the virtual targets.';
      }

      case 'STOP_ALL': {
        if (lang === 'ar') return 'تم إيقاف العمليات وتثبيت النظام في وضع الاستعداد.';
        if (lang === 'fr') return 'Opérations arrêtées. Système en veille.';
        return 'Operations stopped. System in standby.';
      }

      case 'SWITCH_CAMERA': {
        if (lang === 'ar') return 'جارٍ تبديل الكاميرا.';
        if (lang === 'fr') return 'Changement de caméra en cours.';
        return 'Switching camera stream.';
      }

      case 'ROBOT_CENTER': {
        if (lang === 'ar') return 'تمت إعادة توجيه رأس الروبوت إلى نقطة المنتصف.';
        if (lang === 'fr') return 'Tête du robot recentrée.';
        return 'Robot gimbal centered.';
      }

      default: {
        if (lang === 'ar') {
          return `أمر غير معروف: "${userText}". يمكنك أن تسأل: ماذا ترى؟ هل يوجد شخص؟ تتبع الهدف، ابدأ اللعبة.`;
        }
        if (lang === 'fr') {
          return `Commande non reconnue. Essayez: Que vois-tu ? Y a-t-il une personne ? Verrouiller la cible.`;
        }
        return `Unknown command: "${userText}". Try asking: "What do you see?", "Is there a person?", "Start game", or "Track target".`;
      }
    }
  }

  public speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLangCode(this.config.language);
      utterance.rate = this.config.speechRate;
      utterance.pitch = this.config.speechPitch;
      utterance.volume = this.config.voiceVolume;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(this.config.language));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  private notifyMessages() {
    if (this.onMessageCallback) {
      this.onMessageCallback([...this.messages]);
    }
  }

  public clearMessages() {
    this.messages = [];
    this.notifyMessages();
  }
}

export const voiceAssistant = new VoiceAssistant();
