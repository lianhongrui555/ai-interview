type SfxName = 'click' | 'deploy' | 'attack' | 'fusion' | 'tower' | 'victory' | 'defeat';
type ToneProfile = { frequency: number; duration: number; type: OscillatorType; volume: number; offset: number };

export class AudioManager {
  private context: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicVolume = 0.38;
  private sfxVolume = 0.65;

  setVolumes(musicVolume: number, sfxVolume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVolume));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
  }

  unlock(): void {
    if (!this.context) {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  playSfx(name: SfxName): void {
    this.unlock();
    if (!this.context) return;
    SFX_PROFILES[name].forEach((note) => this.tone(note.frequency, note.duration, note.type, this.sfxVolume * note.volume, this.context!.currentTime + note.offset));
  }

  startMusic(): void {
    this.unlock();
    if (!this.context || this.musicTimer !== null) return;
    const step = () => {
      if (!this.context || this.musicVolume <= 0) return;
      const melody = [196, 233.08, 261.63, 293.66, 261.63, 233.08, 174.61, 196];
      const bass = [98, 98, 116.54, 116.54, 130.81, 130.81, 87.31, 98];
      const now = this.context.currentTime;
      const index = this.musicStep % melody.length;
      this.tone(melody[index] ?? 196, 0.22, 'square', this.musicVolume * 0.12, now);
      this.tone(bass[index] ?? 98, 0.42, 'triangle', this.musicVolume * 0.18, now);
      this.musicStep += 1;
    };
    step();
    this.musicTimer = window.setInterval(step, 560);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, start: number): void {
    if (!this.context || volume <= 0) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

const SFX_PROFILES: Record<SfxName, ToneProfile[]> = {
  click: [{ frequency: 620, duration: 0.06, type: 'square', volume: 0.18, offset: 0 }],
  deploy: [{ frequency: 180, duration: 0.12, type: 'triangle', volume: 0.32, offset: 0 }, { frequency: 300, duration: 0.1, type: 'square', volume: 0.16, offset: 0.06 }],
  attack: [{ frequency: 120, duration: 0.045, type: 'sawtooth', volume: 0.09, offset: 0 }],
  fusion: [{ frequency: 220, duration: 0.18, type: 'square', volume: 0.25, offset: 0 }, { frequency: 440, duration: 0.18, type: 'square', volume: 0.22, offset: 0.09 }, { frequency: 660, duration: 0.22, type: 'triangle', volume: 0.2, offset: 0.18 }],
  tower: [{ frequency: 90, duration: 0.22, type: 'sawtooth', volume: 0.28, offset: 0 }],
  victory: [{ frequency: 392, duration: 0.25, type: 'square', volume: 0.23, offset: 0 }, { frequency: 523.25, duration: 0.25, type: 'square', volume: 0.23, offset: 0.16 }, { frequency: 659.25, duration: 0.42, type: 'triangle', volume: 0.25, offset: 0.32 }],
  defeat: [{ frequency: 220, duration: 0.3, type: 'sawtooth', volume: 0.2, offset: 0 }, { frequency: 164.81, duration: 0.5, type: 'triangle', volume: 0.24, offset: 0.2 }],
};

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext; }
}

export const audioManager = new AudioManager();
