const MUTE_KEY = 'word-garden-muted-v1';

/** Sonidos breves WebAudio y vibración, sin descargar ni mantener assets. */
export class GameFeedback {
  private context: AudioContext | null = null;

  isMuted(): boolean { return localStorage.getItem(MUTE_KEY) === 'true'; }
  toggleMuted(): boolean { const muted = !this.isMuted(); localStorage.setItem(MUTE_KEY, String(muted)); return muted; }
  tick(): void { this.tone(520, .035, .025); }
  found(): void { this.tone(660, .08, .055); window.setTimeout(() => this.tone(880, .11, .055), 65); this.vibrate(18); }
  error(): void { this.tone(190, .1, .045, 'sawtooth'); this.vibrate(12); }
  complete(): void { this.tone(660, .11, .06); window.setTimeout(() => this.tone(880, .12, .065), 90); window.setTimeout(() => this.tone(1050, .18, .07), 190); this.vibrate([18, 45, 28]); }
  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    if (this.isMuted()) return;
    try {
      const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      this.context ??= new Audio(); if (this.context.state === 'suspended') void this.context.resume();
      const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); const now = this.context.currentTime;
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(now); oscillator.stop(now + duration);
    } catch { /* Audio no es esencial para jugar. */ }
  }
  private vibrate(pattern: VibratePattern): void { if (!this.isMuted()) navigator.vibrate?.(pattern); }
}
export const gameFeedback = new GameFeedback();
