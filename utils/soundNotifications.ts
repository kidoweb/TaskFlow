// Утилита для воспроизведения звуковых уведомлений

export type SoundType = 'notification' | 'success' | 'error' | 'alert';

class SoundNotificationManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Инициализируем AudioContext при первом взаимодействии пользователя
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private loadSettings() {
    const savedEnabled = localStorage.getItem('soundNotificationsEnabled');
    const savedVolume = localStorage.getItem('soundNotificationsVolume');
    
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) return null as any;

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let value = Math.sin(2 * Math.PI * frequency * t);
      
      // Применяем огибающую для плавного затухания
      const envelope = 1 - (t / duration);
      value *= envelope;
      
      data[i] = value;
    }

    return buffer;
  }

  private async playSound(buffer: AudioBuffer) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async play(type: SoundType) {
    if (!this.enabled) return;

    try {
      await this.initAudioContext();
      
      let buffer: AudioBuffer;
      
      switch (type) {
        case 'notification':
          // Приятный звук уведомления (два тона)
          buffer = this.generateTone(800, 0.1);
          await this.playSound(buffer);
          setTimeout(() => {
            const buffer2 = this.generateTone(1000, 0.1);
            this.playSound(buffer2);
          }, 100);
          break;
        case 'success':
          // Восходящий тон успеха
          buffer = this.generateTone(600, 0.15);
          await this.playSound(buffer);
          setTimeout(() => {
            const buffer2 = this.generateTone(800, 0.15);
            this.playSound(buffer2);
          }, 80);
          break;
        case 'error':
          // Нисходящий тон ошибки
          buffer = this.generateTone(400, 0.2);
          await this.playSound(buffer);
          break;
        case 'alert':
          // Тревожный звук (быстрые повторяющиеся тоны)
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              const buffer = this.generateTone(600, 0.1);
              this.playSound(buffer);
            }, i * 150);
          }
          break;
        default:
          buffer = this.generateTone(600, 0.15);
          await this.playSound(buffer);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundNotificationsEnabled', String(enabled));
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundNotificationsVolume', String(this.volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

export const soundManager = new SoundNotificationManager();

