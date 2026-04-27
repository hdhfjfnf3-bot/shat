// All sounds synthesised with Web Audio API — no external files needed
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  // Call this on FIRST user gesture (click/keydown) to unlock browser audio
  unlock() {
    if (this.isUnlocked) return;
    try {
      const ctx = this.getCtx();
      // Play a zero-duration silent buffer to satisfy browser autoplay policy
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume().catch(() => {});
      this.isUnlocked = true;
    } catch (_) {}
  }

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Always try to resume — safe to call when already running
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.12) {
    try {
      const ctx = this.getCtx();
      if (ctx.state !== "running") return; // skip if still locked
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  playSend() {
    this.unlock();
    this.playTone(600, "sine", 0.1, 0.12);
    setTimeout(() => this.playTone(800, "sine", 0.15, 0.1), 80);
  }

  playReceive() {
    this.unlock();
    this.playTone(880, "sine", 0.12, 0.15);
    setTimeout(() => this.playTone(660, "sine", 0.18, 0.12), 100);
  }

  playSeen() {
    this.unlock();
    this.playTone(1200, "sine", 0.06, 0.06);
    setTimeout(() => this.playTone(1600, "sine", 0.1, 0.05), 60);
  }

  playTyping() {
    this.unlock();
    this.playTone(300, "square", 0.025, 0.015);
  }

  playNotification() {
    this.unlock();
    this.playTone(520, "sine", 0.08, 0.15);
    setTimeout(() => this.playTone(780, "sine", 0.12, 0.15), 120);
    setTimeout(() => this.playTone(1040, "sine", 0.18, 0.15), 240);
  }
}

export const sounds = new SoundEffects();
