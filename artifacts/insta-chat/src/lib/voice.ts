export type RecordingResult = {
  dataUrl: string;
  duration: number;
  peaks: number[];
};

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mime = "audio/webm;codecs=opus";

  onLevel?: (level: number) => void;
  private rafId: number | null = null;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, // Disabled for pure raw studio quality
        noiseSuppression: false, // Disabled for pure raw studio quality
        autoGainControl: false,  // Disabled for pure raw studio quality
        sampleRate: 48000,
        sampleSize: 24,          // 24-bit depth if supported
        channelCount: 2,         // Stereo if possible
      },
    });

    if (!MediaRecorder.isTypeSupported(this.mime)) {
      this.mime = "audio/webm";
      if (!MediaRecorder.isTypeSupported(this.mime)) this.mime = "";
    }

    this.recorder = new MediaRecorder(
      this.stream,
      this.mime ? { mimeType: this.mime, audioBitsPerSecond: 320000 } : undefined, // Extreme Studio Quality
    );
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    src.connect(this.analyser);

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      this.onLevel?.(Math.min(1, rms * 3));
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);

    this.recorder.start(100);
    this.startedAt = Date.now();
  }

  async stop(): Promise<RecordingResult | null> {
    if (!this.recorder) return null;
    const recorder = this.recorder;
    const chunks = this.chunks;
    const dur = (Date.now() - this.startedAt) / 1000;
    const finalMime = this.mime;

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        this.cleanup();
        const blob = new Blob(chunks, { type: finalMime || "audio/webm" });
        const dataUrl: string = await new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
        const peaks = await this.computePeaks(blob, 48);
        resolve({ dataUrl, duration: dur, peaks });
      };
      recorder.stop();
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.cleanup();
  }

  private cleanup() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
  }

  private async computePeaks(blob: Blob, count: number): Promise<number[]> {
    try {
      const arr = await blob.arrayBuffer();
      const ctx = new (window.OfflineAudioContext ||
        (window as any).webkitOfflineAudioContext)(1, 48000 * 60, 48000);
      const buf = await new Promise<AudioBuffer>((res, rej) => {
        ctx.decodeAudioData(arr.slice(0), res, rej);
      });
      const ch = buf.getChannelData(0);
      const block = Math.floor(ch.length / count) || 1;
      const peaks: number[] = [];
      let max = 0;
      for (let i = 0; i < count; i++) {
        let m = 0;
        const start = i * block;
        const end = Math.min(start + block, ch.length);
        for (let j = start; j < end; j++) {
          const v = Math.abs(ch[j]);
          if (v > m) m = v;
        }
        peaks.push(m);
        if (m > max) max = m;
      }
      return peaks.map((p) => (max > 0 ? p / max : 0));
    } catch {
      return new Array(count).fill(0).map(() => 0.3 + Math.random() * 0.6);
    }
  }
}

export function formatDuration(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
