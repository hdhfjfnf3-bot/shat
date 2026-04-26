class SoundEffects {
  private ctx: AudioContext | null = null;

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore if audio context fails
    }
  }

  playSend() {
    this.playTone(600, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(800, "sine", 0.15, 0.1), 80);
  }

  playReceive() {
    this.playTone(800, "sine", 0.1, 0.15);
    setTimeout(() => this.playTone(600, "sine", 0.2, 0.15), 100);
  }

  playSeen() {
    this.playTone(1200, "sine", 0.05, 0.05);
    setTimeout(() => this.playTone(1600, "sine", 0.1, 0.05), 60);
  }

  playTyping() {
    // A very subtle click sound
    this.playTone(300, "square", 0.02, 0.01);
  }
}

export const sounds = new SoundEffects();
