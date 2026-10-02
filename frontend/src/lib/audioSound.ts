/**
 * Audio Chime Synthesizer using Web Audio API.
 * Generates crisp, pleasant audio sounds for:
 * 1. Notifications (Double high chime)
 * 2. Check-In / Clock-In (Triumphant upward chord)
 * 3. Check-Out / Clock-Out (Gentle downward melody)
 * 4. Break / Break Reminders (Warm dual bell ping)
 */

class AudioSoundService {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play Task Assignment Alert Sound (Vibrant 3-tone attention chime: F5 -> A5 -> C6 -> F6)
   * Designed specifically to alert employees when a new task is assigned.
   */
  public playTaskAlertSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High pleasant attention arpeggio: 698.46Hz (F5), 880Hz (A5), 1046.5Hz (C6), 1396.91Hz (F6)
      const freqs = [698.46, 880, 1046.5, 1396.91];
      const durations = [0.12, 0.12, 0.15, 0.45];

      let elapsed = 0;
      freqs.forEach((freq, idx) => {
        const startTime = now + elapsed;
        const duration = durations[idx];
        elapsed += 0.09;

        // Primary Sine Oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);

        // Harmonic shimmer overtone
        const overtone = ctx.createOscillator();
        const overGain = ctx.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 1.5, startTime);
        overGain.gain.setValueAtTime(0.1, startTime);
        overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.8);
        overtone.connect(overGain);
        overGain.connect(ctx.destination);
        overtone.start(startTime);
        overtone.stop(startTime + duration * 0.8);
      });
    } catch (e) {
      console.warn('Could not play task alert sound:', e);
    }
  }

  /**
   * Play general notification sound (Soft double chime: A5 -> A6)
   */
  public playNotificationSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: 1760Hz (A6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }

  /**
   * Play Check-In / Clock-In Sound (Upward chord C5-E5-G5-C6)
   */
  public playCheckInSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.warn('Could not play check-in sound:', e);
    }
  }

  /**
   * Play Check-Out / Clock-Out Sound (Downward completion G5-E5-C5)
   */
  public playCheckOutSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [783.99, 659.25, 523.25]; // G5, E5, C5
      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      console.warn('Could not play check-out sound:', e);
    }
  }

  /**
   * Play Break / Break Reminder Sound (Warm bell ping 660Hz -> 880Hz)
   */
  public playBreakSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [660, 880]; // E5, A5
      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch (e) {
      console.warn('Could not play break sound:', e);
    }
  }
}

export const soundService = new AudioSoundService();
