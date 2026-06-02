let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Support standard and webkit prefixes
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Triggers a wood-clack sound when two balls collide, scaling with velocity.
 */
export function playHitSound(velocity: number) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Normalize volume based on velocity (cap at 1.0, minimum audit threshold)
    const vol = Math.min(Math.max(velocity / 8, 0.05), 1.0);
    
    // Primary tonal oscillator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);
    
    gainNode.gain.setValueAtTime(vol * 0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    // Synthesize noise burst for contact crack
    const bufferSize = ctx.sampleRate * 0.015; // 15ms burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 4.0;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
    
    noise.start(now);
    noise.stop(now + 0.02);
  } catch (e) {
    // Fail silently when audio is blocked before user interaction
  }
}

/**
 * Play low thud when hit table boundaries/cushions.
 */
export function playCushionSound(velocity: number) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const vol = Math.min(Math.max(velocity / 8, 0.05), 0.6);
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
    
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    
    gainNode.gain.setValueAtTime(vol * 0.45, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.13);
  } catch (e) {
    // Fail silently when audio context is blocked
  }
}

/**
 * Sound of a ball dropping into a pocket.
 */
export function playPocketSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.setValueAtTime(0.25, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.32);
  } catch (e) {
    // Fail silently when audio context is blocked
  }
}

/**
 * Play a low synth scratch buzz.
 */
export function playScratchSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);
    
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Fail silently when audio context is blocked
  }
}
