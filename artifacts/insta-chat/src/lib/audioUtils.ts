// Web Audio API Utility for immersive chat sound effects

let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function createNoiseBuffer(ctx: AudioContext, duration: number) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export const playDoorSlam = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  // The Thud (Low frequency)
  const osc = ctx.createOscillator();
  const gainOs = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
  gainOs.gain.setValueAtTime(1.5, time);
  gainOs.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  osc.connect(gainOs);
  gainOs.connect(ctx.destination);
  
  // The Crash (Noise)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.3);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(800, time);
  noiseFilter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
  const gainNoise = ctx.createGain();
  gainNoise.gain.setValueAtTime(1, time);
  gainNoise.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noise.connect(noiseFilter);
  noiseFilter.connect(gainNoise);
  gainNoise.connect(ctx.destination);
  
  osc.start(time);
  osc.stop(time + 0.3);
  noise.start(time);
  
  // Screen shake wrapper
  document.body.style.animation = "shake 0.4s cubic-bezier(.36,.07,.19,.97) both";
  setTimeout(() => document.body.style.animation = "", 400);
  if (navigator.vibrate) navigator.vibrate([150, 50, 300]);
};

export const playBomb = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  // Boom!
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(10, time + 1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 1.5);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(1000, time);
  noiseFilter.frequency.exponentialRampToValueAtTime(50, time + 1.5);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(2, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  osc.start(time);
  osc.stop(time + 1.5);
  noise.start(time);

  document.body.style.animation = "shake 0.8s cubic-bezier(.36,.07,.19,.97) both";
  setTimeout(() => document.body.style.animation = "", 800);
  if (navigator.vibrate) navigator.vibrate([200, 100, 400, 100, 200]);
};

export const playSlap = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.1);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1000, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start(time);
  
  document.body.style.animation = "shake 0.2s cubic-bezier(.36,.07,.19,.97) both";
  setTimeout(() => document.body.style.animation = "", 200);
  if (navigator.vibrate) navigator.vibrate([100]);
};

export const playKiss = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, time);
  osc.frequency.exponentialRampToValueAtTime(1200, time + 0.1);
  osc.frequency.exponentialRampToValueAtTime(600, time + 0.15);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(1, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.15);

  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
};

export const playGlassShatter = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.5);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(3000, time);
  filter.frequency.exponentialRampToValueAtTime(1000, time + 0.5);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start(time);
  
  if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
};

export const playMagicSparkle = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  for (let i = 0; i < 5; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 1000, time + i * 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time + i * 0.1);
    osc.stop(time + i * 0.1 + 0.2);
  }
};

export const playGlitch = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100 + Math.random() * 800, time + i * 0.05);
    osc.frequency.setValueAtTime(50 + Math.random() * 400, time + i * 0.05 + 0.02);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time + i * 0.05);
    gain.gain.linearRampToValueAtTime(1, time + i * 0.05 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.05 + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time + i * 0.05);
    osc.stop(time + i * 0.05 + 0.05);
  }
  
  // Visual glitch effect
  document.body.style.filter = "hue-rotate(90deg) contrast(200%) invert(10%)";
  document.body.style.transform = "skewX(2deg)";
  setTimeout(() => {
    document.body.style.filter = "";
    document.body.style.transform = "";
  }, 200);
  
  if (navigator.vibrate) navigator.vibrate([20, 30, 20, 30]);
};

export const playVinylMusic = () => {
  const ctx = getContext();
  const time = ctx.currentTime;
  
  // Vinyl crackle noise
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  const crackleFilter = ctx.createBiquadFilter();
  crackleFilter.type = 'highpass';
  crackleFilter.frequency.setValueAtTime(5000, time);
  const crackleGain = ctx.createGain();
  crackleGain.gain.setValueAtTime(0.05, time);
  noise.connect(crackleFilter);
  crackleFilter.connect(crackleGain);
  crackleGain.connect(ctx.destination);
  noise.start(time);
  
  // Simple lo-fi chord progression
  const playChord = (freqs: number[], startTime: number, duration: number) => {
    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  };
  
  // E minor 9, C major 7
  playChord([164.81, 196.00, 246.94, 293.66], time, 2);
  playChord([130.81, 164.81, 196.00, 246.94], time + 2, 2);
  
  setTimeout(() => {
    noise.stop();
  }, 4000);
};
