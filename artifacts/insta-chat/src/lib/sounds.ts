/**
 * Messenger-grade sound system using Web Audio API.
 * Handles browser autoplay policy by scheduling sounds 50ms ahead
 * so AudioContext.resume() always completes first.
 */
class SoundEffects {
  private ctx: AudioContext | null = null;
  private resumePromise: Promise<void> | null = null;

  /** Call on FIRST user gesture to permanently unlock audio */
  unlock() {
    this.ensureCtx();
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state !== "running") {
      this.resumePromise = this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqs: number[],           // one or more frequencies (played sequentially)
    type: OscillatorType,
    durationEach: number,
    vol: number,
    gap = 0,                   // ms between tones
  ) {
    try {
      const ctx = this.ensureCtx();
      // Schedule tones 60ms ahead to survive resume latency
      let startAt = ctx.currentTime + 0.06;

      freqs.forEach((freq, i) => {
        const offset = i * (durationEach + gap / 1000);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startAt + offset);

        gain.gain.setValueAtTime(0.001, startAt + offset);
        gain.gain.linearRampToValueAtTime(vol, startAt + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + offset + durationEach);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt + offset);
        osc.stop(startAt + offset + durationEach + 0.01);
      });
    } catch (_) {}
  }

  /** Sent by ME → short upward swoosh (like Messenger) */
  playSend() {
    this.playTone([480, 720], "sine", 0.1, 0.12, 60);
  }

  /** Received message → gentle pop (like Messenger) */
  playReceive() {
    this.playTone([880, 660], "sine", 0.14, 0.14, 80);
  }

  /** Background notification → triple ascending ding */
  playNotification() {
    this.playTone([520, 780, 1040], "sine", 0.14, 0.16, 90);
  }

  /** Typing tick — very subtle, repeats while typing */
  playTyping() {
    this.playTone([350], "square", 0.025, 0.018);
  }

  /** Peer read my message → quick double chime */
  playSeen() {
    this.playTone([1100, 1500], "sine", 0.08, 0.07, 50);
  }
}

export const sounds = new SoundEffects();
